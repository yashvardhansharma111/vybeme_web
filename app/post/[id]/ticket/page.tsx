'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { AppHeader } from '../../../components/AppHeader';
import { DownloadAppCTA } from '../../../components/DownloadAppCTA';
import { getWebUser, getUserTicket } from '@/lib/api';

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(time: string | null | undefined): string {
  if (!time) return '';
  return time;
}

export default function TicketPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params.id as string;
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const user = getWebUser();

  const loadTicket = useCallback(async () => {
    if (!planId || !user?.user_id) {
      if (!user?.user_id) router.push(`/login?redirect=${encodeURIComponent(`/post/${planId}/ticket`)}`);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getUserTicket(planId, user.user_id);
      if (res.success && res.data?.ticket) {
        setTicket(res.data.ticket);
      } else {
        setError('Ticket not found');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  }, [planId, user?.user_id, router]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-100/80 to-neutral-900">
        <AppHeader />
        <div className="flex min-h-[50vh] items-center justify-center p-4">
          <p className="text-neutral-500">Loading ticket…</p>
        </div>
      </div>
    );
  }

  if (!user?.user_id) {
    return null;
  }

  if (error && !ticket) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-100/80 to-neutral-900">
        <AppHeader />
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-4">
          <p className="text-red-600">{error}</p>
          <Link href={`/post/${planId}`} className="rounded-full bg-black px-4 py-2 text-white no-underline">
            Back to event
          </Link>
        </div>
      </div>
    );
  }

  const plan = ticket?.plan ?? {};
  const mainImage = plan.ticket_image ?? (plan.media?.[0]?.url) ?? null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-100/80 to-neutral-900 md:bg-neutral-200">
      <AppHeader />
      <main className="mx-auto max-w-md flex-col gap-4 p-4 pb-8 md:max-w-4xl md:py-8">
        <button
          type="button"
          onClick={() => router.push(`/post/${planId}`)}
          className="self-start text-sm font-medium text-neutral-700 underline hover:text-neutral-900"
        >
          ← Back to event
        </button>

        <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-xl">
          {mainImage && (
            <div className="relative h-48 w-full">
              <Image src={mainImage} alt="" fill className="object-cover" sizes="100vw" />
            </div>
          )}
          <div className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Your ticket</p>
            <h1 className="mt-1 text-xl font-bold text-neutral-900">{plan.title ?? 'Event'}</h1>
            <p className="mt-2 text-sm text-neutral-600">{plan.description}</p>
            <div className="mt-4 space-y-2">
              {(plan.date || plan.time) && (
                <p className="text-sm font-medium text-neutral-700">
                  {formatDate(plan.date)} {plan.time ? `| ${formatTime(plan.time)}` : ''}
                </p>
              )}
              {plan.location_text && (
                <p className="text-sm text-neutral-600">📍 {plan.location_text}</p>
              )}
            </div>
            {ticket?.ticket_number && (
              <p className="mt-4 rounded-xl bg-neutral-100 px-3 py-2 text-sm font-mono font-semibold text-neutral-800">
                Ticket # {ticket.ticket_number}
              </p>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-sm text-neutral-600">
          Show this ticket at the venue. For full experience and chat, use the app.
        </p>
        <DownloadAppCTA className="mt-4" />
      </main>
    </div>
  );
}
