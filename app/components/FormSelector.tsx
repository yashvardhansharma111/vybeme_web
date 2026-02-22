'use client';

import React, { useEffect, useState } from 'react';
import { getUserForms } from '@/lib/api';

export interface FormSelectorProps {
  userId: string;
  onSelect: (formId: string) => void;
  onCreateNew: () => void;
  onCancel: () => void;
  loading?: boolean;
}

interface Form {
  form_id: string;
  name: string;
  description?: string;
  fields?: any[];
  created_at?: string;
}

export default function FormSelector({
  userId,
  onSelect,
  onCreateNew,
  onCancel,
  loading = false,
}: FormSelectorProps) {
  const [forms, setForms] = useState<Form[]>([]);
  const [loadingForms, setLoadingForms] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadForms();
  }, [userId]);

  const loadForms = async () => {
    try {
      setLoadingForms(true);
      setError(null);
      const res = await getUserForms(userId);
      if (res.success && res.data?.forms) {
        setForms(res.data.forms);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load forms');
    } finally {
      setLoadingForms(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white">
        <div className="border-b border-neutral-200 p-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-black">Select or Create Form</h2>
          <button
            onClick={onCancel}
            className="rounded-full p-2 hover:bg-neutral-100 text-black"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {loadingForms ? (
            <div className="text-center py-8">
              <p className="text-neutral-600">Loading forms...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 rounded-lg p-4 text-red-600 text-sm mb-4">{error}</div>
          ) : forms.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-neutral-600 mb-2">No forms created yet</p>
              <p className="text-sm text-neutral-500">Create your first form to get started</p>
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {forms.map((form) => (
                <button
                  key={form.form_id}
                  onClick={() => onSelect(form.form_id)}
                  className="w-full text-left p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition"
                >
                  <h3 className="font-semibold text-black">{form.name}</h3>
                  {form.description && (
                    <p className="text-sm text-neutral-600 mt-1">{form.description}</p>
                  )}
                  <p className="text-xs text-neutral-500 mt-2">
                    {form.fields?.length || 0} field{form.fields?.length !== 1 ? 's' : ''}
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 border-t border-neutral-200 pt-4">
            <button
              type="button"
              onClick={onCreateNew}
              disabled={loading}
              className="w-full py-3 rounded-full bg-black text-white hover:bg-neutral-800 disabled:opacity-50 font-medium"
            >
              {loading ? 'Creating...' : 'Create New Form'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="w-full py-2 text-neutral-600 hover:text-black"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
