'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

interface ParentChildItem {
  id: string | number;
  name: string;
}

const navItems: Record<UserRole, NavItem[]> = {
  Director: [
    { label: 'Dashboard', href: '/director/dashboard', icon: '🏠' },
    { label: 'Children', href: '/director/children', icon: '👧' },
    { label: 'Registrations', href: '/director/registrations', icon: '📝' },
    { label: 'Teachers', href: '/director/teachers', icon: '🧑‍🏫' },
    { label: 'Classes', href: '/director/classes', icon: '📚' },
    { label: 'Events', href: '/director/events', icon: '📅' },
    { label: 'Payments', href: '/director/payments', icon: '💳' },
    { label: 'Payment Settings', href: '/director/payment-settings', icon: '🏦' },
    { label: 'Registration Settings', href: '/director/registration-settings', icon: '📋' },
    { label: 'Announcements', href: '/announcements', icon: '📢' },
    { label: 'Awards', href: '/awards', icon: '🏆' },
    { label: 'Settings', href: '/settings', icon: '⚙️' },
  ],
  Teacher: [
    { label: 'Dashboard', href: '/teacher/dashboard', icon: '🏠' },
    { label: 'My Class', href: '/teacher/progress', icon: '📚' },
    { label: 'Events', href: '/director/events', icon: '📅' },
    { label: 'My Profile', href: '/teacher/profile', icon: '👤' },
    { label: 'Announcements', href: '/announcements', icon: '📢' },
  ],
  Parent: [
    { label: 'Dashboard', href: '/parent/dashboard', icon: '🏠' },
    { label: 'Parent/Guardian Details', href: '/parent/details', icon: '👪' },
    { label: 'Registration', href: '/parent/register-child', icon: '📝' },
    { label: 'My Children', href: '/parent/my-children', icon: '👨‍👧' },
    { label: 'Events', href: '/director/events', icon: '📅' },
    { label: 'Payments', href: '/parent/payments', icon: '💳' },
  ],
  Donor: [
    { label: 'Dashboard', href: '/donor/dashboard', icon: '🏠' },
    { label: 'My Profile', href: '/donor/profile', icon: '👤' },
    { label: 'Donate', href: '/donor/donations', icon: '💝' },
    { label: 'My Donations', href: '/donor/my-donations', icon: '📋' },
  ],
};

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }: SidebarProps) {
  const { user, role, logout } = useAuth();
  const pathname = usePathname();
  const [assignedClass, setAssignedClass] = useState('');
  const [parentChildren, setParentChildren] = useState<ParentChildItem[]>([]);
  const [childrenMenuOpen, setChildrenMenuOpen] = useState(false);

  useEffect(() => {
    onCloseMobile();
  }, [pathname, onCloseMobile]);

  useEffect(() => {
    if (role !== 'Teacher') return;

    const loadAssignedClass = async () => {
      try {
        const data = await apiFetch('/api/teachers/my-class') as { assignedClass?: string | null };
        setAssignedClass(data.assignedClass?.trim() ?? '');
      } catch {
        setAssignedClass('');
      }
    };

    void loadAssignedClass();
  }, [role]);

  useEffect(() => {
    if (role !== 'Parent') {
      setParentChildren([]);
      return;
    }

    const loadChildren = async () => {
      try {
        const data = await apiFetch('/api/children') as ParentChildItem[];
        setParentChildren(Array.isArray(data) ? data : []);
      } catch {
        setParentChildren([]);
      }
    };

    void loadChildren();
  }, [role]);

  useEffect(() => {
    if (role === 'Parent' && pathname.startsWith('/parent/my-children')) {
      setChildrenMenuOpen(true);
    }
  }, [role, pathname]);

  if (!role) return null;

  const items = (navItems[role] ?? []).map((item) => {
    if (role === 'Teacher' && item.href === '/teacher/progress') {
      return {
        ...item,
        label: assignedClass ? `${assignedClass} Class` : 'My Class',
      };
    }
    return item;
  });

  return (
    <>
      <aside
        className={`relative hidden md:flex min-h-screen bg-[#1e3a5f] text-white flex-col shadow-xl transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className={`py-4 border-b border-[#2a4f7c] ${collapsed ? 'px-3' : 'px-6'}`}>
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} gap-3`}>
            <div className="flex items-center gap-3 min-w-0">
              <img src="/logo.png" alt="Bassonia Adventurer Club Logo" className="w-12 h-auto flex-shrink-0" />
              {!collapsed && (
                <div>
                  <p className="font-bold text-base leading-tight">Bassonia</p>
                  <p className="text-xs text-blue-300">Adventurer Club</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="group absolute top-1/2 -right-2.5 -translate-y-1/2 z-20 h-10 w-5 rounded-r-md rounded-l-sm bg-[#1e3a5f] text-white shadow-lg flex items-center justify-center"
        >
          <span className="text-[11px] leading-none transition-transform duration-150 group-hover:scale-90">
            {collapsed ? '>' : '<'}
          </span>
        </button>

        <div className={`py-4 border-b border-[#2a4f7c] ${collapsed ? 'px-2' : 'px-6'}`}>
          <p className={`text-sm font-semibold truncate ${collapsed ? 'text-center text-xs' : ''}`} title={user?.name ?? 'User'}>
            {collapsed ? (user?.name?.[0] ?? 'U') : (user?.name ?? 'User')}
          </p>
          {!collapsed && (
            <span className="inline-block mt-1 text-xs bg-yellow-400 text-[#1e3a5f] px-2 py-0.5 rounded-full font-semibold">
              {role}
            </span>
          )}
        </div>

        <nav className={`flex-1 py-4 overflow-y-auto ${collapsed ? 'px-2' : 'px-3'}`}>
          <ul className="space-y-1">
            {items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const isMyChildren = role === 'Parent' && item.href === '/parent/my-children';

              if (isMyChildren && !collapsed) {
                return (
                  <li key={`${item.href}-${item.label}`}>
                    <button
                      type="button"
                      onClick={() => setChildrenMenuOpen((prev) => !prev)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-yellow-400 text-[#1e3a5f]'
                          : 'text-blue-100 hover:bg-[#2a4f7c] hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span className="text-base">{item.icon}</span>
                        {item.label}
                      </span>
                      <span className={`text-xs transition-transform ${childrenMenuOpen ? 'rotate-180' : ''}`}>▼</span>
                    </button>
                    {childrenMenuOpen && (
                      <ul className="mt-1 ml-6 space-y-1 border-l border-[#3a5f8c] pl-3">
                        <li>
                          <Link
                            href="/parent/my-children"
                            className="block px-2 py-1.5 rounded text-xs text-blue-200 hover:text-white hover:bg-[#2a4f7c] transition-colors"
                          >
                            View all children
                          </Link>
                        </li>
                        {parentChildren.map((child) => (
                          <li key={`child-nav-${child.id}`}>
                            <Link
                              href={`/parent/my-children#child-${child.id}`}
                              className="block px-2 py-1.5 rounded text-xs text-blue-200 hover:text-white hover:bg-[#2a4f7c] transition-colors truncate"
                              title={child.name}
                            >
                              {child.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              }

              return (
                <li key={`${item.href}-${item.label}`}>
                  <Link
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-yellow-400 text-[#1e3a5f]'
                        : 'text-blue-100 hover:bg-[#2a4f7c] hover:text-white'
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    {!collapsed && item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className={`pb-4 border-t border-[#2a4f7c] pt-4 space-y-1 ${collapsed ? 'px-2' : 'px-3'}`}>
          <Link
            href="/song"
            title={collapsed ? 'Adventurer Song' : undefined}
            className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg text-xs text-blue-300 hover:bg-[#2a4f7c] hover:text-white transition-colors`}
          >
            <span>🎵</span>
            {!collapsed && 'Adventurer Song'}
          </Link>
          <Link
            href="/pledge"
            title={collapsed ? 'Pledge & Law' : undefined}
            className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg text-xs text-blue-300 hover:bg-[#2a4f7c] hover:text-white transition-colors`}
          >
            <span>✋</span>
            {!collapsed && 'Pledge & Law'}
          </Link>
          <button
            onClick={logout}
            title={collapsed ? 'Logout' : undefined}
            className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-lg text-sm text-red-300 hover:bg-red-900/30 hover:text-red-200 transition-colors`}
          >
            <span>🚪</span>
            {!collapsed && 'Logout'}
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            aria-label="Close menu"
            onClick={onCloseMobile}
            className="absolute inset-0 bg-black/50"
          />
          <aside className="absolute inset-0 bg-[#1e3a5f] text-white flex flex-col">
            <div className="px-6 py-4 border-b border-[#2a4f7c] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="Bassonia Adventurer Club Logo" className="w-12 h-auto flex-shrink-0" />
                <div>
                  <p className="font-bold text-base leading-tight">Bassonia</p>
                  <p className="text-xs text-blue-300">Adventurer Club</p>
                </div>
              </div>
              <button
                onClick={onCloseMobile}
                aria-label="Close menu"
                className="h-9 w-9 rounded-lg border border-[#3a5f8c] text-blue-100 hover:bg-[#2a4f7c] transition-colors"
              >
                X
              </button>
            </div>

            <div className="px-6 py-4 border-b border-[#2a4f7c]">
              <p className="text-sm font-semibold truncate">{user?.name ?? 'User'}</p>
              <span className="inline-block mt-1 text-xs bg-yellow-400 text-[#1e3a5f] px-2 py-0.5 rounded-full font-semibold">
                {role}
              </span>
            </div>

            <nav className="flex-1 px-4 py-4 overflow-y-auto">
              <ul className="space-y-2">
                {items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  const isMyChildren = role === 'Parent' && item.href === '/parent/my-children';

                  if (isMyChildren) {
                    return (
                      <li key={`${item.href}-${item.label}`}>
                        <button
                          type="button"
                          onClick={() => setChildrenMenuOpen((prev) => !prev)}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-yellow-400 text-[#1e3a5f]'
                              : 'text-blue-100 hover:bg-[#2a4f7c] hover:text-white'
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            <span className="text-base">{item.icon}</span>
                            {item.label}
                          </span>
                          <span className={`text-xs transition-transform ${childrenMenuOpen ? 'rotate-180' : ''}`}>▼</span>
                        </button>
                        {childrenMenuOpen && (
                          <ul className="mt-1 ml-5 space-y-1 border-l border-[#3a5f8c] pl-3">
                            <li>
                              <Link
                                href="/parent/my-children"
                                onClick={onCloseMobile}
                                className="block px-2 py-2 rounded text-xs text-blue-200 hover:text-white hover:bg-[#2a4f7c] transition-colors"
                              >
                                View all children
                              </Link>
                            </li>
                            {parentChildren.map((child) => (
                              <li key={`child-nav-mobile-${child.id}`}>
                                <Link
                                  href={`/parent/my-children#child-${child.id}`}
                                  onClick={onCloseMobile}
                                  className="block px-2 py-2 rounded text-xs text-blue-200 hover:text-white hover:bg-[#2a4f7c] transition-colors truncate"
                                  title={child.name}
                                >
                                  {child.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  }

                  return (
                    <li key={`${item.href}-${item.label}`}>
                      <Link
                        href={item.href}
                        onClick={onCloseMobile}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
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

            <div className="px-4 pb-6 border-t border-[#2a4f7c] pt-4 space-y-2">
              <Link
                href="/song"
                onClick={onCloseMobile}
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-blue-300 hover:bg-[#2a4f7c] hover:text-white transition-colors"
              >
                🎵 Adventurer Song
              </Link>
              <Link
                href="/pledge"
                onClick={onCloseMobile}
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-blue-300 hover:bg-[#2a4f7c] hover:text-white transition-colors"
              >
                ✋ Pledge &amp; Law
              </Link>
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-red-300 hover:bg-red-900/30 hover:text-red-200 transition-colors"
              >
                🚪 Logout
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
