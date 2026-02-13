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
    ? post.description.split(/\n/).slice(0, 2).join(' ').trim().slice(0, 120) || ''
    : '';
  const openGraph: Metadata['openGraph'] = {
    title: post.title,
    description: shortDescription,
    url,
    siteName: 'vybeme.',
  };
  if (post.imageUrl) {
    openGraph.images = [{ url: post.imageUrl, width: 1200, height: 630, alt: post.title }];
  }
  return {
    title: post.title,
    description: shortDescription,
    openGraph,
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: shortDescription,
      images: post.imageUrl ? [post.imageUrl] : undefined,
    },
  };
}

export default function GoPostLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
