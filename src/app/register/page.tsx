'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';

export default function RegisterPage() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (password.length < 6) {
      setError('Das Passwort muss mindestens 6 Zeichen lang sein.');
      setIsLoading(false);
      return;
    }

    try {
      const firebaseUser = await signUp(email, password);
      const companyId = firebaseUser.uid;

      await setDoc(doc(db, 'users', firebaseUser.uid), {
        uid: firebaseUser.uid,
        email: email,
        firstName: firstName,
        lastName: lastName,
        defaultCompanyId: companyId,
        createdAt: serverTimestamp(),
      });

      await setDoc(doc(db, 'companies', companyId), {
        companyId: companyId,
        ownerId: firebaseUser.uid,
        name: companyName,
        phone: companyPhone,
        contactEmail: email,
        address: { street: '', zip: '', city: '', country: 'CH' },
        logoUrl: '',
        logoStoragePath: '',
        vatRate: 0.081,
        currency: 'CHF',
        invoiceSettings: {
          numberTemplate: 'RE-{YYYY}-{NUM4}',
          nextNumber: 1,
          resetYearly: true,
        },
        createdAt: serverTimestamp(),
      });

      const membershipId = `${firebaseUser.uid}_${companyId}`;
      await setDoc(doc(db, 'memberships', membershipId), {
        membershipId: membershipId,
        uid: firebaseUser.uid,
        companyId: companyId,
        role: 'boss',
        active: true,
        displayName: `${firstName} ${lastName}`,
        joinedAt: serverTimestamp(),
      });

      router.push('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      if (message.includes('auth/email-already-in-use')) {
        setError('Diese E-Mail-Adresse wird bereits verwendet.');
      } else if (message.includes('auth/invalid-email')) {
        setError('Ungültige E-Mail-Adresse.');
      } else if (message.includes('auth/weak-password')) {
        setError('Das Passwort ist zu schwach.');
      } else {
        setError('Registrierung fehlgeschlagen. Bitte erneut versuchen.');
      }
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">FieldBill</h1>
          <p className="text-slate-400">Firma registrieren</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-slate-800 p-6 rounded-lg border border-slate-700">
          <h2 className="text-lg font-semibold border-b border-slate-700 pb-2">Ihre Daten</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium mb-2 text-slate-300">Vorname</label>
              <input
                id="firstName"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500"
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium mb-2 text-slate-300">Nachname</label>
              <input
                id="lastName"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2 text-slate-300">E-Mail</label>
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

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2 text-slate-300">
              Passwort <span className="text-xs text-slate-500 ml-2">(mind. 6 Zeichen)</span>
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500"
              placeholder="••••••••"
              disabled={isLoading}
            />
          </div>

          <h2 className="text-lg font-semibold border-b border-slate-700 pb-2 pt-4">Ihre Firma</h2>

          <div>
            <label htmlFor="companyName" className="block text-sm font-medium mb-2 text-slate-300">Firmenname</label>
            <input
              id="companyName"
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500"
              placeholder="z.B. Müller Umzüge GmbH"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="companyPhone" className="block text-sm font-medium mb-2 text-slate-300">Telefon</label>
            <input
              id="companyPhone"
              type="tel"
              required
              value={companyPhone}
              onChange={(e) => setCompanyPhone(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500"
              placeholder="+41 79 123 45 67"
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-200 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium py-3 rounded-md transition-colors"
          >
            {isLoading ? 'Wird registriert...' : 'Registrieren'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-slate-400">
          Bereits ein Konto?{' '}
          <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">
            Anmelden
          </Link>
        </p>
      </div>
    </main>
  );
}