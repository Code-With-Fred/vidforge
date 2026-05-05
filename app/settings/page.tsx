'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const VOICES = [
  { value: 'en-US-ChristopherNeural', label: 'Christopher — US Male' },
  { value: 'en-US-JennyNeural', label: 'Jenny — US Female' },
  { value: 'en-US-GuyNeural', label: 'Guy — US Newsreader' },
  { value: 'en-GB-RyanNeural', label: 'Ryan — British Male' },
  { value: 'en-AU-WilliamNeural', label: 'William — Australian Male' },
];

interface SettingsData {
  pexels_api_key: string;
  youtube_connected: boolean;
  ollama_model: string;
  default_voice: string;
  output_format: string;
}

type TestState = 'idle' | 'testing' | 'ok' | 'error';

function SettingsContent() {
  const searchParams = useSearchParams();
  const [settings, setSettings] = useState<SettingsData>({
    pexels_api_key: '',
    youtube_connected: false,
    ollama_model: 'llama3',
    default_voice: 'en-US-ChristopherNeural',
    output_format: '1920x1080',
  });
  const [ollamaModels, setOllamaModels] = useState<string[]>(['llama3']);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tests, setTests] = useState<Record<string, TestState>>({});
  const [mongoStatus, setMongoStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [showApiKey, setShowApiKey] = useState(false);

  const youtubeConnected = searchParams.get('youtube') === 'connected';
  const oauthError = searchParams.get('error');
  const isYoutubeConnected = settings.youtube_connected || youtubeConnected;

  useEffect(() => {
    loadSettings();
    fetchOllamaModels();
    checkMongo();
  }, []);

  async function loadSettings() {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.settings) {
        setSettings((s) => ({ ...s, ...data.settings }));
      }
    } catch { /* backend not up yet */ }
  }

  async function fetchOllamaModels() {
    try {
      const res = await fetch('http://localhost:11434/api/tags');
      const data = await res.json();
      const models: string[] = data.models?.map((m: { name: string }) => m.name) ?? [];
      if (models.length > 0) setOllamaModels(models);
    } catch { /* Ollama not running */ }
  }

  async function checkMongo() {
    try {
      const res = await fetch('/api/settings');
      setMongoStatus(res.ok ? 'ok' : 'error');
    } catch {
      setMongoStatus('error');
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { /* ignore */ }
    setSaving(false);
  }

  function setTest(key: string, state: TestState) {
    setTests((t) => ({ ...t, [key]: state }));
  }

  async function testOllama() {
    setTest('ollama', 'testing');
    try {
      const res = await fetch('http://localhost:11434/api/tags');
      setTest('ollama', res.ok ? 'ok' : 'error');
    } catch {
      setTest('ollama', 'error');
    }
  }

  async function testPexels() {
    if (!settings.pexels_api_key) {
      setTest('pexels', 'error');
      return;
    }
    setTest('pexels', 'testing');
    try {
      const res = await fetch(
        `https://api.pexels.com/videos/search?query=technology&per_page=1`,
        { headers: { Authorization: settings.pexels_api_key } }
      );
      setTest('pexels', res.ok ? 'ok' : 'error');
    } catch {
      setTest('pexels', 'error');
    }
  }

  async function testYoutube() {
    setTest('youtube', isYoutubeConnected ? 'ok' : 'error');
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-2">Settings</h1>
      <p className="text-gray-500 text-sm mb-7">Configure your integrations and defaults</p>

      {/* Banners */}
      {youtubeConnected && (
        <Banner type="success">YouTube connected successfully!</Banner>
      )}
      {oauthError && (
        <Banner type="error">OAuth error: {oauthError}</Banner>
      )}

      <div className="space-y-4">

        {/* ── Pexels ── */}
        <Section icon="🎥" title="Pexels API" subtitle="Free stock footage">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={settings.pexels_api_key}
                onChange={(e) => setSettings((s) => ({ ...s, pexels_api_key: e.target.value }))}
                placeholder="Paste your Pexels API key"
                className={INPUT}
              />
              <button
                onClick={() => setShowApiKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 text-xs"
              >
                {showApiKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <TestButton state={tests.pexels} onClick={testPexels} />
          </div>
          <p className="text-xs text-gray-600">
            Free at{' '}
            <span className="text-gray-400">pexels.com/api</span>
            {' '}— no credit card needed
          </p>
        </Section>

        {/* ── YouTube ── */}
        <Section icon="▶" title="YouTube" subtitle="Upload videos directly">
          <div className="flex items-center justify-between p-3 bg-dark-800 rounded-xl border border-dark-500">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${isYoutubeConnected ? 'bg-green-400' : 'bg-dark-400'}`} />
              <div>
                <p className="text-sm text-gray-300 font-medium">Google OAuth</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {isYoutubeConnected ? 'Connected and ready to upload' : 'Not connected — click to authorize'}
                </p>
              </div>
            </div>
            <a
              href="/api/auth/youtube"
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isYoutubeConnected
                  ? 'bg-dark-600 hover:bg-dark-500 text-gray-300'
                  : 'bg-red-600 hover:bg-red-500 text-white'
              }`}
            >
              {isYoutubeConnected ? 'Reconnect' : 'Connect'}
            </a>
          </div>
        </Section>

        {/* ── Ollama ── */}
        <Section icon="🤖" title="Ollama" subtitle="Local AI model for scripts and metadata">
          <div className="flex gap-2">
            <select
              value={settings.ollama_model}
              onChange={(e) => setSettings((s) => ({ ...s, ollama_model: e.target.value }))}
              className={`${INPUT} flex-1`}
            >
              {ollamaModels.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <TestButton state={tests.ollama} onClick={testOllama} />
          </div>
          <p className="text-xs text-gray-600">
            Make sure <code className="text-gray-400">ollama serve</code> is running locally on port 11434
          </p>
        </Section>

        {/* ── Voice ── */}
        <Section icon="🎙" title="Voice" subtitle="Edge TTS — runs locally via Python">
          <select
            value={settings.default_voice}
            onChange={(e) => setSettings((s) => ({ ...s, default_voice: e.target.value }))}
            className={INPUT}
          >
            {VOICES.map((v) => (
              <option key={v.value} value={v.value}>{v.label}</option>
            ))}
          </select>
        </Section>

        {/* ── Output ── */}
        <Section icon="📁" title="Output" subtitle="Video format and file location">
          <select
            value={settings.output_format}
            onChange={(e) => setSettings((s) => ({ ...s, output_format: e.target.value }))}
            className={INPUT}
          >
            <option value="1920x1080">1920 × 1080 — Landscape (YouTube long-form)</option>
            <option value="1080x1920">1080 × 1920 — Portrait (YouTube Shorts)</option>
          </select>
          <div className="flex items-center gap-2 text-xs text-gray-600 bg-dark-800 rounded-lg px-3 py-2 border border-dark-500">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span>Output folder: <span className="text-gray-400 font-mono">./output/</span> (relative to project root)</span>
          </div>
        </Section>

        {/* ── System Status ── */}
        <Section icon="⚙" title="System Status">
          <div className="space-y-2">
            <StatusRow label="MongoDB" status={mongoStatus === 'ok' ? 'ok' : mongoStatus === 'error' ? 'error' : 'checking'} />
            <StatusRow
              label="Ollama (localhost:11434)"
              status={tests.ollama === 'ok' ? 'ok' : tests.ollama === 'error' ? 'error' : 'unchecked'}
            />
            <StatusRow
              label="Pexels API"
              status={tests.pexels === 'ok' ? 'ok' : tests.pexels === 'error' ? 'error' : 'unchecked'}
            />
            <StatusRow
              label="YouTube OAuth"
              status={isYoutubeConnected ? 'ok' : 'unchecked'}
            />
          </div>
        </Section>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-dark-600 disabled:text-gray-600 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {saving ? (
            'Saving…'
          ) : saved ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Saved!
            </>
          ) : (
            'Save Settings'
          )}
        </button>
      </div>
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function Section({
  icon,
  title,
  subtitle,
  children,
}: {
  icon?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-dark-700 border border-dark-500 rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        {icon && <span className="text-base">{icon}</span>}
        <div>
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          {subtitle && <p className="text-xs text-gray-600 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function TestButton({ state, onClick }: { state: TestState | undefined; onClick: () => void }) {
  const isLoading = state === 'testing';
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap flex items-center gap-1.5 ${
        state === 'ok'
          ? 'bg-green-900/40 border-green-700 text-green-300'
          : state === 'error'
          ? 'bg-red-900/40 border-red-700 text-red-300'
          : 'bg-dark-600 border-dark-400 text-gray-400 hover:text-gray-200'
      }`}
    >
      {state === 'ok' && '✓ '}
      {state === 'error' && '✗ '}
      {isLoading ? 'Testing…' : state === 'ok' ? 'Connected' : state === 'error' ? 'Failed' : 'Test'}
    </button>
  );
}

function StatusRow({
  label,
  status,
}: {
  label: string;
  status: 'ok' | 'error' | 'checking' | 'unchecked';
}) {
  const config = {
    ok: { dot: 'bg-green-400', text: 'text-green-400', label: 'Connected' },
    error: { dot: 'bg-red-400', text: 'text-red-400', label: 'Error' },
    checking: { dot: 'bg-yellow-400 animate-pulse', text: 'text-yellow-400', label: 'Checking…' },
    unchecked: { dot: 'bg-dark-400', text: 'text-gray-600', label: 'Not checked' },
  };
  const c = config[status];
  return (
    <div className="flex items-center justify-between text-sm py-1">
      <span className="text-gray-400">{label}</span>
      <span className={`flex items-center gap-1.5 text-xs font-medium ${c.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
        {c.label}
      </span>
    </div>
  );
}

function Banner({ type, children }: { type: 'success' | 'error'; children: React.ReactNode }) {
  return (
    <div
      className={`mb-5 p-4 rounded-xl text-sm border ${
        type === 'success'
          ? 'bg-green-900/30 border-green-700/50 text-green-300'
          : 'bg-red-900/30 border-red-700/50 text-red-300'
      }`}
    >
      {children}
    </div>
  );
}

const INPUT =
  'w-full bg-dark-800 border border-dark-500 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 transition-colors';

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-4 max-w-2xl">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-dark-700 border border-dark-500 rounded-2xl animate-pulse" />
        ))}
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}
