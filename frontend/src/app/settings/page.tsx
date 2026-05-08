'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface TimelineSettings {
  workCommencmentDate: string;
  workCompletionDate: string;
  completionConfirmationDate: string;
  investigerDate: string;
}

export default function SettingsPage() {
  const { user, role } = useAuth();

  // Director-only: Learning Timeline
  const [timeline, setTimeline] = useState<TimelineSettings>({
    workCommencmentDate: '',
    workCompletionDate: '',
    completionConfirmationDate: '',
    investigerDate: '',
  });
  // keep the rest of settings intact when saving
  const [allSettings, setAllSettings] = useState<Record<string, unknown>>({});
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineSaving, setTimelineSaving] = useState(false);
  const [timelineMsg, setTimelineMsg] = useState<string | null>(null);
  const [timelineErr, setTimelineErr] = useState<string | null>(null);

  useEffect(() => {
    if (role !== 'Director') return;
    setTimelineLoading(true);
    apiFetch('/api/payment-settings/admin')
      .then((data: Record<string, unknown>) => {
        setAllSettings(data);
        setTimeline({
          workCommencmentDate: data.workCommencmentDate ? String(data.workCommencmentDate).slice(0, 10) : '',
          workCompletionDate: data.workCompletionDate ? String(data.workCompletionDate).slice(0, 10) : '',
          completionConfirmationDate: data.completionConfirmationDate ? String(data.completionConfirmationDate).slice(0, 10) : '',
          investigerDate: data.investigerDate ? String(data.investigerDate).slice(0, 10) : '',
        });
      })
      .catch((err: unknown) => setTimelineErr(err instanceof Error ? err.message : 'Failed to load timeline.'))
      .finally(() => setTimelineLoading(false));
  }, [role]);

  const saveTimeline = async () => {
    try {
      setTimelineSaving(true);
      setTimelineMsg(null);
      setTimelineErr(null);
      await apiFetch('/api/payment-settings', {
        method: 'PUT',
        body: JSON.stringify({
          ...allSettings,
          workCommencmentDate: timeline.workCommencmentDate || null,
          workCompletionDate: timeline.workCompletionDate || null,
          completionConfirmationDate: timeline.completionConfirmationDate || null,
          investigerDate: timeline.investigerDate || null,
        }),
      });
      setTimelineMsg('Learning timeline saved successfully.');
    } catch (err) {
      setTimelineErr(err instanceof Error ? err.message : 'Failed to save timeline.');
    } finally {
      setTimelineSaving(false);
    }
  };

  const updateTimeline = (field: keyof TimelineSettings, value: string) => {
    setTimeline((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Settings</h1>

      <div className="space-y-5">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Profile Information</h2>
          <div className="flex items-center gap-5 mb-5">
            <div className="w-16 h-16 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white text-2xl font-bold">
              {user?.name?.charAt(0) ?? 'U'}
            </div>
            <div>
              <p className="font-semibold text-gray-800">{user?.name}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <span className="inline-block mt-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold">
                {user?.role}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                defaultValue={user?.name}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                defaultValue={user?.email}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
          </div>

          <button className="mt-4 bg-[#1e3a5f] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[#2a4f7c]">
            Save Changes
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Change Password</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <input type="password" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input type="password" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input type="password" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]" />
            </div>
          </div>
          <button className="mt-4 bg-[#1e3a5f] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[#2a4f7c]">
            Update Password
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Notifications</h2>
          <div className="space-y-3">
            {['Email announcements', 'Event reminders', 'Payment due reminders', 'Chat messages'].map((item) => (
              <div key={item} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{item}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-[#1e3a5f] transition-colors" />
                  <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full peer-checked:translate-x-4 transition-transform" />
                </label>
              </div>
            ))}
          </div>
        </div>

        {role === 'Director' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-gray-700 mb-1">Learning Timeline</h2>
            <p className="text-xs text-gray-500 mb-4">Set the key dates for the current academic year programme.</p>

            {timelineLoading && <p className="text-sm text-gray-500 mb-3">Loading...</p>}
            {timelineErr && <p className="text-sm text-red-600 mb-3">{timelineErr}</p>}
            {timelineMsg && <p className="text-sm text-green-600 mb-3">{timelineMsg}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Work Commencement Date</label>
                <input
                  type="date"
                  value={timeline.workCommencmentDate}
                  onChange={(e) => updateTimeline('workCommencmentDate', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Work Completion Date</label>
                <input
                  type="date"
                  value={timeline.workCompletionDate}
                  onChange={(e) => updateTimeline('workCompletionDate', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Completion Confirmation Date</label>
                <input
                  type="date"
                  value={timeline.completionConfirmationDate}
                  onChange={(e) => updateTimeline('completionConfirmationDate', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Investiger Date</label>
                <input
                  type="date"
                  value={timeline.investigerDate}
                  onChange={(e) => updateTimeline('investigerDate', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                />
              </div>
            </div>
            <button
              onClick={saveTimeline}
              disabled={timelineSaving}
              className="mt-4 bg-[#1e3a5f] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[#2a4f7c] disabled:opacity-60"
            >
              {timelineSaving ? 'Saving...' : 'Save Timeline'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
