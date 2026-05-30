'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { ItemDoc, CompanyDoc } from '@/types/firestore';

const ZAHLUNGSMETHODEN = [
  { value: 'bar', label: 'Bar' },
  { value: 'twint', label: 'TWINT' },
  { value: 'karte', label: 'Karte' },
  { value: 'rechnung', label: 'Rechnung' },
];

const ZAHLUNGSFRISTEN = [
  { value: 3, label: '3 Tage' },
  { value: 5, label: '5 Tage' },
  { value: 10, label: '10 Tage' },
  { value: 20, label: '20 Tage' },
  { value: 30, label: '30 Tage' },
  { value: 60, label: '60 Tage' },
  { value: 90, label: '90 Tage' },
];

interface Position {
  itemId?: string;
  name: string;
  description: string;
  unit: string;
  quantity: number;
  unitPriceRappen: number;
}

function formatCHF(rappen: number) {
  const chf = rappen / 100;
  return 'CHF ' + chf.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function NeuRechnungPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [companyId, setCompanyId] = useState('');
  const [company, setCompany] = useState<CompanyDoc | null>(null);
  const [katalog, setKatalog] = useState<ItemDoc[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Kunde
  const [customerName, setCustomerName] = useState('');
  const [customerStreet, setCustomerStreet] = useState('');
  const [customerZip, setCustomerZip] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  // Positionen
  const [positionen, setPositionen] = useState<Position[]>([
    { name: '', description: '', unit: 'Stunde', quantity: 1, unitPriceRappen: 0 }
  ]);

  // Einstellungen
  const [zahlungsmethode, setZahlungsmethode] = useState('bar');
  const [zahlungsfrist, setZahlungsfrist] = useState(30);
  const [notes, setNotes] = useState('');
  const [issueDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      if (!userSnap.exists()) return;
      const cId = userSnap.data().defaultCompanyId;
      setCompanyId(cId);

      const compSnap = await getDoc(doc(db, 'companies', cId));
      if (compSnap.exists()) setCompany(compSnap.data() as CompanyDoc);

      const itemsSnap = await getDocs(collection(db, 'companies', cId, 'items'));
      const items = itemsSnap.docs
        .map(d => ({ ...d.data(), itemId: d.id } as ItemDoc))
        .filter(i => i.active);
      setKatalog(items);
    };
    init();
  }, [user]);

  // Berechnungen
  const subtotalRappen = positionen.reduce((sum, p) => sum + p.quantity * p.unitPriceRappen, 0);
  const vatRate = company?.vatRate || 0.081;
  const vatRappen = Math.round(subtotalRappen * vatRate);
  const totalRappen = subtotalRappen + vatRappen;

  // Position handlers
  const addPosition = () => {
    setPositionen([...positionen, { name: '', description: '', unit: 'Stunde', quantity: 1, unitPriceRappen: 0 }]);
  };

  const removePosition = (idx: number) => {
    setPositionen(positionen.filter((_, i) => i !== idx));
  };

  const updatePosition = (idx: number, field: keyof Position, value: any) => {
    const updated = [...positionen];
    updated[idx] = { ...updated[idx], [field]: value };
    setPositionen(updated);
  };

  const selectFromKatalog = (idx: number, itemId: string) => {
    const item = katalog.find(k => k.itemId === itemId);
    if (!item) return;
    const updated = [...positionen];
    updated[idx] = {
      itemId: item.itemId,
      name: item.name,
      description: item.description || '',
      unit: item.unit,
      quantity: 1,
      unitPriceRappen: item.priceRappen,
    };
    setPositionen(updated);
  };

  const handleSave = async (status: 'draft' | 'issued') => {
    if (!customerName.trim()) { setError('Kundenname ist erforderlich.'); return; }
    if (positionen.some(p => !p.name.trim())) { setError('Alle Positionen müssen einen Namen haben.'); return; }
    if (positionen.some(p => p.quantity <= 0)) { setError('Alle Mengen müssen grösser als 0 sein.'); return; }

    setSaving(true);
    setError('');

    try {
      // Rechnungsnummer generieren
      const compRef = doc(db, 'companies', companyId);
      const compSnap = await getDoc(compRef);
      const compData = compSnap.data()!;
      const nextNum = compData.invoiceSettings?.nextNumber || 1;
      const year = new Date().getFullYear();
      const invoiceNumber = `RE-${year}-${String(nextNum).padStart(4, '0')}`;

      // Fälligkeitsdatum berechnen
      const issueDateObj = new Date(issueDate);
      const dueDateObj = new Date(issueDateObj);
      dueDateObj.setDate(dueDateObj.getDate() + zahlungsfrist);

      const lines = positionen.map(p => ({
        itemId: p.itemId || null,
        name: p.name.trim(),
        description: p.description.trim(),
        unit: p.unit,
        quantity: p.quantity,
        unitPriceRappen: p.unitPriceRappen,
        totalRappen: p.quantity * p.unitPriceRappen,
      }));

      const invoiceData = {
        invoiceNumber,
        status,
        createdBy: user!.uid,
        dateKey: issueDate.replace(/-/g, '-'),
        issueDate: Timestamp.fromDate(issueDateObj),
        dueDate: Timestamp.fromDate(dueDateObj),
        customerName: customerName.trim(),
        customerAddress: {
          street: customerStreet.trim(),
          zip: customerZip.trim(),
          city: customerCity.trim(),
          country: 'CH',
        },
        customerEmail: customerEmail.trim(),
        lines,
        subtotalRappen,
        vatRate,
        vatRappen,
        totalRappen,
        paymentMethod: zahlungsmethode,
        zahlungsfrist,
        notes: notes.trim(),
        createdAt: Timestamp.now(),
      };

      // Rechnung speichern
      await addDoc(collection(db, 'companies', companyId, 'invoices'), invoiceData);

      // Nächste Rechnungsnummer erhöhen
      await updateDoc(compRef, {
        'invoiceSettings.nextNumber': nextNum + 1,
      });

      router.push('/dashboard/rechnungen');
    } catch (err: any) {
      setError('Fehler: ' + (err?.message || 'Unbekannt'));
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Neue Rechnung</h1>
          <p className="text-gray-400 mt-1">Rechnung erstellen und speichern.</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/rechnungen')}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ✕ Abbrechen
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Kunde */}
      <div className="bg-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Kunde</h2>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Name / Firma <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            placeholder="z.B. Max Mustermann AG"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-3">
            <label className="block text-sm font-medium text-gray-300 mb-1">Strasse</label>
            <input
              type="text"
              value={customerStreet}
              onChange={e => setCustomerStreet(e.target.value)}
              placeholder="Musterstrasse 1"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">PLZ</label>
            <input
              type="text"
              value={customerZip}
              onChange={e => setCustomerZip(e.target.value)}
              placeholder="8001"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-1">Ort</label>
            <input
              type="text"
              value={customerCity}
              onChange={e => setCustomerCity(e.target.value)}
              placeholder="Zürich"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">E-Mail <span className="text-gray-500 text-xs">(optional)</span></label>
          <input
            type="email"
            value={customerEmail}
            onChange={e => setCustomerEmail(e.target.value)}
            placeholder="kunde@beispiel.ch"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Positionen */}
      <div className="bg-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Positionen</h2>

        {positionen.map((pos, idx) => (
          <div key={idx} className="border border-gray-700 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm font-medium">Position {idx + 1}</span>
              {positionen.length > 1 && (
                <button
                  onClick={() => removePosition(idx)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Entfernen
                </button>
              )}
            </div>

            {/* Aus Katalog wählen */}
            {katalog.length > 0 && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Aus Leistungskatalog wählen</label>
                <select
                  onChange={e => selectFromKatalog(idx, e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-300 focus:outline-none focus:border-blue-500 text-sm"
                  defaultValue=""
                >
                  <option value="">— Leistung auswählen —</option>
                  {katalog.map(item => (
                    <option key={item.itemId} value={item.itemId}>
                      {item.name} — {formatCHF(item.priceRappen)} / {item.unit}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-400 mb-1">Bezeichnung *</label>
              <input
                type="text"
                value={pos.name}
                onChange={e => updatePosition(idx, 'name', e.target.value)}
                placeholder="z.B. Umzug pro Stunde"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Beschreibung</label>
              <input
                type="text"
                value={pos.description}
                onChange={e => updatePosition(idx, 'description', e.target.value)}
                placeholder="Zusätzliche Details (optional)"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Menge</label>
                <input
                  type="number"
                  value={pos.quantity}
                  onChange={e => updatePosition(idx, 'quantity', parseFloat(e.target.value) || 0)}
                  min="0.1"
                  step="0.5"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Einheit</label>
                <input
                  type="text"
                  value={pos.unit}
                  onChange={e => updatePosition(idx, 'unit', e.target.value)}
                  placeholder="Stunde"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Preis/Einheit (CHF)</label>
                <input
                  type="number"
                  value={pos.unitPriceRappen / 100}
                  onChange={e => updatePosition(idx, 'unitPriceRappen', Math.round((parseFloat(e.target.value) || 0) * 100))}
                  min="0"
                  step="0.05"
                  placeholder="0.00"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>
            </div>

            <div className="text-right text-sm text-gray-300">
              Total: <span className="text-white font-semibold">{formatCHF(pos.quantity * pos.unitPriceRappen)}</span>
            </div>
          </div>
        ))}

        <button
          onClick={addPosition}
          className="w-full border border-dashed border-gray-600 hover:border-blue-500 text-gray-400 hover:text-blue-400 py-3 rounded-lg transition-colors text-sm"
        >
          + Position hinzufügen
        </button>
      </div>

      {/* Totals */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Zusammenfassung</h2>
        <div className="space-y-2">
          <div className="flex justify-between text-gray-300">
            <span>Subtotal</span>
            <span>{formatCHF(subtotalRappen)}</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>MwSt {(vatRate * 100).toFixed(1)}%</span>
            <span>{formatCHF(vatRappen)}</span>
          </div>
          <div className="border-t border-gray-700 pt-2 flex justify-between text-white font-bold text-lg">
            <span>Total CHF</span>
            <span>{formatCHF(totalRappen)}</span>
          </div>
        </div>
      </div>

      {/* Zahlungseinstellungen */}
      <div className="bg-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Zahlungseinstellungen</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Zahlungsmethode</label>
            <select
              value={zahlungsmethode}
              onChange={e => setZahlungsmethode(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
            >
              {ZAHLUNGSMETHODEN.map(z => (
                <option key={z.value} value={z.value}>{z.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Zahlungsfrist</label>
            <select
              value={zahlungsfrist}
              onChange={e => setZahlungsfrist(parseInt(e.target.value))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
            >
              {ZAHLUNGSFRISTEN.map(z => (
                <option key={z.value} value={z.value}>{z.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Bemerkungen <span className="text-gray-500 text-xs">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="z.B. Vielen Dank für Ihren Auftrag."
            rows={3}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pb-8">
        <button
          onClick={() => handleSave('draft')}
          disabled={saving}
          className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors"
        >
          {saving ? 'Wird gespeichert...' : 'Als Entwurf speichern'}
        </button>
        <button
          onClick={() => handleSave('issued')}
          disabled={saving}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors"
        >
          {saving ? 'Wird gespeichert...' : 'Rechnung ausstellen'}
        </button>
      </div>

    </div>
  );
}