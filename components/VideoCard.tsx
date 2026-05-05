'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Video {
  _id: string;
  topic: string;
  title: string;
  status: 'draft' | 'rendering' | 'ready' | 'posted';
  created_at: string;
  youtube_url?: string;
}

interface Props {
  video: Video;
  onDelete: (id: string) => void;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string; dot: string }
> = {
  draft: {
    label: 'Draft',
    className: 'bg-dark-600 text-gray-400',
    dot: 'bg-gray-500',
  },
  rendering: {
    label: 'Rendering',
    className: 'bg-yellow-900/60 text-yellow-300',
    dot: 'bg-yellow-400 animate-pulse',
  },
  ready: {
    label: 'Ready',
    className: 'bg-green-900/60 text-green-300',
    dot: 'bg-green-400',
  },
  posted: {
    label: 'Posted',
    className: 'bg-brand-600/60 text-brand-300',
    dot: 'bg-brand-400',
  },
};

export default function VideoCard({ video, onDelete }: Props) {
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await fetch(`/api/videos/${video._id}`, { method: 'DELETE' });
      onDelete(video._id);
    } catch {
      alert('Failed to delete video.');
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  const date = new Date(video.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const status = STATUS_CONFIG[video.status] ?? STATUS_CONFIG.draft;
  const displayTitle = video.title || video.topic;

  return (
    <div className="group bg-dark-700 border border-dark-500 rounded-xl overflow-hidden hover:border-dark-400 transition-all duration-200 flex flex-col">
      {/* Thumbnail */}
      <div className="relative w-full aspect-video bg-dark-800 flex items-center justify-center overflow-hidden">
        {video.status === 'ready' || video.status === 'posted' ? (
          /* Styled placeholder for ready/posted videos */
          <div className="absolute inset-0 bg-gradient-to-br from-dark-600 to-dark-900 flex items-center justify-center">
            <div className="text-center px-4">
              <div className="w-10 h-10 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-brand-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <p className="text-xs text-gray-500 line-clamp-2">{displayTitle}</p>
            </div>
          </div>
        ) : (
          <div className="text-dark-400">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
          </div>
        )}

        {/* Status badge overlay */}
        <div className="absolute top-2 left-2">
          <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${status.className}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
        </div>

        {/* Delete button overlay — shown on hover */}
        {!showConfirm && (
          <button
            onClick={() => setShowConfirm(true)}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-dark-900/70 text-gray-500 hover:text-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
            title="Delete"
          >
            ✕
          </button>
        )}

        {/* Delete confirmation overlay */}
        {showConfirm && (
          <div className="absolute inset-0 bg-dark-900/90 flex flex-col items-center justify-center gap-2 p-4">
            <p className="text-white text-xs font-medium text-center">Delete this video?</p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
              >
                {deleting ? '...' : 'Delete'}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="px-3 py-1 text-xs bg-dark-600 hover:bg-dark-500 text-gray-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <p className="text-white text-sm font-medium line-clamp-2 leading-5 flex-1">
          {displayTitle}
        </p>
        <p className="text-gray-600 text-xs">{date}</p>

        {/* Actions */}
        <div className="flex gap-1.5 mt-1">
          <Link
            href={`/generate?videoId=${video._id}`}
            className="flex-1 text-center text-xs py-1.5 bg-dark-600 hover:bg-dark-500 text-gray-300 hover:text-white rounded-lg transition-colors"
          >
            {video.status === 'draft' ? 'Continue' : 'View'}
          </Link>

          {video.youtube_url ? (
            <a
              href={video.youtube_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center text-xs py-1.5 bg-red-900/60 hover:bg-red-800 text-red-300 hover:text-white rounded-lg transition-colors"
            >
              YouTube ↗
            </a>
          ) : video.status === 'ready' ? (
            <Link
              href={`/generate?videoId=${video._id}`}
              className="flex-1 text-center text-xs py-1.5 bg-brand-600/40 hover:bg-brand-600 text-brand-300 hover:text-white rounded-lg transition-colors"
            >
              Upload
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
