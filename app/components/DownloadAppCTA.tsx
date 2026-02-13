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
    </div>
  );
}
