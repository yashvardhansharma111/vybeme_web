import type { Metadata } from 'next';
import { getPostOgData } from '@/lib/og-post';

const WEB_BASE = process.env.NEXT_PUBLIC_WEB_URL || 'https://app.vybeme.in';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const post = await getPostOgData(id);
  const url = `${WEB_BASE}/post/${id}`;
  const ogImageUrl = `${WEB_BASE}/api/og/post/${id}`;
  if (!post) {
    return {
      title: 'vybeme. — Find people for your plans',
      description: 'Join on vybeme.',
      openGraph: { title: 'vybeme.', description: 'Join on vybeme.', url },
    };
  }
  const metaDescription = 'Join on vybeme.';
  const imageUrl = post.imageUrl || ogImageUrl;
  return {
    title: post.title,
    description: metaDescription,
    openGraph: {
      title: post.title,
      description: metaDescription,
      url,
      siteName: 'vybeme.',
      images: [{ url: imageUrl, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: metaDescription,
      images: [imageUrl],
    },
  };
}

export default function PostLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
