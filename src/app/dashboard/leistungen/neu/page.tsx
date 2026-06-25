'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, addDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { MembershipDoc } from '@/types/firestore';
import { chfStringToRappen, formatCHF } from '@/lib/format';

const UNITS = ['Stunde', 'Tag', 'km', 'Stück', 'Pauschal', 'm²', 'kg'];

export default function NeueLeistungPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isBoss, setIsBoss] = useState(false);
  const [companyId, setCompanyId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('Stunde');
  const [priceInput, setPriceInput] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      if (!userSnap.exists()) { setIsLoading(false); return; }
      const cid = userSnap.data().defaultCompanyId;
      if (!cid) { setIsLoading(false); return; }
      setCompanyId(cid);
      const membershipSnap = await getDoc(doc(db, 'memberships', `${user.uid}_${cid}`));
      if (membershipSnap.exists()) setIsBoss((membershipSnap.data() as MembershipDoc).role === 'boss');
      setIsLoading(false);
    };
    load();
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError('Name ist erforderlich.'); return; }
    const priceRappen = chfStringToRappen(priceInput);
    if (priceRappen <= 0) { setError('Preis muss grösser als 0.00 CHF sein.'); return; }
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'companies', companyId, 'items'), {
        name: name.trim(),
        description: description.trim(),
        unit,
        priceRappen,
        active: true,
        createdAt: serverTimestamp(),
      });
      router.push('/dashboard/leistungen');
    } catch (err) {
      console.error(err);
      setError('Speichern fehlgeschlagen.');
      setIsSaving(false);
    }
  };

  const inputClass = "w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500";

  if (isLoading) return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <p className="text-gray-400">Wird geladen...</p>
    </div>
  );

  if (!isBoss) return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-6">
        <p className="text-yellow-700 dark:text-yellow-300 font-medium">Nur der Geschäftsführer kann Leistungen anlegen.</p>
      </div>
    </div>
  );

  const previewRappen = chfStringToRappen(priceInput);

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-8">
      <div className="mb-6">
        <Link href="/dashboard/leistungen" className="text-sm text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white">
          ← Zurück zu Leistungen
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-2 mb-1">Neue Leistung</h1>
        <p className="text-gray-500 dark:text-slate-400 text-sm">Erstellen Sie einen Eintrag, den Sie auf Rechnungen wiederverwenden können.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 space-y-4">

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-slate-300">
              Name <span className="text-red-500">*</span>
            </label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)}
              className={inputClass} placeholder="Name" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-slate-300">
              Beschreibung (optional)
            </label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              className={`${inputClass} resize-none`}
              placeholder="Beschreibung" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-slate-300">
                Einheit <span className="text-red-500">*</span>
              </label>
              <select value={unit} onChange={e => setUnit(e.target.value)} className={inputClass}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-slate-300">
                Preis (CHF) <span className="text-red-500">*</span>
              </label>
              <input type="text" required value={priceInput} onChange={e => setPriceInput(e.target.value)}
                className={`${inputClass} font-mono`} placeholder="80.00" />
            </div>
          </div>

          {previewRappen > 0 && (
            <div className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3">
              <p className="text-xs text-gray-400 dark:text-slate-400 mb-1">Vorschau auf der Rechnung:</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                <span className="font-mono">{formatCHF(previewRappen)}</span>
                <span className="text-gray-400 mx-2">·</span>
                <span>pro {unit}</span>
              </p>
            </div>
          )}
        </section>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-200 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Link href="/dashboard/leistungen"
            className="px-6 py-3 text-gray-500 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white text-sm font-medium">
            Abbrechen
          </Link>
          <button type="submit" disabled={isSaving}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors">
            {isSaving ? 'Wird gespeichert...' : 'Speichern'}
          </button>
        </div>
      </form>
    </div>
  );
}