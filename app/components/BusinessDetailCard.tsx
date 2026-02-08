'use client';

import Image from 'next/image';
import Link from 'next/link';

export interface BusinessDetailPost {
  plan_id?: string;
  title: string;
  description: string;
  media?: Array<{ url: string; type?: string }>;
  image?: string | null;
  user?: { user_id?: string; id?: string; name?: string; profile_image?: string };
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

function getMainImage(post: BusinessDetailPost): string | null {
  if (post.media && post.media.length > 0 && post.media[0].url) return post.media[0].url;
  if (post.image && String(post.image).trim()) return post.image;
  return null;
}

const GRADIENT_PASSES: [string, string][] = [
  ['#7C3AED', '#6366F1'],
  ['#059669', '#10B981'],
  ['#047857', '#059669'],
];

export function BusinessDetailCard({
  post,
  authorName,
  appBaseUrl = 'https://app.vybeme.in',
}: {
  post: BusinessDetailPost;
  authorName: string;
  appBaseUrl?: string;
}) {
  const planId = post.plan_id ?? (post as { id?: string }).id;
  const author = post.user;
  const authorId = author?.user_id ?? author?.id ?? post.user_id;
  const avatar = author?.profile_image;
  const profileHref = authorId ? `/profile/${authorId}` : undefined;
  const mainImage = getMainImage(post);
  const hasImage = mainImage && mainImage.trim().length > 0;
  const addDetails = post.add_details ?? [];
  const passes = post.passes ?? [];
  const registerOrViewHref = planId ? `${appBaseUrl}/post/${planId}` : undefined;

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-xl">
      {/* Hero image – same as app business-plan detail */}
      <div className="relative h-[280px] w-full">
        {hasImage ? (
          <Image src={mainImage!} alt="" fill className="object-cover" sizes="100vw" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#E5E5EA]">
            <svg className="h-14 w-14 text-[#8E8E93]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
            </svg>
          </div>
        )}
        {/* Organizer pill – top left, same as app */}
        <div className="absolute left-4 top-14 z-10 flex max-w-[38%] items-center gap-2 rounded-[20px] bg-white/95 px-2.5 py-1.5 shadow-md">
          {profileHref ? (
            <Link href={profileHref} className="flex min-w-0 flex-1 items-center gap-2 transition-opacity hover:opacity-90">
              <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[#E5E5EA]">
                {avatar ? <Image src={avatar} alt="" fill className="object-cover" /> : <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-[#8E8E93]">{authorName.charAt(0)}</span>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#1C1C1E]">{authorName}</p>
                <p className="text-[11px] text-[#8E8E93]">{formatOrganizerTime(post.date)}</p>
              </div>
            </Link>
          ) : (
            <>
              <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[#E5E5EA]">
                {avatar ? <Image src={avatar} alt="" fill className="object-cover" /> : <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-[#8E8E93]">{authorName.charAt(0)}</span>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#1C1C1E]">{authorName}</p>
                <p className="text-[11px] text-[#8E8E93]">{formatOrganizerTime(post.date)}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* White content panel – overlaps bottom, same as app */}
      <div className="-mt-6 rounded-t-[24px] bg-white px-5 pb-10 pt-6 shadow-lg">
        <h1 className="text-[22px] font-extrabold text-[#1C1C1E]">{post.title}</h1>
        <p className="mt-2 text-sm leading-[21px] text-[#444]">{post.description}</p>

        {/* Location + Date side by side – same as app keyInfoRow */}
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

        {/* Detail pills – Distance, Starting Point, Dress Code, F&B – same as app */}
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

        {/* See who's coming – dark block, same as app attendeesCard */}
        <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl bg-[#1C1C1E] px-4 py-4">
          <div>
            <p className="text-base font-bold text-white">See who&apos;s coming</p>
            <p className="text-[13px] text-white/70">Join event to view.</p>
          </div>
          <div className="flex -space-x-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-[#1C1C1E] bg-neutral-500" />
            ))}
          </div>
        </div>

        {/* Select Tickets – gradient pass cards, same as app */}
        {passes.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-3.5 text-lg font-extrabold text-[#1C1C1E]">Select Tickets</h2>
            <div className="space-y-3">
              {passes.map((pass, index) => {
                const colors = GRADIENT_PASSES[index % GRADIENT_PASSES.length];
                return (
                  <div
                    key={pass.pass_id}
                    className="flex items-center justify-between rounded-2xl px-4 py-4 text-white"
                    style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }}
                  >
                    <div className="flex-1 pr-3">
                      <p className="text-base font-bold">{pass.name}</p>
                      {pass.description ? <p className="mt-1.5 line-clamp-2 text-[13px] text-white/90">{pass.description}</p> : null}
                    </div>
                    <p className="text-lg font-extrabold">{pass.price === 0 ? 'Free' : `₹${pass.price}`}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Register CTA – same as app, link to app for registration */}
        {registerOrViewHref ? (
          <a
            href={registerOrViewHref}
            className="mt-6 flex w-full items-center justify-center rounded-[25px] bg-[#1C1C1E] py-4 text-base font-bold text-white no-underline"
          >
            Register
          </a>
        ) : (
          <div className="mt-6 rounded-[25px] bg-[#1C1C1E] py-4 text-center text-base font-bold text-white">
            Register
          </div>
        )}
      </div>
    </div>
  );
}
