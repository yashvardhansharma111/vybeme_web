'use client';

import Link from 'next/link';

export function AppHeader() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-neutral-100 bg-white px-4 md:px-6">
      <Link href="/" className="text-lg font-semibold text-neutral-900">
        vybeme.
      </Link>
      <a
        href="#"
        className="rounded-full bg-neutral-800 px-4 py-2 text-sm font-medium text-white no-underline transition-opacity hover:opacity-90"
      >
        Download App
      </a>
    </header>
  );
}
