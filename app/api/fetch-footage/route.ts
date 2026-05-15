import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Settings from '@/models/Settings';
import { extractSectionKeywords } from '@/lib/extractKeywords';
import { fetchFootageClips } from '@/lib/fetchFootage';
import { successResponse, errorResponse, ApiError, ErrorCode } from '@/lib/apiResponse';
import { withErrorHandling } from '@/lib/middleware';
import { validateScript } from '@/lib/validation';
import { logger } from '@/lib/logger';

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json() as { script?: string; videoId?: string };

  // Validate inputs
  const script = validateScript(body.script);

  if (!body.videoId) {
    throw new ApiError(ErrorCode.MISSING_PARAM, 400, 'videoId is required');
  }

  // Get Pexels API key from settings or env
  await connectDB();
  const settings = await Settings.findOne().lean();
  const apiKey = settings?.pexels_api_key || process.env.PEXELS_API_KEY || '';

  if (!apiKey) {
    throw new ApiError(
      ErrorCode.BAD_REQUEST,
      400,
      'Pexels API key not configured. Add it in Settings.'
    );
  }

  logger.info('Fetching footage clips', 'FETCH_FOOTAGE', { videoId: body.videoId });

  const keywords = extractSectionKeywords(script);
  logger.info('Extracted keywords', 'FETCH_FOOTAGE', { keywords });

  const clips = await fetchFootageClips(keywords, apiKey, body.videoId);

  if (clips.length === 0) {
    throw new ApiError(
      ErrorCode.EXTERNAL_API_ERROR,
      502,
      'No footage clips could be downloaded. Check your Pexels API key or try different keywords.'
    );
  }

  logger.info('Footage fetched successfully', 'FETCH_FOOTAGE', { clipCount: clips.length });

  return successResponse({ clips, keywords });
}, 'POST /api/fetch-footage');
