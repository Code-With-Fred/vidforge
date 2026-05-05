import { NextRequest, NextResponse } from 'next/server';

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';

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

export async function POST(req: NextRequest) {
  try {
    const { topic, model = 'llama3' } = await req.json() as {
      topic: string;
      model?: string;
    };

    if (!topic?.trim()) {
      return NextResponse.json({ error: 'topic is required' }, { status: 400 });
    }

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

    const ollamaRes = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          temperature: 0.8,
          num_predict: 2000,
        },
      }),
    });

    if (!ollamaRes.ok) {
      const text = await ollamaRes.text();
      return NextResponse.json(
        { error: `Ollama error: ${text}` },
        { status: 502 }
      );
    }

    const data = await ollamaRes.json() as { response: string };
    const script = data.response.trim();
    const wordCount = countWords(script);
    const estimatedDuration = estimateDuration(wordCount);

    return NextResponse.json({ script, wordCount, estimatedDuration });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
