'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { InvitationDoc } from '@/types/firestore';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signUp } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Invite state
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<InvitationDoc | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [companyNameDisplay, setCompanyNameDisplay] = useState('');

  // Preberi ?invite= parameter
  useEffect(() => {
    const token = searchParams.get('invite');
    if (!token) return;
    setInviteToken(token);
    loadInvitation(token);
  }, [searchParams]);

  const loadInvitation = async (token: string) => {
    setInviteLoading(true);
    try {
      // Poišči invitation po tokenu — shranjen v /invitations/{token}
      const inviteSnap = await getDoc(doc(db, 'invitations', token));
      if (!inviteSnap.exists()) {
        setInviteError('Einladungslink ist ungültig oder abgelaufen.');
        return;
      }
      const inv = inviteSnap.data() as InvitationDoc;

      // Preveri če je že uporabljen
      if (inv.used) {
        setInviteError('Dieser Einladungslink wurde bereits verwendet.');
        return;
      }

      // Preveri expiry
      if (inv.expiresAt.toDate() < new Date()) {
        setInviteError('Dieser Einladungslink ist abgelaufen (7 Tage).');
        return;
      }

      // Naloži ime firme
      const companySnap = await getDoc(doc(db, 'companies', inv.companyId));
      if (companySnap.exists()) {
        setCompanyNameDisplay(companySnap.data().name || '');
      }

      // Predizpolni email če je v invitaciji
      if (inv.email) setEmail(inv.email);

      setInvitation(inv);
    } catch (err) {
      setInviteError('Fehler beim Laden der Einladung.');
    } finally {
      setInviteLoading(false);
    }
  };

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

      if (invitation) {
        // ── MITARBEITER REGISTRIERUNG (mit Einladung) ──
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          uid: firebaseUser.uid,
          email,
          firstName,
          lastName,
          defaultCompanyId: invitation.companyId,
          createdAt: serverTimestamp(),
        });

        const membershipId = `${firebaseUser.uid}_${invitation.companyId}`;
        await setDoc(doc(db, 'memberships', membershipId), {
          membershipId,
          uid: firebaseUser.uid,
          companyId: invitation.companyId,
          role: invitation.role,
          active: true,
          displayName: `${firstName} ${lastName}`,
          joinedAt: serverTimestamp(),
        });

        // Označimo invitation kot used
        await updateDoc(doc(db, 'invitations', inviteToken!), {
          used: true,
          usedBy: firebaseUser.uid,
        });

      } else {
        // ── BOSS REGISTRIERUNG (neue Firma) ──
        const companyId = firebaseUser.uid;

        await setDoc(doc(db, 'users', firebaseUser.uid), {
          uid: firebaseUser.uid,
          email,
          firstName,
          lastName,
          defaultCompanyId: companyId,
          createdAt: serverTimestamp(),
        });

        await setDoc(doc(db, 'companies', companyId), {
          companyId,
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

        await setDoc(doc(db, 'memberships', `${firebaseUser.uid}_${companyId}`), {
          membershipId: `${firebaseUser.uid}_${companyId}`,
          uid: firebaseUser.uid,
          companyId,
          role: 'boss',
          active: true,
          displayName: `${firstName} ${lastName}`,
          joinedAt: serverTimestamp(),
        });
      }

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

  const inputClass = "w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors";
  const labelClass = "block text-sm font-medium mb-2 text-gray-700 dark:text-slate-300";

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 p-6">
      <div className="w-full max-w-md">

        {/* Logo + Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <Image src="/fieldbill-logo.png" alt="FieldBill Logo" width={90} height={90}
              priority className="rounded-2xl shadow-lg" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">FieldBill</h1>
          <p className="text-gray-500 dark:text-slate-400">
            {invitation ? `Einladung von ${companyNameDisplay}` : 'Firma registrieren'}
          </p>
        </div>

        {/* Invite loading */}
        {inviteLoading && (
          <div className="text-center py-8 text-gray-400">Einladung wird geprüft...</div>
        )}

        {/* Invite error */}
        {inviteError && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-300 px-4 py-4 rounded-xl text-sm text-center mb-6">
            <p className="text-2xl mb-2">⚠️</p>
            <p>{inviteError}</p>
            <Link href="/register" className="text-blue-500 hover:underline mt-2 inline-block">
              Ohne Einladung registrieren
            </Link>
          </div>
        )}

        {/* Invite banner */}
        {invitation && !inviteError && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl px-4 py-3 mb-6 text-center">
            <p className="text-green-700 dark:text-green-300 text-sm font-medium">
              🎉 Sie wurden eingeladen, bei <strong>{companyNameDisplay}</strong> als{' '}
              <strong>{invitation.role === 'boss' ? 'Geschäftsführer' : 'Mitarbeiter'}</strong> beizutreten!
            </p>
          </div>
        )}

        {/* Form */}
        {!inviteLoading && !inviteError && (
          <form onSubmit={handleSubmit}
            className="space-y-4 bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">

            {/* Ihre Daten */}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-slate-700 pb-2">
              Ihre Daten
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Vorname</label>
                <input type="text" required value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className={inputClass} disabled={isLoading} />
              </div>
              <div>
                <label className={labelClass}>Nachname</label>
                <input type="text" required value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className={inputClass} disabled={isLoading} />
              </div>
            </div>

            <div>
              <label className={labelClass}>E-Mail</label>
              <input type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                className={inputClass} placeholder="name@firma.ch"
                disabled={isLoading} />
            </div>

            <div>
              <label className={labelClass}>
                Passwort <span className="text-xs text-gray-400 ml-1">(mind. 6 Zeichen)</span>
              </label>
              <input type="password" required minLength={6} value={password}
                onChange={e => setPassword(e.target.value)}
                className={inputClass} placeholder="••••••••"
                disabled={isLoading} />
            </div>

            {/* Ihre Firma — NUR ohne Einladung */}
            {!invitation && (
              <>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-slate-700 pb-2 pt-2">
                  Ihre Firma
                </h2>
                <div>
                  <label className={labelClass}>Firmenname</label>
                  <input type="text" required value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    className={inputClass} placeholder="z.B. Müller Umzüge GmbH"
                    disabled={isLoading} />
                </div>
                <div>
                  <label className={labelClass}>Telefon</label>
                  <input type="tel" required value={companyPhone}
                    onChange={e => setCompanyPhone(e.target.value)}
                    className={inputClass} placeholder="+41 79 123 45 67"
                    disabled={isLoading} />
                </div>
              </>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-200 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button type="submit" disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors">
              {isLoading ? 'Wird registriert...' : invitation ? 'Konto erstellen & beitreten' : 'Registrieren'}
            </button>
          </form>
        )}

        <p className="text-center mt-6 text-sm text-gray-500 dark:text-slate-400">
          Bereits ein Konto?{' '}
          <Link href="/login" className="text-blue-500 dark:text-blue-400 hover:underline font-medium">
            Anmelden
          </Link>
        </p>

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