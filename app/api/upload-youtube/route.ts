import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Video from '@/models/Video';
import Settings from '@/models/Settings';
import { uploadVideo } from '@/lib/youtubeUpload';
import fs from 'fs';

export async function POST(req: NextRequest) {
  try {
    const { videoId, title, description, tags } = await req.json() as {
      videoId: string;
      title: string;
      description: string;
      tags: string[];
    };

    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }

    await connectDB();

    const video = await Video.findById(videoId);
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    if (!video.video_path || !fs.existsSync(video.video_path)) {
      return NextResponse.json(
        { error: 'Video file not found. Assemble video first.' },
        { status: 400 }
      );
    }

    const settings = await Settings.findOne().lean();
    const refreshToken = settings?.youtube_refresh_token ?? '';

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'YouTube not connected. Go to Settings and connect YouTube.' },
        { status: 400 }
      );
    }

    const { youtubeUrl, youtubeId } = await uploadVideo(
      video.video_path,
      refreshToken,
      { title, description, tags }
    );

    await Video.findByIdAndUpdate(videoId, {
      youtube_url: youtubeUrl,
      youtube_id: youtubeId,
      title,
      description,
      tags,
      status: 'posted',
    });

    return NextResponse.json({ youtubeUrl, youtubeId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
