'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppHeader } from '../../components/AppHeader';
import { ShareMenu } from '../../components/ShareMenu';
import { EventDetailCard, type EventDetailPost } from '../../components/EventDetailCard';
import { BusinessDetailCard } from '../../components/BusinessDetailCard';
import { DownloadAppCTA } from '../../components/DownloadAppCTA';
import FormRenderer from '../../components/FormRenderer';
import type { PostData } from '../../components/PostCard';
import { getPost, createJoinRequest, getWebUser, getCurrentUserProfile, getPostImageUrlOrPlaceholder, getUserProfile, registerForBusinessEvent, getGuestList, getRegistrations, getPlanRegistrationCount, createTicketOrder, verifyTicketPayment, getUserTicket, submitFormResponse } from '@/lib/api';

const PENDING_BUSINESS_KEY = 'vybeme_pending_business_registration';
const PAYMENT_VERIFIED_KEY = 'vybeme_payment_verified';

function formatEventDateOnly(date: string | Date | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = d.getDate();
  const ord = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
  return `${day}${ord} ${d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
}
/** Normalize time string to AM/PM (e.g. "19:00" -> "7:00 PM"). */
function formatTimeAMPM(time: string | null | undefined): string {
  if (!time || !String(time).trim()) return '';
  const t = String(time).trim();
  if (/AM|PM/i.test(t)) return t;
  const match = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return t;
  let h = parseInt(match[1], 10);
  const m = match[2];
  if (h >= 24) h = 0;
  const period = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${period}`;
}
function formatEventDateAndTime(date: string | Date | undefined, time: string | undefined): string {
  if (!date) return formatTimeAMPM(time) || '';
  const dateStr = formatEventDateOnly(date);
  const timeStr = formatTimeAMPM(time);
  return timeStr ? `${dateStr} | ${timeStr}` : dateStr;
}

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

function getPaymentVerified(planId: string, passId: string | null | undefined): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = sessionStorage.getItem(PAYMENT_VERIFIED_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    return data?.planId === planId && data?.passId === passId;
  } catch {
    return false;
  }
}

function setPaymentVerified(planId: string, passId: string | null | undefined) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(PAYMENT_VERIFIED_KEY, JSON.stringify({ planId, passId }));
}

function clearPaymentVerified() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(PAYMENT_VERIFIED_KEY);
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
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [eventFull, setEventFull] = useState(false);
  const [paymentOpening, setPaymentOpening] = useState(false);
  const [triggerPaymentAfterLogin, setTriggerPaymentAfterLogin] = useState(false);
  const [paymentVerifiedForPassId, setPaymentVerifiedForPassId] = useState<string | null>(null);
  const [guestList, setGuestList] = useState<Array<{ name?: string; profile_image?: string | null }>>([]);
  // Registration survey (replaces payment)
  const [ageRange, setAgeRange] = useState('');
  const [gender, setGender] = useState('');
  const [runningExperience, setRunningExperience] = useState('');
  const [whatBringsYou, setWhatBringsYou] = useState('');
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<{ name?: string; profile_image?: string | null; phone_number?: string | null; gender?: string | null } | null>(null);

  const user = getWebUser();
  const isBusiness = post ? (post as PostData).type === 'business' : false;
  const passes = (post as { passes?: Array<{ pass_id: string; name: string; price: number; description?: string; media?: Array<{ url?: string }> }>; media?: Array<{ url?: string }> })?.passes ?? [];
  const isWomenOnlyBusiness = !!(isBusiness && (post as any)?.is_women_only);
  const currentUserGender = ((currentUserProfile?.gender ?? '') as string).trim().toLowerCase();
  const isCurrentUserFemale = currentUserGender === 'female' || currentUserGender === 'woman';
  const businessWomenOnlyBlocked = isWomenOnlyBusiness && !!user?.user_id && !!currentUserGender && !isCurrentUserFemale;

  // determine whether the current plan actually needs any registration form/survey
  // registration_required is a boolean stored on the plan; a custom form also implies
  // registration.  If neither is true we will skip the survey step entirely.
  // Use a safe cast to `any` because `PostData` doesn't include backend-only fields.
  const needsSurvey = !!(
    post &&
    isBusiness &&
    (((post as any).registration_required) || ((post as any).form_id))
  );
  const eventFirstImageUrl = (post as { media?: Array<{ url?: string }> })?.media?.[0]?.url ?? null;

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
          tags: (p.tags ?? p.category_sub ?? []) as string[],
          category_sub: (p.category_sub ?? p.tags ?? []) as string[],
          temporal_tags: (p.temporal_tags ?? []) as string[],
          add_details: (p.add_details ?? []) as Array<{ title?: string; description?: string }>,
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
          // If the plan has a registration_limit set, check current registrations and mark full
          if ((p.registration_limit ?? null) !== null && p.registration_limit !== undefined) {
            const limit = Number(p.registration_limit) || 0;
            if (limit > 0) {
              try {
                const countRes = await getPlanRegistrationCount(postIdFromApi);
                const count = (countRes?.data?.count as number) || 0;
                setEventFull(count >= limit);
              } catch (err) {
                // on error, be conservative and assume not full
                setEventFull(false);
              }
            } else {
              setEventFull(false);
            }
          } else {
            setEventFull(false);
          }
        } else {
          setEventFull(false);
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

  // If user is already registered for this business plan, show "View your pass" instead of Register
  useEffect(() => {
    if (!postId || !user?.user_id || !post || (post as PostData).type !== 'business') return;
    getUserTicket(postId, user.user_id)
      .then((res) => {
        if (res.success && res.data?.ticket) {
          setBusinessRegistered(true);
        }
        // capture checkin code for no-ticket events (registration may be returned even w/o ticket)
        const code =
          (res?.data as any)?.registration?.checkin_code ??
          null;
        if (code) setConfirmationCode(code);
      })
      .catch(() => {});
  }, [postId, user?.user_id, post]);

  // Load current user profile for business card header (profile button when logged in)
  useEffect(() => {
    if (!user?.session_id || !user?.user_id) {
      setCurrentUserProfile(null);
      return;
    }
    getCurrentUserProfile(user.session_id)
      .then((profile) => {
        if (profile) setCurrentUserProfile({
          name: profile.name,
          profile_image: profile.profile_image ?? null,
          phone_number: profile.phone_number ?? null,
          gender: profile.gender ?? null,
        });
        else setCurrentUserProfile(null);
      })
      .catch(() => setCurrentUserProfile(null));
  }, [user?.session_id, user?.user_id]);

  const ensureWomenOnlyAllowedForBusiness = useCallback(async (): Promise<boolean> => {
    if (!isWomenOnlyBusiness) return true;
    if (!user?.user_id) return true;
    try {
      const profile = await getCurrentUserProfile(user.session_id);
      const g = (profile?.gender ?? '').trim().toLowerCase();
      const ok = g === 'female' || g === 'woman';
      if (!ok) {
        setWomenOnlyBlocked(true);
        setError("This event is only for women.");
        return false;
      }
    } catch {
      // if profile can't be fetched, allow attempt (backend may enforce)
    }
    return true;
  }, [isWomenOnlyBusiness, user?.session_id, user?.user_id]);

  // After login return: for paid pass go to tickets and trigger payment; for free pass go to survey (form)
  useEffect(() => {
    if (!postId || !user?.user_id || !isBusiness || !post) return;
    const pending = getPendingBusinessRegistration();
    if (!pending || pending.planId !== postId) return;
    clearPendingBusinessRegistration();
    const passId = pending.passId || null;
    setSelectedPassId(passId);
    const pass = passes.find((p) => p.pass_id === passId);
    const isPaid = pass && pass.price > 0;
    if (isPaid) {
      setBusinessStep('tickets');
      setTriggerPaymentAfterLogin(true);
    } else {
      // non‑paid: either free ticket or no passes
      if (passes.length === 0) {
        // Only show survey if a form is configured; otherwise go to detail
        if ((post as any).form_id) setBusinessStep('survey');
        else setBusinessStep('detail');
      } else {
        setBusinessStep('tickets');
      }
    }
  }, [postId, user?.user_id, isBusiness, post, passes]);

  // Restore payment-verified from sessionStorage (e.g. after mobile redirect/reload)
  useEffect(() => {
    if (!postId || !selectedPassId || businessStep !== 'survey') return;
    if (getPaymentVerified(postId, selectedPassId)) {
      setPaymentVerifiedForPassId(selectedPassId);
    }
  }, [postId, selectedPassId, businessStep]);

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

  const handleBookEvent = useCallback(async () => {
    if (!user?.user_id) {
      setPendingBusinessRegistration(postId, '');
      router.push(`/login?redirect=${encodeURIComponent(`/post/${postId}`)}`);
      return;
    }

    setWomenOnlyBlocked(false);
    setError(null);
    if (!(await ensureWomenOnlyAllowedForBusiness())) {
      return;
    }

    // if there are no passes at all we normally would show the survey page
    // but only do so if a form is configured. otherwise stay on detail.
    if (passes.length === 0) {
      if ((post as any).form_id) {
        setBusinessStep('survey');
      } else {
        // No form configured; remain on detail
        setBusinessStep('detail');
      }
    } else {
      setBusinessStep('tickets');
    }
  }, [passes.length, postId, router, user?.user_id, post, ensureWomenOnlyAllowedForBusiness]);

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve(false);
        return;
      }
      const key = 'razorpay-checkout-script';
      if (document.getElementById(key)) {
        resolve(!!(window as any).Razorpay);
        return;
      }
      const script = document.createElement('script');
      script.id = key;
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(!!(window as any).Razorpay);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleProceedToSurvey = useCallback(async () => {
    const passId = passes.length > 0 ? (selectedPassId ?? undefined) : undefined;
    if (passes.length > 0 && !passId) return;
    if (!user?.user_id) {
      setPendingBusinessRegistration(postId, passId ?? '');
      router.push(`/login?redirect=${encodeURIComponent(`/post/${postId}`)}`);
      return;
    }

    setWomenOnlyBlocked(false);
    if (!(await ensureWomenOnlyAllowedForBusiness())) {
      return;
    }
    // Check if already registered to avoid repeating flow
    try {
      const ticketRes = await getUserTicket(postId, user.user_id);
      if (ticketRes.success && ticketRes.data?.ticket) {
        setError("You're already registered for this event.");
        setBusinessRegistered(true);
        setBusinessStep('detail');
        return;
      }
    } catch {
      // ignore
    }

    const selectedPass = passes.find((p) => p.pass_id === passId);
    const isPaid = selectedPass && selectedPass.price > 0;

    // helper to complete a registration without survey
    const doRegister = async () => {
      try {
        const survey: any = {}; // empty since no form
        const res = await registerForBusinessEvent(postId, user.user_id, passId, undefined, survey);
        clearPaymentVerified();
        setBusinessRegistered(true);
        setBusinessStep('detail');
        setSelectedPassId(null);
        setPaymentVerifiedForPassId(null);
        setAgeRange('');
        setGender('');
        setRunningExperience('');
        setWhatBringsYou('');

        // after survey‑less registration, navigate appropriately
        const isFreeNoPasses = passes.length === 0;
        const checkinCode =
          (res?.data as any)?.registration?.checkin_code ??
          (res as any)?.data?.registration?.checkin_code ??
          (res as any)?.registration?.checkin_code ??
          null;
        const regId = (res?.data as any)?.registration?.registration_id ?? (res as any)?.registration?.registration_id ?? null;
        if (regId) setRegistrationId(regId);
        if (checkinCode) setConfirmationCode(checkinCode);
        if (isFreeNoPasses && checkinCode) {
          router.push(`/post/${postId}/confirmation?code=${encodeURIComponent(checkinCode)}`);
        } else {
          router.push(`/post/${postId}/ticket`);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Registration failed');
      }
    };

    if (isPaid && passId) {
      // start payment but defer registration until after survey/payment
      setError(null);
      setPaymentOpening(true);
      try {
        const orderRes = await createTicketOrder(postId, user.user_id, passId);
        if (!orderRes.success || !orderRes.data?.id) {
          setError(orderRes.message || 'Failed to create order');
          setPaymentOpening(false);
          return;
        }
        const order = orderRes.data;
        const loaded = await loadRazorpayScript();
        if (!loaded) {
          setError('Payment gateway could not be loaded. Please try again.');
          setPaymentOpening(false);
          return;
        }
        const Razorpay = (window as any).Razorpay;
        const rzpKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
        if (!rzpKey) {
          setError('Payment is not configured.');
          setPaymentOpening(false);
          return;
        }
        const profileForRazorpay = currentUserProfile ?? (await getCurrentUserProfile(user.session_id).catch(() => null));
        const userName = profileForRazorpay?.name?.trim() || '';
        const phoneRaw = (profileForRazorpay?.phone_number || '').replace(/\D/g, '');
        const contact = phoneRaw.length >= 10 ? phoneRaw.slice(-10) : phoneRaw;
        const options = {
          key: rzpKey,
          amount: order.amount,
          currency: order.currency || 'INR',
          name: 'Breathe.runclub',
          description: 'Event Ticket',
          order_id: order.id,
          prefill: {
            name: userName,
            email: '',
            contact: contact || '',
          },
              handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
            try {
              const verifyRes = await verifyTicketPayment(
                response.razorpay_payment_id,
                response.razorpay_order_id,
                response.razorpay_signature
              );
              const regId = (verifyRes?.data as any)?.registration?.registration_id ?? (verifyRes as any)?.registration?.registration_id ?? null;
              if (regId) setRegistrationId(regId);
              if (selectedPassId) {
                setPaymentVerifiedForPassId(selectedPassId);
                setPaymentVerified(postId, selectedPassId);
              }
              // registration has been created on the server by verifyPayment
              setBusinessRegistered(true);
              if ((post as any).form_id) {
                // Form exists: show survey for responses
                setBusinessStep('survey');
              } else {
                // No form: skip survey and go to ticket immediately
                setBusinessStep('detail');
                router.push(`/post/${postId}/ticket`);
              }
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Payment verification failed');
            } finally {
              setPaymentOpening(false);
            }
          },
          modal: { ondismiss: () => setPaymentOpening(false) },
        };
        const rzp = new Razorpay(options);
        rzp.on('payment.failed', () => {
          setError('Payment failed or was cancelled.');
          setPaymentOpening(false);
        });
        rzp.open();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not start payment');
        setPaymentOpening(false);
      }
      return;
    }

    // Non-paid path: only go to survey if form exists; otherwise register immediately
    if ((post as any).form_id) {
      // Form exists: show survey step with FormRenderer
      setBusinessStep('survey');
    } else {
      // No form: skip survey and register directly
      await doRegister();
    }
  }, [postId, selectedPassId, passes, user?.user_id, router, currentUserProfile?.name, needsSurvey, ensureWomenOnlyAllowedForBusiness]);
  // Trigger payment when returning from login with a paid pass selected (must run after handleProceedToSurvey is defined)
  useEffect(() => {
    if (!triggerPaymentAfterLogin || !user?.user_id || !selectedPassId) return;
    setTriggerPaymentAfterLogin(false);
    const id = setTimeout(() => handleProceedToSurvey(), 150);
    return () => clearTimeout(id);
  }, [triggerPaymentAfterLogin, user?.user_id, selectedPassId, handleProceedToSurvey]);

  const handleSubmitRegistration = useCallback(() => {
    const isNoTicketEvent = passes.length === 0;
    if (!isNoTicketEvent && (!ageRange || !gender || !runningExperience)) {
      setError('Please fill Age, Gender, and Running experience.');
      return;
    }
    if (!user?.user_id) return;
    setBusinessRegistering(true);
    setError(null);
    const passId = passes.length > 0 ? selectedPassId ?? undefined : undefined;
    // build survey object; for no-ticket event only send whatBringsYou
    const survey: any = {};
    if (isNoTicketEvent) {
      survey.what_brings_you = whatBringsYou.trim() || undefined;
    } else {
      survey.age_range = ageRange;
      survey.gender = gender;
      survey.running_experience = runningExperience;
      survey.what_brings_you = whatBringsYou.trim() || undefined;
    }
    registerForBusinessEvent(postId, user.user_id, passId, undefined, survey)
      .then((res) => {
        const regId = (res?.data as any)?.registration?.registration_id ?? (res as any)?.registration?.registration_id ?? null;
        if (regId) setRegistrationId(regId);
        clearPaymentVerified();
        setBusinessRegistered(true);
        setBusinessStep('detail');
        setSelectedPassId(null);
        setPaymentVerifiedForPassId(null);
        setAgeRange('');
        setGender('');
        setRunningExperience('');
        setWhatBringsYou('');

        // after survey-based registration, navigate to the appropriate page
        const isFreeNoPasses = passes.length === 0;
        const checkinCode =
          (res?.data as any)?.registration?.checkin_code ??
          (res as any)?.data?.registration?.checkin_code ??
          (res as any)?.registration?.checkin_code ??
          null;
        if (checkinCode) setConfirmationCode(checkinCode);
        if (isFreeNoPasses && checkinCode) {
          router.push(`/post/${postId}/confirmation?code=${encodeURIComponent(checkinCode)}`);
        } else {
          router.push(`/post/${postId}/ticket`);
        }
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Registration failed'))
      .finally(() => setBusinessRegistering(false));
  }, [postId, selectedPassId, passes.length, user?.user_id, ageRange, gender, runningExperience, whatBringsYou, router]);

  // If we land on the survey step but the plan has no form configured, auto-submit registration.
  useEffect(() => {
    if (!post || businessStep !== 'survey') return;
    // If a custom form is present, do not auto-submit here (FormRenderer will handle it)
    if ((post as any).form_id) return;
    // Otherwise auto-complete registration (avoid double-run)
    const id = setTimeout(() => {
      try {
        handleSubmitRegistration();
      } catch {
        // swallow
      }
    }, 120);
    return () => clearTimeout(id);
  }, [businessStep, post, handleSubmitRegistration]);

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
  const isTicketsStep = !!(post && isBusiness && businessStep === 'tickets');
  const isSurveyStep = !!(post && isBusiness && businessStep === 'survey');
  const showAppHeader = !isBusinessDetailView && !isTicketsStep && !isSurveyStep;

  return (
    <div className={`min-h-screen ${isTicketsStep || isBusinessDetailView ? 'bg-white' : 'bg-gradient-to-b from-rose-100/80 to-neutral-900 md:bg-neutral-200'} ${isBusinessDetailView ? 'overflow-x-hidden' : ''}`}>
      {showAppHeader && <AppHeader />}
      {isBusinessDetailView ? <div className="md:hidden"><AppHeader /></div> : null}
      <main className={`mx-auto flex flex-col gap-4 pb-8 md:py-8 ${isBusinessDetailView ? 'max-w-full p-0 md:max-w-none' : 'max-w-md p-4 md:max-w-4xl'}`}>
        {/* Back + Share: only when not on detail/tickets/survey */}
        {!isBusinessDetailView && !isTicketsStep && !isSurveyStep && (
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
          <div className="relative min-h-[100dvh] flex flex-col bg-white overflow-y-auto">
            {/* Back button top left */}
            <div className="absolute left-4 top-4 z-10">
              <button
                type="button"
                onClick={() => setBusinessStep('detail')}
                className="flex items-center gap-1 text-sm font-medium text-neutral-700 hover:text-neutral-900"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            </div>
            {/* Event details + ticket selection */}
            <div className="flex flex-1 flex-col items-center pt-14 pb-8 px-4">
              {/* Event details: Title, Date | Time, Location */}
              <div className="w-full max-w-md text-left mb-6">
                <h1 className="text-xl font-bold text-neutral-900">{post.title ?? 'Event'}</h1>
                <p className="mt-1 text-sm text-neutral-700">
                  {formatEventDateAndTime(post.date, post.time) || '—'}
                </p>
                {post.location_text ? (
                  <p className="mt-1 text-sm text-neutral-700">{post.location_text}</p>
                ) : null}
              </div>
              {/* Ticket selection in light grey container */}
              <div className="w-full max-w-md rounded-2xl bg-neutral-100 p-4 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-neutral-900">Select Passes</h2>
                {passes.length === 0 ? (
                  <p className="text-sm text-neutral-600">No ticket types. You can still register.</p>
                ) : (
                  <div className="space-y-3">
                    {passes.map((pass) => {
                      const isSelected = selectedPassId === pass.pass_id;
                      const ticketImageUrl = pass.media?.[0]?.url ?? eventFirstImageUrl;
                      const ticketGradient = 'linear-gradient(135deg, #09606D, #075057, #D2ECF2)';
                      const cardStyle = ticketImageUrl
                        ? { backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.6), rgba(0,0,0,0.4)), url(${ticketImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' as const }
                        : { background: ticketGradient };
                      return (
                        <button
                          key={pass.pass_id}
                          type="button"
                          onClick={() => setSelectedPassId(pass.pass_id)}
                          className={`flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left text-white transition-all ${
                            isSelected
                              ? 'ring-2 ring-white/70 ring-offset-1 shadow-md'
                              : 'opacity-95 hover:opacity-100'
                          }`}
                          style={cardStyle}
                        >
                          <div className="flex flex-1 items-center gap-3 pr-3">
                            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${isSelected ? 'border-white bg-white/25' : 'border-white/40'}`}>
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
              </div>
              <button
                type="button"
                disabled={(passes.length > 0 && !selectedPassId) || paymentOpening || businessWomenOnlyBlocked}
                onClick={handleProceedToSurvey}
                className="mt-6 w-full max-w-md rounded-[25px] bg-[#1C1C1E] py-4 text-base font-bold text-white disabled:opacity-60 shadow-xl"
              >
                {paymentOpening
                  ? 'Opening payment…'
                  : selectedPassId && (passes.find((p) => p.pass_id === selectedPassId)?.price ?? 0) > 0
                  ? 'Pay & continue'
                  : 'Continue'}
              </button>
              {businessWomenOnlyBlocked ? (
                <p className="mt-2 w-full max-w-md text-center text-sm text-amber-700">This event is only for women.</p>
              ) : null}
              {/* COMMENTED OUT: removed event full message */}
              {/* {eventFull && (
                <p className="mt-2 text-center text-sm text-red-600 w-full max-w-md">Event is full. Better luck next time.</p>
              )} */}
            </div>
          </div>
        ) : post && isBusiness && businessStep === 'survey' ? (
          (() => {
            const selectedPass = selectedPassId ? passes.find((p) => p.pass_id === selectedPassId) : undefined;
            const isPaidPass = selectedPass && selectedPass.price > 0;
            const needsPayment = isPaidPass && paymentVerifiedForPassId !== selectedPassId;

            // simplified question for events without any ticket types
            if (passes.length === 0) {
              return (
                <div className="rounded-2xl bg-white shadow-xl min-h-screen flex flex-col items-center justify-center p-6">
                  <p className="text-lg font-bold text-neutral-900 text-center">
                    Would you like to join us in a post-run coffee at Paragon?
                  </p>
                  <div className="mt-6 flex gap-4">
                    <button
                      type="button"
                      onClick={() => { setWhatBringsYou('yes'); handleSubmitRegistration(); }}
                      className="rounded-full bg-[#1C1C1E] px-6 py-3 text-sm font-bold text-white"
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => { setWhatBringsYou('no'); handleSubmitRegistration(); }}
                      className="rounded-full border border-[#1C1C1E] px-6 py-3 text-sm font-bold text-[#1C1C1E]"
                    >
                      No
                    </button>
                  </div>
                </div>
              );
            }

            return (
          <div className="rounded-2xl bg-white shadow-xl min-h-screen flex flex-col pb-24">
            <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-neutral-200 bg-white px-4 py-3">
              <button type="button" onClick={() => setBusinessStep('tickets')} className="flex items-center gap-1 text-sm font-medium text-neutral-700 hover:text-neutral-900">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back
              </button>
            </div>
            <div className="p-6 flex-1">
            {needsPayment ? (
              <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 p-4">
                <p className="text-sm font-medium text-amber-800">Paid tickets require payment. Please complete payment on the event page first.</p>
                <button type="button" onClick={() => { setError(null); setBusinessStep('tickets'); }} className="mt-3 w-full rounded-full bg-[#1C1C1E] px-4 py-3 text-sm font-bold text-white">Back to tickets — Pay & continue</button>
              </div>
            ) : null}
            <h2 className="mb-4 text-xl font-bold text-neutral-900">Almost there</h2>
                <p className="mb-6 text-sm text-neutral-600">Please complete the registration form to finish booking.</p>
                {(post as any).form_id ? (
                  <FormRenderer
                    formId={(post as any).form_id}
                    planId={postId}
                    userId={user?.user_id}
                    registrationId={registrationId}
                    onSubmit={async (responses) => {
                      setBusinessRegistering(true);
                      setError(null);
                      try {
                        // Ensure registration exists: if none, create via registerForBusinessEvent (server allows update when already exists)
                        let regId = registrationId;
                        if (!regId) {
                          const passId = passes.length > 0 ? selectedPassId ?? undefined : undefined;
                          const r = await registerForBusinessEvent(postId, user!.user_id, passId, undefined, {} as any);
                          regId = (r?.data as any)?.registration?.registration_id ?? (r as any)?.registration?.registration_id ?? null;
                          if (regId) setRegistrationId(regId);
                        }
                        if (!regId) throw new Error('Could not determine registration id');
                        await submitFormResponse({ form_id: (post as any).form_id, registration_id: regId, plan_id: postId, user_id: user!.user_id, responses });
                        // After successful form submission, navigate to ticket/confirmation same as other flow
                        setBusinessRegistered(true);
                        setBusinessStep('detail');
                        setSelectedPassId(null);
                        setPaymentVerifiedForPassId(null);
                        setAgeRange('');
                        setGender('');
                        setRunningExperience('');
                        setWhatBringsYou('');
                        router.push(`/post/${postId}/ticket`);
                      } catch (e: unknown) {
                        setError(e instanceof Error ? e.message : 'Submission failed');
                      } finally {
                        setBusinessRegistering(false);
                      }
                    }}
                  />
                ) : null}
            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
            </div>
            <div className="fixed bottom-0 left-0 right-0 flex justify-center pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] px-4 pointer-events-none z-10">
              <div className="pointer-events-auto">
                <button type="button" disabled={businessRegistering || needsPayment} onClick={handleSubmitRegistration} className="inline-flex items-center justify-center rounded-full bg-[#1C1C1E] px-8 py-3 text-sm font-bold text-white disabled:opacity-60 shadow-xl">
                  {businessRegistering ? 'Completing…' : 'Complete registration'}
                </button>
              </div>
            </div>
          </div>
            );
          })()
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
            eventFull={eventFull}
            isWomenOnly={(post as any)?.is_women_only}
            womenOnlyBlocked={businessWomenOnlyBlocked}
            viewTicketHref={
              businessRegistered && user?.user_id
                ? passes.length === 0
                  ? `/post/${postId}/confirmation${confirmationCode ? `?code=${encodeURIComponent(confirmationCode)}` : ''}`
                  : `/post/${postId}/ticket`
                : undefined
            }
            attendees={guestList}
            currentUserProfileHref={user?.user_id ? `/profile/${user.user_id}` : undefined}
            currentUserAvatar={currentUserProfile?.profile_image}
            currentUserName={currentUserProfile?.name}
            profileCircleHref={user?.user_id && isBusiness ? '/tickets' : undefined}
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
