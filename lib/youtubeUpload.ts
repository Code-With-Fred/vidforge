import { google } from 'googleapis';
import fs from 'fs';

const SCOPES = ['https://www.googleapis.com/auth/youtube.upload'];

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    process.env.YOUTUBE_REDIRECT_URI
  );
}

export function getAuthUrl(): string {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: 'offline',   // needed to get refresh_token
    prompt: 'consent',        // force consent screen to always return refresh_token
    scope: SCOPES,
  });
}

export async function exchangeCodeForTokens(code: string) {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);
  return tokens;
}

export async function uploadVideo(
  videoPath: string,
  refreshToken: string,
  metadata: {
    title: string;
    description: string;
    tags: string[];
  }
): Promise<{ youtubeUrl: string; youtubeId: string }> {
  const client = getOAuth2Client();
  client.setCredentials({ refresh_token: refreshToken });

  const youtube = google.youtube({ version: 'v3', auth: client });

  const fileSize = fs.statSync(videoPath).size;

  const res = await youtube.videos.insert(
    {
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: metadata.title,
          description: metadata.description,
          tags: metadata.tags,
          categoryId: '28', // Science & Technology
          defaultLanguage: 'en',
          defaultAudioLanguage: 'en',
        },
        status: {
          privacyStatus: 'public',
          madeForKids: false,
          selfDeclaredMadeForKids: false,
        },
      },
      media: {
        body: fs.createReadStream(videoPath),
      },
    },
    {
      onUploadProgress: (evt: { bytesRead: number }) => {
        const progress = Math.round((evt.bytesRead / fileSize) * 100);
        console.log(`Upload progress: ${progress}%`);
      },
    }
  );

  const youtubeId = res.data.id ?? '';
  const youtubeUrl = `https://www.youtube.com/watch?v=${youtubeId}`;

  return { youtubeUrl, youtubeId };
}
