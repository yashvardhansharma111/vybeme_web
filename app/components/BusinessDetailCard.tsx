'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import { FaFlagCheckered, FaInstagram, FaMusic, FaWhatsapp, FaYoutube, FaGlassCheers } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { HiOutlineLocationMarker, HiOutlineCalendar, HiOutlinePhotograph } from 'react-icons/hi';
import { IoChevronBack, IoClose, IoPaperPlaneOutline } from 'react-icons/io5';
import { IoMdShirt } from 'react-icons/io';
import { GiRunningShoe } from 'react-icons/gi';
import { MdFastfood } from 'react-icons/md';
import { PiLinkSimpleBold } from 'react-icons/pi';
import { getUserProfile } from '@/lib/api';

export interface BusinessDetailPost {
  plan_id?: string;
  title: string;
  description: string;
  media?: Array<{ url: string; type?: string }>;
  image?: string | null;
  user?: { user_id?: string; id?: string; name?: string; profile_image?: string | null };
  user_id?: string;
  location_text?: string;
  date?: string | Date;
  time?: string;
  created_at?: string;
  add_details?: Array<{ detail_type?: string; title: string; description?: string }>;
  passes?: Array<{ pass_id: string; name: string; price: number; description?: string }>;
  [key: string]: unknown;
}

/** Trim URL for display: show hostname + short path (about half), then … */
function trimUrlForDisplay(url: string, maxPathLength = 22): string {
  try {
    const u = new URL(url);
    const path = u.pathname + u.search;
    const pathDisplay = path.length > maxPathLength ? path.slice(0, maxPathLength) + '…' : path;
    return pathDisplay ? `${u.hostname}${pathDisplay}` : u.hostname || 'Link';
  } catch {
    return url.length > 30 ? url.slice(0, 29) + '…' : url || 'Link';
  }
}

/** Render add_detail description: if it is or contains URLs, make them clickable and trimmed */
function renderDetailDescription(description: string, linkClassName: string) {
  const trimmed = description.trim();
  if (/^https?:\/\//.test(trimmed)) {
    return (
      <a href={trimmed} target="_blank" rel="noopener noreferrer" className={linkClassName}>
        {trimUrlForDisplay(trimmed)}
      </a>
    );
  }
  const parts = trimmed.split(/(https?:\/\/[^\s]+)/g);
  if (parts.some((p) => /^https?:\/\//.test(p))) {
    return (
      <>
        {parts.map((part, i) =>
          /^https?:\/\//.test(part) ? (
            <a key={i} href={part.trim()} target="_blank" rel="noopener noreferrer" className={linkClassName}>
              {trimUrlForDisplay(part.trim())}
            </a>
          ) : (
            part
          )
        )}
      </>
    );
  }
  return description;
}

function formatEventDate(date: string | Date | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = d.getDate();
  const ord = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
  return `${day}${ord} ${d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
}

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
function formatDayAndTime(date: string | Date | undefined, time: string | undefined): string {
  if (!date) return formatTimeAMPM(time) ?? '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const dateStr = formatEventDate(date);
  const timeStr = formatTimeAMPM(time);
  return timeStr ? `${dateStr} | ${timeStr} onwards` : dateStr;
}

function formatOrganizerCreatedAt(createdAt: string | Date | undefined): string {
  if (!createdAt) return '';
  const d = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', {
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/** Subtitle under organizer name: "Today 3:44 PM" style */
function formatOrganizerSubtitle(createdAt: string | Date | undefined): string {
  if (!createdAt) return '';
  const d = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startToday.getTime() - startThat.getTime()) / 86400000);
  const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  if (diffDays === 0) return `Today ${timeStr}`;
  if (diffDays === 1) return `Yesterday ${timeStr}`;
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · ${timeStr}`;
}

const DETAIL_TYPE_LABELS: Record<string, string> = {
  distance: 'Distance',
  starting_point: 'Starting Point',
  dress_code: 'Dress Code',
  music_type: 'Music Type',
  parking: 'Parking',
  'f&b': 'F&B',
  links: 'Links',
  strava_link: 'Strava Link',
  google_drive_link: 'Link for photos',
  additional_info: 'Additional Info',
};

const MOBILE_DETAIL_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  distance: GiRunningShoe,
  starting_point: FaFlagCheckered,
  dress_code: IoMdShirt,
  music_type: FaMusic,
  parking: FaGlassCheers,
  'f&b': MdFastfood,
  links: PiLinkSimpleBold,
  strava_link: PiLinkSimpleBold,
  google_drive_link: PiLinkSimpleBold,
  additional_info: FaMusic,
};

function detailRowLabel(detail: { detail_type?: string; title?: string }): string {
  const t = (detail.detail_type || '').trim();
  if (t && DETAIL_TYPE_LABELS[t]) return DETAIL_TYPE_LABELS[t];
  return (detail.title || '').trim() || 'Detail';
}

type AddDetailRow = { detail_type?: string; title: string; description?: string };
function getAllVisibleDetails(addDetails: AddDetailRow[] | undefined): AddDetailRow[] {
  if (!addDetails?.length) return [];
  return addDetails.filter((d) => {
    const label = (detailRowLabel(d) || '').trim();
    const value = (d.description || '').trim();
    return !!label || !!value;
  });
}

function DetailRowIcon({ detailType }: { detailType?: string }) {
  const Icon = MOBILE_DETAIL_ICONS[detailType || ''] ?? FaMusic;
  return <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-neutral-700" aria-hidden />;
}

type OrganizerSocials = {
  instagram?: string;
  x?: string;
  whatsapp?: string;
  youtube?: string;
};

function normalizeSocialLink(value: string | undefined, type: 'instagram' | 'x' | 'whatsapp' | 'youtube'): string | null {
  const raw = (value ?? '').trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;

  if (type === 'instagram') return `https://instagram.com/${raw.replace(/^@/, '')}`;
  if (type === 'x') return `https://x.com/${raw.replace(/^@/, '')}`;
  if (type === 'whatsapp') return `https://wa.me/${raw.replace(/\D/g, '')}`;
  if (type === 'youtube') return raw.startsWith('@') ? `https://youtube.com/${raw}` : `https://youtube.com/${raw.replace(/^@/, '@')}`;
  return null;
}

function getAllImages(post: BusinessDetailPost): string[] {
  const list: string[] = [];
  const seen = new Set<string>();

  const push = (urlRaw: unknown) => {
    const url = String(urlRaw ?? '').trim();
    if (!url) return;
    const key = url.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    list.push(url);
  };

  if (post.media?.length) {
    post.media.forEach((m) => push(m?.url));
  }
  push(post.image);

  return list;
}

const CAROUSEL_INTERVAL_MS = 2000;

export function BusinessDetailCard({
  post,
  authorName,
  onBookEvent,
  registered,
  eventFull,
  actionError,
  isWomenOnly,
  womenOnlyBlocked,
  isCancelled,
  viewTicketHref,
  attendees,
  currentUserProfileHref,
  currentUserAvatar,
  currentUserName,
  profileCircleHref,
}: {
  post: BusinessDetailPost;
  authorName: string;
  appBaseUrl?: string;
  onBookEvent?: () => void;
  registered?: boolean;
  /** When true, event has reached max capacity (20 users); show disabled Register and full message */
  eventFull?: boolean;
  actionError?: string | null;
  isWomenOnly?: boolean;
  womenOnlyBlocked?: boolean;
  isCancelled?: boolean;
  viewTicketHref?: string;
  attendees?: Array<{ name?: string; profile_image?: string | null }>;
  currentUserProfileHref?: string;
  currentUserAvatar?: string | null;
  currentUserName?: string;
  /** When set (e.g. event ticket URL), profile circle links here instead of user profile. Profile link commented out as of now. */
  profileCircleHref?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const author = post.user;
  const authorId = author?.user_id ?? author?.id ?? post.user_id;
  const avatar = author?.profile_image;
  const profileHref = authorId ? `/profile/${authorId}` : undefined;
  const images = getAllImages(post);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [imageLightboxOpen, setImageLightboxOpen] = useState(false);
  const [lightboxStartIndex, setLightboxStartIndex] = useState(0);
  const [lightboxSlideIndex, setLightboxSlideIndex] = useState(0);
  const lightboxScrollRef = useRef<HTMLDivElement>(null);
  const [shareSnackbar, setShareSnackbar] = useState(false);
  const [comingSoon, setComingSoon] = useState(false);
  const [organizerSocials, setOrganizerSocials] = useState<OrganizerSocials | null>(null);
  const hasImage = images.length > 0;
  const addDetails = post.add_details ?? [];
  const visibleDetails = getAllVisibleDetails(addDetails);
  const planId = post.plan_id ?? (post as { post_id?: string }).post_id ?? '';
  const planUrl = typeof window !== 'undefined' && planId ? `${window.location.origin}/post/${planId}` : '';
  const planTitle = (post.title as string) || 'Event on weknd';
  const showWomenOnlyMessage = !!(isWomenOnly && womenOnlyBlocked);
  const showCancelledMessage = !!isCancelled;
  const organizerCreatedLabel = formatOrganizerCreatedAt(post.created_at ?? post.date);
  const organizerSubtitle = formatOrganizerSubtitle(post.created_at);

  useEffect(() => {
    setCarouselIndex((i) => {
      if (images.length === 0) return 0;
      return i >= images.length ? 0 : i;
    });
  }, [images.length]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    const mediaUrls = (post.media ?? []).map((m) => String(m?.url ?? '').trim()).filter(Boolean);
    const imageUrl = String(post.image ?? '').trim();
    console.log('[BusinessDetailCard:image-debug]', {
      planId: post.plan_id ?? (post as { post_id?: string }).post_id ?? null,
      mediaUrls,
      imageUrl,
      dedupedImages: images,
      carouselCount: images.length,
    });
  }, [post, images]);

  useEffect(() => {
    if (images.length <= 1 || imageLightboxOpen) return undefined;
    const n = images.length;
    const t = setInterval(() => {
      setCarouselIndex((i) => (i + 1) % n);
    }, CAROUSEL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [images.length, imageLightboxOpen]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (imageLightboxOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [imageLightboxOpen]);

  useEffect(() => {
    if (!imageLightboxOpen || !lightboxScrollRef.current) return;
    const el = lightboxScrollRef.current;
    const slideW = el.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 0);
    if (slideW <= 0) return;
    const idx = Math.min(Math.max(0, lightboxStartIndex), Math.max(0, images.length - 1));
    setLightboxSlideIndex(idx);
    requestAnimationFrame(() => {
      el.scrollTo({ left: idx * slideW, behavior: 'auto' });
    });
  }, [imageLightboxOpen, lightboxStartIndex, images.length]);

  useEffect(() => {
    if (!imageLightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setImageLightboxOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [imageLightboxOpen]);

  const openImageLightbox = useCallback((index: number) => {
    if (!images.length) return;
    setLightboxStartIndex(Math.min(Math.max(0, index), images.length - 1));
    setImageLightboxOpen(true);
  }, [images.length]);

  useEffect(() => {
    if (!authorId) {
      setOrganizerSocials(null);
      return;
    }
    let alive = true;
    getUserProfile(authorId)
      .then((res) => {
        if (!alive || !res.success || !res.data) return;
        const social = (res.data.social_media ?? {}) as Record<string, string | undefined>;
        setOrganizerSocials({
          instagram: normalizeSocialLink(social.instagram, 'instagram') ?? undefined,
          x: normalizeSocialLink(social.x ?? social.twitter, 'x') ?? undefined,
          whatsapp: normalizeSocialLink(social.whatsapp, 'whatsapp') ?? undefined,
          youtube: normalizeSocialLink(social.youtube, 'youtube') ?? undefined,
        });
      })
      .catch(() => {
        if (alive) setOrganizerSocials(null);
      });
    return () => {
      alive = false;
    };
  }, [authorId]);

  const socialLinks = [
    organizerSocials?.instagram ? { href: organizerSocials.instagram, label: 'Instagram', Icon: FaInstagram } : null,
    organizerSocials?.x ? { href: organizerSocials.x, label: 'X', Icon: FaXTwitter } : null,
    organizerSocials?.whatsapp ? { href: organizerSocials.whatsapp, label: 'WhatsApp', Icon: FaWhatsapp } : null,
    organizerSocials?.youtube ? { href: organizerSocials.youtube, label: 'YouTube', Icon: FaYoutube } : null,
  ].filter(Boolean) as Array<{ href: string; label: string; Icon: ComponentType<{ className?: string }> }>;

  const copyAndSnackbar = useCallback(() => {
    if (!planUrl) return;
    navigator.clipboard?.writeText(planUrl).then(() => {
      setShareSnackbar(true);
      setTimeout(() => setShareSnackbar(false), 1000);
    });
  }, [planUrl]);

  const onShare = useCallback(() => {
    if (!planUrl) return;
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ url: planUrl, title: planTitle }).catch(() => copyAndSnackbar());
    } else {
      copyAndSnackbar();
    }
  }, [planUrl, planTitle, copyAndSnackbar]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-white max-md:min-h-0 max-md:h-full md:min-h-screen">
      {/* Desktop: top bar – profile leftmost (sticky), then weknd., Download app right */}
      <header className="hidden md:flex fixed left-0 right-0 top-0 z-40 h-14 items-center justify-between border-b border-neutral-200 bg-white px-6">
        <div className="flex items-center gap-4">
          {(profileCircleHref ?? currentUserProfileHref) ? (
            <Link href={profileCircleHref ?? currentUserProfileHref!} className="flex shrink-0 items-center rounded-full transition-opacity hover:opacity-80" aria-label={profileCircleHref === '/' || profileCircleHref === '/tickets' ? 'My tickets' : (profileCircleHref ? 'View your pass' : (currentUserName ?? 'Your profile'))}>
              <div className="relative h-9 w-9 overflow-hidden rounded-full bg-neutral-200">
                {currentUserAvatar ? <Image src={currentUserAvatar} alt="" fill className="object-cover" sizes="36px" /> : <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-neutral-600">{(currentUserName ?? 'You').charAt(0)}</span>}
              </div>
            </Link>
          ) : null}
          {/* Profile link: commented out as of now — profile circle links to ticket when profileCircleHref is passed */}
          <Link href="/" className="text-lg font-bold text-neutral-900 no-underline">
            weknd.
          </Link>
        </div>
       
      </header>
      {comingSoon && (
        <div className="fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-lg bg-neutral-800 px-4 py-2 text-sm font-medium text-white shadow-lg hidden md:block" role="status">
          Coming soon
        </div>
      )}

      {/* Mobile: viewport-bound column so scroll stays in main; header is sticky inside main */}
      <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-white md:hidden">
        {shareSnackbar && (
          <div className="fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-[#1C1C1E] px-4 py-2.5 text-sm font-medium text-white shadow-xl" role="status">
            Copied plan link
          </div>
        )}

        <main className="min-h-0 flex-1 overflow-y-auto pb-28" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="sticky top-0 z-40">
            {/* App bar: weknd. + signed-in viewer (matches tickets / app shell) */}
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-100 bg-white px-4 pt-[max(8px,env(safe-area-inset-top))] pb-2 shadow-[0_1px_0_rgba(0,0,0,0.06)]">
              <Link href="/" className="text-lg font-bold text-neutral-900 no-underline">
                weknd.
              </Link>
              {currentUserProfileHref ? (
                <Link
                  href={currentUserProfileHref}
                  className="flex max-w-[55%] items-center gap-2.5 rounded-full py-0.5 pl-0.5 pr-1 transition-opacity active:opacity-80"
                  aria-label={currentUserName ? `Your profile, ${currentUserName}` : 'Your profile'}
                >
                  <span className="min-w-0 truncate text-right text-sm font-semibold text-neutral-800">
                    {currentUserName ?? 'Account'}
                  </span>
                  <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-neutral-200">
                    {currentUserAvatar ? (
                      <Image src={currentUserAvatar} alt="" fill className="object-cover" sizes="36px" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-neutral-600">
                        {(currentUserName ?? 'You').charAt(0)}
                      </span>
                    )}
                  </div>
                </Link>
              ) : (
                <Link href={`/login?redirect=${encodeURIComponent(pathname || '/')}`} className="text-sm font-semibold text-neutral-700 no-underline">
                  Log in
                </Link>
              )}
            </div>

            {/* Second row: transparent bar so hero shows through — back | frosted owner pill | share */}
            <div className="flex items-center gap-2 bg-transparent px-2 py-2.5">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-neutral-900 shadow-sm ring-1 ring-neutral-200/80 transition-colors active:bg-neutral-50"
                aria-label="Back"
              >
                <IoChevronBack className="h-5 w-5" />
              </button>
              <div className="flex min-w-0 flex-1 justify-center px-1">
                {profileHref ? (
                  <Link
                    href={profileHref}
                    className="flex max-w-full items-center gap-2 rounded-full border border-neutral-200/60 bg-stone-200/45 py-1 pl-1 pr-3 shadow-sm backdrop-blur-xl backdrop-saturate-150 no-underline supports-[backdrop-filter]:bg-stone-300/35"
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#00B4E8] text-[16px] font-bold leading-none text-white shadow-sm"
                      aria-hidden
                    >
                      ;
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="truncate text-[14px] font-bold leading-tight text-neutral-900">{authorName}</p>
                      {organizerSubtitle ? (
                        <p className="mt-0.5 truncate text-[11px] font-medium leading-tight text-neutral-600">{organizerSubtitle}</p>
                      ) : null}
                    </div>
                  </Link>
                ) : (
                  <div className="flex max-w-full items-center gap-2 rounded-full border border-neutral-200/60 bg-stone-200/45 py-1 pl-1 pr-3 shadow-sm backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-stone-300/35">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#00B4E8] text-[16px] font-bold leading-none text-white shadow-sm"
                      aria-hidden
                    >
                      ;
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="truncate text-[14px] font-bold leading-tight text-neutral-900">{authorName}</p>
                      {organizerSubtitle ? (
                        <p className="mt-0.5 truncate text-[11px] font-medium leading-tight text-neutral-600">{organizerSubtitle}</p>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={onShare}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-neutral-900 shadow-sm ring-1 ring-neutral-200/80 transition-colors active:bg-neutral-50"
                aria-label="Share event"
              >
                <IoPaperPlaneOutline className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="px-4 pt-1">
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[24px] bg-neutral-200 shadow-sm">
              {hasImage ? (
                <>
                  <button
                    type="button"
                    className="absolute inset-0 z-0 cursor-zoom-in border-0 bg-transparent p-0 text-left"
                    aria-label="View photos full screen"
                    onClick={() => openImageLightbox(carouselIndex)}
                  >
                    {images.map((url, i) => (
                      <div
                        key={`${url}-${i}`}
                        className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${i === carouselIndex ? 'opacity-100' : 'opacity-0'}`}
                      >
                        <Image src={url} alt="" fill className="object-cover" sizes="100vw" priority={i === 0} />
                      </div>
                    ))}
                  </button>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-neutral-200">
                  <HiOutlinePhotograph className="h-14 w-14 text-neutral-500" aria-hidden />
                </div>
              )}

              {images.length > 1 && (
                <div
                  className="pointer-events-auto absolute bottom-3 left-0 right-0 z-10 flex justify-center gap-1.5 px-3"
                  role="tablist"
                  aria-label="Event photos"
                >
                  {images.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      role="tab"
                      aria-selected={i === carouselIndex}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCarouselIndex(i);
                      }}
                      className={`h-2 min-w-2 rounded-full transition-all ${i === carouselIndex ? 'w-7 bg-white shadow-md ring-1 ring-black/10' : 'w-2 bg-white/70 hover:bg-white/90'}`}
                      aria-label={`Photo ${i + 1} of ${images.length}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 px-4 pt-6">
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-neutral-900">{post.title}</h1>

            {(post.location_text || post.date) && (
              <div className="rounded-2xl bg-[#F2F2F7] p-4">
                {post.location_text && (
                  <div className="flex gap-3">
                    <HiOutlineLocationMarker className="mt-0.5 h-5 w-5 shrink-0 text-neutral-600" aria-hidden />
                    <p className="text-sm font-semibold text-neutral-900">{post.location_text}</p>
                  </div>
                )}
                {post.date && (
                  <div className={`flex gap-3 ${post.location_text ? 'mt-3' : ''}`}>
                    <HiOutlineCalendar className="mt-0.5 h-5 w-5 shrink-0 text-neutral-600" aria-hidden />
                    <p className="text-sm font-semibold leading-snug text-neutral-900">
                      {formatDayAndTime(post.date, post.time)}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="text-sm leading-relaxed text-neutral-800 whitespace-pre-line">
              {post.description?.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                /^https?:\/\//.test(part) ? (
                  <a
                    key={i}
                    href={part.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-[#007AFF] underline"
                  >
                    {trimUrlForDisplay(part.trim())}
                  </a>
                ) : (
                  part
                )
              )}
            </div>

            {visibleDetails.length > 0 && (
              <div className="space-y-4 rounded-2xl bg-[#F2F2F7] p-4">
                {visibleDetails.map((detail, i) => (
                  <div key={`${detail.detail_type ?? detail.title}-${i}`} className="flex gap-3">
                    <DetailRowIcon detailType={detail.detail_type} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        {detailRowLabel(detail)}
                      </p>
                      {detail.description ? (
                        <p className="mt-1 text-sm font-semibold text-neutral-900 whitespace-pre-line">
                          {renderDetailDescription(detail.description, 'text-[#007AFF] underline break-words')}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {socialLinks.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-neutral-500">Follow {authorName}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {socialLinks.map(({ href, label, Icon }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#F2F2F7] text-neutral-900 transition-opacity hover:opacity-75"
                      aria-label={label}
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#1C1C1E] px-4 py-3.5">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">See who&apos;s coming</p>
                <p className="mt-0.5 text-xs text-white/70">Join event to view</p>
              </div>
              <div className="flex shrink-0 -space-x-2">
                {attendees && attendees.length > 0 ? (
                  attendees.slice(0, 4).map((a, idx) => (
                    <div
                      key={idx}
                      className="relative h-9 w-9 overflow-hidden rounded-full border-2 border-[#1C1C1E] bg-neutral-600"
                    >
                      {a.profile_image ? (
                        <Image src={a.profile_image} alt="" fill className="object-cover" sizes="36px" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-white">
                          {(a.name || '?').charAt(0)}
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <>
                    <div className="h-9 w-9 rounded-full border-2 border-[#1C1C1E] bg-neutral-700" />
                    <div className="h-9 w-9 rounded-full border-2 border-[#1C1C1E] bg-neutral-600" />
                    <div className="h-9 w-9 rounded-full border-2 border-[#1C1C1E] bg-neutral-700" />
                  </>
                )}
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* Mobile: sticky View Pass / Register */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-100 bg-white pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] px-4 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] md:hidden">
        <div className="mx-auto w-full max-w-md">
          {registered && viewTicketHref ? (
            <Link
              href={viewTicketHref}
              className="flex w-full items-center justify-center rounded-full bg-[#1C1C1E] py-3.5 text-base font-bold text-white no-underline"
            >
              View Pass
            </Link>
          ) : eventFull ? (
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={onBookEvent}
                className="w-full cursor-not-allowed rounded-full bg-neutral-400 py-3.5 text-base font-bold text-white"
              >
                Register
              </button>
              <p className="text-sm text-neutral-500">{actionError || "It\u0027s full. Better luck next time."}</p>
            </div>
          ) : showWomenOnlyMessage ? (
            <div className="flex flex-col items-center gap-2">
              <button type="button" disabled className="w-full cursor-not-allowed rounded-full bg-neutral-400 py-3.5 text-base font-bold text-white">
                Register
              </button>
              <p className="text-sm text-amber-700">This event is only for women.</p>
            </div>
          ) : showCancelledMessage ? (
            <div className="flex flex-col items-center gap-2">
              <button type="button" disabled className="w-full cursor-not-allowed rounded-full bg-neutral-400 py-3.5 text-base font-bold text-white">
                Register
              </button>
              <p className="text-sm text-red-600">{actionError || 'This event has been cancelled.'}</p>
            </div>
          ) : onBookEvent ? (
            <button type="button" onClick={onBookEvent} className="w-full rounded-full bg-[#1C1C1E] py-3.5 text-base font-bold text-white">
              Register
            </button>
          ) : (
            <a href="/login" className="flex w-full items-center justify-center rounded-full bg-[#1C1C1E] py-3.5 text-base font-bold text-white no-underline">
              Register
            </a>
          )}
        </div>
      </div>

      {/* Desktop: two-column – left 40% pill + image, right 60% content */}
      <div className="hidden md:flex min-h-screen flex-col pt-14">
        <div className="flex flex-1 min-h-0">
          <div className="flex w-[40%] flex-col gap-4 p-6 overflow-y-auto bg-white">
            <div className="flex justify-start">
              <div className="rounded-full border border-neutral-200 bg-white pl-2 pr-4 py-2 shadow-2xl inline-flex items-center gap-3 max-w-[220px] min-w-0">
                {profileHref ? (
                  <Link href={profileHref} className="flex min-w-0 flex-1 items-center gap-3 transition-opacity hover:opacity-90 overflow-hidden">
                    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-neutral-200">
                      {avatar ? <Image src={avatar} alt="" fill className="object-cover" sizes="36px" /> : <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-neutral-500">{authorName.charAt(0)}</span>}
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <p className="truncate text-sm font-semibold text-neutral-900">{authorName}</p>
                      {organizerCreatedLabel ? <p className="truncate text-[11px] text-neutral-500">{organizerCreatedLabel}</p> : null}
                    </div>
                  </Link>
                ) : (
                  <>
                    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-neutral-200">
                      {avatar ? <Image src={avatar} alt="" fill className="object-cover" sizes="36px" /> : <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-neutral-500">{authorName.charAt(0)}</span>}
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <p className="truncate text-sm font-semibold text-neutral-900">{authorName}</p>
                      {organizerCreatedLabel ? <p className="truncate text-[11px] text-neutral-500">{organizerCreatedLabel}</p> : null}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-neutral-200">
              {hasImage ? (
                <button
                  type="button"
                  className="absolute inset-0 z-0 cursor-zoom-in border-0 bg-transparent p-0"
                  aria-label="View photos full screen"
                  onClick={() => openImageLightbox(carouselIndex)}
                >
                  <Image src={images[carouselIndex] ?? images[0]} alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 40vw" />
                </button>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <HiOutlinePhotograph className="h-16 w-16 text-neutral-400" aria-hidden />
                </div>
              )}
            </div>
            {socialLinks.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-neutral-500">Follow {authorName}</p>
                <div className="mt-2 flex items-center gap-2">
                  {socialLinks.map(({ href, label, Icon }) => (
                    <a
                      key={`desktop-${label}`}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-900 transition-opacity hover:opacity-75"
                      aria-label={label}
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex w-[60%] flex-col overflow-y-auto bg-white px-8 py-8">
            <h1 className="text-2xl font-extrabold text-neutral-900">{post.title}</h1>
            {post.date && (
              <div className="mt-4 flex gap-3 flex-wrap">
                <div className="rounded-xl bg-neutral-100 p-4 flex gap-2 items-start">
                  <HiOutlineCalendar className="h-4 w-4 shrink-0 text-neutral-600 mt-0.5" aria-hidden />
                  <p className="text-sm font-semibold text-neutral-800 leading-tight">{formatDayAndTime(post.date, post.time)}</p>
                </div>
                {post.location_text && (
                  <div className="rounded-xl bg-neutral-100 p-4 flex gap-2 items-start">
                    <HiOutlineLocationMarker className="h-4 w-4 shrink-0 text-neutral-600 mt-0.5" aria-hidden />
                    <p className="text-sm font-semibold text-neutral-800">{post.location_text}</p>
                  </div>
                )}
              </div>
            )}
            {!post.date && post.location_text && (
              <div className="mt-4 rounded-xl bg-neutral-100 p-4 flex gap-2 items-start">
                <HiOutlineLocationMarker className="h-4 w-4 shrink-0 text-neutral-600 mt-0.5" aria-hidden />
                <p className="text-sm font-semibold text-neutral-800">{post.location_text}</p>
              </div>
            )}
            {visibleDetails.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-3">
                {visibleDetails.map((detail, i) => (
                  <div key={`${detail.detail_type ?? detail.title}-d-${i}`} className="min-w-[200px] rounded-xl bg-neutral-100 px-4 py-3">
                    <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">{detailRowLabel(detail)}</p>
                    {detail.description ? (
                      <p className="mt-1 text-sm font-semibold text-neutral-800 whitespace-pre-line">
                        {renderDetailDescription(detail.description, 'text-neutral-900 underline break-words')}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
            <p className="mt-5 text-sm leading-relaxed text-neutral-700 whitespace-pre-line">
              {post.description?.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                /^https?:\/\//.test(part) ? (
                  <a key={i} href={part.trim()} target="_blank" rel="noopener noreferrer" className="text-neutral-900 underline break-all">
                    {trimUrlForDisplay(part.trim())}
                  </a>
                ) : (
                  part
                )
              )}
            </p>
            <div className="mt-8">
              {registered && viewTicketHref ? (
                <Link href={viewTicketHref} className="inline-flex items-center justify-center rounded-full bg-neutral-900 px-8 py-3 text-sm font-bold text-white no-underline shadow-xl hover:bg-neutral-800">
                  View your pass
                </Link>
              ) : eventFull ? (
                <div className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={onBookEvent}
                    className="inline-flex items-center justify-center rounded-full bg-neutral-400 px-8 py-3 text-sm font-bold text-white shadow-xl cursor-not-allowed"
                  >
                    Register
                  </button>
                  <p className="text-sm text-neutral-500">{actionError || "It\u0027s full. Better luck next time."}</p>
                </div>
              ) : showWomenOnlyMessage ? (
                <div className="flex flex-col items-center gap-2">
                  <button type="button" disabled className="inline-flex items-center justify-center rounded-full bg-neutral-400 px-8 py-3 text-sm font-bold text-white shadow-xl cursor-not-allowed">
                    Register
                  </button>
                  <p className="text-sm text-amber-700">This event is only for women.</p>
                </div>
              ) : showCancelledMessage ? (
                <div className="flex flex-col items-center gap-2">
                  <button type="button" disabled className="inline-flex items-center justify-center rounded-full bg-neutral-400 px-8 py-3 text-sm font-bold text-white shadow-xl cursor-not-allowed">
                    Register
                  </button>
                  <p className="text-sm text-red-600">{actionError || 'This event has been cancelled.'}</p>
                </div>
              ) : onBookEvent ? (
                <button type="button" onClick={onBookEvent} className="inline-flex items-center justify-center rounded-full bg-neutral-900 px-8 py-3 text-sm font-bold text-white shadow-xl hover:bg-neutral-800">
                  Register
                </button>
              ) : (
                <a href="/login" className="inline-flex items-center justify-center rounded-full bg-neutral-900 px-8 py-3 text-sm font-bold text-white no-underline shadow-xl hover:bg-neutral-800">
                  Register
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Full-screen image gallery: close (top-left), horizontal scroll between images */}
      {imageLightboxOpen && images.length > 0 ? (
        <div
          className="fixed inset-0 z-[200] flex flex-col bg-black"
          role="dialog"
          aria-modal="true"
          aria-label="Event photos"
        >
          <button
            type="button"
            onClick={() => setImageLightboxOpen(false)}
            className="absolute z-[210] flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition-colors hover:bg-white/25"
            style={{
              top: 'max(1rem, env(safe-area-inset-top))',
              left: 'max(1rem, env(safe-area-inset-left))',
            }}
            aria-label="Close gallery"
          >
            <IoClose className="h-7 w-7" aria-hidden />
          </button>
          <div
            ref={lightboxScrollRef}
            className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
            style={{ WebkitOverflowScrolling: 'touch' }}
            onScroll={(e) => {
              const el = e.currentTarget;
              const w = el.clientWidth;
              if (w <= 0) return;
              const i = Math.round(el.scrollLeft / w);
              setLightboxSlideIndex(Math.min(Math.max(0, i), images.length - 1));
            }}
          >
            {images.map((url, i) => (
              <div
                key={`lb-${url}-${i}`}
                className="relative flex h-full w-screen min-w-[100vw] shrink-0 snap-center snap-always items-center justify-center px-2 pt-16 pb-8"
              >
                <div className="relative h-full w-full max-h-[calc(100dvh-5rem)] min-h-[40vh]">
                  <Image src={url} alt="" fill className="object-contain" sizes="100vw" priority={i === lightboxStartIndex} />
                </div>
              </div>
            ))}
          </div>
          {images.length > 1 ? (
            <div className="pointer-events-none absolute bottom-6 left-0 right-0 flex justify-center gap-1.5 px-4 pb-[env(safe-area-inset-bottom)]">
              {images.map((_, i) => (
                <span
                  key={`dot-${i}`}
                  className="h-1.5 rounded-full bg-white/40 transition-all"
                  style={{
                    width: i === lightboxSlideIndex ? 24 : 6,
                    opacity: i === lightboxSlideIndex ? 1 : 0.65,
                  }}
                  aria-hidden
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
