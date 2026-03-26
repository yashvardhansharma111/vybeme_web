export type AddDetail = {
  detail_type?: string;
  title?: string;
  description?: string;
};

export type TicketDetailPill = {
  key: string;
  label: string;
  detailType: string;
};

const DETAIL_LABEL_BY_TYPE: Record<string, string> = {
  distance: 'Distance',
  starting_point: 'Starting Point',
  dress_code: 'Dress Code',
  music_type: 'Music Type',
  parking: 'Parking',
  'f&b': 'F&B',
  links: 'Links',
  strava_link: 'Strava Link',
  google_drive_link: 'Photos',
  additional_info: 'Info',
};

function normalizeType(input: string): string {
  const raw = input.trim().toLowerCase();
  if (!raw) return '';
  if (raw === 'f and b') return 'f&b';
  return raw.replace(/\s+/g, '_');
}

function resolveLabel(detail: AddDetail): string {
  const description = String(detail.description ?? '').trim();
  const title = String(detail.title ?? '').trim();
  if (description) return description;
  if (title) return title;
  const normalizedType = normalizeType(String(detail.detail_type ?? ''));
  return DETAIL_LABEL_BY_TYPE[normalizedType] ?? '';
}

export function buildDetailPills(addDetails: AddDetail[] | undefined | null): TicketDetailPill[] {
  if (!Array.isArray(addDetails) || addDetails.length === 0) return [];

  const seen = new Set<string>();
  const pills: TicketDetailPill[] = [];

  addDetails.forEach((detail, index) => {
    const detailType = normalizeType(String(detail.detail_type ?? '')) || 'additional_info';
    const label = resolveLabel(detail);
    if (!label) return;

    const signature = `${detailType}::${label.toLowerCase()}`;
    if (seen.has(signature)) return;
    seen.add(signature);

    pills.push({
      key: `${detailType}-${index}`,
      label,
      detailType,
    });
  });

  return pills;
}
