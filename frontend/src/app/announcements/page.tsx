'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';

interface Announcement {
  id: number;
  title: string;
  content: string;
  author: string;
  authorId?: number;
  role: string;
  date: string;
  targetClass?: string;
}

interface ApiAnnouncement {
  id: number;
  title: string;
  body: string;
  authorId?: number;
  authorName?: string;
  authorRole?: string;
  targetClass?: string | null;
  createdAt: string;
}

const roleColors: Record<string, string> = {
  Director: 'bg-purple-100 text-purple-700',
  Teacher: 'bg-blue-100 text-blue-700',
};

export default function AnnouncementsPage() {
  const { role, user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [clearingAll, setClearingAll] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', targetClass: 'All' });

  const canCreate = role === 'Director' || role === 'Teacher';

  const mapApiAnnouncement = (item: ApiAnnouncement): Announcement => ({
    id: item.id,
    title: item.title,
    content: item.body,
    author: item.authorName || 'Staff',
    authorId: item.authorId,
    role: item.authorRole || 'Staff',
    date: new Date(item.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }),
    targetClass: item.targetClass ?? 'All',
  });

  const canDeleteAnnouncement = (announcement: Announcement) => {
    if (role === 'Director') return true;
    if (role !== 'Teacher') return false;
    return Number(user?.id ?? '0') === Number(announcement.authorId ?? 0);
  };

  useEffect(() => {
    const loadAnnouncements = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch('/api/announcements') as ApiAnnouncement[];
        setAnnouncements(Array.isArray(data) ? data.map(mapApiAnnouncement) : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load announcements.');
      } finally {
        setLoading(false);
      }
    };

    void loadAnnouncements();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const created = await apiFetch('/api/announcements', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title.trim(),
          body: form.content.trim(),
          targetClass: form.targetClass === 'All' ? null : form.targetClass,
        }),
      }) as ApiAnnouncement;

      const newAnn = mapApiAnnouncement(created);
      setAnnouncements((prev) => [newAnn, ...prev]);
      setForm({ title: '', content: '', targetClass: 'All' });
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish announcement.');
    }
  };

  const handleDelete = async (announcement: Announcement) => {
    const confirmed = confirm(`Are you sure you want to delete "${announcement.title}"?`);
    if (!confirmed) return;

    setError(null);
    setDeletingId(announcement.id);
    try {
      await apiFetch(`/api/announcements/${announcement.id}`, { method: 'DELETE' });
      setAnnouncements((prev) => prev.filter((ann) => ann.id !== announcement.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete announcement.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    if (role !== 'Director') return;
    setError(null);
    setClearingAll(true);
    try {
      await apiFetch('/api/announcements', { method: 'DELETE' });
      setAnnouncements([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear announcements.');
    } finally {
      setClearingAll(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Announcements</h1>
        <div className="flex items-center gap-2">
          {role === 'Director' && (
            <button
              type="button"
              onClick={() => void handleClearAll()}
              disabled={clearingAll || announcements.length === 0}
              className="border border-red-200 text-red-700 bg-red-50 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {clearingAll ? 'Clearing...' : 'Clear All'}
            </button>
          )}
          {canCreate && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-[#1e3a5f] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#2a4f7c]"
            >
              {showForm ? 'Cancel' : '+ New Announcement'}
            </button>
          )}
        </div>
      </div>

      {showForm && canCreate && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Create Announcement</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                required
                rows={4}
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Class</label>
              <select
                value={form.targetClass}
                onChange={(e) => setForm((f) => ({ ...f, targetClass: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] bg-white"
              >
                <option value="All">All Classes</option>
                <option value="Little Lamb">Little Lamb</option>
                <option value="Early Bird">Early Bird</option>
                <option value="Busy Bee">Busy Bee</option>
                <option value="Sunbeam">Sunbeam</option>
                <option value="Builder">Builder</option>
                <option value="Helping Hand">Helping Hand</option>
              </select>
            </div>
            <button type="submit" className="bg-[#1e3a5f] text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-[#2a4f7c]">
              Publish Announcement
            </button>
          </form>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {loading && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-sm text-gray-500">
            Loading announcements...
          </div>
        )}

        {!loading && announcements.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-dashed border-gray-200 p-8 text-center">
            <p className="text-sm font-semibold text-gray-600">No announcements yet</p>
            <p className="text-xs text-gray-400 mt-1">Create the first announcement to begin testing.</p>
          </div>
        )}

        {!loading && announcements.map((ann) => (
          <div key={ann.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-start justify-between gap-4 mb-3">
              <h3 className="text-base font-bold text-gray-800">{ann.title}</h3>
              <div className="flex items-center gap-2">
                {ann.targetClass && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full flex-shrink-0">
                    {ann.targetClass}
                  </span>
                )}
                {canDeleteAnnouncement(ann) && (
                  <button
                    type="button"
                    onClick={() => void handleDelete(ann)}
                    disabled={deletingId === ann.id}
                    className="text-xs text-red-600 hover:text-red-700 font-semibold px-2 py-1 rounded border border-red-200 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingId === ann.id ? 'Deleting...' : 'Delete'}
                  </button>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">{ann.content}</p>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className={`font-semibold px-2 py-0.5 rounded-full ${roleColors[ann.role] ?? 'bg-gray-100 text-gray-600'}`}>
                {ann.role}
              </span>
              <span>{ann.author}</span>
              <span>·</span>
              <span>{ann.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
