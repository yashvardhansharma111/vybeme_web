'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import html2canvas from 'html2canvas';

const QRCodeSVG = dynamic(() => import('qrcode.react').then((m) => m.QRCodeSVG), { ssr: false });

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function formatTime(time: string | null | undefined): string {
  if (!time) return '';
  return time;
}

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

interface Plan { plan_id: string; title?: string; date?: string; time?: string; }
interface Attendee { user_id: string; user?: { name?: string } | null; ticket_number: string | null; }
interface TicketData { ticket: any; plan?: any; qr_code_hash?: string; ticket_number?: string; pass_id?: string; price_paid?: number; }

export default function YashvardhanPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null);
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [loadingTicket, setLoadingTicket] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const ticketCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/yashvardhan/events')
      .then((r) => r.json())
      .then((j) => {
        if (j.success && Array.isArray(j.data)) setPlans(j.data);
      })
      .catch(() => setPlans([]))
      .finally(() => setLoadingPlans(false));
  }, []);

  useEffect(() => {
    if (!selectedPlanId) {
      setAttendees([]);
      return;
    }
    setLoadingAttendees(true);
    fetch(`/api/yashvardhan/attendees?plan_id=${encodeURIComponent(selectedPlanId)}`)
      .then((r) => r.json())
      .then((j) => {
        const list = j?.data?.attendees ?? [];
        setAttendees(Array.isArray(list) ? list : []);
      })
      .catch(() => setAttendees([]))
      .finally(() => setLoadingAttendees(false));
  }, [selectedPlanId]);

  const loadTicket = useCallback(async (planId: string, userId: string) => {
    setLoadingTicket(true);
    setTicketData(null);
    try {
      const res = await fetch(`/api/yashvardhan/ticket?plan_id=${encodeURIComponent(planId)}&user_id=${encodeURIComponent(userId)}`);
      const j = await res.json();
      const ticket = j?.data?.ticket ?? j?.ticket;
      const plan = j?.data?.plan ?? j?.plan;
      if (ticket) setTicketData({ ticket, plan });
      else setTicketData(null);
    } catch {
      setTicketData(null);
    } finally {
      setLoadingTicket(false);
    }
  }, []);

  const handleSelectAttendee = useCallback(
    (a: Attendee) => {
      setSelectedAttendee(a);
      loadTicket(selectedPlanId, a.user_id);
    },
    [selectedPlanId, loadTicket]
  );

  const handleDownloadTicket = useCallback(async () => {
    const el = ticketCardRef.current;
    if (!el || !selectedPlanId) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(el, {
        useCORS: true,
        scale: 2,
        backgroundColor: null,
        logging: false,
      });
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `ticket-${selectedPlanId}-${selectedAttendee?.user_id ?? 'user'}.png`;
      a.click();
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  }, [selectedPlanId, selectedAttendee]);

  const backToAttendees = () => {
    setSelectedAttendee(null);
    setTicketData(null);
  };

  const plan = ticketData?.plan ?? ticketData?.ticket?.plan ?? {};
  const ticket = { ...(ticketData?.ticket ?? {}), plan };
  const mainImage = plan.ticket_image ?? plan.media?.[0]?.url ?? null;
  const mainImageSrc = mainImage ? `/api/image-proxy?url=${encodeURIComponent(mainImage)}` : null;
  const passes = plan.passes ?? [];
  const passId = ticket?.pass_id;
  const selectedPass = passId && passes.length ? passes.find((p: any) => p.pass_id === passId) : passes[0];
  const passName = selectedPass?.name ?? 'Ticket';
  const overlapAmount = 40;

  const pillItems = useMemo(() => {
    const icons = ['pricetag-outline', 'navigate-outline', 'restaurant-outline', 'musical-notes-outline'] as const;
    if (!ticket?.plan) return [];
    const p = ticket.plan;
    const addDetails = p.add_details ?? [];
    const detailBy = (t: string) => addDetails.find((d: any) => d.detail_type === t);
    const getLabel = (d: { title?: string; description?: string } | undefined, fallback: string) =>
      (d?.title?.trim() || d?.description?.trim() || fallback?.trim() || '').trim() || null;
    const priceLabel =
      ticket.price_paid > 0
        ? `₹${ticket.price_paid}`
        : passes[0]?.price != null && passes[0].price > 0
          ? `₹${passes[0].price}`
          : 'Free';
    const labels: string[] = [priceLabel];
    const distance = getLabel(detailBy('distance'), p.location_text || '');
    if (distance) labels.push(distance);
    const fb = getLabel(detailBy('f&b'), '');
    if (fb) labels.push(fb);
    addDetails.forEach((d: any) => {
      if (!d || labels.length >= 4) return;
      const t = (d.detail_type || '').toLowerCase();
      if (t === 'distance' || t === 'f&b') return;
      const label = getLabel(d, '');
      if (label && !labels.includes(label)) labels.push(label);
    });
    const category = (p.category_main || (p.category_sub && p.category_sub[0]) || '').trim();
    if (category && labels.length < 4 && !labels.includes(category)) labels.push(category);
    return labels.slice(0, 4).map((label, i) => ({ icon: icons[i], label }));
  }, [ticket, passes]);

  const selectedPlan = plans.find((p) => p.plan_id === selectedPlanId);

  if (selectedAttendee && loadingTicket) {
    return (
      <div className="min-h-screen bg-[#8B7AB8] flex items-center justify-center">
        <p className="text-white/90">Loading ticket…</p>
      </div>
    );
  }

  if (selectedAttendee && !loadingTicket && !ticketData) {
    return (
      <div className="min-h-screen bg-[#8B7AB8] flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-white/90">Could not load ticket.</p>
        <button type="button" onClick={backToAttendees} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#1C1C1E]">
          ← Back to attendees
        </button>
      </div>
    );
  }

  if (selectedAttendee && ticketData) {
    return (
      <div className="min-h-screen bg-[#8B7AB8] overflow-y-auto">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/20 bg-[#8B7AB8]/95 px-4 py-3 backdrop-blur">
          <button type="button" onClick={backToAttendees} className="text-white font-medium">
            ← Back
          </button>
          <span className="text-white font-semibold truncate max-w-[180px]">{selectedAttendee.user?.name ?? selectedAttendee.user_id}</span>
          <button
            type="button"
            onClick={handleDownloadTicket}
            disabled={downloading}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#1C1C1E] disabled:opacity-60"
          >
            {downloading ? '…' : 'Download ticket'}
          </button>
        </div>
        <div className="p-4 pb-10">
          <div
            ref={ticketCardRef}
            className="mx-auto max-w-[420px] rounded-2xl overflow-hidden bg-white shadow-xl"
            style={{
              background: 'linear-gradient(180deg, #8B7AB8 0%, #C9A0B8 35%, #F5E6E8 70%, #FFFFFF 100%)',
            }}
          >
            <div className="p-4 pt-2">
              <div className="rounded-[24px] overflow-hidden bg-white shadow-lg">
                <div className="relative w-full overflow-hidden rounded-t-[24px]">
                  {mainImageSrc ? (
                    <img src={mainImageSrc} alt="" className="block w-full h-auto object-contain" />
                  ) : (
                    <div className="flex aspect-[4/5] w-full items-center justify-center bg-[#94A3B8]">
                      <span className="text-white/60 text-sm">No image</span>
                    </div>
                  )}
                  {mainImageSrc && (
                    <>
                      <div className="absolute bottom-0 left-0 right-0 h-[20%] backdrop-blur-md" style={{ background: 'rgba(0,0,0,0.2)' }} />
                      <div className="absolute inset-x-0 bottom-0 pt-9 pb-4 px-4" style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.75), transparent)' }}>
                        <h2 className="text-xl font-extrabold text-white">{plan.title ?? 'Event'}</h2>
                        <div className="mt-1 flex justify-between text-sm font-semibold text-white/95">
                          <span>{formatDate(plan.date)}</span>
                          <span>{formatTime(plan.time)}</span>
                        </div>
                        {plan.location_text && <p className="mt-0.5 truncate text-xs text-white/85">{plan.location_text}</p>}
                      </div>
                    </>
                  )}
                </div>
                <div
                  className="relative flex gap-4 rounded-b-[20px] bg-white p-4 -mt-6 pt-8"
                  style={{ marginTop: -overlapAmount, paddingTop: overlapAmount + 12 }}
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    {pillItems.map((item, idx) => {
                      const Icon = PILL_ICONS[item.icon];
                      return (
                        <div key={idx} className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white py-2 pl-3 pr-3">
                          {Icon && <span className="flex shrink-0 text-[#1C1C1E]"><Icon /></span>}
                          <span className="min-w-0 max-w-[160px] truncate text-sm font-medium text-[#1C1C1E]">{item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex shrink-0 flex-col items-center">
                    <div className="rounded-xl border border-[#E5E7EB] bg-white p-2">
                      {ticket?.qr_code_hash ? (
                        <QRCodeSVG value={ticket.qr_code_hash} size={100} level="M" />
                      ) : (
                        <div className="h-[100px] w-[100px] rounded bg-[#F3F4F6] flex items-center justify-center text-[#8E8E93] text-xs">No QR</div>
                      )}
                    </div>
                    <p className="text-center text-sm font-bold text-[#1C1C1E] mt-1">{passName}</p>
                    <p className="text-center text-xs font-medium text-[#6B7280]">{ticket?.ticket_number ?? '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const backToEvents = () => setSelectedPlanId('');

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-4">
      <div className="mx-auto max-w-lg">
        <h1 className="text-xl font-bold text-[#1C1C1E] mb-2">Events</h1>
        {loadingPlans ? (
          <p className="text-[#8E8E93]">Loading events…</p>
        ) : plans.length === 0 ? (
          <p className="text-[#8E8E93]">No events. Set YASHVARDHAN_ACCESS_TOKEN and YASHVARDHAN_USER_ID in env.</p>
        ) : (
          <>
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="w-full rounded-xl border border-[#E5E5EA] bg-white px-4 py-3 text-[#1C1C1E]"
            >
              <option value="">Choose an event</option>
              {plans.map((p) => (
                <option key={p.plan_id} value={p.plan_id}>
                  {p.title ?? p.plan_id}
                </option>
              ))}
            </select>
            {selectedPlanId && (
              <div className="mt-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h2 className="text-lg font-semibold text-[#1C1C1E]">
                    Registered users {selectedPlan ? `— ${selectedPlan.title}` : ''}
                  </h2>
                  <button
                    type="button"
                    onClick={backToEvents}
                    className="text-sm text-[#8E8E93] hover:text-[#1C1C1E] shrink-0"
                  >
                    Change event
                  </button>
                </div>
                <p className="text-sm text-[#8E8E93] mb-2">Click a name to view their ticket and download it.</p>
                {loadingAttendees ? (
                  <p className="text-[#8E8E93]">Loading…</p>
                ) : attendees.length === 0 ? (
                  <p className="text-[#8E8E93]">No registered users yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {attendees.map((a) => (
                      <li key={a.user_id}>
                        <button
                          type="button"
                          onClick={() => handleSelectAttendee(a)}
                          className="w-full rounded-xl border border-[#E5E5EA] bg-white px-4 py-3 text-left hover:bg-[#F2F2F7] flex justify-between items-center gap-2"
                        >
                          <span className="font-medium text-[#1C1C1E] truncate">{a.user?.name ?? a.user_id}</span>
                          <span className="text-sm text-[#8E8E93] shrink-0">View & download ticket</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
        <p className="mt-6 text-sm text-[#8E8E93]">
          <Link href="/" className="underline">Back to home</Link>
        </p>
      </div>
    </div>
  );
}
