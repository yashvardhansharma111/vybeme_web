'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getWebUser, getCurrentUserProfile, getTicketsByUser, setWebUser } from '@/lib/api';

export function AppHeader() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<ReturnType<typeof getWebUser>>(null);
  const [profile, setProfile] = useState<{ name?: string; profile_image?: string | null; is_business?: boolean } | null>(null);
  const [tickets, setTickets] = useState<Array<{ ticket_id: string; ticket_number: string; plan: { plan_id: string; title?: string } | null }>>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = useCallback(() => {
    setDropdownOpen(false);
    setWebUser(null);
    router.replace('/login');
  }, [router]);

  useEffect(() => {
    setMounted(true);
    const stored = getWebUser();
    setUser(stored);
    if (process.env.NODE_ENV === 'development') {
      console.log('[AppHeader] mounted, user from storage:', stored ? { user_id: stored.user_id } : null);
    }
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
      <Link href="/" className="text-lg font-semibold text-neutral-900 no-underline">
        weknd.
      </Link>

      {showLoggedIn ? (
        <div className="flex items-center gap-4">
          {profile?.is_business && (
            <Link href="/clubs" className="text-sm font-medium text-neutral-600 hover:text-neutral-900">
              {profile?.name ?? 'Clubs'}
            </Link>
          )}
          <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white pl-3 pr-1 py-1 ring-2 ring-transparent transition hover:ring-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            aria-label="Profile and tickets"
          >
            
            <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-neutral-100">
              {profile?.profile_image ? (
                <Image src={profile.profile_image} alt="" width={32} height={32} className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-semibold text-neutral-500">
                  {profile?.name?.charAt(0) ?? user.user_id?.charAt(0) ?? '?'}
                </span>
              )}
            </span>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg py-2">
              <Link
                href="/tickets"
                onClick={() => setDropdownOpen(false)}
                className="block px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                My Tickets
              </Link>
              {profile?.is_business && (
                <Link
                  href="/clubs"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Business Portal
                </Link>
              )}
              {user?.user_id && (
                <Link
                  href={`/profile/${user.user_id}`}
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Profile
                </Link>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="w-full px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Logout
              </button>
            </div>
          )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
