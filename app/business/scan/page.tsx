'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { getWebUser, getCurrentUserProfile, getUserPlans, scanQRCode } from '@/lib/api';

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
  const user = getWebUser();
  const [profile, setProfile] = useState<{ is_business?: boolean } | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ name?: string; already?: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ checked_in: number; total: number } | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

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
    if (!user?.user_id) {
      router.replace('/login');
      return;
    }
    load();
  }, [user?.user_id, router, load]);

  useEffect(() => {
    if (!loading && profile && !profile.is_business) router.replace('/');
  }, [loading, profile, router]);

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
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          const hash = decodedText?.trim();
          if (!hash) return;

          setScanning(true);
          scanQRCode(hash, user.user_id)
            .then((res) => {
              const data = res.data as Record<string, unknown>;
              const scannedPlanId = (data?.plan as { plan_id?: string })?.plan_id;
              if (scannedPlanId && scannedPlanId !== selectedPlanId) {
                setError('Wrong event – select the correct event.');
                setTimeout(() => setError(null), 3000);
                return;
              }
              setStats({
                checked_in: (data?.checked_in_count as number) ?? 0,
                total: (data?.total as number) ?? 0,
              });
              const attendee = data?.attendee as { name?: string } | undefined;
              const usr = data?.user as { name?: string } | undefined;
              setScanResult({
                name: attendee?.name ?? (usr?.name as string) ?? 'Guest',
                already: !!(data?.already_checked_in as boolean),
              });
              setError(null);
              setTimeout(() => setScanResult(null), 4000);
            })
            .catch((err: Error) => {
              setError(err?.message ?? 'Invalid or already used ticket.');
              setTimeout(() => setError(null), 3000);
            })
            .finally(() => setScanning(false));
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

  if (!user?.user_id || (!loading && profile && !profile.is_business)) return null;

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-lg px-4 py-6">
        <div className="flex items-center gap-4">
          <Link href="/business" className="text-neutral-500 hover:text-neutral-700">
            ← Back
          </Link>
          <h1 className="text-xl font-bold text-neutral-900">Scan ticket</h1>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-neutral-700">Event</label>
          <select
            value={selectedPlanId}
            onChange={(e) => {
              stopScanner();
              setSelectedPlanId(e.target.value);
            }}
            className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
          >
            <option value="">Select event</option>
            {plans.map((p) => (
              <option key={p.plan_id} value={p.plan_id}>
                {p.title ?? 'Event'}
              </option>
            ))}
          </select>
        </div>

        {stats && (
          <p className="mt-3 text-sm text-neutral-600">
            Checked in: {stats.checked_in} / {stats.total}
          </p>
        )}

        <div className="mt-4">
          <div id="qr-reader" className="min-h-[240px] overflow-hidden rounded-xl border border-neutral-200 bg-black" />
          {!scanning && selectedPlanId && (
            <button
              type="button"
              onClick={startScanner}
              className="mt-3 w-full rounded-lg bg-neutral-800 py-2.5 text-sm font-medium text-white hover:bg-neutral-700"
            >
              Start camera
            </button>
          )}
          {scanning && (
            <button
              type="button"
              onClick={stopScanner}
              className="mt-3 w-full rounded-lg border border-neutral-300 py-2.5 text-sm font-medium text-neutral-700"
            >
              Stop camera
            </button>
          )}
        </div>

        {scanResult && (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            {scanResult.already ? 'Already checked in: ' : 'Checked in: '}
            <strong>{scanResult.name}</strong>
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
        )}

        {selectedPlanId && (
          <Link
            href={`/business/attendees/${selectedPlanId}`}
            className="mt-6 block text-center text-sm font-medium text-blue-600 hover:underline"
          >
            View attendee list →
          </Link>
        )}
      </div>
    </div>
  );
}
