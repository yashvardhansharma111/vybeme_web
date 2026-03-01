'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import html2canvas from 'html2canvas';
import { FaCalendarCheck, FaFlagCheckered, FaMusic, FaBasketballBall, FaDumbbell, FaGlassCheers } from 'react-icons/fa';
import { FaPersonRunning } from 'react-icons/fa6';
import { IoLocationSharp } from 'react-icons/io5';
import { IoMdShirt } from 'react-icons/io';
import { GiRunningShoe } from 'react-icons/gi';
import { MdFastfood } from 'react-icons/md';
import { PiLinkSimpleBold } from 'react-icons/pi';
import { HiOutlineTag } from 'react-icons/hi';
import { getWebUser, getUserTicket } from '@/lib/api';
import { sanitizeOklabForHtml2Canvas } from '@/lib/html2canvas-oklab-fix';
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

/** Map category/label to pill icon key. */
function getCategoryIconKey(category: string): string {
  const c = (category || '').toLowerCase();
  if (c.includes('sport')) return 'sports';
  if (c.includes('run')) return 'running';
  if (c.includes('fitness') || c.includes('train')) return 'fitness';
  if (c.includes('social') || c.includes('communit')) return 'social';
  return 'music';
}

/** Map detail_type to icon key for add_details pills. */
function getDetailIconKey(detailType: string): string {
  const t = (detailType || '').toLowerCase();
  if (t === 'distance' || t.includes('distance')) return 'location';
  if (t === 'f&b' || t.includes('f&b')) return 'fb';
  if (t.includes('starting') || t.includes('point')) return 'starting-point';
  if (t.includes('dress')) return 'dress-code';
  if (t.includes('link')) return 'links';
  return 'music';
}

const PILL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  price: HiOutlineTag,
  location: GiRunningShoe,
  fb: MdFastfood,
  music: FaMusic,
  sports: FaBasketballBall,
  running: FaPersonRunning,
  fitness: FaDumbbell,
  social: FaGlassCheers,
  'starting-point': FaFlagCheckered,
  'dress-code': IoMdShirt,
  links: PiLinkSimpleBold,
  calendar: FaCalendarCheck,
  'pricetag-outline': HiOutlineTag,
  'navigate-outline': GiRunningShoe,
  'restaurant-outline': MdFastfood,
  'musical-notes-outline': FaMusic,
};

export default function TicketPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = params.id as string;
  const fromTickets = searchParams.get('from') === 'tickets';
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const ticketContentRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

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
        onclone: sanitizeOklabForHtml2Canvas,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      const planPart = (planId || 'event').replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 40);
      const uniquePart = (ticket?.ticket_number || ticket?.user_id || `ticket-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 30);
      a.download = `vybeme-ticket-${planPart}-${uniquePart}.png`;
      a.setAttribute('download', a.download);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  }, [planId, ticket?.ticket_number, ticket?.user_id]);

  const pillItems = useMemo(() => {
    const iconKeys: string[] = ['music', 'location', 'fb', 'starting-point'];
    if (!ticket?.plan) {
      return [{ icon: 'music', label: 'Event' }];
    }
    const plan = ticket.plan;
    const addDetails = plan.add_details ?? [];
    const detailBy = (t: string) => addDetails.find((d: any) => d.detail_type === t);
    const getDetailLabel = (d: { title?: string; description?: string } | undefined, fallback: string): string | null => {
      if (!d) return (fallback?.trim() || '').trim() || null;
      const desc = (d.description ?? '').trim();
      const title = (d.title ?? '').trim();
      if (desc) return desc;
      if (title) return title;
      return (fallback?.trim() || '').trim() || null;
    };

    const items: { icon: string; label: string }[] = [];
    const category = (plan.category_main || (plan.category_sub && plan.category_sub[0]) || '').trim();
    if (category) {
      items.push({ icon: getCategoryIconKey(category), label: category });
    }
    const distanceDetail = detailBy('distance');
    const distance = getDetailLabel(distanceDetail, '');
    if (distance) items.push({ icon: 'location', label: distance });
    const fb = getDetailLabel(detailBy('f&b'), '');
    if (fb) items.push({ icon: 'fb', label: fb });
    const isLinkOrUrl = (s: string) => {
      const x = (s || '').trim().toLowerCase();
      return /^https?:\/\//i.test(x) || x.includes('instagram') || x.includes('.com/');
    };
    addDetails.forEach((d: any) => {
      if (!d || items.length >= 4) return;
      const t = (d.detail_type || '').toLowerCase();
      if (t === 'distance' || t === 'f&b' || t === 'location' || t === 'venue' || t === 'links' || t === 'link' || t.includes('url')) return;
      const label = getDetailLabel(d, '');
      if (label && !isLinkOrUrl(label) && !items.some((x) => x.label === label)) {
        items.push({ icon: getDetailIconKey(d.detail_type || ''), label });
      }
    });

    return items.slice(0, 4).map((item, i) => ({
      ...item,
      icon: item.icon || iconKeys[i],
    }));
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
  const planMedia = Array.isArray(plan.media) ? plan.media : [];
  const latestMediaUrl = planMedia.length ? planMedia[planMedia.length - 1]?.url : null;
  const mainImage = plan.ticket_image ?? latestMediaUrl ?? null;
  const mainImageWithVersion = withCacheBust(mainImage, plan.updated_at);
  const passes = plan.passes ?? [];
  const passId = ticket?.pass_id;
  const selectedPass = passId && passes.length ? passes.find((p: any) => p.pass_id === passId) : passes[0];
  const passName = selectedPass?.name ?? 'Ticket';

  const overlapAmount = 32;

  const InnerTicket = ({ isDesktopLayout = false }: { isDesktopLayout?: boolean }) => {
    return (
      <div 
        className={isDesktopLayout ? 'flex min-h-full flex-col' : 'flex h-full min-h-0 flex-col overflow-hidden'}
      >
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between px-4 pt-3 pb-2">
          <button
            type="button"
            onClick={() => (fromTickets ? router.push('/tickets') : router.push(`/post/${planId}`))}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/95 hover:bg-white/10"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h1 className="text-sm font-semibold text-white/98 whitespace-nowrap">Booking Confirmed</h1>
          <button
            type="button"
            onClick={handleDownloadImage}
            disabled={downloading}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#1C1C1E] shadow-md hover:bg-white disabled:opacity-60"
            aria-label="Download ticket"
          >
            {downloading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1C1C1E] border-t-transparent" />
            ) : (
              <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
          </button>
        </header>

        <p className="shrink-0 text-center text-[10px] font-medium text-[#1C1C1E] px-4 pb-3 whitespace-nowrap truncate">
          Your passes will be sent to you via Whatsapp within 24hrs
        </p>

        {/* Scrollable area - gradient background continues seamlessly */}
        <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
          {/* Ticket and button container with unified spacing */}
          <div className="flex flex-col items-center px-4 py-4 gap-4">
            {/* Ticket card wrapper for download */}
            <div
  ref={ticketContentRef}
  className="relative w-full max-w-[340px] py-5"
>

              {/* Ticket card */}
              <div className="relative z-[2]">
                <div className="mb-0 overflow-hidden rounded-[20px] bg-white" style={{ boxShadow: 'rgba(0, 0, 0, 0.35) 0px 5px 15px' }}>
                  {/* Image block */}
                  <div className="relative w-full overflow-hidden rounded-t-[20px]">
                    {mainImage ? (
                      <img
                        src={getProxiedImageUrl(mainImageWithVersion) ?? mainImageWithVersion ?? getProxiedImageUrl(mainImage) ?? mainImage}
                        alt=""
                        className="block w-full h-auto max-h-[38vh] object-cover object-center"
                      />
                    ) : (
                      <div className="flex aspect-[4/3] w-full items-center justify-center bg-[#94A3B8]">
                        <svg className="h-12 w-12 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                        </svg>
                      </div>
                    )}
                    {mainImage && (
                      <>
                        <div
                          className="absolute bottom-0 left-0 right-0 z-10 h-[30%] min-h-[60px] pointer-events-none"
                          aria-hidden
                          style={{
                            background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.06) 20%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.72) 100%)',
                            backdropFilter: 'blur(5px)',
                          }}
                        />
                        <div
                          className="absolute inset-x-0 bottom-0 pt-3 pb-4 px-4 z-20 pointer-events-none"
                          style={{
                            background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.05) 15%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.72) 100%)',
                          }}
                        >
                          <h2 className="text-[18px] font-extrabold leading-tight text-white">{plan.title ?? 'Event'}</h2>
                          <div className="mt-1.5 flex items-center gap-2 text-[12px] font-semibold text-white/95">
                            <span className="flex items-center gap-1.5">
                              <FaCalendarCheck className="h-3.5 w-3.5 shrink-0 opacity-90" />
                              {formatDate(plan.date)}
                            </span>
                            <span>{formatTime(plan.time)}</span>
                          </div>
                          {plan.location_text && (
                            <p className="mt-1 flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-white/85">
                              <IoLocationSharp className="h-3 w-3 shrink-0 opacity-90" />
                              <span className="min-w-0 truncate">{plan.location_text}</span>
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Info section */}
                  <div
                    className="relative z-[1] flex gap-4 rounded-[16px] bg-white p-4 pb-5"
                    style={{ marginTop: -overlapAmount, paddingTop: overlapAmount + 12, boxShadow: 'rgba(0, 0, 0, 0.35) 0px 5px 15px' }}
                  >
                    <div className="flex min-w-0 flex-1 flex-col items-start justify-center gap-2">
                      {pillItems.map((item, idx) => {
                        const Icon = PILL_ICONS[item.icon] ?? PILL_ICONS.music;
                        return (
                          <div
                            key={idx}
                            className="inline-flex h-[30px] min-w-0 max-w-full items-center gap-1.5 rounded-[15px] border border-[#E5E7EB]/80 bg-[#F2F2F7] pl-2 pr-2.5 shadow-sm"
                          >
                            <span className="flex shrink-0 items-center justify-center text-[#1C1C1E]">
                              <Icon className="h-[14px] w-[14px]" />
                            </span>
                            <span className="flex min-w-0 flex-1 items-center truncate text-[11px] font-medium leading-none text-[#1C1C1E]">
                              {item.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex min-w-[96px] shrink-0 flex-col items-center justify-center pb-1">
                      <div className="mb-2.5 rounded-lg border border-[#E5E7EB] bg-white p-2">
                        {qrDataUrl ? (
                          <img src={qrDataUrl} width={96} height={96} alt="" className="block size-[96px]" />
                        ) : ticket?.qr_code_hash ? (
                          <QRCodeSVG value={ticket.qr_code_hash} size={96} level="M" />
                        ) : (
                          <div className="flex h-[96px] w-[96px] items-center justify-center rounded bg-[#F3F4F6] text-[#8E8E93]">
                            <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <p className="mt-1.5 text-center text-[14px] font-bold leading-tight text-[#1C1C1E]">{passName}</p>
                      <p className="mt-1.5 min-h-[1.2em] max-w-full px-1 text-center text-[11px] font-medium leading-normal tracking-wide text-[#6B7280] overflow-visible">
                        {ticket?.ticket_number ?? '—'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* View Event button - fixed at bottom, outside scroll area */}
        <div className="shrink-0 flex justify-center px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Link
            href={`/post/${planId}`}
            className="w-full max-w-[340px] rounded-[18px] bg-[#1C1C1E] py-3 text-center text-sm font-bold text-white no-underline shadow-lg hover:bg-[#2d2d2d]"
          >
            View Event
          </Link>
        </div>
      </div>
    );
  };

  if (isMobile) {
    return (
      <div
        className="fixed inset-0 h-screen w-full overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #8B7AB8 0%, #C9A0B8 35%, #F5E6E8 70%, #FFFFFF 100%)',
        }}
      >
        <InnerTicket />
      </div>
    );
  }
  

  return (
    <div className="min-h-screen overflow-y-auto">
      <div className="mx-auto flex min-h-screen max-w-[420px] flex-col">
        <InnerTicket isDesktopLayout />
      </div>
    </div>
  );
}
