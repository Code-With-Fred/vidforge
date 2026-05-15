import { NextResponse } from 'next/server';
import { logger } from './logger';

/**
 * Standardized API response format
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Common error codes
 */
export const ErrorCode = {
  // 400s
  BAD_REQUEST: 'BAD_REQUEST',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_PARAM: 'MISSING_PARAM',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // 500s
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;

/**
 * Helper to build success response
 */
export function successResponse<T>(data: T, statusCode = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    } as ApiResponse<T>,
    { status: statusCode }
  );
}

/**
 * Helper to build error response
 */
export function errorResponse(
  error: ApiError | Error | unknown,
  context?: string
): NextResponse<ApiResponse> {
  let statusCode = 500;
  let code = ErrorCode.INTERNAL_ERROR;
  let message = 'An unexpected error occurred';
  let details: unknown;

  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
    details = error.details;
  } else if (error instanceof Error) {
    message = error.message;
  }

  // Log the error
  logger.error(message, context, error);

  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(process.env.NODE_ENV === 'development' && { details }),
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse,
    { status: statusCode }
  );
}

/**
 * Safely parse JSON with error handling
 */
export async function parseRequestJson<T>(req: Request): Promise<T> {
  try {
    return await req.json();
  } catch {
    throw new ApiError(
      ErrorCode.BAD_REQUEST,
      400,
      'Invalid JSON in request body'
    );
  }
}
