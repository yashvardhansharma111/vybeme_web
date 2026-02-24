/**
 * Web API client for vybeme backend.
 * Uses localStorage with 10-day expiry for auth persistence.
 */

const getBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (url) return url.endsWith('/api') ? url : `${url}/api`;
  return 'https://api.vybeme.in/api';
};

const BASE_URL = getBaseUrl();

const STORAGE_KEY = 'vybeme_web_user';
const AUTH_EXPIRY_DAYS = 10;

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

interface StoredAuth {
  user: WebUser;
  expires_at: number;
}

function getStoredUser(): WebUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredAuth;
    if (!stored?.user) return null;
    if (stored.expires_at && Date.now() > stored.expires_at) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return stored.user;
  } catch {
    return null;
  }
}

function setStoredUser(user: WebUser | null): void {
  if (typeof window === 'undefined') return;
  if (user) {
    const expires_at = Date.now() + AUTH_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, expires_at }));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function getWebUser(): WebUser | null {
  return getStoredUser();
}

export function setWebUser(user: WebUser | null): void {
  setStoredUser(user);
}

/** User-friendly messages for network/502 so CORS or gateway errors don't confuse users */
function normalizeRequestError(res: Response | null, body: string, err: unknown): Error {
  if (res?.status === 502) {
    return new Error('Server is busy. Please try again in a moment.');
  }
  if (err instanceof TypeError && (err.message === 'Failed to fetch' || err.message.includes('NetworkError'))) {
    return new Error('Connection problem. Please check your connection and try again.');
  }
  if (body && body.length < 200) return new Error(body);
  return err instanceof Error ? err : new Error('Something went wrong. Please try again.');
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
    '/ticket/yashvardhan',
  ];
  const needsAuth = !publicEndpoints.some((ep) => endpoint.includes(ep));

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (needsAuth && user?.access_token) {
    headers['Authorization'] = `Bearer ${user.access_token}`;
  }

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (e) {
    throw normalizeRequestError(null, '', e);
  }

  const contentType = res.headers.get('content-type');
  if (res.status === 502) {
    await res.text().catch(() => '');
    throw normalizeRequestError(res, '', new Error('502'));
  }

  let data: ApiResponse<T>;
  if (contentType?.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      throw normalizeRequestError(res, '', new Error('Invalid response'));
    }
  } else {
    const text = await res.text();
    throw normalizeRequestError(res, text || `Request failed ${res.status}`, new Error(text || String(res.status)));
  }

  if (!res.ok) {
    // Session/user no longer exists (e.g. account deleted) — clear stored user so they can log in again
    if (res.status === 404 && endpoint.includes('/user/me') && typeof window !== 'undefined') {
      setStoredUser(null);
    }
    throw new Error(data.message || `Request failed ${res.status}`);
  }
  return data;
}

const OTP_RETRY_DELAY_MS = 1500;

async function withRetryOnce<T>(
  fn: () => Promise<T>,
  isRetryable: (e: Error) => boolean
): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    if (!isRetryable(err)) throw e;
    await new Promise((r) => setTimeout(r, OTP_RETRY_DELAY_MS));
    return fn();
  }
}

// Auth
export async function sendOTP(phone_number: string) {
  return withRetryOnce(
    () =>
      request<{ otp_id: string; expires_at: string }>('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone_number }),
      }),
    (e) =>
      e.message.includes('Server is busy') || e.message.includes('Connection problem')
  );
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
  return withRetryOnce(
    () =>
      request<{ otp_id: string }>('/auth/resend-otp', {
        method: 'POST',
        body: JSON.stringify({ phone_number }),
      }),
    (e) =>
      e.message.includes('Server is busy') || e.message.includes('Connection problem')
  );
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

export async function updateProfile(session_id: string, data: { name?: string; gender?: string; is_business?: boolean }) {
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

/** Create Razorpay order for paid ticket. Returns { id, amount, currency, receipt }. */
export async function createTicketOrder(plan_id: string, user_id: string, pass_id: string) {
  return request<{ id: string; amount: number; currency: string; receipt: string }>('/ticket/create-order', {
    method: 'POST',
    body: JSON.stringify({ plan_id, user_id, pass_id }),
  });
}

/** Verify Razorpay payment and create ticket. Call after Razorpay checkout success. */
export async function verifyTicketPayment(
  razorpay_payment_id: string,
  razorpay_order_id: string,
  razorpay_signature: string
) {
  return request<{ registration: unknown; ticket: unknown }>('/ticket/verify-payment', {
    method: 'POST',
    body: JSON.stringify({
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    }),
  });
}

// Business event: register and get ticket (with optional survey: age_range, gender, running_experience, what_brings_you)
export async function registerForBusinessEvent(
  plan_id: string,
  user_id: string,
  pass_id?: string,
  message?: string,
  survey?: { age_range?: string; gender?: string; running_experience?: string; what_brings_you?: string }
) {
  return request<{ registration: unknown; ticket: unknown }>('/ticket/register', {
    method: 'POST',
    body: JSON.stringify({
      plan_id,
      user_id,
      pass_id,
      message,
      ...(survey && {
        age_range: survey.age_range || undefined,
        gender: survey.gender || undefined,
        running_experience: survey.running_experience || undefined,
        what_brings_you: survey.what_brings_you || undefined,
      }),
    }),
  });
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

/** Yashvardhan: list business plans (no auth) */
export async function getYashvardhanPlans() {
  return request<{ plans: Array<{ plan_id: string; title: string; date?: string; time?: string; location_text?: string }> }>(
    '/ticket/yashvardhan/plans',
    { method: 'GET' }
  );
}

/** Yashvardhan: attendee list for a plan (no auth) */
export async function getYashvardhanAttendees(plan_id: string) {
  return request<{
    attendees: Array<{
      registration_id: string;
      user_id: string;
      user: { user_id: string; name: string; profile_image?: string | null; phone_number?: string | null } | null;
      ticket_id: string | null;
      ticket_number: string | null;
      checkin_code?: string | null;
      status: string;
      checked_in: boolean;
      price_paid: number;
      created_at: string;
    }>;
    statistics: { total: number; checked_in: number };
  }>(`/ticket/yashvardhan/attendees/${plan_id}`, { method: 'GET' });
}

/** Yashvardhan: get ticket by plan_id + user_id (no auth, same shape as getUserTicket) */
export async function getYashvardhanTicket(plan_id: string, user_id: string) {
  return request<{ ticket: any }>(`/ticket/yashvardhan/ticket/${plan_id}/${user_id}`, { method: 'GET' });
}

/** Get attendee list for a plan (organizer only). Includes survey fields for export. */
export async function getAttendeeList(plan_id: string, user_id: string) {
  return request<{
    attendees: Array<{
      registration_id: string;
      user_id: string;
      user: { user_id: string; name: string; profile_image?: string | null } | null;
      ticket_id: string | null;
      ticket_number: string | null;
      checkin_code?: string | null;
      status: string;
      checked_in: boolean;
      checked_in_at: string | null;
      checked_in_via?: 'qr' | 'manual' | null;
      price_paid: number;
      created_at: string;
      age_range?: string | null;
      gender?: string | null;
      running_experience?: string | null;
      what_brings_you?: string | null;
    }>;
    statistics: { total: number; checked_in: number; pending: number };
  }>(`/ticket/attendees/${plan_id}?user_id=${encodeURIComponent(user_id)}`, { method: 'GET' });
}

/** Get user's ticket (for My Tickets). */
export async function getUserTicket(plan_id: string, user_id: string) {
  return request<{
    ticket: {
      ticket_id: string;
      ticket_number: string;
      qr_code: string;
      qr_code_hash: string;
      status: string;
      price_paid: number;
      pass_id?: string | null;
      plan: {
        plan_id: string;
        title?: string;
        description?: string;
        location_text?: string | null;
        date?: string | null;
        time?: string | null;
        media?: Array<{ url: string; type?: string }>;
        ticket_image?: string | null;
        updated_at?: string | null;
        passes?: Array<{ pass_id: string; name: string; price: number; description?: string; media?: Array<{ url: string }> }>;
        add_details?: Array<{ detail_type?: string; title: string; description?: string }>;
        category_main?: string | null;
        category_sub?: string[];
      } | null;
      user?: { user_id: string; name: string; profile_image?: string | null } | null;
    };
  }>(`/ticket/${plan_id}/${user_id}`, { method: 'GET' });
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

/** Get business plan/post details (for edit and display). */
export async function getBusinessPlanDetails(plan_id: string) {
  return request<any>(`/business-post/details/${plan_id}`, { method: 'GET' });
}

/** Create business post. body: title, description, user_id, business_id, category_main, etc. Use createBusinessPlanWithFiles when you have File objects for media/ticket. */
export async function createBusinessPlan(body: Record<string, unknown>) {
  return request<{ post_id: string; group_id?: string | null }>('/business-post/create', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** Create business post with file uploads (post media + optional ticket image). */
export async function createBusinessPlanWithFiles(formData: FormData): Promise<ApiResponse<{ post_id: string; group_id?: string | null }>> {
  const user = getStoredUser();
  if (!user?.access_token) throw new Error('Not authenticated');
  const url = `${BASE_URL}/business-post/create`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${user.access_token}`,
  };
  const res = await fetch(url, { method: 'POST', headers, body: formData });
  const contentType = res.headers.get('content-type');
  let data: ApiResponse<{ post_id: string; group_id?: string | null }>;
  if (contentType?.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();
    throw new Error(text || `Request failed ${res.status}`);
  }
  if (!res.ok) throw new Error(data.message || `Request failed ${res.status}`);
  return data;
}

/** Update business post. */
export async function updateBusinessPlan(plan_id: string, body: Record<string, unknown>) {
  return request<any>(`/business-post/update/${plan_id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/** Upload a single image file; returns URL. Used for post/ticket images in edit. Backend expects field name "file". */
export async function uploadImageFile(file: File): Promise<string> {
  const user = getStoredUser();
  if (!user?.access_token) throw new Error('Not authenticated');
  const formData = new FormData();
  formData.append('file', file);
  const url = `${BASE_URL}/upload/image`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${user.access_token}` },
    body: formData,
  });
  const contentType = res.headers.get('content-type');
  let data: { url?: string; data?: { url?: string }; message?: string };
  if (contentType?.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();
    throw new Error(text || `Upload failed ${res.status}`);
  }
  if (!res.ok) throw new Error(data.message || `Upload failed ${res.status}`);
  const imageUrl = data.data?.url ?? data.url;
  if (!imageUrl || typeof imageUrl !== 'string') throw new Error('Upload did not return an image URL');
  return imageUrl;
}

/** Get registration counts for a business post. */
export async function getRegistrations(plan_id: string) {
  return request<{ total_registrations: number; approved_registrations: number; rejected_registrations: number }>(
    `/business-post/registrations/${plan_id}`,
    { method: 'GET' }
  );
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

// Form APIs
export async function createForm(body: Record<string, unknown>) {
  return request<{ form_id: string; name: string }>('/form', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getUserForms(userId: string) {
  return request<{ forms: any[] }>(`/form/by-user/${userId}`, {
    method: 'GET',
  });
}

export async function getForm(formId: string) {
  return request<any>(`/form/${formId}`, {
    method: 'GET',
  });
}

export async function updateForm(formId: string, body: Record<string, unknown>) {
  return request<any>(`/form/${formId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function deleteForm(formId: string) {
  return request<any>(`/form/${formId}`, {
    method: 'DELETE',
  });
}

export async function submitFormResponse(body: Record<string, unknown>) {
  return request<any>('/form/response/submit', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getFormResponse(registrationId: string) {
  return request<any>(`/form/response/by-registration/${registrationId}`, {
    method: 'GET',
  });
}

export async function getPlanFormResponses(planId: string, formId?: string) {
  const query = formId ? `?formId=${formId}` : '';
  return request<{ responses: any[] }>(`/form/responses/by-plan/${planId}${query}`, {
    method: 'GET',
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
