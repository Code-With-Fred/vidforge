import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

// Serve generated MP3 audio files to the browser
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const audioPath = path.join(
    process.cwd(),
    'output',
    'audio',
    `${params.id}.mp3`
  );

  if (!fs.existsSync(audioPath)) {
    return NextResponse.json({ error: 'Audio not found' }, { status: 404 });
  }

  const buffer = fs.readFileSync(audioPath);
  return new Response(buffer, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Length': String(buffer.length),
      'Cache-Control': 'no-cache',
    },
  });
}
