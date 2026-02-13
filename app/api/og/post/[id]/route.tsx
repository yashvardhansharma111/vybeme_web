import { ImageResponse } from 'next/og';
import { getPostOgData } from '@/lib/og-post';

// Upper part = image only (2x height). Lower part = grey box with title + 15-char description.
const W = 800;
const IMAGE_HEIGHT = 560; // twice the grey box height
const GREY_BOX_HEIGHT = 120;
const H = IMAGE_HEIGHT + GREY_BOX_HEIGHT; // 680

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const post = await getPostOgData(id);

  if (!post) {
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
      {
        width: W,
        height: 680,
        headers: {
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
      }
    );
  }

  const { title, imageUrl, description } = post;
  const shortDesc = (description || '').replace(/\s+/g, ' ').trim().slice(0, 15);

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
        {/* Upper: image only, no title/tags */}
        <div
          style={{
            width: '100%',
            height: IMAGE_HEIGHT,
            display: 'flex',
            overflow: 'hidden',
          }}
        >
          {imageUrl ? (
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

        {/* Lower: grey box with title + description (15 chars) */}
        <div
          style={{
            width: '100%',
            height: GREY_BOX_HEIGHT,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '14px 20px',
            gap: 4,
            backgroundColor: '#2C2C2E',
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 700, color: '#ffffff' }}>{title}</div>
          {shortDesc ? (
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>{shortDesc}</div>
          ) : null}
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>app.vybeme.in</div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    }
  );
}
