'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import {
  getYashvardhanPlans,
  getYashvardhanAttendees,
  getYashvardhanTicket,
} from '@/lib/api';
import { sanitizeOklabForHtml2Canvas } from '@/lib/html2canvas-oklab-fix';
import QRCode from 'qrcode';
import dynamic from 'next/dynamic';
import { FaFlagCheckered, FaMusic, FaBasketballBall, FaDumbbell, FaGlassCheers } from 'react-icons/fa';
import { FaPersonRunning } from 'react-icons/fa6';
import { IoMdShirt } from 'react-icons/io';
import { GiRunningShoe } from 'react-icons/gi';
import { MdFastfood } from 'react-icons/md';
import { PiLinkSimpleBold } from 'react-icons/pi';

const QRCodeSVG = dynamic(() => import('qrcode.react').then((m) => m.QRCodeSVG), { ssr: false });

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(time: string | null | undefined): string {
  if (!time) return '—';
  return time;
}

function getCategoryIconKey(category: string): string {
  const c = (category || '').toLowerCase();
  if (c.includes('sport')) return 'sports';
  if (c.includes('run')) return 'running';
  if (c.includes('fitness') || c.includes('train')) return 'fitness';
  if (c.includes('social') || c.includes('communit')) return 'social';
  return 'music';
}

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
};

const R2_HOST = 'r2.dev';
function getProxiedImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.endsWith(R2_HOST) || u.hostname.includes('r2.dev')) {
      return `/api/image-proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
  } catch {
    return url;
  }
}

function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '—';
  const d = phone.replace(/\D/g, '');
  if (d.length >= 10) return `+91 ${d.slice(-10).slice(0, 5)} ${d.slice(-5)}`;
  return phone;
}

/** Safe filename from username; unique suffix from user_id. */
function ticketFileName(name: string | null | undefined, userId: string): string {
  const base = (name || 'ticket').replace(/[^a-zA-Z0-9_\-\s]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim().slice(0, 40) || 'ticket';
  const suffix = userId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(-8);
  return `${base}-${suffix}.png`;
}

/** Build pill items from ticket (category first, no Free; same as ticket page) */
function getPillItemsFromTicket(t: any): Array<{ icon: string; label: string }> {
  const iconKeys = ['music', 'location', 'fb', 'starting-point'];
  if (!t?.plan) return [{ icon: 'music', label: 'Event' }];
  const plan = t.plan;
  const addDetails = plan.add_details ?? [];
  const detailBy = (key: string) => addDetails.find((d: any) => d.detail_type === key);
  const getLabel = (d: { title?: string; description?: string } | undefined, fallback: string) =>
    (d?.title?.trim() || d?.description?.trim() || fallback?.trim() || '').trim() || null;
  const items: { icon: string; label: string }[] = [];
  const category = (plan.category_main || (plan.category_sub && plan.category_sub[0]) || '').trim();
  if (category) items.push({ icon: getCategoryIconKey(category), label: category });
  const distance = getLabel(detailBy('distance'), plan.location_text || '');
  if (distance) items.push({ icon: 'location', label: distance });
  const fb = getLabel(detailBy('f&b'), '');
  if (fb) items.push({ icon: 'fb', label: fb });
  addDetails.forEach((d: any) => {
    if (!d || items.length >= 4) return;
    const typ = (d.detail_type || '').toLowerCase();
    if (typ === 'distance' || typ === 'f&b') return;
    const label = getLabel(d, '');
    if (label && !items.some((x) => x.label === label)) items.push({ icon: getDetailIconKey(d.detail_type || ''), label });
  });
  return items.slice(0, 4).map((item, i) => ({ ...item, icon: item.icon || iconKeys[i] }));
}

type View = 'plans' | 'attendees' | 'ticket';

export default function YashvardhanPage() {
  const [view, setView] = useState<View>('plans');
  const [plans, setPlans] = useState<Array<{ plan_id: string; title: string; date?: string; time?: string; location_text?: string }>>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [attendees, setAttendees] = useState<Array<{
    user_id: string;
    user: { user_id: string; name: string; profile_image?: string | null; phone_number?: string | null } | null;
    ticket_number: string | null;
  }>>([]);
  const [ticket, setTicket] = useState<any>(null);
  const [ticketForDownload, setTicketForDownload] = useState<any>(null);
  const [downloadingUserId, setDownloadingUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const ticketContentRef = useRef<HTMLDivElement>(null);
  const downloadCardRef = useRef<HTMLDivElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrDataUrlForDownload, setQrDataUrlForDownload] = useState<string | null>(null);
  const [downloadAllFilename, setDownloadAllFilename] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const downloadQueueRef = useRef<Array<{ user_id: string; name: string }>>([]);
  const processNextInQueueRef = useRef<() => void>(() => {});
  const downloadAllModeRef = useRef(false);

  useEffect(() => {
    if (!ticket?.qr_code_hash) {
      setQrDataUrl(null);
      return;
    }
    QRCode.toDataURL(ticket.qr_code_hash, { width: 112, margin: 0 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [ticket?.qr_code_hash]);

  useEffect(() => {
    if (!ticketForDownload?.qr_code_hash) {
      setQrDataUrlForDownload(null);
      return;
    }
    QRCode.toDataURL(ticketForDownload.qr_code_hash, { width: 112, margin: 0 })
      .then(setQrDataUrlForDownload)
      .catch(() => setQrDataUrlForDownload(null));
  }, [ticketForDownload?.qr_code_hash]);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getYashvardhanPlans();
      if (res.success && res.data?.plans) {
        setPlans(res.data.plans);
      } else {
        setError('Failed to load events');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const onSelectPlan = useCallback(async (planId: string) => {
    setSelectedPlanId(planId);
    setLoading(true);
    setError(null);
    try {
      const res = await getYashvardhanAttendees(planId);
      if (res.success && res.data?.attendees) {
        setAttendees(res.data.attendees);
        setView('attendees');
      } else {
        setError('Failed to load attendees');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load attendees');
    } finally {
      setLoading(false);
    }
  }, []);

  const onSelectAttendee = useCallback(async (userId: string) => {
    if (!selectedPlanId) return;
    setLoading(true);
    setError(null);
    setTicket(null);
    try {
      const res = await getYashvardhanTicket(selectedPlanId, userId);
      if (res.success && res.data?.ticket) {
        setTicket(res.data.ticket);
        setView('ticket');
      } else {
        setError('Ticket not found');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  }, [selectedPlanId]);

  const processNextInQueue = useCallback(() => {
    if (downloadQueueRef.current.length === 0) {
      setDownloadingAll(false);
      downloadAllModeRef.current = false;
      return;
    }
    const next = downloadQueueRef.current.shift()!;
    getYashvardhanTicket(selectedPlanId!, next.user_id)
      .then((res) => {
        if (res.success && res.data?.ticket) {
          setTicketForDownload(res.data.ticket);
          setDownloadAllFilename(ticketFileName(next.name, next.user_id));
        } else {
          processNextInQueueRef.current();
        }
      })
      .catch(() => {
        processNextInQueueRef.current();
      });
  }, [selectedPlanId]);

  useEffect(() => {
    processNextInQueueRef.current = processNextInQueue;
  }, [processNextInQueue]);

  const onDownloadAllTickets = useCallback(() => {
    if (!selectedPlanId || attendees.length === 0) return;
    downloadQueueRef.current = attendees.map((a) => ({
      user_id: a.user_id,
      name: a.user?.name ?? 'Unknown',
    }));
    setDownloadingAll(true);
    setError(null);
    downloadAllModeRef.current = true;
    processNextInQueue();
  }, [selectedPlanId, attendees, processNextInQueue]);

  const onDownloadAttendeeTicket = useCallback(async (attendee: { user_id: string; user?: { name?: string | null } | null }) => {
    if (!selectedPlanId) return;
    setDownloadingUserId(attendee.user_id);
    setError(null);
    try {
      const res = await getYashvardhanTicket(selectedPlanId, attendee.user_id);
      if (res.success && res.data?.ticket) {
        setTicketForDownload(res.data.ticket);
        setDownloadAllFilename(ticketFileName(attendee.user?.name, attendee.user_id));
      } else {
        setError('Ticket not found');
        setDownloadingUserId(null);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load ticket');
      setDownloadingUserId(null);
    }
  }, [selectedPlanId]);

  const runDownloadCapture = useCallback(() => {
    const el = downloadCardRef.current;
    const t = ticketForDownload;
    if (!el || !t) return;
    const planId = t.plan?.plan_id ?? selectedPlanId ?? 'ticket';
    const filename = downloadAllFilename ?? `vybeme-ticket-${(planId || 'event').replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 40)}-${(t?.ticket_number || t?.user_id || `ticket-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 30)}.png`;
    html2canvas(el, {
      useCORS: true,
      scale: 2,
      backgroundColor: null,
      logging: false,
      windowWidth: el.scrollWidth,
      windowHeight: el.scrollHeight,
      onclone: sanitizeOklabForHtml2Canvas,
    })
      .then((canvas) => {
        const dataUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename.endsWith('.png') ? filename : `${filename}.png`;
        a.setAttribute('download', a.download);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      })
      .catch((e) => console.error(e))
      .finally(() => {
        setTicketForDownload(null);
        setDownloadingUserId(null);
        setDownloadAllFilename(null);
        if (downloadAllModeRef.current) {
          processNextInQueueRef.current();
        }
      });
  }, [ticketForDownload, selectedPlanId, downloadAllFilename]);

  useEffect(() => {
    if (!ticketForDownload) return;
    const plan = ticketForDownload.plan ?? {};
    const mainImg = plan.ticket_image ?? plan.media?.[0]?.url ?? null;
    if (!mainImg) {
      const id = setTimeout(() => runDownloadCapture(), 200);
      return () => clearTimeout(id);
    }
  }, [ticketForDownload, runDownloadCapture]);

  const handleDownloadImage = useCallback(async () => {
    const el = ticketContentRef.current;
    if (!el || !selectedPlanId) return;
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
      a.download = ticketFileName(ticket?.user?.name, ticket?.user_id ?? 'ticket');
      a.setAttribute('download', a.download);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  }, [selectedPlanId, ticket?.user?.name, ticket?.user_id]);

  const pillItems = useMemo(() => getPillItemsFromTicket(ticket), [ticket]);

  const plan = ticket?.plan ?? {};
  const mainImage = plan.ticket_image ?? plan.media?.[0]?.url ?? null;
  const passes = plan.passes ?? [];
  const passId = ticket?.pass_id;
  const selectedPass = passId && passes.length ? passes.find((p: any) => p.pass_id === passId) : passes[0];
  const passName = selectedPass?.name ?? 'Ticket';
  const overlapAmount = 40;

  if (loading && view === 'plans' && plans.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1C1C1E]">
        <p className="text-white/90">Loading events…</p>
      </div>
    );
  }

  if (view === 'plans') {
    return (
      <div className="min-h-screen bg-[#1C1C1E] p-6">
        <h1 className="mb-4 text-xl font-semibold text-white">Select Event</h1>
        {error && <p className="mb-4 text-red-400">{error}</p>}
        <ul className="space-y-2">
          {plans.map((p) => (
            <li key={p.plan_id}>
              <button
                type="button"
                onClick={() => onSelectPlan(p.plan_id)}
                disabled={loading}
                className="w-full rounded-xl bg-[#2C2C2E] px-4 py-3 text-left text-white hover:bg-[#3A3A3C] disabled:opacity-60"
              >
                <span className="font-medium">{p.title}</span>
                {p.date && <span className="ml-2 text-sm text-white/70">{formatDate(p.date)}</span>}
              </button>
            </li>
          ))}
        </ul>
        {plans.length === 0 && !loading && <p className="text-white/70">No events found.</p>}
      </div>
    );
  }

  if (view === 'attendees') {
    const overlapAmount = 40;
    const dTicket = ticketForDownload;
    const dPlan = dTicket?.plan ?? {};
    const dMainImage = dPlan.ticket_image ?? dPlan.media?.[0]?.url ?? null;
    const dProxiedImage = getProxiedImageUrl(dMainImage) ?? dMainImage;
    const dPasses = dPlan.passes ?? [];
    const dPassId = dTicket?.pass_id;
    const dSelectedPass = dPassId && dPasses.length ? dPasses.find((p: any) => p.pass_id === dPassId) : dPasses[0];
    const dPassName = dSelectedPass?.name ?? 'Ticket';
    const dPillItems = getPillItemsFromTicket(dTicket);

    return (
      <div className="min-h-screen bg-[#1C1C1E] p-6">
        <button
          type="button"
          onClick={() => { setView('plans'); setSelectedPlanId(null); setAttendees([]); }}
          className="mb-4 text-white/80 hover:text-white"
        >
          ← Back to events
        </button>
        <h1 className="mb-4 text-xl font-semibold text-white">Attendees</h1>
        {error && <p className="mb-4 text-red-400">{error}</p>}
        {loading && plans.length > 0 && <p className="mb-4 text-white/70">Loading…</p>}
        {attendees.length > 0 && (
          <button
            type="button"
            onClick={onDownloadAllTickets}
            disabled={loading || downloadingAll}
            className="mb-4 w-full rounded-xl bg-[#8B7AB8] px-4 py-3 text-sm font-semibold text-white hover:bg-[#9B8AC8] disabled:opacity-50"
          >
            {downloadingAll ? 'Downloading…' : 'Download all tickets'}
          </button>
        )}
        <ul className="space-y-2">
          {attendees.map((a) => (
            <li key={a.user_id} className="rounded-xl bg-[#2C2C2E] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onSelectAttendee(a.user_id)}
                  disabled={loading}
                  className="min-w-0 flex-1 text-left text-white hover:opacity-90 disabled:opacity-60"
                >
                  <div className="font-medium">{a.user?.name ?? 'Unknown'}</div>
                  <div className="text-sm text-white/70">#{a.ticket_number ?? '—'}</div>
                  <div className="text-sm text-white/60">{formatPhone(a.user?.phone_number)}</div>
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDownloadAttendeeTicket(a); }}
                  disabled={loading || downloadingUserId !== null || downloadingAll}
                  className="shrink-0 rounded-lg bg-[#8B7AB8] px-3 py-2 text-sm font-medium text-white hover:bg-[#9B8AC8] disabled:opacity-50"
                >
                  {downloadingUserId === a.user_id ? '…' : 'Download'}
                </button>
              </div>
            </li>
          ))}
        </ul>
        {attendees.length === 0 && !loading && <p className="text-white/70">No attendees.</p>}

        {/* Hidden ticket card for download-from-list capture (same layout as ticket view, proxy image) */}
        {dTicket && (
          <div
            aria-hidden
            className="fixed left-[-9999px] top-0 z-[-1] w-[420px] opacity-0 pointer-events-none"
            style={{ background: 'linear-gradient(180deg, #8B7AB8 0%, #C9A0B8 35%, #F5E6E8 70%, #FFFFFF 100%)' }}
          >
            <div
              ref={downloadCardRef}
              className="flex flex-col items-center px-5 pb-4 pt-2"
              style={{ background: 'linear-gradient(180deg, #8B7AB8 0%, #C9A0B8 35%, #F5E6E8 70%, #FFFFFF 100%)' }}
            >
              <div className="relative w-full max-w-[420px]">
                <div className="relative z-[2]">
                  <div className="mb-0 overflow-hidden rounded-[24px] bg-white" style={{ boxShadow: 'rgba(0, 0, 0, 0.35) 0px 5px 15px' }}>
                    <div className="relative w-full overflow-hidden rounded-t-[24px]">
                      {dMainImage ? (
                        <img
                          src={dProxiedImage}
                          alt=""
                          className="block w-full h-auto object-contain"
                          onLoad={() => runDownloadCapture()}
                        />
                      ) : (
                        <div className="flex aspect-[4/5] w-full items-center justify-center bg-[#94A3B8]">
                          <svg className="h-16 w-16 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                          </svg>
                        </div>
                      )}
                      {dMainImage && (
                        <>
                          <div className="absolute bottom-0 left-0 right-0 h-[20%] backdrop-blur-md" style={{ background: 'rgba(0,0,0,0.2)' }} />
                          <div className="absolute inset-x-0 bottom-0 pt-[36px] pb-5 px-5" style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.75), transparent)' }}>
                            <h2 className="text-[26px] font-extrabold leading-tight text-white">{dPlan.title ?? 'Event'}</h2>
                            <div className="mt-2 flex justify-between text-[14px] font-semibold text-white/95">
                              <span>{formatDate(dPlan.date)}</span>
                              <span>{formatTime(dPlan.time)}</span>
                            </div>
                            {dPlan.location_text && <p className="mt-1 truncate text-[13px] text-white/85">{dPlan.location_text}</p>}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div
                    className="relative z-[1] flex gap-5 rounded-[20px] bg-white p-5 pb-6"
                    style={{ marginTop: -overlapAmount, paddingTop: overlapAmount + 16, boxShadow: 'rgba(0, 0, 0, 0.35) 0px 5px 15px' }}
                  >
                    <div className="flex min-w-0 flex-1 flex-col items-start justify-start gap-3">
                        {dPillItems.map((item, idx) => {
                        const Icon = PILL_ICONS[item.icon];
                        return (
                          <div key={idx} className="flex w-fit items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-3 h-[36px]">
                            {Icon && <span className="flex shrink-0 items-center justify-center text-[#1C1C1E]"><Icon className="h-[18px] w-[18px]" /></span>}
                            <span className="text-sm font-medium text-[#1C1C1E] leading-none -mt-px">{item.label}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex min-w-[112px] shrink-0 flex-col items-center justify-center pb-1">
                      <div className="mb-3 rounded-xl border border-[#E5E7EB] bg-white p-2.5">
                        {qrDataUrlForDownload ? (
                          <img src={qrDataUrlForDownload} width={112} height={112} alt="" className="block size-[112px]" />
                        ) : dTicket.qr_code_hash ? (
                          <QRCodeSVG value={dTicket.qr_code_hash} size={112} level="M" />
                        ) : (
                          <div className="flex h-[112px] w-[112px] items-center justify-center rounded bg-[#F3F4F6] text-[#8E8E93]">
                            <svg className="h-14 w-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <p className="mt-2 text-center text-[16px] font-bold leading-tight text-[#1C1C1E]">{dPassName}</p>
                      <p className="mt-2 min-h-[1.25em] max-w-full px-1 text-center text-[13px] font-medium leading-normal tracking-wide text-[#6B7280] overflow-visible">{dTicket.ticket_number ?? '—'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (view === 'ticket' && ticket) {
    return (
      <div className="min-h-screen overflow-y-auto bg-[#8B7AB8]">
        <div className="mx-auto flex min-h-screen max-w-[480px] flex-col">
          <div className="flex min-h-full flex-col">
            <div
              className="absolute inset-0 -z-10"
              style={{
                background: 'linear-gradient(180deg, #8B7AB8 0%, #C9A0B8 35%, #F5E6E8 70%, #FFFFFF 100%)',
              }}
            />
            <header className="flex shrink-0 items-center justify-between px-5 pt-4 pb-2">
              <button
                type="button"
                onClick={() => { setView('attendees'); setTicket(null); }}
                className="flex h-11 w-11 items-center justify-center rounded-full text-white/95 hover:bg-white/10"
                aria-label="Back"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-base font-semibold text-white/98">Booking Confirmed</h1>
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
            </header>
            <p className="shrink-0 text-center text-[11px] font-medium text-[#1C1C1E] px-4 pb-1">
              Pass for {ticket?.user?.name ?? 'Attendee'}
            </p>
            <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
              <div
                ref={ticketContentRef}
                className="flex flex-shrink-0 flex-col items-center px-5 pb-4 pt-2"
                style={{
                  background: 'linear-gradient(180deg, #8B7AB8 0%, #C9A0B8 35%, #F5E6E8 70%, #FFFFFF 100%)',
                }}
              >
                <div className="relative w-full max-w-[420px] flex-shrink-0">
                  <div className="relative z-[2]">
                    <div className="mb-0 overflow-hidden rounded-[24px] bg-white" style={{ boxShadow: 'rgba(0, 0, 0, 0.35) 0px 5px 15px' }}>
                      <div className="relative w-full overflow-hidden rounded-t-[24px]">
                        {mainImage ? (
                          <img
                            src={getProxiedImageUrl(mainImage) ?? mainImage}
                            alt=""
                            className="block w-full h-auto object-contain"
                          />
                        ) : (
                          <div className="flex aspect-[4/5] w-full items-center justify-center bg-[#94A3B8]">
                            <svg className="h-16 w-16 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                            </svg>
                          </div>
                        )}
                        {mainImage && (
                          <>
                            <div
                              className="absolute bottom-0 left-0 right-0 h-[20%] backdrop-blur-md"
                              style={{ background: 'rgba(0,0,0,0.2)' }}
                            />
                            <div
                              className="absolute inset-x-0 bottom-0 pt-[36px] pb-5 px-5"
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
                          </>
                        )}
                      </div>
                    </div>
                    <div
                      className="relative z-[1] flex gap-5 rounded-[20px] bg-white p-5 pb-6"
                      style={{ marginTop: -overlapAmount, paddingTop: overlapAmount + 16, boxShadow: 'rgba(0, 0, 0, 0.35) 0px 5px 15px' }}
                    >
                      <div className="flex flex-1 flex-col items-start justify-start gap-3">
                        {pillItems.map((item, idx) => {
                          const Icon = PILL_ICONS[item.icon];
                          return (
                            <div
                              key={idx}
                              className="flex w-fit items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-3 h-[36px]"
                            >
                              {Icon && <span className="flex shrink-0 items-center justify-center text-[#1C1C1E]"><Icon className="h-[18px] w-[18px]" /></span>}
                              <span className="text-sm font-medium text-[#1C1C1E] leading-none -mt-px">
                                {item.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex min-w-[112px] shrink-0 flex-col items-center justify-center pb-1">
                        <div className="mb-3 rounded-xl border border-[#E5E7EB] bg-white p-2.5">
                          {qrDataUrl ? (
                            <img src={qrDataUrl} width={112} height={112} alt="" className="block size-[112px]" />
                          ) : ticket?.qr_code_hash ? (
                            <QRCodeSVG value={ticket.qr_code_hash} size={112} level="M" />
                          ) : (
                            <div className="flex h-[112px] w-[112px] items-center justify-center rounded bg-[#F3F4F6] text-[#8E8E93]">
                              <svg className="h-14 w-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <p className="mt-2 text-center text-[16px] font-bold leading-tight text-[#1C1C1E]">{passName}</p>
                        <p className="mt-2 min-h-[1.25em] max-w-full px-1 text-center text-[13px] font-medium leading-normal tracking-wide text-[#6B7280] overflow-visible">{ticket?.ticket_number ?? '—'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="min-h-[40px] shrink-0" aria-hidden />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'ticket' && error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#1C1C1E] p-4">
        <p className="text-red-400">{error}</p>
        <button
          type="button"
          onClick={() => { setView('attendees'); setError(null); }}
          className="rounded-[20px] bg-[#2C2C2E] px-6 py-3 text-sm font-semibold text-white"
        >
          Back to attendees
        </button>
      </div>
    );
  }

  return null;
}
