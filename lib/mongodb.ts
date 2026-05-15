import mongoose from 'mongoose';
import { logger } from './logger';
import { getEnv } from './env';

// Singleton pattern: reuse connection across Next.js hot reloads in dev mode
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache;
}

const cached: MongooseCache = global.mongoose ?? { conn: null, promise: null };
global.mongoose = cached;

export async function connectDB(): Promise<typeof mongoose> {
  const MONGODB_URI = getEnv('MONGODB_URI');

  if (cached.conn) {
    logger.debug('Using cached MongoDB connection', 'DB');
    return cached.conn;
  }

  if (!cached.promise) {
    logger.info('Establishing new MongoDB connection', 'DB');

    cached.promise = mongoose.connect(MONGODB_URI, {
      // Connection pooling
      maxPoolSize: 10,
      minPoolSize: 5,

      // Timeouts
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,

      // Retries
      retryWrites: true,
      retryReads: true,

      // Command buffering
      bufferCommands: false,

      // Driver monitoring (useful for debugging)
      monitorCommands: process.env.NODE_ENV === 'development',
    });
  }

  try {
    cached.conn = await cached.promise;
    logger.info('MongoDB connection established', 'DB');
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    logger.error('Failed to connect to MongoDB', 'DB', error);
    throw error;
  }
}

/**
 * Disconnect from MongoDB (useful for cleanup/testing)
 */
export async function disconnectDB(): Promise<void> {
  if (cached.conn) {
    await cached.conn.disconnect();
    cached.conn = null;
    cached.promise = null;
    logger.info('MongoDB disconnected', 'DB');
  }
}

/**
 * Get connection status
 */
export function getDBStatus(): {
  connected: boolean;
  readyState: number;
} {
  return {
    connected: cached.conn?.connection?.readyState === 1,
    readyState: cached.conn?.connection?.readyState ?? 0,
  };
}
