"use client";

import { useEffect, useState } from 'react';
import { getForm } from '@/lib/api';
import { WekndLoadingScreen } from '@/app/components/WekndLoadingScreen';

interface FormField {
  field_id: string;
  label: string;
  type: string;
  placeholder?: string;
  options?: string[];
  required?: boolean;
}

/** Map legacy / alternate API types to renderer types */
function normalizeFieldType(type: string): string {
  const t = (type || 'text').toLowerCase().trim();
  if (t === 'dropdown' || t === 'choice' || t === 'single_choice') return 'select';
  if (t === 'multichoice' || t === 'multi_choice' || t === 'multiple_choice') return 'checkbox';
  return t;
}

function normalizeField(f: any): FormField {
  const type = normalizeFieldType(f.type);
  let options = Array.isArray(f.options) ? f.options.map(String) : [];
  if ((type === 'select' || type === 'radio' || type === 'checkbox') && options.length === 0) {
    options = ['Option 1', 'Option 2'];
  }
  return {
    field_id: f.field_id,
    label: f.label || 'Question',
    type,
    placeholder: f.placeholder,
    options,
    required: !!f.required,
  };
}

interface Props {
  formId: string;
  planId: string;
  userId?: string | null;
  registrationId?: string | null;
  onSubmitted?: () => void;
  onSubmit: (responses: Record<string, any>) => Promise<void>;
}

export default function FormRenderer({ formId, planId, userId, registrationId, onSubmit, onSubmitted }: Props) {
  const [loading, setLoading] = useState(true);
  const [formName, setFormName] = useState<string | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [values, setValues] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getForm(formId)
      .then((res) => {
        if (!mounted) return;
        if (res.success && res.data) {
          setFormName(res.data.name ?? null);
          const raw = Array.isArray(res.data.fields) ? res.data.fields : [];
          const normalized = raw.map(normalizeField);
          setFields(normalized);
          const initial: Record<string, any> = {};
          normalized.forEach((f) => {
            initial[f.field_id] = f.type === 'checkbox' ? [] : '';
          });
          setValues(initial);
        } else {
          setError(res.message || 'Could not load form');
        }
      })
      .catch(() => setError('Could not load form'))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [formId]);

  const setValue = (fieldId: string, v: any) => setValues((s) => ({ ...s, [fieldId]: v }));

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(values);
      if (onSubmitted) onSubmitted();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <WekndLoadingScreen className="min-h-[220px] rounded-2xl" />;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="space-y-5">
      {formName ? <h3 className="text-lg font-semibold">{formName}</h3> : null}
      {fields.map((f) => (
        <div key={f.field_id}>
          <label className="mb-2 block text-sm font-medium text-neutral-800">{f.label}{f.required ? ' *' : ''}</label>
          {f.type === 'textarea' ? (
            <textarea value={values[f.field_id] || ''} onChange={(e) => setValue(f.field_id, e.target.value)} rows={3} className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-400/30" />
          ) : f.type === 'select' ? (
            <div className="relative">
              <select
                value={values[f.field_id] || ''}
                onChange={(e) => setValue(f.field_id, e.target.value)}
                className="block w-full appearance-none rounded-xl border border-neutral-300 bg-white py-3 pl-3 pr-10 text-base text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-400/30"
              >
                <option value="">Choose an option</option>
                {(f.options || []).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500" aria-hidden>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </div>
          ) : f.type === 'radio' ? (
            <div className="flex flex-col gap-2">{(f.options || []).map((opt) => (
              <label key={opt} className="inline-flex items-center gap-2"><input type="radio" name={f.field_id} checked={values[f.field_id] === opt} onChange={() => setValue(f.field_id, opt)} /> {opt}</label>
            ))}</div>
          ) : f.type === 'checkbox' ? (
            <div className="flex flex-col gap-2">{(f.options || []).map((opt) => (
              <label key={opt} className="inline-flex items-center gap-2"><input type="checkbox" checked={(values[f.field_id] || []).includes(opt)} onChange={(e) => {
                const next = new Set(values[f.field_id] || [] as string[]);
                if (e.target.checked) next.add(opt); else next.delete(opt);
                setValue(f.field_id, Array.from(next));
              }} /> {opt}</label>
            ))}</div>
          ) : (
            <input value={values[f.field_id] || ''} onChange={(e) => setValue(f.field_id, e.target.value)} placeholder={f.placeholder || ''} type={f.type === 'number' ? 'number' : f.type === 'email' ? 'email' : f.type === 'date' ? 'date' : f.type === 'phone' ? 'tel' : 'text'} className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-400/30" />
          )}
        </div>
      ))}
      {error && <p className="text-red-600">{error}</p>}
      <div className="pt-3">
        <button type="button" disabled={submitting} onClick={handleSubmit} className="rounded-full bg-[#1C1C1E] px-6 py-3 text-sm font-bold text-white disabled:opacity-60">{submitting ? 'Submitting…' : 'Submit'}</button>
      </div>
    </div>
  );
}
