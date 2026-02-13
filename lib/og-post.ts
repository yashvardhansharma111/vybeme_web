/**
 * Server-only: fetch post + author name + tags for OG image and metadata.
 */
const BASE_API = process.env.NEXT_PUBLIC_API_URL || 'https://api.vybeme.in';

function toAbsoluteImageUrl(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string' || !raw.trim()) return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  const base = BASE_API.replace(/\/api\/?$/, '');
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${base}${path}`;
}

export type PostOgData = {
  title: string;
  description: string;
  imageUrl: string | null;
  authorName: string;
  tags: string[];
};

export async function getPostOgData(id: string): Promise<PostOgData | null> {
  try {
    const apiBase = BASE_API.endsWith('/api') ? BASE_API : `${BASE_API}/api`;
    const res = await fetch(`${apiBase}/feed/post/${id}`, { next: { revalidate: 120 } });
    const json = await res.json();
    const data = json?.data;
    if (!data) return null;

    const title = data.title || 'Event on Vybeme';
    const description = (data.description || 'Check out this event on Vybeme.').slice(0, 200);
    const rawImage = data.media?.[0]?.url ?? data.image ?? null;
    const imageUrl = toAbsoluteImageUrl(rawImage);

    let authorName = 'Vybeme';
    const userId = data.user_id ?? data.business_id;
    if (userId) {
      try {
        const userRes = await fetch(`${apiBase}/user/profile/${userId}`, { next: { revalidate: 120 } });
        const userJson = await userRes.json();
        const name = userJson?.data?.name ?? userJson?.name;
        if (name && String(name).trim()) authorName = String(name).trim();
      } catch {
        // keep default
      }
    }

    const tags: string[] = [];
    const addDetails = data.add_details || [];
    const detailByType = (type: string) => addDetails.find((d: { detail_type?: string }) => d.detail_type === type);
    const distanceLabel = detailByType('distance')?.title || detailByType('distance')?.description;
    const fbLabel = detailByType('f&b')?.title || detailByType('f&b')?.description;
    const locationLabel = data.location_text?.trim();
    if (distanceLabel) tags.push(String(distanceLabel));
    if (locationLabel) tags.push(String(locationLabel));
    if (fbLabel) tags.push(String(fbLabel));
    if (data.category_main && tags.length < 4) tags.push(String(data.category_main));
    if (data.category_sub?.length && tags.length < 4) {
      for (const sub of data.category_sub) {
        if (sub && tags.length < 4) tags.push(String(sub));
      }
    }

    return { title, description, imageUrl, authorName, tags: tags.slice(0, 6) };
  } catch {
    return null;
  }
}
