'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, addDoc, collection, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { ExpenseCategory } from '@/types/firestore';

const KATEGORIEN: ExpenseCategory[] = [
  'Material', 'Fahrzeug', 'Büro', 'Versicherung',
  'Marketing', 'Personal', 'Miete', 'Telefon', 'Sonstiges'
];

export default function NeuAusgabePage() {
  const { user } = useAuth();
  const router = useRouter();

  const [companyId, setCompanyId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState('');

  const [betrag, setBetrag] = useState('');
  const [datum, setDatum] = useState(new Date().toISOString().split('T')[0]);
  const [kategorie, setKategorie] = useState<ExpenseCategory>('Sonstiges');
  const [beschreibung, setBeschreibung] = useState('');
  const [beleg, setBeleg] = useState<File | null>(null);
  const [belegPreview, setBelegPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      if (userSnap.exists()) {
        setCompanyId(userSnap.data().defaultCompanyId);
      }
    };
    init();
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('Datei zu gross. Maximum 10MB.');
      return;
    }

    setBeleg(file);
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setBelegPreview(url);
    } else {
      setBelegPreview(null);
    }
  };

  const handleSubmit = async () => {
    if (!user || !companyId) return;
    if (!betrag || isNaN(parseFloat(betrag))) { setError('Gültiger Betrag erforderlich.'); return; }
    if (!beschreibung.trim()) { setError('Beschreibung erforderlich.'); return; }
    if (!datum) { setError('Datum erforderlich.'); return; }

    setSaving(true);
    setError('');

    try {
      let receiptUrl: string | undefined;
      let receiptStoragePath: string | undefined;

      if (beleg) {
        setUploadProgress('Beleg wird hochgeladen...');
        const fileName = `${Date.now()}_${beleg.name}`;
        const storagePath = `companies/${companyId}/expenses/${fileName}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, beleg);
        receiptUrl = await getDownloadURL(storageRef);
        receiptStoragePath = storagePath;
        setUploadProgress('');
      }

      const amountRappen = Math.round(parseFloat(betrag) * 100);
      const dateObj = new Date(datum);

      await addDoc(collection(db, 'companies', companyId, 'expenses'), {
        amountRappen,
        date: Timestamp.fromDate(dateObj),
        category: kategorie,
        description: beschreibung.trim(),
        ...(receiptUrl && { receiptUrl }),
        ...(receiptStoragePath && { receiptStoragePath }),
        createdAt: Timestamp.now(),
      });

      router.push('/dashboard/ausgaben');
    } catch (err: any) {
      setError('Fehler: ' + (err?.message || 'Unbekannt'));
      setSaving(false);
      setUploadProgress('');
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard/ausgaben')}
          className="text-gray-400 hover:text-white text-sm mb-2 flex items-center gap-1"
        >
          ← Zurück
        </button>
        <h1 className="text-2xl font-bold text-white">Neue Ausgabe</h1>
        <p className="text-gray-400 mt-1">Geschäftsausgabe erfassen.</p>
      </div>

      <div className="bg-gray-800 rounded-xl p-6 space-y-5">

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Betrag */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Betrag (CHF) <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            value={betrag}
            onChange={e => setBetrag(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.05"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Datum */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Datum <span className="text-red-400">*</span>
          </label>
          <input
            type="date"
            value={datum}
            onChange={e => setDatum(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Kategorie */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Kategorie <span className="text-red-400">*</span>
          </label>
          <select
            value={kategorie}
            onChange={e => setKategorie(e.target.value as ExpenseCategory)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
          >
            {KATEGORIEN.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>

        {/* Beschreibung */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Beschreibung <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={beschreibung}
            onChange={e => setBeschreibung(e.target.value)}
            placeholder="z.B. Büromaterial Coop"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Beleg Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Beleg <span className="text-gray-500 text-xs">(optional — Foto oder PDF, max. 10MB)</span>
          </label>
          <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center hover:border-blue-500 transition-colors">
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="hidden"
              id="beleg-upload"
            />
            <label htmlFor="beleg-upload" className="cursor-pointer">
              {belegPreview ? (
                <img src={belegPreview} alt="Beleg" className="max-h-40 mx-auto rounded-lg" />
              ) : beleg ? (
                <div className="text-blue-400">
                  <p className="text-2xl mb-1">📄</p>
                  <p className="text-sm">{beleg.name}</p>
                </div>
              ) : (
                <div className="text-gray-400">
                  <p className="text-2xl mb-1">📎</p>
                  <p className="text-sm">Foto oder PDF hochladen</p>
                  <p className="text-xs mt-1">Tippen zum Auswählen</p>
                </div>
              )}
            </label>
          </div>
          {beleg && (
            <button
              onClick={() => { setBeleg(null); setBelegPreview(null); }}
              className="text-red-400 text-xs mt-2 hover:text-red-300"
            >
              Beleg entfernen
            </button>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => router.push('/dashboard/ausgaben')}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            {uploadProgress || (saving ? 'Wird gespeichert...' : 'Speichern')}
          </button>
        </div>

      </div>
    </div>
  );
}