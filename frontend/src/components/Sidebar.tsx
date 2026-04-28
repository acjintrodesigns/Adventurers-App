'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, UserRole } from '@/contexts/AuthContext';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const navItems: Record<UserRole, NavItem[]> = {
  Director: [
    { label: 'Dashboard', href: '/director/dashboard', icon: '🏠' },
    { label: 'Children', href: '/director/children', icon: '👧' },
    { label: 'Classes', href: '/director/classes', icon: '📚' },
    { label: 'Events', href: '/director/events', icon: '📅' },
    { label: 'Payments', href: '/director/payments', icon: '💳' },
    { label: 'Announcements', href: '/announcements', icon: '📢' },
    { label: 'Awards', href: '/awards', icon: '🏆' },
    { label: 'Chat', href: '/chat', icon: '💬' },
    { label: 'Settings', href: '/settings', icon: '⚙️' },
  ],
  Teacher: [
    { label: 'Dashboard', href: '/teacher/dashboard', icon: '🏠' },
    { label: 'My Classes', href: '/teacher/classes', icon: '📚' },
    { label: 'Progress', href: '/teacher/progress', icon: '📊' },
    { label: 'Chat', href: '/chat', icon: '💬' },
    { label: 'Announcements', href: '/announcements', icon: '📢' },
  ],
  Parent: [
    { label: 'Dashboard', href: '/parent/dashboard', icon: '🏠' },
    { label: 'My Children', href: '/parent/register-child', icon: '👨‍👧' },
    { label: 'Events', href: '/director/events', icon: '📅' },
    { label: 'Payments', href: '/parent/payments', icon: '💳' },
    { label: 'Chat', href: '/chat', icon: '💬' },
  ],
};

export default function Sidebar() {
  const { user, role, logout } = useAuth();
  const pathname = usePathname();

  if (!role) return null;

  const items = navItems[role] ?? [];

  return (
    <aside className="w-64 min-h-screen bg-[#1e3a5f] text-white flex flex-col shadow-xl">
      {/* Logo / Club Name */}
      <div className="px-6 py-6 border-b border-[#2a4f7c]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center text-[#1e3a5f] font-bold text-lg">
            A
          </div>
          <div>
            <p className="font-bold text-base leading-tight">Adventurers</p>
            <p className="text-xs text-blue-300">Management System</p>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-6 py-4 border-b border-[#2a4f7c]">
        <p className="text-sm font-semibold truncate">{user?.name ?? 'User'}</p>
        <span className="inline-block mt-1 text-xs bg-yellow-400 text-[#1e3a5f] px-2 py-0.5 rounded-full font-semibold">
          {role}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-yellow-400 text-[#1e3a5f]'
                      : 'text-blue-100 hover:bg-[#2a4f7c] hover:text-white'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom links */}
      <div className="px-3 pb-4 border-t border-[#2a4f7c] pt-4 space-y-1">
        <Link
          href="/song"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-blue-300 hover:bg-[#2a4f7c] hover:text-white transition-colors"
        >
          🎵 Adventurer Song
        </Link>
        <Link
          href="/pledge"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-blue-300 hover:bg-[#2a4f7c] hover:text-white transition-colors"
        >
          ✋ Pledge &amp; Law
        </Link>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-300 hover:bg-red-900/30 hover:text-red-200 transition-colors"
        >
          🚪 Logout
        </button>
      </div>
    </aside>
  );
}
