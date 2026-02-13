import { NextRequest } from 'next/server';

function isAllowedUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (host === 'api.vybeme.in' || host === 'app.vybeme.in') return true;
    if (host.endsWith('.vybeme.in')) return true;
    if (process.env.NEXT_PUBLIC_API_URL) {
      const apiHost = new URL(process.env.NEXT_PUBLIC_API_URL).hostname.toLowerCase();
      if (host === apiHost) return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Proxies an image from a allowlisted origin so the ticket download (html2canvas)
 * can load it same-origin and avoid CORS/tainted canvas.
 * No backend changes required on the image host.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url || !url.startsWith('http')) {
    return new Response('Missing or invalid url', { status: 400 });
  }
  if (!isAllowedUrl(url)) {
    return new Response('Forbidden', { status: 403 });
  }
  try {
    const res = await fetch(url, {
      headers: { Accept: 'image/*' },
      cache: 'force-cache',
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      return new Response(res.statusText, { status: res.status });
    }
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const body = res.body;
    if (!body) return new Response('No body', { status: 502 });
    return new Response(body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (e) {
    console.error('[image-proxy]', e);
    return new Response('Proxy error', { status: 502 });
  }
}
