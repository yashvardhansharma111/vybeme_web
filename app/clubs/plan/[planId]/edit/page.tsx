'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { getWebUser, getCurrentUserProfile, getBusinessPlanDetails, updateBusinessPlan } from '@/lib/api';

const CATEGORIES = ['Running', 'Sports', 'Fitness/Training', 'Social/Community'];

const ADDITIONAL_DETAIL_OPTIONS = [
  { id: 'distance', label: 'Distance', placeholder: 'e.g. 5k' },
  { id: 'starting_point', label: 'Starting Point', placeholder: 'e.g. Alienkind Indiranagar' },
  { id: 'dress_code', label: 'Dress Code', placeholder: 'e.g. Cafe Joggers' },
  { id: 'music_type', label: 'Music Type', placeholder: 'e.g. Electronic' },
  { id: 'parking', label: 'Parking', placeholder: 'e.g. Available' },
  { id: 'f&b', label: 'F&B', placeholder: 'e.g. Post Run Coffee' },
  { id: 'links', label: 'Links', placeholder: 'https://...' },
  { id: 'google_drive_link', label: 'Link for photos', placeholder: 'https://drive.google.com/...' },
  { id: 'additional_info', label: 'Additional Info', placeholder: 'Heading and description' },
];

function timeTo24h(value: string): string {
  if (!value || !value.trim()) return '';
  const v = value.trim();
  const match = v.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return v;
  let h = parseInt(match[1], 10);
  const m = match[2];
  const ampm = (match[3] || '').toUpperCase();
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${m}`;
}

export default function BusinessEditPlanPage() {
  const params = useParams();
  const router = useRouter();
  const planId = (params?.planId as string) || '';
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<ReturnType<typeof getWebUser>>(null);
  const [profile, setProfile] = useState<{ is_business?: boolean; business_id?: string } | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>(['']);
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [category, setCategory] = useState('');
  const [ticketsEnabled, setTicketsEnabled] = useState(false);
  const [passes, setPasses] = useState<{ pass_id?: string; name: string; price: number; mediaUrl?: string }[]>([{ name: '', price: 0 }]);
  const [womenOnly, setWomenOnly] = useState(false);
  const [allowGuestList, setAllowGuestList] = useState(true);
  const [additionalDetails, setAdditionalDetails] = useState<Array<{ detail_type: string; title: string; description: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const todayMin = (() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  })();

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
          const d = res.data as {
            title?: string;
            description?: string;
            location_text?: string;
            category_main?: string;
            is_women_only?: boolean;
            allow_view_guest_list?: boolean;
            date?: string;
            time?: string;
            media?: Array<{ url?: string }>;
            passes?: Array<{ pass_id: string; name: string; price: number; media?: Array<{ url?: string }> }>;
            add_details?: Array<{ detail_type?: string; title?: string; description?: string }>;
          };
          setTitle(d.title ?? '');
          setDescription(d.description ?? '');
          setLocation(d.location_text ?? '');
          setCategory(d.category_main ? d.category_main.charAt(0).toUpperCase() + d.category_main.slice(1) : '');
          setWomenOnly(!!d.is_women_only);
          setAllowGuestList(d.allow_view_guest_list !== false);
          if (d.date) setDate(new Date(d.date).toISOString().slice(0, 10));
          setTime(d.time ? timeTo24h(d.time) : '');
          if (d.media?.length) {
            setMediaUrls(d.media.map((m) => m.url ?? '').filter(Boolean).length ? d.media.map((m) => m.url ?? '') : ['']);
          }
          const hasPasses = !!(d.passes && d.passes.length > 0);
          setTicketsEnabled(hasPasses);
          setPasses(hasPasses
            ? d.passes!.map((p) => ({
                pass_id: p.pass_id,
                name: p.name ?? '',
                price: p.price ?? 0,
                mediaUrl: p.media?.[0]?.url ?? '',
              }))
            : [{ name: '', price: 0 }]);
          if (d.add_details?.length) {
            setAdditionalDetails(d.add_details.map((a) => ({
              detail_type: a.detail_type ?? 'distance',
              title: a.title ?? ADDITIONAL_DETAIL_OPTIONS.find((o) => o.id === a.detail_type)?.label ?? '',
              description: a.description ?? '',
            })));
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

  const addPass = () => setPasses((prev) => [...prev, { name: '', price: 0 }]);
  const updatePass = (i: number, field: 'name' | 'price' | 'mediaUrl', value: string | number) => {
    setPasses((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: field === 'price' ? Number(value) || 0 : value };
      return next;
    });
  };
  const removePass = (i: number) => setPasses((prev) => prev.filter((_, idx) => idx !== i));

  const addPostImage = () => setMediaUrls((prev) => [...prev, '']);
  const updatePostImageUrl = (i: number, url: string) => {
    setMediaUrls((prev) => {
      const next = [...prev];
      next[i] = url;
      return next;
    });
  };
  const removePostImage = (i: number) => {
    setMediaUrls((prev) => {
      const next = prev.filter((_, idx) => idx !== i);
      return next.length === 0 ? [''] : next;
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
    if (ticketsEnabled && passes.some((p) => !p.name.trim())) {
      setError('All ticket types need a name');
      return;
    }
    const additionalWithTypeButEmpty = additionalDetails.some(
      (d) => (d.detail_type || d.title.trim()) && !d.description?.trim()
    );
    if (additionalWithTypeButEmpty) {
      setError('Fill in the value for each additional detail (e.g. 5k for Distance).');
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
      const validMedia = mediaUrls.map((u) => u.trim()).filter(Boolean);
      if (validMedia.length > 0) {
        body.media = validMedia.map((url) => ({ url, type: 'image' }));
      }
      if (ticketsEnabled && passes.filter((p) => p.name.trim()).length > 0) {
        body.passes = passes.filter((p) => p.name.trim()).map((p) => ({
          pass_id: p.pass_id || `pass_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          name: p.name.trim(),
          price: p.price,
          description: '',
          capacity: 1,
          media: (p.mediaUrl?.trim() ? [{ url: p.mediaUrl.trim(), type: 'image' as const }] : undefined),
        }));
      } else {
        body.passes = [];
      }
      if (additionalDetails.filter((d) => d.detail_type || d.title.trim() || d.description.trim()).length > 0) {
        body.add_details = additionalDetails
          .filter((d) => d.detail_type || d.title.trim() || d.description.trim())
          .map((d) => {
            const opt = ADDITIONAL_DETAIL_OPTIONS.find((o) => o.id === d.detail_type);
            return {
              detail_type: d.detail_type || 'info',
              title: d.title.trim() || opt?.label || '',
              description: d.description.trim(),
            };
          });
      } else {
        body.add_details = [];
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
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F7]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700" />
      </div>
    );
  }
  if (!user?.user_id || !planId) return null;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F7]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E5E5EA] bg-[#F5F5F7] px-4 py-3 sm:px-6 md:px-8">
        <Link href="/clubs" className="text-[15px] text-neutral-700 hover:text-neutral-900 sm:text-base">← Back</Link>
        <h1 className="text-[17px] font-semibold text-[#1C1C1E] sm:text-lg">Edit Post</h1>
        <div className="w-10 sm:w-12" />
      </header>

      <form onSubmit={handleSubmit} className="mx-auto min-w-0 max-w-lg px-4 pb-28 pt-4 sm:px-6 sm:pb-32 sm:pt-6 md:px-8 md:pt-8">
        <section className="mb-3 rounded-2xl bg-[#EBEBED] p-3 sm:mb-4 sm:p-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl bg-transparent text-[20px] font-bold text-black placeholder:text-neutral-600 placeholder:opacity-100"
            placeholder="Title"
          />
        </section>

        <section className="mb-3 rounded-2xl bg-[#EBEBED] p-3 sm:mb-4 sm:p-4">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-xl bg-transparent text-[14px] text-black placeholder:text-neutral-600 placeholder:opacity-100"
            placeholder="Join the run club for another 5k..."
          />
        </section>

        <section className="mb-3 rounded-2xl bg-[#EBEBED] p-3 sm:mb-4 sm:p-4">
          <p className="mb-2 text-[14px] font-bold uppercase tracking-wide text-black">Post images</p>
          {mediaUrls.map((url, i) => (
            <div key={i} className="mb-3 flex flex-wrap items-start gap-2">
              {url.trim() ? (
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-neutral-200">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePostImage(i)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                    aria-label="Remove image"
                  >
                    ×
                  </button>
                </div>
              ) : null}
              <div className="min-w-0 flex-1 flex gap-2 items-center">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => updatePostImageUrl(i, e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-black placeholder:text-black"
                  placeholder="https://..."
                />
                {mediaUrls.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePostImage(i)}
                    className="shrink-0 rounded-full p-1.5 text-neutral-600 hover:bg-neutral-300 hover:text-black"
                    aria-label="Remove image"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          ))}
          <button type="button" onClick={addPostImage} className="text-sm font-semibold text-black">
            + Add another image
          </button>
        </section>

        <section className="mb-3 rounded-2xl bg-[#EBEBED] p-3 sm:mb-4 sm:p-4">
          <p className="mb-1.5 text-[14px] font-semibold text-black">Address</p>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full rounded-xl border border-[#E5E5EA] bg-white px-3 py-2.5 text-[15px] text-black placeholder:text-black"
            placeholder="Enter event address (e.g. venue name, street)"
          />
        </section>

        <section className="mb-3 rounded-2xl bg-[#EBEBED] p-3 sm:mb-4 sm:p-4">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <p className="mb-1 text-xs font-semibold text-black">Date</p>
              <input
                type="date"
                value={date}
                min={todayMin}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val && val < todayMin) return;
                  setDate(val);
                }}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-black [color-scheme:light]"
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold text-black">Time</p>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-black [color-scheme:light]"
              />
            </div>
          </div>
        </section>

        <section className="mb-3 rounded-2xl bg-[#EBEBED] p-3 sm:mb-4 sm:p-4">
          <p className="mb-2 text-[14px] font-bold uppercase tracking-wide text-black">Category</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`rounded-full px-5 py-2.5 text-[14px] font-semibold ${category === c ? 'bg-[#1C1C1E] text-white' : 'bg-[#E5E5E5] text-black'}`}
              >
                {c}
              </button>
            ))}
          </div>
        </section>

        <section className="mb-3 rounded-2xl bg-[#EBEBED] p-3 sm:mb-4 sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-[16px] font-semibold text-black">Tickets</span>
            <input type="checkbox" checked={ticketsEnabled} onChange={(e) => setTicketsEnabled(e.target.checked)} className="h-5 w-5 rounded" />
          </div>
          {ticketsEnabled && (
            <div className="mt-3 space-y-4">
              {passes.map((p, i) => (
                <div key={i} className="rounded-xl border border-[#E5E5EA] bg-white p-3 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) => updatePass(i, 'name', e.target.value)}
                      placeholder="Ticket name"
                      className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-[#F5F5F7] px-3 py-2 text-sm text-black placeholder:text-neutral-600 placeholder:opacity-100"
                    />
                    <div className="flex w-28 shrink-0 items-center gap-1 rounded-lg border border-neutral-200 bg-[#F5F5F7] px-2 py-1">
                      <input
                        type="number"
                        min={0}
                        value={p.price || ''}
                        onChange={(e) => updatePass(i, 'price', e.target.value)}
                        placeholder="Price"
                        className="w-14 border-0 bg-transparent text-sm text-black placeholder:text-neutral-600 placeholder:opacity-100"
                      />
                      {p.price === 0 && <span className="text-xs font-semibold text-black">Free</span>}
                    </div>
                    <button type="button" onClick={() => removePass(i)} className="shrink-0 text-black/70 hover:text-black" aria-label="Remove pass">×</button>
                  </div>
                  <div className="border-t border-[#E5E5EA] pt-2">
                    <p className="mb-1.5 text-xs font-semibold text-black">Ticket image (optional)</p>
                    <div className="flex flex-wrap items-start gap-2">
                      {(p.mediaUrl ?? '').trim() ? (
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-neutral-200">
                          <img src={p.mediaUrl} alt="" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => updatePass(i, 'mediaUrl', '')}
                            className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white text-sm hover:bg-black/80"
                            aria-label="Remove ticket image"
                          >
                            ×
                          </button>
                        </div>
                      ) : null}
                      <input
                        type="url"
                        value={p.mediaUrl ?? ''}
                        onChange={(e) => updatePass(i, 'mediaUrl', e.target.value)}
                        placeholder="https://... (optional)"
                        className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-[#F5F5F7] px-3 py-2 text-sm text-black placeholder:text-neutral-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={addPass} className="text-sm font-semibold text-black">+ Add ticket type</button>
            </div>
          )}
        </section>

        <section className="mb-3 rounded-2xl bg-[#EBEBED] p-3 sm:mb-4 sm:p-4">
          <p className="mb-2 text-[14px] font-bold uppercase tracking-wide text-black">Additional Details</p>
          {additionalDetails.map((d, i) => {
            const option = ADDITIONAL_DETAIL_OPTIONS.find((o) => o.id === (d.detail_type || 'distance'));
            return (
              <div key={i} className="mb-3 flex min-w-0 flex-wrap gap-2 sm:flex-nowrap">
                <select
                  value={d.detail_type || 'distance'}
                  onChange={(e) => {
                    const id = e.target.value;
                    const opt = ADDITIONAL_DETAIL_OPTIONS.find((o) => o.id === id);
                    const next = [...additionalDetails];
                    next[i] = { detail_type: id, title: opt?.label ?? '', description: next[i].description };
                    setAdditionalDetails(next);
                  }}
                  className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-black [color-scheme:light]"
                >
                  {ADDITIONAL_DETAIL_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={d.description}
                  onChange={(e) => {
                    const next = [...additionalDetails];
                    next[i] = { ...next[i], description: e.target.value };
                    setAdditionalDetails(next);
                  }}
                  placeholder={option?.placeholder ?? 'e.g. 5k'}
                  className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-black placeholder:text-black"
                />
                <button type="button" onClick={() => setAdditionalDetails((prev) => prev.filter((_, idx) => idx !== i))} className="shrink-0 text-black/70" aria-label="Remove row">×</button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => setAdditionalDetails((prev) => [...prev, { detail_type: 'distance', title: 'Distance', description: '' }])}
            className="text-sm font-semibold text-black"
          >
            + Add row
          </button>
        </section>

        <section className="mb-3 rounded-2xl bg-[#EBEBED] p-3 sm:mb-4 sm:p-4">
          <div className="py-2">
            <div className="flex items-center justify-between">
              <span className="text-[16px] font-semibold text-black">Women&apos;s only</span>
              <input type="checkbox" checked={womenOnly} onChange={(e) => setWomenOnly(e.target.checked)} className="h-5 w-5 rounded" />
            </div>
            {womenOnly && (
              <p className="mt-2 text-sm text-neutral-600">Only women can register for this event.</p>
            )}
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-[16px] font-semibold text-black">Allow viewing guest list</span>
            <input type="checkbox" checked={allowGuestList} onChange={(e) => setAllowGuestList(e.target.checked)} className="h-5 w-5 rounded" />
          </div>
        </section>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <div className="fixed bottom-0 left-0 right-0 flex justify-center border-t border-[#E5E5EA] bg-[#F5F5F7] p-4 sm:px-6 md:px-8">
          <button
            type="submit"
            disabled={submitting}
            className="w-full max-w-md rounded-full bg-[#1C1C1E] py-3 px-4 font-bold text-white disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
