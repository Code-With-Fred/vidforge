'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/generate', label: 'Generate' },
  { href: '/settings', label: 'Settings' },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-dark-600 bg-dark-800 px-6 py-3 flex items-center gap-6 sticky top-0 z-50">
      <Link href="/" className="flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/30">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
          </svg>
        </div>
        <span className="font-bold text-white text-lg tracking-tight">VidForge</span>
      </Link>

      <div className="flex items-center gap-1 ml-2">
        {LINKS.map(({ href, label }) => {
          const active =
            href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors font-medium ${
                active
                  ? 'bg-dark-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-dark-700'
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      <div className="ml-auto">
        <Link
          href="/generate"
          className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm shadow-brand-500/30"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          New Video
        </Link>
      </div>
    </nav>
  );
}
