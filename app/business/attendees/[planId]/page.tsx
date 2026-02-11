'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredAttendees = useMemo(() => {
    if (!searchQuery.trim()) return attendees;
    const q = searchQuery.toLowerCase().trim();
    return attendees.filter(
      (a) =>
        a.user?.name?.toLowerCase().includes(q) ||
        a.ticket_number?.toLowerCase().includes(q)
    );
  }, [attendees, searchQuery]);

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
    <div className="min-h-screen bg-[#F2F2F7]">
      {/* Gradient header like app */}
      <div
        className="h-36 w-full shrink-0 rounded-b-3xl"
        style={{
          background: 'linear-gradient(180deg, #4A3B69 0%, #6B5B8E 45%, #F2F2F7 100%)',
        }}
      />
      <div className="relative -mt-28 mx-auto max-w-xl px-4 pb-8">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/business" className="flex h-10 items-center gap-1 text-white">
            <span className="text-lg">←</span>
            <span className="font-medium">Back</span>
          </Link>
          <h1 className="text-lg font-bold text-white">Attendee List</h1>
          <div className="w-14" />
        </div>

        {/* Search bar */}
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm">
          <span className="text-neutral-400">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search"
            className="flex-1 bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
          />
        </div>

        {/* Stats */}
        {stats != null && (
          <p className="mb-4 text-sm font-semibold text-neutral-800">
            Checked In: {stats.checked_in}/{stats.total}
          </p>
        )}

        {/* List */}
        {loading ? (
          <p className="text-sm text-neutral-500">Loading…</p>
        ) : filteredAttendees.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-neutral-500">{searchQuery ? 'No attendees match your search' : 'No attendees yet'}</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filteredAttendees.map((a) => (
              <li
                key={a.registration_id}
                className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {a.user?.profile_image ? (
                    <Image
                      src={a.user.profile_image}
                      alt=""
                      width={48}
                      height={48}
                      className="h-12 w-12 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-sm font-semibold text-neutral-500">
                      {a.user?.name?.charAt(0) ?? '?'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-neutral-900">{a.user?.name ?? 'Guest'}</p>
                    {a.ticket_number && (
                      <p className="text-xs text-neutral-500">Ticket: {a.ticket_number}</p>
                    )}
                    {a.checked_in && a.checked_in_via === 'manual' && (
                      <p className="text-xs italic text-neutral-400">checked manually</p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {a.checked_in ? (
                    <>
                      <span className="text-green-600">✓</span>
                      <button
                        type="button"
                        disabled={actionId === a.registration_id}
                        onClick={() => handleCheckIn(a.registration_id, 'checkout')}
                        className="rounded-full bg-[#F2F2F7] px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-200 disabled:opacity-50"
                      >
                        {actionId === a.registration_id ? '…' : 'Uncheck'}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={actionId === a.registration_id}
                      onClick={() => handleCheckIn(a.registration_id, 'checkin')}
                      className="rounded-full bg-neutral-800 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50"
                    >
                      {actionId === a.registration_id ? '…' : 'Check In'}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex gap-4">
          <Link href="/business/scan" className="text-sm font-medium text-blue-600 hover:underline">
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
