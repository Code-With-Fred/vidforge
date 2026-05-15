import { NextRequest, NextResponse } from 'next/server';
import { callOllama } from '@/lib/externalApis';
import { successResponse, errorResponse, ApiError, ErrorCode } from '@/lib/apiResponse';
import { withErrorHandling } from '@/lib/middleware';
import { validateTopic } from '@/lib/validation';
import { logger } from '@/lib/logger';

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function estimateDuration(wordCount: number): string {
  // Average reading pace: ~130 words per minute for natural speech
  const minutes = wordCount / 130;
  const mins = Math.floor(minutes);
  const secs = Math.round((minutes - mins) * 60);
  return `${mins}m ${secs}s`;
}

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json() as { topic?: string; model?: string };

  // Validate topic
  const topic = validateTopic(body.topic);
  const model = body.model || 'llama3';

  const prompt = `You are an expert YouTube scriptwriter specializing in AI and technology content.

Write a complete YouTube script for a video about: "${topic}"

Structure the script EXACTLY like this:

## HOOK (First 30 seconds)
Start with a shocking fact or bold statement about the topic. Must immediately grab attention.

## INTRO
Briefly explain what viewers will learn in this video (2-3 sentences).

## SECTION 1: [Give this section a descriptive title]
Detailed explanation of the first key point. Include examples, data, or stories.

## SECTION 2: [Give this section a descriptive title]
Detailed explanation of the second key point.

## SECTION 3: [Give this section a descriptive title]
Detailed explanation of the third key point.

## SECTION 4: [Give this section a descriptive title]
Detailed explanation of the fourth key point.

## CONCLUSION
Summarize the 3-4 most important takeaways from this video.

## CALL TO ACTION
Ask viewers to like, subscribe, and comment with their opinion on the topic. Keep it natural and conversational.

IMPORTANT RULES:
- Total script must be 1200-1500 words (enough for 8-10 minutes when read aloud)
- Write in a conversational, engaging YouTube style
- Use "you" and "we" to speak directly to the viewer
- Include specific facts, numbers, and real examples where possible
- Do NOT include stage directions, [pause], [cut to], or any production notes
- Just write the words that will be spoken aloud
- Each section header (## SECTION X: Title) should be on its own line`;

  logger.info('Generating script', 'GENERATE_SCRIPT', { topic, model });

  const script = await callOllama(prompt, model);
  const wordCount = countWords(script);
  const estimatedDuration = estimateDuration(wordCount);

  logger.info('Script generated successfully', 'GENERATE_SCRIPT', { wordCount, estimatedDuration });

  return successResponse({ script, wordCount, estimatedDuration });
}, 'POST /api/generate-script');
