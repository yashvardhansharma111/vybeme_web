'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/app/components/AppHeader';
import { WekndLoadingScreen } from '@/app/components/WekndLoadingScreen';
import { getBlockedUsersWeb, getWebUser, unblockUserWeb } from '@/lib/api';

type BlockRow = {
  blocked_user_id: string;
  created_at?: string;
  reason?: string | null;
  user?: { user_id: string; name: string; profile_image?: string | null } | null;
};

export default function BlockedAccountsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<BlockRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const u = getWebUser();
    if (!u?.user_id) {
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const res = await getBlockedUsersWeb();
      if (res.success && res.data?.blocked_users) {
        setRows(res.data.blocked_users as BlockRow[]);
      } else {
        setRows([]);
        setError(res.message || 'Could not load blocked accounts');
      }
    } catch (e: unknown) {
      setRows([]);
      setError(e instanceof Error ? e.message : 'Could not load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!getWebUser()?.user_id) {
      router.replace('/login');
      return;
    }
    load();
  }, [load, router]);

  const onUnblock = async (blocked_user_id: string) => {
    setBusyId(blocked_user_id);
    setError(null);
    try {
      const res = await unblockUserWeb(blocked_user_id);
      if (!res.success) {
        setError(res.message || 'Unblock failed');
        return;
      }
      setRows((prev) => prev.filter((r) => String(r.blocked_user_id) !== String(blocked_user_id)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unblock failed');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <WekndLoadingScreen />;
  }

  if (!getWebUser()?.user_id) {
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <AppHeader />
      <main className="mx-auto max-w-lg px-4 py-6">
        <div className="mb-4 flex items-center gap-3">
          <Link
            href="/"
            className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 no-underline hover:bg-neutral-50"
          >
            ← Home
          </Link>
          <h1 className="text-xl font-bold text-neutral-900">Blocked accounts</h1>
        </div>
        <p className="mb-6 text-sm text-neutral-600">
          Blocked people don’t show in your feed, so you won’t open their profile from there. Unblock here anytime — then
          you can visit their profile again.
        </p>
        {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
        {rows.length === 0 ? (
          <p className="text-neutral-500">No blocked accounts.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => {
              const id = String(r.blocked_user_id);
              const label = r.user?.name || `User …${id.slice(-6)}`;
              const busy = busyId === id;
              return (
                <li
                  key={id}
                  className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-neutral-200">
                    {r.user?.profile_image ? (
                      <Image src={r.user.profile_image} alt="" fill className="object-cover" sizes="48px" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-neutral-500">
                        {label.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-neutral-900">{label}</p>
                    <p className="text-xs text-neutral-500">Blocked</p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onUnblock(id)}
                    className="shrink-0 rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {busy ? '…' : 'Unblock'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
