'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { getWebUser, getCurrentUserProfile, getUserPlans } from '@/lib/api';

interface Plan {
  plan_id: string;
  title?: string;
  type?: string;
  plan_type?: string;
  post_status?: string;
  date?: string;
  is_repost?: boolean;
}

export default function BusinessPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<ReturnType<typeof getWebUser>>(null);
  const [profile, setProfile] = useState<{ is_business?: boolean } | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    setUser(getWebUser());
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
    if (!profile.is_business) router.replace('/');
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

          <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3">
            <p className="text-sm font-medium text-neutral-800">Create event</p>
            <p className="mt-0.5 text-xs text-neutral-500">Create a new event in the vybeme app.</p>
            <a href="#" className="mt-2 inline-block text-xs font-medium text-blue-600 hover:underline">
              Open app
            </a>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3">
            <h2 className="text-sm font-medium text-neutral-800">Your events</h2>
            {loading ? (
              <p className="mt-2 text-sm text-neutral-500">Loading…</p>
            ) : plans.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-500">No events yet. Create one in the app.</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {plans.map((p) => (
                  <li key={p.plan_id}>
                    <Link
                      href={`/business/attendees/${p.plan_id}`}
                      className="flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-neutral-50"
                    >
                      <span className="truncate font-medium text-neutral-900">{p.title ?? 'Event'}</span>
                      <span className="text-neutral-400">Attendees →</span>
                    </Link>
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
