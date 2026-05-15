# VidForge Setup Guide

Complete step-by-step setup instructions for all external services.

---

## Table of Contents
1. [MongoDB Atlas](#mongodb-atlas)
2. [Google OAuth](#google-oauth)
3. [Pexels API](#pexels-api)
4. [Ollama](#ollama)
5. [Local Development](#local-development)

---

## MongoDB Atlas

MongoDB Atlas provides a free tier perfect for development and small-scale deployments.

### Step 1: Create Account
1. Go to https://www.mongodb.com/cloud/atlas
2. Click "Try Free"
3. Sign up with email or Google account
4. Verify email address

### Step 2: Create Cluster
1. Click "Create a Deployment"
2. Select "M0 Sandbox" (free tier)
3. Choose your region (closer = faster)
4. Click "Create Deployment"
5. Wait 5-10 minutes for cluster to initialize

### Step 3: Create Database User
1. Go to "Database Access" in left menu
2. Click "Add New Database User"
3. Enter username (e.g., `vidforge`)
4. Enter strong password (save it!)
5. Select "Built-in Role": Database User
6. Click "Add User"

### Step 4: Configure Network Access
1. Go to "Network Access" in left menu
2. Click "Add IP Address"
3. Select "Allow access from anywhere" (for dev)
4. Click "Confirm"

**For production:** Only whitelist your server IP.

### Step 5: Get Connection String
1. Go to "Databases" in left menu
2. Click "Connect" on your cluster
3. Select "Drivers"
4. Copy connection string (looks like):
   ```
   mongodb+srv://username:password@cluster.mongodb.net/myFirstDatabase?retryWrites=true&w=majority
   ```
5. Replace `username` and `password` with your database user credentials
6. Replace `myFirstDatabase` with `vidforge`
7. Paste into `.env.local`:
   ```env
   MONGODB_URI=mongodb+srv://vidforge:your-password@cluster.mongodb.net/vidforge?retryWrites=true&w=majority
   ```

### Test Connection
```bash
npm run validate-env
```

Should show:
```
[timestamp] [INFO] [ENV_VALIDATION]: Environment variables validated
```

---

## Google OAuth

For YouTube integration, you need Google OAuth credentials.

### Step 1: Create Google Cloud Project
1. Go to https://console.cloud.google.com/
2. Click "Select a Project" → "New Project"
3. Enter project name: `VidForge`
4. Click "Create"
5. Wait for project to be created

### Step 2: Enable YouTube API
1. Click "Enable APIs and Services"
2. Search for "YouTube Data API v3"
3. Click the result
4. Click "Enable"
5. Wait for enabling to complete

### Step 3: Create OAuth Credentials
1. Go to "Credentials" in left menu
2. Click "Create Credentials" → "OAuth client ID"
3. Select "Web application"
4. Enter name: `VidForge Local`
5. Under "Authorized redirect URIs", click "Add URI"
6. Enter: `http://localhost:3000/api/auth/youtube/callback`
7. Click "Create"
8. Copy the Client ID and Client Secret

### Step 4: Store Credentials
1. Save to `.env.local`:
   ```env
   YOUTUBE_CLIENT_ID=your_client_id_here
   YOUTUBE_CLIENT_SECRET=your_client_secret_here
   YOUTUBE_REDIRECT_URI=http://localhost:3000/api/auth/youtube/callback
   ```

### Step 5: Configure Consent Screen (Optional for dev)
For production, you'll need to configure the OAuth consent screen:
1. Go to "OAuth consent screen"
2. Select "External"
3. Click "Create"
4. Fill in required fields:
   - App name: VidForge
   - User support email: your-email@gmail.com
   - Developer contact: your-email@gmail.com
5. Click "Save and Continue"
6. Click "Save and Continue" for scopes
7. Add your Google account as a test user
8. Review and go back to dashboard

---

## Pexels API

Pexels provides free stock video footage via API.

### Step 1: Create Account
1. Go to https://www.pexels.com/
2. Click "Sign In" → "Sign Up"
3. Create account with email

### Step 2: Get API Key
1. Go to https://www.pexels.com/api/
2. Click "Register as an app"
3. Fill in form:
   - App name: VidForge
   - Description: AI video generation tool
   - Terms: Accept
4. Click "Register API Key"
5. Copy your API key

### Step 3: Store API Key
```env
PEXELS_API_KEY=your_api_key_here
```

### Test API
```bash
curl -H "Authorization: YOUR_API_KEY" \
  "https://api.pexels.com/videos/search?query=nature&per_page=1"
```

Should return a JSON response with video data.

---

## Ollama

Ollama runs large language models locally on your machine.

### Step 1: Install Ollama
1. Go to https://ollama.ai/
2. Download for your OS (macOS, Windows, Linux)
3. Run installer and follow prompts
4. Ollama should start automatically

### Step 2: Pull Model
Open terminal and run:
```bash
ollama pull llama3
```

Wait for download to complete (~4-5 GB for llama3).

### Step 3: Verify Installation
```bash
# Start Ollama server (if not running)
ollama serve

# In another terminal, test it
curl -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3",
    "prompt": "Hello!",
    "stream": false
  }'
```

Should return a response with generated text.

### Step 4: Store Endpoint
```env
OLLAMA_BASE_URL=http://localhost:11434
```

### Performance Tips
- **GPU acceleration**: Install CUDA drivers for NVIDIA GPUs (5-10x faster)
- **RAM required**: Minimum 8GB, recommended 16GB+
- **First run**: Model loads into memory, may take 10-30 seconds

### Models Available
- `llama3` - 70B parameters (default)
- `mistral` - Faster alternative
- `neural-chat` - Optimized for chat

Use any by changing `OLLAMA_MODEL` in settings.

---

## Local Development

### Complete Setup Checklist

- [ ] Node.js 18+ installed (`node --version`)
- [ ] Python 3.10+ installed (`python --version`)
- [ ] FFmpeg installed (`ffmpeg -version`)
- [ ] MongoDB Atlas cluster created
- [ ] Database user created with password
- [ ] Network access configured
- [ ] Google OAuth project created
- [ ] OAuth credentials generated
- [ ] Pexels API key obtained
- [ ] Ollama installed locally
- [ ] llama3 model downloaded

### Environment File

Create `.env.local` with all values:
```env
# Database
MONGODB_URI=mongodb+srv://vidforge:password@cluster.mongodb.net/vidforge

# APIs
PEXELS_API_KEY=abc123xyz789

# Google OAuth
YOUTUBE_CLIENT_ID=xxx.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=xxx
YOUTUBE_REDIRECT_URI=http://localhost:3000/api/auth/youtube/callback

# AI
OLLAMA_BASE_URL=http://localhost:11434

# App
NODE_ENV=development
LOG_LEVEL=info
```

### First Run

```bash
# 1. Validate environment
npm run validate-env

# 2. Should see success message
# ✓ All environment variables validated

# 3. Start development server
npm run dev

# 4. Open browser to http://localhost:3000
```

### Troubleshooting

#### "ECONNREFUSED" errors
- **MongoDB**: Check connection string, network access enabled
- **Ollama**: Run `ollama serve` in separate terminal
- **Pexels**: Check API key is valid

#### "Module not found" errors
```bash
npm install
pip install edge-tts openai-whisper
```

#### "Port 3000 already in use"
```bash
# Use different port
npm run dev -- -p 3001
```

#### Slow model inference
- Check CPU usage: `top` (Mac/Linux) or Task Manager (Windows)
- Reduce batch size
- Use faster model: `mistral` instead of `llama3`
- Enable GPU acceleration

---

## Next Steps

1. ✅ Complete setup above
2. ⬜ Read [API Documentation](./API_DOCUMENTATION.md)
3. ⬜ Read [Development Guide](./DEVELOPMENT.md)
4. ⬜ Create first video via dashboard
5. ⬜ Check logs for any issues

---

## Getting Help

- **MongoDB Issues**: https://docs.mongodb.com/
- **Google OAuth**: https://developers.google.com/identity
- **Pexels API**: https://www.pexels.com/api/documentation/
- **Ollama**: https://github.com/ollama/ollama
- **Project Issues**: Check GitHub issues or documentation

---

**Once setup is complete, see [README.md](./README.md) to get started!**
