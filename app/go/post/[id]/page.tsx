'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppHeader } from '../../../components/AppHeader';

const APP_SCHEME = 'vybeme';
const FALLBACK_DELAY_MS = 2500;

function isMobileUserAgent(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || '';
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua.toLowerCase());
}

export default function GoPostPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [triedApp, setTriedApp] = useState(false);

  useEffect(() => {
    if (!id) {
      router.replace('/');
      return;
    }

    const isMobile = isMobileUserAgent();

    if (!isMobile) {
      router.replace(`/post/${id}`);
      return;
    }

    // Mobile: try to open the app, then fall back to web post
    setTriedApp(true);
    const appUrl = `${APP_SCHEME}://post/${id}`;

    const timeoutId = setTimeout(() => {
      router.replace(`/post/${id}`);
    }, FALLBACK_DELAY_MS);

    // Try to open the app (custom scheme)
    window.location.href = appUrl;

    return () => clearTimeout(timeoutId);
  }, [id, router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-100/80 to-neutral-900">
      <AppHeader />
      <main className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        {triedApp ? (
          <>
            <p className="text-lg font-medium text-neutral-800">Opening in app…</p>
            <p className="mt-2 text-sm text-neutral-500">
              If the app doesn’t open, you’ll be taken to the post in a moment.
            </p>
            <a href={`/post/${id}`} className="mt-6 text-base font-semibold text-neutral-700 underline">
              Continue on web instead
            </a>
          </>
        ) : (
          <p className="text-neutral-600">Redirecting…</p>
        )}
      </main>
    </div>
  );
}
