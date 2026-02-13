'use client';

import { useCallback } from 'react';

export interface ShareMenuProps {
  postId: string;
  title: string;
  /** Use /go/post for app-style open-in-app when opened on mobile */
  useGoPostUrl?: boolean;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Single Share action: opens native share sheet (WhatsApp, Instagram, Copy, etc.) with the plan URL.
 * Same URL is used everywhere so WhatsApp link preview (og:image, og:title) works unchanged.
 * For Instagram Story: user picks share target or copies link, then adds Link sticker with this URL.
 */
export function ShareMenu({ postId, title, useGoPostUrl = false, children, className }: ShareMenuProps) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const postPath = useGoPostUrl ? `/go/post/${postId}` : `/post/${postId}`;
  const postUrl = `${baseUrl}${postPath}`;

  const handleShare = useCallback(() => {
    if (!postUrl) return;
    const shareTitle = title || 'Event on vybeme.';
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ url: postUrl, title: shareTitle }).catch(() => {
        navigator.clipboard?.writeText(postUrl);
      });
    } else {
      navigator.clipboard?.writeText(postUrl);
    }
  }, [postUrl, title]);

  return (
    <div className={`relative inline-block ${className ?? ''}`}>
      {children ? (
        <div onClick={handleShare}>{children}</div>
      ) : (
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 md:px-4 md:py-2 md:text-sm"
          aria-label="Share"
        >
          Share
          <svg className="h-3.5 w-3.5 md:h-4 md:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>
      )}
    </div>
  );
}
