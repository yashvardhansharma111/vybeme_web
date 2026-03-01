'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppHeader } from '../../../components/AppHeader';
import { getUserPlans } from '@/lib/api';

const APP_SCHEME = 'vybeme';
const FALLBACK_DELAY_MS = 2500;

function isMobileUserAgent(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || '';
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua.toLowerCase());
}

function parseTs(value: unknown): number {
  if (!value) return 0;
  const t = new Date(String(value)).getTime();
  return Number.isFinite(t) ? t : 0;
}

function resolveLatestPlanId(plans: any[]): string | null {
  const eligible = (plans || [])
    .filter((p) => {
      const isBusiness = p?.type === 'business' || p?.plan_type === 'BusinessPlan';
      const isDeleted = p?.post_status === 'deleted';
      const isRepost = !!p?.is_repost;
      return isBusiness && !isDeleted && !isRepost && !!p?.plan_id;
    })
    .map((p, idx) => ({
      planId: String(p.plan_id),
      createdAt: parseTs(p.created_at),
      updatedAt: parseTs(p.updated_at),
      index: idx,
    }))
    .sort((a, b) => {
      if (b.createdAt !== a.createdAt) return b.createdAt - a.createdAt;
      if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt;
      return a.index - b.index;
    });

  return eligible[0]?.planId ?? null;
}

export default function GoBusinessPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  const [triedApp, setTriedApp] = useState(false);
  const [fallbackHref, setFallbackHref] = useState<string>('/');

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const run = async () => {
      if (!userId) {
        router.replace('/');
        return;
      }

      try {
        const res = await getUserPlans(userId, 100, 0);
        const rawPlans = res.success && Array.isArray(res.data) ? res.data : [];
        const latestPlanId = resolveLatestPlanId(rawPlans);

        if (!latestPlanId) {
          router.replace(`/profile/${userId}`);
          return;
        }

        const webTarget = `/post/${latestPlanId}`;
        setFallbackHref(webTarget);

        if (!isMobileUserAgent()) {
          router.replace(webTarget);
          return;
        }

        setTriedApp(true);
        timeoutId = setTimeout(() => {
          if (!cancelled) router.replace(webTarget);
        }, FALLBACK_DELAY_MS);

        window.location.href = `${APP_SCHEME}://post/${latestPlanId}`;
      } catch {
        router.replace(`/profile/${userId}`);
      }
    };

    run();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [router, userId]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-100/80 to-neutral-900">
      <AppHeader />
      <main className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        {triedApp ? (
          <>
            <p className="text-lg font-medium text-neutral-800">Opening in app…</p>
            <p className="mt-2 text-sm text-neutral-500">
              If the app doesn’t open, you’ll be taken to the latest event shortly.
            </p>
            <a href={fallbackHref} className="mt-6 text-base font-semibold text-neutral-700 underline">
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
