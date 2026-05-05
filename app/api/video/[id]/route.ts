import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

// Serve generated MP4 video files to the browser for preview
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const videoPath = path.join(
    process.cwd(),
    'output',
    'videos',
    `${params.id}.mp4`
  );

  if (!fs.existsSync(videoPath)) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }

  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;

  // Support HTTP range requests so the browser video player can seek
  const rangeHeader = req.headers.get('range');
  if (rangeHeader) {
    const parts = rangeHeader.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    const stream = fs.createReadStream(videoPath, { start, end });
    // Convert Node.js stream to Web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => controller.enqueue(chunk));
        stream.on('end', () => controller.close());
        stream.on('error', (err) => controller.error(err));
      },
    });

    return new Response(webStream, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(chunkSize),
        'Content-Type': 'video/mp4',
      },
    });
  }

  // Full file response
  const stream = fs.createReadStream(videoPath);
  const webStream = new ReadableStream({
    start(controller) {
      stream.on('data', (chunk) => controller.enqueue(chunk));
      stream.on('end', () => controller.close());
      stream.on('error', (err) => controller.error(err));
    },
  });

  return new Response(webStream, {
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(fileSize),
      'Accept-Ranges': 'bytes',
    },
  });
}
