'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();

  // State za polja obrazca
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Obvladovanje submit obrazca
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await signIn(email, password);
      // Po uspešni prijavi → dashboard
      router.push('/dashboard');
    } catch (err) {
      // Firebase nam vrne kodo napake (npr. "auth/wrong-password")
      // V MVP-ju prikažemo splošno sporočilo
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';

      if (message.includes('auth/invalid-credential') || message.includes('auth/wrong-password')) {
        setError('Falsche E-Mail oder Passwort.');
      } else if (message.includes('auth/user-not-found')) {
        setError('Kein Konto mit dieser E-Mail gefunden.');
      } else if (message.includes('auth/too-many-requests')) {
        setError('Zu viele Versuche. Bitte später erneut versuchen.');
      } else {
        setError('Anmeldung fehlgeschlagen. Bitte erneut versuchen.');
      }
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6">
      <div className="w-full max-w-md">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">FieldBill</h1>
          <p className="text-slate-400">Anmelden</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 bg-slate-800 p-6 rounded-lg border border-slate-700">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2 text-slate-300">
              E-Mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500"
              placeholder="name@firma.ch"
              disabled={isLoading}
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2 text-slate-300">
              Passwort
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500"
              placeholder="••••••••"
              disabled={isLoading}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-200 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium py-3 rounded-md transition-colors"
          >
            {isLoading ? 'Wird angemeldet...' : 'Anmelden'}
          </button>
        </form>

        {/* Link to register */}
        <p className="text-center mt-6 text-sm text-slate-400">
          Noch kein Konto?{' '}
          <Link href="/register" className="text-blue-400 hover:text-blue-300 font-medium">
            Firma registrieren
          </Link>
        </p>
      </div>
    </main>
  );
}