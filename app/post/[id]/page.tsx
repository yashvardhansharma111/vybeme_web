'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppHeader } from '../../components/AppHeader';
import { ShareMenu } from '../../components/ShareMenu';
import { EventDetailCard, type EventDetailPost } from '../../components/EventDetailCard';
import { BusinessDetailCard } from '../../components/BusinessDetailCard';
import { DownloadAppCTA } from '../../components/DownloadAppCTA';
import type { PostData } from '../../components/PostCard';
import { getPost, createJoinRequest, getWebUser, getCurrentUserProfile, getPostImageUrlOrPlaceholder, getUserProfile, registerForBusinessEvent, getGuestList } from '@/lib/api';

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
  // Business post flow: detail | tickets | survey → after submit → detail with View ticket
  const [businessStep, setBusinessStep] = useState<'detail' | 'tickets' | 'survey'>('detail');
  const [selectedPassId, setSelectedPassId] = useState<string | null>(null);
  const [businessRegistered, setBusinessRegistered] = useState(false);
  const [businessRegistering, setBusinessRegistering] = useState(false);
  const [guestList, setGuestList] = useState<Array<{ name?: string; profile_image?: string | null }>>([]);
  // Registration survey (replaces payment)
  const [ageRange, setAgeRange] = useState('');
  const [gender, setGender] = useState('');
  const [runningExperience, setRunningExperience] = useState('');
  const [whatBringsYou, setWhatBringsYou] = useState('');
  const [currentUserProfile, setCurrentUserProfile] = useState<{ name?: string; profile_image?: string | null } | null>(null);

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
        if (type === 'business') {
          getGuestList(postIdFromApi)
            .then((r) => {
              if (r.success && r.data?.guests) {
                setGuestList(
                  (r.data.guests as Array<{ name?: string; profile_image?: string | null }>).map((g) => ({
                    name: g.name,
                    profile_image: g.profile_image ?? null,
                  }))
                );
              }
            })
            .catch(() => {});
        }
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

  // Load current user profile for business card header (profile button when logged in)
  useEffect(() => {
    if (!user?.session_id || !user?.user_id) {
      setCurrentUserProfile(null);
      return;
    }
    getCurrentUserProfile(user.session_id)
      .then((profile) => {
        if (profile) setCurrentUserProfile({ name: profile.name, profile_image: profile.profile_image ?? null });
        else setCurrentUserProfile(null);
      })
      .catch(() => setCurrentUserProfile(null));
  }, [user?.session_id, user?.user_id]);

  // After login return: show survey form for pending business registration (do not register until form submitted)
  useEffect(() => {
    if (!postId || !user?.user_id || !isBusiness) return;
    const pending = getPendingBusinessRegistration();
    if (!pending || pending.planId !== postId) return;
    clearPendingBusinessRegistration();
    setSelectedPassId(pending.passId || null);
    setBusinessStep('survey');
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
  const handleProceedToSurvey = useCallback(() => {
    const passId = passes.length > 0 ? selectedPassId : undefined;
    if (passes.length > 0 && !passId) return;
    if (!user?.user_id) {
      setPendingBusinessRegistration(postId, passId ?? '');
      router.push(`/login?redirect=${encodeURIComponent(`/post/${postId}`)}`);
      return;
    }
    setBusinessStep('survey');
    setError(null);
  }, [postId, selectedPassId, passes.length, user?.user_id, router]);

  const handleSubmitRegistration = useCallback(() => {
    if (!ageRange || !gender || !runningExperience) {
      setError('Please fill Age, Gender, and Running experience.');
      return;
    }
    if (!user?.user_id) return;
    setBusinessRegistering(true);
    setError(null);
    const passId = passes.length > 0 ? selectedPassId ?? undefined : undefined;
    registerForBusinessEvent(postId, user.user_id, passId, undefined, {
      age_range: ageRange,
      gender,
      running_experience: runningExperience,
      what_brings_you: whatBringsYou.trim() || undefined,
    })
      .then(() => {
        setBusinessRegistered(true);
        setBusinessStep('detail');
        setSelectedPassId(null);
        setAgeRange('');
        setGender('');
        setRunningExperience('');
        setWhatBringsYou('');
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Registration failed'))
      .finally(() => setBusinessRegistering(false));
  }, [postId, selectedPassId, passes.length, user?.user_id, ageRange, gender, runningExperience, whatBringsYou]);

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

  const isBusinessDetailView = !!(post && isBusiness && businessStep === 'detail');

  return (
    <div className={`min-h-screen bg-gradient-to-b from-rose-100/80 to-neutral-900 md:bg-neutral-200 ${isBusinessDetailView ? 'overflow-x-hidden' : ''}`}>
      {isBusinessDetailView ? <div className="md:hidden"><AppHeader /></div> : <AppHeader />}
      <main className={`mx-auto flex flex-col gap-4 pb-8 md:py-8 ${isBusinessDetailView ? 'max-w-full p-0 md:max-w-none' : 'max-w-md p-4 md:max-w-4xl'}`}>
        {!isBusinessDetailView && (
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                if (isBusiness && businessStep === 'tickets') setBusinessStep('detail');
                else if (isBusiness && businessStep === 'survey') setBusinessStep('tickets');
                else router.back();
              }}
              className="text-sm font-medium text-neutral-700 underline hover:text-neutral-900 md:mb-2"
            >
              ← Back
            </button>
            {post && (
              <ShareMenu
                postId={postId}
                title={post.title ?? 'Event'}
                useGoPostUrl
                className="shrink-0"
              />
            )}
          </div>
        )}

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
                      isSelected
                        ? 'ring-4 ring-neutral-900 ring-offset-2 shadow-lg scale-[1.02]'
                        : 'opacity-90 hover:opacity-100'
                    }`}
                    style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }}
                  >
                    <div className="flex flex-1 items-center gap-3 pr-3">
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${isSelected ? 'border-white bg-white/20' : 'border-white/50'}`}>
                        {isSelected ? (
                          <svg className="h-3.5 w-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-bold">{pass.name}</p>
                        {pass.description ? (
                          <p className="mt-1.5 line-clamp-2 text-[13px] text-white/90 whitespace-pre-line">{pass.description}</p>
                        ) : null}
                      </div>
                    </div>
                    <p className="text-lg font-extrabold shrink-0">{pass.price === 0 ? 'Free' : `₹${pass.price}`}</p>
                  </button>
                );
              })}
            </div>
            )}
            <button
              type="button"
              disabled={passes.length > 0 && !selectedPassId}
              onClick={handleProceedToSurvey}
              className="mt-6 w-full rounded-[25px] bg-[#1C1C1E] py-4 text-base font-bold text-white disabled:opacity-60"
            >
              Continue
            </button>
          </div>
        ) : post && isBusiness && businessStep === 'survey' ? (
          <div className="rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold text-neutral-900">Almost there</h2>
            <p className="mb-6 text-sm text-neutral-600">Please share a few details (required for registration).</p>
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-sm font-semibold text-neutral-800">Age <span className="text-red-500">*</span></p>
                <select
                  value={ageRange}
                  onChange={(e) => setAgeRange(e.target.value)}
                  className="w-full rounded-xl border border-[#E5E5EA] bg-[#F2F2F7] px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#1C1C1E]/20"
                >
                  <option value="">Select age</option>
                  {['Under 18yrs', '18-24yrs', '25-34yrs', '35-44yrs', 'above 45yrs'].map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-neutral-800">Gender <span className="text-red-500">*</span></p>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full rounded-xl border border-[#E5E5EA] bg-[#F2F2F7] px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#1C1C1E]/20"
                >
                  <option value="">Select gender</option>
                  {['Male', 'Female', 'Prefer not to say'].map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-neutral-800">Your running experience <span className="text-red-500">*</span></p>
                <div className="flex flex-col gap-2">
                  {[
                    'This will be my first time.',
                    'I run occasionally',
                    'I run regularly',
                    "I'm returning after a break",
                  ].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setRunningExperience(opt)}
                      className={`rounded-xl px-4 py-3 text-left text-sm font-medium ${runningExperience === opt ? 'bg-[#1C1C1E] text-white' : 'bg-[#F2F2F7] text-neutral-800'}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-neutral-800">What brings you to BREATHE?</p>
                <textarea
                  value={whatBringsYou}
                  onChange={(e) => setWhatBringsYou(e.target.value)}
                  placeholder="I want to connect with other runners"
                  rows={2}
                  className="w-full rounded-xl border border-[#E5E5EA] bg-[#F2F2F7] px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-500 resize-none"
                />
              </div>
            </div>
            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
            <button
              type="button"
              disabled={businessRegistering}
              onClick={handleSubmitRegistration}
              className="mt-6 w-full rounded-[25px] bg-[#1C1C1E] py-4 text-base font-bold text-white disabled:opacity-60"
            >
              {businessRegistering ? 'Completing…' : 'Complete registration'}
            </button>
            <button
              type="button"
              onClick={() => setBusinessStep('tickets')}
              className="mt-3 w-full py-2 text-sm font-medium text-neutral-500"
            >
              ← Back
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
            attendees={guestList}
            currentUserProfileHref={user?.user_id ? `/profile/${user.user_id}` : undefined}
            currentUserAvatar={currentUserProfile?.profile_image}
            currentUserName={currentUserProfile?.name}
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
        {post && !isBusiness && (joinSent || businessRegistered) && (
          <div className="mt-4 flex flex-col gap-3">
            <p className="text-center text-sm font-semibold text-neutral-800">
              Continue plan conversation on the app
            </p>
            <DownloadAppCTA className="mt-0" />
          </div>
        )}
        {post && !isBusiness && !joinSent && !businessRegistered && <DownloadAppCTA className="mt-4" />}
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
