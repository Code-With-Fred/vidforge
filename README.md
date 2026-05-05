# VidForge — Personal AI YouTube Video Generator

A local-first tool that takes a topic and produces a fully-assembled, caption-burned, background-music-mixed YouTube video — then uploads it automatically.

---

## Prerequisites

| Tool | Install |
|---|---|
| Node.js 18+ | https://nodejs.org |
| Python 3.10+ | https://python.org |
| FFmpeg | `choco install ffmpeg` (Windows) or `brew install ffmpeg` (Mac) |
| Ollama | https://ollama.com → then run `ollama pull llama3` |
| MongoDB Atlas account | https://mongodb.com/atlas (free M0 cluster) |

---

## Installation

### 1. Install Node dependencies

```bash
cd vidforge
npm install
```

### 2. Install Python dependencies

```bash
pip install edge-tts openai-whisper
```

> **Note:** `openai-whisper` will download model weights (~140 MB for "base") on first run.

### 3. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/vidforge
PEXELS_API_KEY=your_pexels_key
YOUTUBE_CLIENT_ID=your_google_oauth_client_id
YOUTUBE_CLIENT_SECRET=your_google_oauth_client_secret
YOUTUBE_REDIRECT_URI=http://localhost:3000/api/auth/youtube/callback
OLLAMA_BASE_URL=http://localhost:11434
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
