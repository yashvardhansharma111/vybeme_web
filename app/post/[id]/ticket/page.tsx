'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import html2canvas from 'html2canvas';
import { AppHeader } from '../../../components/AppHeader';
import { DownloadAppCTA } from '../../../components/DownloadAppCTA';
import { getWebUser, getUserTicket } from '@/lib/api';

const QRCodeSVG = dynamic(() => import('qrcode.react').then((m) => m.QRCodeSVG), { ssr: false });

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(time: string | null | undefined): string {
  if (!time) return '';
  return time;
}

const ACTIVITY_ICONS: Record<string, string> = {
  sports: '⚽',
  music: '🎵',
  food: '🍽️',
  cafe: '☕',
  fitness: '💪',
  run: '🏃',
  default: '•',
};

function getActivityIcon(label: string): string {
  const key = (String(label).toLowerCase() || '').replace(/\s+/g, '').slice(0, 6);
  return ACTIVITY_ICONS[key] ?? ACTIVITY_ICONS.default;
}

export default function TicketPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params.id as string;
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const ticketCardRef = useRef<HTMLDivElement>(null);

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

  const handleDownloadImage = useCallback(async () => {
    const el = ticketCardRef.current;
    if (!el) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(el, {
        useCORS: true,
        scale: 2,
        backgroundColor: null,
        logging: false,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `vybeme-ticket-${planId}.png`;
      a.click();
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  }, [planId]);

  const handleShare = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: ticket?.plan?.title ?? 'My ticket',
        url: window.location.href,
        text: `My ticket for ${ticket?.plan?.title ?? 'event'}`,
      }).catch(() => {});
    }
  }, [ticket]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F2F2F7]">
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
      <div className="min-h-screen bg-[#F2F2F7]">
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
  const mainImage = plan.ticket_image ?? plan.media?.[0]?.url ?? null;
  const passes = plan.passes ?? [];
  const passId = ticket?.pass_id;
  const selectedPass = passId && passes.length ? passes.find((p: any) => p.pass_id === passId) : passes[0];
  const passName = selectedPass?.name ?? 'General Admission';

  const activityLabels = (() => {
    const main = plan.category_main;
    const sub = plan.category_sub || [];
    const labels = [main, ...sub].filter(Boolean).slice(0, 4);
    if (labels.length === 0) return ['Event', 'Check-in', 'Pass', 'Entry'];
    return labels.map(String);
  })();

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <AppHeader />

      {/* Blue header bar — same as app */}
      <div className="flex items-center justify-between bg-[#2563EB] px-4 py-3">
        <button
          type="button"
          onClick={() => router.push(`/post/${planId}`)}
          className="flex items-center gap-1 text-white"
          aria-label="Back"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-lg font-bold text-white">Ticket</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadImage}
            disabled={downloading}
            className="rounded p-1.5 text-white hover:bg-white/20 disabled:opacity-50"
            aria-label="Download ticket"
          >
            {downloading ? (
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="rounded p-1.5 text-white hover:bg-white/20"
            aria-label="Share"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-md px-4 pb-10 pt-6">
        {/* Ticket card — capture this for download */}
        <div ref={ticketCardRef} className="overflow-hidden rounded-2xl bg-white shadow-lg">
          {/* Banner: image + gradient overlay */}
          <div className="relative h-[280px] w-full">
            {mainImage ? (
              <Image src={mainImage} alt="" fill className="object-cover" sizes="400px" unoptimized />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-400">
                <svg className="h-16 w-16 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                </svg>
              </div>
            )}
            <div
              className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent pt-14 pb-5 px-5"
            >
              <h1 className="text-2xl font-extrabold text-white">{plan.title ?? 'Event'}</h1>
              <div className="mt-2 flex justify-between text-sm font-semibold text-white/95">
                <span>{formatDate(plan.date)}</span>
                <span>{formatTime(plan.time)}</span>
              </div>
              {plan.location_text && (
                <p className="mt-1 truncate text-sm text-white/85">{plan.location_text}</p>
              )}
            </div>
          </div>

          {/* White details card: activities (left) + QR & pass (right) */}
          <div className="-mt-6 mx-4 flex rounded-[20px] border border-neutral-100 bg-white p-5 shadow-md">
            <div className="flex flex-1 flex-col justify-center gap-3">
              {activityLabels.map((label, idx) => (
                <div key={idx} className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-base">
                    {getActivityIcon(label)}
                  </div>
                  <span className="truncate text-sm font-semibold text-[#1C1C1E]">{label}</span>
                </div>
              ))}
            </div>
            <div className="flex min-w-[140px] flex-col items-center justify-center">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                {ticket?.qr_code_hash ? (
                  <QRCodeSVG value={ticket.qr_code_hash} size={120} level="M" />
                ) : (
                  <div className="flex h-[120px] w-[120px] items-center justify-center rounded bg-slate-100 text-slate-400">
                    <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  </div>
                )}
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-500">{passName}</p>
              <p className="text-sm font-extrabold tracking-wide text-[#1C1C1E]">{ticket?.ticket_number ?? '—'}</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push(`/post/${planId}`)}
          className="mt-6 w-full rounded-xl bg-[#1C1C1E] py-4 text-base font-bold text-white"
        >
          Done
        </button>

        <p className="mt-4 text-center text-sm text-neutral-600">
          Show this ticket at the venue. For full experience and chat, use the app.
        </p>
        <DownloadAppCTA className="mt-4" />
      </main>
    </div>
  );
}
