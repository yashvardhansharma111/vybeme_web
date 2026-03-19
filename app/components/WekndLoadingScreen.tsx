'use client';

/**
 * Shared loading UI: light gray background, subtle "weknd" watermark top & bottom, centered "Loading..." (no spinner).
 * Use for full routes (`min-h-screen`) or inline blocks via `className`.
 */
export interface WekndLoadingScreenProps {
  /** Tailwind classes for the outer wrapper; default full viewport height */
  className?: string;
  /** Center label; default matches product spec */
  message?: string;
}

export function WekndLoadingScreen({
  className = 'min-h-screen',
  message = 'Loading...',
}: WekndLoadingScreenProps) {
  return (
    <div
      className={`relative flex w-full flex-col items-center justify-center overflow-hidden bg-[#EBEBED] ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/4 select-none whitespace-nowrap font-extrabold leading-none tracking-tight text-[#d8d8dc] sm:text-[110px] text-[min(26vw,6.5rem)]"
        aria-hidden
      >
        weknd
      </span>
      <span
        className="pointer-events-none absolute bottom-0 left-1/2 translate-y-1/4 -translate-x-1/2 select-none whitespace-nowrap font-extrabold leading-none tracking-tight text-[#d8d8dc] sm:text-[110px] text-[min(26vw,6.5rem)]"
        aria-hidden
      >
        weknd
      </span>
      <p className="relative z-10 px-4 text-center text-xl font-medium tracking-tight text-[#2c2c2e] sm:text-2xl">
        {message}
      </p>
    </div>
  );
}
