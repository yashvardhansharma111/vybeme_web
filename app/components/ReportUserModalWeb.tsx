'use client';

import React, { useState } from 'react';
import { REPORT_REASON_OPTIONS } from '@/lib/reportReasons';
import { reportUserWeb } from '@/lib/api';

type Props = {
  open: boolean;
  onClose: () => void;
  reportedUserId: string;
  postId?: string | null;
  onSubmitted?: () => void;
};

export function ReportUserModalWeb({ open, onClose, reportedUserId, postId, onSubmitted }: Props) {
  const [step, setStep] = useState<'pick' | 'other'>('pick');
  const [otherText, setOtherText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const reset = () => {
    setStep('pick');
    setOtherText('');
    setError(null);
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const submit = async (reasonLabel: string, message?: string | null) => {
    if (!reportedUserId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await reportUserWeb(reportedUserId, reasonLabel, {
        post_id: postId || undefined,
        message: message ?? undefined,
      });
      if (!res.success) {
        setError(res.message || 'Could not send report');
        return;
      }
      reset();
      onClose();
      onSubmitted?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not send report');
    } finally {
      setSubmitting(false);
    }
  };

  const onPickReason = (id: string, label: string) => {
    if (id === 'other') {
      setStep('other');
      return;
    }
    submit(label, null);
  };

  const onSubmitOther = () => {
    const t = otherText.trim();
    if (!t) {
      setError('Please add a short description.');
      return;
    }
    submit(`Something else: ${t.slice(0, 500)}`, t.slice(0, 2000));
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-title"
      onClick={handleClose}
      onKeyDown={(e) => e.key === 'Escape' && handleClose()}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="presentation"
      >
        <div className="flex max-h-[90vh] flex-col">
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
            <h2 id="report-title" className="text-lg font-bold text-neutral-900">
              Report
            </h2>
            <button type="button" onClick={handleClose} className="rounded-full p-2 text-neutral-600 hover:bg-neutral-100" aria-label="Close">
              ✕
            </button>
          </div>
          <p className="px-4 pt-3 text-sm text-neutral-600">
            Why are you reporting this account? Your report is anonymous to them.
          </p>
          {error ? <p className="px-4 pt-2 text-sm text-red-600">{error}</p> : null}

          {step === 'pick' ? (
            <ul className="max-h-[60vh] overflow-y-auto py-2">
              {REPORT_REASON_OPTIONS.map((opt) => (
                <li key={opt.id}>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => onPickReason(opt.id, opt.label)}
                    className="flex w-full items-center justify-between border-b border-neutral-100 px-4 py-3.5 text-left text-base text-neutral-900 hover:bg-neutral-50 disabled:opacity-50"
                  >
                    {opt.label}
                    <span className="text-neutral-400">›</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col gap-3 p-4">
              <label className="text-sm font-semibold text-neutral-900">Tell us what&apos;s wrong</label>
              <textarea
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                placeholder="Describe the issue…"
                maxLength={2000}
                rows={5}
                disabled={submitting}
                className="rounded-xl border border-neutral-200 p-3 text-base text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-400/40"
              />
              <button
                type="button"
                disabled={submitting}
                onClick={onSubmitOther}
                className="rounded-full bg-neutral-900 py-3 text-center text-base font-semibold text-white disabled:opacity-50"
              >
                {submitting ? 'Sending…' : 'Submit report'}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setStep('pick');
                  setError(null);
                }}
                className="py-2 text-center text-sm font-semibold text-blue-600"
              >
                ← Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
