'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Reset password state
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await signIn(email, password);
      router.push('/dashboard');
    } catch (err) {
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

  const handlePasswordReset = async () => {
    setResetError('');
    if (!resetEmail.trim()) { setResetError('Bitte E-Mail eingeben.'); return; }
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
      setResetSent(true);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setResetError('Kein Konto mit dieser E-Mail gefunden.');
      } else {
        setResetError('Fehler beim Senden. Bitte erneut versuchen.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 p-6">
      <div className="w-full max-w-md">

        {/* Logo + Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <Image
              src="/fieldbill-logo.png"
              alt="FieldBill Logo"
              width={100}
              height={100}
              priority
              className="rounded-2xl shadow-lg"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">FieldBill</h1>
          <p className="text-gray-500 dark:text-slate-400">Willkommen zurück</p>
        </div>

        {/* ── LOGIN FORM ── */}
        {!showReset ? (
          <form onSubmit={handleSubmit}
            className="space-y-4 bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2 text-gray-700 dark:text-slate-300">
                E-Mail
              </label>
              <input
                id="email" type="email" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="E-Mail"
                disabled={isLoading}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Passwort
                </label>
                <button
                  type="button"
                  onClick={() => { setShowReset(true); setResetEmail(email); }}
                  className="text-xs text-blue-500 dark:text-blue-400 hover:underline"
                >
                  Passwort vergessen?
                </button>
              </div>
              <input
                id="password" type="password" required
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>

            {/* Angemeldet bleiben */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="remember" className="text-sm text-gray-600 dark:text-slate-400 cursor-pointer select-none">
                Angemeldet bleiben
              </label>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-200 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit" disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-slate-700 disabled:text-gray-500 dark:disabled:text-slate-500 text-white font-medium py-3 rounded-lg transition-colors"
            >
              {isLoading ? 'Wird angemeldet...' : 'Anmelden'}
            </button>
          </form>

        ) : (
          /* ── PASSWORT RESET FORM ── */
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-4">

            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Passwort zurücksetzen</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                Wir senden Ihnen einen Reset-Link per E-Mail.
              </p>
            </div>

            {resetSent ? (
              <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 px-4 py-4 rounded-lg text-sm text-center">
                <p className="text-2xl mb-2">✉️</p>
                <p className="font-medium">E-Mail gesendet!</p>
                <p className="mt-1 text-xs">Prüfen Sie Ihr Postfach und klicken Sie auf den Link.</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-slate-300">
                    E-Mail
                  </label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="E-Mail"
                  />
                </div>

                {resetError && (
                  <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-200 px-4 py-3 rounded-lg text-sm">
                    {resetError}
                  </div>
                )}

                <button
                  onClick={handlePasswordReset} disabled={resetLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors"
                >
                  {resetLoading ? 'Wird gesendet...' : 'Reset-Link senden'}
                </button>
              </>
            )}

            <button
              onClick={() => { setShowReset(false); setResetSent(false); setResetError(''); }}
              className="w-full text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white transition-colors"
            >
              ← Zurück zum Login
            </button>
          </div>
        )}

        <div className="mt-6 space-y-2 text-center text-sm text-gray-500 dark:text-slate-400">
          <p>
            Neue Firma?{' '}
            <Link href="/register" className="text-blue-500 dark:text-blue-400 hover:underline font-medium">
              Jetzt registrieren
            </Link>
          </p>
          <p className="text-xs text-gray-400 dark:text-slate-500">
            Mitarbeiter? Registrierung nur mit Einladungslink vom Chef möglich.
          </p>
        </div>

        <p className="text-center mt-4 text-xs text-gray-400 dark:text-slate-600">
          Entwickelt von{' '}
          <a href="https://www.vodnik.ch" target="_blank" rel="noopener noreferrer"
            className="text-blue-400 hover:underline">
            Vodnik Digital Solutions
          </a>
        </p>
      </div>
    </main>
  );
}