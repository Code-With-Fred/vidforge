'use client';

import { useState } from 'react';
import Link from 'next/link';
import VideoCard from './VideoCard';

interface Video {
  _id: string;
  topic: string;
  title: string;
  status: 'draft' | 'rendering' | 'ready' | 'posted';
  created_at: string;
  youtube_url?: string;
}

interface Props {
  initialVideos: Video[];
  onRefresh?: () => void;
}

export default function VideoGrid({ initialVideos, onRefresh }: Props) {
  const [videos, setVideos] = useState<Video[]>(initialVideos);

  const handleDelete = (id: string) => {
    setVideos((prev) => prev.filter((v) => v._id !== id));
    onRefresh?.();
  };

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-20 h-20 rounded-2xl bg-dark-700 border border-dark-500 flex items-center justify-center mb-5">
          <svg
            className="w-9 h-9 text-dark-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
            />
          </svg>
        </div>
        <p className="text-lg font-semibold text-gray-400">No videos yet</p>
        <p className="text-sm text-gray-600 mt-1 mb-6">
          Generate your first AI video to get started
        </p>
        <Link
          href="/generate"
          className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Create your first video
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {videos.map((video) => (
        <VideoCard key={video._id} video={video} onDelete={handleDelete} />
      ))}
    </div>
  );
}
