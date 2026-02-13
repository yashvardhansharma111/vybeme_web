'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ShareMenu } from '@/app/components/ShareMenu';
import { getWebUser, getCurrentUserProfile, createBusinessPlan, createBusinessPlanWithFiles } from '@/lib/api';

const CATEGORIES = ['Running', 'Sports', 'Fitness/Training', 'Social/Community'];
const MAX_MEDIA = 5;

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

export default function BusinessCreatePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<ReturnType<typeof getWebUser>>(null);
  const [profile, setProfile] = useState<{ is_business?: boolean; business_id?: string } | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [ticketImageFile, setTicketImageFile] = useState<File | null>(null);
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
  const [showPreview, setShowPreview] = useState(false);
  const [planLivePostId, setPlanLivePostId] = useState<string | null>(null);
  const [additionalDetails, setAdditionalDetails] = useState<Array<{ detail_type: string; title: string; description: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Min date for event: today (local), so only future dates can be selected
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
    if (!mounted) return;
    if (!user?.user_id) router.replace('/login');
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

  const onPostMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    setMediaFiles((prev) => [...prev, ...files].slice(0, MAX_MEDIA));
    e.target.value = '';
  };
  const removeMediaFile = (i: number) => setMediaFiles((prev) => prev.filter((_, idx) => idx !== i));
  const onTicketImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTicketImageFile(e.target.files?.[0] ?? null);
    e.target.value = '';
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
    if (!user?.user_id || !profile?.is_business) {
      setError('Business account required');
      return;
    }
    setSubmitting(true);
    try {
      const businessId = profile.business_id || user.user_id;
      const body: Record<string, unknown> = {
        user_id: user.user_id,
        business_id: businessId,
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
      if (mediaUrl.trim() && mediaFiles.length === 0) {
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
      if (additionalDetails.filter((d) => d.detail_type || d.title.trim() || d.description.trim()).length > 0) {
        body.add_details = additionalDetails
          .filter((d) => d.detail_type || d.title.trim() || d.description.trim())
          .map((d) => {
            const opt = ADDITIONAL_DETAIL_OPTIONS.find((o) => o.id === d.detail_type);
            return {
              detail_type: d.detail_type || d.title.trim().toLowerCase().replace(/\s+/g, '_') || 'info',
              title: d.title.trim() || opt?.label || '',
              description: d.description.trim(),
            };
          });
      }

      const hasFiles = mediaFiles.length > 0 || ticketImageFile !== null;
      let res: { success?: boolean; data?: { post_id?: string }; message?: string };

      if (hasFiles) {
        const formData = new FormData();
        mediaFiles.forEach((file) => formData.append('files', file));
        if (ticketImageFile) formData.append('ticket_image', ticketImageFile);
        Object.entries(body).forEach(([k, v]) => {
          if (v !== undefined && v !== null)
            formData.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
        });
        res = await createBusinessPlanWithFiles(formData);
      } else {
        res = await createBusinessPlan(body);
      }

      if (res.success && res.data?.post_id) {
        setPlanLivePostId(res.data.post_id);
        return;
      }
      setError(res?.message || 'Failed to create post');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
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
  if (!user?.user_id) return null;

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E5E5EA] bg-[#F5F5F7] px-4 py-3 sm:px-6 md:px-8">
        <Link href="/clubs" className="text-neutral-900 text-[15px] sm:text-base">← Back</Link>
        <h1 className="text-[17px] font-semibold text-[#1C1C1E] sm:text-lg">Create Post</h1>
        <div className="w-10 sm:w-12" />
      </header>

      <form onSubmit={handleSubmit} className="mx-auto min-w-0 max-w-lg px-4 pb-28 pt-4 sm:px-6 sm:pb-32 sm:pt-6 md:px-8 md:pt-8">
        {/* Title first (app order) */}
        <section className="mb-3 rounded-2xl bg-[#EBEBED] p-3 sm:mb-4 sm:p-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl bg-transparent text-[20px] font-bold text-black placeholder:text-neutral-600 placeholder:opacity-100"
            placeholder="Title"
          />
        </section>

        {/* Description (no limit) */}
        <section className="mb-3 rounded-2xl bg-[#EBEBED] p-3 sm:mb-4 sm:p-4">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-xl bg-transparent text-[14px] text-black placeholder:text-neutral-600 placeholder:opacity-100"
            placeholder="Join the run club for another 5k..."
          />
        </section>

        {/* Post media upload — upload from device or paste URL */}
        <section className="mb-3 rounded-2xl bg-[#EBEBED] p-3 sm:mb-4 sm:p-4">
          <p className="mb-2 text-[14px] font-bold uppercase tracking-wide text-black">Post images</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={onPostMediaChange}
            className="sr-only"
            aria-label="Choose images to upload"
          />
          <div className="flex flex-wrap items-center gap-2">
            {mediaFiles.map((file, i) => (
              <div key={i} className="relative">
                <div className="h-20 w-20 overflow-hidden rounded-xl bg-neutral-200">
                  <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
                </div>
                <button type="button" onClick={() => removeMediaFile(i)} className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white">×</button>
              </div>
            ))}
            {mediaFiles.length < MAX_MEDIA && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-[#E5E5E5] text-black/70 hover:border-[#1C1C1E] hover:bg-black/5 hover:text-black"
                  aria-label="Add image"
                >
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg border border-[#1C1C1E] bg-white px-4 py-2 text-sm font-semibold text-[#1C1C1E] hover:bg-[#1C1C1E] hover:text-white"
                >
                  Upload images
                </button>
              </>
            )}
          </div>
          <p className="mt-2 text-xs text-black/70">Or paste image URL below</p>
          <input
            type="url"
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-black placeholder:text-neutral-600 placeholder:opacity-100"
            placeholder="https://..."
          />
        </section>

        {/* Address */}
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

        {/* Date & Time — date picker only; time placeholder black */}
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

        {/* Category */}
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

        {/* Tickets */}
        <section className="mb-3 rounded-2xl bg-[#EBEBED] p-3 sm:mb-4 sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-[16px] font-semibold text-black">Tickets</span>
            <input type="checkbox" checked={ticketsEnabled} onChange={(e) => setTicketsEnabled(e.target.checked)} className="h-5 w-5 rounded" />
          </div>
          {ticketsEnabled && (
            <div className="mt-3 space-y-2">
              {passes.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <input type="text" value={p.name} onChange={(e) => updatePass(i, 'name', e.target.value)} placeholder="Ticket name" className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-black placeholder:text-neutral-600 placeholder:opacity-100" />
                  <div className="flex w-28 shrink-0 items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1">
                    <input type="number" min={0} value={p.price || ''} onChange={(e) => updatePass(i, 'price', e.target.value)} placeholder="Price" className="w-14 border-0 bg-transparent text-sm text-black placeholder:text-neutral-600 placeholder:opacity-100" />
                    {p.price === 0 && <span className="text-xs font-semibold text-black">Free</span>}
                  </div>
                  <button type="button" onClick={() => removePass(i)} className="text-black/70">×</button>
                </div>
              ))}
              <button type="button" onClick={addPass} className="text-sm font-semibold text-black">+ Add type</button>
              <div className="mt-2">
                <p className="mb-1 text-xs font-semibold text-black">Ticket image (optional)</p>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-black">
                  <input type="file" accept="image/*" className="hidden" onChange={onTicketImageChange} />
                  {ticketImageFile ? ticketImageFile.name : 'Choose image'}
                </label>
              </div>
            </div>
          )}
        </section>

        {/* Additional Details — distance default; no label dropdown text */}
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

        {/* Toggles */}
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

        <div className="fixed bottom-0 left-0 right-0 flex flex-row items-center justify-center gap-3 border-t border-[#E5E5EA] bg-[#F5F5F7] p-4 sm:gap-4 sm:px-6 md:px-8">
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="flex-1 rounded-full border-2 border-[#1C1C1E] bg-transparent py-3 px-4 font-bold text-[#1C1C1E] sm:max-w-[180px]"
          >
            Preview
          </button>
          <button type="submit" disabled={submitting} className="flex-1 rounded-full bg-[#1C1C1E] py-3 px-4 font-bold text-white disabled:opacity-50 sm:max-w-[200px]">
            {submitting ? 'Creating…' : 'Post'}
          </button>
        </div>
      </form>

      {/* Preview modal — full-screen, as users will see */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white" role="dialog" aria-modal="true" aria-label="Preview">
          <div className="flex shrink-0 items-center justify-between border-b border-[#E5E5EA] bg-[#F5F5F7] px-4 py-3">
            <span className="text-sm font-medium text-[#8E8E93]">Preview — as users will see</span>
            <button type="button" onClick={() => setShowPreview(false)} className="rounded-full p-2 text-[#1C1C1E] hover:bg-black/10" aria-label="Close">×</button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-md pb-12">
              {/* Hero image */}
              <div className="relative aspect-[4/3] w-full bg-[#E5E5EA]">
                {(mediaFiles[0] || mediaUrl) ? (
                  mediaFiles[0] ? (
                    <img src={URL.createObjectURL(mediaFiles[0])} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <img src={mediaUrl} alt="" className="h-full w-full object-cover" />
                  )
                ) : (
                  <div className="flex h-full items-center justify-center text-[#8E8E93]">
                    <span className="text-sm">No image</span>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                  <h1 className="text-xl font-extrabold text-white">{title || 'Title'}</h1>
                  {(date || time) && <p className="mt-1 text-sm text-white/90">{date && new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} {time && time}</p>}
                </div>
              </div>
              <div className="-mt-6 rounded-t-[24px] bg-white px-5 pb-10 pt-6 shadow-lg">
                <p className="text-sm leading-relaxed text-[#444] whitespace-pre-wrap">{description || 'Description'}</p>
                {location && (
                  <div className="mt-4 rounded-[14px] bg-[#F2F2F7] p-3.5">
                    <p className="text-sm font-semibold text-[#1C1C1E]">📍 {location}</p>
                  </div>
                )}
                {(date || time) && (
                  <div className="mt-3 rounded-[14px] bg-[#F2F2F7] p-3.5">
                    <p className="text-sm font-semibold text-[#1C1C1E]">📅 {date && new Date(date).toLocaleDateString()} {time && time}</p>
                  </div>
                )}
                {category && <p className="mt-3 text-sm text-[#1C1C1E]"><span className="text-[#8E8E93]">Category:</span> {category}</p>}
                {additionalDetails.filter((d) => d.title || d.description).length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2.5">
                    {additionalDetails.filter((d) => d.title || d.description).map((d, i) => (
                      <div key={i} className="min-w-[47%] flex-1 rounded-xl bg-[#F2F2F7] px-3 py-2.5">
                        <p className="text-xs font-semibold text-[#8E8E93]">{d.title || 'Detail'}</p>
                        {d.description && <p className="mt-1 text-sm font-semibold text-[#1C1C1E] whitespace-pre-line">{d.description}</p>}
                      </div>
                    ))}
                  </div>
                )}
                {ticketsEnabled && passes.filter((p) => p.name.trim()).length > 0 && (
                  <div className="mt-6">
                    <h2 className="mb-3.5 text-lg font-extrabold text-[#1C1C1E]">Select Tickets</h2>
                    <div className="space-y-3">
                      {passes.filter((p) => p.name.trim()).map((p, i) => (
                        <div key={i} className="rounded-2xl bg-[#E5E5EA] px-4 py-4 flex items-center justify-between">
                          <p className="text-base font-bold text-[#1C1C1E]">{p.name}</p>
                          <p className="text-lg font-extrabold text-[#1C1C1E]">{p.price === 0 ? 'Free' : `₹${p.price}`}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-6 rounded-[25px] bg-[#1C1C1E] py-4 text-center text-base font-bold text-white">
                  Book Event
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plan Live popup — after create success */}
      {planLivePostId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Plan is live">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <p className="text-2xl font-bold text-[#1C1C1E]">Plan is live!</p>
              <p className="mt-2 text-sm text-neutral-600">Your event is published. Share it or view as a user would see it.</p>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <div className="w-full">
                <ShareMenu
                  postId={planLivePostId}
                  title={title || 'Event'}
                  className="block w-full"
                >
                  <button
                    type="button"
                    className="w-full rounded-full border-2 border-[#1C1C1E] bg-white py-3 font-bold text-[#1C1C1E]"
                  >
                    Share
                  </button>
                </ShareMenu>
              </div>
              <Link
                href={`/post/${planLivePostId}`}
                className="flex w-full items-center justify-center rounded-full bg-[#1C1C1E] py-3 font-bold text-white no-underline"
                onClick={() => setPlanLivePostId(null)}
              >
                Go to Plan
              </Link>
              <button
                type="button"
                onClick={() => { setPlanLivePostId(null); router.push('/clubs'); }}
                className="w-full py-2 text-sm font-medium text-neutral-500 hover:text-neutral-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
