'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AppHeader } from '@/app/components/AppHeader';
import { ShareMenu } from '@/app/components/ShareMenu';
import { getWebUser, getCurrentUserProfile, getUserPlans, getRegistrations, updateProfile } from '@/lib/api';

interface Plan {
  plan_id: string;
  title?: string;
  type?: string;
  plan_type?: string;
  post_status?: string;
  date?: string;
  time?: string;
  is_repost?: boolean;
  media?: Array<{ url: string; type?: string }>;
}

function formatEventDate(date: string | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatEventTime(time: string | undefined): string {
  if (!time?.trim()) return '—';
  return time.trim();
}

interface PlanWithCount extends Plan {
  registrationCount?: number;
}

function EventCard({
  plan: p,
  formatEventDate,
  formatEventTime,
}: {
  plan: PlanWithCount;
  formatEventDate: (date: string | undefined) => string;
  formatEventTime: (time: string | undefined) => string;
}) {
  return (
    <li className="overflow-hidden rounded-lg border border-neutral-100 bg-neutral-50/50">
      {/* Clickable image — opens view */}
      <Link href={`/post/${p.plan_id}`} className="block aspect-square w-full overflow-hidden rounded-t-lg bg-neutral-200 md:aspect-[2/1]">
        {p.media?.[0]?.url ? (
          <img src={p.media[0].url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-neutral-400 text-sm">No image</div>
        )}
      </Link>
      {/* Title, date/time, registration count */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 flex-1 truncate font-medium text-neutral-900">{p.title ?? 'Event'}</h3>
          <span className="shrink-0 text-xs text-neutral-500">
            {typeof p.registrationCount === 'number' ? `${p.registrationCount} registered` : '…'}
          </span>
        </div>
        <div className="mt-1 flex gap-3 text-xs text-neutral-500">
          <span>{formatEventDate(p.date)}</span>
          <span>{formatEventTime(p.time)}</span>
        </div>
        {/* Action buttons below image */}
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/clubs/registration/${p.plan_id}`}
            className="inline-flex rounded-full bg-neutral-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700"
          >
            Registration
          </Link>
          <Link
            href={`/clubs/plan/${p.plan_id}/edit`}
            className="inline-flex rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Edit
          </Link>
          <Link
            href={`/clubs/scan?plan=${p.plan_id}`}
            className="inline-flex rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Scan
          </Link>
          <ShareMenu postId={p.plan_id} title={p.title ?? 'Event'} />
        </div>
      </div>
    </li>
  );
}

export default function BusinessPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<ReturnType<typeof getWebUser>>(null);
  const [profile, setProfile] = useState<{ is_business?: boolean; name?: string } | null>(null);
  const [plans, setPlans] = useState<PlanWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [enablingBusiness, setEnablingBusiness] = useState(false);
  const [enableError, setEnableError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const stored = getWebUser();
    setUser(stored);
    if (process.env.NODE_ENV === 'development') {
      console.log('[business] mounted, user from storage:', stored ? { user_id: stored.user_id } : null);
    }
  }, []);

  const load = useCallback(async () => {
    if (!user?.user_id) return;
    try {
      setLoading(true);
      console.log('[business] load: fetching profile (session_id present:', !!user.session_id, ', user_id:', user.user_id, ')');
      const [profileRes, plansRes] = await Promise.all([
        getCurrentUserProfile(user.session_id),
        getUserPlans(user.user_id, 50, 0).catch(() => ({ success: false, data: [] })),
      ]);
      // Log profile response to debug redirects
      console.log('[business] load: profileRes =', profileRes ? { is_business: profileRes.is_business, user_id: profileRes.user_id } : null);
      // Keep is_business as-is (true/false/undefined). Only redirect when explicitly false.
      if (profileRes) setProfile({ is_business: profileRes.is_business, name: profileRes.name });
      const raw = plansRes.success && Array.isArray(plansRes.data) ? plansRes.data : [];
      const businessPlans = raw.filter(
        (p: Plan) =>
          (p?.type === 'business' || p?.plan_type === 'BusinessPlan') && p?.post_status !== 'deleted' && !p?.is_repost
      );
      setPlans(businessPlans);
      // Fetch registration counts by plan_id so merge is reliable
      Promise.all(
        businessPlans.map(async (p: Plan) => {
          try {
            const reg = await getRegistrations(p.plan_id);
            const count = reg?.data?.total_registrations;
            return { plan_id: p.plan_id, count: typeof count === 'number' ? count : 0 };
          } catch {
            return { plan_id: p.plan_id, count: 0 };
          }
        })
      ).then((results) => {
        const countByPlanId: Record<string, number> = {};
        results.forEach((r) => { countByPlanId[r.plan_id] = r.count; });
        setPlans((prev) =>
          prev.map((p) => ({ ...p, registrationCount: countByPlanId[p.plan_id] ?? 0 }))
        );
      });
    } catch (err) {
      console.warn('[business] load failed:', err);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, [user?.user_id, user?.session_id]);

  useEffect(() => {
    if (!mounted) return;
    if (!user?.user_id) {
      router.replace('/login');
      return;
    }
    load();
  }, [mounted, user?.user_id, router, load]);

  const handleEnableBusiness = useCallback(async () => {
    if (!user?.session_id) return;
    setEnableError(null);
    setEnablingBusiness(true);
    try {
      const res = await updateProfile(user.session_id, { is_business: true });
      if (res.success) {
        setProfile({ is_business: true });
        console.log('[business] is_business set to true');
      } else {
        setEnableError((res as { message?: string }).message || 'Failed to enable');
      }
    } catch (err) {
      setEnableError(err instanceof Error ? err.message : 'Failed to enable');
    } finally {
      setEnablingBusiness(false);
    }
  }, [user?.session_id]);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700" />
      </div>
    );
  }
  if (!user?.user_id) return null;

  // When profile loaded and is_business is false, show "Enable business account" instead of redirecting
  const showEnablePrompt = !loading && profile && profile.is_business === false;

  return (
    <div className="min-h-screen bg-neutral-50">
      <AppHeader />
      <div className="mx-auto max-w-xl px-4 py-8">
        <h1 className="text-xl font-semibold text-neutral-900">{profile?.name ?? 'User'} home</h1>
        <p className="mt-0.5 text-sm text-neutral-500">Scan tickets and manage attendees.</p>

        {showEnablePrompt && (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-900">Enable business account</p>
            <p className="mt-1 text-sm text-amber-800">Your account is not set as a business account. Enable it to create events, scan tickets, and manage attendees.</p>
            {enableError && <p className="mt-2 text-sm text-red-600">{enableError}</p>}
            <button
              type="button"
              onClick={handleEnableBusiness}
              disabled={enablingBusiness}
              className="mt-3 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {enablingBusiness ? 'Enabling…' : 'Enable business account'}
            </button>
          </div>
        )}

        {(!showEnablePrompt || profile?.is_business === true) && (
        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/clubs/scan"
            className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3 text-neutral-900 transition hover:bg-neutral-50"
          >
            <span className="font-medium">Scan tickets</span>
            <span className="text-neutral-400">→</span>
          </Link>

          <Link
            href="/clubs/create"
            className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3 text-neutral-900 transition hover:bg-neutral-50"
          >
            <span className="font-medium">Create post</span>
            <span className="text-neutral-400">→</span>
          </Link>

          <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3">
            <h2 className="text-sm font-medium text-neutral-800">Events</h2>
            {loading ? (
              <p className="mt-2 text-sm text-neutral-500">Loading…</p>
            ) : plans.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-500">No events yet. Create a post above.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {plans.map((p) => (
                  <EventCard
                    key={p.plan_id}
                    plan={p}
                    formatEventDate={formatEventDate}
                    formatEventTime={formatEventTime}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
