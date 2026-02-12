'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { getWebUser, getCurrentUserProfile, getUserPlans, scanQRCode } from '@/lib/api';

const SCAN_COOLDOWN_MS = 2000;

interface Plan {
  plan_id: string;
  title?: string;
  type?: string;
  plan_type?: string;
  post_status?: string;
  is_repost?: boolean;
  date?: string;
  time?: string;
}

function BusinessScanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planIdFromUrl = searchParams.get('plan') ?? '';
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<ReturnType<typeof getWebUser>>(null);
  const [profile, setProfile] = useState<{ is_business?: boolean } | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>(planIdFromUrl);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ name?: string; already?: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ checked_in: number; total: number } | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const processingRef = useRef<boolean>(false);
  const autoStartedRef = useRef<boolean>(false);

  const load = useCallback(async () => {
    if (!user?.user_id) return;
    try {
      setLoading(true);
      const [profileRes, plansRes] = await Promise.all([
        getCurrentUserProfile(user.session_id),
        getUserPlans(user.user_id, 50, 0).catch(() => ({ success: false, data: [] })),
      ]);
      if (profileRes) setProfile({ is_business: !!profileRes.is_business });
      const raw = plansRes.success && Array.isArray(plansRes.data) ? plansRes.data : [];
      const businessPlans = raw.filter(
        (p: Plan) =>
          (p?.type === 'business' || p?.plan_type === 'BusinessPlan') && p?.post_status !== 'deleted' && !p?.is_repost
      );
      setPlans(businessPlans);
      if (planIdFromUrl && businessPlans.some((p: Plan) => p.plan_id === planIdFromUrl)) {
        setSelectedPlanId(planIdFromUrl);
      } else if (businessPlans.length && !planIdFromUrl) {
        setSelectedPlanId(businessPlans[0].plan_id);
      }
    } catch {
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, [user?.user_id, user?.session_id, planIdFromUrl]);

  useEffect(() => {
    setMounted(true);
    setUser(getWebUser());
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!user?.user_id) {
      router.replace('/login');
      return;
    }
    load();
  }, [mounted, user?.user_id, router, load]);

  useEffect(() => {
    if (!mounted || loading || !profile) return;
    if (!profile.is_business) router.replace('/');
  }, [mounted, loading, profile, router]);

  // Auto-start camera once when we have a plan from URL and are ready (no Start/Stop buttons)
  useEffect(() => {
    if (!planIdFromUrl || !selectedPlanId || loading || !user?.user_id || !profile?.is_business || autoStartedRef.current) return;
    autoStartedRef.current = true;
    const t = setTimeout(() => {
      const el = document.getElementById('qr-reader');
      if (el) startScanner();
    }, 400);
    return () => clearTimeout(t);
  }, [planIdFromUrl, selectedPlanId, loading, user?.user_id, profile?.is_business, startScanner]);

  const stopScanner = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      try {
        scannerRef.current.clear();
      } catch {
        // ignore when DOM or state already gone
      }
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  const startScanner = useCallback(() => {
    if (!selectedPlanId || !user?.user_id) return;
    const el = document.getElementById('qr-reader');
    if (!el) return;

    stopScanner();
    setError(null);
    setScanResult(null);

    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 8, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          const hash = decodedText?.trim();
          if (!hash) return;
          const now = Date.now();
          if (processingRef.current) return;
          if (now - lastScanTimeRef.current < SCAN_COOLDOWN_MS) return;
          lastScanTimeRef.current = now;
          processingRef.current = true;

          scanQRCode(hash, user.user_id)
            .then((res) => {
              const data = res.data as Record<string, unknown>;
              const scannedPlanId = (data?.plan as { plan_id?: string })?.plan_id;
              if (scannedPlanId && scannedPlanId !== selectedPlanId) {
                setError('Wrong event – select the correct event.');
                setTimeout(() => setError(null), 4000);
                return;
              }
              setStats({
                checked_in: (data?.checked_in_count as number) ?? 0,
                total: (data?.total as number) ?? 0,
              });
              const attendee = data?.attendee as { name?: string } | undefined;
              const usr = data?.user as { name?: string } | undefined;
              const name = attendee?.name ?? (usr?.name as string) ?? 'Guest';
              const already = !!(data?.already_checked_in as boolean);
              setScanResult({ name, already });
              setError(null);
              if (already) {
                setTimeout(() => setScanResult(null), 6000);
              } else {
                setTimeout(() => setScanResult(null), 4000);
              }
            })
            .catch((err: Error) => {
              setError(err?.message ?? 'Invalid or already used ticket.');
              setTimeout(() => setError(null), 4000);
            })
            .finally(() => {
              processingRef.current = false;
            });
        },
        () => {}
      )
      .then(() => setScanning(true))
      .catch((err: Error) => {
        setError(err?.message ?? 'Could not start camera.');
        scannerRef.current = null;
      });
  }, [selectedPlanId, user?.user_id, stopScanner]);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        try {
          scannerRef.current.clear();
        } catch {
          // ignore on unmount (e.g. navigating back)
        }
        scannerRef.current = null;
      }
      setScanning(false);
    };
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F2F2F7]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700" />
      </div>
    );
  }
  if (!user?.user_id) return null;
  if (!loading && profile && !profile.is_business) return null;

  const selectedPlan = plans.find((p) => p.plan_id === selectedPlanId);
  const formatPlanDate = (d: string | Date | undefined) => {
    if (!d) return '';
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };
  const checkedIn = stats?.checked_in ?? 0;
  const total = stats?.total ?? 0;

  // No plan in URL: show event picker and "Open scanner" (don't send to View Registrations)
  if (!planIdFromUrl) {
    return (
      <div className="min-h-screen bg-[#1C1C1E]">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/clubs" className="flex h-11 w-11 items-center justify-center text-white" aria-label="Back">
            <span className="text-2xl">×</span>
          </Link>
          <h1 className="text-lg font-bold text-white">Scan tickets</h1>
          <div className="w-11" />
        </div>
        <div className="mx-auto max-w-lg px-4 py-6">
          <p className="mb-3 text-sm text-[#8E8E93]">Select an event, then open the scanner.</p>
          {loading || plans.length === 0 ? (
            <p className="text-[#8E8E93]">{loading ? 'Loading events…' : 'No events yet.'}</p>
          ) : (
            <>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#8E8E93]">Event</label>
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/20 bg-[#2C2C2E] px-3 py-2.5 text-[15px] text-white [color-scheme:light]"
                style={{ colorScheme: 'light' }}
              >
                {plans.map((p) => (
                  <option key={p.plan_id} value={p.plan_id} className="bg-white text-[#1C1C1E]">
                    {p.title ?? 'Event'}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => selectedPlanId && router.push(`/clubs/scan?plan=${selectedPlanId}`)}
                disabled={!selectedPlanId}
                className="mt-6 w-full rounded-full bg-white py-3.5 text-base font-bold text-[#1C1C1E] disabled:opacity-50"
              >
                Open scanner
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1C1C1E]">
      {/* Nav – app style */}
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/clubs" className="flex h-11 w-11 items-center justify-center text-white" aria-label="Back">
          <span className="text-2xl">×</span>
        </Link>
        <h1 className="text-lg font-bold text-white">Scanner</h1>
        <Link
          href={selectedPlanId ? `/clubs/attendees/${selectedPlanId}` : '/clubs/attendees'}
          className="flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-2 text-sm font-semibold text-white"
        >
          <span aria-hidden>👤</span>
          Attendee List
        </Link>
      </div>

      {/* Result banner at top – no scrolling needed */}
      {scanResult && (
        <div
          className={`mx-4 mb-3 rounded-xl px-4 py-3 text-center text-base font-semibold ${
            scanResult.already
              ? 'bg-amber-500/30 text-amber-100'
              : 'bg-green-500/30 text-green-100'
          }`}
        >
          {scanResult.already ? (
            <>Already scanned: {scanResult.name ?? 'Guest'}</>
          ) : (
            <>✓ Checked in: {scanResult.name ?? 'Guest'}</>
          )}
        </div>
      )}
      {error && (
        <div className="mx-4 mb-3 rounded-xl bg-red-500/30 px-4 py-3 text-center text-sm font-medium text-red-100">
          {error}
        </div>
      )}

      <div className="mx-auto max-w-lg px-4 pb-8">
        {total > 0 && (
          <p className="mb-3 text-center text-base font-semibold text-white">
            Checked In: {checkedIn}/{total}
          </p>
        )}

        {/* Camera – auto-starts when plan in URL; no Start/Stop buttons */}
        <div className="overflow-hidden rounded-2xl bg-black">
          <div id="qr-reader" className="min-h-[280px] w-full" />
        </div>

        {/* Selected plan card */}
        <div className="mt-5 rounded-2xl bg-white/10 py-4 px-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#8E8E93]">Selected plan</p>
          {selectedPlan ? (
            <>
              <p className="mt-1.5 text-[17px] font-bold text-white">{selectedPlan.title ?? 'Untitled Plan'}</p>
              <p className="mt-1 text-sm text-[#E5E5EA]">
                {formatPlanDate(selectedPlan.date)}
                {selectedPlan.time ? ` · ${selectedPlan.time}` : ''}
              </p>
            </>
          ) : (
            <p className="mt-1.5 text-[15px] text-[#8E8E93]">No plan selected</p>
          )}
        </div>

        {/* Last check-in – summary only; main result is in banner above */}
        <div className="mt-4 rounded-2xl bg-white/10 py-4 px-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#8E8E93]">Last check-in</p>
          <p className="mt-1.5 text-[15px] text-[#E5E5EA]">
            {scanResult ? (scanResult.already ? 'Already scanned' : scanResult.name ?? 'Guest') : 'Scan a ticket to see check-in details'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function BusinessScanPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F2F2F7]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700" />
        </div>
      }
    >
      <BusinessScanContent />
    </Suspense>
  );
}
