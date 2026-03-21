/** Instagram-style report categories (must match app `constants/reportReasons.ts`). */
export const REPORT_REASON_OPTIONS = [
  { id: 'spam', label: 'Spam or misleading' },
  { id: 'harassment', label: 'Bullying or harassment' },
  { id: 'hate', label: 'Hate speech or symbols' },
  { id: 'violence', label: 'Violence or dangerous organisations' },
  { id: 'nudity', label: 'Nudity or sexual content' },
  { id: 'scam', label: 'Scam or fraud' },
  { id: 'impersonation', label: 'Impersonation' },
  { id: 'self_injury', label: 'Self-injury or eating disorders' },
  { id: 'ip', label: 'Intellectual property violation' },
  { id: 'other', label: 'Something else' },
] as const;
