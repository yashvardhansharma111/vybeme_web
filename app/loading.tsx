'use client';

export default function Loading() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#D9D9DC]">
      <span className="pointer-events-none absolute -top-5 left-0 select-none text-[110px] leading-none font-extrabold text-white/25">
        weknd
      </span>
      <span className="pointer-events-none absolute -bottom-5 left-0 select-none text-[110px] leading-none font-extrabold text-white/25">
        weknd
      </span>

      <p className="text-[34px] font-extrabold tracking-tight text-[#4B4B4D]">Loading...</p>
    </div>
  );
}
