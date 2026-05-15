# VidForge — Personal AI YouTube Video Generator

An advanced, production-ready automation tool that transforms a topic into a fully-assembled, caption-burned, background-music-mixed YouTube video — then uploads it automatically.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

---

## ✨ Features

- **End-to-end automation** - Topic to published YouTube video in minutes
- **AI-powered script generation** - Using local Ollama (open source, privacy-first)
- **Professional TTS voices** - Multiple language variants and speaker styles
- **Smart video composition** - Footage fetching, caption generation, music mixing
- **YouTube integration** - Direct upload with metadata management
- **Real-time progress** - Server-sent events for live updates during processing
- **Pagination & filtering** - Efficient API for large video collections
- **Production-ready** - Error handling, rate limiting, logging, security headers

---

## 📋 Prerequisites

| Tool | Version | Install |
|---|---|---|
| **Node.js** | 18+ | https://nodejs.org |
| **Python** | 3.10+ | https://python.org |
| **FFmpeg** | Latest | `choco install ffmpeg` (Windows) or `brew install ffmpeg` (Mac) |
| **Ollama** | Latest | https://ollama.com → `ollama pull llama3` |
| **MongoDB Atlas** | Free M0 | https://mongodb.com/atlas |

**Verify installations:**
```bash
node --version        # Should show v18.0.0+
python --version      # Should show Python 3.10+
ffmpeg -version       # Should show version info
ollama --help         # Should show help text
```

---

## 🚀 Getting Started

### 1️⃣ Clone & Install

```bash
# Clone the repository
git clone https://github.com/yourusername/vidforge.git
cd vidforge

# Install Node dependencies
npm install

# Install Python dependencies
pip install edge-tts openai-whisper

# Validate TypeScript
npm run type-check
```

### 2️⃣ Configure Environment

```bash
# Copy environment template
cp .env.local.example .env.local

# Edit and fill in required values
# See detailed instructions in .env.local.example
nano .env.local
```

**Required environment variables:**
- `MONGODB_URI` - MongoDB Atlas connection string
- `PEXELS_API_KEY` - Video footage API key
- `YOUTUBE_CLIENT_ID` & `YOUTUBE_CLIENT_SECRET` - Google OAuth credentials
- `YOUTUBE_REDIRECT_URI` - OAuth callback URL

**[See full setup guide for each service →](./SETUP_GUIDE.md)**

### 3️⃣ Validate & Start

```bash
# Validate environment configuration
npm run validate-env

# Start development server
npm run dev

# Open browser
# → http://localhost:3000
```

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [API Documentation](./API_DOCUMENTATION.md) | Endpoint reference, error codes, examples |
| [Development Guide](./DEVELOPMENT.md) | Architecture, patterns, contributing |
| [Setup Guide](./SETUP_GUIDE.md) | Detailed service configuration |
| [Deployment Guide](./DEPLOYMENT.md) | Production deployment steps |

---

## 🏗️ Project Structure

```
vidforge/
├── app/                        # Next.js app (14.2+)
│   ├── api/                   # API routes
│   │   ├── generate-script/   # LLM script generation
│   │   ├── generate-voice/    # TTS voice generation  
│   │   ├── assemble-video/    # Video assembly (FFmpeg)
│   │   ├── fetch-footage/     # Pexels footage fetching
│   │   └── videos/            # Video CRUD operations
│   ├── generate/              # Video creation UI
│   ├── settings/              # Application settings
│   └── page.tsx               # Dashboard
├── lib/                        # Utility libraries
│   ├── logger.ts              # Structured logging
│   ├── apiResponse.ts         # Standardized responses
│   ├── validation.ts          # Input validation
│   ├── env.ts                 # Environment validation
│   ├── middleware.ts          # API middleware
│   ├── lockManager.ts         # Concurrency control
│   └── mongodb.ts             # Database connection
├── models/                     # Mongoose schemas
├── components/                 # React components
├── scripts/                    # Python utilities
└── output/                     # Generated files
```

---

## 🔄 The Video Generation Pipeline

```
1. Create Project
   └─> User provides topic

2. Generate Script
   └─> Ollama (llama3) generates YouTube-style script
   └─> 1200-1500 words, ~8-10 minutes

3. Generate Voiceover
   └─> Edge TTS converts script to MP3
   └─> Multiple voice options

4. Fetch Footage
   └─> Pexels API fetches relevant video clips
   └─> Auto-download and normalize

5. Transcribe Audio
   └─> Whisper generates SRT captions
   └─> Burned into video

6. Assemble Video
   └─> FFmpeg composites:
       • Video + Footage
       • Audio + Voiceover
       • Captions
       • Background music
   └─> Output: 1080p MP4

7. Upload to YouTube
   └─> OAuth authenticated upload
   └─> Auto-publish with metadata
```

---

## 🎯 API Quick Reference

### Create a video
```bash
curl -X POST http://localhost:3000/api/videos \
  -H "Content-Type: application/json" \
  -d '{"topic": "The Future of AI"}'

# Response:
{
  "success": true,
  "data": {"videoId": "507f1f77bcf86cd799439011"},
  "timestamp": "2024-05-07T10:30:00Z"
}
```

### List videos
```bash
curl "http://localhost:3000/api/videos?page=1&limit=20&status=draft"
```

### Generate script
```bash
curl -X POST http://localhost:3000/api/generate-script \
  -H "Content-Type: application/json" \
  -d '{"topic": "The Future of AI", "model": "llama3"}'
```

**[See full API docs →](./API_DOCUMENTATION.md)**

---

## ⚙️ Configuration

### Database
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/vidforge
```
- Connection pooling: 5-10 connections
- Timeout: 5-45 seconds
- Automatic retries with exponential backoff

### Rate Limiting
```env
RATE_LIMIT_WINDOW_MS=900000    # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100    # Per window
```

### Logging
```env
LOG_LEVEL=info  # debug, info, warn, error
```

---

## 🛠️ Development

### Scripts
```bash
npm run dev            # Start dev server (port 3000)
npm run build          # Production build
npm start              # Run production server
npm run type-check     # TypeScript validation
npm run lint           # ESLint check
npm run validate-env   # Verify environment setup
```

### Code Standards
- **TypeScript** - Strict mode, no implicit any
- **ESLint** - TypeScript plugin enabled
- **Error handling** - Standardized via ApiError
- **Logging** - Centralized logger with context
- **Validation** - All user input validated

**[See development guide →](./DEVELOPMENT.md)**

---

## 🔒 Security Features

✅ **Environment validation** - Required vars checked at startup  
✅ **Input validation** - All API inputs sanitized  
✅ **Rate limiting** - 100 requests per 15 minutes  
✅ **Security headers** - CSP, X-Frame-Options, HSTS, etc.  
✅ **Error handling** - No internal details leaked  
✅ **Logging** - Sensitive data filtered  
✅ **Type safety** - Strict TypeScript  

---

## 🐛 Troubleshooting

### MongoDB Connection Error
```
Error: MONGODB_URI is not set in .env.local
```
**Fix:** Copy `.env.local.example` to `.env.local` and add your connection string.

### Ollama Not Responding
```
Error: connect ECONNREFUSED 127.0.0.1:11434
```
**Fix:** Start Ollama:
```bash
ollama serve
# In another terminal:
ollama pull llama3
```

### FFmpeg Not Found
```
Error: ENOENT: no such file or directory, spawn 'ffmpeg'
```
**Fix:** Install FFmpeg:
- Windows: `choco install ffmpeg`
- Mac: `brew install ffmpeg`
- Linux: `sudo apt-get install ffmpeg`

### Python Dependencies
```
ModuleNotFoundError: No module named 'edge_tts'
```
**Fix:** Install Python dependencies:
```bash
pip install edge-tts openai-whisper
```

---

## 📊 Performance Tuning

### Database
- Queries use `.lean()` for read-only operations
- Indexes on `status`, `created_at`, `youtube_url`
- Pagination: default 20 items, max 100 per request
- Connection pooling: 5-10 active connections

### API
- Server-sent events for long-running operations
- HTTP compression built-in
- Rate limiting: 100 requests/15 minutes
- Response caching for static data

### FFmpeg
- Encode settings optimized for YouTube
- Parallel processing where possible
- Memory-efficient streaming

---

## 🚢 Deployment

### Production Checklist
- [ ] Environment variables configured securely
- [ ] MongoDB Atlas connection verified
- [ ] Database indexes created
- [ ] Error tracking (Sentry/Rollbar) configured
- [ ] Build passes: `npm run build && npm run type-check`
- [ ] All dependencies up to date: `npm audit`

**[See deployment guide →](./DEPLOYMENT.md)**

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 📈 Monitoring

### Health Check
```bash
curl http://localhost:3000/api/health
```

### Logs
```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev

# Check database status
curl http://localhost:3000/api/health/db
```

---

## 📄 License

MIT - See LICENSE.md

---

## 🤝 Contributing

Contributions welcome! See [DEVELOPMENT.md](./DEVELOPMENT.md) for guidelines.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📞 Support

- **Documentation**: [See docs folder](./docs)
- **Issues**: [GitHub Issues](https://github.com/yourusername/vidforge/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/vidforge/discussions)

---

## 🎓 Learning Resources

- [Next.js 14 Documentation](https://nextjs.org/docs)
- [Mongoose Docs](https://mongoosejs.com/)
- [FFmpeg Wiki](https://trac.ffmpeg.org/wiki)
- [Ollama Models](https://ollama.ai/library)

---

**Happy video generating! 🎬**
OUTPUT_DIR=./output
```

### 4. Add background music

Download at least one free MP3 from [Pixabay Music](https://pixabay.com/music/) and place it in the `/music` folder. VidForge will mix it at 15% volume under the voiceover.

---

## MongoDB Setup

1. Create a free cluster at [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create a database named **vidforge**
3. Allow access from your IP (Network Access → Add IP Address)
4. Copy the connection string (replace `<password>`) to `MONGODB_URI` in `.env.local`

---

## Pexels API Setup

1. Sign up free at [pexels.com/api](https://www.pexels.com/api/)
2. Copy your API key to the Settings page in VidForge (or `.env.local`)

---

## YouTube Upload Setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project
3. Enable the **YouTube Data API v3**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorized redirect URI: `http://localhost:3000/api/auth/youtube/callback`
5. Copy **Client ID** and **Client Secret** to `.env.local`
6. Start VidForge, go to **Settings**, and click **Connect YouTube**

---

## Running

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

Make sure Ollama is running separately:
```bash
ollama serve
```

---

## Pipeline Overview

```
Topic input
    │
    ▼
Ollama (llama3) → Full 1200-1500 word script
    │
    ▼
Edge TTS → Voiceover MP3 saved to /output/audio/
    │
    ▼
Whisper (local) → SRT captions file
    │
    ▼
Pexels API → Stock footage clips downloaded to /output/footage/
    │
    ▼
FFmpeg → Final 1920×1080 MP4 with:
         • Stock footage looped to match audio
         • Voiceover + 15% background music
         • Burned-in captions
         • Intro card (3s) + Outro card (5s)
    │
    ▼
Ollama → SEO title, description, 15 tags
    │
    ▼
YouTube Data API v3 → Upload & publish
```

---

## Project Structure

```
vidforge/
├── app/
│   ├── page.tsx              Dashboard
│   ├── generate/page.tsx     5-step generator
│   ├── settings/page.tsx     API keys & config
│   └── api/                  All API routes
├── lib/
│   ├── mongodb.ts            Mongoose singleton
│   ├── assembleVideo.ts      FFmpeg pipeline
│   ├── youtubeUpload.ts      YouTube OAuth + upload
│   ├── fetchFootage.ts       Pexels downloader
│   └── extractKeywords.ts    Script → search keywords
├── models/
│   ├── Video.ts              Mongoose video schema
│   └── Settings.ts           Mongoose settings schema
├── components/               React UI components
├── scripts/
│   ├── generate_voice.py     Edge TTS → MP3
│   └── transcribe.py         Whisper → SRT
├── output/                   Generated media files
└── music/                    Background music MP3s
```

---

## Troubleshooting

**Ollama not responding**
- Make sure `ollama serve` is running and `llama3` is pulled: `ollama pull llama3`

**FFmpeg not found**
- Verify with `ffmpeg -version` in your terminal
- On Windows: restart your terminal after `choco install ffmpeg`

**Python scripts fail**
- Run `python scripts/generate_voice.py --help` to verify edge-tts is installed
- Check your Python version: `python --version` (needs 3.10+)

**YouTube upload fails**
- Re-connect YouTube in Settings (the refresh token may have expired)
- Check that the YouTube Data API v3 is enabled in your Google Cloud project
