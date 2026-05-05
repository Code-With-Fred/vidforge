import { NextResponse } from 'next/server';

const AI_KEYWORDS = [
  'AI', 'GPT', 'LLM', 'model', 'OpenAI', 'Anthropic', 'Google', 'Claude',
  'Gemini', 'artificial intelligence', 'machine learning', 'automation',
  'robot', 'neural', 'deepmind', 'mistral', 'llama', 'diffusion',
];

function isAIRelated(title: string): boolean {
  const lower = title.toLowerCase();
  return AI_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
}

async function fetchHackerNews(): Promise<string[]> {
  // Top story IDs
  const idsRes = await fetch(
    'https://hacker-news.firebaseio.com/v0/topstories.json',
    { next: { revalidate: 0 } }
  );
  const ids: number[] = await idsRes.json();

  // Fetch first 30 stories in parallel
  const stories = await Promise.all(
    ids.slice(0, 30).map((id) =>
      fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
        .then((r) => r.json())
        .catch(() => null)
    )
  );

  return stories
    .filter((s) => s && s.title && isAIRelated(s.title))
    .map((s) => s.title as string);
}

async function fetchTechCrunch(): Promise<string[]> {
  const res = await fetch('https://techcrunch.com/feed/', {
    headers: { 'User-Agent': 'VidForge/1.0' },
    next: { revalidate: 0 },
  });
  const xml = await res.text();

  // Simple regex extraction — avoids importing xml2js in a route
  const titles = Array.from(xml.matchAll(/<title><!\[CDATA\[([^\]]+)\]\]><\/title>/g))
    .map((m) => m[1])
    .filter(isAIRelated);

  return titles;
}

export async function POST() {
  try {
    const [hn, tc] = await Promise.allSettled([
      fetchHackerNews(),
      fetchTechCrunch(),
    ]);

    const hnTopics = hn.status === 'fulfilled' ? hn.value : [];
    const tcTopics = tc.status === 'fulfilled' ? tc.value : [];

    // Merge, deduplicate, take top 5
    const all = Array.from(new Set([...hnTopics, ...tcTopics]));
    const topics = all.slice(0, 5);

    if (topics.length === 0) {
      // Sensible fallback so the UI always gets suggestions
      return NextResponse.json({
        topics: [
          'How AI is transforming software development in 2024',
          'The rise of open-source LLMs vs proprietary models',
          'AI agents: are they finally ready for production?',
          'How Google Gemini competes with GPT-4',
          'The future of AI-generated content and copyright',
        ],
      });
    }

    return NextResponse.json({ topics });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
