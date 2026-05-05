import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Video from '@/models/Video';
import fs from 'fs';
import path from 'path';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const body = await req.json();
    const updated = await Video.findByIdAndUpdate(
      params.id,
      { ...body },
      { new: true }
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    return NextResponse.json({ video: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const video = await Video.findByIdAndDelete(params.id).lean();

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Clean up associated local files
    const filesToDelete = [
      video.video_path,
      video.voiceover_path,
      video.thumbnail_path,
    ].filter(Boolean);

    for (const f of filesToDelete) {
      if (f && fs.existsSync(f)) fs.unlinkSync(f);
    }

    // Remove footage folder for this video
    const footageDir = path.join(
      process.cwd(),
      'output',
      'footage',
      params.id
    );
    if (fs.existsSync(footageDir)) {
      fs.rmSync(footageDir, { recursive: true, force: true });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const video = await Video.findById(params.id).lean();
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }
    return NextResponse.json({ video });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
