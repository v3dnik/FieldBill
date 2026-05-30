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

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('Stunde');
  const [priceInput, setPriceInput] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!user) return;

      const userSnap = await getDoc(doc(db, 'users', user.uid));
      if (!userSnap.exists()) {
        setIsLoading(false);
        return;
      }

      const cid = userSnap.data().defaultCompanyId;
      if (!cid) {
        setIsLoading(false);
        return;
      }

      setCompanyId(cid);

      const membershipSnap = await getDoc(doc(db, 'memberships', `${user.uid}_${cid}`));
      if (membershipSnap.exists()) {
        const m = membershipSnap.data() as MembershipDoc;
        setIsBoss(m.role === 'boss');
      }

      setIsLoading(false);
    };

    load();
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Name ist erforderlich.');
      return;
    }

    const priceRappen = chfStringToRappen(priceInput);
    if (priceRappen <= 0) {
      setError('Preis muss grösser als 0.00 CHF sein.');
      return;
    }

    setIsSaving(true);

    try {
      const itemsRef = collection(db, 'companies', companyId, 'items');
      await addDoc(itemsRef, {
        name: name.trim(),
        description: description.trim(),
        unit: unit,
        priceRappen: priceRappen,
        active: true,
        createdAt: serverTimestamp(),
      });

      router.push('/dashboard/leistungen');
    } catch (err) {
      console.error('Fehler beim Speichern:', err);
      setError('Speichern fehlgeschlagen.');
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-8">
        <p className="text-slate-400">Wird geladen...</p>
      </div>
    );
  }

  if (!isBoss) {
    return (
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-8">
        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-6">
          <p className="text-yellow-300 font-medium">
            Nur der Geschäftsführer kann Leistungen anlegen.
          </p>
        </div>
      </div>
    );
  }

  const previewRappen = chfStringToRappen(priceInput);

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-8">
      <div className="mb-6 md:mb-8">
        <Link
          href="/dashboard/leistungen"
          className="text-sm text-slate-400 hover:text-white"
        >
          ← Zurück zu Leistungen
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold mt-2 mb-2">Neue Leistung</h1>
        <p className="text-slate-400 text-sm">
          Erstellen Sie einen Eintrag, den Sie auf Rechnungen wiederverwenden können.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-300">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500"
              placeholder="z.B. Umzug pro Stunde"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-300">
              Beschreibung (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500 resize-none"
              placeholder="z.B. inklusive Verpackungsmaterial und 2 Mitarbeiter"
            />
          </div>

          {/* Unit + Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-300">
                Einheit <span className="text-red-400">*</span>
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-300">
                Preis (CHF) <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500 font-mono"
                placeholder="80.00"
              />
            </div>
          </div>

          {/* Preview */}
          {previewRappen > 0 && (
            <div className="bg-slate-900 border border-slate-700 rounded-md p-3">
              <p className="text-xs text-slate-400 mb-1">Vorschau auf der Rechnung:</p>
              <p className="text-sm font-medium">
                <span className="font-mono">{formatCHF(previewRappen)}</span>
                <span className="text-slate-400 mx-2">·</span>
                <span>pro {unit}</span>
              </p>
            </div>
          )}
        </section>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-200 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link
            href="/dashboard/leistungen"
            className="px-6 py-3 text-slate-300 hover:text-white text-sm font-medium"
          >
            Abbrechen
          </Link>
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white font-medium rounded-md transition-colors"
          >
            {isSaving ? 'Wird gespeichert...' : 'Speichern'}
          </button>
        </div>
      </form>
    </div>
  );
}