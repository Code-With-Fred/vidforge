# VidForge API Documentation

## Overview
VidForge provides a REST API for automated AI-powered YouTube video generation. All endpoints return standardized JSON responses.

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { /* response data */ },
  "timestamp": "2024-05-07T10:30:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {} // Only in development mode
  },
  "timestamp": "2024-05-07T10:30:00.000Z"
}
```

## Rate Limiting
- **Window**: 15 minutes (900,000 ms)
- **Limit**: 100 requests per window
- **Header**: Rate limit info included in response headers

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `BAD_REQUEST` | 400 | Invalid request format |
| `INVALID_INPUT` | 400 | Validation failed |
| `MISSING_PARAM` | 400 | Required parameter missing |
| `UNAUTHORIZED` | 401 | Missing/invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |
| `EXTERNAL_API_ERROR` | 500 | External API failed |
| `DATABASE_ERROR` | 500 | Database operation failed |

---

## Endpoints

### GET /api/videos
Retrieve a paginated list of videos.

**Query Parameters:**
- `page` (int, default: 1): Page number
- `limit` (int, default: 20, max: 100): Items per page
- `status` (string): Filter by status ('draft', 'rendering', 'ready', 'posted')

**Example:**
```bash
GET /api/videos?page=1&limit=10&status=draft
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "videos": [
      {
        "_id": "...",
        "topic": "AI in 2024",
        "title": "...",
        "status": "draft",
        "created_at": "2024-05-07T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 45,
      "pages": 5
    }
  },
  "timestamp": "2024-05-07T10:30:00Z"
}
```

### POST /api/videos
Create a new video project.

**Request Body:**
```json
{
  "topic": "The Future of AI"
}
```

**Validation:**
- `topic`: Required, 3-500 characters

**Example:**
```bash
POST /api/videos
Content-Type: application/json

{
  "topic": "The Future of AI"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "videoId": "507f1f77bcf86cd799439011"
  },
  "timestamp": "2024-05-07T10:30:00Z"
}
```

### POST /api/generate-script
Generate a video script for a given topic.

**Request Body:**
```json
{
  "topic": "The Future of AI",
  "model": "llama3"
}
```

**Validation:**
- `topic`: Required, 3-500 characters
- `model`: Optional, default "llama3"

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "script": "## HOOK\n...",
    "wordCount": 1350,
    "estimatedDuration": "~10m 23s"
  },
  "timestamp": "2024-05-07T10:30:00Z"
}
```

### POST /api/generate-voice
Generate voiceover audio from script.

**Request Body:**
```json
{
  "script": "Full script text...",
  "voice": "en-US-ChristopherNeural",
  "videoId": "507f1f77bcf86cd799439011"
}
```

**Validation:**
- `script`: Required, 100-10,000 characters
- `voice`: Optional, one of voice IDs
- `videoId`: Required, valid MongoDB ID

**Supported Voices:**
- `en-US-ChristopherNeural` (US Male)
- `en-US-JennyNeural` (US Female)
- `en-US-GuyNeural` (US Newsreader)
- `en-GB-RyanNeural` (British Male)
- `en-AU-WilliamNeural` (Australian Male)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "audioPath": "output/audio/507f1f77bcf86cd799439011.mp3",
    "duration": 623.5
  },
  "timestamp": "2024-05-07T10:30:00Z"
}
```

### GET /api/assemble-video
Stream video assembly progress via Server-Sent Events.

**Query Parameters:**
- `videoId`: Required, MongoDB video ID

**Example:**
```bash
GET /api/assemble-video?videoId=507f1f77bcf86cd799439011
```

**Response:**
Server-Sent Events stream with updates:
```
event: log
data: {"log":"[VidForge] Running Whisper transcription..."}

event: log
data: {"log":"[VidForge] Assembling video..."}

event: complete
data: {"videoPath":"output/videos/507f1f77bcf86cd799439011.mp4"}
```

---

## Best Practices

### Error Handling
Always check the `success` field and handle both success and error cases:

```javascript
const response = await fetch('/api/videos', { method: 'POST', body: JSON.stringify({ topic: 'AI' }) });
const data = await response.json();

if (data.success) {
  console.log('Video created:', data.data.videoId);
} else {
  console.error('Error:', data.error.code, data.error.message);
}
```

### Pagination
Use pagination for large lists to improve performance:

```javascript
// Fetch first page with 20 items
const res1 = await fetch('/api/videos?page=1&limit=20');
const data1 = await res1.json();

if (data1.data.pagination.page < data1.data.pagination.pages) {
  // Fetch next page
  const res2 = await fetch(`/api/videos?page=${data1.data.pagination.page + 1}&limit=20`);
}
```

### Rate Limiting
Implement exponential backoff for rate limit errors:

```javascript
async function fetchWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const res = await fetch(url);
    const data = await res.json();

    if (data.error?.code === 'RATE_LIMIT_EXCEEDED') {
      const delay = Math.pow(2, i) * 1000;
      await new Promise(r => setTimeout(r, delay));
      continue;
    }

    return data;
  }
  throw new Error('Max retries exceeded');
}
```

---

## Authentication
*Currently under development. OAuth 2.0 integration for YouTube uploading.*

## Webhooks
*Planned for future release.*

## Changelog
See [CHANGELOG.md](./CHANGELOG.md) for version history.
