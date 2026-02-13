import { ImageResponse } from 'next/og';
import { getPostOgData } from '@/lib/og-post';

const W = 1200;
const H = 630;

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
            padding: '24px 28px 16px',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#1c1917' }}>vybeme.</span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                backgroundColor: '#f4f4f5',
                padding: '10px 16px',
                borderRadius: 12,
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  backgroundColor: '#22d3ee',
                }}
              />
              <span style={{ fontSize: 16, fontWeight: 600, color: '#3f3f46' }}>{authorName}</span>
              <span style={{ fontSize: 13, color: '#71717a' }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 520,
            position: 'relative',
          }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              style={{
                width: '100%',
                height: 520,
                objectFit: 'cover',
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: 520,
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
            display: 'flex',
            flexDirection: 'column',
            padding: '16px 28px 20px',
            gap: 10,
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 700, color: '#18181b' }}>{title}</div>
          {tags.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
              {tags.slice(0, 4).map((tag) => (
                <div
                  key={tag}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: '#f4f4f5',
                    padding: '8px 14px',
                    borderRadius: 10,
                    fontSize: 15,
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
              marginTop: 8,
              backgroundColor: '#27272a',
              color: '#ffffff',
              padding: '14px 32px',
              borderRadius: 24,
              fontSize: 17,
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
