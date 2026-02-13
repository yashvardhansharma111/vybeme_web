import type { Metadata } from 'next';
import { getPostOgData } from '@/lib/og-post';

const WEB_BASE = process.env.NEXT_PUBLIC_WEB_URL || 'https://app.vybeme.in';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const post = await getPostOgData(id);
  const url = `${WEB_BASE}/go/post/${id}`;
  if (!post) {
    return {
      title: 'vybeme. — Find people for your plans',
      description: '',
      openGraph: { title: 'vybeme.', description: '', url },
    };
  }
  const shortDescription = post.description
    ? post.description.split(/\n/).slice(0, 3).join(' ').trim().slice(0, 15) || ''
    : '';
  const openGraph: Metadata['openGraph'] = {
    title: post.title,
    description: shortDescription,
    url,
    siteName: 'vybeme.',
  };
  const shareImageUrl = `${WEB_BASE}/api/og/post/${id}?v=2`;
  openGraph.images = [{ url: shareImageUrl, width: 800, height: 418, alt: post.title }];
  return {
    title: post.title,
    description: shortDescription,
    openGraph,
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: shortDescription,
      images: [shareImageUrl],
    },
  };
}

export default function GoPostLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
