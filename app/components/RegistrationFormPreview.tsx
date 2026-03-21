'use client';

import { useEffect, useState } from 'react';
import { getForm } from '@/lib/api';

type PreviewField = {
  field_id?: string;
  label?: string;
  type?: string;
  options?: string[];
};

/** Read-only list of questions for organizers (create / edit event). */
export function RegistrationFormPreview({
  formId,
  refreshKey = 0,
}: {
  formId: string;
  refreshKey?: number;
}) {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [fields, setFields] = useState<PreviewField[]>([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getForm(formId)
      .then((res) => {
        if (!alive) return;
        if (res.success && res.data) {
          setName((res.data as { name?: string }).name || '');
          const raw = (res.data as { fields?: PreviewField[] }).fields;
          setFields(Array.isArray(raw) ? raw : []);
        } else {
          setFields([]);
        }
      })
      .catch(() => {
        if (alive) setFields([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [formId, refreshKey]);

  if (loading) {
    return <p className="text-xs text-neutral-500">Loading form preview…</p>;
  }
  if (!fields.length) {
    return (
      <p className="text-xs text-amber-800">
        This form has no questions yet. Tap <strong>Edit form</strong> to add dropdown and multiple-choice fields.
      </p>
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-green-200 bg-white p-3 text-left shadow-sm">
      {name ? <p className="text-xs font-semibold text-green-900">{name}</p> : null}
      <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-neutral-500">Preview</p>
      <ol className="mt-2 list-decimal space-y-2 pl-4 text-sm text-neutral-800">
        {fields.map((f) => (
          <li key={f.field_id || f.label}>
            <span className="font-medium">{f.label || 'Untitled'}</span>
            <span className="ml-1 text-xs text-neutral-500">({f.type || 'text'})</span>
            {Array.isArray(f.options) && f.options.length > 0 ? (
              <div className="mt-0.5 text-xs text-neutral-600">Choices: {f.options.filter(Boolean).join(' · ')}</div>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
