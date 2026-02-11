'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
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
}

export default function BusinessScanPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<ReturnType<typeof getWebUser>>(null);
  const [profile, setProfile] = useState<{ is_business?: boolean } | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ name?: string; already?: boolean } | null>(null);
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
      if (businessPlans.length && !selectedPlanId) setSelectedPlanId(businessPlans[0].plan_id);
    } catch {
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, [user?.user_id, user?.session_id]);

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
    }
    setScanning(false);
  }, []);

  const startScanner = useCallback(() => {
    if (!selectedPlanId || !user?.user_id || scanning) return;
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
      });
  }, [selectedPlanId, user?.user_id, scanning, stopScanner]);

  useEffect(() => {
    return () => {
      stopScanner();
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch {
          // ignore
        }
        scannerRef.current = null;
      }
    };
  }, [stopScanner]);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F2F2F7]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700" />
      </div>
    );
  }
  if (!user?.user_id) return null;
  if (!loading && profile && !profile.is_business) return null;

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <div
        className="h-36 w-full shrink-0 rounded-b-3xl"
        style={{ background: 'linear-gradient(180deg, #4A3B69 0%, #6B5B8E 50%, #F2F2F7 100%)' }}
      />
      <div className="relative -mt-28 mx-auto max-w-lg px-4 pb-8">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/business" className="flex items-center gap-1 text-white">
            <span className="text-lg">←</span>
            <span className="font-medium">Back</span>
          </Link>
          <h1 className="text-lg font-bold text-white">Scan ticket</h1>
          <div className="w-14" />
        </div>

        <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
          <label className="block text-sm font-semibold text-neutral-600">Event</label>
          <select
            value={selectedPlanId}
            onChange={(e) => {
              stopScanner();
              setSelectedPlanId(e.target.value);
            }}
            className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-[15px] text-neutral-900"
          >
            <option value="">Select event</option>
            {plans.map((p) => (
              <option key={p.plan_id} value={p.plan_id}>
                {p.title ?? 'Event'}
              </option>
            ))}
          </select>
        </div>

        {stats != null && (
          <p className="mb-3 text-[16px] font-semibold text-[#1C1C1E]">
            Checked in: {stats.checked_in} / {stats.total}
          </p>
        )}

        <div className="overflow-hidden rounded-2xl border-2 border-neutral-200 bg-black shadow-lg">
          <div id="qr-reader" className="min-h-[240px]" />
        </div>
        {!scanning && selectedPlanId && (
          <button
            type="button"
            onClick={startScanner}
            className="mt-4 w-full rounded-full bg-[#1C1C1E] py-3 text-[16px] font-bold text-white"
          >
            Start camera
          </button>
        )}
        {scanning && (
          <button
            type="button"
            onClick={stopScanner}
            className="mt-4 w-full rounded-full border-2 border-neutral-300 bg-white py-3 text-[16px] font-semibold text-neutral-800"
          >
            Stop camera
          </button>
        )}

        {scanResult && (
          <div
            className={`mt-4 rounded-2xl p-4 ${
              scanResult.already
                ? 'border-2 border-amber-300 bg-amber-50 text-amber-900'
                : 'border-2 border-green-300 bg-green-50 text-green-900'
            }`}
          >
            <p className="font-semibold">
              {scanResult.already ? 'Already checked in' : 'Checked in'}
            </p>
            <p className="mt-1 text-[15px]">{scanResult.name}</p>
            {scanResult.already && (
              <p className="mt-2 text-sm opacity-90">This ticket was already scanned. No action taken.</p>
            )}
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
            {error}
          </div>
        )}

        {selectedPlanId && (
          <Link
            href={`/business/attendees/${selectedPlanId}`}
            className="mt-6 flex w-full items-center justify-center rounded-full bg-[#E5E5EA] py-3 text-[16px] font-semibold text-[#1C1C1E]"
          >
            Attendee list (manual check-in)
          </Link>
        )}
      </div>
    </div>
  );
}
