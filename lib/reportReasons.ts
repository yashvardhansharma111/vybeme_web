export type ReportReasonOption = {
  id: string;
  label: string;
};

export const REPORT_REASON_OPTIONS: ReportReasonOption[] = [
  { id: 'spam', label: 'Spam' },
  { id: 'harassment', label: 'Harassment or bullying' },
  { id: 'hate', label: 'Hate speech or symbols' },
  { id: 'violence', label: 'Violence or dangerous organizations' },
  { id: 'nudity', label: 'Nudity or sexual content' },
  { id: 'fake', label: 'False information' },
  { id: 'impersonation', label: 'Pretending to be someone else' },
  { id: 'scam', label: 'Scam or fraud' },
  { id: 'other', label: 'Something else' },
];
