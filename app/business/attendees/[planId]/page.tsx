'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { getWebUser, getCurrentUserProfile, getAttendeeList, manualCheckIn } from '@/lib/api';

interface Attendee {
  registration_id: string;
  user_id: string;
  user: { user_id: string; name: string; profile_image?: string | null } | null;
  ticket_number: string | null;
  status: string;
  checked_in: boolean;
  checked_in_at: string | null;
  checked_in_via?: 'qr' | 'manual' | null;
  created_at: string;
}

export default function BusinessAttendeesPage() {
  const params = useParams();
  const router = useRouter();
  const planId = (params?.planId as string) || '';
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<ReturnType<typeof getWebUser>>(null);
  const [profile, setProfile] = useState<{ is_business?: boolean } | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [stats, setStats] = useState<{ total: number; checked_in: number; pending: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.user_id || !planId) return;
    try {
      setLoading(true);
      const [profileRes, listRes] = await Promise.all([
        getCurrentUserProfile(user.session_id),
        getAttendeeList(planId, user.user_id).catch(() => ({ success: false, data: null })),
      ]);
      if (profileRes) setProfile({ is_business: !!profileRes.is_business });
      if (listRes.success && listRes.data) {
        setAttendees(listRes.data.attendees ?? []);
        setStats(listRes.data.statistics ?? null);
      } else {
        setAttendees([]);
        setStats(null);
      }
    } catch {
      setAttendees([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [user?.user_id, user?.session_id, planId]);

  useEffect(() => {
    setMounted(true);
    setUser(getWebUser());
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!user?.user_id) {
      router.replace('/login');
      return;
    }
    if (!planId) {
      router.replace('/business');
      return;
    }
    load();
  }, [mounted, user?.user_id, planId, router, load]);

  useEffect(() => {
    if (!mounted || loading || !profile) return;
    if (!profile.is_business) router.replace('/');
  }, [mounted, loading, profile, router]);

  const handleCheckIn = useCallback(
    async (registration_id: string, action: 'checkin' | 'checkout') => {
      if (!user?.user_id) return;
      setActionId(registration_id);
      try {
        await manualCheckIn(registration_id, user.user_id, action);
        await load();
      } catch {
        // keep list as is
      } finally {
        setActionId(null);
      }
    },
    [user?.user_id, load]
  );

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700" />
      </div>
    );
  }
  if (!user?.user_id || !planId) return null;
  if (!loading && profile && !profile.is_business) return null;

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-xl px-4 py-6">
        <div className="flex items-center gap-3">
          <Link href="/business" className="text-sm text-neutral-500 hover:text-neutral-700">
            ← Back
          </Link>
          <h1 className="text-lg font-semibold text-neutral-900">Attendees</h1>
        </div>

        {stats != null && (
          <div className="mt-4 flex gap-4 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm">
            <span className="text-neutral-600">Total <strong>{stats.total}</strong></span>
            <span className="text-green-600">In <strong>{stats.checked_in}</strong></span>
            <span className="text-neutral-500">Pending <strong>{stats.pending}</strong></span>
          </div>
        )}

        {loading ? (
          <p className="mt-4 text-sm text-neutral-500">Loading…</p>
        ) : attendees.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">No attendees yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {attendees.map((a) => (
              <li
                key={a.registration_id}
                className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {a.user?.profile_image ? (
                    <Image
                      src={a.user.profile_image}
                      alt=""
                      width={36}
                      height={36}
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-medium text-neutral-500">
                      {a.user?.name?.charAt(0) ?? '?'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium text-neutral-900">{a.user?.name ?? 'Guest'}</p>
                    <p className="text-xs text-neutral-500">
                      {a.checked_in ? `In (${a.checked_in_via ?? '—'})` : 'Not in'}
                    </p>
                  </div>
                </div>
                <div className="shrink-0">
                  {a.checked_in ? (
                    <button
                      type="button"
                      disabled={actionId === a.registration_id}
                      onClick={() => handleCheckIn(a.registration_id, 'checkout')}
                      className="rounded-md border border-neutral-200 px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
                    >
                      {actionId === a.registration_id ? '…' : 'Out'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={actionId === a.registration_id}
                      onClick={() => handleCheckIn(a.registration_id, 'checkin')}
                      className="rounded-md bg-neutral-800 px-2 py-1 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
                    >
                      {actionId === a.registration_id ? '…' : 'In'}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex gap-4">
          <Link href="/business/scan" className="text-sm text-blue-600 hover:underline">
            Scan tickets
          </Link>
          <Link href="/business" className="text-sm text-neutral-500 hover:underline">
            All events
          </Link>
        </div>
      </div>
    </div>
  );
}
