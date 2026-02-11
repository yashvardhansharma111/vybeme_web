'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { getWebUser, getCurrentUserProfile, getUserPlans, getRegistrations } from '@/lib/api';

interface Plan {
  plan_id: string;
  title?: string;
  type?: string;
  plan_type?: string;
  post_status?: string;
  date?: string;
  is_repost?: boolean;
}

interface PlanWithCount extends Plan {
  registrationCount?: number;
}

export default function BusinessPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<ReturnType<typeof getWebUser>>(null);
  const [profile, setProfile] = useState<{ is_business?: boolean } | null>(null);
  const [plans, setPlans] = useState<PlanWithCount[]>([]);
  const [loading, setLoading] = useState(true);

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
      const [profileRes, plansRes] = await Promise.all([
        getCurrentUserProfile(user.session_id),
        getUserPlans(user.user_id, 50, 0).catch(() => ({ success: false, data: [] })),
      ]);
      if (profileRes) setProfile({ is_business: !!profileRes.is_business });
      const raw = plansRes.success && Array.isArray(plansRes.data) ? plansRes.data : [];
      const businessPlans = raw.filter(
        (p: Plan) =>
          (p?.type === 'business' || p?.plan_type === 'BusinessPlan') && p?.post_status !== 'deleted' && !p?.is_repost
      );
      setPlans(businessPlans);
      // Fetch registration counts in parallel
      Promise.all(
        businessPlans.slice(0, 30).map(async (p: Plan) => {
          try {
            const reg = await getRegistrations(p.plan_id);
            return reg.success && reg.data ? reg.data.total_registrations : 0;
          } catch {
            return 0;
          }
        })
      ).then((counts) => {
        setPlans((prev) =>
          prev.map((p, i) => ({ ...p, registrationCount: counts[i] ?? 0 }))
        );
      });
    } catch {
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

  useEffect(() => {
    if (!mounted || loading || !profile) return;
    if (!profile.is_business) {
      if (process.env.NODE_ENV === 'development') console.log('[business] redirecting to / (profile.is_business=false)');
      router.replace('/');
    }
  }, [mounted, loading, profile, router]);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700" />
      </div>
    );
  }
  if (!user?.user_id) return null;
  if (!loading && profile && !profile.is_business) return null;

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-xl px-4 py-8">
        <h1 className="text-xl font-semibold text-neutral-900">Business</h1>
        <p className="mt-0.5 text-sm text-neutral-500">Scan tickets and manage attendees.</p>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/business/scan"
            className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3 text-neutral-900 transition hover:bg-neutral-50"
          >
            <span className="font-medium">Scan tickets</span>
            <span className="text-neutral-400">→</span>
          </Link>

          <Link
            href="/business/create"
            className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3 text-neutral-900 transition hover:bg-neutral-50"
          >
            <span className="font-medium">Create post</span>
            <span className="text-neutral-400">→</span>
          </Link>

          <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3">
            <h2 className="text-sm font-medium text-neutral-800">My plans</h2>
            {loading ? (
              <p className="mt-2 text-sm text-neutral-500">Loading…</p>
            ) : plans.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-500">No events yet. Create a post above.</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {plans.map((p) => (
                  <li key={p.plan_id} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-neutral-50">
                      <span className="truncate font-medium text-neutral-900">{p.title ?? 'Event'}</span>
                      {typeof p.registrationCount === 'number' && (
                        <span className="text-xs text-neutral-500">{p.registrationCount} registered</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 px-2 pb-2">
                      <Link
                        href={`/business/attendees/${p.plan_id}`}
                        className="text-xs font-medium text-blue-600 hover:underline"
                      >
                        Attendees
                      </Link>
                      <Link
                        href={`/business/plan/${p.plan_id}/edit`}
                        className="text-xs font-medium text-neutral-600 hover:underline"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/business/scan?plan=${p.plan_id}`}
                        className="text-xs font-medium text-neutral-600 hover:underline"
                      >
                        Scan
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
