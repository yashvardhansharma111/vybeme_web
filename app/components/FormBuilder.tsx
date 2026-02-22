'use client';

import React, { useState } from 'react';

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
  onSave: (fields: FormField[]) => void;
  onCancel: () => void;
  initialFields?: FormField[];
  loading?: boolean;
}

const FIELD_TYPES: Array<'text' | 'email' | 'phone' | 'number' | 'select' | 'textarea' | 'checkbox' | 'radio' | 'date'> = [
  'text',
  'email',
  'phone',
  'number',
  'select',
  'textarea',
  'checkbox',
  'radio',
  'date'
];

export default function FormBuilder({ onSave, onCancel, initialFields = [], loading = false }: FormBuilderProps) {
  const [fields, setFields] = useState<FormField[]>(initialFields.length > 0 ? initialFields : []);

  const addField = () => {
    const newField: FormField = {
      field_id: `field_${Date.now()}_${Math.random()}`,
      label: `Field ${fields.length + 1}`,
      type: 'text',
      placeholder: '',
      options: [],
      required: false,
      order: fields.length
    };
    setFields([...fields, newField]);
  };

  const updateField = (index: number, field: Partial<FormField>) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], ...field };
    setFields(updated);
  };

  const deleteField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const moveFieldUp = (index: number) => {
    if (index === 0) return;
    const updated = [...fields];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setFields(updated);
  };

  const moveFieldDown = (index: number) => {
    if (index === fields.length - 1) return;
    const updated = [...fields];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setFields(updated);
  };

  const handleSave = () => {
    if (fields.length === 0) {
      alert('Please add at least one field');
      return;
    }
    onSave(fields);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] rounded-2xl bg-white overflow-y-auto">
        <div className="border-b border-neutral-200 p-4 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-lg font-bold text-black">Form Builder</h2>
          <button
            onClick={onCancel}
            className="rounded-full p-2 hover:bg-neutral-100 text-black"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {/* Fields List */}
          <div className="space-y-4 mb-6">
            {fields.map((field, index) => (
              <div key={field.field_id} className="border border-neutral-200 rounded-lg p-4 bg-neutral-50">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {/* Label */}
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Field Label</label>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => updateField(index, { label: e.target.value })}
                      placeholder="e.g., Full Name"
                      className="w-full rounded border border-neutral-300 px-3 py-2 text-sm text-black"
                    />
                  </div>

                  {/* Type */}
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Field Type</label>
                    <select
                      value={field.type}
                      onChange={(e) => updateField(index, { type: e.target.value as any })}
                      className="w-full rounded border border-neutral-300 px-3 py-2 text-sm text-black"
                    >
                      {FIELD_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Placeholder */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-black mb-1">Placeholder (optional)</label>
                  <input
                    type="text"
                    value={field.placeholder || ''}
                    onChange={(e) => updateField(index, { placeholder: e.target.value })}
                    placeholder="e.g., Enter your full name"
                    className="w-full rounded border border-neutral-300 px-3 py-2 text-sm text-black"
                  />
                </div>

                {/* Options for select/radio/checkbox */}
                {['select', 'radio', 'checkbox'].includes(field.type) && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-black mb-2">Options (comma-separated)</label>
                    <input
                      type="text"
                      value={field.options?.join(', ') || ''}
                      onChange={(e) => {
                        const opts = e.target.value.split(',').map((o) => o.trim()).filter(Boolean);
                        updateField(index, { options: opts });
                      }}
                      placeholder="Option 1, Option 2, Option 3"
                      className="w-full rounded border border-neutral-300 px-3 py-2 text-sm text-black"
                    />
                  </div>
                )}

                {/* Required Toggle */}
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    id={`required_${field.field_id}`}
                    checked={field.required}
                    onChange={(e) => updateField(index, { required: e.target.checked })}
                    className="h-4 w-4 rounded"
                  />
                  <label htmlFor={`required_${field.field_id}`} className="text-sm font-medium text-black cursor-pointer">
                    Make this field required
                  </label>
                </div>

                {/* Actions */}
                <div className="flex justify-between gap-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => moveFieldUp(index)}
                      disabled={index === 0}
                      className="px-3 py-1 text-sm rounded border border-neutral-300 text-black hover:bg-neutral-100 disabled:opacity-50"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveFieldDown(index)}
                      disabled={index === fields.length - 1}
                      className="px-3 py-1 text-sm rounded border border-neutral-300 text-black hover:bg-neutral-100 disabled:opacity-50"
                    >
                      ↓
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteField(index)}
                    className="px-3 py-1 text-sm rounded bg-red-50 text-red-600 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Field Button */}
          <button
            type="button"
            onClick={addField}
            className="w-full py-2 px-4 mb-6 rounded-lg border-2 border-dashed border-neutral-300 text-black hover:bg-neutral-50 font-medium"
          >
            + Add Field
          </button>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end border-t border-neutral-200 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 rounded-full border border-black text-black hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2 rounded-full bg-black text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Form'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
