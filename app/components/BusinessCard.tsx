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
  created_at?: string | Date;
  category_main?: string;
  category_sub?: string[];
  tags?: string[];
  add_details?: Array<{ detail_type: string; title?: string; description?: string; heading?: string }>;
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

function getTimingFromTime(time: string | undefined): string | null {
  if (!time || !String(time).trim()) return null;
  const s = String(time).trim().toLowerCase();
  const hourMatch = s.match(/(\d{1,2})\s*:\s*(\d{2})?\s*(am|pm)?|(\d{1,2})\s*(am|pm)/i);
  let hour = 12;
  if (hourMatch) {
    const h = parseInt(hourMatch[1] || hourMatch[4] || '12', 10);
    const pm = (hourMatch[3] || hourMatch[5] || '').toLowerCase() === 'pm';
    hour = h === 12 ? (pm ? 12 : 0) : pm ? h + 12 : h;
  } else {
    if (s.includes('morning')) return 'Morning';
    if (s.includes('afternoon')) return 'Afternoon';
    if (s.includes('evening')) return 'Evening';
    if (s.includes('night')) return 'Night';
    return null;
  }
  if (hour >= 5 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 17) return 'Afternoon';
  if (hour >= 17 && hour < 20) return 'Evening';
  return 'Night';
}

function capitalizeLabel(label: string): string {
  if (!label) return '';
  return label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
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
  const timeText = (() => {
    const created = plan.created_at ?? plan.date;
    if (created) {
      const d = typeof created === 'string' ? new Date(created) : created;
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }
    return user?.time ?? plan.time ?? '';
  })();

  const getDetailLabel = (d: { title?: string; description?: string; heading?: string } | undefined) =>
    d ? (d.description || d.title || d.heading || '').trim() : '';
  const detailByType = (type: string) => plan.add_details?.find((d) => d.detail_type === type);
  const distanceLabel = getDetailLabel(detailByType('distance'));
  const fbLabel = getDetailLabel(detailByType('f&b'));

  const cardTags: Array<{ type: 'additional' | 'category' | 'day' | 'timing'; label: string; icon: string }> = [];
  const additionalOrder: Array<{ getLabel: () => string }> = [
    { getLabel: () => distanceLabel },
    { getLabel: () => fbLabel },
    { getLabel: () => getDetailLabel(detailByType('dress_code')) },
    { getLabel: () => getDetailLabel(detailByType('music_type')) },
  ];
  for (const { getLabel } of additionalOrder) {
    const label = getLabel();
    if (label) cardTags.push({ type: 'additional', label, icon: '⚙' });
  }
  if (plan.category_main) {
    cardTags.push({ type: 'category', label: capitalizeLabel(plan.category_main), icon: '🏷' });
  } else {
    const firstSub = plan.category_sub?.find((sub) => sub && String(sub).trim());
    if (firstSub) cardTags.push({ type: 'category', label: capitalizeLabel(firstSub), icon: '🏷' });
  }
  if (plan.date) {
    try {
      const d = typeof plan.date === 'string' ? new Date(plan.date) : plan.date;
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'long' });
      if (dayLabel) cardTags.push({ type: 'day', label: dayLabel, icon: '📅' });
    } catch {
      // ignore invalid date
    }
  }
  const timingSlot = getTimingFromTime(plan.time);
  if (timingSlot) cardTags.push({ type: 'timing', label: timingSlot, icon: '🕒' });
  const tagsToShow = cardTags.slice(0, 4);

  const showInteracted = attendeesCount > 0 || interactedUsers.length > 0;
  const displayUsers = interactedUsers.slice(0, 3);
  const extraCount = Math.max(0, attendeesCount - 3);

  const cardContent = (
    <>
      <div className="absolute inset-0 overflow-hidden rounded-[24px] bg-white">
        <div className="relative h-[85%] w-full overflow-hidden">
          {mainImage ? (
            <Image
              src={mainImage}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 480px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#E5E5EA]">
              <svg className="h-12 w-12 text-[#8E8E93]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
              </svg>
            </div>
          )}
        </div>
        <div className="h-[15%] bg-white" />
      </div>

      <div className="absolute -top-5 left-2.5 z-10 flex max-w-[48%] items-center rounded-[22px] bg-white px-2.5 py-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-[#E5E5EA]">
          {organizerAvatar ? (
            <Image src={organizerAvatar} alt="" fill className="object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-[#8E8E93]">
              {organizerName.charAt(0)}
            </span>
          )}
        </div>
        <div className="ml-2 min-w-0">
          <p className="truncate text-sm font-bold text-[#1C1C1E]">{organizerName}</p>
          {timeText && <p className="truncate text-[11px] text-[#8E8E93]">{timeText}</p>}
        </div>
      </div>

      {showInteracted && (
        <div className="absolute -top-2.5 right-5 z-10 flex items-center rounded-[14px] bg-white/95 px-1.5 py-1 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
          {displayUsers.length > 0 ? (
            displayUsers.map((u, i) => (
              <div
                key={u.id ?? i}
                className={`relative h-5 w-5 overflow-hidden rounded-full border-[1.5px] border-white/95 bg-[#E5E5EA] ${i > 0 ? '-ml-2.5' : ''}`}
                style={{ zIndex: 3 - i }}
              >
                {u.profile_image ?? u.avatar ? (
                  <Image src={(u.profile_image ?? u.avatar)!} alt="" fill className="object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-[10px] text-[#8E8E93]">?</span>
                )}
              </div>
            ))
          ) : (
            <span className="mr-1 text-sm">👥</span>
          )}
          {extraCount > 0 && <span className="ml-1 text-[11px] font-semibold text-[#1C1C1E]">+{extraCount}</span>}
        </div>
      )}

      <div className="absolute bottom-[7px] left-[7px] right-[7px] rounded-2xl bg-white px-3.5 pb-3 pt-3">
        <h2 className="mb-1 text-xl font-bold text-[#1C1C1E]">{plan.title}</h2>
        <p className="mb-2 line-clamp-4 text-sm leading-5 text-[#3C3C43]">{plan.description}</p>

        {tagsToShow.length > 0 && (
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {tagsToShow.map((tag, i) => (
              <span
                key={`${tag.type}-${i}-${tag.label}`}
                className="inline-flex shrink-0 items-center gap-1 rounded-[14px] bg-[#EFEFEF] px-3 py-1.5 text-[13px] font-medium text-[#1C1C1E]"
              >
                <span className="text-[11px]">{tag.icon}</span>
                {tag.label}
              </span>
            ))}
          </div>
        )}

        <div className="mt-1 flex min-h-11 items-center justify-between gap-2.5">
          {planHref ? (
            <Link
              href={planHref}
              onClick={(e) => e.stopPropagation()}
              className="h-11 max-w-[65%] flex-1 rounded-full bg-[#1C1C1E] px-6 py-2.5 text-center text-base font-bold text-white no-underline"
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
              className="h-11 max-w-[65%] flex-1 rounded-full bg-[#1C1C1E] px-6 py-2.5 text-base font-bold text-white"
            >
              Register
            </button>
          )}
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
      <Link href={planHref} className="block w-full overflow-visible rounded-[24px]">
        <div className="relative h-[430px] w-full overflow-visible rounded-[24px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] sm:h-[450px] md:h-[400px]">
          {cardContent}
        </div>
      </Link>
    );
  }

  return (
    <div className="relative h-[430px] w-full overflow-visible rounded-[24px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] sm:h-[450px] md:h-[400px]">
      {cardContent}
    </div>
  );
}
