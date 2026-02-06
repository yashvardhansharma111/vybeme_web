'use client';

import { useEffect, useState } from 'react';
import { AppHeader } from './components/AppHeader';
import { PostCard, type PostData } from './components/PostCard';
import { BusinessCard } from './components/BusinessCard';
import { DownloadAppCTA } from './components/DownloadAppCTA';
import { getFeed, getWebUser, formatFeedData, type FormattedPost } from '@/lib/api';

export default function Home() {
  const user = getWebUser();
  const [posts, setPosts] = useState<PostData[]>([]);
  const [businessPosts, setBusinessPosts] = useState<FormattedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getFeed(user?.user_id ?? null)
      .then(async (res) => {
        if (!res.success || !Array.isArray(res.data)) {
          setPosts([]);
          setBusinessPosts([]);
          return;
        }
        const formatted = await formatFeedData(res.data);
        const business = formatted.filter((p) => p.type === 'business');
        const regular = formatted.filter((p) => p.type !== 'business');
        setBusinessPosts(business);
        setPosts(regular as PostData[]);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load feed'))
      .finally(() => setLoading(false));
  }, [user?.user_id]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-100/80 to-neutral-900 md:bg-neutral-200">
      <AppHeader />
      <main className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-8 md:max-w-2xl md:py-8">
        {loading && (
          <div className="flex justify-center py-12">
            <p className="text-neutral-500">Loading…</p>
          </div>
        )}
        {error && (
          <p className="rounded-xl bg-white/90 p-4 text-center text-sm text-red-600">{error}</p>
        )}
        {!loading && !error && posts.length === 0 && (
          <div className="rounded-2xl bg-white p-6 text-center shadow-lg">
            <p className="text-neutral-500">No plans yet. Check back later or open the app.</p>
            <DownloadAppCTA className="mt-4" />
          </div>
        )}
        {businessPosts.length > 0 && (
          <section className="mb-4">
            <h2 className="mb-3 px-1 text-sm font-semibold text-neutral-600">Happening near me</h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {businessPosts.map((post) => {
                const id = post.post_id ?? post.id;
                if (!id) return null;
                return (
                  <div key={id} className="w-[300px] shrink-0">
                    <BusinessCard
                      plan={{
                        plan_id: id,
                        post_id: id,
                        id,
                        title: post.title,
                        description: post.description,
                        media: post.media,
                        image: post.image,
                        category_sub: post.category_sub ?? post.tags,
                        tags: post.tags,
                        passes: (post as any).passes,
                        user: post.user,
                      }}
                      user={post.user ? { id: post.user.id, name: post.user.name, avatar: post.user.profile_image ?? undefined, profile_image: post.user.profile_image ?? undefined, time: post.user.time } : undefined}
                      attendeesCount={post.interaction_count ?? 0}
                      interactedUsers={post.interacted_users as any}
                      planHref={`/post/${id}`}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        )}
        {posts.map((post) => {
          const id = post.post_id ?? post.id;
          if (!id) return null;
          return (
            <PostCard
              key={id}
              post={post}
              showJoin={true}
              showReactions={false}
              postHref={`/post/${id}`}
            />
          );
        })}
        {(posts.length > 0 || businessPosts.length > 0) && <DownloadAppCTA className="mt-2" />}
      </main>
    </div>
  );
}
