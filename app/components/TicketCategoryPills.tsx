'use client';

import type { ComponentType } from 'react';
import { FaFlagCheckered, FaMusic, FaGlassCheers } from 'react-icons/fa';
import { IoMdShirt } from 'react-icons/io';
import { GiRunningShoe } from 'react-icons/gi';
import { MdFastfood } from 'react-icons/md';
import { PiLinkSimpleBold } from 'react-icons/pi';
import type { TicketDetailPill } from '@/lib/ticketDetailPills';

/** Same mapping as clubs create/edit `DETAIL_ICON_MAP` */
const DETAIL_ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
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

function getDetailIcon(detailType: string): ComponentType<{ className?: string }> {
  return DETAIL_ICON_MAP[detailType] ?? FaMusic;
}

export function TicketCategoryPills({
  pills,
  emptyLabel,
}: {
  pills: TicketDetailPill[];
  emptyLabel?: string;
}) {
  if (!pills.length) {
    return emptyLabel ? <p className="text-xs text-[#8E8E93] sm:text-sm">{emptyLabel}</p> : null;
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {pills.map((pill) => {
        const Icon = getDetailIcon(pill.detailType);
        return (
          <div
            key={pill.key}
            className="inline-flex w-fit max-w-full items-center gap-2 rounded-full bg-[#F2F2F7] px-2.5 py-1.5 text-left text-[12px] font-medium text-[#1C1C1E] sm:text-[13px]"
          >
            <Icon className="h-4 w-4 shrink-0 text-[#636366]" aria-hidden />
            <span className="min-w-0 truncate">{pill.label}</span>
          </div>
        );
      })}
    </div>
  );
}
