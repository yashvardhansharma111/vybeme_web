'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getWebUser, getCurrentUserProfile, getTicketsByUser } from '@/lib/api';

export function AppHeader() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<ReturnType<typeof getWebUser>>(null);
  const [profile, setProfile] = useState<{ name?: string; profile_image?: string | null; is_business?: boolean } | null>(null);
  const [tickets, setTickets] = useState<Array<{ ticket_id: string; ticket_number: string; plan: { plan_id: string; title?: string } | null }>>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    setUser(getWebUser());
  }, []);

  const loadProfileAndTickets = useCallback(async () => {
    if (!user?.user_id || !user?.session_id) return;
    try {
      const [profileRes, ticketsRes] = await Promise.all([
        getCurrentUserProfile(user.session_id),
        getTicketsByUser(user.user_id).catch(() => ({ success: false, data: { tickets: [] } })),
      ]);
      if (profileRes) setProfile({ name: profileRes.name, profile_image: profileRes.profile_image, is_business: !!profileRes.is_business });
      if (ticketsRes.success && ticketsRes.data?.tickets) setTickets(ticketsRes.data.tickets);
    } catch {
      // ignore
    }
  }, [user?.user_id, user?.session_id]);

  useEffect(() => {
    if (!mounted || !user) return;
    if (user.user_id) loadProfileAndTickets();
    else {
      setProfile(null);
      setTickets([]);
    }
  }, [mounted, user, loadProfileAndTickets]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const close = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [dropdownOpen]);

  const showLoggedIn = mounted && user?.user_id;

  return (
    <header className="flex h-14 items-center justify-between border-b border-neutral-100 bg-white px-4 md:px-6">
      <Link href="/" className="text-lg font-semibold text-neutral-900">
        vybeme.
      </Link>

      {showLoggedIn ? (
        <div className="flex items-center gap-4">
          {profile?.is_business && (
            <Link href="/business" className="text-sm font-medium text-neutral-600 hover:text-neutral-900">
              Business
            </Link>
          )}
          <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-neutral-200 bg-neutral-100 ring-2 ring-transparent transition hover:ring-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            aria-label="Profile and tickets"
          >
            {profile?.profile_image ? (
              <Image src={profile.profile_image} alt="" width={36} height={36} className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-semibold text-neutral-500">
                {profile?.name?.charAt(0) ?? user.user_id?.charAt(0) ?? '?'}
              </span>
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg">
              <div className="border-b border-neutral-100 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">My Tickets</p>
                <p className="mt-0.5 text-sm text-neutral-600">
                  {tickets.length === 0 ? 'No tickets yet' : `${tickets.length} ticket${tickets.length === 1 ? '' : 's'}`}
                </p>
              </div>
              <div className="max-h-64 overflow-y-auto py-2">
                {tickets.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-neutral-500">Register for an event to see your tickets here.</p>
                ) : (
                  tickets.map((t) => (
                    <Link
                      key={t.ticket_id}
                      href={`/post/${t.plan?.plan_id ?? ''}/ticket`}
                      onClick={() => setDropdownOpen(false)}
                      className="block border-b border-neutral-50 px-4 py-3 last:border-0 hover:bg-neutral-50"
                    >
                      <p className="truncate text-sm font-medium text-neutral-900">{t.plan?.title ?? 'Event'}</p>
                      <p className="text-xs text-neutral-500">Ticket #{t.ticket_number}</p>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}
          </div>
        </div>
      ) : (
        <a
          href="#"
          className="rounded-full bg-neutral-800 px-4 py-2 text-sm font-medium text-white no-underline transition-opacity hover:opacity-90"
        >
          Download App
        </a>
      )}
    </header>
  );
}
