import { ApiError, ErrorCode } from './apiResponse';

/**
 * Validate and sanitize user input
 */

export class ValidationError extends ApiError {
  constructor(message: string, public field?: string) {
    super(ErrorCode.INVALID_INPUT, 400, message);
    this.name = 'ValidationError';
  }
}

/**
 * String validators
 */
export function validateString(value: unknown, fieldName: string, options?: {
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
}): string {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`, fieldName);
  }

  const trimmed = value.trim();

  if (options?.minLength && trimmed.length < options.minLength) {
    throw new ValidationError(
      `${fieldName} must be at least ${options.minLength} characters`,
      fieldName
    );
  }

  if (options?.maxLength && trimmed.length > options.maxLength) {
    throw new ValidationError(
      `${fieldName} must be at most ${options.maxLength} characters`,
      fieldName
    );
  }

  if (options?.pattern && !options.pattern.test(trimmed)) {
    throw new ValidationError(
      `${fieldName} has invalid format`,
      fieldName
    );
  }

  return trimmed;
}

/**
 * Required field validator
 */
export function validateRequired<T>(value: T | null | undefined, fieldName: string): T {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }
  return value;
}

/**
 * Array validators
 */
export function validateArray<T>(value: unknown, fieldName: string, options?: {
  minItems?: number;
  maxItems?: number;
}): unknown[] {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an array`, fieldName);
  }

  if (options?.minItems && value.length < options.minItems) {
    throw new ValidationError(
      `${fieldName} must have at least ${options.minItems} items`,
      fieldName
    );
  }

  if (options?.maxItems && value.length > options.maxItems) {
    throw new ValidationError(
      `${fieldName} must have at most ${options.maxItems} items`,
      fieldName
    );
  }

  return value;
}

/**
 * Topic validator (for VidForge)
 */
export function validateTopic(topic: unknown): string {
  const validated = validateString(topic, 'topic', {
    minLength: 3,
    maxLength: 500,
  });
  return validateRequired(validated, 'topic');
}

/**
 * Script validator (for VidForge)
 */
export function validateScript(script: unknown): string {
  const validated = validateString(script, 'script', {
    minLength: 100,
    maxLength: 10000,
  });
  return validateRequired(validated, 'script');
}

/**
 * Tags validator
 */
export function validateTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) {
    throw new ValidationError('tags must be an array', 'tags');
  }

  if (tags.length > 15) {
    throw new ValidationError('Maximum 15 tags allowed', 'tags');
  }

  return tags.map((tag, idx) => {
    if (typeof tag !== 'string') {
      throw new ValidationError(`tags[${idx}] must be a string`, `tags[${idx}]`);
    }
    const trimmed = tag.trim();
    if (trimmed.length === 0 || trimmed.length > 50) {
      throw new ValidationError('Each tag must be 1-50 characters', `tags[${idx}]`);
    }
    return trimmed;
  });
}

/**
 * Sanitize HTML entities
 */
export function sanitizeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validate YouTube URL
 */
export function validateYoutubeUrl(url: unknown): string {
  const urlStr = validateString(url, 'youtubeUrl');
  try {
    const parsed = new URL(urlStr);
    if (!['youtube.com', 'youtu.be', 'www.youtube.com'].includes(parsed.hostname)) {
      throw new Error('Invalid YouTube domain');
    }
    return urlStr;
  } catch {
    throw new ValidationError('Invalid YouTube URL', 'youtubeUrl');
  }
}

/**
 * Validate enum value
 */
export function validateEnum<T extends Record<string, unknown>>(
  value: unknown,
  enumObj: T,
  fieldName: string
): T[keyof T] {
  const values = Object.values(enumObj);
  if (!values.includes(value)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${values.join(', ')}`,
      fieldName
    );
  }
  return value as T[keyof T];
}
