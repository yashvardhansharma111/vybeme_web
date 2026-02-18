import type { Metadata } from 'next';
import { getPostOgData } from '@/lib/og-post';

const WEB_BASE = process.env.NEXT_PUBLIC_WEB_URL || 'https://app.vybeme.in';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const post = await getPostOgData(id);
  const url = `${WEB_BASE}/post/${id}`;
  if (!post) {
    return {
      title: 'vybeme. — Find people for your plans',
      description: '',
      openGraph: { title: 'vybeme.', description: '', url, type: 'website' },
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
  // 1200x630 = WhatsApp/Facebook recommended for large preview image. ?v=4 busts cache after OG size change.
  const shareImageUrl = `${WEB_BASE}/api/og/post/${id}?v=4`;
  openGraph.images = [{ url: shareImageUrl, width: 1200, height: 630, alt: post.title }];
  return {
    title: post.title,
    description: ogDescription,
    openGraph,
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: ogDescription,
      images: [shareImageUrl],
    },
  };
}

export default function PostLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
