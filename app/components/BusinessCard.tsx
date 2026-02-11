'use client';

import Image from 'next/image';
import Link from 'next/link';

export interface BusinessPlan {
  plan_id?: string;
  post_id?: string;
  id?: string;
  title: string;
  description: string;
  media?: Array<{ url: string; type?: string }>;
  image?: string | null;
  category_main?: string;
  category_sub?: string[];
  tags?: string[];
  passes?: Array<{ pass_id: string; name: string; price: number; description?: string }>;
  user?: { user_id?: string; name?: string; profile_image?: string };
  location_text?: string;
  date?: string | Date;
  time?: string;
}

export interface BusinessCardProps {
  plan: BusinessPlan;
  user?: { id?: string; name?: string; avatar?: string; profile_image?: string; time?: string };
  attendeesCount?: number;
  interactedUsers?: Array<{ id?: string; avatar?: string | null; profile_image?: string | null }>;
  planHref?: string;
  onRegister?: () => void;
}

function getMainImage(plan: BusinessPlan): string | null {
  if (plan.media && plan.media.length > 0 && plan.media[0].url) return plan.media[0].url;
  if (plan.image && String(plan.image).trim()) return plan.image;
  return null;
}

export function BusinessCard({
  plan,
  user,
  attendeesCount = 0,
  interactedUsers = [],
  planHref,
  onRegister,
}: BusinessCardProps) {
  const mainImage = getMainImage(plan);
  const organizerName = user?.name ?? plan.user?.name ?? 'Organizer';
  const organizerAvatar = user?.avatar ?? user?.profile_image ?? plan.user?.profile_image;
  const timeText =
    user?.time ??
    (plan.date ? new Date(plan.date).toLocaleDateString() : '') ??
    (plan.time ?? '');
  const mainTag = plan.category_main ? [plan.category_main] : [];
  const subTags = plan.category_sub ?? plan.tags ?? [];
  const tags = mainTag.length > 0 ? [...mainTag, ...subTags.filter((t) => t !== plan.category_main)] : subTags;
  const passes = plan.passes ?? [];
  const hasFreePass = passes.some((p) => Number(p.price) === 0);
  const prices = passes.filter((p) => Number(p.price) > 0).map((p) => p.price);
  const minPrice = hasFreePass ? 0 : (prices.length > 0 ? Math.min(...prices) : null);
  const showInteracted = attendeesCount > 0 || interactedUsers.length > 0;
  const displayUsers = interactedUsers.slice(0, 3);
  const extraCount = Math.max(0, attendeesCount - displayUsers.length) || (displayUsers.length === 0 ? attendeesCount : 0);

  const cardContent = (
    <>
      {/* Image behind - full card */}
      <div className="absolute inset-0 overflow-hidden rounded-[20px]">
        {mainImage ? (
          <Image
            src={mainImage}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 400px) 100vw, 400px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-[20px] bg-[#E5E5EA]">
            <svg className="h-12 w-12 text-[#8E8E93]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
            </svg>
          </div>
        )}
      </div>

      {/* Organizer pill - on border, top-left */}
      <div className="absolute left-2.5 top-0 z-10 -translate-y-1/2 rounded-[18px] bg-white/95 px-2 py-1.5 shadow-md">
        <div className="flex max-w-[28%] items-center gap-1.5">
          <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full bg-[#E5E5EA]">
            {organizerAvatar ? (
              <Image src={organizerAvatar} alt="" fill className="object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-[#8E8E93]">
                {organizerName.charAt(0)}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-bold text-[#1C1C1E]">{organizerName}</p>
            {timeText && <p className="text-[10px] text-[#888]">{timeText}</p>}
          </div>
        </div>
      </div>

      {/* Interacted pill - top-right on image */}
      {showInteracted && (
        <div className="absolute right-3 top-2.5 z-10 flex items-center gap-1 rounded-[20px] bg-white/90 px-2 py-1">
          {displayUsers.length > 0 ? (
            displayUsers.map((u, i) => (
              <div
                key={u.id ?? i}
                className="relative h-6 w-6 overflow-hidden rounded-full border-2 border-white/95 bg-[#E5E5EA]"
              >
                {(u.profile_image ?? u.avatar) ? (
                  <Image src={(u.profile_image ?? u.avatar)!} alt="" fill className="object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-[10px] text-[#8E8E93]">?</span>
                )}
              </div>
            ))
          ) : null}
          {(extraCount > 0 || displayUsers.length === 0) && (
            <span className="text-xs font-semibold text-[#1C1C1E]">
              +{extraCount > 0 ? extraCount : attendeesCount}
            </span>
          )}
        </div>
      )}

      {/* White content overlay - fixed height same as app (208px content area) */}
      <div className="absolute inset-x-0 bottom-0 h-[208px] flex flex-col rounded-t-[24px] bg-white px-4 pt-3.5 pb-4">
        <h2 className="mb-1 truncate text-xl font-bold text-[#1C1C1E]">{plan.title}</h2>
        <div className="h-[60px] shrink-0 overflow-hidden">
          <p className="line-clamp-3 text-sm leading-5 text-[#3C3C43]">{plan.description}</p>
        </div>
        {(minPrice != null || tags.length > 0) && (
          <div className="mb-2 flex flex-wrap gap-2">
            {minPrice != null && (
              <span className="inline-flex items-center rounded-[14px] bg-[#EFEFEF] px-3 py-1.5 text-[13px] font-medium text-[#1C1C1E]">
                {minPrice === 0 ? 'Free' : `₹${minPrice}`}
              </span>
            )}
            {tags.slice(0, 3).map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-[14px] bg-[#EFEFEF] px-3 py-1.5 text-[13px] font-medium text-[#1C1C1E]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="mt-auto flex shrink-0 items-center gap-2">
          {planHref ? (
            <Link
              href={planHref}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 rounded-xl bg-[#1C1C1E] py-3 text-center text-base font-bold text-white no-underline"
            >
              Register
            </Link>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRegister?.();
              }}
              className="flex-1 rounded-xl bg-[#1C1C1E] py-3 text-base font-bold text-white"
            >
              Register
            </button>
          )}
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E5E5EA] text-[#1C1C1E]"
            aria-label="Repost"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E5E5EA] text-[#1C1C1E]" aria-label="Share">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );

  if (planHref) {
    return (
      <Link href={planHref} className="block w-full overflow-visible rounded-[20px] shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
        <div className="relative h-[400px] w-full overflow-visible rounded-[20px]">
          {cardContent}
        </div>
      </Link>
    );
  }

  return (
    <div className="relative h-[400px] w-full overflow-visible rounded-[20px] shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
      {cardContent}
    </div>
  );
}
