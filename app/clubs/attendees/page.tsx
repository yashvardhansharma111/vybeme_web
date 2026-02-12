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
  is_repost?: boolean;
}

export default function BusinessAttendeesIndexPage() {
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
    if (!mounted || !user?.user_id) return;
    load();
  }, [mounted, user?.user_id, load]);

  useEffect(() => {
    if (!mounted) return;
    if (!user?.user_id) {
      router.replace('/login');
      return;
    }
  }, [mounted, user?.user_id, router]);

  useEffect(() => {
    if (!mounted || loading || !profile) return;
    if (!profile.is_business) router.replace('/');
  }, [mounted, loading, profile, router]);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F2F2F7]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700" />
      </div>
    );
  }
  if (!user?.user_id) return null;
  if (!loading && profile && !profile.is_business) return null;

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <div
        className="h-32 w-full shrink-0 rounded-b-3xl"
        style={{ background: 'linear-gradient(180deg, #4A3B69 0%, #6B5B8E 50%, #F2F2F7 100%)' }}
      />
      <div className="relative -mt-24 mx-auto max-w-xl px-4 pb-8">
        <div className="mb-4 flex items-center gap-3">
          <Link href="/business" className="flex items-center gap-1 text-white">
            <span className="text-lg">←</span>
            <span className="font-medium">Back</span>
          </Link>
          <h1 className="text-lg font-bold text-white">Attendee list</h1>
          <div className="w-14" />
        </div>
        {loading ? (
          <p className="text-sm text-neutral-500">Loading events…</p>
        ) : plans.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="text-neutral-500">No business events yet.</p>
            <Link href="/business/create" className="mt-2 inline-block text-sm font-medium text-blue-600 hover:underline">
              Create a post
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {plans.map((p) => (
              <li key={p.plan_id}>
                <Link
                  href={`/business/attendees/${p.plan_id}`}
                  className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm transition active:bg-neutral-50"
                >
                  <span className="font-medium text-neutral-900">{p.title ?? 'Event'}</span>
                  <span className="text-neutral-400">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
