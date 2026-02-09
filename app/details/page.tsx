'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppHeader } from '../components/AppHeader';
import { updateProfile, getWebUser } from '@/lib/api';

// Backend User model expects enum: ['male', 'female', 'other'] (lowercase)
const GENDERS: { value: string; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

function DetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const user = getWebUser();
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.session_id) {
      setError('Session expired. Please log in again.');
      return;
    }
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await updateProfile(user.session_id, {
        name: name.trim(),
        gender: gender || undefined,
      });
      if (res.success) {
        router.push(redirect);
        return;
      }
      setError(res.message || 'Failed to save');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-100/80 to-neutral-900 md:bg-neutral-200">
        <AppHeader />
        <div className="flex min-h-[50vh] items-center justify-center p-4">
          <p className="text-neutral-500">Please log in first.</p>
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="ml-2 text-black underline"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-100/80 to-neutral-900 md:bg-neutral-200">
      <AppHeader />
      <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-md flex-col items-center justify-center p-6 md:py-12">
        <div className="w-full rounded-2xl bg-white p-6 shadow-lg md:shadow-xl">
          <h1 className="text-center text-xl font-semibold text-neutral-900">
            Enter Your Details
          </h1>
          <form onSubmit={handleSubmit} className="mt-6">
            <label className="block text-sm font-medium text-neutral-600">
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your Name"
              className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
              autoComplete="name"
            />
            <label className="mt-4 block text-sm font-medium text-neutral-600">
              Gender
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-900 focus:border-neutral-400 focus:outline-none"
            >
              <option value="">Gender</option>
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-xl bg-black py-3 font-medium text-white disabled:opacity-60"
            >
              Done
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function DetailsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-rose-100/80 to-neutral-900">
        <AppHeader />
        <div className="flex min-h-[50vh] items-center justify-center p-4">
          <p className="text-neutral-500">Loading…</p>
        </div>
      </div>
    }>
      <DetailsContent />
    </Suspense>
  );
}
