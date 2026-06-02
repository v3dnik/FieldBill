'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { UserRole } from '@/types/firestore';

type NavItem = {
  href: string;
  label: string;
  icon: string;
  bossOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Übersicht', icon: '🏠' },
  { href: '/dashboard/rechnungen', label: 'Rechnungen', icon: '🧾' },
  { href: '/dashboard/ausgaben', label: 'Ausgaben', icon: '💸' },
  { href: '/dashboard/bilanz', label: 'Bilanz', icon: '📊' },
  { href: '/dashboard/firma', label: 'Firma', icon: '🏢', bossOnly: true },
  { href: '/dashboard/leistungen', label: 'Leistungen', icon: '📦' },
  { href: '/dashboard/mitarbeiter', label: 'Mitarbeiter', icon: '👥', bossOnly: true },
  { href: '/dashboard/einstellungen', label: 'Einstellungen', icon: '⚙️' },
];

type NavigationProps = {
  role: UserRole;
};

function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  const isDark = theme === 'dark';

  if (compact) {
    return (
      <button
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className="w-9 h-9 flex items-center justify-center rounded-full
                   bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600
                   transition-colors"
        title="Tema umschalten"
      >
        <span className="text-base">{isDark ? '☀️' : '🌙'}</span>
      </button>
    );
  }

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium
                 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700
                 hover:text-gray-900 dark:hover:text-white transition-colors"
    >
      <span className="text-lg">{isDark ? '☀️' : '🌙'}</span>
      <span>{isDark ? 'Helles Design' : 'Dunkles Design'}</span>
    </button>
  );
}

export default function Navigation({ role }: NavigationProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = NAV_ITEMS.filter(item => !item.bossOnly || role === 'boss');

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  // Zapri meni ob navigaciji
  const handleNavClick = () => setMobileOpen(false);

  return (
    <>
      {/* ═══════ DESKTOP SIDEBAR ═══════ */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 md:left-0
                        bg-white dark:bg-slate-800
                        border-r border-gray-200 dark:border-slate-700">
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-gray-200 dark:border-slate-700">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">FieldBill</h1>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {items.map(item => (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white'
              }`}>
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Theme toggle */}
        <div className="px-3 py-4 border-t border-gray-200 dark:border-slate-700">
          <ThemeToggle />
        </div>
      </aside>

      {/* ═══════ MOBILE HEADER ═══════ */}
      <header className="md:hidden fixed top-0 inset-x-0 z-50
                         bg-white dark:bg-slate-800
                         border-b border-gray-200 dark:border-slate-700
                         flex items-center justify-between px-4 h-14">
        {/* Logo */}
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">FieldBill</h1>

        {/* Right side: ThemeToggle + Hamburger */}
        <div className="flex items-center gap-2">
          <ThemeToggle compact />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="w-9 h-9 flex items-center justify-center rounded-lg
                       bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600
                       transition-colors"
            aria-label="Menü öffnen"
          >
            {mobileOpen ? (
              // X icon
              <svg className="w-5 h-5 text-gray-700 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              // Hamburger icon
              <svg className="w-5 h-5 text-gray-700 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* ═══════ MOBILE MENU OVERLAY ═══════ */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          {/* Slide-in menu */}
          <div className="md:hidden fixed top-14 right-0 bottom-0 z-50 w-72
                          bg-white dark:bg-slate-800
                          border-l border-gray-200 dark:border-slate-700
                          shadow-2xl flex flex-col">

            {/* Nav links */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {items.map(item => (
                <Link key={item.href} href={item.href} onClick={handleNavClick}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white'
                  }`}>
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            {/* Footer */}
            <div className="px-3 py-4 border-t border-gray-200 dark:border-slate-700">
              <p className="text-xs text-gray-400 dark:text-slate-500 text-center">
                FieldBill — Vodnik Digital Solutions
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}