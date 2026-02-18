import { ImageResponse } from 'next/og';
import { getPostOgData } from '@/lib/og-post';

// 1200x1260 = twice the previous height so preview image appears taller (event image dominates; bar below).
const W = 1200;
const H = 1260;
const GREY_BOX_HEIGHT = 120;
const IMAGE_HEIGHT = H - GREY_BOX_HEIGHT; // 1140

const FALLBACK_HEADERS = {
  'Cache-Control': 'public, max-age=3600, s-maxage=3600',
  'Content-Type': 'image/png',
};

function fallbackImageResponse() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #fdf2f8 0%, #1c1917 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ fontSize: 48, fontWeight: 700, color: '#1c1917' }}>vybeme.</div>
        <div style={{ fontSize: 24, color: '#57534e', marginTop: 12 }}>Find people for your plans</div>
      </div>
    ),
    { width: W, height: H, headers: FALLBACK_HEADERS }
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const post = await getPostOgData(id);

    if (!post) {
      return fallbackImageResponse();
    }

    const { title, imageUrl, description } = post;
    const shortDesc = (description || '').replace(/\s+/g, ' ').trim().slice(0, 60);

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div
            style={{
              width: '100%',
              height: IMAGE_HEIGHT,
              display: 'flex',
              overflow: 'hidden',
            }}
          >
            {imageUrl && imageUrl.startsWith('http') ? (
              <img
                src={imageUrl}
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(135deg, #e4e4e7 0%, #a1a1aa 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: 28, color: '#71717a', fontWeight: 600 }}>{title}</span>
              </div>
            )}
          </div>
          <div
            style={{
              width: '100%',
              height: GREY_BOX_HEIGHT,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '16px 24px',
              gap: 6,
              backgroundColor: '#2C2C2E',
            }}
          >
            <div style={{ fontSize: 26, fontWeight: 700, color: '#ffffff', lineHeight: 1.2 }}>{title}</div>
            {shortDesc ? (
              <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.9)', lineHeight: 1.3 }}>{shortDesc}</div>
            ) : null}
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>app.vybeme.in</div>
          </div>
        </div>
      ),
      { width: W, height: H, headers: FALLBACK_HEADERS }
    );
  } catch {
    return fallbackImageResponse();
  }
}
