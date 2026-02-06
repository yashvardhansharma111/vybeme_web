'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppHeader } from '../components/AppHeader';
import { sendOTP } from '@/lib/api';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = phone.replace(/\D/g, '');
    if (normalized.length < 10) {
      setError('Enter a valid phone number');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await sendOTP(normalized);
      if (res.success && res.data?.otp_id) {
        const params = new URLSearchParams({
          phone: normalized,
          redirect,
          otp_id: res.data.otp_id,
        });
        router.push(`/verify-otp?${params.toString()}`);
        return;
      }
      setError(res.message || 'Failed to send OTP');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-100/80 to-neutral-900 md:bg-neutral-200">
      <AppHeader />
      <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-md flex-col items-center justify-center p-6 md:py-12">
        <div className="w-full rounded-2xl bg-white p-6 shadow-lg md:shadow-xl">
          <h1 className="text-center text-xl font-semibold text-neutral-900">
            Signup via Phone
          </h1>
          <form onSubmit={handleSubmit} className="mt-6">
            <label className="block text-sm font-medium text-neutral-600">
              Enter Phone number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
              autoComplete="tel"
            />
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full rounded-xl bg-black py-3 font-medium text-white disabled:opacity-60"
            >
              {loading ? 'Sending…' : 'Next'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-rose-100/80 to-neutral-900">
        <AppHeader />
        <div className="flex min-h-[50vh] items-center justify-center p-4">
          <p className="text-neutral-500">Loading…</p>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
