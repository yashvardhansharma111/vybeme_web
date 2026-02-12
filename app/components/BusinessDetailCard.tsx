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
}) {
  const author = post.user;
  const authorId = author?.user_id ?? author?.id ?? post.user_id;
  const avatar = author?.profile_image;
  const profileHref = authorId ? `/profile/${authorId}` : undefined;
  const images = getAllImages(post);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const hasImage = images.length > 0;
  const addDetails = post.add_details ?? [];

  useEffect(() => {
    if (images.length <= 1) return;
    const t = setInterval(() => {
      setCarouselIndex((i) => (i + 1) % images.length);
    }, CAROUSEL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [images.length]);

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-xl">
      {/* Hero image with carousel, user pill upper-center, blur above curve */}
      <div className="relative h-[280px] w-full overflow-hidden">
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
          <div className="absolute inset-0 flex items-center justify-center bg-[#E5E5EA]">
            <svg className="h-14 w-14 text-[#8E8E93]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
            </svg>
          </div>
        )}
        {/* Blur above the curve (bottom of image) */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/80 to-transparent z-[1]" aria-hidden />
        {/* User pill – upper center, in between image */}
        <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-2 rounded-[20px] bg-white/95 px-3 py-2 shadow-md">
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
        {/* Dots – when more than one image */}
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

      {/* White content panel – overlaps image, scrollable; title & description above curve */}
      <div className="-mt-6 rounded-t-[24px] bg-white px-5 pb-28 pt-6 shadow-lg">
        <h1 className="text-[22px] font-extrabold text-[#1C1C1E]">{post.title}</h1>
        <p className="mt-2 text-sm leading-[21px] text-[#444]">
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

        {/* Location + Date */}
        {(post.location_text || post.date) && (
          <div className="mt-4 flex gap-3">
            {post.location_text && (
              <div className="min-w-0 flex-1 rounded-[14px] bg-[#F2F2F7] p-3.5">
                <span className="text-[#666]" aria-hidden>📍</span>
                <p className="mt-2 text-sm font-semibold text-[#1C1C1E]">{post.location_text}</p>
              </div>
            )}
            {post.date && (
              <div className="min-w-0 flex-1 rounded-[14px] bg-[#F2F2F7] p-3.5">
                <span className="text-[#666]" aria-hidden>📅</span>
                <p className="mt-2 text-sm font-semibold text-[#1C1C1E] leading-tight">{formatDayAndTime(post.date, post.time)}</p>
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
                {detail.description ? <p className="mt-1 truncate text-sm font-semibold text-[#1C1C1E]">{detail.description}</p> : null}
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

      {/* Book Event / View ticket – fixed at bottom, always visible */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#E5E5EA] bg-white py-3 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-md px-4">
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
