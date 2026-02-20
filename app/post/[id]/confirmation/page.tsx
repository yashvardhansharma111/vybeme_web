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
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden">

      {/* Golden White Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#f6e7c1] via-[#f8f4ea] to-white" />

      {/* Granular Blur Layer */}
      <div className="absolute inset-0 backdrop-blur-2xl bg-white/30" />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col px-6 pt-6 pb-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={handleClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/10 backdrop-blur-md"
          >
            <svg className="h-5 w-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <h1 className="text-lg font-semibold text-black">
            Booking Confirmed
          </h1>
        </div>

        {/* Spacer to push content near middle */}
        <div className="flex-1 flex flex-col justify-center">

          {/* White Confirmation Card */}
          <div className="mx-auto w-full max-w-md rounded-3xl bg-white px-6 py-6 shadow-xl">
            <p className="text-sm text-neutral-500 mb-2">
              Your registration is confirmed for
            </p>

            <h2 className="text-lg font-semibold text-black mb-2">
              Breathe Community 5k Run
            </h2>

            <p className="text-sm text-neutral-600">
              Sun, 22nd Feb | 7:00 AM
            </p>

            <p className="text-sm text-neutral-600">
              Indiranagar, Bengaluru
            </p>
          </div>

          {/* Check-in Code Section */}
          <div className="mt-10 text-center">
            <p className="text-sm text-neutral-600 mb-4">
              Your check-in code is
            </p>

            <div className="mx-auto w-[80%] rounded-full bg-white py-4 shadow-lg">
              <span className="text-xl font-bold tracking-widest text-black">
                {code || 'BREATHE 01'}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-12">
          <p className="text-center text-sm text-neutral-600 mb-6">
            You will receive a WhatsApp confirmation within 24 hours
          </p>

          <Link
            href={`/post/${planId}`}
            className="block w-full rounded-full bg-black py-4 text-center text-sm font-semibold text-white"
          >
            View event
          </Link>
        </div>

      </div>
    </div>
  );
}