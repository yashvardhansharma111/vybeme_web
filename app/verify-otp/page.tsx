'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppHeader } from '../components/AppHeader';
import { verifyOTP, resendOTP, setWebUser, getCurrentUserProfile } from '@/lib/api';

const OTP_LENGTH = 4;

function VerifyOTPContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') || '';
  // the location the caller asked us to land at after login/registration
  const redirectParam = searchParams.get('redirect') || '/';
  const initialOtpId = searchParams.get('otp_id') || null;
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [otpId, setOtpId] = useState<string | null>(initialOtpId);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const otpString = otp.join('');
  const isComplete = otpString.length === OTP_LENGTH;

  const updateDigit = useCallback((index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    setOtp((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < OTP_LENGTH - 1) {
      setTimeout(() => inputRefs.current[index + 1]?.focus(), 0);
    }
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const digits = pasted.split('');
    setOtp((prev) => {
      const next = [...prev];
      digits.forEach((d, i) => { next[i] = d; });
      return next;
    });
    const focusIndex = Math.min(digits.length, OTP_LENGTH) - 1;
    setTimeout(() => inputRefs.current[focusIndex]?.focus(), 0);
  }, []);

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>, current: string) => {
    if (e.key === 'Backspace' && !current && index > 0) {
      setOtp((prev) => {
        const next = [...prev];
        next[index - 1] = '';
        return next;
      });
      setTimeout(() => inputRefs.current[index - 1]?.focus(), 0);
    }
  }, []);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isComplete || !phone) return;
    setLoading(true);
    setError(null);
    try {
      const res = await verifyOTP(phone, otpString, otpId || '');
      if (process.env.NODE_ENV === 'development') {
        console.log('[verify-otp] verifyOTP response:', { success: res.success, hasData: !!res.data, message: (res as { message?: string }).message });
      }
      if (res.success && res.data) {
        const d = res.data;
        const auth = {
          user_id: d.user_id,
          session_id: d.session_id,
          access_token: d.access_token,
          refresh_token: d.refresh_token,
          is_new_user: d.is_new_user,
        };
        setWebUser(auth);
        if (process.env.NODE_ENV === 'development') {
          console.log('[verify-otp] auth stored, user_id=', auth.user_id, 'redirect param=', redirectParam);
        }

        // if the caller explicitly supplied a location to return to, honour it
        const finalRedirect = redirectParam || '/';

        if (d.is_new_user) {
          // new users must fill in profile details before being redirected
          router.push(`/details?redirect=${encodeURIComponent(finalRedirect)}`);
          return;
        }

        // existing user
        if (finalRedirect && finalRedirect !== '/') {
          // don't override a requested return location, even for businesses
          router.push(finalRedirect);
          return;
        }

        // if no explicit redirect (or it was just '/'), fall back to defaults
        try {
          const profile = await getCurrentUserProfile(auth.session_id);
          if (process.env.NODE_ENV === 'development') {
            console.log('[verify-otp] getCurrentUserProfile:', { is_business: profile?.is_business });
          }
          if (profile?.is_business) {
            router.push('/clubs');
            return;
          }
        } catch (_) {
          // ignore and continue to default push
        }
        router.push(finalRedirect);
      } else {
        setError((res as { message?: string }).message || 'Verification failed');
      }
    } catch (e: unknown) {
      if (process.env.NODE_ENV === 'development') console.warn('[verify-otp] submit error', e);
      setError(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!phone) return;
    setResending(true);
    setError(null);
    try {
      const res = await resendOTP(phone);
      if (res.success && res.data?.otp_id) {
        setOtpId(res.data.otp_id);
        setOtp(Array(OTP_LENGTH).fill(''));
        setTimeout(() => inputRefs.current[0]?.focus(), 0);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Resend failed');
    } finally {
      setResending(false);
    }
  };

  if (!phone) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-100/80 to-neutral-900">
        <AppHeader />
        <div className="flex min-h-[50vh] items-center justify-center p-4">
          <p className="text-neutral-500">Missing phone. Go back to login.</p>
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="ml-2 text-black underline"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-100/80 to-neutral-900 md:bg-neutral-200">
      <AppHeader />
      <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-md flex-col items-center justify-center p-6 md:py-12">
        <div className="w-full rounded-2xl bg-white p-6 shadow-lg md:shadow-xl">
          <h1 className="text-center text-xl font-semibold text-neutral-900">
            Enter OTP
          </h1>
          <p className="mt-1 text-center text-sm text-neutral-500">
            Enter the 4-digit code we sent to your phone
          </p>
          <form onSubmit={handleSubmit} className="mt-6">
            <div className="flex justify-center gap-2">
              {otp.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  maxLength={1}
                  value={d}
                  onChange={(e) => updateDigit(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e, d)}
                  onPaste={handlePaste}
                  className="h-12 w-10 rounded-lg border border-neutral-200 bg-neutral-50 text-center text-lg font-medium text-neutral-900 focus:border-neutral-400 focus:outline-none"
                />
              ))}
            </div>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="mt-4 w-full text-center text-sm text-neutral-600 underline disabled:opacity-60"
            >
              Resend Code
            </button>
            {error && (
              <p className="mt-2 text-center text-sm text-red-600">{error}</p>
            )}
            <button
              type="submit"
              disabled={!isComplete || loading}
              className="mt-4 w-full rounded-xl bg-black py-3 font-medium text-white disabled:opacity-60"
            >
              {loading ? 'Verifying…' : 'Next'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-rose-100/80 to-neutral-900">
        <AppHeader />
        <div className="flex min-h-[50vh] items-center justify-center p-4">
          <p className="text-neutral-500">Loading…</p>
        </div>
      </div>
    }>
      <VerifyOTPContent />
    </Suspense>
  );
}
