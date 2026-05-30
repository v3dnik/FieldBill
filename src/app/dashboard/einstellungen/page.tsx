'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  signOut,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function EinstellungenPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const handlePasswordChange = async () => {
    setPwError('');
    setPwSuccess('');

    if (!currentPassword) { setPwError('Aktuelles Passwort erforderlich.'); return; }
    if (!newPassword) { setPwError('Neues Passwort erforderlich.'); return; }
    if (newPassword.length < 6) { setPwError('Passwort muss mindestens 6 Zeichen haben.'); return; }
    if (newPassword !== confirmPassword) { setPwError('Passwörter stimmen nicht überein.'); return; }

    setPwLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user!.email!, currentPassword);
      await reauthenticateWithCredential(user!, credential);
      await updatePassword(user!, newPassword);
      setPwSuccess('Passwort wurde erfolgreich geändert.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setPwError('Aktuelles Passwort ist falsch.');
      } else {
        setPwError('Fehler: ' + (err?.message || 'Unbekannt'));
      }
    } finally {
      setPwLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">

      <div>
        <h1 className="text-2xl font-bold text-white">Einstellungen</h1>
        <p className="text-gray-400 mt-1">Konto und Sicherheit.</p>
      </div>

      {/* Konto Info */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Konto</h2>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
            {user?.email?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="text-white font-medium">{user?.email}</p>
            <p className="text-gray-400 text-sm">Angemeldet</p>
          </div>
        </div>
      </div>

      {/* Passwort ändern */}
      <div className="bg-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Passwort ändern</h2>

        {pwError && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
            {pwError}
          </div>
        )}
        {pwSuccess && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg text-sm">
            {pwSuccess}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Aktuelles Passwort
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Neues Passwort
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Passwort bestätigen
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <button
          onClick={handlePasswordChange}
          disabled={pwLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
        >
          {pwLoading ? 'Wird gespeichert...' : 'Passwort ändern'}
        </button>
      </div>

      {/* Abmelden */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-2">Abmelden</h2>
        <p className="text-gray-400 text-sm mb-4">Sie werden von Ihrem Konto abgemeldet.</p>
        <button
          onClick={handleSignOut}
          className="w-full bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 font-medium py-2.5 rounded-lg transition-colors"
        >
          Abmelden
        </button>
      </div>

    </div>
  );
}