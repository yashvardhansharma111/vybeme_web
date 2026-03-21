'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { getWebUser, getUserTicket } from '@/lib/api';
import { buildDetailPills } from '@/lib/ticketDetailPills';
import { TicketCategoryPills } from '@/app/components/TicketCategoryPills';
import { WekndLoadingScreen } from '@/app/components/WekndLoadingScreen';
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
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

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

/** Compact QR — reference is smaller than hero; not full-width of lower panel */
const QR_BOX_PX = 112;
const QR_INNER_PX = 100;
const QR_GENERATE_SIZE = 180;

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
    QRCode.toDataURL(ticket.qr_code_hash, { width: QR_GENERATE_SIZE, margin: 0 })
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
    return <WekndLoadingScreen />;
  }

  if (!user?.user_id) {
    return null;
  }

  if (error && !ticket) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#1C1C1E] p-4">
        <p className="text-white/95">{error}</p>
        <Link
          href={`/post/${planId}`}
          className="rounded-[20px] bg-white px-6 py-3 text-sm font-semibold text-[#1C1C1E] no-underline"
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
  const ticketBackgroundImage =
    getProxiedImageUrl(mainImageWithVersion) ?? mainImageWithVersion ?? getProxiedImageUrl(mainImage) ?? mainImage;
  const eventTitle = plan.title ?? 'Event';
  const eventDate = formatDate(plan.date);
  const eventTime = formatTime(plan.time);
  const displayCode = (
    (ticket?.checkin_code as string | undefined)?.trim() ||
    (ticket?.ticket_number as string | undefined)?.trim() ||
    '—'
  ).toUpperCase();
  const detailPills = buildDetailPills(plan.add_details);
  const groupId = plan.group_id as string | undefined;

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      {ticketBackgroundImage ? (
        <img src={ticketBackgroundImage} alt="" className="absolute inset-0 h-full w-full scale-105 object-cover blur-xl" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-[#2d2640] to-black" />
      )}
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 flex min-h-screen flex-col pb-28">
        {/* Header — white X + centered title (reference) */}
        <header className="relative flex shrink-0 items-center justify-center px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={() => (fromTickets ? router.push('/tickets') : router.push(`/post/${planId}`))}
            className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-white"
            aria-label="Close"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h1 className="text-center text-lg font-semibold tracking-tight text-white">Booking Confirmed</h1>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-4 pt-2">
          {/*
            Figma ~60–65% hero / ~35–40% white: fixed card height + 63fr / 37fr grid
            (max width ~305px per design)
          */}
          {/*
            White card base; hero uses matching top radius + rounded bottom corners so
            white peeks through (ticket curve into the lower panel).
          */}
          <div className="grid h-[min(540px,78dvh)] w-full max-w-[308px] grid-rows-[63fr_37fr] overflow-hidden rounded-[28px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            {/* Hero image band: rounded top (card) + rounded bottom (ticket notch) */}
            <div className="relative isolate min-h-0 overflow-hidden rounded-tl-[28px] rounded-tr-[28px] rounded-bl-[26px] rounded-br-[26px] bg-white">
              <div className="absolute inset-0 bg-white" aria-hidden />
              {ticketBackgroundImage ? (
                <img
                  src={ticketBackgroundImage}
                  alt=""
                  className="absolute inset-0 z-[1] h-full w-full rounded-tl-[28px] rounded-tr-[28px] rounded-bl-[26px] rounded-br-[26px] object-cover"
                />
              ) : (
                <div className="absolute inset-0 z-[1] rounded-tl-[28px] rounded-tr-[28px] rounded-bl-[26px] rounded-br-[26px] bg-gradient-to-br from-[#6B5B8E] to-[#3d3554]" />
              )}
              <div
                className="absolute inset-0 z-[2] rounded-tl-[28px] rounded-tr-[28px] rounded-bl-[26px] rounded-br-[26px] bg-gradient-to-t from-black/85 via-black/35 to-black/10"
                aria-hidden
              />
              <div className="relative z-[3] flex h-full min-h-0 flex-col justify-end p-4 pb-5 text-white sm:p-5">
                <h2 className="text-[21px] font-bold leading-tight sm:text-[22px]">{eventTitle}</h2>
                <div className="mt-2.5 flex items-baseline justify-between gap-3 text-[14px] font-medium text-white/95 sm:text-[15px]">
                  <span>{eventDate || '—'}</span>
                  <span className="shrink-0">{eventTime || ''}</span>
                </div>
                {plan.location_text ? (
                  <p className="mt-1.5 line-clamp-2 text-[13px] text-white/85 sm:text-sm">{plan.location_text}</p>
                ) : null}
              </div>
            </div>

            {/* Lower ~37%: gap below curved image, then pills (w-fit) + QR */}
            <div className="flex min-h-0 gap-3 overflow-y-auto rounded-b-[28px] bg-white px-3 pb-3 pt-4 sm:gap-3.5 sm:px-4 sm:pb-4 sm:pt-5">
              <div className="min-w-0 flex-1">
                <TicketCategoryPills pills={detailPills} emptyLabel="Event details" />
              </div>
              <div className="flex w-[112px] shrink-0 flex-col items-center justify-center sm:w-[118px]">
                <div
                  className="flex items-center justify-center rounded-xl bg-white p-1.5 shadow-[0_1px_8px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.04]"
                  style={{ width: QR_BOX_PX, height: QR_BOX_PX }}
                >
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      width={QR_INNER_PX}
                      height={QR_INNER_PX}
                      alt=""
                      className="block object-contain"
                      style={{ width: QR_INNER_PX, height: QR_INNER_PX }}
                    />
                  ) : ticket?.qr_code_hash ? (
                    <QRCodeSVG value={ticket.qr_code_hash} size={QR_INNER_PX} level="M" />
                  ) : (
                    <div
                      className="rounded-md bg-[#F2F2F7]"
                      style={{ width: QR_INNER_PX, height: QR_INNER_PX }}
                    />
                  )}
                </div>
                <p className="mt-2 max-w-full truncate text-center text-[11px] font-medium text-[#636366] sm:text-[12px]">
                  {passName}
                </p>
                <p className="mt-0.5 max-w-full truncate text-center text-[12px] font-bold tracking-[0.1em] text-[#1C1C1E] sm:text-[13px]">
                  {displayCode}
                </p>
              </div>
            </div>
          </div>

          <Link
            href={`/post/${planId}`}
            className="mt-6 w-full max-w-[308px] rounded-full bg-white/15 py-3 text-center text-sm font-semibold text-white backdrop-blur-sm no-underline ring-1 ring-white/25"
          >
            View event
          </Link>
        </div>

        {/* Bottom bar — weknd app CTA */}
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-[#1C1C1E]/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
            <p className="min-w-0 flex-1 text-[13px] leading-snug text-white/90">
              Join the event chat on the <span className="font-semibold text-white">weknd.</span> app
            </p>
            <a
              href={
                groupId ? `vybeme://chat/${encodeURIComponent(groupId)}` : 'vybeme://'
              }
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#1C1C1E] shadow-lg"
              aria-label="Open app"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7v10" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
