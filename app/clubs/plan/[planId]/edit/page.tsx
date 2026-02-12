'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { getWebUser, getCurrentUserProfile, getBusinessPlanDetails, updateBusinessPlan } from '@/lib/api';

const CATEGORIES = ['Running', 'Sports', 'Fitness/Training', 'Social/Community'];

export default function BusinessEditPlanPage() {
  const params = useParams();
  const router = useRouter();
  const planId = (params?.planId as string) || '';
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<ReturnType<typeof getWebUser>>(null);
  const [profile, setProfile] = useState<{ is_business?: boolean; business_id?: string } | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [category, setCategory] = useState('');
  const [passes, setPasses] = useState<{ pass_id: string; name: string; price: number }[]>([]);
  const [womenOnly, setWomenOnly] = useState(false);
  const [allowGuestList, setAllowGuestList] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setUser(getWebUser());
  }, []);

  const loadProfile = useCallback(async () => {
    const u = getWebUser();
    if (!u?.session_id) return;
    const p = await getCurrentUserProfile(u.session_id);
    if (p) setProfile({ is_business: !!p.is_business, business_id: p.business_id });
  }, []);

  useEffect(() => {
    if (!mounted || !user?.user_id) return;
    loadProfile();
  }, [mounted, user?.user_id, loadProfile]);

  useEffect(() => {
    if (!mounted || !planId || !user?.user_id) return;
    (async () => {
      try {
        setLoading(true);
        const res = await getBusinessPlanDetails(planId);
        if (res.success && res.data) {
          const d = res.data;
          setTitle(d.title ?? '');
          setDescription(d.description ?? '');
          setLocation(d.location_text ?? '');
          setCategory(d.category_main ? d.category_main.charAt(0).toUpperCase() + d.category_main.slice(1) : '');
          setWomenOnly(!!d.is_women_only);
          setAllowGuestList(d.allow_view_guest_list !== false);
          if (d.date) setDate(new Date(d.date).toISOString().slice(0, 10));
          setTime(d.time ?? '');
          if (d.media?.length) setMediaUrl(d.media[0].url ?? '');
          if (d.passes?.length) {
            setPasses(d.passes.map((p: { pass_id: string; name: string; price: number }) => ({ pass_id: p.pass_id, name: p.name ?? '', price: p.price ?? 0 })));
          }
        }
      } catch {
        setError('Failed to load plan');
      } finally {
        setLoading(false);
      }
    })();
  }, [mounted, planId, user?.user_id]);

  useEffect(() => {
    if (!mounted) return;
    if (!user?.user_id) {
      router.replace('/login');
      return;
    }
    if (!planId) {
      router.replace('/clubs');
      return;
    }
  }, [mounted, user?.user_id, planId, router]);

  const updatePass = (i: number, field: 'name' | 'price', value: string | number) => {
    setPasses((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: field === 'price' ? Number(value) || 0 : value };
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!description.trim()) {
      setError('Description is required');
      return;
    }
    if (!category) {
      setError('Category is required');
      return;
    }
    if (!user?.user_id) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
        category_main: category.toLowerCase(),
        category_sub: [category],
        allow_view_guest_list: allowGuestList,
        is_women_only: womenOnly,
      };
      if (location.trim()) body.location_text = location.trim();
      if (date) body.date = new Date(date).toISOString();
      if (time.trim()) body.time = time.trim();
      if (mediaUrl.trim()) {
        body.media = [{ url: mediaUrl.trim(), type: 'image' }];
      }
      if (passes.length > 0) {
        body.passes = passes.map((p) => ({ pass_id: p.pass_id, name: p.name.trim(), price: p.price, description: '', capacity: 1 }));
      }
      const res = await updateBusinessPlan(planId, body);
      if (res.success) {
        router.push('/clubs');
        return;
      }
      setError((res as { message?: string }).message || 'Failed to update');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700" />
      </div>
    );
  }
  if (!user?.user_id || !planId) return null;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-xl px-4 py-6">
        <div className="flex items-center gap-3">
          <Link href="/clubs" className="text-sm text-neutral-500 hover:text-neutral-700">
            ← Back
          </Link>
          <h1 className="text-lg font-semibold text-neutral-900">Edit plan</h1>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-neutral-900"
              placeholder="Event title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-neutral-900"
              placeholder="Describe your event"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">Image URL (optional)</label>
            <input
              type="url"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-neutral-900"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-neutral-900"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-neutral-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700">Time</label>
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-neutral-900"
                placeholder="e.g. 8:00 AM"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-neutral-900"
            >
              <option value="">Select category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          {passes.length > 0 && (
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <label className="block text-sm font-medium text-neutral-700">Tickets</label>
              <div className="mt-2 space-y-2">
                {passes.map((p, i) => (
                  <div key={p.pass_id} className="flex gap-2">
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) => updatePass(i, 'name', e.target.value)}
                      className="flex-1 rounded border border-neutral-200 px-2 py-1.5 text-sm"
                    />
                    <input
                      type="number"
                      min={0}
                      value={p.price || ''}
                      onChange={(e) => updatePass(i, 'price', e.target.value)}
                      className="w-20 rounded border border-neutral-200 px-2 py-1.5 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3">
            <span className="text-sm font-medium text-neutral-700">Women&apos;s only</span>
            <input type="checkbox" checked={womenOnly} onChange={(e) => setWomenOnly(e.target.checked)} className="h-4 w-4 rounded border-neutral-300" />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3">
            <span className="text-sm font-medium text-neutral-700">Allow viewing guest list</span>
            <input type="checkbox" checked={allowGuestList} onChange={(e) => setAllowGuestList(e.target.checked)} className="h-4 w-4 rounded border-neutral-300" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-neutral-800 py-2.5 font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
