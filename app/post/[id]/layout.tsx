import type { Metadata } from 'next';
import { getPostOgData } from '@/lib/og-post';

const WEB_BASE = process.env.NEXT_PUBLIC_WEB_URL || 'https://app.vybeme.in';

// Ensure metadata (and og:image) is generated on each request so WhatsApp/crawlers get fresh tags
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const post = await getPostOgData(id);
  const url = `${WEB_BASE}/post/${id}`;
  // Always set an absolute og:image URL so WhatsApp can show a preview (API route returns fallback if post missing)
  const shareImageUrl = `${WEB_BASE}/api/og/post/${id}?v=5`;
  if (!post) {
    return {
      title: 'vybeme. — Find people for your plans',
      description: 'Check out this plan on vybeme.',
      openGraph: {
        title: 'vybeme.',
        description: 'Check out this plan on vybeme.',
        url,
        type: 'website',
        siteName: 'vybeme.',
        images: [{ url: shareImageUrl, width: 1200, height: 1260, alt: 'vybeme.' }],
      },
      twitter: { card: 'summary_large_image', title: 'vybeme.', images: [shareImageUrl] },
    };
  }
  // og:description — longer text for WhatsApp/subtitle (recommended ~155 chars)
  const ogDescription = post.description
    ? post.description.split(/\n/).slice(0, 4).join(' ').replace(/\s+/g, ' ').trim().slice(0, 155) || ''
    : '';
  const openGraph: Metadata['openGraph'] = {
    title: post.title,
    description: ogDescription,
    url,
    siteName: 'vybeme.',
    type: 'website',
    locale: 'en_IN',
  };
  // Use tall composite (1200x1260) as primary so preview image is twice as tall; event photo as fallback
  const eventPhotoUrl = post.imageUrl && post.imageUrl.startsWith('http') ? post.imageUrl : null;
  const ogW = 1200;
  const ogH = 1260;
  openGraph.images = eventPhotoUrl
    ? [
        { url: shareImageUrl, width: ogW, height: ogH, alt: post.title },
        { url: eventPhotoUrl, width: ogW, height: ogH, alt: post.title },
      ]
    : [{ url: shareImageUrl, width: ogW, height: ogH, alt: post.title }];
  const primaryImage = shareImageUrl;
  return {
    title: post.title,
    description: ogDescription,
    openGraph,
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: ogDescription,
      images: [primaryImage],
    },
  };
}

export default function PostLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
