/**
 * External API calls and timeouts
 * Centralized management of all external API requests with proper error handling, retries, and timeouts
 */

import { logger } from './logger';
import { ApiError, ErrorCode } from './apiResponse';

interface RetryOptions {
  maxRetries?: number;
  backoffMs?: number;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_RETRIES = 2;
const DEFAULT_BACKOFF = 1000; // 1 second

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch with retry and timeout
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const maxRetries = retryOptions.maxRetries ?? DEFAULT_RETRIES;
  const backoffMs = retryOptions.backoffMs ?? DEFAULT_BACKOFF;
  const timeoutMs = retryOptions.timeoutMs ?? DEFAULT_TIMEOUT;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      logger.debug(`API request (attempt ${attempt + 1}/${maxRetries + 1})`, 'API', { url });

      const response = await fetchWithTimeout(url, options, timeoutMs);

      // Only retry on server errors, not client errors
      if (response.status >= 500 && attempt < maxRetries) {
        logger.warn(`Server error ${response.status}, retrying...`, 'API');
        await new Promise(r => setTimeout(r, backoffMs * Math.pow(2, attempt)));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        logger.warn(`API request failed, retrying in ${backoffMs * Math.pow(2, attempt)}ms`, 'API', error);
        await new Promise(r => setTimeout(r, backoffMs * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError || new Error('Failed to fetch');
}

/**
 * Ollama API request
 */
export async function callOllama(
  prompt: string,
  model = 'llama3',
  baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
): Promise<string> {
  try {
    const response = await fetchWithRetry(
      `${baseUrl}/api/generate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          options: {
            temperature: 0.8,
            num_predict: 2000,
          },
        }),
      },
      { maxRetries: 1, timeoutMs: 60000 }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new ApiError(
        ErrorCode.EXTERNAL_API_ERROR,
        502,
        `Ollama error: ${text}`
      );
    }

    const data = (await response.json()) as { response: string };
    return data.response.trim();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      ErrorCode.EXTERNAL_API_ERROR,
      503,
      'Ollama service unavailable'
    );
  }
}

/**
 * Pexels API request
 */
export async function fetchPexelsVideos(
  query: string,
  apiKey: string,
  perPage = 5
): Promise<Array<{
  id: number;
  link: string;
  quality: string;
}>> {
  if (!apiKey) {
    throw new ApiError(
      ErrorCode.BAD_REQUEST,
      400,
      'Pexels API key not configured'
    );
  }

  try {
    const response = await fetchWithRetry(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${perPage}`,
      {
        headers: { Authorization: apiKey },
      },
      { maxRetries: 2, timeoutMs: 15000 }
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new ApiError(
          ErrorCode.FORBIDDEN,
          403,
          'Invalid Pexels API key'
        );
      }
      throw new ApiError(
        ErrorCode.EXTERNAL_API_ERROR,
        502,
        `Pexels API error: ${response.status}`
      );
    }

    const data = (await response.json()) as {
      videos: Array<{
        id: number;
        video_files: Array<{
          link: string;
          quality: string;
          file_type: string;
          width: number;
          height: number;
        }>;
      }>;
    };

    return data.videos.map((v) => {
      // Prefer HD MP4, fallback to any MP4
      const file = v.video_files.find(
        (f) => f.file_type === 'video/mp4' && f.quality === 'hd'
      ) ?? v.video_files.find((f) => f.file_type === 'video/mp4');

      return {
        id: v.id,
        link: file?.link || '',
        quality: file?.quality || 'sd',
      };
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      ErrorCode.EXTERNAL_API_ERROR,
      502,
      'Pexels API request failed'
    );
  }
}

/**
 * Alternative: Unsplash API (free, no API key required for basic usage)
 */
export async function fetchUnsplashVideos(
  query: string,
  perPage = 5
): Promise<Array<{ link: string; author: string }>> {
  try {
    // Unsplash has a free tier with search
    const response = await fetchWithRetry(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`,
      {
        headers: {
          'Accept-Version': 'v1',
        },
      },
      { maxRetries: 2, timeoutMs: 15000 }
    );

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      results: Array<{
        links: { download: string };
        user: { name: string };
      }>;
    };

    return data.results.map((r) => ({
      link: r.links.download,
      author: r.user.name,
    }));
  } catch (error) {
    logger.warn('Unsplash API request failed', 'API', error);
    throw new ApiError(
      ErrorCode.EXTERNAL_API_ERROR,
      502,
      'Unsplash API request failed'
    );
  }
}

/**
 * Hacker News API (completely free)
 */
export async function fetchHackerNewsTopics(limit = 10): Promise<string[]> {
  try {
    const idsResponse = await fetchWithRetry(
      'https://hacker-news.firebaseio.com/v0/topstories.json',
      {},
      { maxRetries: 1, timeoutMs: 10000 }
    );

    if (!idsResponse.ok) {
      throw new Error(`HN API error: ${idsResponse.status}`);
    }

    const ids = (await idsResponse.json()) as number[];

    // Fetch stories in parallel with timeout
    const stories = await Promise.all(
      ids.slice(0, 30).map((id) =>
        fetchWithRetry(
          `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
          {},
          { maxRetries: 0, timeoutMs: 5000 }
        )
          .then((r) => r.ok ? r.json() : null)
          .catch(() => null)
      )
    );

    return stories
      .filter((s) => s?.title)
      .slice(0, limit)
      .map((s) => s.title as string);
  } catch (error) {
    logger.warn('Hacker News fetch failed', 'API', error);
    return [];
  }
}

/**
 * NewsAPI (free tier available)
 */
export async function fetchNewsAPITopics(
  apiKey: string,
  limit = 10
): Promise<string[]> {
  if (!apiKey) return [];

  try {
    const response = await fetchWithRetry(
      `https://newsapi.org/v2/top-headlines?country=us&apiKey=${apiKey}`,
      {},
      { maxRetries: 1, timeoutMs: 10000 }
    );

    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.status}`);
    }

    const data = (await response.json()) as {
      articles: Array<{ title: string }>;
    };

    return data.articles
      .slice(0, limit)
      .map((a) => a.title);
  } catch (error) {
    logger.warn('NewsAPI fetch failed', 'API', error);
    return [];
  }
}

/**
 * Validate API health
 */
export async function checkAPIHealth(
  name: string,
  url: string,
  timeoutMs = 5000
): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(url, {}, timeoutMs);
    return response.ok;
  } catch (error) {
    logger.warn(`${name} health check failed`, 'API_HEALTH', error);
    return false;
  }
}
