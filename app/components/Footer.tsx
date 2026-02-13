'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8 md:flex-row md:items-start md:justify-between md:gap-12">
        {/* Left: Connect + Instagram, email */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Connect</h3>
          <div className="mt-3 flex flex-col gap-2">
            <a
              href="https://www.instagram.com/vybeme.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-neutral-900 no-underline hover:underline"
            >
              Instagram
            </a>
            <a
              href="mailto:dev@vybeme.in"
              className="font-bold text-neutral-900 no-underline hover:underline"
            >
              Email
            </a>
          </div>
        </div>
        {/* Right: vybeme. + tagline + branch + copyright */}
        <div className="text-left md:text-right">
          <p className="text-lg font-bold text-neutral-900">vybeme.</p>
          <p className="mt-1 text-sm text-neutral-600">people, for all your plans</p>
          <p className="mt-1 text-sm text-neutral-500">@Branch vybelabs</p>
          <p className="mt-3 text-xs text-neutral-400">All rights reserved</p>
        </div>
      </div>
    </footer>
  );
}
