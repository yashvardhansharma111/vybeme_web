'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import html2canvas from 'html2canvas';
import { getWebUser, getUserTicket } from '@/lib/api';

const QRCodeSVG = dynamic(() => import('qrcode.react').then((m) => m.QRCodeSVG), { ssr: false });

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return 'Jan 29, 2022';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(time: string | null | undefined): string {
  if (!time) return '10:00 PM';
  return time;
}

// Icons matching app (Ionicons outline): pricetag, navigate, restaurant, musical-notes
function IconPricetag() {
  return (
    <svg width={18} height={18} viewBox="0 0 512 512" fill="none" stroke="currentColor" strokeWidth="32" strokeLinecap="round" strokeLinejoin="round">
      <path d="M403.29 304H208a16 16 0 01-16-16V96a16 16 0 0116-16h195.29a8 8 0 015.65 2.34l80 80a8 8 0 010 11.32l-80 80a8 8 0 01-5.65 2.34z" />
      <path d="M112 80H80a32 32 0 00-32 32v320a32 32 0 0032 32h320a32 32 0 0032-32v-32" />
    </svg>
  );
}
function IconNavigate() {
  return (
    <svg width={18} height={18} viewBox="0 0 512 512" fill="none" stroke="currentColor" strokeWidth="32" strokeLinecap="round" strokeLinejoin="round">
      <path d="M448 64L64 240.14h200a8 8 0 018 8v171.72L448 64z" />
    </svg>
  );
}
function IconRestaurant() {
  return (
    <svg width={18} height={18} viewBox="0 0 512 512" fill="none" stroke="currentColor" strokeWidth="32" strokeLinecap="round" strokeLinejoin="round">
      <path d="M57.49 47.74l368.43 368.43a37.28 37.28 0 010 52.72L405 477.49a37.28 37.28 0 01-52.72 0L98.27 128.21a37.28 37.28 0 010-52.72l20.22-20.22a37.28 37.28 0 0152.72 0z" />
      <path d="M400 32l-77.25 77.25A64 64 0 00304 154.51v14.86a16 16 0 004.69 11.32L480 256M16 400l80-80M64 432l48-48" />
    </svg>
  );
}
function IconMusicalNotes() {
  return (
    <svg width={18} height={18} viewBox="0 0 512 512" fill="none" stroke="currentColor" strokeWidth="32" strokeLinecap="round" strokeLinejoin="round">
      <path d="M192 218v-6c0-14.84 10.87-23.63 32.29-27.8S256 172 256 172s48 3 31.71 12.2C266.13 188.37 256 197.16 256 212v82" />
      <path d="M256 294v78" />
      <path d="M256 372c-17.67 0-32 12.5-32 28s14.33 28 32 28 32-12.5 32-28-14.33-28-32-28z" />
      <path d="M256 78v42" />
      <path d="M256 78c-17.67 0-32 12.5-32 28s14.33 28 32 28 32-12.5 32-28-14.33-28-32-28z" />
    </svg>
  );
}

const PILL_ICONS: Record<string, () => React.ReactElement> = {
  'pricetag-outline': IconPricetag,
  'navigate-outline': IconNavigate,
  'restaurant-outline': IconRestaurant,
  'musical-notes-outline': IconMusicalNotes,
};

export default function TicketPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params.id as string;
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  /** Ref for download: viewport except top (header). Captures gradient + full ticket card. */
  const ticketContentRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  const user = getWebUser();

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    setIsMobile(mq.matches);
    const fn = () => setIsMobile(window.matchMedia('(max-width: 768px)').matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

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
    const el = ticketContentRef.current;
    if (!el) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(el, {
        useCORS: true,
        scale: 2,
        backgroundColor: null,
        logging: false,
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `vybeme-ticket-${planId}.png`;
      a.setAttribute('download', a.download);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  }, [planId]);

  const pillItems = useMemo(() => {
    if (!ticket?.plan) {
      return [
        { icon: 'pricetag-outline' as const, label: 'Free' },
        { icon: 'navigate-outline' as const, label: '—' },
        { icon: 'restaurant-outline' as const, label: '—' },
        { icon: 'musical-notes-outline' as const, label: 'Event' },
      ];
    }
    const plan = ticket.plan;
    const addDetails = plan.add_details ?? [];
    const passes = plan.passes ?? [];
    const detailBy = (t: string) => addDetails.find((d: any) => d.detail_type === t);
    const priceLabel =
      ticket.price_paid > 0
        ? `₹${ticket.price_paid}`
        : passes[0]?.price != null && passes[0].price > 0
          ? `₹${passes[0].price}`
          : 'Free';
    const distanceLabel = detailBy('distance')?.title || detailBy('distance')?.description || plan.location_text || '—';
    const fbLabel = detailBy('f&b')?.title || detailBy('f&b')?.description || '—';
    const musicLabel = plan.category_main || (plan.category_sub && plan.category_sub[0]) || 'Event';
    return [
      { icon: 'pricetag-outline' as const, label: priceLabel },
      { icon: 'navigate-outline' as const, label: distanceLabel },
      { icon: 'restaurant-outline' as const, label: fbLabel },
      { icon: 'musical-notes-outline' as const, label: musicLabel },
    ];
  }, [ticket]);

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
  const mainImage = plan.ticket_image ?? plan.media?.[0]?.url ?? null;
  const passes = plan.passes ?? [];
  const passId = ticket?.pass_id;
  const selectedPass = passId && passes.length ? passes.find((p: any) => p.pass_id === passId) : passes[0];
  const passName = selectedPass?.name ?? 'Ticket';

  const overlapAmount = 56;
  const imageHeightPx = 280;

  const InnerTicket = ({ isDesktopLayout = false }: { isDesktopLayout?: boolean }) => {
    return (
    <div className={isDesktopLayout ? 'flex min-h-full flex-col' : 'flex h-full min-h-0 flex-col overflow-hidden'}>
      {/* Gradient background - exact app colors */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background: 'linear-gradient(180deg, #8B7AB8 0%, #C9A0B8 35%, #F5E6E8 70%, #FFFFFF 100%)',
        }}
      />

      {/* Header: X + Booking Confirmed + Download (desktop: download in header) */}
      <header className="flex shrink-0 items-center justify-between px-5 pt-4 pb-2">
        <button
          type="button"
          onClick={() => router.push(`/post/${planId}`)}
          className="flex h-11 w-11 items-center justify-center rounded-full text-white/95 hover:bg-white/10"
          aria-label="Close"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h1 className="text-base font-semibold text-white/98 whitespace-nowrap">Booking Confirmed</h1>
        {/* Download button - commented out as of now
        {isDesktopLayout ? (
          <button
            type="button"
            onClick={handleDownloadImage}
            disabled={downloading}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[#1C1C1E] shadow-md hover:bg-white disabled:opacity-60"
            aria-label="Download ticket"
          >
            {downloading ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#1C1C1E] border-t-transparent" />
            ) : (
              <svg className="h-[22px] w-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
          </button>
        ) : (
          <div className="w-11" />
        )}
        */}
        <div className="w-11" />
      </header>

      {/* Wrapper: content (captured for download) + message in vacant space below; scrollable so visible on mobile and desktop */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div
          ref={ticketContentRef}
          className={`flex flex-shrink-0 flex-col items-center px-5 ${isDesktopLayout ? 'pb-4 pt-2' : 'pb-4 pt-2'}`}
          style={{
            background: 'linear-gradient(180deg, #8B7AB8 0%, #C9A0B8 35%, #F5E6E8 70%, #FFFFFF 100%)',
          }}
        >
          <div className={`relative w-full max-w-[420px] ${isDesktopLayout ? 'flex-shrink-0' : 'flex-shrink-0'}`}>
            {/* Ticket card (image + info) */}
            <div className="relative z-[2]">
            {/* Main ticket card - image */}
            <div className="mb-0 overflow-hidden rounded-[24px] bg-white shadow-[0_8px_20px_rgba(0,0,0,0.12)]">
              <div
                className="relative w-full overflow-hidden rounded-t-[24px]"
                style={{ height: imageHeightPx }}
              >
                {mainImage ? (
                  <Image
                    src={mainImage}
                    alt=""
                    fill
                    className="object-object-contain"
                    sizes="420px"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[#94A3B8]">
                    <svg className="h-16 w-16 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                    </svg>
                  </div>
                )}
                {/* Bottom blur strip (CSS blur) */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-[20%] backdrop-blur-md"
                  style={{ background: 'rgba(0,0,0,0.2)' }}
                />
                {/* Gradient overlay + text */}
                <div
                  className="absolute inset-x-0 bottom-0 pt-[80px] pb-5 px-5"
                  style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.75), transparent)' }}
                >
                  <h2 className="text-[26px] font-extrabold leading-tight text-white">{plan.title ?? 'Event'}</h2>
                  <div className="mt-2 flex justify-between text-[14px] font-semibold text-white/95">
                    <span>{formatDate(plan.date)}</span>
                    <span>{formatTime(plan.time)}</span>
                  </div>
                  {plan.location_text && (
                    <p className="mt-1 truncate text-[13px] text-white/85">{plan.location_text}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Info section - overlaps image, white, pills left + QR right */}
            <div
              className="relative z-[1] flex gap-5 rounded-[20px] bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
              style={{ marginTop: -overlapAmount, paddingTop: overlapAmount + 16 }}
            >
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-3">
                {pillItems.map((item, idx) => {
                  const Icon = PILL_ICONS[item.icon];
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-2 self-start rounded-[20px] border border-[#E5E7EB] bg-white py-2.5 pl-3.5 pr-3.5"
                    >
                      {Icon && <span className="flex shrink-0 text-[#1C1C1E]"><Icon /></span>}
                      <span className="min-w-0 max-w-[180px] truncate text-[14px] font-medium text-[#1C1C1E]">
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex min-w-[112px] shrink-0 flex-col items-center justify-center">
                <div className="mb-2.5 rounded-xl border border-[#E5E7EB] bg-white p-2.5">
                  {ticket?.qr_code_hash ? (
                    <QRCodeSVG value={ticket.qr_code_hash} size={112} level="M" />
                  ) : (
                    <div className="flex h-[112px] w-[112px] items-center justify-center rounded bg-[#F3F4F6] text-[#8E8E93]">
                      <svg className="h-14 w-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                    </div>
                  )}
                </div>
                <p className="text-center text-[16px] font-bold text-[#1C1C1E]">{passName}</p>
                <p className="max-w-full truncate px-1 text-center text-[13px] font-medium tracking-wide text-[#6B7280]">{ticket?.ticket_number ?? '—'}</p>
              </div>
            </div>
            </div>
          </div>
        </div>

        <p className="mt-2 mb-6 text-center text-[13px] font-medium text-[#1C1C1E] px-4">
          Your pass will be sent to you via Whatsapp shortly
        </p>
        <div className="min-h-[40px] shrink-0" aria-hidden />

        {/* Download button - commented out as of now
        {!isDesktopLayout && (
          <button
            type="button"
            onClick={handleDownloadImage}
            disabled={downloading}
            className="absolute right-5 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-md disabled:opacity-60"
            aria-label="Download ticket"
          >
            {downloading ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#1C1C1E] border-t-transparent" />
            ) : (
              <svg className="h-[22px] w-[22px] text-[#1C1C1E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
          </button>
        )}
        */}
      </div>
    </div>
    );
  };

  // Mobile: full-screen, no scroll
  if (isMobile) {
    return (
      <div className="fixed inset-0 h-screen w-full overflow-hidden bg-[#8B7AB8]">
        <InnerTicket />
      </div>
    );
  }

  // Desktop: full-page scrollable layout, no phone frame — prevents overflow and cut-off
  return (
    <div className="min-h-screen overflow-y-auto bg-[#8B7AB8]">
      <div className="mx-auto flex min-h-screen max-w-[480px] flex-col">
        <InnerTicket isDesktopLayout />
      </div>
    </div>
  );
}
