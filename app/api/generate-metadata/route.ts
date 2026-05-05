import { NextRequest, NextResponse } from 'next/server';

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';

export async function POST(req: NextRequest) {
  try {
    const { script, topic, model = 'llama3' } = await req.json() as {
      script: string;
      topic: string;
      model?: string;
    };

    if (!script?.trim() || !topic?.trim()) {
      return NextResponse.json(
        { error: 'script and topic are required' },
        { status: 400 }
      );
    }

    const prompt = `You are a YouTube SEO expert. Based on the following video script about "${topic}", generate optimized YouTube metadata.

Script (first 500 chars for context):
${script.slice(0, 500)}...

Return ONLY valid JSON in this exact format (no markdown, no code blocks, just raw JSON):
{
  "title": "SEO optimized title under 60 characters, curiosity-driven, no clickbait",
  "description": "200-word description with 3-4 timestamps (00:00, 02:00, 04:00, 06:00), 5 relevant hashtags at the end, a placeholder links section",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10", "tag11", "tag12", "tag13", "tag14", "tag15"]
}

Rules:
- Title must be under 60 characters
- Description must include timestamps, hashtags, and a "🔗 Links:" placeholder section
- Tags array must have exactly 15 items, all lowercase, relevant to the topic`;

    const ollamaRes = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: { temperature: 0.5 },
      }),
    });

    if (!ollamaRes.ok) {
      return NextResponse.json(
        { error: `Ollama error: ${ollamaRes.status}` },
        { status: 502 }
      );
    }

    const data = await ollamaRes.json() as { response: string };
    let raw = data.response.trim();

    // Strip markdown code fences if Ollama wraps in ```json ... ```
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');

    let parsed: { title: string; description: string; tags: string[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: `Could not parse Ollama response as JSON: ${raw.slice(0, 200)}` },
        { status: 502 }
      );
    }

    return NextResponse.json({
      title: parsed.title ?? '',
      description: parsed.description ?? '',
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
