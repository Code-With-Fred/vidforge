# VidForge Deployment Guide

Production deployment instructions for various platforms.

---

## Table of Contents
1. [Pre-deployment Checklist](#pre-deployment-checklist)
2. [Vercel Deployment](#vercel-deployment)
3. [Docker Deployment](#docker-deployment)
4. [Traditional Server](#traditional-server)
5. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Pre-deployment Checklist

### Code Quality
```bash
# TypeScript checking
npm run type-check

# Linting
npm run lint

# Build test
npm run build

# All tests pass
npm test  # If you add tests
```

### Environment Variables
- [ ] All required vars in production environment
- [ ] Sensitive values NOT committed to git
- [ ] Database user has restricted permissions
- [ ] OAuth credentials for production domain
- [ ] Logging configured for external service
- [ ] Error tracking configured (Sentry, etc.)

### Database
- [ ] MongoDB indexes created
- [ ] Backups configured in Atlas
- [ ] Connection pooling tuned
- [ ] Database user created with least privileges
- [ ] Network access restricted to app servers

### Security
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure CORS appropriately
- [ ] Set strong database passwords
- [ ] Rotate OAuth secrets regularly
- [ ] Enable 2FA on admin accounts
- [ ] Regular dependency updates: `npm audit`

### Performance
- [ ] CDN configured for static assets
- [ ] Database indexes verified
- [ ] Rate limiting tuned for expected traffic
- [ ] Error handling tested
- [ ] Logging retention configured

---

## Vercel Deployment

### Easiest Option for Next.js

### Step 1: Prepare Git Repository
```bash
git add .
git commit -m "Prepare for production"
git push origin main
```

### Step 2: Create Vercel Account
1. Go to https://vercel.com
2. Sign up (connect GitHub)
3. Authorize Vercel to access your repository

### Step 3: Import Project
1. Click "New Project"
2. Select your VidForge repository
3. Framework preset: Next.js (auto-detected)
4. Click "Import"

### Step 4: Configure Environment
1. Go to "Settings" → "Environment Variables"
2. Add all variables from `.env.local`:
   - `MONGODB_URI`
   - `PEXELS_API_KEY`
   - `YOUTUBE_CLIENT_ID`
   - `YOUTUBE_CLIENT_SECRET`
   - `YOUTUBE_REDIRECT_URI` (update to production domain)
   - `OLLAMA_BASE_URL`
   - `NODE_ENV=production`

3. Click "Save"

### Step 5: Configure Build Settings (Optional)
1. Go to "Settings" → "Build & Development Settings"
2. Build Command: `npm run build`
3. Install Command: `npm ci`
4. Development Command: `npm run dev`

### Step 6: Deploy
1. Click "Deploy"
2. Wait for build to complete (~2-3 minutes)
3. Get production URL: `https://vidforge-xxx.vercel.app`

### Update OAuth Redirect URI
Google OAuth needs exact redirect URL:
1. Go to Google Cloud Console
2. Update OAuth redirect to: `https://vidforge-xxx.vercel.app/api/auth/youtube/callback`
3. Save credentials

### Monitoring
- Visit https://vercel.com/dashboard
- Check logs: "Deployments" tab
- Monitor analytics: "Analytics" tab

---

## Docker Deployment

### Best for Self-hosted Deployments

### Step 1: Create Dockerfile
```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built app from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Run with dumb-init to handle signals
ENTRYPOINT ["dumb-init", "--"]
CMD ["node_modules/.bin/next", "start"]
```

### Step 2: Create docker-compose.yml
```yaml
version: '3.8'

services:
  vidforge:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      MONGODB_URI: ${MONGODB_URI}
      PEXELS_API_KEY: ${PEXELS_API_KEY}
      YOUTUBE_CLIENT_ID: ${YOUTUBE_CLIENT_ID}
      YOUTUBE_CLIENT_SECRET: ${YOUTUBE_CLIENT_SECRET}
      YOUTUBE_REDIRECT_URI: ${YOUTUBE_REDIRECT_URI}
      OLLAMA_BASE_URL: ${OLLAMA_BASE_URL}
      NODE_ENV: production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 5s

  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    restart: unless-stopped
    environment:
      OLLAMA_MODELS: llama3

volumes:
  ollama_data:
```

### Step 3: Build and Deploy
```bash
# Build image
docker build -t vidforge:latest .

# Run locally to test
docker-compose up -d

# Push to registry (optional)
docker tag vidforge:latest myregistry/vidforge:latest
docker push myregistry/vidforge:latest
```

### Step 4: Deploy to Server
```bash
# SSH into server
ssh user@your-server.com

# Clone repository
git clone https://github.com/yourusername/vidforge.git
cd vidforge

# Create .env file with production variables
nano .env

# Start containers
docker-compose up -d

# View logs
docker-compose logs -f vidforge

# Stop if needed
docker-compose down
```

---

## Traditional Server

### Using Linux Server + Systemd

### Step 1: Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install FFmpeg
sudo apt install -y ffmpeg

# Install Python
sudo apt install -y python3 python3-pip

# Install Python dependencies
pip3 install edge-tts openai-whisper

# Create app user
sudo useradd -m -s /bin/bash vidforge
```

### Step 2: Deploy Application
```bash
# As root user
cd /opt
sudo git clone https://github.com/yourusername/vidforge.git
cd vidforge
sudo chown -R vidforge:vidforge /opt/vidforge

# Switch to vidforge user
sudo -u vidforge bash

# Install dependencies
npm install --production

# Build application
npm run build

# Create .env file
nano .env

# Add production variables:
# MONGODB_URI=...
# etc.
```

### Step 3: Create Systemd Service
```bash
# Create service file
sudo nano /etc/systemd/system/vidforge.service

# Add this content:
```

```ini
[Unit]
Description=VidForge Video Generation Service
After=network.target mongodb.service

[Service]
Type=simple
User=vidforge
WorkingDirectory=/opt/vidforge
ExecStart=/usr/bin/node node_modules/.bin/next start
Restart=on-failure
RestartSec=10s
StandardOutput=journal
StandardError=journal

# Environment
Environment="NODE_ENV=production"
EnvironmentFile=/opt/vidforge/.env

[Install]
WantedBy=multi-user.target
```

### Step 4: Enable Service
```bash
sudo systemctl daemon-reload
sudo systemctl enable vidforge
sudo systemctl start vidforge

# Check status
sudo systemctl status vidforge

# View logs
sudo journalctl -u vidforge -f
```

### Step 5: Configure Reverse Proxy (Nginx)
```nginx
# /etc/nginx/sites-available/vidforge

upstream vidforge {
  server 127.0.0.1:3000;
}

server {
  listen 80;
  server_name vidforge.yourdomain.com;
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  server_name vidforge.yourdomain.com;

  ssl_certificate /path/to/cert.pem;
  ssl_certificate_key /path/to/key.pem;

  # Security headers
  add_header Strict-Transport-Security "max-age=31536000" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-Frame-Options "DENY" always;

  # Compression
  gzip on;
  gzip_types text/plain text/css application/json application/javascript;

  # Proxy to Next.js
  location / {
    proxy_pass http://vidforge;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

### Step 6: Enable Nginx Site
```bash
sudo ln -s /etc/nginx/sites-available/vidforge /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

---

## Monitoring & Maintenance

### Log Monitoring
```bash
# View application logs
sudo journalctl -u vidforge -f

# View last 100 lines
sudo journalctl -u vidforge -n 100

# Filter by date
sudo journalctl -u vidforge --since "2 hours ago"
```

### Database Backups
In MongoDB Atlas:
1. Go to "Backup" in left menu
2. Enable "Backup Enabled"
3. Set backup frequency (daily recommended)
4. Test restore procedure monthly

### Performance Monitoring
```bash
# System metrics
htop

# Disk usage
df -h

# Memory usage
free -h

# MongoDB stats
mongo "mongodb+srv://..." --eval "db.stats()"
```

### Dependency Updates
```bash
# Check for outdated packages
npm outdated

# Update packages
npm update

# Security audit
npm audit

# Fix vulnerabilities
npm audit fix
```

### SSL Certificate Renewal (Let's Encrypt)
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Renew certificate
sudo certbot renew

# Auto-renewal (should be automatic)
sudo systemctl enable certbot.timer
```

### Disaster Recovery

1. **Database Backup**: Test restore from backup monthly
2. **Application**: Git repository is your version control
3. **Configuration**: Store `.env` in secure location
4. **Monitoring**: Set up alerts for service failures

### Scaling Considerations
- **Load Balancing**: Use reverse proxy (Nginx) with multiple app instances
- **Database**: MongoDB Atlas auto-scales free tier, upgrade as needed
- **Static Assets**: Use CDN (Cloudflare, CloudFront)
- **Long-running Tasks**: Consider job queue (Bull, BullMQ)

---

## Troubleshooting

### Application won't start
```bash
sudo systemctl status vidforge
sudo journalctl -u vidforge -n 50
```

### High memory usage
```bash
# Check process
ps aux | grep next

# Monitor in real-time
watch -n 1 free -h
```

### Database connection issues
```bash
# Test connection
mongosh "mongodb+srv://..."

# Check network access in Atlas
```

### SSL certificate issues
```bash
# Test SSL
sudo certbot certonly --dry-run -d vidforge.yourdomain.com

# Force renewal
sudo certbot renew --force-renewal
```

---

## Production Checklist

- [ ] Automated backups configured
- [ ] Monitoring and alerting set up
- [ ] SSL certificate installed and auto-renewing
- [ ] Firewall configured (only needed ports open)
- [ ] Fail2ban or similar configured
- [ ] Log rotation configured
- [ ] Uptime monitoring configured
- [ ] Error tracking (Sentry) configured
- [ ] Performance monitoring configured
- [ ] Disaster recovery plan documented
- [ ] Team trained on procedures

---

**See [README.md](./README.md) for more information.**
