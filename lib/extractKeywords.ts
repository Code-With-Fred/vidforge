// Extracts 5-8 search-friendly keywords from a video script
// Strips filler words and picks the most visually representable nouns/phrases

const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with',
  'by','from','as','is','are','was','were','be','been','being','have',
  'has','had','do','does','did','will','would','could','should','may',
  'might','shall','must','can','this','that','these','those','i','we',
  'you','he','she','it','they','me','us','him','her','them','my','our',
  'your','his','its','their','what','which','who','when','where','how',
  'all','each','every','both','few','more','most','other','some','such',
  'no','not','only','same','so','than','too','very','just','because',
  'about','above','after','before','between','during','here','there',
  'video','like','subscribe','comment','below','today','let','know',
  'section','part','chapter','intro','outro','hook','conclusion',
]);

export function extractKeywords(script: string, count = 6): string[] {
  // Split into words, lowercase, strip punctuation
  const words = script
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));

  // Count word frequency
  const freq: Record<string, number> = {};
  for (const word of words) {
    freq[word] = (freq[word] ?? 0) + 1;
  }

  // Sort by frequency descending, pick top N unique keywords
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([word]) => word);
}

// Extract one keyword per script section header (## Title lines)
export function extractSectionKeywords(script: string): string[] {
  const sectionHeaders = script
    .split('\n')
    .filter((line) => line.startsWith('##'))
    .map((line) => line.replace(/^#+\s*/, '').trim());

  if (sectionHeaders.length > 0) {
    return sectionHeaders.slice(0, 5);
  }

  // Fallback: top keywords from full script
  return extractKeywords(script, 5);
}
