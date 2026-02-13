import { ImageResponse } from 'next/og';
import { getPostOgData } from '@/lib/og-post';

// 800x418 keeps PNG under WhatsApp’s ~300KB limit while preserving 1.91:1 large-preview ratio
const W = 800;
const H = 418;

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
        height: H,
        headers: {
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
      }
    );
  }

  const { title, imageUrl, authorName, tags } = post;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          borderRadius: 24,
          overflow: 'hidden',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px 8px',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#1c1917' }}>vybeme.</span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                backgroundColor: '#f4f4f5',
                padding: '6px 10px',
                borderRadius: 10,
              }}
            >
              <div style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: '#22d3ee' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#3f3f46' }}>{authorName}</span>
              <span style={{ fontSize: 10, color: '#71717a' }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 320,
            position: 'relative',
          }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              style={{
                width: '100%',
                height: 320,
                objectFit: 'cover',
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: 320,
                background: 'linear-gradient(135deg, #e4e4e7 0%, #a1a1aa 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: 22, color: '#71717a', fontWeight: 600 }}>{title}</span>
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '12px 20px 14px',
            gap: 6,
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 700, color: '#18181b' }}>{title}</div>
          {tags.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {tags.slice(0, 4).map((tag) => (
                <div
                  key={tag}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: '#f4f4f5',
                    padding: '6px 10px',
                    borderRadius: 8,
                    fontSize: 12,
                    color: '#52525b',
                    fontWeight: 500,
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
              marginTop: 4,
              backgroundColor: '#27272a',
              color: '#ffffff',
              padding: '10px 24px',
              borderRadius: 20,
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            Register Now
          </div>
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
