'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { Bell, Menu, User } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { useAlertStore } from '@/stores/alert-store';

export function TopBar() {
  const pathname = usePathname();
  const { toggleSidebar, sidebarOpen } = useUIStore();
  const { alerts } = useAlertStore();
  const { data: session } = useSession();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const unreadAlertsCount = alerts.filter(a => !a.resolved).length;

  // The menu could previously only be closed by tapping the avatar again, which
  // left keyboard and screen reader users with an open menu they could not get
  // rid of, so close it on Escape and on any click outside.
  useEffect(() => {
    if (!userMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setUserMenuOpen(false);
    };
    const handlePointerDown = (event: MouseEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [userMenuOpen]);

  const getPageTitle = () => {
    if (pathname.includes('/dashboard')) return 'Dashboard';
    if (pathname.includes('/elders')) return 'Elder Management';
    if (pathname.includes('/alerts')) return 'Alerts & Notifications';
    if (pathname.includes('/settings')) return 'Settings';
    return 'SaralGati';
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 lg:px-8">
      <div className="flex flex-1 items-center justify-between">
        <div className="flex items-center">
          <button
            type="button"
            className="mr-4 rounded-md text-gray-500 lg:hidden hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0074c8]"
            onClick={toggleSidebar}
            aria-label="Toggle navigation"
            aria-controls="app-sidebar"
            aria-expanded={sidebarOpen}
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900">{getPageTitle()}</h1>
        </div>

        <div className="flex items-center space-x-4">
          <Link
            href="/alerts"
            className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0074c8]"
            title="View Alerts"
            aria-label={
              unreadAlertsCount > 0
                ? `View alerts, ${unreadAlertsCount} unresolved`
                : 'View alerts'
            }
          >
            <Bell className="h-6 w-6" aria-hidden="true" />
            {unreadAlertsCount > 0 && (
              // Decorative: the count is already announced by the link label.
              <span
                aria-hidden="true"
                className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white"
              >
                {unreadAlertsCount > 9 ? '9+' : unreadAlertsCount}
              </span>
            )}
          </Link>

          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0074c8] focus:ring-offset-2"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              aria-label="Account menu"
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
            >
              <User className="h-5 w-5" aria-hidden="true" />
            </button>

            {userMenuOpen && (
              <div
                role="menu"
                aria-label="Account menu"
                className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
              >
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900 truncate">{session?.user?.name || 'Signed in'}</p>
                  {/* No placeholder address: an invented address reads as real data. */}
                  {session?.user?.email && (
                    <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
                  )}
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => signOut()}
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:bg-gray-100"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
