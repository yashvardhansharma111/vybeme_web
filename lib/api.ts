/**
 * Web API client for vybeme backend.
 * Uses sessionStorage for tokens (no AsyncStorage on web).
 */

const getBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (url) return url.endsWith('/api') ? url : `${url}/api`;
  return 'https://api.vybeme.in/api';
};

const BASE_URL = getBaseUrl();

const STORAGE_KEY = 'vybeme_web_user';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export interface WebUser {
  user_id: string;
  session_id: string;
  access_token: string;
  refresh_token: string;
  is_new_user?: boolean;
}

function getStoredUser(): WebUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      if (process.env.NODE_ENV === 'development') console.log('[auth] getStoredUser: no value in sessionStorage');
      return null;
    }
    const parsed = JSON.parse(raw) as WebUser;
    if (process.env.NODE_ENV === 'development') console.log('[auth] getStoredUser: found user_id=', parsed?.user_id);
    return parsed;
  } catch (e) {
    if (process.env.NODE_ENV === 'development') console.warn('[auth] getStoredUser: parse error', e);
    return null;
  }
}

function setStoredUser(user: WebUser | null): void {
  if (typeof window === 'undefined') return;
  if (user) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    if (process.env.NODE_ENV === 'development') console.log('[auth] setStoredUser: stored user_id=', user.user_id);
  } else {
    sessionStorage.removeItem(STORAGE_KEY);
    if (process.env.NODE_ENV === 'development') console.log('[auth] setStoredUser: cleared');
  }
}

export function getWebUser(): WebUser | null {
  return getStoredUser();
}

export function setWebUser(user: WebUser | null): void {
  setStoredUser(user);
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}${endpoint}`;
  const user = getStoredUser();
  const publicEndpoints = [
    '/auth/send-otp',
    '/auth/verify-otp',
    '/auth/resend-otp',
    '/auth/refresh-token',
  ];
  const needsAuth = !publicEndpoints.some((ep) => endpoint.includes(ep));

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (needsAuth && user?.access_token) {
    headers['Authorization'] = `Bearer ${user.access_token}`;
  }

  const res = await fetch(url, { ...options, headers });
  const contentType = res.headers.get('content-type');
  let data: ApiResponse<T>;
  if (contentType?.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();
    throw new Error(text || `Request failed ${res.status}`);
  }

  if (!res.ok) {
    throw new Error(data.message || `Request failed ${res.status}`);
  }
  return data;
}

// Auth
export async function sendOTP(phone_number: string) {
  return request<{ otp_id: string; expires_at: string }>('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ phone_number }),
  });
}

export async function verifyOTP(phone_number: string, otp_code: string, otp_id: string) {
  return request<{
    user_id: string;
    session_id: string;
    is_new_user: boolean;
    access_token: string;
    refresh_token: string;
  }>('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phone_number, otp_code, otp_id }),
  });
}

export async function resendOTP(phone_number: string) {
  return request<{ otp_id: string }>('/auth/resend-otp', {
    method: 'POST',
    body: JSON.stringify({ phone_number }),
  });
}

// User
export async function getCurrentUser(session_id: string) {
  return request<any>(`/user/me?session_id=${session_id}`);
}

/** Get current user profile (includes gender for women-only post check). */
export async function getCurrentUserProfile(session_id: string) {
  const res = await getCurrentUser(session_id);
  return res.success ? (res.data ?? null) : null;
}

export async function updateProfile(session_id: string, data: { name?: string; gender?: string }) {
  return request<any>('/user/update', {
    method: 'POST',
    body: JSON.stringify({ session_id, ...data }),
  });
}

export async function getUserProfile(user_id: string) {
  return request<any>(`/user/profile/${user_id}`);
}

export async function getUserStats(user_id: string) {
  return request<{ plans_count: number; interactions_count: number }>(
    `/user/stats?user_id=${user_id}`
  );
}

// Feed / Post — image from media (same as app)
const DEFAULT_POST_IMAGE = 'https://picsum.photos/id/1011/200/300';

export function getPostImageUrl(post: { media?: Array<{ url: string; type?: string }>; image?: string | null } | null): string | null {
  if (!post) return null;
  if (post.media && post.media.length > 0 && post.media[0].url) return post.media[0].url;
  if (post.image && String(post.image).trim()) return post.image;
  return null;
}

export function getPostImageUrlOrPlaceholder(post: { media?: Array<{ url: string; type?: string }>; image?: string | null } | null): string {
  return getPostImageUrl(post) || DEFAULT_POST_IMAGE;
}

export async function getPost(post_id: string) {
  return request<any>(`/feed/post/${post_id}`);
}

export async function createJoinRequest(post_id: string, user_id: string, message?: string) {
  return request<{ request_id: string }>('/post/join', {
    method: 'POST',
    body: JSON.stringify({ post_id, user_id, message }),
  });
}

// Business event: register and get ticket
export async function registerForBusinessEvent(
  plan_id: string,
  user_id: string,
  pass_id?: string,
  message?: string
) {
  return request<{ registration: unknown; ticket: unknown }>('/ticket/register', {
    method: 'POST',
    body: JSON.stringify({ plan_id, user_id, pass_id, message }),
  });
}

export async function getUserTicket(plan_id: string, user_id: string) {
  return request<any>(`/ticket/${plan_id}/${user_id}`);
}

/** Get all tickets for the current user (for My Tickets). */
export async function getTicketsByUser(user_id: string) {
  return request<{ tickets: Array<{
    ticket_id: string;
    ticket_number: string;
    plan: { plan_id: string; title?: string; date?: string; media?: Array<{ url: string }> } | null;
  }> }>(`/ticket/user/${user_id}`, { method: 'GET' });
}

/** Get user's plans (for business: filter type === 'business'). */
export async function getUserPlans(user_id: string, limit = 50, offset = 0) {
  return request<any[]>(`/user/plans?user_id=${encodeURIComponent(user_id)}&limit=${limit}&offset=${offset}`, { method: 'GET' });
}

/** Get attendee list for a plan (organizer only). */
export async function getAttendeeList(plan_id: string, user_id: string) {
  return request<{
    attendees: Array<{
      registration_id: string;
      user_id: string;
      user: { user_id: string; name: string; profile_image?: string | null } | null;
      ticket_id: string | null;
      ticket_number: string | null;
      status: string;
      checked_in: boolean;
      checked_in_at: string | null;
      checked_in_via?: 'qr' | 'manual' | null;
      price_paid: number;
      created_at: string;
    }>;
    statistics: { total: number; checked_in: number; pending: number };
  }>(`/ticket/attendees/${plan_id}?user_id=${encodeURIComponent(user_id)}`, { method: 'GET' });
}

/** Get guest list for an event (public: who's coming). */
export async function getGuestList(plan_id: string) {
  return request<{ guests: Array<{ user_id: string; name: string; profile_image: string | null; bio?: string; is_returning?: boolean }>; total: number }>(
    `/ticket/guest-list/${plan_id}`,
    { method: 'GET' }
  );
}

/** Scan QR code and check in attendee (organizer only). */
export async function scanQRCode(qr_code_hash: string, scanner_user_id: string) {
  return request<{
    plan?: { plan_id: string; title?: string; date?: string; time?: string; location_text?: string };
    attendee?: { user_id: string; name?: string; profile_image?: string };
    checked_in_count?: number;
    total?: number;
    already_checked_in?: boolean;
  }>('/ticket/scan', {
    method: 'POST',
    body: JSON.stringify({ qr_code_hash, scanner_user_id }),
  });
}

/** Manual check-in or check-out (organizer only). */
export async function manualCheckIn(registration_id: string, user_id: string, action: 'checkin' | 'checkout') {
  return request<any>('/ticket/checkin', {
    method: 'POST',
    body: JSON.stringify({ registration_id, user_id, action }),
  });
}

export async function getFeed(user_id: string | null, limit = 30, offset = 0) {
  return request<any[]>('/feed/home', {
    method: 'POST',
    body: JSON.stringify({
      user_id,
      filters: {},
      pagination: { limit, offset },
    }),
  });
}

// Format feed like the app: fetch user profile per post, image from media[0].url, interacted_users
export interface FormattedPost {
  post_id: string;
  id: string;
  title: string;
  description: string;
  tags?: string[];
  category_sub?: string[];
  image: string | null;
  media?: Array<{ url: string; type?: string }>;
  user?: { id: string; user_id?: string; name: string; profile_image: string | null; time?: string };
  user_id?: string;
  created_at?: string;
  timestamp?: string | Date;
  interaction_count?: number;
  interacted_users?: Array<{ id?: string; user_id?: string; name?: string; profile_image?: string | null; avatar?: string | null }>;
  type?: 'business' | 'regular';
  is_repost?: boolean;
  original_author_name?: string | null;
  original_plan_id?: string;
  [key: string]: unknown;
}

function formatTimestamp(timestamp: string | Date): string {
  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Recently';
  }
}

export async function formatFeedData(posts: any[]): Promise<FormattedPost[]> {
  const userCache: Record<string, { name: string; profile_image: string | null }> = {};

  const fetchUser = async (user_id: string): Promise<{ name: string; profile_image: string | null }> => {
    if (userCache[user_id]) return userCache[user_id];
    try {
      const res = await getUserProfile(user_id);
      if (res.success && res.data) {
        const data = {
          name: res.data.name ?? 'Unknown User',
          profile_image: res.data.profile_image ?? null,
        };
        userCache[user_id] = data;
        return data;
      }
    } catch {
      // 404 or network — use default
    }
    const def = { name: 'Unknown User', profile_image: null };
    userCache[user_id] = def;
    return def;
  };

  const formatted = await Promise.all(
    posts.map(async (post: any) => {
      const user_id = post.user_id ?? post.author_id;
      const userData = user_id ? await fetchUser(user_id) : { name: 'Unknown User', profile_image: null as string | null };
      const isRepost = !!post.is_repost || !!post.repost_data;
      const originalAuthorId = post.repost_data?.original_author_id ?? post.user_id;
      const originalAuthorData = isRepost && originalAuthorId ? await fetchUser(originalAuthorId) : null;
      const imageUrl = getPostImageUrl(post) || DEFAULT_POST_IMAGE;
      const rawInteracted = post.interacted_users || post.recent_interactors || [];
      const interacted_users = rawInteracted.slice(0, 10).map((u: any) => ({
        id: u.user_id ?? u.id,
        user_id: u.user_id ?? u.id,
        name: u.name ?? 'User',
        profile_image: u.profile_image ?? u.avatar ?? null,
        avatar: u.profile_image ?? u.avatar ?? null,
      }));

      return {
        post_id: post.post_id ?? post.id,
        id: post.post_id ?? post.id,
        title: post.title ?? 'Untitled Post',
        description: post.description ?? '',
        tags: post.tags ?? [],
        category_sub: post.category_sub ?? post.tags ?? [],
        image: imageUrl,
        media: post.media,
        user: {
          id: user_id ?? post.post_id,
          user_id,
          name: userData.name,
          profile_image: userData.profile_image,
          time: formatTimestamp(post.timestamp ?? post.created_at ?? Date.now()),
        },
        user_id,
        created_at: post.created_at ?? post.timestamp,
        timestamp: post.timestamp ?? post.created_at,
        interaction_count: post.interaction_count ?? 0,
        interacted_users,
        type: post.type ?? 'regular',
        is_repost: isRepost,
        original_author_name: isRepost && originalAuthorData ? originalAuthorData.name : null,
        original_plan_id: post.repost_data?.original_plan_id,
        ...post,
      } as FormattedPost;
    })
  );

  return formatted;
}
