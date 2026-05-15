'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import VideoGrid from '@/components/VideoGrid';

interface Video {
  _id: string;
  topic: string;
  title: string;
  status: 'draft' | 'rendering' | 'ready' | 'posted';
  created_at: string;
  youtube_url?: string;
}

interface Stats {
  total: number;
  posted: number;
  draft: number;
  rendering: number;
}

export default function DashboardPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, posted: 0, draft: 0, rendering: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/videos');
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      const vids: Video[] = data.videos ?? [];
      setVideos(vids);
      setStats({
        total: vids.length,
        posted: vids.filter((v) => v.status === 'posted').length,
        draft: vids.filter((v) => v.status === 'draft').length,
        rendering: vids.filter((v) => v.status === 'rendering').length,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Your AI-generated video library
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-300 hover:bg-dark-700 rounded-lg transition-colors"
            title="Refresh"
          >
            <svg
              className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
          <Link
            href="/generate"
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl font-medium transition-colors text-sm shadow-lg shadow-brand-500/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Create New Video
          </Link>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-700/50 rounded-xl text-yellow-300 text-sm flex items-center gap-3">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <span>Could not reach backend: {error}. Make sure MongoDB is configured and the server is running.</span>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Videos" value={stats.total} loading={loading} />
        <StatCard label="Posted" value={stats.posted} color="text-brand-400" loading={loading} />
        <StatCard label="Rendering" value={stats.rendering} color="text-yellow-400" loading={loading} />
        <StatCard label="Drafts" value={stats.draft} loading={loading} />
      </div>

      {/* Video grid */}
      {loading ? (
        <SkeletonGrid />
      ) : (
        <VideoGrid initialVideos={videos} onRefresh={loadData} />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color = 'text-white',
  loading,
}: {
  label: string;
  value: number;
  color?: string;
  loading: boolean;
}) {
  return (
    <div className="bg-dark-700 border border-dark-500 rounded-xl p-5">
      <p className="text-gray-500 text-xs uppercase tracking-wider font-medium">{label}</p>
      {loading ? (
        <div className="h-9 w-12 bg-dark-500 rounded-lg mt-2 animate-pulse" />
      ) : (
        <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
      )}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-dark-700 border border-dark-500 rounded-xl p-4 space-y-3">
          <div className="w-full aspect-video bg-dark-600 rounded-lg animate-pulse" />
          <div className="h-4 bg-dark-600 rounded animate-pulse w-3/4" />
          <div className="h-3 bg-dark-600 rounded animate-pulse w-1/3" />
          <div className="h-6 bg-dark-600 rounded-full animate-pulse w-16" />
        </div>
      ))}
    </div>
  );
}
