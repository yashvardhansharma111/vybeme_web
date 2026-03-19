'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AppHeader } from '@/app/components/AppHeader';
import { ShareMenu } from '@/app/components/ShareMenu';
import { getWebUser, getCurrentUserProfile, getUserPlans, getRegistrations, updateProfile, updateBusinessPlan } from '@/lib/api';
import { WekndLoadingScreen } from '@/app/components/WekndLoadingScreen';

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

/** Equal-width action pills: flex-1 basis-0 so every pill matches row width */
const pillBase =
  'flex h-9 min-w-0 flex-1 basis-0 items-center justify-center gap-1 rounded-full px-1 text-[11px] font-medium leading-tight sm:text-xs';
const pillPrimary = `${pillBase} bg-neutral-800 text-white hover:bg-neutral-700`;
const pillOutline = `${pillBase} border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50`;
const pillDanger = `${pillBase} border border-red-200 bg-white text-red-600 hover:bg-red-50`;

function IconRegistration({ className }: { className?: string }) {
  return (
    <svg className={className} width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
}
function IconPencil({ className }: { className?: string }) {
  return (
    <svg className={className} width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}
function IconDuplicate({ className }: { className?: string }) {
  return (
    <svg className={className} width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}
function IconShare({ className }: { className?: string }) {
  return (
    <svg className={className} width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  );
}
function IconTrash({ className }: { className?: string }) {
  return (
    <svg className={className} width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}
function IconScan({ className }: { className?: string }) {
  return (
    <svg className={className} width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
    </svg>
  );
}

function EventCard({
  plan: p,
  formatEventDate,
  formatEventTime,
  onCancelEvent,
}: {
  plan: PlanWithCount;
  formatEventDate: (date: string | undefined) => string;
  formatEventTime: (time: string | undefined) => string;
  onCancelEvent: (plan: PlanWithCount) => void;
}) {
  return (
    <li className="rounded-lg border border-neutral-200 bg-white p-3 shadow-sm">
      <div className="flex gap-3">
        <Link
          href={`/post/${p.plan_id}`}
          className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-neutral-200 md:h-24 md:w-24"
        >
          {p.media?.[0]?.url ? (
            <img src={p.media[0].url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-neutral-400 text-xs">No image</div>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-medium text-neutral-900">{p.title ?? 'Event'}</h3>
              <p className="mt-1 text-xs text-neutral-500">
                {formatEventDate(p.date)}
                {p.time?.trim() ? ` ${formatEventTime(p.time)}` : ''}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1 text-right">
              <span className="text-xs text-neutral-500">
                {typeof p.registrationCount === 'number' ? `${p.registrationCount} registered` : '…'}
              </span>
              <Link
                href={`/clubs/scan?plan=${p.plan_id}`}
                className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-semibold text-neutral-800 hover:bg-neutral-100"
              >
                <IconScan className="shrink-0" />
                Scan
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex w-full flex-wrap gap-2 sm:flex-nowrap">
        <Link href={`/clubs/registration/${p.plan_id}`} className={`${pillPrimary} no-underline`}>
          <IconRegistration className="shrink-0 text-white" />
          <span className="truncate">Registration</span>
        </Link>
        <Link href={`/clubs/plan/${p.plan_id}/edit`} className={`${pillOutline} no-underline`}>
          <IconPencil className="shrink-0" />
          <span className="truncate">Edit</span>
        </Link>
        <Link href={`/clubs/create?duplicate=${p.plan_id}`} className={`${pillOutline} no-underline`}>
          <IconDuplicate className="shrink-0" />
          <span className="truncate">Duplicate</span>
        </Link>
        <ShareMenu postId={p.plan_id} title={p.title ?? 'Event'} className="flex min-w-0 flex-1 basis-0">
          <button type="button" className={`${pillOutline} w-full`}>
            <IconShare className="shrink-0" />
            <span className="truncate">Share</span>
          </button>
        </ShareMenu>
        <button type="button" onClick={() => onCancelEvent(p)} className={pillDanger}>
          <IconTrash className="shrink-0" />
          <span className="truncate">Cancel Event</span>
        </button>
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
  const [cancelingPlanId, setCancelingPlanId] = useState<string | null>(null);
  const [confirmCancelPlan, setConfirmCancelPlan] = useState<PlanWithCount | null>(null);

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

  const handleCancelConfirmed = useCallback(async () => {
    if (!confirmCancelPlan?.plan_id) return;
    setCancelingPlanId(confirmCancelPlan.plan_id);
    try {
      const res = await updateBusinessPlan(confirmCancelPlan.plan_id, { post_status: 'deleted' });
      if (res?.success) {
        setPlans((prev) => prev.filter((p) => p.plan_id !== confirmCancelPlan.plan_id));
      }
    } catch (err) {
      console.warn('[business] cancel event failed', err);
    } finally {
      setCancelingPlanId(null);
      setConfirmCancelPlan(null);
    }
  }, [confirmCancelPlan]);

  if (!mounted) {
    return <WekndLoadingScreen />;
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
              <WekndLoadingScreen className="mt-2 min-h-[200px] rounded-xl" />
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
                    onCancelEvent={setConfirmCancelPlan}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
        )}
      </div>
      {confirmCancelPlan ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <p className="text-base font-semibold text-neutral-900">Cancel Event</p>
            <p className="mt-2 text-sm text-neutral-600">
              the event will be cancelled and the collected amount will be refunded to the registrants
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmCancelPlan(null)}
                className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Keep Event
              </button>
              <button
                type="button"
                onClick={handleCancelConfirmed}
                disabled={cancelingPlanId === confirmCancelPlan.plan_id}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {cancelingPlanId === confirmCancelPlan.plan_id ? 'Cancelling…' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
