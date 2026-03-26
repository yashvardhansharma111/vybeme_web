'use client';

import React, { useState, useCallback } from 'react';

export interface FormField {
  field_id: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'number' | 'select' | 'textarea' | 'checkbox' | 'radio' | 'date';
  placeholder?: string;
  options?: string[];
  required: boolean;
  order: number;
}

export interface FormBuilderProps {
  onSave: (payload: { title: string; description: string; fields: FormField[] }) => void;
  onCancel: () => void;
  initialFields?: FormField[];
  initialTitle?: string;
  initialDescription?: string;
  loading?: boolean;
}

const FIELD_TYPES: FormField['type'][] = [
  'text',
  'email',
  'phone',
  'number',
  'select',
  'textarea',
  'checkbox',
  'radio',
  'date',
];

const TYPE_LABELS: Record<FormField['type'], string> = {
  text: 'Short Answer',
  email: 'Email',
  phone: 'Phone',
  number: 'Number',
  select: 'Dropdown',
  textarea: 'Paragraph',
  checkbox: 'Checkbox',
  radio: 'Multiple choice',
  date: 'Date',
};

function normalizeFieldsForSave(fields: FormField[]): FormField[] {
  return fields.map((f, i) => {
    const needsOptions = ['select', 'radio', 'checkbox'].includes(f.type);
    const opts = f.options?.filter(Boolean) ?? [];
    return {
      ...f,
      label: f.label.trim() || `Question ${i + 1}`,
      order: i,
      placeholder: f.placeholder ?? '',
      options: needsOptions && opts.length === 0 ? ['Option 1', 'Option 2'] : opts,
    };
  });
}

function needsOptions(type: FormField['type']) {
  return type === 'select' || type === 'radio' || type === 'checkbox';
}

export default function FormBuilder({
  onSave,
  onCancel,
  initialFields = [],
  initialTitle = '',
  initialDescription = '',
  loading = false,
}: FormBuilderProps) {
  const [formTitle, setFormTitle] = useState(initialTitle);
  const [formDescription, setFormDescription] = useState(initialDescription);
  const [fields, setFields] = useState<FormField[]>(() =>
    initialFields.length > 0
      ? initialFields.map((f, i) => ({
          ...f,
          order: f.order ?? i,
          options: Array.isArray(f.options) ? [...f.options] : [],
        }))
      : []
  );

  const addField = () => {
    const newField: FormField = {
      field_id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      label: '',
      type: 'text',
      placeholder: '',
      options: [],
      required: false,
      order: fields.length,
    };
    setFields((prev) => [...prev, newField]);
  };

  const updateField = (index: number, patch: Partial<FormField>) => {
    setFields((prev) => {
      const next = [...prev];
      const cur = next[index];
      let merged = { ...cur, ...patch };
      if (patch.type && needsOptions(patch.type) && (!merged.options || merged.options.length === 0)) {
        merged = { ...merged, options: ['Option 1', 'Option 2'] };
      }
      if (patch.type && !needsOptions(patch.type)) {
        merged = { ...merged, options: [] };
      }
      next[index] = merged;
      return next;
    });
  };

  const updateOption = (fieldIndex: number, optIndex: number, value: string) => {
    setFields((prev) => {
      const next = [...prev];
      const f = { ...next[fieldIndex] };
      const opts = [...(f.options || [])];
      opts[optIndex] = value;
      f.options = opts;
      next[fieldIndex] = f;
      return next;
    });
  };

  const addOption = (fieldIndex: number) => {
    setFields((prev) => {
      const next = [...prev];
      const f = { ...next[fieldIndex] };
      f.options = [...(f.options || []), `Option ${(f.options?.length || 0) + 1}`];
      next[fieldIndex] = f;
      return next;
    });
  };

  const removeOption = (fieldIndex: number, optIndex: number) => {
    setFields((prev) => {
      const next = [...prev];
      const f = { ...next[fieldIndex] };
      f.options = (f.options || []).filter((_, i) => i !== optIndex);
      next[fieldIndex] = f;
      return next;
    });
  };

  const deleteField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = useCallback(() => {
    if (fields.length === 0) {
      alert('Please add at least one question');
      return;
    }
    onSave({
      title: formTitle.trim(),
      description: formDescription.trim(),
      fields: normalizeFieldsForSave(fields),
    });
  }, [fields, formTitle, formDescription, onSave]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-[#0a0a0a] shadow-2xl ring-1 ring-white/10">
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-base font-semibold text-white">Form</h2>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="mb-4 space-y-2 rounded-2xl bg-[#1a1a1a] p-3 ring-1 ring-white/10">
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Form title"
              className="w-full rounded-xl border border-white/15 bg-[#0d0d0d] px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-white/30 focus:outline-none focus:ring-0"
            />
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Form description"
              rows={2}
              className="w-full resize-none rounded-xl border border-white/15 bg-[#0d0d0d] px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-white/30 focus:outline-none focus:ring-0"
            />
          </div>
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div
                key={field.field_id}
                className="relative rounded-2xl bg-[#1a1a1a] p-3 pr-12 ring-1 ring-white/10"
              >
                <button
                  type="button"
                  onClick={() => deleteField(index)}
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"
                  aria-label="Delete question"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-2">
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => updateField(index, { label: e.target.value })}
                    placeholder="Add a question"
                    className="min-w-0 flex-1 rounded-xl border border-white/15 bg-[#0d0d0d] px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-white/30 focus:outline-none focus:ring-0"
                  />
                  <select
                    value={field.type}
                    onChange={(e) => updateField(index, { type: e.target.value as FormField['type'] })}
                    className="w-full shrink-0 rounded-xl border border-white/15 bg-[#0d0d0d] px-3 py-2.5 text-sm text-white sm:w-[160px] [color-scheme:dark]"
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t} value={t} className="bg-[#1a1a1a]">
                        {TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={field.required}
                    onClick={() => updateField(index, { required: !field.required })}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                      field.required ? 'bg-white' : 'bg-white/20'
                    }`}
                  >
                    <span
                      className={`pointer-events-none absolute top-0.5 left-0.5 h-5 w-5 rounded-full shadow transition-transform ${
                        field.required ? 'translate-x-5 bg-black' : 'translate-x-0 bg-white'
                      }`}
                    />
                  </button>
                  <span className="text-sm text-white/90">Required</span>
                </div>

                {needsOptions(field.type) && (
                  <div className="mt-4 space-y-2 border-t border-white/10 pt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
                      {field.type === 'select' ? 'Dropdown choices' : field.type === 'radio' ? 'Choices (pick one)' : 'Choices (pick any)'}
                    </p>
                    {(field.options || []).map((opt, oi) => (
                      <div key={oi} className="flex gap-2">
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => updateOption(index, oi, e.target.value)}
                          placeholder={`Option ${oi + 1}`}
                          className="min-w-0 flex-1 rounded-lg border border-white/15 bg-[#0d0d0d] px-3 py-2 text-sm text-white placeholder:text-white/35"
                        />
                        <button
                          type="button"
                          onClick={() => removeOption(index, oi)}
                          className="shrink-0 rounded-lg px-2 text-sm text-white/50 hover:bg-white/10 hover:text-white"
                          aria-label="Remove option"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addOption(index)}
                      className="text-sm font-medium text-white/80 hover:text-white"
                    >
                      + Add option
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addField}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2a2a2a] py-2.5 text-sm font-medium text-white hover:bg-[#333]"
          >
            <span className="text-lg leading-none">+</span>
            Add question
          </button>
        </div>

        <div className="flex shrink-0 gap-2 border-t border-white/10 px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-full border border-white/20 py-2.5 text-sm font-medium text-white hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="flex-1 rounded-full bg-white py-2.5 text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Save form'}
          </button>
        </div>
      </div>
    </div>
  );
}
