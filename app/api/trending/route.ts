import { NextResponse } from 'next/server';
import { fetchHackerNewsTopics, fetchNewsAPITopics } from '@/lib/externalApis';
import { logger } from '@/lib/logger';

export async function POST(): Promise<NextResponse> {
  try {
    logger.info('Fetching trending topics', 'TRENDING_API');

    const [hnTopics, newsTopics] = await Promise.allSettled([
      fetchHackerNewsTopics(5),
      fetchNewsAPITopics(process.env.NEWS_API_KEY || '', 5),
    ]);

    const hnList = hnTopics.status === 'fulfilled' ? hnTopics.value : [];
    const newsList = newsTopics.status === 'fulfilled' ? newsTopics.value : [];

    // Merge and deduplicate
    const allTopics = Array.from(new Set([...hnList, ...newsList]));
    const topics = allTopics.slice(0, 5);

    if (topics.length === 0) {
      logger.warn('No trending topics fetched, using fallbacks', 'TRENDING_API');
      // Sensible fallback so the UI always gets suggestions
      return NextResponse.json({
        success: true,
        data: {
          topics: [
            'How AI is transforming software development in 2024',
            'The rise of open-source LLMs vs proprietary models',
            'AI agents: are they finally ready for production?',
            'How Google Gemini competes with GPT-4',
            'The future of AI-generated content and copyright',
          ],
        },
        timestamp: new Date().toISOString(),
      });
    }

    logger.info('Trending topics fetched', 'TRENDING_API', { count: topics.length });

    return NextResponse.json({
      success: true,
      data: { topics },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to fetch trending topics', 'TRENDING_API', error);

    // Return fallback topics on error
    return NextResponse.json({
      success: true,
      data: {
        topics: [
          'How AI is transforming software development in 2024',
          'The rise of open-source LLMs vs proprietary models',
          'AI agents: are they finally ready for production?',
          'How Google Gemini competes with GPT-4',
          'The future of AI-generated content and copyright',
        ],
      },
      timestamp: new Date().toISOString(),
    });
  }
}
