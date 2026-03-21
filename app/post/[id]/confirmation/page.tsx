'use client';

import React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUserProfile, getPost, getPostImageUrlOrPlaceholder, getWebUser } from '@/lib/api';
import { buildDetailPills, type AddDetail } from '@/lib/ticketDetailPills';
import { TicketCategoryPills } from '@/app/components/TicketCategoryPills';

function formatDate(date?: string | Date | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(time?: string | null): string {
  if (!time || !String(time).trim()) return '';
  const t = String(time).trim();
  if (/AM|PM/i.test(t)) return t;
  const match = t.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return t;
  let hour = parseInt(match[1], 10);
  const min = match[2];
  const period = hour >= 12 ? 'PM' : 'AM';
  if (hour > 12) hour -= 12;
  if (hour === 0) hour = 12;
  return `${hour}:${min} ${period}`;
}

export default function RegistrationConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const planId = params.id as string;
  const code = (searchParams.get('code') || '').toUpperCase();
  const fromApp = searchParams.get('app') === '1';
  const [loading, setLoading] = React.useState(true);
  const [eventTitle, setEventTitle] = React.useState('Event');
  const [eventDate, setEventDate] = React.useState('');
  const [eventTime, setEventTime] = React.useState('');
  const [eventLocation, setEventLocation] = React.useState('');
  const [eventImage, setEventImage] = React.useState<string | null>(null);
  const [finalCode, setFinalCode] = React.useState(code);
  const [groupId, setGroupId] = React.useState<string | null>(null);
  const [addDetails, setAddDetails] = React.useState<AddDetail[] | undefined>(undefined);

  React.useEffect(() => {
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

  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [postRes, profile] = await Promise.all([
          getPost(planId),
          (async () => {
            const user = getWebUser();
            if (!user?.session_id) return null;
            return getCurrentUserProfile(user.session_id);
          })(),
        ]);
        if (!mounted) return;
        if (postRes.success && postRes.data) {
          const p = postRes.data as Record<string, unknown>;
          setEventTitle((p.title as string) || 'Event');
          setEventDate(formatDate(p.date as string | Date | undefined));
          setEventTime(formatTime((p.time as string) ?? null));
          setEventLocation(String(p.location_text || '').trim());
          const image = getPostImageUrlOrPlaceholder(p as Parameters<typeof getPostImageUrlOrPlaceholder>[0]);
          setEventImage(image || null);
          setGroupId((p.group_id as string) || null);
          setAddDetails(Array.isArray(p.add_details) ? (p.add_details as AddDetail[]) : undefined);
          if (!code) {
            const name = String(profile?.name || 'Guest')
              .replace(/[^a-zA-Z0-9 ]/g, '')
              .trim()
              .split(/\s+/)[0]
              .slice(0, 10)
              .toUpperCase() || 'GUEST';
            const seed = `${planId}_${profile?.user_id || profile?.name || Date.now()}`;
            let hash = 0;
            for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
            const randomPart = Math.abs(hash).toString(36).toUpperCase().padStart(4, '0').slice(-4);
            setFinalCode(`${name}${randomPart}`);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (planId) load();
    return () => {
      mounted = false;
    };
  }, [planId, code]);

  const handleClose = () => {
    router.push(`/post/${planId}`);
  };

  const detailPills = buildDetailPills(addDetails);
  const displayCode = (finalCode || code || '').toUpperCase() || (loading ? '…' : '—');

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      {eventImage ? (
        <img src={eventImage} alt="" className="absolute inset-0 h-full w-full scale-105 object-cover blur-xl" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-[#2d2640] to-black" />
      )}
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 flex min-h-screen flex-col pb-28">
        <header className="relative flex shrink-0 items-center justify-center px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={handleClose}
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
          <div className="grid h-[min(540px,78dvh)] w-full max-w-[308px] grid-rows-[63fr_37fr] overflow-hidden rounded-[28px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <div className="relative isolate min-h-0 overflow-hidden rounded-tl-[28px] rounded-tr-[28px] rounded-bl-[26px] rounded-br-[26px] bg-white">
              <div className="absolute inset-0 bg-white" aria-hidden />
              {eventImage ? (
                <img
                  src={eventImage}
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
                  <span className="shrink-0">{eventTime}</span>
                </div>
                {eventLocation ? (
                  <p className="mt-1.5 line-clamp-2 text-[13px] text-white/85 sm:text-sm">{eventLocation}</p>
                ) : null}
              </div>
            </div>

            <div className="flex min-h-0 gap-3 overflow-y-auto rounded-b-[28px] bg-white px-3 pb-3 pt-4 sm:gap-3.5 sm:px-4 sm:pb-4 sm:pt-5">
              <div className="min-w-0 flex-1">
                <TicketCategoryPills pills={detailPills} emptyLabel="You're registered" />
              </div>
              <div className="flex w-[112px] shrink-0 flex-col items-center justify-center sm:w-[118px]">
                <p className="text-center text-[10px] font-semibold uppercase tracking-wide text-[#8E8E93] sm:text-[11px]">
                  Check-in code
                </p>
                <p className="mt-2 text-center text-base font-bold leading-tight tracking-[0.12em] text-[#1C1C1E] sm:text-lg">
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

        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-[#1C1C1E]/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
            <p className="min-w-0 flex-1 text-[13px] leading-snug text-white/90">
              Join the event chat on the <span className="font-semibold text-white">weknd.</span> app
            </p>
            <a
              href={groupId ? `vybeme://chat/${encodeURIComponent(groupId)}` : 'vybeme://'}
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
