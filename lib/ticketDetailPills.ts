/**
 * Category pills for ticket / confirmation — matches BusinessPlan `add_details`
 * (@see vybeme_backend/models/plan/BusinessPlan.js addDetailSchema):
 * - detail_type: required string (distance, starting_point, dress_code, music_type, parking, f&b, links, strava_link, google_drive_link, additional_info)
 * - title: label fallback (e.g. "Distance") when syncing from web builder
 * - description: main value shown in the pill (e.g. "5k", "Cafe Rave")
 * - heading: for additional_info only — paired with description
 */

export type AddDetail = {
  detail_type?: string;
  title?: string;
  description?: string;
  /** Backend field for detail_type === 'additional_info' */
  heading?: string;
};

export type TicketDetailPill = {
  key: string;
  label: string;
  /** Maps to icons in TicketCategoryPills (same keys as create/edit Additional Info) */
  detailType: string;
};

/** detail_type values stored by create/update business post flows */
const KNOWN_DETAIL_TYPES = new Set([
  'distance',
  'starting_point',
  'dress_code',
  'music_type',
  'parking',
  'f&b',
  'links',
  'strava_link',
  'google_drive_link',
  'additional_info',
]);

/**
 * One pill per add_details row: show the attendee-facing value (description),
 * with additional_info using heading + description per backend schema.
 */
export function buildDetailPills(addDetails: AddDetail[] | undefined): TicketDetailPill[] {
  if (!Array.isArray(addDetails) || !addDetails.length) return [];
  const out: TicketDetailPill[] = [];

  addDetails.forEach((row, i) => {
    const rawType = (row.detail_type || 'distance').trim();
    const type = KNOWN_DETAIL_TYPES.has(rawType) ? rawType : rawType || 'distance';
    const desc = (row.description ?? '').trim();
    const title = (row.title ?? '').trim();
    const heading = (row.heading ?? '').trim();

    if (type === 'additional_info') {
      const head = heading || title;
      const line = [head, desc].filter(Boolean).join(' — ');
      if (line) {
        out.push({ key: `ai-${i}`, label: line, detailType: 'additional_info' });
      }
      return;
    }

    const label = desc || title;
    if (label) {
      out.push({ key: `${type}-${i}`, label, detailType: type });
    }
  });

  return out.slice(0, 8);
}
