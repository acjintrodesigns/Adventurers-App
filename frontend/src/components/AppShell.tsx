'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/contexts/AuthContext';

const noSidebarPaths = ['/login', '/register', '/'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const showSidebar = user && !noSidebarPaths.includes(pathname);
  const showFloatingChat = showSidebar && pathname !== '/chat' && user?.role !== 'Donor';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1e3a5f]">
        <div className="font-lyla text-white text-3xl animate-pulse tracking-wide">Loading...</div>
      </div>
    );
  }

  if (!showSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-[#f6f8fb]">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="md:hidden sticky top-0 z-40 bg-[#1e3a5f] text-white px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
              className="h-10 w-10 rounded-lg border border-[#3a5f8c] hover:bg-[#2a4f7c] transition-colors flex flex-col items-center justify-center gap-1"
            >
              <span className="block w-4 h-0.5 bg-white rounded" />
              <span className="block w-4 h-0.5 bg-white rounded" />
              <span className="block w-4 h-0.5 bg-white rounded" />
            </button>
            <p className="text-sm font-semibold truncate px-3">Bassonia Adventurer Club</p>
            <div className="w-10" />
          </div>
        </div>
        {children}

      </main>

      {showFloatingChat && (
        <div className="fixed bottom-6 right-6 z-50">
          <Link
            href="/chat"
            aria-label="Open chat"
            title="Open chat"
            className="relative block h-14 w-14 rounded-full border-2 border-white bg-[#1e3a5f] shadow-xl hover:scale-105 transition-transform flex items-center justify-center"
          >
            <img
              src="/logo.png"
              alt="Adventurer badge"
              className="h-10 w-10 rounded-full object-cover"
            />
            {/* Speech-bubble tail — CSS triangle pointing bottom-right */}
            <span aria-hidden="true" style={{ position:'absolute', bottom:'-11px', right:'6px', width:0, height:0, borderTop:'11px solid white', borderLeft:'11px solid transparent' }} />
            <span aria-hidden="true" style={{ position:'absolute', bottom:'-8px', right:'8px', width:0, height:0, borderTop:'9px solid #1e3a5f', borderLeft:'9px solid transparent' }} />
          </Link>
        </div>
      )}
    </div>
  );
}
