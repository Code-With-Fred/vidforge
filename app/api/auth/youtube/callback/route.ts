import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Settings from '@/models/Settings';
import { exchangeCodeForTokens } from '@/lib/youtubeUpload';

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code');
    if (!code) {
      return NextResponse.redirect(
        new URL('/settings?error=no_code', req.url)
      );
    }

    const tokens = await exchangeCodeForTokens(code);
    const refreshToken = tokens.refresh_token ?? '';

    await connectDB();

    await Settings.findOneAndUpdate(
      {},
      {
        youtube_refresh_token: refreshToken,
        youtube_connected: !!refreshToken,
        updated_at: new Date(),
      },
      { upsert: true, new: true }
    );

    return NextResponse.redirect(
      new URL('/settings?youtube=connected', req.url)
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OAuth error';
    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent(message)}`, req.url)
    );
  }
}
