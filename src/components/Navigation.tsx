'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

export default function Navigation({ role }: NavigationProps) {
  const pathname = usePathname();

  // Filtriraj boss-only postavke za zaposlene
  const items = NAV_ITEMS.filter((item) => !item.bossOnly || role === 'boss');

  // Helper: ali je trenutna pot aktivna?
  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* ═══════ DESKTOP SIDEBAR (≥ md = 768px) ═══════ */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 md:left-0 md:bg-slate-800 md:border-r md:border-slate-700">
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-slate-700">
          <h1 className="text-xl font-bold text-white">FieldBill</h1>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* ═══════ MOBILE BOTTOM NAV (< md) ═══════ */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-slate-800 border-t border-slate-700 z-50">
        <div className={`grid gap-1 px-2 py-2`} style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 py-2 rounded-md text-xs font-medium transition-colors ${
                isActive(item.href)
                  ? 'text-blue-400'
                  : 'text-slate-400 hover:text-white'
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