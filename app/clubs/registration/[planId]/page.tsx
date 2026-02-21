'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getWebUser, getCurrentUserProfile, getAttendeeList } from '@/lib/api';

interface Attendee {
  registration_id: string;
  user_id: string;
  user: { user_id: string; name: string; profile_image?: string | null } | null;
  ticket_number: string | null;
  checkin_code?: string | null;
  status: string;
  checked_in: boolean;
  checked_in_at: string | null;
  checked_in_via?: 'qr' | 'manual' | null;
  created_at: string;
  age_range?: string | null;
  gender?: string | null;
  running_experience?: string | null;
  what_brings_you?: string | null;
}

export default function BusinessRegistrationPage() {
  const params = useParams();
  const router = useRouter();
  const planId = (params?.planId as string) || '';
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<ReturnType<typeof getWebUser>>(null);
  const [profile, setProfile] = useState<{ is_business?: boolean } | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [stats, setStats] = useState<{ total: number; checked_in: number; pending: number } | null>(null);
  const [loading, setLoading] = useState(true);
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
      router.replace('/clubs');
      return;
    }
    load();
  }, [mounted, user?.user_id, planId, router, load]);

  useEffect(() => {
    if (!mounted || loading || !profile) return;
    if (!profile.is_business) router.replace('/');
  }, [mounted, loading, profile, router]);

  const handleDownloadAll = useCallback(() => {
    const escape = (v: string | null | undefined) => {
      const s = String(v ?? '').replace(/\r?\n/g, ' ').replace(/"/g, '""');
      return `"${s}"`;
    };
    const headers = ['Name', 'Gender', 'Age range', 'Running experience', 'What brings you', 'Ticket number', 'Checkin code', 'Checked in', 'Registered at'];
    const rows = attendees.map((a) => [
      escape(a.user?.name ?? 'Guest'),
      escape(a.gender ?? null),
      escape(a.age_range ?? null),
      escape(a.running_experience ?? null),
      escape(a.what_brings_you ?? null),
      escape(a.ticket_number ?? null),
      escape(a.checkin_code ?? null),
      escape(a.checked_in ? (a.checked_in_at ?? 'Yes') : 'No'),
      escape(a.created_at ? new Date(a.created_at).toISOString() : null),
    ]);
    const csvBody = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvBody], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `registration-${planId}-${new Date().toISOString().slice(0, 10)}.csv`);
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }, [attendees, planId]);

  const filteredAttendees = useMemo(() => {
    if (!searchQuery.trim()) return attendees;
    const q = searchQuery.toLowerCase().trim();
    return attendees.filter(
      (a) =>
        a.user?.name?.toLowerCase().includes(q) ||
        a.gender?.toLowerCase().includes(q) ||
        a.ticket_number?.toLowerCase().includes(q)
    );
  }, [attendees, searchQuery]);

  const genderCounts = useMemo(() => {
    let men = 0;
    let women = 0;
    attendees.forEach((a) => {
      const g = (a.gender ?? '').trim().toLowerCase();
      if (g === 'male') men += 1;
      else if (g === 'female') women += 1;
    });
    return { men, women, total: attendees.length };
  }, [attendees]);

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
          <Link href="/clubs" className="flex h-10 items-center gap-1 text-white">
            <span className="text-lg">←</span>
            <span className="font-medium">Back</span>
          </Link>
          <h1 className="text-lg font-bold text-white">Registered user</h1>
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

        {/* Stats + Download */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {stats != null && (
            <div className="flex flex-col">
              <p className="text-sm font-semibold text-neutral-800">
                Total: {stats.total} attendee{stats.total !== 1 ? 's' : ''}
              </p>
              <p className="text-xs font-medium text-neutral-500">
                Men: {genderCounts.men} / {genderCounts.total} 
                {' '}Women: {genderCounts.women} / {genderCounts.total}
              </p>
            </div>
          )}
          {filteredAttendees.length > 0 && (
            <button
              type="button"
              onClick={handleDownloadAll}
              className="rounded-xl bg-[#1C1C1E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              Download all user data
            </button>
          )}
        </div>

        {/* List – no check-in toggle */}
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
                className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm"
              >
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
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-neutral-900">{a.user?.name ?? 'Guest'}</p>
                  <p className="text-sm text-neutral-500">{a.gender ?? '—'}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex gap-4">
          <Link href={`/clubs/scan?plan=${planId}`} className="text-sm font-medium text-blue-600 hover:underline">
            Scan tickets
          </Link>
          <Link href="/clubs" className="text-sm text-neutral-500 hover:underline">
            All events
          </Link>
        </div>
      </div>
    </div>
  );
}
