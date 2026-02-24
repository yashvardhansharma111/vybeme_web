"use client";

import { useEffect, useState } from 'react';
import { getForm } from '@/lib/api';

interface FormField {
  field_id: string;
  label: string;
  type: string;
  placeholder?: string;
  options?: string[];
  required?: boolean;
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
          setFields(Array.isArray(res.data.fields) ? res.data.fields : []);
          const initial: Record<string, any> = {};
          (res.data.fields || []).forEach((f: any) => {
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

  if (loading) return <p className="text-neutral-500">Loading form…</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="space-y-5">
      {formName ? <h3 className="text-lg font-semibold">{formName}</h3> : null}
      {fields.map((f) => (
        <div key={f.field_id}>
          <label className="mb-2 block text-sm font-medium text-neutral-800">{f.label}{f.required ? ' *' : ''}</label>
          {f.type === 'textarea' ? (
            <textarea value={values[f.field_id] || ''} onChange={(e) => setValue(f.field_id, e.target.value)} rows={3} className="w-full rounded-xl border px-3 py-2" />
          ) : f.type === 'select' ? (
            <select value={values[f.field_id] || ''} onChange={(e) => setValue(f.field_id, e.target.value)} className="w-full rounded-xl border px-3 py-2">
              <option value="">Select</option>
              {(f.options || []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
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
            <input value={values[f.field_id] || ''} onChange={(e) => setValue(f.field_id, e.target.value)} placeholder={f.placeholder || ''} type={f.type === 'number' ? 'number' : f.type === 'email' ? 'email' : 'text'} className="w-full rounded-xl border px-3 py-2" />
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
