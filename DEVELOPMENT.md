# VidForge Development Guide

## Project Structure

```
vidforge/
├── app/                          # Next.js app directory
│   ├── api/                      # API routes
│   │   ├── generate-script/     # LLM script generation
│   │   ├── generate-voice/      # TTS voice generation
│   │   ├── assemble-video/      # Video assembly with FFmpeg
│   │   ├── upload-youtube/      # YouTube upload
│   │   └── videos/              # Video CRUD
│   ├── generate/                # Video generation UI
│   ├── settings/                # App settings
│   └── page.tsx                 # Dashboard
├── components/                  # React components
├── lib/                         # Utility functions
│   ├── logger.ts               # Structured logging
│   ├── apiResponse.ts          # Response standardization
│   ├── validation.ts           # Input validation
│   ├── env.ts                  # Environment validation
│   ├── middleware.ts           # API middleware
│   ├── lockManager.ts          # Concurrency control
│   └── mongodb.ts              # DB connection
├── models/                      # Mongoose schemas
├── public/                      # Static assets
├── scripts/                     # Python scripts
└── output/                      # Generated files
```

## Architecture Principles

### 1. **Separation of Concerns**
- API routes handle HTTP
- Lib utilities handle business logic
- Models handle data structure
- Components handle UI

### 2. **Error Handling**
All errors should use the standardized `ApiError` class:

```typescript
import { ApiError, ErrorCode } from '@/lib/apiResponse';

throw new ApiError(
  ErrorCode.INVALID_INPUT,
  400,
  'Topic must be 3-500 characters'
);
```

### 3. **Validation**
Always validate user input:

```typescript
import { validateTopic, ValidationError } from '@/lib/validation';

try {
  const topic = validateTopic(userInput);
} catch (error) {
  if (error instanceof ValidationError) {
    throw error; // Will be caught by withErrorHandling
  }
}
```

### 4. **Logging**
Use the centralized logger:

```typescript
import { logger } from '@/lib/logger';

logger.info('Video generated', 'VIDEO_SERVICE', { videoId, duration });
logger.error('API call failed', 'EXTERNAL_API', error);
```

### 5. **Database Operations**
Always ensure DB connection:

```typescript
import { connectDB } from '@/lib/mongodb';

await connectDB();
const video = await Video.findById(videoId);
```

### 6. **Concurrency Control**
Use lock manager for long-running operations:

```typescript
import { lockManager } from '@/lib/lockManager';

if (!lockManager.acquireLock(videoId)) {
  throw new ApiError(ErrorCode.CONFLICT, 409, 'Video is already being processed');
}

try {
  // Do work...
} finally {
  lockManager.releaseLock(videoId);
}
```

## Adding a New API Endpoint

### Step 1: Define the route file
```bash
# Create: app/api/my-endpoint/route.ts
```

### Step 2: Use the template
```typescript
import { NextRequest } from 'next/server';
import { successResponse, errorResponse, ApiError, ErrorCode } from '@/lib/apiResponse';
import { withErrorHandling } from '@/lib/middleware';
import { logger } from '@/lib/logger';
import { validateTopic, ValidationError } from '@/lib/validation';

export const POST = withErrorHandling(async (req: NextRequest) => {
  // Validate input
  const body = await req.json();
  const topic = validateTopic(body.topic);

  // Do work
  const result = await someService(topic);

  // Log
  logger.info('Operation completed', 'MY_ENDPOINT', { result });

  // Return response
  return successResponse(result, 201);
}, 'POST /api/my-endpoint');
```

### Step 3: Add tests and documentation

## Type Safety

This project uses strict TypeScript. All new code should:
- Have full type annotations
- Not use `any` type
- Export interfaces for external use

## Testing

### Running type checking:
```bash
npm run type-check
```

### Validating environment:
```bash
npm run validate-env
```

## Environment Setup

### First time setup:
```bash
# 1. Copy environment template
cp .env.local.example .env.local

# 2. Fill in required values
nano .env.local

# 3. Validate environment
npm run validate-env

# 4. Install dependencies
npm install

# 5. Start development server
npm run dev
```

## Common Tasks

### Adding a new validation rule:
1. Create function in `lib/validation.ts`
2. Add JSDoc comments
3. Use in your API route

### Adding logging:
```typescript
logger.debug('Debug message', 'CONTEXT');
logger.info('Info message', 'CONTEXT', { data: value });
logger.warn('Warning message', 'CONTEXT');
logger.error('Error message', 'CONTEXT', errorObject);
```

### Connecting to database:
```typescript
import { connectDB } from '@/lib/mongodb';

await connectDB();
// Query database...
```

## Performance Optimization

### Database Queries
- Use `.lean()` for read-only queries
- Use indexes for frequently queried fields
- Limit projection: `.select('field1 field2')`
- Use pagination for large datasets

### API Responses
- Use HTTP compression (built into Next.js)
- Return only necessary fields
- Use pagination

### External APIs
- Implement caching where possible
- Add retry logic for failed requests
- Use timeouts to prevent hanging

## Security Checklist

- [ ] All user input is validated
- [ ] Sensitive data is not logged
- [ ] Database connections use connection pooling
- [ ] Rate limiting is enforced
- [ ] Error messages don't leak internal details
- [ ] Environment variables are required before startup
- [ ] API responses use security headers

## Debugging

### Enable debug logging:
```bash
LOG_LEVEL=debug npm run dev
```

### Database issues:
```typescript
import { getDBStatus } from '@/lib/mongodb';

console.log(getDBStatus());
```

### Rate limiting:
```typescript
import { rateLimiter } from '@/lib/middleware';

console.log(rateLimiter.getRemainingRequests(ipAddress));
```

## Deployment

### Production checklist:
- [ ] All environment variables configured
- [ ] Database indexes created
- [ ] Error tracking service configured (Sentry, etc.)
- [ ] Logging service configured
- [ ] Rate limiting tuned for expected traffic
- [ ] Build passes type checking: `npm run type-check`
- [ ] ESLint passes: `npm run lint`

### Build and run:
```bash
npm run build
npm start
```

## Contributing Guidelines

1. **Follow project conventions** - See above patterns
2. **Type everything** - No implicit `any`
3. **Log appropriately** - Info level for important operations
4. **Validate input** - Never trust user input
5. **Use error codes** - Consistent error responses
6. **Document APIs** - Update API_DOCUMENTATION.md
7. **Write clean code** - Use meaningful names, keep functions focused

## Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run type-check      # Check TypeScript
npm run lint            # Run ESLint
npm run validate-env    # Validate environment

# Production
npm run build           # Build for production
npm start              # Start production server

# Maintenance
npm install            # Install dependencies
npm audit             # Security audit
npm update            # Update dependencies
```

## References
- [Next.js Documentation](https://nextjs.org/docs)
- [MongoDB Mongoose](https://mongoosejs.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [API Response Format](./API_DOCUMENTATION.md)
