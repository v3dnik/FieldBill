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

// ── ThemeToggle (inline, ne potrebuje ločene datoteke) ──────────────────────
function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark = theme === 'dark';

  if (compact) {
    // Mala okrogla verzija za mobile
    return (
      <button
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className="w-9 h-9 flex items-center justify-center rounded-full
                   bg-slate-700 hover:bg-slate-600 dark:bg-slate-600 dark:hover:bg-slate-500
                   transition-colors shadow-md"
        title="Tema umschalten"
      >
        <span className="text-base">{isDark ? '☀️' : '🌙'}</span>
      </button>
    );
  }

  // Široka verzija za sidebar
  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium
                 text-slate-300 hover:bg-slate-700 hover:text-white
                 dark:text-slate-300 dark:hover:bg-slate-700
                 transition-colors"
      title="Tema umschalten"
    >
      <span className="text-lg">{isDark ? '☀️' : '🌙'}</span>
      <span>{isDark ? 'Helles Design' : 'Dunkles Design'}</span>
    </button>
  );
}

// ────────────────────────────────────────────────────────────────────────────

export default function Navigation({ role }: NavigationProps) {
  const pathname = usePathname();

  const items = NAV_ITEMS.filter((item) => !item.bossOnly || role === 'boss');

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

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
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* ── Sidebar Footer: ThemeToggle ── */}
        <div className="px-3 py-4 border-t border-gray-200 dark:border-slate-700">
          <ThemeToggle />
        </div>
      </aside>

      {/* ═══════ MOBILE: ThemeToggle gumb (zgoraj desno, nad content) ═══════ */}
      <div className="md:hidden fixed top-3 right-3 z-50">
        <ThemeToggle compact />
      </div>

      {/* ═══════ MOBILE BOTTOM NAV ═══════ */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 z-40">
        <div
          className="grid gap-1 px-2 py-2"
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
        >
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 py-2 rounded-md text-xs font-medium transition-colors ${
                isActive(item.href)
                  ? 'text-blue-500 dark:text-blue-400'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] leading-tight">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}