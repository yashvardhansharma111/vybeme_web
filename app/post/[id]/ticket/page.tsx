'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { IoLocationSharp } from 'react-icons/io5';
import { getWebUser, getUserTicket } from '@/lib/api';
import QRCode from 'qrcode';

const QRCodeSVG = dynamic(() => import('qrcode.react').then((m) => m.QRCodeSVG), { ssr: false });

function getProxiedImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.endsWith('r2.dev') || u.hostname.includes('r2.dev')) {
      return `/api/image-proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
  } catch {
    return url;
  }
}

function withCacheBust(url: string | null | undefined, bust: string | null | undefined): string | null {
  if (!url) return null;
  const v = (bust || '').trim();
  if (!v) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}v=${encodeURIComponent(v)}`;
}

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return 'Jan 29, 2022';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Normalize time to AM/PM (e.g. "19:00" -> "7:00 PM"). */
function formatTime(time: string | null | undefined): string {
  if (!time || !String(time).trim()) return '';
  const t = String(time).trim();
  if (/AM|PM/i.test(t)) return t;
  const match = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return t;
  let h = parseInt(match[1], 10);
  const m = match[2];
  if (h >= 24) h = 0;
  const period = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${period}`;
}

export default function TicketPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = params.id as string;
  const fromTickets = searchParams.get('from') === 'tickets';
  const fromApp = searchParams.get('app') === '1';
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!ticket?.qr_code_hash) {
      setQrDataUrl(null);
      return;
    }
    QRCode.toDataURL(ticket.qr_code_hash, { width: 96, margin: 0 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [ticket?.qr_code_hash]);

  const user = getWebUser();

  useEffect(() => {
    if (!fromApp) return;
    if (!planId) return;
    const t = setTimeout(() => {
      try {
        window.location.href = `vybeme://business-plan/${encodeURIComponent(planId)}`;
      } catch {
        // ignore
      }
    }, 250);
    return () => clearTimeout(t);
  }, [fromApp, planId]);

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
      <div className="flex min-h-screen items-center justify-center bg-[#8B7AB8]">
        <p className="text-white/90">Loading ticket…</p>
      </div>
    );
  }

  if (!user?.user_id) {
    return null;
  }

  if (error && !ticket) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#8B7AB8] p-4">
        <p className="text-white/95">{error}</p>
        <Link
          href={`/post/${planId}`}
          className="rounded-[20px] bg-[#1C1C1E] px-6 py-3 text-sm font-semibold text-white no-underline"
        >
          Go Back
        </Link>
      </div>
    );
  }

  const plan = ticket?.plan ?? {};
  const planMedia = Array.isArray(plan.media) ? plan.media : [];
  const latestMediaUrl = planMedia.length ? planMedia[planMedia.length - 1]?.url : null;
  const mainImage = plan.ticket_image ?? latestMediaUrl ?? null;
  const mainImageWithVersion = withCacheBust(mainImage, plan.updated_at);
  const passes = plan.passes ?? [];
  const passId = ticket?.pass_id;
  const selectedPass = passId && passes.length ? passes.find((p: any) => p.pass_id === passId) : passes[0];
  const passName = selectedPass?.name ?? 'Ticket';
  const ticketBackgroundImage = getProxiedImageUrl(mainImageWithVersion) ?? mainImageWithVersion ?? getProxiedImageUrl(mainImage) ?? mainImage;
  const eventTitle = plan.title ?? 'Event';
  const eventDate = formatDate(plan.date);
  const eventTime = formatTime(plan.time);
  const eventDateTime = [eventDate, eventTime].filter(Boolean).join('  |  ');

  return (
    <div className="relative min-h-screen overflow-hidden bg-black/40">
      {ticketBackgroundImage ? (
        <img src={ticketBackgroundImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : null}
      <div className="absolute inset-0 bg-black/35 backdrop-blur-md" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center px-4 py-8">
        <div className="mb-5 flex w-full max-w-[340px] items-center justify-between">
          <button
            type="button"
            onClick={() => (fromTickets ? router.push('/tickets') : router.push(`/post/${planId}`))}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-[#1C1C1E] shadow-sm"
            aria-label="Close pass"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <p className="rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-[#1C1C1E]">Your Pass</p>
        </div>

        <div className="w-full max-w-[340px] overflow-hidden rounded-[22px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div className="px-5 pt-5 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">Event Pass</p>
            <h1 className="mt-1 text-[22px] font-extrabold leading-tight text-[#1C1C1E]">{eventTitle}</h1>
          </div>

          <div className="mx-5 mt-4 rounded-2xl border border-neutral-200 bg-white p-3">
            <div className="mx-auto flex h-[132px] w-[132px] items-center justify-center rounded-xl bg-white p-2 shadow-sm">
              {qrDataUrl ? (
                <img src={qrDataUrl} width={116} height={116} alt="" className="block h-[116px] w-[116px]" />
              ) : ticket?.qr_code_hash ? (
                <QRCodeSVG value={ticket.qr_code_hash} size={116} level="M" />
              ) : (
                <div className="h-[116px] w-[116px] rounded bg-[#F3F4F6]" />
              )}
            </div>
            <p className="mt-2 text-center text-sm font-bold text-[#1C1C1E]">{passName}</p>
            <p className="mt-1 text-center text-[11px] font-medium text-[#6B7280]">{ticket?.ticket_number ?? '—'}</p>
          </div>

          <div className="mx-5 mt-4 space-y-2 rounded-2xl bg-[#F2F2F7] p-3">
            {eventDateTime ? <p className="text-center text-xs font-semibold text-[#1C1C1E]">{eventDateTime}</p> : null}
            {plan.location_text ? (
              <p className="flex items-center justify-center gap-1.5 text-center text-xs text-[#4B5563]">
                <IoLocationSharp className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{plan.location_text}</span>
              </p>
            ) : null}
          </div>

          <div
            className="mt-5 px-5 pb-6 pt-6"
            style={{
              background: mainImage
                ? `linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.92) 100%), url(${ticketBackgroundImage})`
                : 'linear-gradient(180deg, #D8ECF1 0%, #E5D7F5 100%)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <p className="text-center text-[11px] font-medium text-[#1C1C1E]">Show this pass at entry</p>
          </div>
        </div>

        <Link
          href={`/post/${planId}`}
          className="mt-5 inline-flex w-full max-w-[340px] items-center justify-center rounded-full bg-[#1C1C1E] py-3 text-sm font-bold text-white no-underline shadow-lg"
        >
          View Event
        </Link>
      </div>
    </div>
  );
}
