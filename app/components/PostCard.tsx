'use client';

import Image from 'next/image';
import Link from 'next/link';

export interface PostAuthor {
  name?: string;
  profile_image?: string | null;
  id?: string;
  user_id?: string;
}

export interface PostData {
  post_id?: string;
  plan_id?: string;
  id?: string;
  title: string;
  description: string;
  type?: 'business' | 'regular';
  tags?: string[];
  category_sub?: string[];
  image?: string | null;
  media?: Array<{ url: string; type?: string }>;
  user?: PostAuthor;
  author?: PostAuthor;
  user_id?: string;
  location_text?: string;
  date?: string | Date;
  time?: string;
  add_details?: Array<{ title: string; description?: string }>;
  passes?: Array<{ pass_id: string; name: string; price: number; description?: string }>;
  created_at?: string;
  is_women_only?: boolean;
  interacted_users?: unknown[];
  interaction_count?: number;
}

function getAllTags(post: PostData): string[] {
  const from = (v: unknown) => (Array.isArray(v) ? v : v ? [String(v)] : []);
  const seen = new Set<string>();
  [...from(post.tags), ...from(post.category_sub)].forEach((t) => {
    const s = (t || '').trim();
    if (s) seen.add(s);
  });
  return Array.from(seen);
}

// Match app: Hitchhiking = walk icon, others = checkbox (Ionicons names)
function TagIcon({ tag }: { tag: string }) {
  const t = tag.toLowerCase();
  const isHitch = t.includes('hitch') || t.includes('travel');
  return (
    <span className="mr-1.5 inline-flex shrink-0 text-neutral-500" aria-hidden>
      {isHitch ? (
        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8v8m-8-8h8" />
        </svg>
      ) : (
        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
    </span>
  );
}

export function PostCard({
  post,
  showJoin = true,
  onJoin,
  showReactions = false,
  onShare,
  onRepost,
  postHref,
}: {
  post: PostData;
  showJoin?: boolean;
  onJoin?: () => void;
  showReactions?: boolean;
  onShare?: () => void;
  onRepost?: () => void;
  /** When set, card body and Join link to this URL (e.g. /post/[id]) */
  postHref?: string;
}) {
  const author = post.user || post.author;
  const authorId = author?.id ?? author?.user_id ?? post.user_id;
  const authorName = author?.name ?? 'Someone';
  const avatar = author?.profile_image;
  const allTags = getAllTags(post);
  const hasImage = post.image && String(post.image).trim();
  const profileHref = authorId ? `/profile/${authorId}` : undefined;
  const interactedUsers = (post.interacted_users ?? []) as { profile_image?: string; avatar?: string; name?: string; id?: string }[];
  const interactionCount = post.interaction_count ?? interactedUsers.length;
  const showInteracted = interactionCount > 0;
  const displayAvatars = interactedUsers.slice(0, 3);
  const extraCount = Math.max(0, interactionCount - displayAvatars.length);

  const timeLabel =
    (post.user as { time?: string } | undefined)?.time ??
    (post.created_at
      ? new Date(post.created_at).toLocaleString('en-IN', {
          weekday: 'long',
          hour: 'numeric',
          minute: '2-digit',
        })
      : 'Recently');

  // App: author pill outside card — bg #E5E5EA, rounded 20, avatar 32, name 14 bold #1C1C1E, time 11 #8E8E93
  const authorPill = (
    <div className="flex max-w-[70%] items-center gap-2 rounded-[20px] bg-[#E5E5EA] py-1.5 pl-2.5 pr-3">
      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[#E5E5EA]">
        {avatar ? (
          <Image src={avatar} alt="" fill className="object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-[#8E8E93]">
            {authorName.charAt(0)}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-[#1C1C1E]">{authorName}</p>
        <p className="text-[11px] text-[#8E8E93]">{timeLabel}</p>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-md px-4 pt-5">
      {/* Card wrapper: pill sits ON the top border of the card */}
      <div className="relative">
        {/* User pill — positioned on the card's top border (overlaps edge) */}
        <div className="absolute left-0 top-0 z-10 -translate-y-1/2">
          {profileHref ? (
            <Link
              href={profileHref}
              onClick={(e) => e.stopPropagation()}
              className="block transition-opacity hover:opacity-80"
              aria-label={`View ${authorName}'s profile`}
            >
              {authorPill}
            </Link>
          ) : (
            authorPill
          )}
        </div>

        {/* White card — extra pt so content clears the pill; overflow-visible so pill can overlap */}
        <div className="overflow-visible rounded-[24px] bg-white pt-8 pb-5 pl-5 pr-5 shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
          {/* Top row: interacted pill (right) when present */}
          {showInteracted && (
            <div className="mb-3 flex justify-end">
              <div className="flex shrink-0 items-center rounded-[20px] bg-[#E5E5EA] py-1 pl-1 pr-2">
                <div className="flex -space-x-2">
                  {displayAvatars.map((u, i) => (
                    <div
                      key={u?.id ?? i}
                      className="relative h-6 w-6 overflow-hidden rounded-full border-2 border-white bg-[#E5E5EA]"
                    >
                      {(u?.profile_image ?? u?.avatar) ? (
                        <Image src={(u.profile_image ?? u.avatar)!} alt="" fill className="object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-[10px] font-medium text-[#8E8E93]">
                          {u?.name?.charAt(0) ?? '?'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                {(extraCount > 0 || displayAvatars.length === 0) && (
                  <span className="ml-1 text-xs font-bold text-[#1C1C1E]">
                    +{extraCount > 0 ? extraCount : interactionCount}
                  </span>
                )}
              </div>
            </div>
          )}
        {/* Content: title, description, middleRow (tags + image) */}
        <div className="mb-4">
          {postHref ? (
            <Link href={postHref} className="block" onClick={(e) => e.stopPropagation()}>
              <h2 className="mb-2 text-[18px] font-extrabold leading-tight text-[#1C1C1E]">
                {post.title}
              </h2>
              <p className="mb-4 line-clamp-3 text-sm leading-5 text-[#444]">
                {post.description}
              </p>
              {/* Middle row: tags (flex-1 wrap) + image (96x96) — same as app */}
              <div className="flex items-start justify-between gap-3">
                {allTags.length > 0 && (
                  <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                    {allTags.map((tag, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-xl bg-[#F2F2F7] px-2.5 py-1.5 text-xs font-semibold text-[#333]"
                      >
                        <TagIcon tag={tag} />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {hasImage ? (
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[#E5E5EA]">
                    <Image
                      src={post.image!}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  </div>
                ) : (
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-[#E5E5EA]">
                    <svg className="h-7 w-7 text-[#8E8E93]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                    </svg>
                  </div>
                )}
              </div>
            </Link>
          ) : (
            <>
              <h2 className="mb-2 text-[18px] font-extrabold leading-tight text-[#1C1C1E]">
                {post.title}
              </h2>
              <p className="mb-4 line-clamp-3 text-sm leading-5 text-[#444]">
                {post.description}
              </p>
              <div className="flex items-start justify-between gap-3">
                {allTags.length > 0 && (
                  <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                    {allTags.map((tag, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-xl bg-[#F2F2F7] px-2.5 py-1.5 text-xs font-semibold text-[#333]"
                      >
                        <TagIcon tag={tag} />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {hasImage ? (
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[#E5E5EA]">
                    <Image
                      src={post.image!}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  </div>
                ) : (
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-[#E5E5EA]">
                    <svg className="h-7 w-7 text-[#8E8E93]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                    </svg>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer row: Join (flex-1), Repost btn, Share btn — same as app */}
        {(showJoin || showReactions || onShare || onRepost) && (
          <div className="flex w-full items-center gap-2.5">
            {showJoin &&
              (postHref ? (
                <Link
                  href={postHref}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 rounded-[14px] bg-[#1C1C1E] py-3.5 text-center text-base font-bold text-white no-underline"
                >
                  Join
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onJoin?.();
                  }}
                  className="flex-1 rounded-[14px] bg-[#1C1C1E] py-3.5 text-base font-bold text-white"
                >
                  Join
                </button>
              ))}
            {showReactions && (
              <div className="flex gap-1">
                {['❤️', '👍', '😢', '😠', '😊'].map((emoji, i) => (
                  <button key={i} type="button" className="text-lg" aria-hidden>
                    {emoji}
                  </button>
                ))}
              </div>
            )}
            {onRepost && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRepost();
                }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E5E5EA] text-[#1C1C1E] transition-opacity hover:opacity-80"
                aria-label="Repost"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onShare?.();
              }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E5E5EA] text-[#1C1C1E] transition-opacity hover:opacity-80"
              aria-label="Share"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
