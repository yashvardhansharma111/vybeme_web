'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { getWebUser, getCurrentUserProfile, createBusinessPlan } from '@/lib/api';

const CATEGORIES = ['Running', 'Sports', 'Fitness/Training', 'Social/Community'];

export default function BusinessCreatePage() {
  const router = useRouter();
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
  const [ticketsEnabled, setTicketsEnabled] = useState(false);
  const [passes, setPasses] = useState<{ name: string; price: number }[]>([{ name: '', price: 0 }]);
  const [womenOnly, setWomenOnly] = useState(false);
  const [allowGuestList, setAllowGuestList] = useState(true);
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
    if (!mounted) return;
    if (!user?.user_id) {
      router.replace('/login');
      return;
    }
  }, [mounted, user?.user_id, router]);

  const addPass = () => setPasses((prev) => [...prev, { name: '', price: 0 }]);
  const updatePass = (i: number, field: 'name' | 'price', value: string | number) => {
    setPasses((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: field === 'price' ? Number(value) || 0 : value };
      return next;
    });
  };
  const removePass = (i: number) => setPasses((prev) => prev.filter((_, idx) => idx !== i));

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
    if (ticketsEnabled && passes.some((p) => !p.name.trim())) {
      setError('All ticket types need a name');
      return;
    }
    if (!user?.user_id || !profile?.is_business) {
      setError('Business account required');
      return;
    }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        user_id: user.user_id,
        business_id: profile.business_id || user.user_id,
        title: title.trim(),
        description: description.trim(),
        category_main: category.toLowerCase(),
        category_sub: [category],
        post_status: 'published',
        allow_view_guest_list: allowGuestList,
        is_women_only: womenOnly,
      };
      if (location.trim()) body.location_text = location.trim();
      if (date) body.date = new Date(date).toISOString();
      if (time.trim()) body.time = time.trim();
      if (mediaUrl.trim()) {
        body.media = [{ url: mediaUrl.trim(), type: 'image' }];
      }
      if (ticketsEnabled && passes.filter((p) => p.name.trim()).length > 0) {
        body.passes = passes.filter((p) => p.name.trim()).map((p, i) => ({
          pass_id: `pass_${Date.now()}_${i}`,
          name: p.name.trim(),
          price: p.price,
          description: '',
          capacity: 1,
        }));
        body.is_paid_plan = true;
        body.registration_required = true;
      }
      const res = await createBusinessPlan(body);
      if (res.success && res.data?.post_id) {
        router.push(`/business?created=${res.data.post_id}`);
        return;
      }
      setError((res as { message?: string }).message || 'Failed to create post');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
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
  if (!user?.user_id) return null;

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-xl px-4 py-6">
        <div className="flex items-center gap-3">
          <Link href="/business" className="text-sm text-neutral-500 hover:text-neutral-700">
            ← Back
          </Link>
          <h1 className="text-lg font-semibold text-neutral-900">Create post</h1>
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
              placeholder="Venue or address"
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

          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-neutral-700">Tickets</label>
              <input
                type="checkbox"
                checked={ticketsEnabled}
                onChange={(e) => setTicketsEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300"
              />
            </div>
            {ticketsEnabled && (
              <div className="mt-3 space-y-2">
                {passes.map((p, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) => updatePass(i, 'name', e.target.value)}
                      placeholder="Ticket name"
                      className="flex-1 rounded border border-neutral-200 px-2 py-1.5 text-sm"
                    />
                    <input
                      type="number"
                      min={0}
                      value={p.price || ''}
                      onChange={(e) => updatePass(i, 'price', e.target.value)}
                      placeholder="Price"
                      className="w-20 rounded border border-neutral-200 px-2 py-1.5 text-sm"
                    />
                    <button type="button" onClick={() => removePass(i)} className="text-neutral-500 hover:text-red-600">
                      ×
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addPass} className="text-sm text-blue-600 hover:underline">
                  + Add ticket type
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3">
            <span className="text-sm font-medium text-neutral-700">Women&apos;s only</span>
            <input
              type="checkbox"
              checked={womenOnly}
              onChange={(e) => setWomenOnly(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3">
            <span className="text-sm font-medium text-neutral-700">Allow viewing guest list</span>
            <input
              type="checkbox"
              checked={allowGuestList}
              onChange={(e) => setAllowGuestList(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-neutral-800 py-2.5 font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create post'}
          </button>
        </form>
      </div>
    </div>
  );
}
