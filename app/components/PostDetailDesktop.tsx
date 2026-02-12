'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { PostData } from './PostCard';

function getAllTags(post: PostData): string[] {
  const from = (v: unknown) => (Array.isArray(v) ? v : v ? [String(v)] : []);
  const seen = new Set<string>();
  [...from(post.tags), ...from(post.category_sub)].forEach((t) => {
    const s = (t || '').trim();
    if (s) seen.add(s);
  });
  return Array.from(seen);
}

export function PostDetailDesktop({
  post,
  joinSent,
  joining,
  onJoin,
  authorName,
}: {
  post: PostData;
  joinSent: boolean;
  joining: boolean;
  onJoin: () => void;
  authorName: string;
}) {
  const author = post.user || post.author;
  const authorId = author?.id ?? author?.user_id ?? post.user_id;
  const authorNameDisplay = author?.name ?? 'Someone';
  const avatar = author?.profile_image;
  const profileHref = authorId ? `/profile/${authorId}` : undefined;
  const allTags = getAllTags(post);
  const hasImage = post.image && String(post.image).trim();
  const timeLabel = post.created_at
    ? new Date(post.created_at).toLocaleString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Recently';
  const interactionCount = post.interaction_count ?? 0;

  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-xl md:flex md:max-w-4xl">
      {/* Left: image with author pill overlay */}
      <div className="relative md:w-[45%] md:min-h-[380px]">
        {hasImage ? (
          <Image
            src={post.image!}
            alt=""
            fill
            className="object-cover md:rounded-l-2xl"
            sizes="(max-width: 768px) 100vw, 45vw"
          />
        ) : (
          <div className="aspect-square bg-neutral-200 md:min-h-full md:aspect-auto" />
        )}
        {/* Author pill overlay - top left on image */}
        <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/50 px-2 py-1.5 backdrop-blur-sm">
          {profileHref ? (
            <Link
              href={profileHref}
              className="flex items-center gap-2 rounded-full transition-opacity hover:opacity-90"
            >
              <div className="relative h-8 w-8 overflow-hidden rounded-full bg-neutral-400 ring-2 ring-white/80">
                {avatar ? (
                  <Image src={avatar} alt="" fill className="object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xs font-medium text-white">
                    {authorNameDisplay.charAt(0)}
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{authorNameDisplay}</p>
                <p className="text-xs text-white/80">{timeLabel}</p>
              </div>
            </Link>
          ) : (
            <>
              <div className="relative h-8 w-8 overflow-hidden rounded-full bg-neutral-400 ring-2 ring-white/80">
                {avatar ? (
                  <Image src={avatar} alt="" fill className="object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xs font-medium text-white">
                    {authorNameDisplay.charAt(0)}
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{authorNameDisplay}</p>
                <p className="text-xs text-white/80">{timeLabel}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right: details */}
      <div className="flex flex-1 flex-col p-5 md:p-6">
        <h1 className="text-xl font-bold text-neutral-900 md:text-2xl">{post.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-500">
          <span>{timeLabel}</span>
          {interactionCount > 0 && (
            <span>{interactionCount} interactions</span>
          )}
        </div>

        {/* See who's coming + Join */}
        <div className="mt-4 flex items-center gap-3">
          {post.interacted_users && (post.interacted_users as unknown[]).length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {(post.interacted_users as unknown[]).slice(0, 3).map((u: any, i: number) => (
                  <div
                    key={u?.id ?? i}
                    className="relative h-7 w-7 overflow-hidden rounded-full border-2 border-white bg-neutral-200"
                  >
                    {u?.profile_image ? (
                      <Image src={u.profile_image} alt="" fill className="object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-[10px] text-neutral-500">
                        {u?.name?.charAt(0) ?? '?'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <span className="text-sm text-neutral-600">See who&apos;s coming</span>
            </div>
          )}
          {!joinSent && (
            <button
              type="button"
              onClick={onJoin}
              disabled={joining}
              className="rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {joining ? 'Sending…' : 'Join'}
            </button>
          )}
        </div>

        {/* Tags */}
        {allTags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {allTags.map((tag, i) => (
              <span
                key={i}
                className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-700"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        <p className="mt-4 flex-1 text-sm leading-relaxed text-neutral-600 whitespace-pre-line">
          {post.description}
        </p>

        {/* Primary CTA - desktop: "I'm Interested" style */}
        {!joinSent && (
          <button
            type="button"
            onClick={onJoin}
            disabled={joining}
            className="mt-6 w-full rounded-xl bg-black py-3 text-sm font-medium text-white disabled:opacity-60"
          >
            {joining ? 'Sending…' : "I'm Interested"}
          </button>
        )}
        {joinSent && (
          <p className="mt-6 rounded-xl bg-neutral-100 py-3 text-center text-sm font-medium text-neutral-800">
            Join request sent to {authorName}
          </p>
        )}
      </div>
    </article>
  );
}
