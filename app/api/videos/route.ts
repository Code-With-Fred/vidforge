import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Video from '@/models/Video';

export async function GET() {
  try {
    await connectDB();
    const videos = await Video.find().sort({ created_at: -1 }).limit(50).lean();
    return NextResponse.json({ videos });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { topic: string };
    if (!body.topic?.trim()) {
      return NextResponse.json({ error: 'topic is required' }, { status: 400 });
    }

    await connectDB();
    const video = await Video.create({ topic: body.topic });
    return NextResponse.json({ videoId: video._id.toString() }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
