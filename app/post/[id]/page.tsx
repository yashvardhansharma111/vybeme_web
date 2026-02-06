'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppHeader } from '../../components/AppHeader';
import { EventDetailCard, type EventDetailPost } from '../../components/EventDetailCard';
import { DownloadAppCTA } from '../../components/DownloadAppCTA';
import type { PostData } from '../../components/PostCard';
import { getPost, createJoinRequest, getWebUser, getPostImageUrlOrPlaceholder, getUserProfile } from '@/lib/api';

export default function PostPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;
  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [joinSent, setJoinSent] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const user = getWebUser();

  const loadPost = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getPost(postId);
      if (res.success && res.data) {
        const p = res.data;
        const authorId = p.user_id ?? p.user?.id ?? p.user?.user_id ?? p.author?.id ?? p.author?.user_id;
        let author = p.user ?? p.author;
        if (!author?.name && authorId) {
          try {
            const profileRes = await getUserProfile(authorId);
            if (profileRes.success && profileRes.data) {
              author = {
                id: authorId,
                user_id: authorId,
                name: profileRes.data.name ?? 'Unknown User',
                profile_image: profileRes.data.profile_image ?? undefined,
              };
            }
          } catch {
            author = author ?? { id: authorId, user_id: authorId, name: 'Unknown User' };
          }
        }
        const imageUrl = getPostImageUrlOrPlaceholder(p);
        setPost({
          ...p,
          title: p.title ?? '',
          description: p.description ?? '',
          image: imageUrl,
          user: author ? { ...author, id: author.id ?? author.user_id ?? authorId, user_id: author.user_id ?? author.id ?? authorId } : undefined,
          user_id: authorId,
        });
      } else {
        setError('Post not found');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load post');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  const handleJoin = useCallback(() => {
    if (!user?.user_id) {
      const redirect = `/post/${postId}`;
      router.push(`/login?redirect=${encodeURIComponent(redirect)}`);
      return;
    }
    setJoining(true);
    createJoinRequest(postId, user.user_id)
      .then(() => setJoinSent(true))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Join failed'))
      .finally(() => setJoining(false));
  }, [postId, user?.user_id, router]);

  const authorName = post?.user?.name || post?.author?.name || 'Shreya';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-100/80 to-neutral-900">
        <AppHeader />
        <div className="flex min-h-[50vh] items-center justify-center p-4">
          <p className="text-neutral-500">Loading…</p>
        </div>
      </div>
    );
  }

  if (error && !post) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-100/80 to-neutral-900">
        <AppHeader />
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-4">
          <p className="text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="rounded-full bg-black px-4 py-2 text-white"
          >
            Back home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-100/80 to-neutral-900 md:bg-neutral-200">
      <AppHeader />
      <main className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-8 md:max-w-4xl md:py-8">
        <button type="button" onClick={() => router.back()} className="self-start text-sm font-medium text-neutral-700 underline hover:text-neutral-900 md:mb-2">
          ← Back
        </button>
        {post && (
          <EventDetailCard
            post={post as EventDetailPost}
            joinSent={joinSent}
            joining={joining}
            onJoin={handleJoin}
            authorName={authorName}
          />
        )}
        {!joinSent && post && <DownloadAppCTA className="mt-4" />}
        {error && !joinSent && (
          <p className="text-center text-sm text-red-600">{error}</p>
        )}
        {joining && (
          <p className="text-center text-sm text-neutral-500 md:sr-only">Sending join request…</p>
        )}
      </main>
    </div>
  );
}
