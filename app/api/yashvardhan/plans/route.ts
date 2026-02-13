import { NextResponse } from 'next/server';

const getBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (url) return url.endsWith('/api') ? url : `${url}/api`;
  return 'https://api.vybeme.in/api';
};

/** GET: list plans (events) for yashvardhan page. Uses server-side token so no auth required on frontend. */
export async function GET() {
  const token = process.env.YASHVARDHAN_ACCESS_TOKEN;
  const userId = process.env.YASHVARDHAN_USER_ID;
  if (!token || !userId) {
    return NextResponse.json({ success: false, data: [], message: 'Not configured' }, { status: 200 });
  }
  const base = getBaseUrl();
  try {
    const res = await fetch(`${base}/user/plans?user_id=${encodeURIComponent(userId)}&limit=50&offset=0`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) return NextResponse.json(json || { success: false }, { status: res.status });
    const raw = json?.data ?? json ?? [];
    const plans = Array.isArray(raw)
      ? raw.filter(
          (p: any) =>
            (p?.type === 'business' || p?.plan_type === 'BusinessPlan') && p?.post_status !== 'deleted' && !p?.is_repost
        )
      : [];
    return NextResponse.json({ success: true, data: plans });
  } catch (e) {
    console.error('[yashvardhan plans]', e);
    return NextResponse.json({ success: false, data: [] }, { status: 200 });
  }
}
