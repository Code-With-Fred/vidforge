'use client';

import { useEffect, useRef } from 'react';

interface Props {
  logs: string[];
}

export default function LogViewer({ logs }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="bg-dark-900 border border-dark-500 rounded-lg p-4 h-64 overflow-y-auto font-mono text-xs text-green-400">
      {logs.length === 0 ? (
        <p className="text-gray-600">Waiting for assembly to start...</p>
      ) : (
        logs.map((line, i) => (
          <div key={i} className="leading-5">
            <span className="text-gray-600 mr-2 select-none">
              {String(i + 1).padStart(3, '0')}
            </span>
            <span
              className={
                line.includes('[ERROR]')
                  ? 'text-red-400'
                  : line.includes('[VidForge]')
                  ? 'text-brand-400'
                  : 'text-green-400'
              }
            >
              {line}
            </span>
          </div>
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
}
