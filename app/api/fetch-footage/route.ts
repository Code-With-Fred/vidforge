import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Settings from '@/models/Settings';
import { extractSectionKeywords } from '@/lib/extractKeywords';
import { fetchFootageClips } from '@/lib/fetchFootage';

export async function POST(req: NextRequest) {
  try {
    const { script, videoId } = await req.json() as {
      script: string;
      videoId: string;
    };

    if (!script?.trim()) {
      return NextResponse.json({ error: 'script is required' }, { status: 400 });
    }
    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }

    // Get Pexels API key from settings or env
    await connectDB();
    const settings = await Settings.findOne().lean();
    const apiKey =
      settings?.pexels_api_key || process.env.PEXELS_API_KEY || '';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Pexels API key not configured. Add it in Settings.' },
        { status: 400 }
      );
    }

    const keywords = extractSectionKeywords(script);
    const clips = await fetchFootageClips(keywords, apiKey, videoId);

    if (clips.length === 0) {
      return NextResponse.json(
        { error: 'No footage clips could be downloaded. Check your Pexels API key.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ clips, keywords });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
