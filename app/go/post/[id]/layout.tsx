import type { Metadata } from 'next';

const BASE_API = process.env.NEXT_PUBLIC_API_URL || 'https://api.vybeme.in';
const WEB_BASE = process.env.NEXT_PUBLIC_WEB_URL || 'https://app.vybeme.in';

async function getPostForMeta(id: string) {
  try {
    const url = `${BASE_API.endsWith('/api') ? BASE_API : `${BASE_API}/api`}/feed/post/${id}`;
    const res = await fetch(url, { next: { revalidate: 120 } });
    const json = await res.json();
    const data = json?.data;
    if (!data) return null;
    const title = data.title || 'Event on Vybeme';
    const description = (data.description || 'Check out this event on Vybeme.').slice(0, 200);
    const image = data.media?.[0]?.url ?? data.image ?? null;
    const imageUrl = image && !image.startsWith('http') ? `${BASE_API.replace(/\/api$/, '')}${image}` : image;
    return { title, description, imageUrl };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const post = await getPostForMeta(id);
  const url = `${WEB_BASE}/go/post/${id}`;
  if (!post) {
    return {
      title: 'Vybeme — Find people for your plans',
      description: 'Check out this plan on Vybeme.',
      openGraph: { title: 'Vybeme', description: 'Check out this plan on Vybeme.', url },
    };
  }
  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      siteName: 'Vybeme',
      images: post.imageUrl ? [{ url: post.imageUrl, width: 1200, height: 630, alt: post.title }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: post.imageUrl ? [post.imageUrl] : [],
    },
  };
}

export default function GoPostLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
