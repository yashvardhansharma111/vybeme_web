import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_HOSTS = [
  'pub-0207f0dc49e34fb4b6814ae803e01a9f.r2.dev',
  'r2.dev',
  'cloudflare-r2.com',
];

function isAllowedUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return ALLOWED_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith('.' + h));
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }
  if (!isAllowedUrl(url)) {
    return NextResponse.json({ error: 'URL not allowed' }, { status: 403 });
  }
  try {
    const res = await fetch(url, {
      headers: { Accept: 'image/*' },
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      return new NextResponse(null, { status: res.status });
    }
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const blob = await res.arrayBuffer();
    return new NextResponse(blob, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (e) {
    console.error('image-proxy:', e);
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 502 });
  }
}
