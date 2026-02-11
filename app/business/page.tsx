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
  const user = getWebUser();
  const [profile, setProfile] = useState<{ is_business?: boolean } | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

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
    if (!user?.user_id) {
      router.replace('/login');
      return;
    }
    load();
  }, [user?.user_id, router, load]);

  useEffect(() => {
    if (!loading && profile && !profile.is_business) {
      router.replace('/');
    }
  }, [loading, profile, router]);

  if (!user?.user_id || (!loading && profile && !profile.is_business)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold text-neutral-900">Business</h1>
        <p className="mt-1 text-sm text-neutral-500">Manage events, scan tickets, and view attendees.</p>

        <div className="mt-8 flex flex-col gap-4">
          <Link
            href="/business/scan"
            className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-5 py-4 shadow-sm transition hover:border-neutral-300 hover:shadow"
          >
            <span className="font-medium text-neutral-900">Scan tickets</span>
            <span className="text-neutral-400">→</span>
          </Link>

          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-neutral-700">Create event / post</p>
            <p className="mt-1 text-xs text-neutral-500">Use the vybeme app to create a new business post or event.</p>
            <a
              href="#"
              className="mt-3 inline-block text-sm font-medium text-blue-600 hover:underline"
            >
              Open in app
            </a>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-neutral-800">Your events</h2>
            {loading ? (
              <p className="mt-3 text-sm text-neutral-500">Loading…</p>
            ) : plans.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-500">No business events yet. Create one in the app.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {plans.map((p) => (
                  <li key={p.plan_id}>
                    <Link
                      href={`/business/attendees/${p.plan_id}`}
                      className="flex items-center justify-between rounded-lg border border-neutral-100 px-3 py-2 hover:bg-neutral-50"
                    >
                      <span className="truncate text-sm font-medium text-neutral-900">{p.title ?? 'Event'}</span>
                      <span className="text-xs text-neutral-500">Attendees →</span>
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
