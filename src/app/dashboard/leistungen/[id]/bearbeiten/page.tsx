'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { ItemDoc } from '@/types/firestore';

const EINHEITEN = [
  { value: 'Stunde', label: 'pro Stunde' },
  { value: 'km', label: 'pro km' },
  { value: 'Pauschal', label: 'pro Pauschal' },
  { value: 'Stück', label: 'pro Stück' },
  { value: 'Tag', label: 'pro Tag' },
  { value: 'm²', label: 'pro m²' },
];

export default function LeistungBearbeitenPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [preisChf, setPreisChf] = useState('');
  const [unit, setUnit] = useState('Stunde');

  useEffect(() => {
    if (!user) return;

    const fetchLeistung = async () => {
      try {
        // Korak 1: dobimo companyId iz user dokumenta
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          setError('Fehler: Benutzer nicht gefunden.');
          setLoading(false);
          return;
        }

        const companyId = userSnap.data().defaultCompanyId;

        if (!companyId) {
          setError('Fehler: Keine Firma gefunden.');
          setLoading(false);
          return;
        }

        // Korak 2: beremo item iz /companies/{companyId}/items/{id}
        const itemRef = doc(db, 'companies', companyId, 'items', id);
        const itemSnap = await getDoc(itemRef);

        if (!itemSnap.exists()) {
          setError('Fehler: Leistung nicht gefunden. ID=' + id);
          setLoading(false);
          return;
        }

        const data = itemSnap.data() as ItemDoc;
        setName(data.name || '');
        setDescription(data.description || '');
        setPreisChf(data.priceRappen ? (data.priceRappen / 100).toFixed(2) : '');
        setUnit(data.unit || 'Stunde');
      } catch (err: any) {
        setError('Fehler: ' + (err?.message || err?.code || 'Unbekannt'));
      } finally {
        setLoading(false);
      }
    };

    fetchLeistung();
  }, [user, id]);

  const handleSubmit = async () => {
    if (!user) return;
    if (!name.trim()) { setError('Name ist erforderlich.'); return; }
    if (!preisChf || isNaN(parseFloat(preisChf))) { setError('Gültiger Preis erforderlich.'); return; }

    setSaving(true);
    setError('');

    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      const companyId = userSnap.data()?.defaultCompanyId;
      if (!companyId) throw new Error('Keine companyId gefunden');

      const itemRef = doc(db, 'companies', companyId, 'items', id);
      const priceRappen = Math.round(parseFloat(preisChf) * 100);

      await updateDoc(itemRef, {
        name: name.trim(),
        description: description.trim(),
        unit,
        priceRappen,
        updatedAt: new Date(),
      });
      router.push('/dashboard/leistungen');
    } catch (err: any) {
      setError('Fehler beim Speichern: ' + (err?.message || err?.code || 'Unbekannt'));
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-400">Wird geladen...</div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Leistung bearbeiten</h1>
        <p className="text-gray-400 mt-1">Änderungen werden sofort gespeichert.</p>
      </div>

      <div className="bg-gray-800 rounded-xl p-6 space-y-5">

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="z.B. Umzug pro Stunde"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Beschreibung <span className="text-gray-500 text-xs">(optional)</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="z.B. Mit 2 Mitarbeitern und Werkzeug"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Preis (CHF) <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              value={preisChf}
              onChange={e => setPreisChf(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.05"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Einheit <span className="text-red-400">*</span>
            </label>
            <select
              value={unit}
              onChange={e => setUnit(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
            >
              {EINHEITEN.map(e => (
                <option key={e.value} value={e.value}>{e.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => router.push('/dashboard/leistungen')}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            {saving ? 'Wird gespeichert...' : 'Speichern'}
          </button>
        </div>

      </div>
    </div>
  );
}