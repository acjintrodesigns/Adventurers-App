'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface RegFees {
  studentRegistrationFeePrice: number;
  teachersRegistrationFeePrice: number;
}

export default function RegistrationSettingsPage() {
  const isDemoSession = typeof window !== 'undefined' && localStorage.getItem('token') === 'mock-token';

  const [fees, setFees] = useState<RegFees>({
    studentRegistrationFeePrice: 450,
    teachersRegistrationFeePrice: 450,
  });
  const [allSettings, setAllSettings] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiFetch('/api/payment-settings/admin')
      .then((data: Record<string, unknown>) => {
        setAllSettings(data);
        setFees({
          studentRegistrationFeePrice: Number(data.studentRegistrationFeePrice ?? 450),
          teachersRegistrationFeePrice: Number(data.teachersRegistrationFeePrice ?? 450),
        });
      })
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : 'Failed to load settings.'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (isDemoSession) {
      setErr('Demo mode is active. Saving requires a real Director account.');
      return;
    }
    try {
      setSaving(true);
      setMsg(null);
      setErr(null);
      await apiFetch('/api/payment-settings', {
        method: 'PUT',
        body: JSON.stringify({
          ...allSettings,
          studentRegistrationFeePrice: Number(fees.studentRegistrationFeePrice),
          teachersRegistrationFeePrice: Number(fees.teachersRegistrationFeePrice),
        }),
      });
      setMsg('Registration fees saved successfully.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Registration Settings</h1>
      <p className="text-sm text-gray-500 mb-6">Set the registration fees charged to students and teachers when they register.</p>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {isDemoSession && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
            Demo mode is active. You can view and edit fields, but saving is disabled.
          </p>
        )}
        {loading && <p className="text-sm text-gray-500 mb-4">Loading settings...</p>}
        {err && <p className="text-sm text-red-600 mb-4">{err}</p>}
        {msg && <p className="text-sm text-green-600 mb-4">{msg}</p>}

        <h2 className="text-base font-semibold text-gray-700 mb-4">Registration Fees</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student Registration Fee (R)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={fees.studentRegistrationFeePrice}
              onChange={(e) => setFees((prev) => ({ ...prev, studentRegistrationFeePrice: Number(e.target.value || 0) }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teacher Registration Fee (R)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={fees.teachersRegistrationFeePrice}
              onChange={(e) => setFees((prev) => ({ ...prev, teachersRegistrationFeePrice: Number(e.target.value || 0) }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            />
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="mt-5 bg-[#1e3a5f] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[#2a4f7c] disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Registration Settings'}
        </button>
      </div>
    </div>
  );
}
