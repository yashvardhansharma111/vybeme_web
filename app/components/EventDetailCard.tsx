'use client';

import Image from 'next/image';
import Link from 'next/link';

export interface EventDetailPost {
  title: string;
  description: string;
  image?: string | null;
  user?: { id?: string; user_id?: string; name?: string; profile_image?: string };
  author?: { id?: string; user_id?: string; name?: string; profile_image?: string };
  user_id?: string;
  created_at?: string;
  location_text?: string;
  location_coordinates?: { lat?: number; long?: number };
  date?: string | Date;
  time?: string;
  add_details?: Array<{ title: string; description?: string }>;
  tags?: string[];
  category_sub?: string[];
  temporal_tags?: string[];
  interacted_users?: unknown[];
  interaction_count?: number;
  [key: string]: unknown;
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
  if (!date) return formatTimeAMPM(time) || '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const dateStr = formatEventDate(date);
  const timeStr = formatTimeAMPM(time);
  return timeStr ? `${dateStr} | ${timeStr}` : dateStr;
}

function formatOrganizerTime(date: string | Date | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-IN', { weekday: 'long', hour: 'numeric', minute: '2-digit', hour12: true });
}

export function EventDetailCard({
  post,
  joinSent,
  joining,
  onJoin,
  authorName,
  authorId: authorIdProp,
  isWomenOnly,
  womenOnlyBlocked,
}: {
  post: EventDetailPost;
  joinSent: boolean;
  joining: boolean;
  onJoin: () => void;
  authorName: string;
  authorId?: string;
  isWomenOnly?: boolean;
  womenOnlyBlocked?: boolean;
}) {
  const author = post.user || post.author;
  const authorId = authorIdProp ?? author?.id ?? author?.user_id ?? post.user_id;
  const authorNameDisplay = author?.name ?? authorName ?? 'Someone';
  const avatar = author?.profile_image;
  const profileHref = authorId ? `/profile/${authorId}` : undefined;
  const showWomenOnlyMessage = isWomenOnly && womenOnlyBlocked;
  const hasImage = post.image && String(post.image).trim();
  const interactedUsers = (post.interacted_users ?? []) as { profile_image?: string; avatar?: string; name?: string; id?: string }[];
  const details = post.add_details ?? [];
  const detailOrder = ['Distance', 'Starting Point', 'Dress Code', 'F&B'];
  const detailsByTitle = Object.fromEntries((details as { title: string; description?: string }[]).map((d) => [d.title, d.description ?? '—']));
  const displayDetails = detailOrder.map((title) => ({ title, description: detailsByTitle[title] ?? '—' }));
  const additionalTags = [
    ...(post.temporal_tags ?? []),
    ...(post.category_sub ?? []),
    ...(post.tags ?? []),
  ].filter(Boolean) as string[];
  const uniqueTags = [...new Set(additionalTags.map((t) => String(t).trim()).filter(Boolean))];

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-xl">
      {/* Hero image with organizer pill on top-left */}
      <div className="relative h-64 w-full md:h-72">
        {hasImage ? (
          <Image src={post.image!} alt="" fill className="object-cover" sizes="100vw" />
        ) : (
          <div className="h-full w-full bg-neutral-200" />
        )}
        <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 shadow-md">
          {profileHref ? (
            <Link href={profileHref} className="flex items-center gap-2 transition-opacity hover:opacity-90">
              <div className="relative h-8 w-8 overflow-hidden rounded-full bg-neutral-200">
                {avatar ? <Image src={avatar} alt="" fill className="object-cover" /> : <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-neutral-500">{authorNameDisplay.charAt(0)}</span>}
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900">{authorNameDisplay}</p>
                <p className="text-xs text-neutral-500">{formatOrganizerTime(post.date ?? post.created_at)}</p>
              </div>
            </Link>
          ) : (
            <>
              <div className="relative h-8 w-8 overflow-hidden rounded-full bg-neutral-200">
                {avatar ? <Image src={avatar} alt="" fill className="object-cover" /> : <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-neutral-500">{authorNameDisplay.charAt(0)}</span>}
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900">{authorNameDisplay}</p>
                <p className="text-xs text-neutral-500">{formatOrganizerTime(post.date ?? post.created_at)}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* White content card – starts where the image ends (no overlap) */}
      <div className="relative mt-8 rounded-t-3xl bg-white px-4 pb-8 pt-6 shadow-xl md:px-6">
      <h1 className="mt-2 text-xl font-extrabold text-neutral-900 md:text-2xl">{post.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600 md:text-base whitespace-pre-line">{post.description}</p>

        {/* Additional tags – temporal, category, tags */}
        {uniqueTags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {uniqueTags.map((tag, i) => (
              <span
                key={`${tag}-${i}`}
                className="inline-flex items-center rounded-full bg-[#F2F2F7] px-3 py-1.5 text-xs font-semibold text-neutral-800"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Location – light grey block */}
        {(post.location_text || post.date) && (
          <div className="mt-4 flex flex-col gap-3">
            {post.location_text && (
              <div className="flex items-start gap-3 rounded-2xl bg-[#F2F2F7] p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center text-neutral-700" aria-hidden>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </span>
                <div>
                  <p className="font-semibold text-neutral-900">{post.location_text}</p>
                  {post.location_coordinates && <p className="mt-0.5 text-xs text-neutral-500">3 Km away</p>}
                </div>
              </div>
            )}
            {(post.date || post.time) && (
              <div className="flex items-start gap-3 rounded-2xl bg-[#F2F2F7] p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center text-neutral-700" aria-hidden>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </span>
                <p className="font-semibold text-neutral-900">{formatDayAndTime(post.date, post.time)}</p>
              </div>
            )}
          </div>
        )}

        {/* 4-detail grid – Distance, Starting Point, Dress Code, F&B */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {displayDetails.map((d, i) => (
            <div key={i} className="rounded-xl bg-[#F2F2F7] p-3">
              <p className="text-xs font-medium text-neutral-500">{d.title}</p>
              <p className="mt-1 text-sm font-semibold text-neutral-900 whitespace-pre-line">{d.description ?? '—'}</p>
            </div>
          ))}
        </div>

        {/* See who's coming – light grey, avatars + View on App */}
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-[#F2F2F7] px-4 py-3">
          <span className="text-sm font-medium text-neutral-700">See who&apos;s coming</span>
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {interactedUsers.length > 0 ? (
                interactedUsers.slice(0, 4).map((u, i) => (
                  <div key={u?.id ?? i} className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-white bg-neutral-300">
                    {(u?.profile_image ?? u?.avatar) ? <Image src={(u.profile_image ?? u.avatar)!} alt="" fill className="object-cover" /> : <span className="flex h-full w-full items-center justify-center text-xs text-neutral-500">{u?.name?.charAt(0) ?? '?'}</span>}
                  </div>
                ))
              ) : (
                [1, 2, 3].map((i) => (
                  <div key={i} className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-white bg-neutral-300">
                    <span className="flex h-full w-full items-center justify-center text-xs text-neutral-500">?</span>
                  </div>
                ))
              )}
            </div>
            <a href="#" className="rounded-xl bg-neutral-700 px-3 py-2 text-xs font-medium text-white no-underline">View on App</a>
          </div>
        </div>

        {/* Women-only message when user is male */}
        {showWomenOnlyMessage && (
          <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 py-3 text-center text-sm font-medium text-amber-800">
            This is a women&apos;s post. Only women can join this plan.
          </p>
        )}

        {/* Primary CTA */}
        {!joinSent ? (
          <button
            type="button"
            onClick={onJoin}
            disabled={joining || showWomenOnlyMessage}
            className="mt-6 w-full rounded-xl bg-neutral-800 py-4 text-base font-bold text-white disabled:opacity-60"
          >
            {joining ? 'Sending…' : 'Join'}
          </button>
        ) : (
          <p className="mt-6 rounded-xl bg-[#F2F2F7] py-4 text-center text-sm font-semibold text-neutral-800">
            Join request sent to {authorNameDisplay}
          </p>
        )}
      </div>
    </div>
  );
}
