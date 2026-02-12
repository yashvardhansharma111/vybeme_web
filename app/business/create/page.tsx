'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { getWebUser, getCurrentUserProfile, createBusinessPlan, createBusinessPlanWithFiles } from '@/lib/api';

const CATEGORIES = ['Running', 'Sports', 'Fitness/Training', 'Social/Community'];
const MAX_MEDIA = 5;

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
  const [additionalDetails, setAdditionalDetails] = useState<Array<{ detail_type: string; title: string; description: string }>>([]);

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
      if (additionalDetails.filter((d) => d.title.trim() || d.description.trim()).length > 0) {
        body.add_details = additionalDetails
          .filter((d) => d.title.trim() || d.description.trim())
          .map((d) => ({
            detail_type: d.detail_type || d.title.trim().toLowerCase().replace(/\s+/g, '_') || 'info',
            title: d.title.trim(),
            description: d.description.trim(),
          }));
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
        router.push(`/business?created=${res.data.post_id}`);
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
        <Link href="/business" className="text-neutral-900 text-[15px] sm:text-base">← Back</Link>
        <h1 className="text-[17px] font-semibold text-[#1C1C1E] sm:text-lg">Create Post</h1>
        <div className="w-10 sm:w-12" />
      </header>

      <form onSubmit={handleSubmit} className="mx-auto max-w-lg px-4 pb-28 pt-4 sm:px-6 sm:pb-32 sm:pt-6 md:px-8 md:pt-8">
        {/* Title first (app order) */}
        <section className="mb-3 rounded-2xl bg-[#EBEBED] p-4 sm:mb-4 sm:p-5">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl bg-transparent text-[20px] font-bold text-black placeholder:text-black/60"
            placeholder="Title"
          />
        </section>

        {/* Description (no limit) */}
        <section className="mb-3 rounded-2xl bg-[#EBEBED] p-4 sm:mb-4 sm:p-5">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full resize-none rounded-xl bg-transparent text-[14px] text-black placeholder:text-black/60"
            placeholder="Join the run club for another 5k..."
          />
        </section>

        {/* Post media upload */}
        <section className="mb-3 rounded-2xl bg-[#EBEBED] p-4 sm:mb-4 sm:p-5">
          <p className="mb-2 text-[14px] font-bold uppercase tracking-wide text-black">Post images</p>
          <div className="flex flex-wrap gap-2">
            {mediaFiles.map((file, i) => (
              <div key={i} className="relative">
                <div className="h-20 w-20 overflow-hidden rounded-xl bg-neutral-200">
                  <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
                </div>
                <button type="button" onClick={() => removeMediaFile(i)} className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white">×</button>
              </div>
            ))}
            {mediaFiles.length < MAX_MEDIA && (
              <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-[#E5E5E5] text-black/70">
                <input type="file" accept="image/*" multiple className="hidden" onChange={onPostMediaChange} />
                <span className="text-2xl">+</span>
              </label>
            )}
          </div>
          <p className="mt-2 text-xs text-black/70">Or paste image URL below</p>
          <input
            type="url"
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-black placeholder:text-black/60"
            placeholder="https://..."
          />
        </section>

        {/* Address */}
        <section className="mb-3 rounded-2xl bg-[#EBEBED] p-4 sm:mb-4 sm:p-5">
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full rounded-full bg-transparent px-4 py-3 text-[15px] text-black placeholder:text-black/60"
            placeholder="Bohemians Indiranagar, 1st Main"
          />
        </section>

        {/* Date & Time — no past dates; time numeric (e.g. 8:00 AM) */}
        <section className="mb-3 rounded-2xl bg-[#EBEBED] p-4 sm:mb-4 sm:p-5">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <input
              type="date"
              value={date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-black placeholder:text-black/60 [color-scheme:light]"
            />
            <input
              type="text"
              value={time}
              onChange={(e) => {
                const v = e.target.value;
                const cleaned = v
                  .split('')
                  .filter((c) => /[\d: AaPpMm]/.test(c))
                  .join('')
                  .slice(0, 12);
                setTime(cleaned);
              }}
              placeholder="8:00 AM"
              className="rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-black placeholder:text-black/60"
            />
          </div>
        </section>

        {/* Category */}
        <section className="mb-3 rounded-2xl bg-[#EBEBED] p-4 sm:mb-4 sm:p-5">
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
        <section className="mb-3 rounded-2xl bg-[#EBEBED] p-4 sm:mb-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-[16px] font-semibold text-black">Tickets</span>
            <input type="checkbox" checked={ticketsEnabled} onChange={(e) => setTicketsEnabled(e.target.checked)} className="h-5 w-5 rounded" />
          </div>
          {ticketsEnabled && (
            <div className="mt-3 space-y-2">
              {passes.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <input type="text" value={p.name} onChange={(e) => updatePass(i, 'name', e.target.value)} placeholder="Ticket name" className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-black placeholder:text-black/60" />
                  <div className="flex w-28 items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1">
                    <input type="number" min={0} value={p.price || ''} onChange={(e) => updatePass(i, 'price', e.target.value)} placeholder="Price" className="w-14 border-0 bg-transparent text-sm text-black placeholder:text-black/60" />
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

        {/* Additional Details */}
        <section className="mb-3 rounded-2xl bg-[#EBEBED] p-4 sm:mb-4 sm:p-5">
          <p className="mb-2 text-[14px] font-bold uppercase tracking-wide text-black">Additional Details</p>
          {additionalDetails.map((d, i) => (
            <div key={i} className="mb-3 flex gap-2">
              <input
                type="text"
                value={d.title}
                onChange={(e) => {
                  const next = [...additionalDetails];
                  next[i] = { ...next[i], title: e.target.value };
                  setAdditionalDetails(next);
                }}
                placeholder="Label (e.g. Distance)"
                className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-black placeholder:text-black/60"
              />
              <input
                type="text"
                value={d.description}
                onChange={(e) => {
                  const next = [...additionalDetails];
                  next[i] = { ...next[i], description: e.target.value };
                  setAdditionalDetails(next);
                }}
                placeholder="Value (e.g. 5k)"
                className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-black placeholder:text-black/60"
              />
              <button type="button" onClick={() => setAdditionalDetails((prev) => prev.filter((_, idx) => idx !== i))} className="text-black/70">×</button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setAdditionalDetails((prev) => [...prev, { detail_type: '', title: '', description: '' }])}
            className="text-sm font-semibold text-black"
          >
            + Add row
          </button>
        </section>

        {/* Toggles */}
        <section className="mb-3 rounded-2xl bg-[#EBEBED] p-4 sm:mb-4 sm:p-5">
          <div className="flex items-center justify-between py-2">
            <span className="text-[16px] font-semibold text-black">Women&apos;s only</span>
            <input type="checkbox" checked={womenOnly} onChange={(e) => setWomenOnly(e.target.checked)} className="h-5 w-5 rounded" />
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-[16px] font-semibold text-black">Allow viewing guest list</span>
            <input type="checkbox" checked={allowGuestList} onChange={(e) => setAllowGuestList(e.target.checked)} className="h-5 w-5 rounded" />
          </div>
        </section>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <div className="fixed bottom-0 left-0 right-0 flex flex-col gap-2 border-t border-[#E5E5EA] bg-[#F5F5F7] p-4 sm:flex-row sm:gap-3 sm:px-6 md:px-8">
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="order-2 rounded-full border-2 border-[#1C1C1E] bg-transparent py-3 px-6 font-bold text-[#1C1C1E] sm:order-1 sm:flex-1"
          >
            Preview
          </button>
          <button type="submit" disabled={submitting} className="order-1 rounded-full bg-[#1C1C1E] py-3 font-bold text-white disabled:opacity-50 sm:order-2 sm:flex-[2]">
            {submitting ? 'Creating…' : 'Post'}
          </button>
        </div>
      </form>

      {/* Preview modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowPreview(false)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-[#1C1C1E]">Preview</h2>
            <p className="mt-1 text-[20px] font-bold text-[#1C1C1E]">{title || 'Title'}</p>
            <p className="mt-2 text-sm text-[#444] whitespace-pre-wrap">{description || 'Description'}</p>
            {(mediaFiles[0] || mediaUrl) && (
              <div className="relative mt-3 aspect-video w-full overflow-hidden rounded-xl bg-neutral-200">
                {mediaFiles[0] ? (
                  <img src={URL.createObjectURL(mediaFiles[0])} alt="" className="h-full w-full object-cover" />
                ) : (
                  <img src={mediaUrl} alt="" className="h-full w-full object-cover" />
                )}
              </div>
            )}
            {location && <p className="mt-3 text-sm text-[#1C1C1E]"><span className="text-[#8E8E93]">Location:</span> {location}</p>}
            {(date || time) && <p className="mt-1 text-sm text-[#1C1C1E]"><span className="text-[#8E8E93]">When:</span> {date && new Date(date).toLocaleDateString()} {time && time}</p>}
            {category && <p className="mt-1 text-sm text-[#1C1C1E]"><span className="text-[#8E8E93]">Category:</span> {category}</p>}
            {ticketsEnabled && passes.filter((p) => p.name.trim()).length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-[#8E8E93]">Tickets</p>
                {passes.filter((p) => p.name.trim()).map((p, i) => (
                  <p key={i} className="mt-1 text-sm text-[#1C1C1E]">{p.name} — {p.price === 0 ? 'Free' : `₹${p.price}`}</p>
                ))}
              </div>
            )}
            <button type="button" onClick={() => setShowPreview(false)} className="mt-6 w-full rounded-full bg-[#1C1C1E] py-3 font-bold text-white">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
