'use client';

import React, { useEffect } from 'react';

function formatINR(amount: number): string {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  } catch {
    return `₹${amount.toFixed(2)}`;
  }
}

export interface BillSummaryModalProps {
  open: boolean;
  ticketFare: number;
  platformFeePercent?: number;
  onClose: () => void;
  onProceed: () => void;
  proceeding?: boolean;
}

export default function BillSummaryModal({
  open,
  ticketFare,
  /** Kept for API compatibility; 10% + GST billing is disabled below (see comments). */
  platformFeePercent = 10,
  onClose,
  onProceed,
  proceeding,
}: BillSummaryModalProps) {
  /** Disabled: 10% platform fee + GST — totals are ticket fare only. Re-enable by uncommenting below and the UI row. */
  // const platformFee = (ticketFare * platformFeePercent) / 100;
  // const totalFare = ticketFare + platformFee;
  const platformFee = 0;
  const totalFare = ticketFare;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Bill summary"
      onClick={() => onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-base font-bold text-neutral-900">Bill summary</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-neutral-700 hover:bg-neutral-100"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="px-5 pb-5">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-neutral-600">Ticket Fare</span>
              <span className="font-semibold text-neutral-900">{formatINR(ticketFare)}</span>
            </div>
            {/* Disabled: Platform Fee + GST line (10% + GST) — re-enable with calculations above
            <div className="flex items-center justify-between">
              <span className="text-neutral-600">Platform Fee + GST</span>
              <span className="font-semibold text-neutral-900">{formatINR(platformFee)}</span>
            </div>
            */}
            <div className="h-px w-full bg-neutral-200" />
            <div className="flex items-center justify-between">
              <span className="text-neutral-900 font-semibold">Total Fare</span>
              <span className="text-neutral-900 font-extrabold">{formatINR(totalFare)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onProceed}
            disabled={!!proceeding}
            className="mt-5 w-full rounded-[25px] bg-[#1C1C1E] py-4 text-base font-bold text-white disabled:opacity-60"
          >
            {proceeding ? 'Opening payment…' : 'Proceed to Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}
