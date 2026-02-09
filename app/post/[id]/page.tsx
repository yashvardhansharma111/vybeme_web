'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppHeader } from '../../components/AppHeader';
import { EventDetailCard, type EventDetailPost } from '../../components/EventDetailCard';
import { BusinessDetailCard } from '../../components/BusinessDetailCard';
import { DownloadAppCTA } from '../../components/DownloadAppCTA';
import type { PostData } from '../../components/PostCard';
import { getPost, createJoinRequest, getWebUser, getCurrentUserProfile, getPostImageUrlOrPlaceholder, getUserProfile, registerForBusinessEvent } from '@/lib/api';

const PENDING_BUSINESS_KEY = 'vybeme_pending_business_registration';

function getPendingBusinessRegistration(): { planId: string; passId: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(PENDING_BUSINESS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data?.planId && data?.passId ? data : null;
  } catch {
    return null;
  }
}

function setPendingBusinessRegistration(planId: string, passId: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(PENDING_BUSINESS_KEY, JSON.stringify({ planId, passId }));
}

function clearPendingBusinessRegistration() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(PENDING_BUSINESS_KEY);
}

export default function PostPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;
  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [joinSent, setJoinSent] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [womenOnlyBlocked, setWomenOnlyBlocked] = useState(false);
  // Business post flow: detail | tickets → after auth → detail with View ticket
  const [businessStep, setBusinessStep] = useState<'detail' | 'tickets'>('detail');
  const [selectedPassId, setSelectedPassId] = useState<string | null>(null);
  const [businessRegistered, setBusinessRegistered] = useState(false);
  const [businessRegistering, setBusinessRegistering] = useState(false);

  const user = getWebUser();
  const isBusiness = post ? (post as PostData).type === 'business' : false;
  const passes = (post as { passes?: Array<{ pass_id: string; name: string; price: number; description?: string }> })?.passes ?? [];

  const loadPost = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getPost(postId);
      if (res.success && res.data) {
        const p = res.data as Record<string, unknown>;
        // Backend returns plan_id and plan_type (discriminator); normalize for web
        const postIdFromApi = (p.plan_id ?? p.post_id ?? postId) as string;
        const planType = p.plan_type as string | undefined;
        const type = planType === 'BusinessPlan' ? 'business' : (p.type as string) ?? 'regular';

        const userObj = p.user as { id?: string; user_id?: string; name?: string; profile_image?: string } | undefined;
        const authorObj = p.author as { id?: string; user_id?: string; name?: string; profile_image?: string } | undefined;
        const authorId = (p.user_id ?? userObj?.id ?? userObj?.user_id ?? authorObj?.id ?? authorObj?.user_id) as string | undefined;
        let author = userObj ?? authorObj;
        if (!author?.name && authorId) {
          try {
            const profileRes = await getUserProfile(authorId);
            if (profileRes.success && profileRes.data) {
              author = {
                id: authorId,
                user_id: authorId,
                name: profileRes.data.name ?? 'Unknown User',
                profile_image: profileRes.data.profile_image ?? undefined,
              };
            }
          } catch {
            author = author ?? { id: authorId, user_id: authorId, name: 'Unknown User' };
          }
        }
        const imageUrl = getPostImageUrlOrPlaceholder(p as { media?: Array<{ url: string }>; image?: string | null });
        setPost({
          ...p,
          post_id: postIdFromApi,
          id: postIdFromApi,
          plan_id: postIdFromApi,
          type,
          title: (p.title ?? '') as string,
          description: (p.description ?? '') as string,
          image: imageUrl,
          is_women_only: !!(p.is_women_only ?? false),
          user: author ? { ...author, id: author.id ?? author.user_id ?? authorId, user_id: author.user_id ?? author.id ?? authorId } : undefined,
          user_id: authorId,
        } as PostData);
      } else {
        setError('Post not found');
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load post';
      setError(message || 'Could not load this plan. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  // After login return: complete pending business registration
  useEffect(() => {
    if (!postId || !user?.user_id || !isBusiness) return;
    const pending = getPendingBusinessRegistration();
    if (!pending || pending.planId !== postId) return;
    clearPendingBusinessRegistration();
    setBusinessRegistering(true);
    setError(null);
    registerForBusinessEvent(postId, user.user_id, pending.passId || undefined)
      .then(() => {
        setBusinessRegistered(true);
        setBusinessStep('detail');
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Registration failed'))
      .finally(() => setBusinessRegistering(false));
  }, [postId, user?.user_id, isBusiness]);

  const handleJoin = useCallback(async () => {
    if (!user?.user_id) {
      const redirect = `/post/${postId}`;
      router.push(`/login?redirect=${encodeURIComponent(redirect)}`);
      return;
    }
    setWomenOnlyBlocked(false);
    setError(null);
    const isWomenOnly = !!(post as PostData & { is_women_only?: boolean })?.is_women_only;
    if (isWomenOnly) {
      try {
        const profile = await getCurrentUserProfile(user.session_id);
        const gender = (profile?.gender ?? '').trim();
        if (gender.toLowerCase() === 'male') {
          setWomenOnlyBlocked(true);
          return;
        }
      } catch {
        // If we can't fetch profile, allow join attempt (backend may still enforce)
      }
    }
    setJoining(true);
    createJoinRequest(postId, user.user_id)
      .then(() => setJoinSent(true))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Join failed'))
      .finally(() => setJoining(false));
  }, [postId, user?.user_id, user?.session_id, post, router]);

  const authorName = post?.user?.name || post?.author?.name || 'Shreya';

  const handleBookEvent = useCallback(() => setBusinessStep('tickets'), []);
  const handleProceedToPayments = useCallback(() => {
    const passId = passes.length > 0 ? selectedPassId : undefined;
    if (passes.length > 0 && !passId) return;
    if (!user?.user_id) {
      setPendingBusinessRegistration(postId, passId ?? '');
      router.push(`/login?redirect=${encodeURIComponent(`/post/${postId}`)}`);
      return;
    }
    setBusinessRegistering(true);
    setError(null);
    registerForBusinessEvent(postId, user.user_id, passId ?? undefined)
      .then(() => {
        setBusinessRegistered(true);
        setBusinessStep('detail');
        setSelectedPassId(null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Registration failed'))
      .finally(() => setBusinessRegistering(false));
  }, [postId, selectedPassId, passes.length, user?.user_id, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-100/80 to-neutral-900">
        <AppHeader />
        <div className="flex min-h-[50vh] items-center justify-center p-4">
          <p className="text-neutral-500">Loading…</p>
        </div>
      </div>
    );
  }

  if (error && !post) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-100/80 to-neutral-900">
        <AppHeader />
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-4">
          <p className="text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="rounded-full bg-black px-4 py-2 text-white"
          >
            Back home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-100/80 to-neutral-900 md:bg-neutral-200">
      <AppHeader />
      <main className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-8 md:max-w-4xl md:py-8">
        <button
          type="button"
          onClick={() => (isBusiness && businessStep === 'tickets' ? setBusinessStep('detail') : router.back())}
          className="self-start text-sm font-medium text-neutral-700 underline hover:text-neutral-900 md:mb-2"
        >
          ← Back
        </button>

        {post && isBusiness && businessStep === 'tickets' ? (
          <div className="rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold text-neutral-900">Select Tickets</h2>
            {passes.length === 0 ? (
              <p className="text-sm text-neutral-600">No ticket types. You can still register.</p>
            ) : (
            <div className="space-y-3">
              {passes.map((pass, index) => {
                const isSelected = selectedPassId === pass.pass_id;
                const gradients: [string, string][] = [
                  ['#7C3AED', '#6366F1'],
                  ['#059669', '#10B981'],
                  ['#047857', '#059669'],
                ];
                const colors = gradients[index % gradients.length];
                return (
                  <button
                    key={pass.pass_id}
                    type="button"
                    onClick={() => setSelectedPassId(pass.pass_id)}
                    className={`flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left text-white transition-all ${
                      isSelected ? 'ring-2 ring-neutral-900 ring-offset-2' : 'opacity-90 hover:opacity-100'
                    }`}
                    style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }}
                  >
                    <div className="flex-1 pr-3">
                      <p className="text-base font-bold">{pass.name}</p>
                      {pass.description ? (
                        <p className="mt-1.5 line-clamp-2 text-[13px] text-white/90">{pass.description}</p>
                      ) : null}
                    </div>
                    <p className="text-lg font-extrabold">{pass.price === 0 ? 'Free' : `₹${pass.price}`}</p>
                  </button>
                );
              })}
            </div>
            )}
            <button
              type="button"
              disabled={(passes.length > 0 && !selectedPassId) || businessRegistering}
              onClick={handleProceedToPayments}
              className="mt-6 w-full rounded-[25px] bg-[#1C1C1E] py-4 text-base font-bold text-white disabled:opacity-60"
            >
              {businessRegistering ? 'Processing…' : 'Proceed to payments'}
            </button>
          </div>
        ) : post && isBusiness ? (
          <BusinessDetailCard
            post={{
              plan_id: post.plan_id ?? post.post_id ?? (post as { id?: string }).id,
              title: post.title ?? '',
              description: post.description ?? '',
              media: post.media,
              image: post.image,
              user: post.user,
              user_id: post.user_id,
              location_text: post.location_text,
              date: post.date,
              time: post.time,
              add_details: (post as { add_details?: Array<{ title: string; description?: string }> }).add_details,
              passes: (post as { passes?: Array<{ pass_id: string; name: string; price: number; description?: string }> }).passes,
            }}
            authorName={authorName}
            onBookEvent={handleBookEvent}
            registered={businessRegistered}
            viewTicketHref={businessRegistered && user?.user_id ? `/post/${postId}/ticket` : undefined}
          />
        ) : post ? (
          <EventDetailCard
            post={post as EventDetailPost}
            joinSent={joinSent}
            joining={joining}
            onJoin={handleJoin}
            authorName={authorName}
            authorId={post.user_id ?? (post.user as { user_id?: string })?.user_id ?? (post as { user_id?: string }).user_id}
            isWomenOnly={(post as PostData & { is_women_only?: boolean }).is_women_only}
            womenOnlyBlocked={womenOnlyBlocked}
          />
        ) : null}
        {post && (joinSent || (isBusiness && businessRegistered)) && (
          <div className="mt-4 flex flex-col gap-3">
            <p className="text-center text-sm font-semibold text-neutral-800">
              Continue plan conversation on the app
            </p>
            <DownloadAppCTA className="mt-0" />
          </div>
        )}
        {post && !joinSent && !(isBusiness && businessRegistered) && <DownloadAppCTA className="mt-4" />}
        {(error && !joinSent) || (error && isBusiness && !businessRegistered) ? (
          <p className="text-center text-sm text-red-600">{error}</p>
        ) : null}
        {(joining || businessRegistering) && (
          <p className="text-center text-sm text-neutral-500 md:sr-only">
            {businessRegistering ? 'Completing registration…' : 'Sending join request…'}
          </p>
        )}
      </main>
    </div>
  );
}
