'use client';

import React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  getCurrentUserProfile,
  getPost,
  getPostImageUrlOrPlaceholder,
  getUserTicket,
  getWebUser,
} from '@/lib/api';
import { buildDetailPills, type AddDetail } from '@/lib/ticketDetailPills';
import { TicketCategoryPills } from '@/app/components/TicketCategoryPills';

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
  const codeParam = (searchParams.get('code') || '').trim();
  const fromApp = searchParams.get('app') === '1';
  const [loading, setLoading] = React.useState(true);
  const [eventTitle, setEventTitle] = React.useState('Event');
  const [eventDateLine, setEventDateLine] = React.useState('');
  const [eventLocation, setEventLocation] = React.useState('');
  const [eventImage, setEventImage] = React.useState<string | null>(null);
  const [finalCode, setFinalCode] = React.useState(codeParam);
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
        const user = getWebUser();
        const [postRes, profile] = await Promise.all([
          getPost(planId),
          user?.session_id ? getCurrentUserProfile(user.session_id) : Promise.resolve(null),
        ]);
        if (!mounted) return;
        if (postRes.success && postRes.data) {
          const p = postRes.data as Record<string, unknown>;
          setEventTitle((p.title as string) || 'Event');
          const dateStr = formatOrdinalDate(p.date as string | Date | undefined);
          const timeStr = formatTime((p.time as string) ?? null);
          setEventDateLine(
            timeStr ? `${dateStr || '—'} | ${timeStr} onwards` : dateStr || '—'
          );
          setEventLocation(String(p.location_text || '').trim());
          const image = getPostImageUrlOrPlaceholder(p as Parameters<typeof getPostImageUrlOrPlaceholder>[0]);
          setEventImage(image || null);
          setGroupId((p.group_id as string) || null);
          setAddDetails(Array.isArray(p.add_details) ? (p.add_details as AddDetail[]) : undefined);
        }

        let resolvedCode = codeParam;
        if (!resolvedCode && user?.user_id && planId) {
          try {
            const tr = await getUserTicket(planId, user.user_id);
            const c = (tr?.data as { ticket?: { checkin_code?: string } })?.ticket?.checkin_code?.trim();
            if (c) resolvedCode = c;
          } catch {
            /* ignore */
          }
        }
        if (!resolvedCode && profile?.name) {
          const name =
            String(profile.name || 'Guest')
              .replace(/[^a-zA-Z ]/g, '')
              .trim()
              .split(/\s+/)[0]
              .slice(0, 12)
              .toUpperCase() || 'GUEST';
          const seed = `${planId}_${profile?.user_id || profile?.name || Date.now()}`;
          let hash = 0;
          for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
          const n = (Math.abs(hash) % 99) + 1;
          resolvedCode = `${name} ${String(n).padStart(2, '0')}`;
        }
        if (mounted && resolvedCode) setFinalCode(resolvedCode);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (planId) load();
    return () => {
      mounted = false;
    };
  }, [planId, codeParam]);

  const handleClose = () => {
    router.push(`/post/${planId}`);
  };

  const detailPills = buildDetailPills(addDetails);
  const displayCode = (finalCode || codeParam || '').toUpperCase() || (loading ? '…' : '—');

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="relative flex shrink-0 items-center justify-center border-b border-neutral-200 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={handleClose}
          className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-neutral-800"
          aria-label="Close"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h1 className="text-center text-lg font-bold tracking-tight text-neutral-900">Booking Confirmed</h1>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-8 pt-6">
        <div className="overflow-hidden rounded-2xl bg-[#F2F2F7] p-4 shadow-sm ring-1 ring-black/[0.04] sm:p-5">
          <h2 className="text-xl font-bold leading-tight tracking-tight text-neutral-900">{eventTitle}</h2>
          <p className="mt-2 text-sm leading-snug text-neutral-600">
            {eventLocation ? `${eventDateLine || '—'} | ${eventLocation}` : eventDateLine || '—'}
          </p>
          <div className="mt-4 overflow-hidden rounded-xl bg-neutral-200">
            {eventImage ? (
              <img src={eventImage} alt="" className="h-44 w-full object-cover sm:h-48" />
            ) : (
              <div className="flex h-44 w-full items-center justify-center bg-gradient-to-br from-neutral-300 to-neutral-400 sm:h-48" />
            )}
          </div>
        </div>

        <div className="mt-5">
          <TicketCategoryPills layout="row" pills={detailPills} emptyLabel="Event details" />
        </div>

        <p className="mt-8 text-center text-[15px] text-neutral-600">Your check-in code is</p>
        <div className="mx-auto mt-3 w-full max-w-sm rounded-full bg-[#F2F2F7] px-5 py-5 text-center ring-1 ring-black/[0.06]">
          <p className="text-2xl font-extrabold uppercase tracking-wide text-neutral-900 sm:text-3xl">{displayCode}</p>
        </div>

        <p className="mt-6 text-center text-[13px] leading-relaxed text-neutral-500">
          You will receive a WhatsApp confirmation within 24 hours
        </p>

        <Link
          href={`/post/${planId}`}
          className="mt-8 w-full rounded-full bg-[#1C1C1E] py-4 text-center text-base font-bold text-white no-underline shadow-sm"
        >
          View event
        </Link>
      </main>

      <div className="mt-auto border-t border-neutral-200 bg-neutral-50 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <p className="min-w-0 flex-1 text-[13px] leading-snug text-neutral-700">
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
      </div>
    </div>
  );
}
