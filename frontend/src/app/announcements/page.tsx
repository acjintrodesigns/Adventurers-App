'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  role: string;
  date: string;
  targetClass?: string;
}

const initialAnnouncements: Announcement[] = [
  {
    id: '1',
    title: 'Investiture Ceremony – Save the Date',
    content: 'The annual Investiture Ceremony will be held on February 3rd, 2024, at 3 PM in the Main Auditorium. All parents and children are invited to attend.',
    author: 'Director',
    role: 'Director',
    date: '2024-01-15',
    targetClass: 'All',
  },
  {
    id: '2',
    title: 'Camp Out Registration Open',
    content: 'Registration for the March Camp Out is now open. Limited spots available. Cost: R200 per child. Please register by February 28th.',
    author: 'Mrs. Adams',
    role: 'Teacher',
    date: '2024-01-14',
    targetClass: 'Busy Bee',
  },
  {
    id: '3',
    title: 'Memory Verse Update',
    content: 'This week\'s memory verse is Psalm 23:1 – "The Lord is my shepherd; I shall not want." Please practice at home!',
    author: 'Mr. Johnson',
    role: 'Teacher',
    date: '2024-01-13',
    targetClass: 'Early Bird',
  },
];

const roleColors: Record<string, string> = {
  Director: 'bg-purple-100 text-purple-700',
  Teacher: 'bg-blue-100 text-blue-700',
};

export default function AnnouncementsPage() {
  const { role } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', targetClass: 'All' });
  const { user } = useAuth();

  const canCreate = role === 'Director' || role === 'Teacher';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newAnn: Announcement = {
      id: Date.now().toString(),
      title: form.title,
      content: form.content,
      author: user?.name ?? 'Unknown',
      role: role ?? 'Teacher',
      date: new Date().toISOString().split('T')[0],
      targetClass: form.targetClass,
    };
    setAnnouncements((prev) => [newAnn, ...prev]);
    setForm({ title: '', content: '', targetClass: 'All' });
    setShowForm(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Announcements</h1>
        {canCreate && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-[#1e3a5f] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#2a4f7c]"
          >
            {showForm ? 'Cancel' : '+ New Announcement'}
          </button>
        )}
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

      <div className="space-y-4">
        {announcements.map((ann) => (
          <div key={ann.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-start justify-between gap-4 mb-3">
              <h3 className="text-base font-bold text-gray-800">{ann.title}</h3>
              {ann.targetClass && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full flex-shrink-0">
                  {ann.targetClass}
                </span>
              )}
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
