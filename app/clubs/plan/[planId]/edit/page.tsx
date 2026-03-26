'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import FormBuilder, { type FormField } from '@/app/components/FormBuilder';
import { RegistrationFormPreview } from '@/app/components/RegistrationFormPreview';
import FormSelector from '@/app/components/FormSelector';
import { WekndLoadingScreen } from '@/app/components/WekndLoadingScreen';
import {
  getWebUser,
  getCurrentUserProfile,
  getBusinessPlanDetails,
  updateBusinessPlan,
  uploadImageFile,
  createForm,
  updateForm,
  getForm,
} from '@/lib/api';
import { FaFlagCheckered, FaMusic, FaBasketballBall, FaDumbbell, FaGlassCheers } from 'react-icons/fa';
import { FaPersonRunning } from 'react-icons/fa6';
import { IoMdShirt } from 'react-icons/io';
import { GiRunningShoe } from 'react-icons/gi';
import { MdFastfood } from 'react-icons/md';
import { PiLinkSimpleBold } from 'react-icons/pi';

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
  { id: 'strava_link', label: 'Strava Link', placeholder: 'https://www.strava.com/athletes/...' },
  { id: 'google_drive_link', label: 'Link for photos', placeholder: 'https://drive.google.com/...' },
  { id: 'additional_info', label: 'Additional Info', placeholder: 'Heading and description' },
];

const CATEGORY_ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  Running: FaPersonRunning,
  Sports: FaBasketballBall,
  'Fitness/Training': FaDumbbell,
  'Social/Community': FaGlassCheers,
};

const DETAIL_ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  distance: GiRunningShoe,
  starting_point: FaFlagCheckered,
  dress_code: IoMdShirt,
  music_type: FaMusic,
  parking: FaGlassCheers,
  'f&b': MdFastfood,
  links: PiLinkSimpleBold,
  strava_link: PiLinkSimpleBold,
  google_drive_link: PiLinkSimpleBold,
  additional_info: FaMusic,
};

function getCategoryIcon(category: string): ComponentType<{ className?: string }> {
  return CATEGORY_ICON_MAP[category] ?? FaMusic;
}

function getDetailIcon(detailType: string): ComponentType<{ className?: string }> {
  return DETAIL_ICON_MAP[detailType] ?? FaMusic;
}

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
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);
  const postImagesFileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaFilesRef = useRef<(File | null)[]>([null]);
  const [mediaUrls, setMediaUrls] = useState<string[]>(['']);
  const [mediaFiles, setMediaFiles] = useState<(File | null)[]>([null]);

  const DESCRIPTION_LINE_HEIGHT_PX = 20;
  const DESCRIPTION_MIN_LINES = 3;
  const DESCRIPTION_MAX_LINES = 6;
  const descriptionMinHeight = DESCRIPTION_LINE_HEIGHT_PX * DESCRIPTION_MIN_LINES;
  const descriptionMaxHeight = DESCRIPTION_LINE_HEIGHT_PX * DESCRIPTION_MAX_LINES;
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [category, setCategory] = useState('');
  const [ticketsEnabled, setTicketsEnabled] = useState(false);
  const [passes, setPasses] = useState<{ pass_id?: string; name: string; price: number; mediaUrl?: string; mediaFile?: File | null }[]>([{ name: '', price: 0 }]);
  const [registrationRequired, setRegistrationRequired] = useState(false);
  const [formId, setFormId] = useState<string | null>(null);
  const [showFormSelector, setShowFormSelector] = useState(false);
  const [showFormBuilder, setShowFormBuilder] = useState(false);
  const [formBuilderMountKey, setFormBuilderMountKey] = useState(0);
  const [formBuilderInitialFields, setFormBuilderInitialFields] = useState<FormField[]>([]);
  const [formBuilderInitialTitle, setFormBuilderInitialTitle] = useState('');
  const [formBuilderInitialDescription, setFormBuilderInitialDescription] = useState('');
  const [formBuilderMode, setFormBuilderMode] = useState<'create' | 'edit'>('create');
  const [formPreviewTick, setFormPreviewTick] = useState(0);
  const [savingForm, setSavingForm] = useState(false);
  const [womenOnly, setWomenOnly] = useState(false);
  const [allowGuestList, setAllowGuestList] = useState(true);
  const [additionalDetails, setAdditionalDetails] = useState<Array<{ detail_type: string; title: string; description: string }>>([]);

  const [limitRegistrationEnabled, setLimitRegistrationEnabled] = useState(false);
  const [registrationLimit, setRegistrationLimit] = useState('');

  // strip strava detail if category is changed away
  useEffect(() => {
    if (category !== 'Running') {
      setAdditionalDetails((prev) => prev.filter((d) => d.detail_type !== 'strava_link'));
    }
  }, [category]);

  useEffect(() => {
    if (formId) setRegistrationRequired(true);
  }, [formId]);

  useEffect(() => {
    mediaFilesRef.current = mediaFiles;
  }, [mediaFiles]);

  useEffect(() => {
    const el = descriptionRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const nextHeight = Math.min(el.scrollHeight, descriptionMaxHeight);
    el.style.height = `${Math.max(descriptionMinHeight, nextHeight)}px`;
  }, [description, descriptionMaxHeight, descriptionMinHeight]);

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
            registration_limit?: number | null;
            form_id?: string | null;
            registration_required?: boolean;
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
            const urls = d.media.map((m) => m.url ?? '').filter(Boolean).length ? d.media.map((m) => m.url ?? '') : [''];
            setMediaUrls(urls);
            setMediaFiles(urls.map(() => null));
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

          if (d.registration_limit != null && Number(d.registration_limit) > 0) {
            setLimitRegistrationEnabled(true);
            setRegistrationLimit(String(d.registration_limit));
          } else {
            setLimitRegistrationEnabled(false);
            setRegistrationLimit('');
          }
          if (d.form_id) {
            setFormId(String(d.form_id));
          } else {
            setFormId(null);
          }
          setRegistrationRequired(!!d.registration_required || !!d.form_id);
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
  const updatePass = (i: number, field: 'name' | 'price' | 'mediaUrl' | 'mediaFile', value: string | number | File | null) => {
    setPasses((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: field === 'price' ? Number(value) || 0 : value };
      return next;
    });
  };
  const removePass = (i: number) => setPasses((prev) => prev.filter((_, idx) => idx !== i));

  const postMediaFilledCount = (urls: string[], files: (File | null)[]) =>
    urls.reduce((n, url, i) => n + ((url?.trim() || files[i]) ? 1 : 0), 0);

  const onPostMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (!picked.length) return;
    setMediaUrls((prevU) => {
      const prevF = mediaFilesRef.current;
      let room = MAX_MEDIA - postMediaFilledCount(prevU, prevF);
      const nu = [...prevU];
      const nf = [...prevF];
      for (const file of picked) {
        if (room <= 0) break;
        nu.push('');
        nf.push(file);
        room--;
      }
      setMediaFiles(nf);
      return nu;
    });
  };

  const removePostImage = (i: number) => {
    setMediaUrls((prevU) => {
      const prevF = mediaFilesRef.current;
      let nextU = prevU.filter((_, idx) => idx !== i);
      let nextF = prevF.filter((_, idx) => idx !== i);
      if (nextU.length === 0) {
        nextU = [''];
        nextF = [null];
      }
      setMediaFiles(nextF);
      return nextU;
    });
  };

  const handleFormSelectorSelect = (selectedFormId: string) => {
    setFormId(selectedFormId);
    setShowFormSelector(false);
    setFormPreviewTick((t) => t + 1);
  };

  const openFormBuilderNew = () => {
    setFormBuilderMode('create');
    setFormBuilderInitialFields([]);
    setFormBuilderInitialTitle('');
    setFormBuilderInitialDescription('');
    setFormBuilderMountKey((k) => k + 1);
    setShowFormBuilder(true);
  };

  const openFormBuilderEdit = async () => {
    if (!formId) {
      openFormBuilderNew();
      return;
    }
    setFormBuilderMode('edit');
    try {
      const res = await getForm(formId);
      const raw = res.success && res.data && Array.isArray((res.data as { fields?: FormField[] }).fields)
        ? (res.data as { fields: FormField[] }).fields
        : [];
      setFormBuilderInitialFields(raw);
      setFormBuilderInitialTitle(String((res.data as { title?: string; name?: string } | undefined)?.title ?? (res.data as { title?: string; name?: string } | undefined)?.name ?? ''));
      setFormBuilderInitialDescription(String((res.data as { description?: string } | undefined)?.description ?? ''));
    } catch {
      setFormBuilderInitialFields([]);
      setFormBuilderInitialTitle('');
      setFormBuilderInitialDescription('');
    }
    setFormBuilderMountKey((k) => k + 1);
    setShowFormBuilder(true);
  };

  const handleFormBuilderSave = async ({ title: formTitle, description: formDescription, fields }: { title: string; description: string; fields: FormField[] }) => {
    if (!user?.user_id) {
      setError('User ID not available');
      return;
    }
    setSavingForm(true);
    try {
      if (formBuilderMode === 'edit' && formId) {
        const res = await updateForm(formId, {
          title: formTitle,
          name: formTitle || `Form ${new Date().toLocaleDateString()}`,
          description: formDescription,
          fields,
        });
        if (res.success) {
          setShowFormBuilder(false);
          setFormPreviewTick((t) => t + 1);
          setError(null);
        } else {
          setError('Failed to update form');
        }
      } else {
        const res = await createForm({
          user_id: user.user_id,
          title: formTitle,
          name: formTitle || `Form ${new Date().toLocaleDateString()}`,
          description: formDescription,
          fields,
        });
        if (res.success && res.data?.form_id) {
          setFormId(res.data.form_id);
          setShowFormBuilder(false);
          setFormPreviewTick((t) => t + 1);
          setError(null);
        } else {
          setError('Failed to create form');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save form');
    } finally {
      setSavingForm(false);
    }
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

      if (limitRegistrationEnabled && registrationLimit) {
        const n = parseInt(registrationLimit, 10);
        if (!Number.isNaN(n) && n > 0) body.registration_limit = n;
      } else {
        // allow clearing the limit on edit
        body.registration_limit = null;
      }
      const resolvedMediaUrls: string[] = [];
      for (let i = 0; i < mediaUrls.length; i++) {
        const file = mediaFiles[i];
        if (file) {
          const url = await uploadImageFile(file);
          resolvedMediaUrls.push(url);
        } else {
          const u = mediaUrls[i]?.trim();
          if (u) resolvedMediaUrls.push(u);
        }
      }
      if (resolvedMediaUrls.length > 0) {
        body.media = resolvedMediaUrls.map((url) => ({ url, type: 'image' }));
      }
      if (ticketsEnabled && passes.filter((p) => p.name.trim()).length > 0) {
        body.passes = await Promise.all(
          passes.filter((p) => p.name.trim()).map(async (p) => {
            let mediaUrl = p.mediaUrl?.trim();
            if (p.mediaFile) {
              mediaUrl = await uploadImageFile(p.mediaFile);
            }
            return {
              pass_id: p.pass_id || `pass_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
              name: p.name.trim(),
              price: p.price,
              description: '',
              capacity: 1,
              media: mediaUrl ? [{ url: mediaUrl, type: 'image' as const }] : undefined,
            };
          })
        );
        body.registration_required = registrationRequired;
      } else {
        body.passes = [];
        body.registration_required = registrationRequired || !!formId;
      }
      if (formId) {
        body.form_id = formId;
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
    return <WekndLoadingScreen />;
  }
  if (!user?.user_id || !planId) return null;

  if (loading) {
    return <WekndLoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E5E5EA] bg-[#F5F5F7] px-4 py-3 sm:px-6 md:px-8">
        <Link href="/clubs" className="text-[15px] text-neutral-900 sm:text-base">← Back</Link>
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
            ref={descriptionRef}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{ minHeight: descriptionMinHeight, maxHeight: descriptionMaxHeight }}
            className="w-full resize-none overflow-y-auto rounded-xl bg-transparent text-[14px] leading-[20px] text-black placeholder:text-neutral-600 placeholder:opacity-100"
            placeholder="Join the run club for another 5k..."
          />
        </section>

        <section className="mb-3 rounded-2xl bg-[#EBEBED] p-3 sm:mb-4 sm:p-4">
          <p className="mb-2 text-[14px] font-bold uppercase tracking-wide text-black">Post images</p>
          <input
            ref={postImagesFileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={onPostMediaChange}
            className="sr-only"
            aria-label="Choose images to upload"
          />
          <div className="flex flex-wrap items-center gap-2">
            {mediaUrls.map((url, i) => {
              const file = mediaFiles[i] ?? null;
              if (!url.trim() && !file) return null;
              const previewSrc = file ? URL.createObjectURL(file) : url.trim();
              return (
                <div key={`post-slot-${i}`} className="relative">
                  <div className="h-20 w-20 overflow-hidden rounded-xl bg-neutral-200">
                    <img src={previewSrc} alt="" className="h-full w-full object-cover" />
                  </div>
                  <button
                    type="button"
                    onClick={() => removePostImage(i)}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
                    aria-label="Remove image"
                  >
                    ×
                  </button>
                </div>
              );
            })}
            {postMediaFilledCount(mediaUrls, mediaFiles) < MAX_MEDIA && (
              <>
                <button
                  type="button"
                  onClick={() => postImagesFileInputRef.current?.click()}
                  className="flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-[#E5E5E5] text-black/70 hover:border-[#1C1C1E] hover:bg-black/5 hover:text-black"
                  aria-label="Add image"
                />
                <button
                  type="button"
                  onClick={() => postImagesFileInputRef.current?.click()}
                  className="rounded-lg border border-[#1C1C1E] bg-white px-4 py-2 text-sm font-semibold text-[#1C1C1E] hover:bg-[#1C1C1E] hover:text-white"
                >
                  Upload images
                </button>
              </>
            )}
          </div>
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
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-semibold ${
                  category === c ? 'bg-[#1C1C1E] text-white' : 'bg-[#E5E5E5] text-black'
                }`}
              >
                {(() => {
                  const Icon = getCategoryIcon(c);
                  return <Icon className="h-4 w-4 shrink-0" aria-hidden />;
                })()}
                <span>{c}</span>
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
            <div className="mt-3 space-y-2">
              {passes.map((p, i) => {
                const ticketUrl = (p.mediaUrl ?? '').trim();
                const ticketFile = p.mediaFile ?? null;
                const ticketPreview = ticketFile ? URL.createObjectURL(ticketFile) : (ticketUrl || null);
                return (
                  <div key={i} className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={p.name}
                        onChange={(e) => updatePass(i, 'name', e.target.value)}
                        placeholder="Ticket name"
                        className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-black placeholder:text-neutral-600 placeholder:opacity-100"
                      />
                      <div className="flex w-28 shrink-0 items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1">
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
                      <button type="button" onClick={() => removePass(i)} className="text-black/70" aria-label="Remove pass">
                        ×
                      </button>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-semibold text-black">Ticket image (optional)</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {ticketPreview ? (
                          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-neutral-200">
                            <img src={ticketPreview} alt="" className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => {
                                updatePass(i, 'mediaUrl', '');
                                updatePass(i, 'mediaFile', null);
                              }}
                              className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white hover:bg-black/80"
                              aria-label="Remove ticket image"
                            >
                              ×
                            </button>
                          </div>
                        ) : null}
                        <label className="flex min-w-0 cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-black">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) updatePass(i, 'mediaFile', f);
                              e.target.value = '';
                            }}
                          />
                          {ticketFile ? ticketFile.name : ticketUrl ? 'Replace image' : 'Choose image'}
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}
              <button type="button" onClick={addPass} className="text-sm font-semibold text-black">
                + Add type
              </button>
            </div>
          )}
        </section>

        <section className="mb-3 rounded-2xl bg-[#EBEBED] p-3 sm:mb-4 sm:p-4">
          <p className="mb-2 text-[14px] font-bold uppercase tracking-wide text-black">Additional Info</p>
          {additionalDetails.map((d, i) => {
            const detailType = d.detail_type || 'distance';
            const option = ADDITIONAL_DETAIL_OPTIONS.find((o) => o.id === detailType);
            const Icon = getDetailIcon(detailType);
            const isAdditionalInfo = detailType === 'additional_info';
            return (
              <div
                key={i}
                className="mb-3 grid grid-cols-[42px_1fr_auto] items-start gap-2 rounded-2xl bg-[#E5E5EA] p-2.5"
              >
                <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-white/60">
                  <Icon className="h-5 w-5 text-[#1C1C1E]" aria-hidden />
                </div>

                <div className="flex flex-col gap-2">
                  <select
                    value={detailType}
                    onChange={(e) => {
                      const id = e.target.value;
                      const opt = ADDITIONAL_DETAIL_OPTIONS.find((o) => o.id === id);
                      const next = [...additionalDetails];
                      next[i] = {
                        detail_type: id,
                        title: id === 'additional_info' ? '' : (opt?.label ?? ''),
                        description: next[i].description,
                      };
                      setAdditionalDetails(next);
                    }}
                    className="min-w-0 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-black [color-scheme:light]"
                  >
                    {(category === 'Running'
                      ? ADDITIONAL_DETAIL_OPTIONS
                      : ADDITIONAL_DETAIL_OPTIONS.filter((o) => o.id !== 'strava_link')
                    ).map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>

                  {isAdditionalInfo ? (
                    <>
                      <input
                        type="text"
                        value={d.title}
                        onChange={(e) => {
                          const next = [...additionalDetails];
                          next[i] = { ...next[i], title: e.target.value };
                          setAdditionalDetails(next);
                        }}
                        placeholder="Heading"
                        className="min-w-0 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-black placeholder:text-neutral-600"
                      />
                      <input
                        type="text"
                        value={d.description}
                        onChange={(e) => {
                          const next = [...additionalDetails];
                          next[i] = { ...next[i], description: e.target.value };
                          setAdditionalDetails(next);
                        }}
                        placeholder="Description"
                        className="min-w-0 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-black placeholder:text-neutral-600"
                      />
                    </>
                  ) : (
                    <input
                      type="text"
                      value={d.description}
                      onChange={(e) => {
                        const next = [...additionalDetails];
                        next[i] = { ...next[i], description: e.target.value };
                        setAdditionalDetails(next);
                      }}
                      placeholder={option?.placeholder ?? 'e.g. 5k'}
                      className="min-w-0 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-black placeholder:text-black"
                    />
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setAdditionalDetails((prev) => prev.filter((_, idx) => idx !== i))}
                  className="shrink-0 text-black/70"
                  aria-label="Remove row"
                >
                  ×
                </button>
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

        {/* Toggles — same order as create; limit registration last */}
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
          <div className="flex items-center justify-between py-2">
            <span className="text-[16px] font-semibold text-black">Require registration</span>
            <input
              type="checkbox"
              checked={registrationRequired}
              onChange={(e) => setRegistrationRequired(e.target.checked)}
              className="h-5 w-5 rounded"
            />
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-[16px] font-semibold text-black">Registration form</span>
            <button
              type="button"
              onClick={() => setShowFormSelector(true)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                formId ? 'bg-green-100 text-green-700' : 'bg-neutral-300 text-neutral-600 hover:bg-neutral-400'
              }`}
            >
              {formId ? 'Change form' : 'Add'}
            </button>
          </div>
          {formId ? (
            <div className="mt-2 space-y-2">
              <p className="text-sm text-neutral-600">
                Attendees will see this form after they choose a ticket (or right away if there are no tickets).
              </p>
              <RegistrationFormPreview formId={formId} refreshKey={formPreviewTick} />
              <button
                type="button"
                onClick={() => void openFormBuilderEdit()}
                className="text-sm font-semibold text-[#1C1C1E] underline"
              >
                Edit form questions
              </button>
            </div>
          ) : null}
          <div className="flex items-center justify-between py-2">
            <div>
              <span className="text-[16px] font-semibold text-black">Limit Registration</span>
              {limitRegistrationEnabled && (
                <p className="mt-2 text-sm text-neutral-600">Maximum number of attendees allowed to register for this event.</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={limitRegistrationEnabled}
                onChange={(e) => {
                  const on = e.target.checked;
                  setLimitRegistrationEnabled(on);
                  if (!on) setRegistrationLimit('');
                }}
                className="h-5 w-5 rounded"
              />
              {limitRegistrationEnabled && (
                <input
                  type="number"
                  min={1}
                  value={registrationLimit}
                  onChange={(e) => setRegistrationLimit(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Max attendees"
                  className="ml-2 w-28 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-black"
                />
              )}
            </div>
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

      {showFormSelector && user?.user_id ? (
        <FormSelector
          userId={user.user_id}
          onSelect={handleFormSelectorSelect}
          onCreateNew={() => {
            setShowFormSelector(false);
            openFormBuilderNew();
          }}
          onCancel={() => setShowFormSelector(false)}
          loading={savingForm}
        />
      ) : null}

      {showFormBuilder ? (
        <FormBuilder
          key={formBuilderMountKey}
          initialFields={formBuilderInitialFields}
          initialTitle={formBuilderInitialTitle}
          initialDescription={formBuilderInitialDescription}
          onSave={handleFormBuilderSave}
          onCancel={() => setShowFormBuilder(false)}
          loading={savingForm}
        />
      ) : null}
    </div>
  );
}
