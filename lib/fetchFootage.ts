import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';
import { logger } from './logger';
import { fetchPexelsVideos } from './externalApis';

const RETRY_ATTEMPTS = 2;

// Download a file from URL to destination path with timeout
function downloadFile(url: string, dest: string, timeoutMs = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    let timeoutId: NodeJS.Timeout | null = null;

    const onTimeout = () => {
      file.destroy();
      fs.unlink(dest, () => {});
      reject(new Error('Download timeout'));
    };

    timeoutId = setTimeout(onTimeout, timeoutMs);

    protocol
      .get(url, (res) => {
        // Check for redirect or error status
        if (res.statusCode && res.statusCode >= 400) {
          file.destroy();
          fs.unlink(dest, () => {});
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }

        res.pipe(file);
        file.on('finish', () => {
          if (timeoutId) clearTimeout(timeoutId);
          file.close(() => resolve());
        });
      })
      .on('error', (err) => {
        if (timeoutId) clearTimeout(timeoutId);
        file.destroy();
        fs.unlink(dest, () => {});
        reject(err);
      })
      .on('timeout', () => {
        if (timeoutId) clearTimeout(timeoutId);
        file.destroy();
        fs.unlink(dest, () => {});
        reject(new Error('Connection timeout'));
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
  for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt++) {
    try {
      const videos = await fetchPexelsVideos(keyword, apiKey, 5);

      if (videos.length === 0) {
        logger.warn(`No videos found for keyword: ${keyword}`, 'FETCH_FOOTAGE');
        return null;
      }

      const video = videos[0];
      if (!video.link) {
        logger.warn(`Invalid video link for ${keyword}`, 'FETCH_FOOTAGE');
        return null;
      }

      const filename = `clip_${index}_${Date.now()}.mp4`;
      const dest = path.join(outputDir, filename);

      await downloadFile(video.link, dest, 60000);
      logger.info(`Downloaded clip: ${filename}`, 'FETCH_FOOTAGE');
      return dest;
    } catch (error) {
      logger.warn(
        `Attempt ${attempt + 1}/${RETRY_ATTEMPTS} failed for keyword "${keyword}"`,
        'FETCH_FOOTAGE',
        error
      );

      if (attempt < RETRY_ATTEMPTS - 1) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  return null;
}

export async function fetchFootageClips(
  keywords: string[],
  apiKey: string,
  videoId: string
): Promise<string[]> {
  const outputDir = path.join(process.cwd(), 'output', 'footage', videoId);
  
  try {
    fs.mkdirSync(outputDir, { recursive: true });
  } catch (error) {
    logger.error('Failed to create footage directory', 'FETCH_FOOTAGE', error);
    throw error;
  }

  const clips: string[] = [];

  // Fetch clips sequentially to avoid rate limiting
  for (let i = 0; i < keywords.length; i++) {
    try {
      const clip = await fetchClipForKeyword(keywords[i], apiKey, outputDir, i);
      if (clip) {
        clips.push(clip);
      }
    } catch (error) {
      logger.error(`Failed to fetch clip for "${keywords[i]}"`, 'FETCH_FOOTAGE', error);
      // Continue with next keyword instead of failing
    }
  }

  return clips;
}
