'use client';

import React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function RegistrationConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = params.id as string;
  const code = (searchParams.get('code') || '').toUpperCase();

  const handleClose = () => {
    router.push(`/post/${planId}`);
  };

  return (
    <div
      className="fixed inset-0 flex h-screen w-full items-center justify-center bg-white px-4"
    >
      <div className="relative w-full max-w-[420px] rounded-3xl bg-white border border-neutral-200 overflow-hidden shadow-2xl">
        {/* Header */}
        <header className="flex items-center justify-between px-5 pt-4 pb-3 bg-white border-b border-neutral-200">
          <button
            type="button"
            onClick={handleClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h1 className="text-sm font-semibold text-neutral-900 whitespace-nowrap">Booking Confirmed</h1>
          <div className="w-9" />
        </header>

        {/* Body */}
        <div className="px-6 pb-6 pt-1 bg-gradient-to-b from-white/95 via-white to-neutral-100">
          <div className="mb-6 rounded-2xl bg-neutral-50 border border-neutral-200 px-4 py-4 shadow-sm">
            <p className="text-xs font-medium text-neutral-500 mb-1">Your registration is confirmed</p>
            <p className="text-sm text-neutral-700">
              You&apos;re registered for this event. Keep your check‑in code handy for post‑run activities.
            </p>
          </div>

          <div className="mb-6 text-center">
            <p className="text-xs font-semibold text-neutral-500 mb-2 tracking-wide">YOUR CHECK‑IN CODE</p>
            <div className="inline-flex min-w-[210px] items-center justify-center rounded-full bg-neutral-900 px-6 py-3 shadow-lg">
              <span className="text-lg font-extrabold tracking-[0.15em] text-white">
                {code || '— — — —'}
              </span>
            </div>
            <p className="mt-3 text-[11px] text-neutral-500">
              Share this code at the venue to access post‑event activities.
            </p>
          </div>

          <Link
            href={`/post/${planId}`}
            className="mb-1 flex h-11 w-full items-center justify-center rounded-[999px] bg-neutral-900 text-sm font-semibold text-white shadow-md hover:bg-neutral-800 transition-colors"
          >
            View event
          </Link>
          <p className="mt-1 text-center text-[11px] text-neutral-500">
            You&apos;ll also receive a WhatsApp confirmation shortly, if enabled for this event.
          </p>
        </div>
      </div>
    </div>
  );
}

