'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { HiOutlineLocationMarker, HiOutlineCalendar, HiOutlineShare, HiOutlinePhotograph } from 'react-icons/hi';

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
  add_details?: Array<{ detail_type?: string; title: string; description?: string }>;
  passes?: Array<{ pass_id: string; name: string; price: number; description?: string }>;
  [key: string]: unknown;
}

function formatEventDate(date: string | Date | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = d.getDate();
  const ord = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
  return `${day}${ord} ${d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
}

function formatDayAndTime(date: string | Date | undefined, time: string | undefined): string {
  if (!date) return time ?? '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const dateStr = formatEventDate(date);
  return time ? `${dateStr} | ${time} onwards` : dateStr;
}

function formatOrganizerTime(date: string | Date | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { weekday: 'long', hour: 'numeric', minute: '2-digit', hour12: true });
}

function getAllImages(post: BusinessDetailPost): string[] {
  const list: string[] = [];
  if (post.media?.length) {
    post.media.forEach((m) => { if (m?.url) list.push(m.url); });
  }
  if (post.image && String(post.image).trim() && !list.includes(String(post.image))) {
    list.push(String(post.image));
  }
  return list.length ? list : [];
}

const CAROUSEL_INTERVAL_MS = 2000;

export function BusinessDetailCard({
  post,
  authorName,
  onBookEvent,
  registered = false,
  viewTicketHref,
  attendees,
  currentUserProfileHref,
  currentUserAvatar,
  currentUserName,
}: {
  post: BusinessDetailPost;
  authorName: string;
  appBaseUrl?: string;
  onBookEvent?: () => void;
  registered?: boolean;
  viewTicketHref?: string;
  selectedPassId?: string | null;
  onSelectPass?: (passId: string) => void;
  attendees?: Array<{ name?: string; profile_image?: string | null }>;
  currentUserProfileHref?: string;
  currentUserAvatar?: string | null;
  currentUserName?: string;
}) {
  const author = post.user;
  const authorId = author?.user_id ?? author?.id ?? post.user_id;
  const avatar = author?.profile_image;
  const profileHref = authorId ? `/profile/${authorId}` : undefined;
  const images = getAllImages(post);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [shareSnackbar, setShareSnackbar] = useState(false);
  const [comingSoon, setComingSoon] = useState(false);
  const hasImage = images.length > 0;
  const addDetails = post.add_details ?? [];
  const planId = post.plan_id ?? (post as { post_id?: string }).post_id ?? '';
  const planUrl = typeof window !== 'undefined' && planId ? `${window.location.origin}/post/${planId}` : '';
  const planTitle = (post.title as string) || 'Event on vybeme';

  useEffect(() => {
    if (images.length <= 1) return;
    const t = setInterval(() => {
      setCarouselIndex((i) => (i + 1) % images.length);
    }, CAROUSEL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [images.length]);

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
    <div className="flex min-h-screen w-full flex-col bg-white">
      {/* Desktop: top bar – vybeme. left; Download app + profile right */}
      <header className="hidden md:flex fixed left-0 right-0 top-0 z-40 h-14 items-center justify-between border-b border-neutral-200 bg-white px-6">
        <Link href="/" className="text-lg font-bold text-neutral-900 no-underline">
          vybeme.
        </Link>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              setComingSoon(true);
              setTimeout(() => setComingSoon(false), 2000);
            }}
            className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
          >
            Download app
          </button>
          {currentUserProfileHref ? (
            <Link href={currentUserProfileHref} className="flex shrink-0 items-center rounded-full transition-opacity hover:opacity-80" aria-label={currentUserName ?? 'Your profile'}>
              <div className="relative h-9 w-9 overflow-hidden rounded-full bg-neutral-200">
                {currentUserAvatar ? <Image src={currentUserAvatar} alt="" fill className="object-cover" sizes="36px" /> : <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-neutral-600">{(currentUserName ?? 'You').charAt(0)}</span>}
              </div>
            </Link>
          ) : null}
        </div>
      </header>
      {comingSoon && (
        <div className="fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-lg bg-neutral-800 px-4 py-2 text-sm font-medium text-white shadow-lg hidden md:block" role="status">
          Coming soon
        </div>
      )}

      {/* Mobile: profile top right when logged in */}
      {currentUserProfileHref ? (
        <header className="fixed left-0 right-0 top-0 z-30 flex h-14 items-center justify-end px-4 pt-[env(safe-area-inset-top)] bg-gradient-to-b from-black/40 to-transparent md:hidden">
          <Link href={currentUserProfileHref} className="flex shrink-0 items-center justify-center rounded-full bg-white/20 p-1 backdrop-blur-sm transition-opacity hover:bg-white/30" aria-label={currentUserName ?? 'Your profile'}>
            <div className="relative h-8 w-8 overflow-hidden rounded-full bg-white/40">
              {currentUserAvatar ? <Image src={currentUserAvatar} alt="" fill className="object-cover" sizes="32px" /> : <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-white">{(currentUserName ?? 'You').charAt(0)}</span>}
            </div>
          </Link>
        </header>
      ) : null}

      {/* Mobile: Hero image – ~60% viewport */}
      <div className="fixed left-1/2 top-0 z-10 h-[60vh] min-h-[280px] w-screen max-w-none -translate-x-1/2 overflow-hidden md:hidden">
        {hasImage ? (
          <>
            {images.map((url, i) => (
              <div
                key={url}
                className={`absolute inset-0 transition-opacity duration-500 ${i === carouselIndex ? 'opacity-100 z-0' : 'opacity-0 z-0'}`}
              >
                <Image src={url} alt="" fill className="object-cover" sizes="100vw" />
              </div>
            ))}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-200">
            <HiOutlinePhotograph className="h-14 w-14 text-neutral-500" aria-hidden />
          </div>
        )}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 z-10 flex justify-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCarouselIndex(i)}
                className={`h-2 rounded-full transition-all ${i === carouselIndex ? 'w-5 bg-white' : 'w-2 bg-white/60'}`}
                aria-label={`Image ${i + 1} of ${images.length}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Mobile: Sticky bar – organiser pill + share */}
      <div className={`fixed left-4 right-4 z-30 flex items-center justify-between gap-2 pt-[env(safe-area-inset-top)] ${currentUserProfileHref ? 'top-14' : 'top-10'} md:hidden`}>
        <div className="flex flex-1 justify-center min-w-0">
          <div className="rounded-full border border-white/30 bg-white/95 pl-2 pr-3 py-1.5 shadow-xl flex items-center gap-2 min-w-0 max-w-[200px]">
            {profileHref ? (
              <Link href={profileHref} className="flex min-w-0 items-center gap-2 transition-opacity hover:opacity-90">
                <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[#E5E5EA]">
                  {avatar ? <Image src={avatar} alt="" fill className="object-cover" sizes="32px" /> : <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-[#8E8E93]">{authorName.charAt(0)}</span>}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#1C1C1E] max-w-[140px]">{authorName}</p>
                  <p className="text-[11px] text-[#8E8E93]">{formatOrganizerTime(post.date)}</p>
                </div>
              </Link>
            ) : (
              <>
                <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[#E5E5EA]">
                  {avatar ? <Image src={avatar} alt="" fill className="object-cover" sizes="32px" /> : <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-[#8E8E93]">{authorName.charAt(0)}</span>}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#1C1C1E] max-w-[140px]">{authorName}</p>
                  <p className="text-[11px] text-[#8E8E93]">{formatOrganizerTime(post.date)}</p>
                </div>
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onShare}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white shadow-xl border border-white/30 hover:bg-white/30 transition-opacity"
          aria-label="Share plan"
        >
          <HiOutlineShare className="h-5 w-5" strokeWidth={2} />
        </button>
      </div>

      {shareSnackbar && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#1C1C1E] px-4 py-2.5 text-sm font-medium text-white shadow-xl" role="status">
          Copied plan link
        </div>
      )}

      {/* Mobile: Scrollable area */}
      <div
        className="relative z-20 flex-1 min-h-0 overflow-y-auto pt-[58vh] mx-[5px] md:hidden"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div
          className="rounded-t-[24px] px-5 pb-24 pt-2 shadow-lg min-h-[calc(100vh-120px)]"
          style={{
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.95) 12%, rgb(255,255,255) 25%, rgb(255,255,255) 100%)',
          }}
        >
          <h1 className="text-[22px] font-extrabold text-[#1C1C1E]">{post.title}</h1>
          <p className="mt-2 text-sm leading-[21px] text-[#444] whitespace-pre-line">
            {post.description?.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
              /^https?:\/\//.test(part) ? (
                <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-[#007AFF] underline">
                  {part}
                </a>
              ) : (
                part
              )
            )}
          </p>
          {(post.location_text || post.date) && (
            <div className="mt-4 rounded-[14px] bg-[#F2F2F7] p-3.5">
              {post.location_text && (
                <div className="flex gap-2">
                  <HiOutlineLocationMarker className="h-4 w-4 shrink-0 text-neutral-600 mt-0.5" aria-hidden />
                  <p className="text-sm font-semibold text-[#1C1C1E]">{post.location_text}</p>
                </div>
              )}
              {post.date && (
                <div className={`flex gap-2 ${post.location_text ? 'mt-3' : ''}`}>
                  <HiOutlineCalendar className="h-4 w-4 shrink-0 text-neutral-600 mt-0.5" aria-hidden />
                  <p className="text-sm font-semibold text-[#1C1C1E] leading-tight">{formatDayAndTime(post.date, post.time)}</p>
                </div>
              )}
            </div>
          )}
          {addDetails.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2.5">
              {addDetails.slice(0, 4).map((detail, i) => (
                <div key={i} className="min-w-[47%] flex-1 rounded-xl bg-[#F2F2F7] px-3 py-2.5">
                  <p className="text-xs font-semibold text-[#8E8E93]">{detail.title}</p>
                  {detail.description ? <p className="mt-1 text-sm font-semibold text-[#1C1C1E] whitespace-pre-line">{detail.description}</p> : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile: Floating bottom – Register / View ticket */}
      <div className="fixed bottom-0 left-0 right-0 z-30 flex justify-center pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] px-4 pointer-events-none md:hidden">
        <div className="pointer-events-auto">
          {registered && viewTicketHref ? (
            <Link href={viewTicketHref} className="inline-flex items-center justify-center rounded-full bg-[#1C1C1E] px-8 py-2.5 text-sm font-bold text-white no-underline shadow-xl">
              View ticket
            </Link>
          ) : onBookEvent ? (
            <button type="button" onClick={onBookEvent} className="inline-flex items-center justify-center rounded-full bg-[#1C1C1E] px-8 py-2.5 text-sm font-bold text-white shadow-xl">
              Register
            </button>
          ) : (
            <a href="/login" className="inline-flex items-center justify-center rounded-full bg-[#1C1C1E] px-8 py-2.5 text-sm font-bold text-white no-underline shadow-xl">
              Register
            </a>
          )}
        </div>
      </div>

      {/* Desktop: two-column – left 40% pill + image, right 60% content */}
      <div className="hidden md:flex min-h-screen flex-col pt-14">
        <div className="flex flex-1 min-h-0">
          <div className="flex w-[40%] flex-col gap-4 p-6 overflow-y-auto bg-white">
            <div className="flex justify-center">
              <div className="rounded-full border border-neutral-200 bg-neutral-50 pl-2 pr-4 py-2 shadow-xl inline-flex items-center gap-3 w-fit">
                {profileHref ? (
                  <Link href={profileHref} className="flex min-w-0 items-center gap-3 transition-opacity hover:opacity-90">
                    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-neutral-200">
                      {avatar ? <Image src={avatar} alt="" fill className="object-cover" sizes="36px" /> : <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-neutral-500">{authorName.charAt(0)}</span>}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-neutral-900">{authorName}</p>
                      <p className="text-xs text-neutral-500">{formatOrganizerTime(post.date)}</p>
                    </div>
                  </Link>
                ) : (
                  <>
                    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-neutral-200">
                      {avatar ? <Image src={avatar} alt="" fill className="object-cover" sizes="36px" /> : <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-neutral-500">{authorName.charAt(0)}</span>}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-neutral-900">{authorName}</p>
                      <p className="text-xs text-neutral-500">{formatOrganizerTime(post.date)}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-neutral-200">
              {hasImage ? (
                <Image src={images[carouselIndex] ?? images[0]} alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 40vw" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <HiOutlinePhotograph className="h-16 w-16 text-neutral-400" aria-hidden />
                </div>
              )}
            </div>
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
            {addDetails.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-3">
                {addDetails.slice(0, 4).map((detail, i) => (
                  <div key={i} className="min-w-[200px] rounded-xl bg-neutral-100 px-4 py-3">
                    <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">{detail.title}</p>
                    {detail.description ? <p className="mt-1 text-sm font-semibold text-neutral-800 whitespace-pre-line">{detail.description}</p> : null}
                  </div>
                ))}
              </div>
            )}
            <p className="mt-5 text-sm leading-relaxed text-neutral-700 whitespace-pre-line">
              {post.description?.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                /^https?:\/\//.test(part) ? (
                  <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-neutral-900 underline">
                    {part}
                  </a>
                ) : (
                  part
                )
              )}
            </p>
            <div className="mt-8">
              {registered && viewTicketHref ? (
                <Link href={viewTicketHref} className="inline-flex items-center justify-center rounded-full bg-neutral-900 px-8 py-3 text-sm font-bold text-white no-underline shadow-xl hover:bg-neutral-800">
                  View ticket
                </Link>
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
    </div>
  );
}
