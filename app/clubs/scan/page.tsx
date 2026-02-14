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
  const [scanResult, setScanResult] = useState<{ name?: string; profile_image?: string | null; already?: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ checked_in: number; total: number } | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const processingRef = useRef<boolean>(false);

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
        {
          fps: 10,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const size = Math.floor(Math.min(minEdge * 0.8, 320));
            return { width: size, height: size };
          },
        },
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
              const attendee = data?.attendee as { name?: string; profile_image?: string | null } | undefined;
              const usr = data?.user as { name?: string; profile_image?: string | null } | undefined;
              const name = attendee?.name ?? (usr?.name as string) ?? 'Guest';
              const profile_image = attendee?.profile_image ?? usr?.profile_image ?? null;
              const already = !!(data?.already_checked_in as boolean);
              setScanResult({ name, profile_image, already });
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

  // No plan in URL: show event picker and "Open scanner" – no scroll, fit in viewport
  if (!planIdFromUrl) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-[#1C1C1E]">
        <div className="flex shrink-0 items-center justify-between px-4 py-3">
          <Link href="/clubs" className="flex h-11 w-11 items-center justify-center text-white" aria-label="Back">
            <span className="text-2xl">×</span>
          </Link>
          <h1 className="text-lg font-bold text-white">Scan tickets</h1>
          <div className="w-11" />
        </div>
        <div className="flex min-h-0 flex-1 flex-col justify-between px-4 pb-6 pt-2">
          <div className="mx-auto w-full max-w-lg">
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
              </>
            )}
          </div>
          {!loading && plans.length > 0 && (
            <button
              type="button"
              onClick={() => selectedPlanId && router.push(`/clubs/scan?plan=${selectedPlanId}`)}
              disabled={!selectedPlanId}
              className="mt-4 w-full max-w-lg shrink-0 rounded-full bg-white py-3.5 text-base font-bold text-[#1C1C1E] disabled:opacity-50 mx-auto"
            >
              Open scanner
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#1C1C1E]">
      {/* Nav – fixed */}
      <div className="flex shrink-0 items-center justify-between px-4 py-3">
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

      {/* Result popup – fixed at top below nav, doesn’t cover scanner center; auto-dismiss */}
      {scanResult && (
        <div
          className="absolute left-1/2 top-16 z-20 -translate-x-1/2"
          role="status"
          aria-live="polite"
        >
          <div
            className="flex items-center gap-3 rounded-full border-2 border-white/30 bg-[#2C2C2E] py-2 pl-2 pr-4 shadow-lg"
            style={{
              boxShadow: scanResult.already ? '0 4px 14px rgba(217, 119, 6, 0.4)' : '0 4px 14px rgba(22, 163, 74, 0.4)',
            }}
          >
            <div className="relative shrink-0">
              {scanResult.profile_image ? (
                <img
                  src={scanResult.profile_image}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover bg-[#3A3A3C]"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3A3A3C] text-lg font-semibold text-white">
                  {(scanResult.name ?? 'G').charAt(0).toUpperCase()}
                </div>
              )}
              {!scanResult.already && (
                <span
                  className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white"
                  aria-hidden
                >
                  ✓
                </span>
              )}
            </div>
            <span className="text-sm font-semibold text-white">
              {scanResult.already ? `Already scanned: ${scanResult.name ?? 'Guest'}` : (scanResult.name ?? 'Guest')}
            </span>
          </div>
        </div>
      )}
      {error && (
        <div
          className="absolute left-4 right-4 top-16 z-20 mx-auto max-w-sm rounded-xl bg-red-600/95 px-4 py-2.5 text-center text-sm font-medium text-white shadow-lg"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Scanner area – fills space, not scrollable */}
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Checked-in count – one line above scanner */}
        {total > 0 && (
          <p className="shrink-0 py-1.5 text-center text-sm font-semibold text-white">
            Checked In: {checkedIn}/{total}
          </p>
        )}

        {/* Camera – takes remaining height so QR is large, no zoom needed */}
        <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
          <div id="qr-reader" className="absolute inset-0 h-full w-full" />
        </div>

        {/* Bottom strip – compact, no scroll */}
        <div className="shrink-0 px-4 py-3">
          {!scanning && selectedPlanId && (
            <button
              type="button"
              onClick={startScanner}
              className="w-full rounded-full bg-white py-3 text-base font-bold text-[#1C1C1E]"
            >
              Start camera
            </button>
          )}
          {scanning && (
            <button
              type="button"
              onClick={stopScanner}
              className="w-full rounded-full border-2 border-white/30 bg-white/10 py-2.5 text-base font-semibold text-white"
            >
              Stop camera
            </button>
          )}
          <p className="mt-2 truncate text-center text-xs text-[#8E8E93]">
            {selectedPlan ? selectedPlan.title ?? 'Event' : 'No event selected'}
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
