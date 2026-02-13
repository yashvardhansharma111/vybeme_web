import { ImageResponse } from 'next/og';
import { getPostOgData } from '@/lib/og-post';

/** Instagram Story size: 1080 x 1920 (9:16) */
const W = 1080;
const H = 1920;

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
          <div style={{ fontSize: 56, fontWeight: 700, color: '#1c1917' }}>vybeme.</div>
          <div style={{ fontSize: 28, color: '#57534e', marginTop: 16 }}>Find people for your plans</div>
        </div>
      ),
      { width: W, height: H }
    );
  }

  const { title, imageUrl, authorName, tags } = post;
  const timeLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', hour: 'numeric', minute: '2-digit', hour12: true });

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          borderRadius: 32,
          overflow: 'hidden',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Top bar: user pill top-left, vybeme. top-right */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '48px 40px 32px',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              backgroundColor: '#f4f4f5',
              padding: '16px 24px',
              borderRadius: 20,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: '#22d3ee',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: '#18181b' }}>{authorName}</span>
              <span style={{ fontSize: 16, color: '#71717a' }}>{timeLabel}</span>
            </div>
          </div>
          <span style={{ fontSize: 28, fontWeight: 700, color: '#18181b' }}>vybeme.</span>
        </div>

        {/* Main image - fills most of the card */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 1100,
            position: 'relative',
          }}
        >
          {imageUrl ? (
            <>
              <img
                src={imageUrl}
                alt=""
                style={{
                  width: '100%',
                  height: 1100,
                  objectFit: 'cover',
                }}
              />
              {/* Overlay on bottom-right of image: title, location, time */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 40,
                  right: 40,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: 8,
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                }}
              >
                <span style={{ fontSize: 36, fontWeight: 800, color: 'white' }}>{title}</span>
                {tags.length > 0 && (
                  <span style={{ fontSize: 24, color: 'rgba(255,255,255,0.95)' }}>{tags.slice(0, 2).join(' · ')}</span>
                )}
              </div>
            </>
          ) : (
            <div
              style={{
                width: '100%',
                height: 1100,
                background: 'linear-gradient(135deg, #e4e4e7 0%, #a1a1aa 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: 42, color: '#52525b', fontWeight: 700 }}>{title}</span>
            </div>
          )}
        </div>

        {/* Bottom section: title, tags, CTA */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '40px 40px 56px',
            gap: 20,
            background: '#ffffff',
          }}
        >
          <div style={{ fontSize: 38, fontWeight: 800, color: '#18181b' }}>{title}</div>
          {tags.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
              {tags.slice(0, 4).map((tag) => (
                <div
                  key={tag}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: '#f4f4f5',
                    padding: '12px 20px',
                    borderRadius: 16,
                    fontSize: 20,
                    color: '#52525b',
                    fontWeight: 600,
                  }}
                >
                  {tag}
                </div>
              ))}
            </div>
          )}
          <div
            style={{
              alignSelf: 'center',
              marginTop: 12,
              backgroundColor: '#27272a',
              color: '#ffffff',
              padding: '20px 48px',
              borderRadius: 28,
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            Register Now
          </div>
        </div>
      </div>
    ),
    { width: W, height: H }
  );
}
