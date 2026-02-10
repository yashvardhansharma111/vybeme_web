'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppHeader } from './components/AppHeader';
import { DownloadAppCTA } from './components/DownloadAppCTA';
import { PostCard } from './components/PostCard';
import { BusinessCard } from './components/BusinessCard';
import { getWebUser, getFeed, formatFeedData, type FormattedPost } from '@/lib/api';

export default function Home() {
  const user = getWebUser();
  const [posts, setPosts] = useState<FormattedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getFeed(user?.user_id ?? null, 30, 0);
      const raw = Array.isArray(res) ? res : (res as { data?: unknown[] })?.data ?? [];
      const list = Array.isArray(raw) ? raw : [];
      const formatted = await formatFeedData(list);
      setPosts(formatted);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load feed');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [user?.user_id]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const businessPosts = posts.filter((p) => p.type === 'business');
  const regularPosts = posts.filter((p) => p.type !== 'business');

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-100/80 to-neutral-200 md:bg-neutral-200">
      <AppHeader />
      <main className="mx-auto max-w-md flex flex-col gap-6 pb-12 md:max-w-2xl">
        {/* Hero copy when no feed or above feed */}
        <div className="px-4 pt-6 text-center">
          <h1 className="text-2xl font-bold text-neutral-900 md:text-3xl">
            Find people for your plans
          </h1>
          <p className="mt-2 max-w-sm text-neutral-600">
            Discover plans, join events, and connect with others.
          </p>
        </div>

        {loading && posts.length === 0 ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <p className="text-neutral-500">Loading feed…</p>
          </div>
        ) : error && posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 px-4 py-8">
            <p className="text-red-600">{error}</p>
            <button
              type="button"
              onClick={loadFeed}
              className="rounded-full bg-neutral-800 px-4 py-2 text-sm font-medium text-white"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Business cards — same look as app (hero + list) */}
            {businessPosts.length > 0 && (
              <section className="flex flex-col gap-6">
                {businessPosts.map((p) => (
                  <div key={p.post_id} className="w-full px-2">
                    <BusinessCard
                      plan={{
                        plan_id: p.post_id,
                        post_id: p.post_id,
                        title: p.title,
                        description: p.description,
                        media: p.media,
                        image: p.image,
                        category_main: (p as any).category_main,
                        category_sub: p.category_sub ?? p.tags,
                        tags: p.tags,
                        passes: (p as any).passes,
                        location_text: (p as any).location_text,
                        date: (p as any).date,
                        time: (p as any).time,
                      }}
                      user={{
                        id: p.user_id,
                        name: p.user?.name,
                        avatar: p.user?.profile_image ?? undefined,
                        profile_image: p.user?.profile_image ?? undefined,
                        time: p.user?.time,
                      }}
                      attendeesCount={(p as any).joins_count ?? 0}
                      interactedUsers={p.interacted_users}
                      planHref={`/post/${p.post_id}`}
                    />
                  </div>
                ))}
              </section>
            )}

            {/* Regular posts & reposts — same card style as app */}
            {regularPosts.length > 0 && (
              <section className="flex flex-col gap-2">
                {regularPosts.map((p) => {
                  const postHref = `/post/${(p.original_plan_id ?? p.post_id) as string}`;
                  const card = (
                    <PostCard
                      post={{
                        post_id: p.post_id,
                        id: p.post_id,
                        title: p.title,
                        description: p.description,
                        type: p.type,
                        tags: p.tags,
                        category_sub: p.category_sub,
                        image: p.image,
                        media: p.media,
                        user: p.user,
                        user_id: p.user_id,
                        location_text: (p as any).location_text,
                        date: (p as any).date,
                        time: (p as any).time,
                        created_at: p.created_at,
                        interacted_users: p.interacted_users,
                        interaction_count: p.interaction_count,
                      }}
                      showJoin
                      postHref={postHref}
                    />
                  );
                  return (
                    <div key={p.post_id} className="w-full">
                      {p.is_repost && p.original_author_name && (
                        <div className="mb-1 flex items-center gap-2 px-6">
                          <span className="text-xs text-neutral-500">
                            Reposted by {p.original_author_name}
                          </span>
                        </div>
                      )}
                      {card}
                    </div>
                  );
                })}
              </section>
            )}

            {!loading && posts.length === 0 && (
              <div className="px-4 py-8 text-center text-neutral-500">
                No posts yet. Open the app to discover plans.
              </div>
            )}
          </>
        )}

        <DownloadAppCTA className="mx-4 mt-4" />
      </main>
    </div>
  );
}
