import { NextRequest, NextResponse } from 'next/server';

const getBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (url) return url.endsWith('/api') ? url : `${url}/api`;
  return 'https://api.vybeme.in/api';
};

/** GET: attendees for a plan. Uses server-side token. */
export async function GET(request: NextRequest) {
  const planId = request.nextUrl.searchParams.get('plan_id');
  if (!planId) return NextResponse.json({ success: false, message: 'plan_id required' }, { status: 400 });
  const token = process.env.YASHVARDHAN_ACCESS_TOKEN;
  const userId = process.env.YASHVARDHAN_USER_ID;
  if (!token || !userId) {
    return NextResponse.json({ success: false, data: { attendees: [] } }, { status: 200 });
  }
  const base = getBaseUrl();
  try {
    const res = await fetch(`${base}/ticket/attendees/${planId}?user_id=${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) return NextResponse.json(json || { success: false }, { status: res.status });
    return NextResponse.json({ success: true, data: json.data ?? json });
  } catch (e) {
    console.error('[yashvardhan attendees]', e);
    return NextResponse.json({ success: false, data: { attendees: [] } }, { status: 200 });
  }
}
