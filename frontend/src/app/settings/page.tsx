'use client';

import { useAuth } from '@/contexts/AuthContext';

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Settings</h1>

      <div className="space-y-5">
        {/* Profile */}
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

        {/* Password */}
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

        {/* Notifications */}
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
      </div>
    </div>
  );
}
