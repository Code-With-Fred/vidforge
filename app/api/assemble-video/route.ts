import { NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { connectDB } from '@/lib/mongodb';
import Video from '@/models/Video';
import { assembleVideo } from '@/lib/assembleVideo';

// SSE helper: format a data line
function sseData(data: string): string {
  return `data: ${JSON.stringify({ log: data })}\n\n`;
}

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get('videoId');

  if (!videoId) {
    return new Response('videoId required', { status: 400 });
  }

  // Set up SSE response
  const encoder = new TextEncoder();
  // Use an object wrapper so the reference stays mutable inside closures
  const ctrl: { ref: ReadableStreamDefaultController<Uint8Array> | null } = { ref: null };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      ctrl.ref = controller;
    },
    cancel() {
      ctrl.ref = null;
    },
  });

  const response = new Response(stream as ReadableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });

  // Run assembly in background and pipe logs to SSE
  (async () => {
    const emit = (line: string) => {
      if (!ctrl.ref) return;
      try {
        ctrl.ref.enqueue(encoder.encode(sseData(line)));
      } catch {
        // stream closed
      }
    };

    try {
      await connectDB();
      const video = await Video.findById(videoId);
      if (!video) throw new Error(`Video ${videoId} not found in database`);

      await Video.findByIdAndUpdate(videoId, { status: 'rendering' });

      const voicePath = video.voiceover_path;
      if (!voicePath || !fs.existsSync(voicePath)) {
        throw new Error('Voiceover file not found. Generate voice first.');
      }

      // Collect footage clips for this video
      const footageDir = path.join(
        process.cwd(),
        'output',
        'footage',
        videoId
      );
      const clips = fs.existsSync(footageDir)
        ? fs
            .readdirSync(footageDir)
            .filter((f) => f.endsWith('.mp4'))
            .map((f) => path.join(footageDir, f))
        : [];

      if (clips.length === 0) {
        throw new Error('No footage clips found. Fetch footage first.');
      }

      // Run Whisper transcription to generate SRT
      emit('[VidForge] Running Whisper transcription for captions...');
      const srtPath = voicePath.replace('.mp3', '.srt');
      await new Promise<void>((resolve, reject) => {
        const proc = spawn('python', [
          path.join(process.cwd(), 'scripts', 'transcribe.py'),
          '--audio', voicePath,
        ]);
        proc.stdout.on('data', (d: Buffer) => emit(d.toString().trim()));
        proc.stderr.on('data', (d: Buffer) => emit(d.toString().trim()));
        proc.on('close', (code) =>
          code === 0 ? resolve() : reject(new Error(`Whisper exited ${code}`))
        );
        proc.on('error', reject);
      });

      const finalPath = await assembleVideo(
        videoId,
        voicePath,
        clips,
        srtPath,
        emit
      );

      await Video.findByIdAndUpdate(videoId, {
        video_path: finalPath,
        status: 'ready',
      });

      if (ctrl.ref) {
        ctrl.ref.enqueue(
          encoder.encode(sseEvent('done', { videoPath: finalPath }))
        );
        ctrl.ref.close();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      emit(`[ERROR] ${message}`);
      await Video.findByIdAndUpdate(videoId, { status: 'draft' }).catch(() => {});
      if (ctrl.ref) {
        ctrl.ref.enqueue(
          encoder.encode(sseEvent('error', { error: message }))
        );
        ctrl.ref.close();
      }
    }
  })();

  return response;
}
