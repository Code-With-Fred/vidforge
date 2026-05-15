import { logger } from './logger';

/**
 * Required environment variables
 */
const REQUIRED_ENV_VARS = [
  'MONGODB_URI',
  'PEXELS_API_KEY',
  'YOUTUBE_CLIENT_ID',
  'YOUTUBE_CLIENT_SECRET',
  'YOUTUBE_REDIRECT_URI',
] as const;

/**
 * Optional environment variables with defaults
 */
const OPTIONAL_ENV_VARS: Record<string, string> = {
  OLLAMA_BASE_URL: 'http://localhost:11434',
  NODE_ENV: 'development',
  LOG_LEVEL: 'info',
  RATE_LIMIT_WINDOW_MS: '900000', // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: '100',
} as const;

interface ValidatedEnv {
  MONGODB_URI: string;
  PEXELS_API_KEY: string;
  YOUTUBE_CLIENT_ID: string;
  YOUTUBE_CLIENT_SECRET: string;
  YOUTUBE_REDIRECT_URI: string;
  OLLAMA_BASE_URL: string;
  NODE_ENV: 'development' | 'production' | 'test';
  LOG_LEVEL: string;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
}

let validatedEnv: ValidatedEnv | null = null;

/**
 * Validate and retrieve environment variables
 * Call this at application startup
 */
export function validateEnv(): ValidatedEnv {
  if (validatedEnv) return validatedEnv;

  const missing: string[] = [];

  // Check required vars
  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    const message = `Missing required environment variables: ${missing.join(', ')}`;
    logger.error(message, 'ENV_VALIDATION');
    throw new Error(message);
  }

  // Build validated env object
  validatedEnv = {
    MONGODB_URI: process.env.MONGODB_URI!,
    PEXELS_API_KEY: process.env.PEXELS_API_KEY!,
    YOUTUBE_CLIENT_ID: process.env.YOUTUBE_CLIENT_ID!,
    YOUTUBE_CLIENT_SECRET: process.env.YOUTUBE_CLIENT_SECRET!,
    YOUTUBE_REDIRECT_URI: process.env.YOUTUBE_REDIRECT_URI!,
    OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || OPTIONAL_ENV_VARS.OLLAMA_BASE_URL,
    NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
    LOG_LEVEL: process.env.LOG_LEVEL || OPTIONAL_ENV_VARS.LOG_LEVEL,
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || OPTIONAL_ENV_VARS.RATE_LIMIT_WINDOW_MS, 10),
    RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || OPTIONAL_ENV_VARS.RATE_LIMIT_MAX_REQUESTS, 10),
  };

  logger.info('Environment variables validated', 'ENV_VALIDATION', {
    nodeEnv: validatedEnv.NODE_ENV,
    mongodbUri: validatedEnv.MONGODB_URI.substring(0, 30) + '...',
  });

  return validatedEnv;
}

/**
 * Get a validated environment variable
 */
export function getEnv<K extends keyof ValidatedEnv>(key: K): ValidatedEnv[K] {
  if (!validatedEnv) {
    validateEnv();
  }
  return validatedEnv![key];
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return getEnv('NODE_ENV') === 'development';
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return getEnv('NODE_ENV') === 'production';
}
