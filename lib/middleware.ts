import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, ApiError } from './apiResponse';
import { logger } from './logger';
import { ValidationError } from './validation';

/**
 * Middleware wrapper for API routes with error handling
 * Usage:
 * export const POST = withErrorHandling(async (req) => { ... }, 'POST /api/videos')
 */
export function withErrorHandling(
  handler: (req: NextRequest) => Promise<NextResponse>,
  context: string
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    logger.info(`${req.method} ${req.nextUrl.pathname}`, 'API_REQUEST');

    try {
      const response = await handler(req);
      logger.debug(`Response: ${response.status}`, context);
      return response;
    } catch (error) {
      logger.error(`Error in ${context}`, context, error);

      if (error instanceof ValidationError) {
        return errorResponse(error, context);
      }

      if (error instanceof ApiError) {
        return errorResponse(error, context);
      }

      if (error instanceof Error) {
        const apiError = new ApiError(
          'INTERNAL_ERROR',
          500,
          process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        );
        return errorResponse(apiError, context);
      }

      return errorResponse(
        new ApiError('INTERNAL_ERROR', 500, 'An unexpected error occurred'),
        context
      );
    }
  };
}

/**
 * Middleware for adding security headers
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  response.headers.set('Content-Security-Policy', "default-src 'self'");
  return response;
}

/**
 * Simple rate limiting tracker (in-memory, not distributed)
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs = 15 * 60 * 1000, maxRequests = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetAt) {
      this.store.set(key, {
        count: 1,
        resetAt: now + this.windowMs,
      });
      return true;
    }

    if (entry.count < this.maxRequests) {
      entry.count++;
      return true;
    }

    return false;
  }

  getRemainingRequests(key: string): number {
    const entry = this.store.get(key);
    if (!entry || Date.now() > entry.resetAt) {
      return this.maxRequests;
    }
    return Math.max(0, this.maxRequests - entry.count);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetAt) {
        this.store.delete(key);
      }
    }
  }
}

export const rateLimiter = new RateLimiter(15 * 60 * 1000, 100);
