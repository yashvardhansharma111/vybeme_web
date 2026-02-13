'use client';

import { useCallback, useRef, useState } from 'react';

export interface ShareMenuProps {
  postId: string;
  title: string;
  /** Use /go/post for app-style open-in-app when opened on mobile */
  useGoPostUrl?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function ShareMenu({ postId, title, useGoPostUrl = false, children, className }: ShareMenuProps) {
  const [open, setOpen] = useState(false);
  const [instaInstructions, setInstaInstructions] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const postPath = useGoPostUrl ? `/go/post/${postId}` : `/post/${postId}`;
  const postUrl = `${baseUrl}${postPath}`;
  const storyImageUrl = `${baseUrl}/api/og/post/${postId}/story`;

  const copyLink = useCallback(() => {
    if (!postUrl) return;
    navigator.clipboard?.writeText(postUrl).then(() => {
      setOpen(false);
    });
  }, [postUrl]);

  const nativeShare = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.share && postUrl) {
      navigator.share({ url: postUrl, title: title || 'Event on vybeme.' }).then(() => setOpen(false)).catch(() => copyLink());
    } else {
      copyLink();
    }
  }, [postUrl, title, copyLink]);

  const shareToInstagramStory = useCallback(() => {
    if (!postUrl || !storyImageUrl) return;
    navigator.clipboard?.writeText(postUrl).then(() => {
      setOpen(false);
      window.open(storyImageUrl, '_blank', 'noopener,noreferrer');
      setInstaInstructions(true);
      setTimeout(() => setInstaInstructions(false), 8000);
    });
  }, [postUrl, storyImageUrl]);

  return (
    <div className={`relative inline-block ${className ?? ''}`} ref={menuRef}>
      {children ? (
        <div onClick={() => setOpen((o) => !o)}>{children}</div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 md:px-4 md:py-2 md:text-sm"
          aria-expanded={open}
          aria-haspopup="true"
        >
          Share
          <svg className="h-3.5 w-3.5 md:h-4 md:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-40" aria-hidden onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full z-50 mt-2 min-w-[220px] rounded-2xl border border-neutral-200 bg-white py-2 shadow-xl md:min-w-[260px]"
            role="menu"
          >
            <button
              type="button"
              role="menuitem"
              onClick={copyLink}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-neutral-800 hover:bg-neutral-50 md:px-5 md:py-3.5 md:text-base"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">
                <LinkIcon />
              </span>
              Copy link
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={nativeShare}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-neutral-800 hover:bg-neutral-50 md:px-5 md:py-3.5 md:text-base"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">
                <ShareIcon />
              </span>
              Share (WhatsApp, etc.)
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={shareToInstagramStory}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-neutral-800 hover:bg-neutral-50 md:px-5 md:py-3.5 md:text-base"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">
                <InstagramIcon />
              </span>
              Share to Instagram Story
            </button>
          </div>
        </>
      )}

      {/* Instructions toast after Instagram Story flow */}
      {instaInstructions && (
        <div
          className="fixed bottom-6 left-4 right-4 z-[100] rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xl md:left-auto md:right-6 md:max-w-sm"
          role="status"
        >
          <p className="text-sm font-medium text-neutral-900">Link copied</p>
          <p className="mt-1 text-xs text-neutral-600">
            Save the image that opened, add it to your Instagram story, then tap the link sticker and paste the link.
          </p>
          <button
            type="button"
            onClick={() => setInstaInstructions(false)}
            className="mt-3 text-xs font-semibold text-neutral-700 underline"
          >
            Got it
          </button>
        </div>
      )}
    </div>
  );
}

function LinkIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.172-1.172a4 4 0 00-.5-6.086 4 4 0 00-5.656 0l-1.172 1.172" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.172 1.172a4 4 0 00.5 6.086 4 4 0 005.656 0l1.172-1.172" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}
