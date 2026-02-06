'use client';

export function DownloadAppCTA({ className = '' }: { className?: string }) {
  return (
    <div
      className={
        'flex items-center justify-between rounded-xl bg-neutral-800 px-4 py-3 ' +
        className
      }
    >
      <span className="text-sm text-neutral-300">Find people for your plans vybeme.</span>
      <a
        href="#"
        className="rounded-full bg-neutral-700 px-4 py-2 text-sm font-medium text-white no-underline transition-opacity hover:bg-neutral-600"
      >
        Download App
      </a>
    </div>
  );
}
