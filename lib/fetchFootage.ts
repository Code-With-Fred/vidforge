import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';

const PEXELS_BASE = 'https://api.pexels.com/videos';

interface PexelsVideoFile {
  link: string;
  quality: string;
  file_type: string;
  width: number;
  height: number;
}

interface PexelsVideo {
  id: number;
  video_files: PexelsVideoFile[];
}

interface PexelsResponse {
  videos: PexelsVideo[];
}

// Download a file from URL to destination path
function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    protocol
      .get(url, (res) => {
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve()));
      })
      .on('error', (err) => {
        fs.unlink(dest, () => {}); // clean up partial file
        reject(err);
      });
  });
}

// Search Pexels for a video clip matching keyword and download it
async function fetchClipForKeyword(
  keyword: string,
  apiKey: string,
  outputDir: string,
  index: number
): Promise<string | null> {
  const url = `${PEXELS_BASE}/search?query=${encodeURIComponent(keyword)}&per_page=5&orientation=landscape`;

  const res = await fetch(url, {
    headers: { Authorization: apiKey },
  });

  if (!res.ok) {
    console.error(`Pexels API error for "${keyword}": ${res.status}`);
    return null;
  }

  const data = (await res.json()) as PexelsResponse;
  if (!data.videos || data.videos.length === 0) return null;

  const video = data.videos[0];

  // Prefer HD (1920x1080) mp4, fallback to any mp4
  const file =
    video.video_files.find(
      (f) => f.file_type === 'video/mp4' && f.quality === 'hd'
    ) ?? video.video_files.find((f) => f.file_type === 'video/mp4');

  if (!file) return null;

  const filename = `clip_${index}_${video.id}.mp4`;
  const dest = path.join(outputDir, filename);

  await downloadFile(file.link, dest);
  return dest;
}

export async function fetchFootageClips(
  keywords: string[],
  apiKey: string,
  videoId: string
): Promise<string[]> {
  const outputDir = path.join(process.cwd(), 'output', 'footage', videoId);
  fs.mkdirSync(outputDir, { recursive: true });

  const clips: string[] = [];

  for (let i = 0; i < keywords.length; i++) {
    try {
      const clip = await fetchClipForKeyword(keywords[i], apiKey, outputDir, i);
      if (clip) clips.push(clip);
    } catch (err) {
      console.error(`Failed to fetch clip for "${keywords[i]}":`, err);
    }
  }

  return clips;
}
