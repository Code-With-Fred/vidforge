import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Video from '@/models/Video';
import { successResponse, errorResponse, ApiError, ErrorCode } from '@/lib/apiResponse';
import { validateTopic, ValidationError } from '@/lib/validation';
import { withErrorHandling, rateLimiter } from '@/lib/middleware';
import { logger } from '@/lib/logger';

export const GET = withErrorHandling(async (req: NextRequest) => {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  
  // Check rate limit
  if (!rateLimiter.isAllowed(ip)) {
    throw new ApiError(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      429,
      'Too many requests. Please try again later.'
    );
  }

  await connectDB();

  // Get pagination params
  const page = parseInt(req.nextUrl.searchParams.get('page') || '1', 10);
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20', 10);
  const status = req.nextUrl.searchParams.get('status');

  if (page < 1) throw new ValidationError('page must be >= 1', 'page');
  if (limit < 1 || limit > 100) throw new ValidationError('limit must be 1-100', 'limit');

  const skip = (page - 1) * limit;
  const query = status ? { status } : {};

  const [videos, total] = await Promise.all([
    Video.find(query).sort({ created_at: -1 }).skip(skip).limit(limit).lean(),
    Video.countDocuments(query),
  ]);

  logger.info(`Retrieved ${videos.length} videos`, 'VIDEOS_GET');

  return successResponse({
    videos,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}, 'GET /api/videos');

export const POST = withErrorHandling(async (req: NextRequest) => {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';

  // Check rate limit
  if (!rateLimiter.isAllowed(ip)) {
    throw new ApiError(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      429,
      'Too many requests. Please try again later.'
    );
  }

  const body = await req.json() as { topic: string };

  // Validate topic
  let topic: string;
  try {
    topic = validateTopic(body.topic);
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ApiError(ErrorCode.BAD_REQUEST, 400, 'Invalid topic');
  }

  await connectDB();

  const video = await Video.create({ topic });

  logger.info(`Created new video: ${video._id}`, 'VIDEOS_POST', { topic });

  return successResponse(
    { videoId: video._id.toString() },
    201
  );
}, 'POST /api/videos');
