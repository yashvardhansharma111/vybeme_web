'use client';

import React, { useEffect, useState } from 'react';
import { getFormResponse } from '@/lib/api';

interface FormField {
  field_id: string;
  label: string;
  type: string;
  required: boolean;
}

interface FormResponseViewerProps {
  registrationId: string;
  userName: string;
  onClose: () => void;
}

export default function FormResponseViewer({
  registrationId,
  userName,
  onClose,
}: FormResponseViewerProps) {
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadResponse();
  }, [registrationId]);

  const loadResponse = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getFormResponse(registrationId);
      if (res.success && res.data) {
        setResponse(res.data);
      } else {
        setError('No form response found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load form response');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[80vh] rounded-2xl bg-white overflow-y-auto">
        <div className="border-b border-neutral-200 p-4 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-lg font-bold text-black">Form Response - {userName}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-neutral-100 text-black"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-neutral-600">Loading form response...</p>
            </div>
          ) : error ? (
            <div className="bg-yellow-50 rounded-lg p-4 text-yellow-700 text-sm">
              {error}
            </div>
          ) : response && response.responses ? (
            <div className="space-y-6">
              {Object.entries(response.responses).map(([fieldId, answer]: [string, any]) => (
                <div key={fieldId} className="border-b border-neutral-200 pb-4 last:border-b-0">
                  <p className="text-sm font-medium text-neutral-600 mb-2">
                    Field ID: {fieldId}
                  </p>
                  <div className="bg-neutral-50 rounded-lg p-4">
                    <p className="text-sm text-black break-words">
                      {Array.isArray(answer) ? answer.join(', ') : String(answer ?? '—')}
                    </p>
                  </div>
                </div>
              ))}
              <div className="text-xs text-neutral-500 pt-4 border-t border-neutral-200">
                Submitted at: {new Date(response.submitted_at).toLocaleString()}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-neutral-600">No responses available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
