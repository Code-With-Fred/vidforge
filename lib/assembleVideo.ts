import { spawn, spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Emit a line to the SSE stream
type Emitter = (line: string) => void;

/**
 * Get system font path for cross-platform compatibility
 */
function getSystemFontPath(): string {
  const platform = os.platform();
  
  if (platform === 'win32') {
    return path.join(process.env.WINDIR || 'C:\\Windows', 'Fonts', 'arial.ttf');
  } else if (platform === 'darwin') {
    // macOS
    return '/Library/Fonts/Arial.ttf';
  } else {
    // Linux
    return '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
  }
}

// Run a command and stream stderr line-by-line to emitter
function runStreaming(
  cmd: string,
  args: string[],
  emit: Emitter
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    proc.stdout.on('data', (chunk: Buffer) => {
      chunk
        .toString()
        .split('\n')
        .filter(Boolean)
        .forEach((l) => emit(l));
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      // FFmpeg sends progress to stderr
      chunk
        .toString()
        .split('\n')
        .filter(Boolean)
        .forEach((l) => emit(l));
    });

    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });

    proc.on('error', reject);
  });
}

// Run a command silently, return stdout
function runSync(cmd: string, args: string[]): string {
  const result = spawnSync(cmd, args, { encoding: 'utf8' });
  if (result.error) throw result.error;
  return result.stdout.trim();
}

// Get duration of a media file in seconds using ffprobe
function getMediaDuration(filePath: string): number {
  try {
    const output = runSync('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath,
    ]);
    const duration = parseFloat(output);
    if (isNaN(duration) || duration <= 0) {
      throw new Error(`Invalid duration: ${output}`);
    }
    return duration;
  } catch (error) {
    throw new Error(`Failed to get media duration for ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Generate a silent black video card with text overlay
async function makeCard(
  outputPath: string,
  text: string,
  duration: number,
  emit: Emitter
): Promise<void> {
  emit(`[VidForge] Generating card: "${text}" (${duration}s)`);
  
  const fontPath = getSystemFontPath();
  
  await runStreaming('ffmpeg', [
    '-y',
    // Create black video source
    '-f', 'lavfi', '-i', `color=c=black:s=1920x1080:d=${duration}`,
    // Add silent audio
    '-f', 'lavfi', '-i', `anullsrc=r=44100:cl=stereo:d=${duration}`,
    // Draw white centered bold text
    '-vf', `drawtext=text='${text}':fontcolor=white:fontsize=72:x=(w-text_w)/2:y=(h-text_h)/2:fontfile='${fontPath}'`,
    '-c:v', 'libx264',   // H.264 video codec
    '-c:a', 'aac',       // AAC audio codec
    '-t', String(duration),
    outputPath,
  ], emit);
}

// Build a concat demuxer file listing all clip paths
function writeConcatFile(clips: string[], concatPath: string): void {
  const lines = clips.map((c) => `file '${c.replace(/\\/g, '/')}'`).join('\n');
  fs.writeFileSync(concatPath, lines + '\n', 'utf8');
}

export async function assembleVideo(
  videoId: string,
  voicePath: string,
  clips: string[],
  srtPath: string,
  emit: Emitter
): Promise<string> {
  const workDir = path.join(process.cwd(), 'output', 'videos', videoId);
  fs.mkdirSync(workDir, { recursive: true });

  const voiceDuration = getMediaDuration(voicePath);
  emit(`[VidForge] Voiceover duration: ${voiceDuration.toFixed(1)}s`);

  // ── 1. Concatenate footage clips to cover audio duration ──────────────────

  // Loop the clip list until we have enough coverage
  const loopedClips: string[] = [];
  let accumulated = 0;
  while (accumulated < voiceDuration && clips.length > 0) {
    for (const clip of clips) {
      if (accumulated >= voiceDuration) break;
      loopedClips.push(clip);
      accumulated += getMediaDuration(clip);
    }
  }

  const concatFile = path.join(workDir, 'footage_list.txt');
  writeConcatFile(loopedClips, concatFile);

  const rawFootage = path.join(workDir, 'raw_footage.mp4');
  emit('[VidForge] Concatenating footage clips...');
  await runStreaming('ffmpeg', [
    '-y',
    '-f', 'concat',        // use concat demuxer
    '-safe', '0',          // allow absolute paths in concat file
    '-i', concatFile,
    '-c', 'copy',          // stream copy (fast, no re-encode)
    rawFootage,
  ], emit);

  // ── 2. Pick background music file ────────────────────────────────────────

  const musicDir = path.join(process.cwd(), 'music');
  const musicFiles = fs.existsSync(musicDir)
    ? fs.readdirSync(musicDir).filter((f) => f.endsWith('.mp3'))
    : [];
  const musicPath = musicFiles.length > 0
    ? path.join(musicDir, musicFiles[0])
    : null;

  // ── 3. Build main video: footage + voiceover + music + captions ──────────

  const mainOutput = path.join(workDir, 'main.mp4');
  emit('[VidForge] Assembling main video with audio and captions...');

  // Normalise SRT path for ffmpeg subtitles filter (needs forward slashes + escaped colons on Windows)
  const srtNorm = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:');

  // Filter graph differs depending on whether background music is present
  const inputs: string[] = [
    '-y',
    '-i', rawFootage,   // input 0: footage
    '-i', voicePath,    // input 1: voiceover
  ];
  if (musicPath) inputs.push('-i', musicPath); // input 2 (optional): music

  let audioFilter: string;
  if (musicPath) {
    audioFilter =
      // Voiceover at full volume
      '[1:a]volume=1.0[voice];' +
      // Background music at 15% volume, loop it to cover full duration
      `[2:a]volume=0.15,aloop=loop=-1:size=2e+09[music];` +
      // Mix both audio streams, duration from voiceover (first input)
      '[voice][music]amix=inputs=2:duration=first[audio]';
  } else {
    audioFilter = '[1:a]volume=1.0[audio]';
  }

  // Video filter: scale → pad → subtitles → section title watermark
  const srtExists = fs.existsSync(srtPath) && srtPath !== '';
  const subtitleFilter = srtExists
    ? `,subtitles='${srtNorm}':force_style='FontSize=22,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=2,Alignment=2'`
    : '';

  const videoFilter =
    // Scale to 1920x1080, keep aspect ratio, add black bars if needed
    `scale=1920:1080:force_original_aspect_ratio=decrease,` +
    `pad=1920:1080:(ow-iw)/2:(oh-ih)/2` +
    subtitleFilter +
    // Small branding watermark top-left, visible for first 3 seconds
    `,drawtext=text='VidForge':fontcolor=white@0.6:fontsize=28:x=30:y=30:enable='between(t,0,3)'`;

  await runStreaming('ffmpeg', [
    ...inputs,
    '-filter_complex', audioFilter,
    '-vf', videoFilter,
    '-map', '0:v',       // video from footage
    '-map', '[audio]',   // mixed audio
    '-c:v', 'libx264',   // H.264 video codec
    '-preset', 'fast',   // encoding speed/quality tradeoff
    '-crf', '23',        // constant rate factor (lower = better quality)
    '-c:a', 'aac',       // AAC audio codec
    '-b:a', '192k',      // audio bitrate
    '-shortest',         // stop when shortest input ends (voiceover)
    '-t', String(voiceDuration + 1), // hard cap at audio duration
    mainOutput,
  ], emit);

  // ── 4. Create intro card (3s) and outro card (5s) ─────────────────────────

  const introPath = path.join(workDir, 'intro.mp4');
  const outroPath = path.join(workDir, 'outro.mp4');

  await makeCard(introPath, 'VidForge', 3, emit);
  await makeCard(outroPath, 'Like & Subscribe', 5, emit);

  // ── 5. Concatenate intro + main + outro ───────────────────────────────────

  const finalConcatFile = path.join(workDir, 'final_list.txt');
  writeConcatFile([introPath, mainOutput, outroPath], finalConcatFile);

  const finalOutput = path.join(process.cwd(), 'output', 'videos', `${videoId}.mp4`);
  emit('[VidForge] Concatenating intro + main + outro...');
  await runStreaming('ffmpeg', [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', finalConcatFile,
    '-c', 'copy',   // stream copy for fast final merge
    finalOutput,
  ], emit);

  emit(`[VidForge] Done! Output: ${finalOutput}`);
  return finalOutput;
}
