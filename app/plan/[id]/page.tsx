'use client';

import { useParams, redirect } from 'next/navigation';

/**
 * Redirect /plan/[id] → /post/[id] so shared links (e.g. from the app)
 * open the single post page. When someone opens a shared post link,
 * they see only that post, not the full feed.
 */
export default function PlanRedirectPage() {
  const params = useParams();
  const id = params.id as string;
  redirect(id ? `/post/${id}` : '/');
}
