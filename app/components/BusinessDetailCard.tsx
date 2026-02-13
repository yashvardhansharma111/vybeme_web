'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

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

function formatTimeOnly(time: string | undefined): string {
  return time?.trim() ?? '';
}

type TagItem = { type: 'distance' | 'location' | 'fb' | 'category'; label: string };
function getCardTags(post: BusinessDetailPost): TagItem[] {
  const addDetails = post.add_details ?? [];
  const detailByType = (type: string) => addDetails.find((d) => d.detail_type === type);
  const tags: TagItem[] = [];
  const distanceLabel = detailByType('distance')?.title || detailByType('distance')?.description;
  const fbLabel = detailByType('f&b')?.title || detailByType('f&b')?.description;
  const locationLabel = post.location_text?.trim();
  if (distanceLabel) tags.push({ type: 'distance', label: distanceLabel });
  if (locationLabel) tags.push({ type: 'location', label: locationLabel });
  if (fbLabel) tags.push({ type: 'fb', label: fbLabel });
  return tags.slice(0, 6);
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
  /** When set (logged in), show profile button top-left; otherwise only organiser pill in middle */
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
  const hasImage = images.length > 0;
  const addDetails = post.add_details ?? [];
  const cardTags = getCardTags(post);

  useEffect(() => {
    if (images.length <= 1) return;
    const t = setInterval(() => {
      setCarouselIndex((i) => (i + 1) % images.length);
    }, CAROUSEL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [images.length]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-white">
      {/* Top bar: user pill (top-left), vybeme. (top-right), profile when logged in */}
      <header className="fixed left-0 right-0 top-0 z-30 flex items-center justify-between px-4 pt-[env(safe-area-inset-top)] pb-2">
        <div className="flex min-w-0 items-center gap-2 rounded-[20px] bg-white/95 px-3 py-2 shadow-md">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#22d3ee]">
            <span className="text-white font-bold text-sm" style={{ fontFamily: 'system-ui' }}>;</span>
          </div>
          {profileHref ? (
            <Link href={profileHref} className="flex min-w-0 flex-col transition-opacity hover:opacity-90">
              <span className="truncate text-sm font-bold text-[#1C1C1E] max-w-[140px]">{authorName}</span>
              <span className="text-[11px] text-[#71717a]">{formatOrganizerTime(post.date)}</span>
            </Link>
          ) : (
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#1C1C1E] max-w-[140px]">{authorName}</p>
              <p className="text-[11px] text-[#71717a]">{formatOrganizerTime(post.date)}</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {currentUserProfileHref ? (
            <Link href={currentUserProfileHref} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/90 shadow-sm" aria-label={currentUserName ?? 'Your profile'}>
              {currentUserAvatar ? (
                <Image src={currentUserAvatar} alt="" width={36} height={36} className="rounded-full object-cover" />
              ) : (
                <span className="text-sm font-semibold text-[#1C1C1E]">{(currentUserName ?? 'You').charAt(0)}</span>
              )}
            </Link>
          ) : null}
          <span className="text-lg font-bold text-[#1C1C1E]">vybeme.</span>
        </div>
      </header>

      {/* Fixed: Hero image with overlay (title, location, time) bottom-right */}
      <div className="fixed left-1/2 top-0 z-10 h-[340px] w-screen max-w-none -translate-x-1/2 overflow-hidden">
        {hasImage ? (
          <>
            {images.map((url, i) => (
              <div
                key={url}
                className={`absolute inset-0 transition-opacity duration-500 ${i === carouselIndex ? 'opacity-100 z-0' : 'opacity-0 z-0'}`}
              >
                <Image src={url} alt="" fill className="object-cover" sizes="100vw" />
                <div className="absolute bottom-4 right-4 z-10 flex flex-col items-end gap-0.5 text-white drop-shadow-md">
                  <span className="text-lg font-extrabold">{post.title}</span>
                  {post.location_text && <span className="text-sm font-medium opacity-95">{post.location_text}</span>}
                  {post.time && <span className="text-sm font-medium opacity-95">{formatTimeOnly(post.time)}</span>}
                </div>
              </div>
            ))}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[#E5E5EA]">
            <svg className="h-14 w-14 text-[#8E8E93]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
            </svg>
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

      {/* Scrollable area: 5px inset from edges; starts lower so more image visible */}
      <div
        className="relative z-20 flex-1 min-h-0 overflow-y-auto pt-[300px] mx-[5px]"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div
          className="rounded-t-[24px] px-5 pb-24 pt-8 shadow-lg min-h-[calc(100vh-120px)]"
          style={{
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.95) 12%, rgb(255,255,255) 25%, rgb(255,255,255) 100%)',
          }}
        >
          <h1 className="text-[22px] font-extrabold text-[#1C1C1E]">{post.title}</h1>
          {cardTags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {cardTags.map((tag, i) => (
                <span
                  key={`${tag.type}-${i}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#f4f4f5] px-3 py-1.5 text-sm font-medium text-[#52525b]"
                >
                  {tag.type === 'distance' && (
                    <svg className="h-4 w-4 shrink-0 text-[#52525b]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  )}
                  {tag.type === 'location' && (
                    <svg className="h-4 w-4 shrink-0 text-[#52525b]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  )}
                  {tag.type === 'fb' && (
                    <svg className="h-4 w-4 shrink-0 text-[#52525b]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14s1.5 2 4 2 4-2 4-2V9s-1.5-2-4-2-4 2-4 2v5zm0 0V9m0 5s1.5 2 4 2 4-2 4-2V9" /></svg>
                  )}
                  {tag.type === 'category' && (
                    <svg className="h-4 w-4 shrink-0 text-[#52525b]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                  )}
                  {tag.label}
                </span>
              ))}
            </div>
          )}
          <p className="mt-3 text-sm leading-[21px] text-[#444] whitespace-pre-line">
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

          {/* Address + Date & time in one div */}
          {(post.location_text || post.date) && (
            <div className="mt-4 rounded-[14px] bg-[#F2F2F7] p-3.5">
              {post.location_text && (
                <div className="flex gap-2">
                  <span className="text-[#666]" aria-hidden>📍</span>
                  <p className="text-sm font-semibold text-[#1C1C1E]">{post.location_text}</p>
                </div>
              )}
              {post.date && (
                <div className={`flex gap-2 ${post.location_text ? 'mt-3' : ''}`}>
                  <span className="text-[#666]" aria-hidden>📅</span>
                  <p className="text-sm font-semibold text-[#1C1C1E] leading-tight">{formatDayAndTime(post.date, post.time)}</p>
                </div>
              )}
            </div>
          )}

          {/* Detail pills */}
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

          {/* See who's coming – no app CTA */}
          <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl bg-[#1C1C1E] px-4 py-4">
            <div>
              <p className="text-base font-bold text-white">See who&apos;s coming</p>
              <p className="text-[13px] text-white/70">
                {attendees && attendees.length > 0 ? `${attendees.length} going` : 'Join event to view.'}
              </p>
            </div>
            <div className="flex -space-x-2">
              {attendees && attendees.length > 0
                ? attendees.slice(0, 5).map((a, i) => (
                    <div key={i} className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-[#1C1C1E] bg-neutral-500">
                      {a.profile_image ? (
                        <Image src={a.profile_image} alt="" fill className="object-cover" sizes="32px" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-white">
                          {(a.name ?? '?').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  ))
                : [1, 2, 3].map((i) => (
                    <div key={i} className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-[#1C1C1E] bg-neutral-500" />
                  ))}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed: Book Event / View ticket at bottom – padding so not stuck to edge */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#E5E5EA] bg-white pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] px-4">
        <div className="mx-auto max-w-md">
        {registered && viewTicketHref ? (
          <Link
            href={viewTicketHref}
            className="flex w-full items-center justify-center rounded-[25px] bg-[#1C1C1E] py-4 text-base font-bold text-white no-underline"
          >
            View ticket
          </Link>
        ) : onBookEvent ? (
          <button
            type="button"
            onClick={onBookEvent}
            className="w-full rounded-[25px] bg-[#1C1C1E] py-4 text-base font-bold text-white"
          >
            Book Event
          </button>
        ) : (
          <a
            href="/login"
            className="flex w-full items-center justify-center rounded-[25px] bg-[#1C1C1E] py-4 text-base font-bold text-white no-underline"
          >
            Book Event
          </a>
        )}
        </div>
      </div>
    </div>
  );
}
