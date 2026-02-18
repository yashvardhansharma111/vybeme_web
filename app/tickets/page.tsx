'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { getWebUser, getCurrentUserProfile, getTicketsByUser, setWebUser } from '@/lib/api';

export default function TicketsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<ReturnType<typeof getWebUser>>(null);
  const [profile, setProfile] = useState<{ name?: string; profile_image?: string | null } | null>(null);
  const [tickets, setTickets] = useState<Array<{ ticket_id: string; ticket_number: string; plan: { plan_id: string; title?: string } | null }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    const stored = getWebUser();
    setUser(stored);
  }, []);

  const loadData = useCallback(async () => {
    if (!user?.user_id || !user?.session_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [profileRes, ticketsRes] = await Promise.all([
        getCurrentUserProfile(user.session_id),
        getTicketsByUser(user.user_id).catch(() => ({ success: false, data: { tickets: [] } })),
      ]);
      if (profileRes) setProfile({ name: profileRes.name, profile_image: profileRes.profile_image });
      if (ticketsRes.success && ticketsRes.data?.tickets) setTickets(ticketsRes.data.tickets);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user?.user_id, user?.session_id]);

  useEffect(() => {
    if (!mounted) return;
    if (!user?.user_id) {
      router.replace(`/login?redirect=${encodeURIComponent('/tickets')}`);
      return;
    }
    loadData();
  }, [mounted, user?.user_id, router, loadData]);

  const handleLogout = useCallback(() => {
    setWebUser(null);
    router.replace('/login');
  }, [router]);

  if (!mounted || !user?.user_id) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-100/80 to-neutral-900 flex items-center justify-center">
        <p className="text-neutral-500">Redirecting…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-100/80 to-neutral-900 md:bg-neutral-100">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4 md:px-6">
        <Link href="/" className="text-lg font-bold text-neutral-900 no-underline">
          vybeme.
        </Link>
        <div className="flex items-center gap-3">
          {profile?.profile_image ? (
            <Image src={profile.profile_image} alt="" width={32} height={32} className="rounded-full object-cover" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200 text-sm font-semibold text-neutral-600">
              {profile?.name?.charAt(0) ?? user.user_id?.charAt(0) ?? '?'}
            </span>
          )}
          <span className="text-sm font-medium text-neutral-700">{profile?.name ?? 'My tickets'}</span>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-6">
        <h1 className="text-xl font-bold text-neutral-900">My tickets</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {tickets.length === 0 ? 'No tickets yet' : `${tickets.length} ticket${tickets.length === 1 ? '' : 's'}`}
        </p>

        {loading ? (
          <div className="mt-8 flex justify-center">
            <p className="text-neutral-500">Loading…</p>
          </div>
        ) : tickets.length === 0 ? (
          <p className="mt-8 text-center text-sm text-neutral-500">Register for an event to see your tickets here.</p>
        ) : (
          <ul className="mt-6 space-y-2">
            {tickets.map((t) => (
              <li key={t.ticket_id}>
                <Link
                  href={`/post/${t.plan?.plan_id ?? ''}/ticket`}
                  className="block rounded-xl border border-neutral-200 bg-white px-4 py-4 shadow-sm transition hover:bg-neutral-50"
                >
                  <p className="truncate font-medium text-neutral-900">{t.plan?.title ?? 'Event'}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">Ticket #{t.ticket_number}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8 flex flex-col gap-2">
          {user?.user_id && (
            <Link
              href={`/profile/${user.user_id}`}
              className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-center text-sm font-medium text-neutral-700 no-underline hover:bg-neutral-50"
            >
              Profile
            </Link>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl border border-transparent bg-white px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Logout
          </button>
        </div>
      </main>
    </div>
  );
}
