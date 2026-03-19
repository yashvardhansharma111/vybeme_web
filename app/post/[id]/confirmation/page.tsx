'use client';

import React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUserProfile, getPost, getPostImageUrlOrPlaceholder, getWebUser } from '@/lib/api';

function formatEventDateAndTime(date?: string | Date | null, time?: string | null): string {
  if (!date) return time?.trim() || '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  const rawTime = (time ?? '').trim();
  if (!rawTime) return dateStr;
  if (/AM|PM/i.test(rawTime)) return `${dateStr} | ${rawTime}`;
  const match = rawTime.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return `${dateStr} | ${rawTime}`;
  let hour = parseInt(match[1], 10);
  const min = match[2];
  const period = hour >= 12 ? 'PM' : 'AM';
  if (hour > 12) hour -= 12;
  if (hour === 0) hour = 12;
  return `${dateStr} | ${hour}:${min} ${period}`;
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
  const [eventDateTime, setEventDateTime] = React.useState('');
  const [eventLocation, setEventLocation] = React.useState('');
  const [eventImage, setEventImage] = React.useState<string | null>(null);
  const [finalCode, setFinalCode] = React.useState(code);

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
          const p = postRes.data as any;
          setEventTitle(p.title || 'Event');
          setEventDateTime(formatEventDateAndTime(p.date, p.time));
          setEventLocation((p.location_text || '').trim());
          const image = getPostImageUrlOrPlaceholder(p);
          setEventImage(image || null);
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
            setFinalCode(`${name}-${randomPart}`);
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

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#f3f3f4]">
      <div className="relative z-10 flex flex-col px-4 pb-10 pt-6 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-700 hover:bg-black/5"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h1 className="text-base font-semibold text-neutral-900">Booking Confirmed</h1>
        </div>

        <div className="mx-auto w-full max-w-sm rounded-2xl bg-white p-4 shadow-md">
          <div className="mx-auto h-32 w-28 overflow-hidden rounded-xl bg-neutral-200">
            {eventImage ? (
              <img src={eventImage} alt={eventTitle} className="h-full w-full object-cover" />
            ) : null}
          </div>
          <p className="mt-3 text-center text-sm font-semibold text-neutral-900">{eventTitle}</p>
          {eventDateTime ? <p className="mt-1 text-center text-xs text-neutral-500">{eventDateTime}</p> : null}
          {eventLocation ? <p className="mt-0.5 text-center text-xs text-neutral-500">{eventLocation}</p> : null}
          <div className="mt-3 rounded-xl border border-neutral-200 px-3 py-2">
            <p className="text-center text-[11px] text-neutral-500">Your check-in code is</p>
            <p className="mt-1 text-center text-base font-bold tracking-wide text-neutral-900">
              {finalCode || code || (loading ? '...' : 'RSVP')}
            </p>
          </div>
          <p className="mt-3 text-center text-[11px] text-neutral-500">You will receive a WhatsApp confirmation</p>
        </div>

        <div className="mx-auto mt-6 w-full max-w-sm">
          <Link href={`/post/${planId}`} className="block w-full rounded-full bg-[#1C1C1E] py-3 text-center text-sm font-semibold text-white">
            View event
          </Link>
        </div>
      </div>
    </div>
  );
}