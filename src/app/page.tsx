'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (user) {
      // Prijavljen → dashboard
      router.push('/dashboard');
    } else {
      // Neprijavljen → login
      router.push('/login');
    }
  }, [user, loading, router]);

  // Med preusmerjanjem prikaži loading
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">FieldBill</h1>
        <p className="text-slate-400">Wird geladen...</p>
      </div>
</main>
);
}