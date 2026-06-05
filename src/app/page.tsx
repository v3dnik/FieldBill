'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [user, loading, router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">FieldBill</h1>
        <p className="text-slate-400">Wird geladen...</p>
      </div>
      <footer className="absolute bottom-6 flex flex-wrap gap-4 justify-center text-xs text-slate-500">
        <Link href="/impressum" className="hover:text-slate-300 transition-colors">Impressum</Link>
        <Link href="/agb" className="hover:text-slate-300 transition-colors">AGB</Link>
        <Link href="/datenschutz" className="hover:text-slate-300 transition-colors">Datenschutz</Link>
        <Link href="/pricing" className="hover:text-slate-300 transition-colors">Preise</Link>
      </footer>
    </main>
  );
}