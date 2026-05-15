'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import StepIndicator from '@/components/StepIndicator';
import LogViewer from '@/components/LogViewer';
import AudioPlayer from '@/components/AudioPlayer';

type Step = 1 | 2 | 3 | 4 | 5;

interface VideoState {
  id: string;
  topic: string;
  script: string;
  audioPath: string;
  audioDuration: number;
  videoPath: string;
  title: string;
  description: string;
  tags: string[];
  youtubeUrl: string;
}

const EMPTY_VIDEO: VideoState = {
  id: '', topic: '', script: '',
  audioPath: '', audioDuration: 0,
  videoPath: '', title: '', description: '', tags: [], youtubeUrl: '',
};

const VOICES = [
  { value: 'en-US-ChristopherNeural', label: 'Christopher', meta: 'US · Male' },
  { value: 'en-US-JennyNeural',       label: 'Jenny',       meta: 'US · Female' },
  { value: 'en-US-GuyNeural',         label: 'Guy',         meta: 'US · Newsreader' },
  { value: 'en-GB-RyanNeural',        label: 'Ryan',        meta: 'British · Male' },
  { value: 'en-AU-WilliamNeural',     label: 'William',     meta: 'Australian · Male' },
];

function countWords(text: string) {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

function estimateDuration(words: number) {
  if (words === 0) return '—';
  const mins = Math.floor(words / 130);
  const secs = Math.round(((words / 130) - mins) * 60);
  return `~${mins}m ${secs}s`;
}

/** Animated bouncing dots for loading states */
function Dots() {
  return (
    <span className="inline-flex gap-0.5 ml-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1 h-1 rounded-full bg-current animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

// ── Page wrapper: Suspense needed because the inner component calls useSearchParams ──

export default function GeneratePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-3xl mx-auto">
          <div className="h-8 w-48 bg-dark-700 rounded-lg animate-pulse mb-8" />
          <div className="h-16 bg-dark-700 rounded-2xl animate-pulse mb-8" />
          <div className="h-64 bg-dark-700 rounded-2xl animate-pulse" />
        </div>
      }
    >
      <GenerateContent />
    </Suspense>
  );
}

// ── Main content ──────────────────────────────────────────────────────────────

function GenerateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const videoIdParam = searchParams.get('videoId');

  const [step, setStep] = useState<Step>(1);
  const [completed, setCompleted] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('');
  const [error, setError] = useState('');

  const [topic, setTopic] = useState('');
  const [trendingTopics, setTrendingTopics] = useState<string[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);

  const [video, setVideo] = useState<VideoState>(EMPTY_VIDEO);
  const [selectedVoice, setSelectedVoice] = useState('en-US-ChristopherNeural');

  const [logs, setLogs] = useState<string[]>([]);
  const [assemblyProgress, setAssemblyProgress] = useState(0);
  const [assemblyStarted, setAssemblyStarted] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // ── Derived values ─────────────────────────────────────────────────────────

  const wordCount = countWords(video.script);
  const estimatedDuration = estimateDuration(wordCount);
  const titleLen = video.title.length;
  const titleCountColor =
    titleLen > 60 ? 'text-red-400' : titleLen > 50 ? 'text-yellow-400' : 'text-gray-600';

  // ── Helpers ───────────────────────────────────────────────────────────────

  const completeStep = (n: number) =>
    setCompleted((prev) => Array.from(new Set([...prev, n])));

  const clearError = () => setError('');

  const addLog = (line: string) => setLogs((prev) => [...prev, line]);

  // ── Resume a video from the dashboard "Continue" button ───────────────────

  useEffect(() => {
    if (videoIdParam) loadExistingVideo(videoIdParam);
    return () => { eventSourceRef.current?.close(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadExistingVideo(id: string) {
    setLoading(true);
    setLoadingLabel('Loading video');
    clearError();
    try {
      const res = await fetch(`/api/videos/${id}`);
      const data = await res.json() as { video?: Record<string, unknown>; error?: string };
      if (data.error || !data.video) throw new Error(data.error ?? 'Video not found');

      const v = data.video as {
        _id: string; topic: string; script: string;
        voiceover_path: string; video_path: string;
        title: string; description: string; tags: string[];
        youtube_url: string; status: string;
      };

      const restored: VideoState = {
        id: v._id,
        topic: v.topic ?? '',
        script: v.script ?? '',
        audioPath: v.voiceover_path ?? '',
        audioDuration: 0,
        videoPath: v.video_path ?? '',
        title: v.title ?? '',
        description: v.description ?? '',
        tags: v.tags ?? [],
        youtubeUrl: v.youtube_url ?? '',
      };
      setVideo(restored);
      if (v.topic) setTopic(v.topic);

      // Infer step from what data is already present
      const done: number[] = [];
      let targetStep: Step = 1;

      if (v.topic || v.script) { done.push(1); targetStep = 2; }
      if (v.voiceover_path)    { done.push(2); targetStep = 3; }
      if (v.video_path)        { done.push(3); targetStep = 4; }
      if (v.status === 'posted' && v.youtube_url) { done.push(4, 5); targetStep = 5; }

      setCompleted(done);
      setStep(targetStep);
    } catch (e) {
      setError(`Could not load video: ${(e as Error).message}`);
    } finally {
      setLoading(false);
      setLoadingLabel('');
    }
  }

  // ── Back navigation via step indicator ───────────────────────────────────

  const handleStepClick = (n: number) => {
    if (completed.includes(n)) setStep(n as Step);
  };

  // ── Reset ─────────────────────────────────────────────────────────────────

  const handleReset = () => {
    eventSourceRef.current?.close();
    setStep(1);
    setCompleted([]);
    setTopic('');
    setLogs([]);
    setAssemblyProgress(0);
    setAssemblyStarted(false);
    setError('');
    setVideo(EMPTY_VIDEO);
    // Remove ?videoId= from the URL so a refresh doesn't re-load the old video
    router.replace('/generate');
  };

  // ── Step 1: Get trending topics ───────────────────────────────────────────

  const handleGetTrending = async () => {
    setTrendingLoading(true);
    clearError();
    try {
      const res = await fetch('/api/trending', { method: 'POST' });
      const data = await res.json() as { topics?: string[]; error?: string };
      if (data.error) throw new Error(data.error);
      setTrendingTopics(data.topics ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTrendingLoading(false);
    }
  };

  // ── Step 1 → 2: Generate script ──────────────────────────────────────────

  const handleGenerateScript = async () => {
    if (!topic.trim()) { setError('Please enter a topic first.'); return; }
    setLoading(true);
    setLoadingLabel('Generating script');
    clearError();
    try {
      const createRes = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });
      const createData = await createRes.json() as { videoId?: string; error?: string };
      if (createData.error) throw new Error(createData.error);

      const res = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });
      const data = await res.json() as { script?: string; error?: string };
      if (data.error) throw new Error(data.error);

      setVideo((v) => ({ ...v, id: createData.videoId!, topic, script: data.script! }));
      completeStep(1);
      setStep(2);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setLoadingLabel('');
    }
  };

  const handleRegenerateScript = async () => {
    setLoading(true);
    setLoadingLabel('Regenerating script');
    clearError();
    try {
      const res = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: video.topic }),
      });
      const data = await res.json() as { script?: string; error?: string };
      if (data.error) throw new Error(data.error);
      setVideo((v) => ({ ...v, script: data.script! }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setLoadingLabel('');
    }
  };

  // ── Step 2 → 3: Generate voice ────────────────────────────────────────────

  const handleGenerateVoice = async () => {
    setLoading(true);
    setLoadingLabel('Generating voiceover');
    clearError();
    try {
      const res = await fetch('/api/generate-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: video.script, voice: selectedVoice, videoId: video.id }),
      });
      const data = await res.json() as { audioPath?: string; duration?: number; error?: string };
      if (data.error) throw new Error(data.error);

      await fetch(`/api/videos/${video.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceover_path: data.audioPath }),
      });

      setVideo((v) => ({ ...v, audioPath: data.audioPath!, audioDuration: data.duration ?? 0 }));
      completeStep(2);
      setStep(3);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setLoadingLabel('');
    }
  };

  // ── Step 3 → 4: Footage + assemble ───────────────────────────────────────

  const handleAssembleVideo = async () => {
    setLoading(true);
    setLoadingLabel('Fetching footage');
    clearError();
    setLogs([]);
    setAssemblyProgress(0);
    setAssemblyStarted(false);

    try {
      addLog('[VidForge] Fetching stock footage from Pexels…');
      const footageRes = await fetch('/api/fetch-footage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: video.script, videoId: video.id }),
      });
      const footageData = await footageRes.json() as { clips?: string[]; error?: string };
      if (footageData.error) throw new Error(footageData.error);
      addLog(`[VidForge] Downloaded ${footageData.clips?.length ?? 0} footage clips.`);

      completeStep(3);
      setStep(4);
      setLoading(false);
      setLoadingLabel('');
      setAssemblyStarted(true);
      addLog('[VidForge] Starting video assembly…');

      // Capture values needed inside event handlers — avoids stale closure issues
      const currentScript = video.script;
      const currentTopic = video.topic;

      const es = new EventSource(`/api/assemble-video?videoId=${video.id}`);
      eventSourceRef.current = es;

      es.onmessage = (e) => {
        const d = JSON.parse(e.data) as { log?: string };
        if (d.log) {
          addLog(d.log);
          // Rough progress from FFmpeg frame count
          const m = d.log.match(/frame=\s*(\d+)/);
          if (m) setAssemblyProgress(Math.min(88, (parseInt(m[1]) / 800) * 100));
        }
      };

      es.addEventListener('done', (e) => {
        const d = JSON.parse((e as MessageEvent).data) as { videoPath: string };
        es.close();
        setAssemblyProgress(100);
        setVideo((v) => ({ ...v, videoPath: d.videoPath }));
        addLog('[VidForge] Assembly complete! Generating metadata…');
        fetchMetadata(currentScript, currentTopic);
      });

      // Only treat this as an error when the server explicitly sends event: error
      // (has JSON data). Native connection close events have e.data = null → ignore.
      es.addEventListener('error', (e: Event) => {
        const msg = (e as MessageEvent).data;
        if (!msg) return; // native connection event, not a server error
        const d = JSON.parse(msg) as { error?: string };
        es.close();
        setError(d.error ?? 'Assembly failed. Check the log for details.');
      });

    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
      setLoadingLabel('');
    }
  };

  // Takes script + topic as params so no stale closure regardless of when it's called
  async function fetchMetadata(script: string, topic: string) {
    try {
      const res = await fetch('/api/generate-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script, topic }),
      });
      const data = await res.json() as { title?: string; description?: string; tags?: string[]; error?: string };
      if (data.error) return;
      setVideo((v) => ({
        ...v,
        title: data.title ?? '',
        description: data.description ?? '',
        tags: data.tags ?? [],
      }));
      completeStep(4);
    } catch {
      // Non-fatal — user can type metadata manually
    }
  }

  const handleRegenerateMetadata = () => fetchMetadata(video.script, video.topic);

  // ── Step 4 → 5: Upload ────────────────────────────────────────────────────

  const handleUpload = async () => {
    setLoading(true);
    setLoadingLabel('Uploading to YouTube');
    clearError();
    try {
      const res = await fetch('/api/upload-youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: video.id,
          title: video.title,
          description: video.description,
          tags: video.tags,
        }),
      });
      const data = await res.json() as { youtubeUrl?: string; error?: string };
      if (data.error) throw new Error(data.error);
      setVideo((v) => ({ ...v, youtubeUrl: data.youtubeUrl! }));
      completeStep(5);
      setStep(5);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setLoadingLabel('');
    }
  };

  // ── Shared Tailwind class strings ─────────────────────────────────────────

  const INPUT =
    'w-full bg-dark-800 border border-dark-500 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 transition-colors placeholder-gray-600';

  const BTN_PRIMARY =
    'flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:bg-dark-600 disabled:text-gray-600 text-white rounded-xl font-medium transition-colors text-sm flex items-center justify-center gap-2';

  const BTN_SECONDARY =
    'px-4 py-2.5 bg-dark-600 hover:bg-dark-500 border border-dark-400 text-gray-300 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 shrink-0';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto">

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Video Generator</h1>
          {video.topic && (
            <p className="text-gray-500 text-sm mt-0.5 truncate max-w-sm" title={video.topic}>
              {video.topic}
            </p>
          )}
        </div>
        {step > 1 && (
          <button
            onClick={handleReset}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors px-2 py-1 rounded-lg hover:bg-dark-700 shrink-0"
          >
            ← Start over
          </button>
        )}
      </div>

      <StepIndicator current={step} completed={completed} onStepClick={handleStepClick} />

      {/* Error banner */}
      {error && (
        <div className="mb-5 p-3.5 bg-red-950/60 border border-red-800/50 rounded-xl text-red-300 text-sm flex items-start gap-2.5">
          <svg className="w-4 h-4 shrink-0 mt-0.5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <span className="flex-1">{error}</span>
          <button onClick={clearError} className="text-red-500 hover:text-red-300 shrink-0">✕</button>
        </div>
      )}

      {/* Loading overlay when resuming a video */}
      {loading && loadingLabel === 'Loading video' && (
        <div className="bg-dark-700 border border-dark-500 rounded-2xl p-10 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading video…</p>
        </div>
      )}

      {/* ── STEP 1: Topic ───────────────────────────────────────────── */}
      {step === 1 && loadingLabel !== 'Loading video' && (
        <Card>
          <CardHeader
            icon="💡"
            title="What is your video about?"
            subtitle="Enter a topic or pick a trending story"
          />

          <div className="relative">
            <textarea
              className={`${INPUT} resize-none`}
              rows={3}
              placeholder="e.g. How AI agents are replacing software developers in 2024"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerateScript();
              }}
              maxLength={300}
            />
            {topic.length > 200 && (
              <span className="absolute bottom-2 right-3 text-xs text-gray-600">
                {topic.length}/300
              </span>
            )}
          </div>

          <button
            onClick={handleGetTrending}
            disabled={trendingLoading}
            className={BTN_SECONDARY}
          >
            {trendingLoading
              ? <><span>Fetching</span><Dots /></>
              : <><span>🔥</span><span>Get Trending Topics</span></>}
          </button>

          {trendingTopics.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                Trending now
              </p>
              <div className="flex flex-col gap-1.5">
                {trendingTopics.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTopic(t)}
                    className={`text-left text-sm px-3 py-2 rounded-lg border transition-all ${
                      topic === t
                        ? 'bg-brand-500/10 border-brand-500 text-brand-300'
                        : 'bg-dark-800 border-dark-500 text-gray-400 hover:border-dark-400 hover:text-gray-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleGenerateScript}
            disabled={loading || !topic.trim()}
            className={BTN_PRIMARY}
          >
            {loading
              ? <><span>{loadingLabel}</span><Dots /></>
              : <><span>Generate Script</span><span>→</span></>}
          </button>

          <p className="text-xs text-gray-700 text-center">
            Tip: <kbd className="px-1 py-0.5 bg-dark-600 rounded text-gray-500">Ctrl+Enter</kbd> to generate
          </p>
        </Card>
      )}

      {/* ── STEP 2: Script ──────────────────────────────────────────── */}
      {step === 2 && (
        <Card>
          <div className="flex items-start justify-between gap-4">
            <CardHeader icon="📝" title="Review & Edit Script" />
            <div className="text-right shrink-0">
              <div className="text-white font-semibold text-sm tabular-nums">
                {wordCount.toLocaleString()} words
              </div>
              <div className="text-xs text-gray-500">{estimatedDuration}</div>
            </div>
          </div>

          <textarea
            className={`${INPUT} font-mono text-xs leading-6`}
            rows={22}
            value={video.script}
            onChange={(e) => setVideo((v) => ({ ...v, script: e.target.value }))}
          />

          {/* Voice selector — pick before generating */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Voice</label>
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className={`${INPUT} flex-1`}
            >
              {VOICES.map((v) => (
                <option key={v.value} value={v.value}>{v.label} — {v.meta}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleRegenerateScript}
              disabled={loading}
              className={BTN_SECONDARY}
            >
              {loading && loadingLabel === 'Regenerating script'
                ? <><span>Regenerating</span><Dots /></>
                : <>↻ <span>Regenerate</span></>}
            </button>
            <button
              onClick={handleGenerateVoice}
              disabled={loading || !video.script.trim()}
              className={BTN_PRIMARY}
            >
              {loading && loadingLabel === 'Generating voiceover'
                ? <><span>Generating voiceover</span><Dots /></>
                : <><span>Generate Voiceover</span><span>→</span></>}
            </button>
          </div>
        </Card>
      )}

      {/* ── STEP 3: Voice ───────────────────────────────────────────── */}
      {step === 3 && (
        <Card>
          <CardHeader icon="🎙" title="Voiceover" subtitle="Preview the audio and choose a voice" />

          {video.audioPath ? (
            <AudioPlayer src={`/api/audio/${video.id}`} duration={video.audioDuration || undefined} />
          ) : (
            <div className="h-20 bg-dark-800 border border-dark-500 border-dashed rounded-xl flex items-center justify-center text-gray-600 text-sm">
              Audio will appear here after generation
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Voice</p>
            <div className="grid grid-cols-1 gap-1.5">
              {VOICES.map((v) => (
                <button
                  key={v.value}
                  onClick={() => setSelectedVoice(v.value)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm text-left transition-all ${
                    selectedVoice === v.value
                      ? 'bg-brand-500/10 border-brand-500 text-white'
                      : 'bg-dark-800 border-dark-500 text-gray-400 hover:border-dark-400 hover:text-gray-200'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
                      selectedVoice === v.value ? 'bg-brand-400' : 'bg-dark-400'
                    }`}
                  />
                  <span className="font-medium">{v.label}</span>
                  <span className="text-xs text-gray-600 ml-auto">{v.meta}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            {/* Only show "Regenerating" text when actually regenerating voice */}
            <button
              onClick={handleGenerateVoice}
              disabled={loading}
              className={BTN_SECONDARY}
            >
              {loading && loadingLabel === 'Generating voiceover'
                ? <><span>Regenerating</span><Dots /></>
                : <>↻ <span>Regenerate Voice</span></>}
            </button>
            <button
              onClick={handleAssembleVideo}
              disabled={loading}
              className={BTN_PRIMARY}
            >
              {loading && loadingLabel === 'Fetching footage'
                ? <><span>Fetching footage</span><Dots /></>
                : <><span>Fetch Footage & Assemble</span><span>→</span></>}
            </button>
          </div>
        </Card>
      )}

      {/* ── STEP 4: Video assembly ───────────────────────────────────── */}
      {step === 4 && (
        <Card>
          <CardHeader icon="🎬" title="Video Assembly" />

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-gray-500">
                {!assemblyStarted
                  ? 'Starting…'
                  : assemblyProgress < 100
                  ? 'Assembling…'
                  : 'Complete'}
              </span>
              <span className={assemblyProgress === 100 ? 'text-green-400 font-medium' : 'text-gray-500'}>
                {Math.round(assemblyProgress)}%
              </span>
            </div>
            <div className="h-1.5 bg-dark-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  assemblyProgress === 100 ? 'bg-green-500' : 'bg-brand-500'
                }`}
                style={{ width: `${Math.max(assemblyProgress, assemblyStarted ? 1 : 0)}%` }}
              />
            </div>
          </div>

          <LogViewer logs={logs} />

          {/* Video preview */}
          {video.videoPath && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Preview</p>
              <video
                controls
                className="w-full rounded-xl bg-black border border-dark-500"
                style={{ maxHeight: '340px' }}
              >
                <source src={`/api/video/${video.id}`} type="video/mp4" />
              </video>
            </div>
          )}

          {/* YouTube metadata */}
          <div className="space-y-3 pt-3 border-t border-dark-600">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                YouTube Metadata
              </p>
              <button
                onClick={handleRegenerateMetadata}
                className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                ↻ Regenerate
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-gray-500">Title</label>
                <span className={`text-xs tabular-nums ${titleCountColor}`}>{titleLen}/60</span>
              </div>
              <input
                type="text"
                className={INPUT}
                value={video.title}
                onChange={(e) => setVideo((v) => ({ ...v, title: e.target.value }))}
                placeholder="SEO optimized title…"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Description</label>
              <textarea
                rows={5}
                className={`${INPUT} resize-y`}
                value={video.description}
                onChange={(e) => setVideo((v) => ({ ...v, description: e.target.value }))}
                placeholder="Video description…"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-gray-500">Tags</label>
                <span className="text-xs text-gray-600">{video.tags.length} tags · comma separated</span>
              </div>
              <input
                type="text"
                className={INPUT}
                value={video.tags.join(', ')}
                onChange={(e) =>
                  setVideo((v) => ({
                    ...v,
                    tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                  }))
                }
                placeholder="ai, technology, machine learning…"
              />
            </div>
          </div>

          {/* Upload button — dedicated style, not extending BTN_PRIMARY */}
          <button
            onClick={handleUpload}
            disabled={loading || !video.videoPath}
            className="w-full py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-dark-600 disabled:text-gray-600 text-white rounded-xl font-medium transition-colors text-sm flex items-center justify-center gap-2"
          >
            {loading && loadingLabel === 'Uploading to YouTube' ? (
              <><span>Uploading</span><Dots /></>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21.8 8s-.2-1.4-.8-2c-.8-.8-1.6-.8-2-.9C16.5 5 12 5 12 5s-4.5 0-7 .1c-.4.1-1.3.1-2 .9-.6.6-.8 2-.8 2S2 9.6 2 11.2v1.5c0 1.6.2 3.2.2 3.2s.2 1.4.8 2c.8.8 1.8.8 2.2.8C6.6 19 12 19 12 19s4.5 0 7-.2c.4-.1 1.3-.1 2-.9.6-.6.8-2 .8-2s.2-1.6.2-3.2v-1.5C22 9.6 21.8 8 21.8 8zM9.7 13.5V9.8l5.3 1.9-5.3 1.8z" />
                </svg>
                <span>Post to YouTube</span>
              </>
            )}
          </button>

          {!video.videoPath && assemblyStarted && assemblyProgress < 100 && (
            <p className="text-xs text-center text-gray-600">
              Upload unlocks when assembly finishes
            </p>
          )}
        </Card>
      )}

      {/* ── STEP 5: Done ────────────────────────────────────────────── */}
      {step === 5 && (
        <Card>
          <div className="flex flex-col items-center text-center gap-5 py-6">
            <div className="w-16 h-16 rounded-2xl bg-green-900/30 border border-green-700/40 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">Video Posted!</h2>
              <p className="text-gray-500 text-sm mt-1">Your video is live on YouTube</p>
            </div>

            {video.title && (
              <p className="text-xs text-gray-600 max-w-xs">"{video.title}"</p>
            )}

            {video.youtubeUrl && (
              <a
                href={video.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium transition-colors text-sm"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21.8 8s-.2-1.4-.8-2c-.8-.8-1.6-.8-2-.9C16.5 5 12 5 12 5s-4.5 0-7 .1c-.4.1-1.3.1-2 .9-.6.6-.8 2-.8 2S2 9.6 2 11.2v1.5c0 1.6.2 3.2.2 3.2s.2 1.4.8 2c.8.8 1.8.8 2.2.8C6.6 19 12 19 12 19s4.5 0 7-.2c.4-.1 1.3-.1 2-.9.6-.6.8-2 .8-2s.2-1.6.2-3.2v-1.5C22 9.6 21.8 8 21.8 8zM9.7 13.5V9.8l5.3 1.9-5.3 1.8z" />
                </svg>
                Watch on YouTube
              </a>
            )}

            <button
              onClick={handleReset}
              className="px-6 py-2.5 bg-dark-600 hover:bg-dark-500 border border-dark-500 text-gray-300 rounded-xl text-sm font-medium transition-colors"
            >
              Create Another Video
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Layout primitives ─────────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-dark-700 border border-dark-500 rounded-2xl p-6 space-y-4">
      {children}
    </div>
  );
}

function CardHeader({
  icon, title, subtitle,
}: {
  icon?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      <h2 className="text-base font-semibold text-white flex items-center gap-2">
        {icon && <span>{icon}</span>}
        {title}
      </h2>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}
