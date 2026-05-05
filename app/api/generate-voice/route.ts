import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

function runPython(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('python', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d: Buffer) => (stdout += d.toString()));
    proc.stderr.on('data', (d: Buffer) => (stderr += d.toString()));

    proc.on('close', (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr || `python exited with code ${code}`));
    });
    proc.on('error', reject);
  });
}

function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath,
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    let out = '';
    proc.stdout.on('data', (d: Buffer) => (out += d.toString()));
    proc.on('close', () => resolve(parseFloat(out.trim()) || 0));
    proc.on('error', reject);
  });
}

export async function POST(req: NextRequest) {
  try {
    const { script, voice = 'en-US-ChristopherNeural', videoId } =
      await req.json() as { script: string; voice?: string; videoId: string };

    if (!script?.trim()) {
      return NextResponse.json({ error: 'script is required' }, { status: 400 });
    }
    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }

    const audioDir = path.join(process.cwd(), 'output', 'audio');
    fs.mkdirSync(audioDir, { recursive: true });

    const audioPath = path.join(audioDir, `${videoId}.mp3`);
    const scriptPath = path.join(audioDir, `${videoId}.txt`);

    // Write script to temp file to avoid shell escaping issues with long text
    fs.writeFileSync(scriptPath, script, 'utf8');

    // Read text from file inside Python instead of passing on CLI
    // We pass --text directly but write to file as fallback if text is too long
    await runPython([
      path.join(process.cwd(), 'scripts', 'generate_voice.py'),
      '--text', script,
      '--output', audioPath,
      '--voice', voice,
    ]);

    const duration = await getAudioDuration(audioPath);

    return NextResponse.json({ audioPath, duration });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
