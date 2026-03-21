'use client';

import { useEffect, useId, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AppHeader } from '../../components/AppHeader';
import { WekndLoadingScreen } from '../../components/WekndLoadingScreen';
import { DownloadAppCTA } from '../../components/DownloadAppCTA';
import {
  blockUserWeb,
  getBlockedUsersWeb,
  getUserProfile,
  getUserStats,
  getWebUser,
  setWebUser,
  unblockUserWeb,
} from '@/lib/api';
import { ReportUserModalWeb } from '../../components/ReportUserModalWeb';

function InstagramIcon({ className = 'h-6 w-6' }: { className?: string }) {
  const id = useId().replace(/:/g, '');
  const gradientId = `ig-${id}`;
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FED576" />
          <stop offset="50%" stopColor="#F47133" />
          <stop offset="100%" stopColor="#BC3081" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="#E1306C" />
      <rect width="24" height="24" rx="6" fill={`url(#${gradientId})`} />
      <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="1.5" fill="none" />
      <circle cx="12" cy="12" r="2.5" fill="white" />
      <circle cx="17" cy="7" r="1.25" fill="white" />
    </svg>
  );
}

function XIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function snapchatProfileHref(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://www.snapchat.com/add/${t.replace(/^@/, '')}`;
}

function whatsappProfileHref(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  const digits = t.replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : null;
}

function stravaProfileHref(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  if (/^\d+$/.test(t)) return `https://www.strava.com/athletes/${t}`;
  return `https://www.strava.com/athletes/${encodeURIComponent(t)}`;
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<{ plans_count: number; interactions_count: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [safetyBusy, setSafetyBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [safetyToast, setSafetyToast] = useState<string | null>(null);

  useEffect(() => {
    const uid = getWebUser()?.user_id ?? null;
    setCurrentUserId(uid);
    if (!uid || !userId || uid === userId) {
      setBlockedIds(new Set());
      return;
    }
    getBlockedUsersWeb()
      .then((r) => {
        if (r.success && r.data?.blocked_users) {
          setBlockedIds(new Set(r.data.blocked_users.map((b) => String(b.blocked_user_id))));
        }
      })
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      getUserProfile(userId).then((r) => r.success ? r.data : null),
      getUserStats(userId).then((r) => r.success ? r.data ?? null : null),
    ])
      .then(([p, s]) => {
        setProfile(p ?? null);
        setStats(s ?? null);
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : 'Couldn’t load profile';
        setError(msg.includes('Connection') || msg.includes('Server is busy') ? msg : 'Couldn’t load profile. Check your connection and try again.');
      })
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return <WekndLoadingScreen />;
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-100/80 to-neutral-900">
        <AppHeader />
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-4">
          <p className="text-red-600">{error || 'Profile not found'}</p>
          <Link href="/" className="rounded-full bg-black px-4 py-2 text-white no-underline">
            Back home
          </Link>
        </div>
      </div>
    );
  }

  const name = profile.name ?? 'User';
  const tagline = profile.bio ?? profile.tagline ?? '';
  const coverImage = profile.profile_image ?? profile.cover_image;
  const interests = profile.interests ?? [];
  const social = profile.social_media ?? {};
  const stripHandle = (v: string) => (v || '').replace(/^@/, '').replace(/.*(instagram\.com|twitter\.com|x\.com)\/([^/?]+).*/i, (_, __, h) => h).trim();
  const igHandle = stripHandle(social.instagram ?? '');
  const xHandle = stripHandle(social.x ?? social.twitter ?? '');
  const snapchatRaw = (social.snapchat ?? '').trim();
  const snapchatHref = snapchatRaw ? snapchatProfileHref(snapchatRaw) : null;
  const whatsappRaw = (social.whatsapp ?? '').trim();
  const whatsappHref = whatsappRaw ? whatsappProfileHref(whatsappRaw) : null;
  const stravaRaw = (social.strava ?? '').trim();
  const stravaHref = stravaRaw ? stravaProfileHref(stravaRaw) : null;
  const verified = profile.verified ?? false;
  const isOwnProfile = !!(currentUserId && userId && currentUserId === userId);
  const isBusinessProfile = profile.is_business === true;
  const showSafetyActions = !!(currentUserId && userId && !isOwnProfile);
  const isBlockedUser = showSafetyActions && blockedIds.has(String(userId));

  const handleToggleBlockWeb = async () => {
    if (!userId || !currentUserId) return;
    setSafetyBusy(true);
    setSafetyToast(null);
    const target = String(userId);
    try {
      if (isBlockedUser) {
        const r = await unblockUserWeb(target);
        if (!r.success) {
          setSafetyToast(r.message || 'Could not unblock');
          return;
        }
        setBlockedIds((prev) => {
          const n = new Set(prev);
          n.delete(target);
          return n;
        });
        setSafetyToast('User unblocked');
      } else {
        const r = await blockUserWeb(target);
        if (!r.success) {
          setSafetyToast(r.message || 'Could not block');
          return;
        }
        setBlockedIds((prev) => new Set(prev).add(target));
        setSafetyToast('User blocked');
      }
    } catch (e: unknown) {
      setSafetyToast(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSafetyBusy(false);
      if (typeof window !== 'undefined') {
        window.setTimeout(() => setSafetyToast(null), 3200);
      }
    }
  };

  const businessLatestLink =
    typeof window !== 'undefined' && userId
      ? `${window.location.origin}/go/business/${encodeURIComponent(userId)}`
      : '';

  const setStatus = (text: string) => {
    setShareStatus(text);
    if (typeof window !== 'undefined') {
      window.setTimeout(() => setShareStatus(null), 1800);
    }
  };

  const handleCopyLatestLink = () => {
    if (!businessLatestLink) return;
    if (!navigator.clipboard?.writeText) {
      setStatus('Copy not supported on this browser');
      return;
    }
    navigator.clipboard
      .writeText(businessLatestLink)
      .then(() => setStatus('Copied latest plan link'))
      .catch(() => setStatus('Failed to copy link'));
  };

  const handleShareLatestLink = () => {
    if (!businessLatestLink) return;
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator
        .share({
          url: businessLatestLink,
          title: `${name} on weknd.`,
          text: `Check out the latest event from ${name}.`,
        })
        .catch(() => handleCopyLatestLink());
      return;
    }
    handleCopyLatestLink();
  };

  const handleLogout = () => {
    setWebUser(null);
    router.replace('/login');
  };

  const profileCard = (
    <div className="relative h-44 overflow-hidden rounded-2xl bg-white shadow-md md:h-72 md:min-h-[280px]">
      {coverImage ? (
        <Image
          src={coverImage}
          alt=""
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      ) : (
        <div className="h-full bg-neutral-300" />
      )}
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 to-transparent p-4 md:p-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-white md:text-3xl">{name}</h1>
          {verified && (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 md:h-7 md:w-7" aria-label="Verified">
              <svg className="h-4 w-4 text-white md:h-5 md:w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </span>
          )}
        </div>
        {tagline && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-white/90 md:text-base">
            <svg className="h-4 w-4 shrink-0 text-white/80" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
            {tagline}
          </p>
        )}
      </div>
    </div>
  );

  const socialCard = (
    <div className="rounded-2xl border border-neutral-100 bg-white p-0 shadow-sm">
      <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center">
          <InstagramIcon className="h-6 w-6" />
        </div>
        <span className={igHandle ? 'text-sm text-neutral-600' : 'text-sm text-neutral-400'}>
          {igHandle ? `@${igHandle}` : '—'}
        </span>
      </div>
      <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center text-black">
          <XIcon className="h-5 w-5" />
        </div>
        <span className={xHandle ? 'text-sm text-neutral-600' : 'text-sm text-neutral-400'}>
          {xHandle ? `@${xHandle}` : '—'}
        </span>
      </div>
      <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FFFC00] text-lg font-bold text-black"
          aria-hidden
        >
          S
        </div>
        {snapchatHref ? (
          <a
            href={snapchatHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-neutral-600 underline-offset-2 hover:underline"
          >
            {snapchatRaw.replace(/^@/, '')}
          </a>
        ) : (
          <span className="text-sm text-neutral-400">—</span>
        )}
      </div>
      <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center text-[#25D366]">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.883 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </div>
        {whatsappHref ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-neutral-600 underline-offset-2 hover:underline"
          >
            {whatsappRaw}
          </a>
        ) : (
          <span className="text-sm text-neutral-400">—</span>
        )}
      </div>
      <div className="flex items-center gap-3 px-4 py-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FC5200] text-sm font-extrabold text-white"
          aria-hidden
        >
          S
        </div>
        {stravaHref ? (
          <a
            href={stravaHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-neutral-600 underline-offset-2 hover:underline"
          >
            {stravaRaw.length > 40 ? 'Strava profile' : stravaRaw}
          </a>
        ) : (
          <span className="text-sm text-neutral-400">—</span>
        )}
      </div>
    </div>
  );

  const statsCards = stats && (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-100 bg-white py-5 shadow-sm">
        <p className="text-2xl font-bold text-neutral-900 md:text-3xl">{stats.plans_count ?? 0}</p>
        <p className="text-xs text-neutral-500">#plans</p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-100 bg-white py-5 shadow-sm">
        <p className="text-2xl font-bold text-neutral-900 md:text-3xl">{stats.interactions_count ?? 0}</p>
        <p className="text-xs text-neutral-500">#interactions</p>
      </div>
    </div>
  );

  const interestsCard = (
    <div className="rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm md:p-5">
      <p className="mb-3 text-sm font-bold text-neutral-900 md:text-base">#interests</p>
      <div className="flex flex-wrap gap-2">
        {interests.length > 0 ? (
          interests.map((i: string, idx: number) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1.5 text-sm text-neutral-700"
            >
              <svg className="h-3.5 w-3.5 shrink-0 text-neutral-500" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
              {i}
            </span>
          ))
        ) : (
          <span className="text-sm text-neutral-400">No interests added</span>
        )}
      </div>
    </div>
  );

  const recentPlansCard = (
    <div className="relative min-h-[180px] overflow-hidden rounded-2xl border border-white/20 bg-white/40 shadow-lg backdrop-blur-xl md:min-h-[200px]">
      <div className="absolute inset-0 rounded-2xl bg-white/30 backdrop-blur-md" aria-hidden />
      <div className="relative z-10 flex flex-col items-center justify-center gap-3 px-4 py-10 md:py-12">
        <p className="text-center text-sm font-bold text-neutral-900 md:text-base">Recent Plans</p>
        <p className="text-center text-sm font-medium text-neutral-700 md:text-base">
          Download App to view {name}&apos;s plans
        </p>
        <a
          href="#"
          className="mt-2 rounded-full bg-neutral-800 px-5 py-2.5 text-sm font-semibold text-white no-underline transition-opacity hover:bg-neutral-700"
        >
          Download App
        </a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-100/80 to-neutral-900 md:bg-gradient-to-br md:from-sky-100/90 md:via-sky-50/80 md:to-blue-100/90">
      <AppHeader />
      {isOwnProfile && (
        <div className="mx-auto flex max-w-md flex-wrap items-center gap-2 px-4 pt-2 md:max-w-5xl md:px-6">
          {isBusinessProfile && (
            <>
              <button
                type="button"
                onClick={handleShareLatestLink}
                className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Share latest plan link
              </button>
              <button
                type="button"
                onClick={handleCopyLatestLink}
                className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Copy link
              </button>
            </>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Logout
          </button>
          {shareStatus && <span className="text-xs font-medium text-neutral-600">{shareStatus}</span>}
        </div>
      )}
      <main className="mx-auto max-w-md px-4 pb-8 pt-2 md:max-w-5xl md:grid md:grid-cols-2 md:gap-6 md:py-8 md:px-6">
        {showSafetyActions && (
          <div className="col-span-full mb-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleToggleBlockWeb}
              disabled={safetyBusy}
              className="rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {safetyBusy ? 'Please wait…' : isBlockedUser ? 'Unblock user' : 'Block user'}
            </button>
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              disabled={safetyBusy}
              className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
            >
              Report
            </button>
            {safetyToast ? <span className="text-sm text-neutral-600">{safetyToast}</span> : null}
          </div>
        )}
        {/* Mobile: single column */}
        <div className="flex flex-col gap-3 md:hidden">
          {profileCard}
          <div className="-mt-0 flex flex-col gap-3">
            {socialCard}
            {statsCards}
            {interestsCard}
            {recentPlansCard}
          </div>
        </div>

        {/* Desktop: left column = profile + interests, right column = social + stats + recent plans */}
        <div className="hidden md:flex md:flex-col md:gap-6">
          {profileCard}
          {interestsCard}
        </div>
        <div className="hidden md:flex md:flex-col md:gap-4">
          {socialCard}
          {statsCards}
          {recentPlansCard}
        </div>
      </main>

      <div className="mx-auto mt-4 max-w-md px-4 md:max-w-5xl md:px-6">
        <DownloadAppCTA />
      </div>

      <ReportUserModalWeb
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        reportedUserId={String(userId)}
        onSubmitted={() => {
          setReportOpen(false);
          setSafetyToast('Thanks — we received your report.');
          if (typeof window !== 'undefined') {
            window.setTimeout(() => setSafetyToast(null), 4000);
          }
        }}
      />
    </div>
  );
}
