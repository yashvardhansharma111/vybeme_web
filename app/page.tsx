'use client';

import { AppHeader } from './components/AppHeader';
import { DownloadAppCTA } from './components/DownloadAppCTA';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-100/80 to-neutral-900 md:bg-neutral-200">
      <AppHeader />
      <main className="mx-auto flex max-w-md flex-col items-center justify-center gap-6 p-8 pb-12 text-center md:max-w-2xl md:py-16">
        <h1 className="text-2xl font-bold text-neutral-900 md:text-3xl">
          Find people for your plans
        </h1>
        <p className="max-w-sm text-neutral-600">
          Open the app to discover plans, join events, and connect with others.
        </p>
        <DownloadAppCTA />
      </main>
    </div>
  );
}
