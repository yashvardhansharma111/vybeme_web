'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { IoChevronBack } from 'react-icons/io5';
import { getWebUser, getCurrentUserProfile, getTicketsByUser, setWebUser } from '@/lib/api';
import { WekndLoadingScreen } from '@/app/components/WekndLoadingScreen';

export default function TicketsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<ReturnType<typeof getWebUser>>(null);
  const [profile, setProfile] = useState<{ name?: string; profile_image?: string | null } | null>(null);
  const [tickets, setTickets] = useState<Array<{
    ticket_id: string;
    ticket_number: string;
    plan: {
      plan_id: string;
      title?: string;
      date?: string;
      time?: string;
      media?: Array<{ url?: string; type?: string }>;
      image?: string | null;
    } | null;
  }>>([]);
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

  const formatDateTime = (date?: string, time?: string) => {
    const dateStr = date ? new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    const timeStr = (time || '').trim();
    if (dateStr && timeStr) return `${dateStr} | ${timeStr}`;
    return dateStr || timeStr || '—';
  };

  const formatDateOrdinal = (date?: string, time?: string) => {
    if (!date) return formatDateTime(date, time);
    try {
      const d = new Date(date);
      const day = d.getDate();
      const ord =
        day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
      const monthYear = d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      const datePart = `${day}${ord} ${monthYear}`;
      const timeStr = (time || '').trim();
      if (timeStr) return `${datePart} | ${timeStr} onwards`;
      return datePart;
    } catch {
      return formatDateTime(date, time);
    }
  };

  if (!mounted) {
    return <WekndLoadingScreen />;
  }
  if (!user?.user_id) {
    return <WekndLoadingScreen />;
  }

  /** Title + back — above the weknd. / profile bar */
  const pageHeader = (
    <div className="border-b border-neutral-200/80 bg-white px-3 pb-3 pt-[max(10px,env(safe-area-inset-top))]">
      <div className="mx-auto flex max-w-md items-center gap-1 md:max-w-none">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ECECEC] text-neutral-800 transition-colors hover:bg-[#E0E0E0] active:bg-[#D8D8D8]"
          aria-label="Go back"
        >
          <IoChevronBack className="h-6 w-6" />
        </button>
        <h1 className="min-w-0 flex-1 pl-1 text-xl font-bold tracking-tight text-neutral-900 md:text-2xl">
          Tickets and Passes
        </h1>
      </div>
    </div>
  );

  const brandBar = (
    <header className="flex h-14 shrink-0 items-center justify-between border-t border-neutral-100 bg-white px-4 md:px-6">
      <Link href="/" className="text-lg font-bold text-neutral-900 no-underline">
        weknd.
      </Link>
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-neutral-200">
          {profile?.profile_image ? (
            <Image src={profile.profile_image} alt="" width={36} height={36} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-neutral-600">
              {profile?.name?.charAt(0) ?? user.user_id?.charAt(0) ?? '?'}
            </span>
          )}
        </div>
        <span className="hidden max-w-[140px] truncate text-sm font-medium text-neutral-700 sm:inline">
          {profile?.name ?? 'Account'}
        </span>
      </div>
    </header>
  );

  const stackedHeader = (
    <div className="sticky top-0 z-20 bg-white shadow-[0_1px_0_rgba(0,0,0,0.06)]">
      {pageHeader}
      {brandBar}
    </div>
  );

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#F7F7F8] via-[#EBEBED] to-[#F2F2F4] md:bg-neutral-100">
        {stackedHeader}
        <WekndLoadingScreen className="min-h-0 w-full flex-1" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F7F7F8] via-[#EBEBED] to-[#F2F2F4] md:bg-neutral-100">
      {stackedHeader}

      <main className="mx-auto max-w-md px-5 py-5 md:max-w-lg">
        <p className="text-sm text-neutral-600">
          {tickets.length === 0 ? 'No tickets yet' : `${tickets.length} ticket${tickets.length === 1 ? '' : 's'}`}
        </p>

        {tickets.length === 0 ? (
          <p className="mt-8 text-center text-sm text-neutral-500">Register for an event to see your tickets here.</p>
        ) : (
          <ul className="mt-5 space-y-3.5">
            {tickets.map((t) => (
              <li key={t.ticket_id}>
                <Link
                  href={`/post/${t.plan?.plan_id ?? ''}/ticket?from=tickets`}
                  className="block rounded-[18px] bg-white p-3.5 shadow-[0_4px_12px_rgba(0,0,0,0.08)] no-underline transition hover:bg-neutral-50/90"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[14px] bg-neutral-200">
                      {t.plan?.media?.[0]?.url || t.plan?.image ? (
                        <img
                          src={(t.plan?.media?.[0]?.url || t.plan?.image) as string}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-neutral-400">—</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[17px] font-bold leading-tight text-black">{t.plan?.title ?? 'Event'}</p>
                      <p className="mt-1 text-sm leading-snug text-[#6B7280]">{formatDateOrdinal(t.plan?.date, t.plan?.time)}</p>
                    </div>
                    <span className="shrink-0 text-xl text-[#AEAEB2]" aria-hidden>
                      ›
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-10 flex flex-col gap-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {user?.user_id && (
            <Link
              href={`/profile/${user.user_id}`}
              className="rounded-xl border border-neutral-200/80 bg-white px-4 py-3 text-center text-sm font-medium text-neutral-700 no-underline shadow-sm hover:bg-neutral-50"
            >
              Profile
            </Link>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl border border-transparent bg-white px-4 py-3 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50"
          >
            Logout
          </button>
        </div>
      </main>
    </div>
  );
}
