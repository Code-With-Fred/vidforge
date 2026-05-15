/**
 * Centralized logging system
 * Provides structured logging with timestamps and severity levels
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  context?: string;
  data?: unknown;
}

class Logger {
  private isDev = process.env.NODE_ENV === 'development';

  private formatLog(entry: LogEntry): string {
    const { timestamp, level, message, context, data } = entry;
    let log = `[${timestamp}] [${level}]${context ? ` [${context}]` : ''}: ${message}`;
    if (data && this.isDev) {
      log += `\n${JSON.stringify(data, null, 2)}`;
    }
    return log;
  }

  private log(level: LogLevel, message: string, context?: string, data?: unknown) {
    const entry: LogEntry = {
      level,
      timestamp: new Date().toISOString(),
      message,
      context,
      data,
    };

    const formatted = this.formatLog(entry);

    // Output based on level
    switch (level) {
      case LogLevel.DEBUG:
        if (this.isDev) console.debug(formatted);
        break;
      case LogLevel.INFO:
        console.log(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
        console.error(formatted);
        break;
    }

    // TODO: Send to external logging service (DataDog, Sentry, etc.) in production
  }

  debug(message: string, context?: string, data?: unknown) {
    this.log(LogLevel.DEBUG, message, context, data);
  }

  info(message: string, context?: string, data?: unknown) {
    this.log(LogLevel.INFO, message, context, data);
  }

  warn(message: string, context?: string, data?: unknown) {
    this.log(LogLevel.WARN, message, context, data);
  }

  error(message: string, context?: string, error?: unknown) {
    const errorData = error instanceof Error 
      ? { message: error.message, stack: error.stack }
      : error;
    this.log(LogLevel.ERROR, message, context, errorData);
  }
}

export const logger = new Logger();
