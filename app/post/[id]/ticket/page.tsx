'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getWebUser, getUserTicket } from '@/lib/api';
import { buildDetailPills } from '@/lib/ticketDetailPills';
import { TicketCategoryPills } from '@/app/components/TicketCategoryPills';
import { WekndLoadingScreen } from '@/app/components/WekndLoadingScreen';
import { QRCodeCanvas } from 'qrcode.react';

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

function formatOrdinalDate(date?: string | Date | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  const day = d.getDate();
  const ord =
    day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
  const rest = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  return `${day}${ord} ${rest}`;
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
      if (!user?.user_id) {
        const qs = searchParams.toString();
        const path = qs ? `/post/${planId}/ticket?${qs}` : `/post/${planId}/ticket`;
        router.push(`/login?redirect=${encodeURIComponent(path)}`);
      }
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
  }, [planId, user?.user_id, router, searchParams]);

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
  const ticketBackgroundImage =
    getProxiedImageUrl(mainImageWithVersion) ?? mainImageWithVersion ?? getProxiedImageUrl(mainImage) ?? mainImage;
  const eventTitle = plan.title ?? 'Event';
  const dateStr = formatOrdinalDate(plan.date);
  const eventTime = formatTime(plan.time);
  const eventDateLine = eventTime ? `${dateStr || '—'} | ${eventTime} onwards` : dateStr || '—';
  const locationText = String(plan.location_text || '').trim();
  const metaLineWithLocation = locationText
    ? `${eventDateLine || '—'} | ${locationText}`
    : eventDateLine || '—';
  const displayCode = (
    (ticket?.checkin_code as string | undefined)?.trim() ||
    (ticket?.ticket_number as string | undefined)?.trim() ||
    '—'
  ).toUpperCase();
  const detailPills = buildDetailPills(plan.add_details);
  const categorySub: string[] = Array.isArray(plan.category_sub) ? plan.category_sub : [];
  const mergedPills = (() => {
    const out: Array<{ key: string; label: string; detailType?: string }> = [];
    const seen = new Set<string>();

    const push = (labelRaw: unknown, detailType?: string, keyHint?: string) => {
      const label = String(labelRaw ?? '').trim();
      if (!label) return;
      const sig = `${(detailType || 'tag').toLowerCase()}::${label.toLowerCase()}`;
      if (seen.has(sig)) return;
      seen.add(sig);
      out.push({ key: keyHint || sig, label, detailType });
    };

    // 1) Prefer add_details (distance, music_type, etc.)
    detailPills.forEach((p, i) => push(p.label, p.detailType, p.key || `ad-${i}`));

    // 2) Add category_sub as extra tags (dynamic from backend)
    categorySub.forEach((t: string, i: number) => push(t, 'category', `cat-${i}`));

    return out.slice(0, 8);
  })();
  const groupId = plan.group_id as string | undefined;
  const qrValue =
    (ticket?.qr_code_hash as string | undefined)?.trim() ||
    (ticket?.qr_code as string | undefined)?.trim() ||
    '';
  const hasQr = !!qrValue;
  const hasPassProducts = Array.isArray(plan?.passes) && plan.passes.length > 0;
  const passTitle = (() => {
    const pid = (ticket?.pass_id as string | null | undefined) ?? null;
    const passes = plan?.passes as Array<{ pass_id: string; name?: string }> | undefined;
    if (pid && Array.isArray(passes)) {
      const p = passes.find((x) => String(x.pass_id) === String(pid));
      if (p?.name) return String(p.name);
    }
    return hasPassProducts ? 'General admission' : '';
  })();

  // Match app segregation: pass UI when plan has pass products or ticket has pass_id.
  const isPassUi = hasPassProducts || !!ticket?.pass_id;
  const dateLineShort = formatOrdinalDate(plan.date);
  const timeLineShort = formatTime(plan.time);

  const close = () => {
    if (fromTickets) router.push('/tickets');
    else router.push(`/post/${planId}`);
  };

  const serialNumber = String(ticket?.ticket_number || '').toUpperCase();

  if (isPassUi) {
    return (
      <div className="fixed inset-0 flex flex-col bg-white md:relative md:min-h-screen">
        <header className="relative flex shrink-0 items-center justify-center border-b border-neutral-200 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={close}
            className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-neutral-800"
            aria-label="Close"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h1 className="text-center text-lg font-bold tracking-tight text-neutral-900">Booking Confirmed</h1>
        </header>

        <main className="mx-auto flex h-screen w-full max-w-md flex-col justify-center px-5 py-4 md:h-auto md:flex-1 md:py-6">
          <div className="overflow-hidden rounded-2xl bg-[#F2F2F7] p-4 shadow-sm ring-1 ring-black/[0.04] sm:p-5">
            <div className="mx-auto w-full max-w-[140px] overflow-hidden rounded-[16px] bg-neutral-200">
              {ticketBackgroundImage ? (
                <img src={ticketBackgroundImage} alt="" className="aspect-square h-[140px] w-full object-cover md:h-[160px]" />
              ) : (
                <div className="aspect-square h-[140px] w-full bg-gradient-to-br from-neutral-300 to-neutral-400 md:h-[160px]" />
              )}
            </div>
            <h2 className="mt-3 text-center text-[16px] font-extrabold leading-tight tracking-tight text-neutral-900 md:mt-4 md:text-[18px]">
              {eventTitle}
            </h2>
            <p className="mt-1 text-center text-sm font-medium leading-snug text-neutral-600 md:mt-2">{eventDateLine}</p>
            {locationText ? (
              <p className="mt-1 text-center text-sm font-medium leading-snug text-neutral-600">{locationText}</p>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap justify-center gap-2 md:mt-4">
            {mergedPills.slice(0, 4).map((p, idx) => (
              <span
                key={`${p.key}-${idx}`}
                className="inline-flex items-center gap-2 rounded-full bg-[#ECECED] px-3 py-1.5 text-[12px] font-semibold text-[#1C1C1E] md:px-4 md:py-2 md:text-[13px]"
              >
                <span className="inline-block h-2 w-2 rounded-full bg-[#1C1C1E]/40 md:h-2.5 md:w-2.5" aria-hidden />
                {p.label}
              </span>
            ))}
          </div>

          {/* QR Code for pass events */}
          {hasQr && (
            <>
              <p className="mt-5 text-center text-[14px] text-neutral-600 md:mt-7 md:text-[15px]">Scan at entry</p>
              <div className="mx-auto mt-2 flex flex-col items-center md:mt-3">
                <div className="rounded-[14px] bg-white p-2 shadow-[0_4px_20px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.06] md:rounded-[16px] md:p-3">
                  <QRCodeCanvas value={qrValue} size={140} level="M" includeMargin={false} />
                </div>
                <p className="mt-2 text-center text-[12px] font-semibold text-neutral-700 md:mt-3 md:text-[13px]">{passTitle || 'General admission'}</p>
                <p className="mt-0.5 text-center text-[10px] font-medium tracking-wide text-neutral-500 md:text-[11px]">{serialNumber || '—'}</p>
              </div>
            </>
          )}

          {!hasQr && (
            <>
              <p className="mt-5 text-center text-[14px] text-neutral-600 md:mt-7 md:text-[15px]">Your check-in code is</p>
              <div className="mx-auto mt-2 w-full max-w-sm rounded-full bg-[#F2F2F7] px-4 py-3 text-center ring-1 ring-black/[0.06] md:mt-3 md:px-5 md:py-5">
                <p className="text-xl font-extrabold uppercase tracking-wide text-neutral-900 sm:text-2xl md:text-3xl">{displayCode}</p>
              </div>
            </>
          )}

          <Link
            href={`/post/${planId}`}
            className="mt-6 w-full rounded-full bg-[#1C1C1E] py-3.5 text-center text-base font-bold text-white no-underline shadow-sm md:mt-8 md:py-4"
          >
            View event
          </Link>
        </main>
      </div>
    );
  }

  // Ticket UI: shows QR card layout - covers viewport on mobile, non-scrollable
  return (
    <div className="fixed inset-0 overflow-hidden bg-transparent md:relative md:min-h-screen md:overflow-auto">
      {/* Frosted / transparent blur backdrop (no black) */}
      {ticketBackgroundImage ? (
        <div className="absolute inset-0 md:fixed">
          <img
            src={ticketBackgroundImage}
            alt=""
            className="h-full w-full scale-110 object-cover blur-3xl opacity-80"
          />
          <div className="absolute inset-0 bg-white/20 backdrop-blur-2xl" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-[#F7F7F8] via-[#EBEBED] to-[#F2F2F4] md:fixed" />
      )}

      <main className="relative flex h-screen w-full flex-col items-center justify-center px-6 py-4 md:mx-auto md:min-h-screen md:max-w-[420px] md:py-10">
        <div className="w-full rounded-[28px]">
          {/* Banner - square image with rounded borders */}
          <div className="relative z-10 mx-auto w-full max-w-[220px]">
            <div className="relative overflow-hidden rounded-[20px] bg-neutral-200 shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
              {ticketBackgroundImage ? (
                <img src={ticketBackgroundImage} alt="" className="aspect-square h-[160px] w-full object-cover md:h-[200px]" />
              ) : (
                <div className="aspect-square h-[160px] w-full bg-gradient-to-br from-neutral-300 to-neutral-400 md:h-[200px]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
                <p className="text-[18px] font-extrabold tracking-tight text-white md:text-[22px]">{eventTitle}</p>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <p className="text-[12px] font-semibold text-white/90">{dateLineShort || '—'}</p>
                  <p className="text-[12px] font-semibold text-white/90">{timeLineShort || ''}</p>
                </div>
                {locationText ? (
                  <p className="mt-1 text-[11px] font-medium text-white/85">{locationText}</p>
                ) : null}
              </div>
            </div>
          </div>

          {/* White section (overlaps under image like screenshot) */}
          <div className="-mt-8 rounded-[28px] bg-white px-5 pb-5 pt-12 shadow-[0_18px_40px_rgba(0,0,0,0.16)] md:-mt-10 md:pb-6 md:pt-14">
            <div className="flex items-start gap-4">
              {/* Pills (hug text width, align left) */}
              <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
              {(mergedPills.length ? mergedPills : []).slice(0, 4).map((p: any, idx: number) => (
                  <div
                    key={`${p?.label ?? 'pill'}-${idx}`}
                    className="inline-flex items-center gap-2 rounded-full bg-[#ECECED] px-4 py-2 text-[13px] font-semibold text-[#1C1C1E]"
                  >
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#1C1C1E]/40" aria-hidden />
                    <span className="max-w-[220px] truncate">{String(p?.label ?? '')}</span>
                  </div>
                ))}
              {mergedPills.length === 0 ? (
                  <div className="mt-1">
                    <TicketCategoryPills layout="row" pills={detailPills} emptyLabel="Event details" />
                  </div>
                ) : null}
              </div>

              {/* QR */}
              <div className="shrink-0">
                <div className="rounded-[14px] bg-white p-2 ring-1 ring-black/[0.10]">
                  <div className="rounded-[12px] bg-white">
                    <QRCodeCanvas value={qrValue || serialNumber || '—'} size={100} level="M" includeMargin={false} />
                  </div>
                </div>
                <p className="mt-2 text-center text-[12px] font-semibold text-[#1C1C1E]">
                  {passTitle || 'Ticket'}
                </p>
                <p className="mt-0.5 text-center text-[10px] font-semibold tracking-wide text-[#6B7280]">
                  {serialNumber || '—'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Done button */}
        <button
          type="button"
          onClick={close}
          className="mt-6 w-full rounded-full bg-[#1C1C1E] py-3.5 text-center text-[16px] font-semibold text-white shadow-[0_10px_28px_rgba(0,0,0,0.25)] md:mt-9 md:py-4"
        >
          Done
        </button>

        {/* Deep link row - hidden on small mobile screens */}
        <div className="mt-5 hidden w-full items-center justify-between gap-3 rounded-2xl bg-white/35 px-4 py-3 text-[#1C1C1E] ring-1 ring-black/[0.06] backdrop-blur-xl md:mt-7 md:flex">
          <p className="min-w-0 flex-1 text-[13px] leading-snug text-neutral-800">
            Join the event chat on the <span className="font-semibold text-neutral-900">weknd.</span> app
          </p>
          <a
            href={groupId ? `vybeme://chat/${encodeURIComponent(groupId)}` : 'vybeme://'}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1C1C1E] text-white shadow-md"
            aria-label="Open app"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7v10" />
            </svg>
          </a>
        </div>
      </main>
    </div>
  );
}
