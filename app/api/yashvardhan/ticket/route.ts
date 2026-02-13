import { NextRequest, NextResponse } from 'next/server';

const getBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (url) return url.endsWith('/api') ? url : `${url}/api`;
  return 'https://api.vybeme.in/api';
};

/** GET: ticket for plan_id + user_id (for yashvardhan view/download). Uses server-side token. */
export async function GET(request: NextRequest) {
  const planId = request.nextUrl.searchParams.get('plan_id');
  const userId = request.nextUrl.searchParams.get('user_id');
  if (!planId || !userId) return NextResponse.json({ success: false, message: 'plan_id and user_id required' }, { status: 400 });
  const token = process.env.YASHVARDHAN_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ success: false, message: 'Not configured' }, { status: 503 });
  const base = getBaseUrl();
  try {
    const res = await fetch(`${base}/ticket/${planId}/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) return NextResponse.json(json || { success: false }, { status: res.status });
    return NextResponse.json(json);
  } catch (e) {
    console.error('[yashvardhan ticket]', e);
    return NextResponse.json({ success: false, message: 'Failed to fetch ticket' }, { status: 502 });
  }
}
