'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { ItemDoc, CompanyDoc, KundeDoc } from '@/types/firestore';
import { Suspense } from 'react';

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
  return 'CHF ' + (rappen / 100).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getKundeName(k: KundeDoc): string {
  if (k.typ === 'firma') return k.firmenname || '—';
  return `${k.vorname || ''} ${k.nachname || ''}`.trim() || '—';
}

const inputClass = "w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500";
const inputSmClass = "w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm";
const sectionClass = "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6";
const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
const labelSmClass = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1";

function NeuRechnungInner() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const kundeIdParam = searchParams.get('kundeId');

  const [companyId, setCompanyId] = useState('');
  const [company, setCompany] = useState<CompanyDoc | null>(null);
  const [katalog, setKatalog] = useState<ItemDoc[]>([]);
  const [kunden, setKunden] = useState<KundeDoc[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Kunden Suche
  const [kundeSearch, setKundeSearch] = useState('');
  const [showKundeDropdown, setShowKundeDropdown] = useState(false);
  const [selectedKunde, setSelectedKunde] = useState<KundeDoc | null>(null);

  // Kunde Felder
  const [customerName, setCustomerName] = useState('');
  const [customerStreet, setCustomerStreet] = useState('');
  const [customerZip, setCustomerZip] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  const [positionen, setPositionen] = useState<Position[]>([
    { name: '', description: '', unit: 'Stunde', quantity: 1, unitPriceRappen: 0 }
  ]);

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
      const [compSnap, itemsSnap, kundenSnap] = await Promise.all([
        getDoc(doc(db, 'companies', cId)),
        getDocs(collection(db, 'companies', cId, 'items')),
        getDocs(collection(db, 'companies', cId, 'kunden')),
      ]);
      if (compSnap.exists()) setCompany(compSnap.data() as CompanyDoc);
      setKatalog(itemsSnap.docs.map(d => ({ ...d.data(), itemId: d.id } as ItemDoc)).filter(i => i.active));
      const kundenList = kundenSnap.docs.map(d => ({ ...d.data(), kundeId: d.id } as KundeDoc));
      setKunden(kundenList);

      // Če pride iz Kunden strani z ?kundeId=
      if (kundeIdParam) {
        const k = kundenList.find(k => k.kundeId === kundeIdParam);
        if (k) fillFromKunde(k);
      }
    };
    init();
  }, [user, kundeIdParam]);

  const fillFromKunde = (k: KundeDoc) => {
    setSelectedKunde(k);
    const name = getKundeName(k);
    setCustomerName(name);
    setCustomerStreet(k.address?.street || '');
    setCustomerZip(k.address?.zip || '');
    setCustomerCity(k.address?.city || '');
    setCustomerEmail(k.email || '');
    setKundeSearch(name);
    setShowKundeDropdown(false);
  };

  const clearKunde = () => {
    setSelectedKunde(null);
    setKundeSearch('');
    setCustomerName('');
    setCustomerStreet('');
    setCustomerZip('');
    setCustomerCity('');
    setCustomerEmail('');
  };

  const filteredKunden = kunden.filter(k => {
    const name = getKundeName(k).toLowerCase();
    const email = (k.email || '').toLowerCase();
    const s = kundeSearch.toLowerCase();
    return name.includes(s) || email.includes(s);
  });

  // MwSt berechnen
  const subtotalRappen = positionen.reduce((sum, p) => sum + p.quantity * p.unitPriceRappen, 0);
  const vatEnabled = company?.vatEnabled ?? false;
  const vatRate = vatEnabled ? (company?.vatRate || 0.081) : 0;
  const vatRappen = vatEnabled ? Math.round(subtotalRappen * vatRate) : 0;
  const totalRappen = subtotalRappen + vatRappen;

  const addPosition = () => setPositionen([...positionen, { name: '', description: '', unit: 'Stunde', quantity: 1, unitPriceRappen: 0 }]);
  const removePosition = (idx: number) => setPositionen(positionen.filter((_, i) => i !== idx));

  const updatePosition = (idx: number, field: keyof Position, value: any) => {
    const updated = [...positionen];
    updated[idx] = { ...updated[idx], [field]: value };
    setPositionen(updated);
  };

  const selectFromKatalog = (idx: number, itemId: string) => {
    const item = katalog.find(k => k.itemId === itemId);
    if (!item) return;
    const updated = [...positionen];
    updated[idx] = { itemId: item.itemId, name: item.name, description: item.description || '', unit: item.unit, quantity: 1, unitPriceRappen: item.priceRappen };
    setPositionen(updated);
  };

  const handleSave = async (status: 'draft' | 'issued') => {
    if (!customerName.trim()) { setError('Kundenname ist erforderlich.'); return; }
    if (positionen.some(p => !p.name.trim())) { setError('Alle Positionen müssen einen Namen haben.'); return; }
    if (positionen.some(p => p.quantity <= 0)) { setError('Alle Mengen müssen grösser als 0 sein.'); return; }
    setSaving(true); setError('');
    try {
      const compRef = doc(db, 'companies', companyId);
      const compSnap = await getDoc(compRef);
      const compData = compSnap.data()!;
      const nextNum = compData.invoiceSettings?.nextNumber || 1;
      const year = new Date().getFullYear();
      const invoiceNumber = `RE-${year}-${String(nextNum).padStart(4, '0')}`;
      const issueDateObj = new Date(issueDate);
      const dueDateObj = new Date(issueDateObj);
      dueDateObj.setDate(dueDateObj.getDate() + zahlungsfrist);

      await addDoc(collection(db, 'companies', companyId, 'invoices'), {
        invoiceNumber, status,
        createdBy: user!.uid,
        dateKey: issueDate,
        issueDate: Timestamp.fromDate(issueDateObj),
        dueDate: Timestamp.fromDate(dueDateObj),
        customerName: customerName.trim(),
        customerAddress: { street: customerStreet.trim(), zip: customerZip.trim(), city: customerCity.trim(), country: 'CH' },
        customerEmail: customerEmail.trim(),
        lines: positionen.map(p => ({
          itemId: p.itemId || null,
          name: p.name.trim(), description: p.description.trim(),
          unit: p.unit, quantity: p.quantity,
          unitPriceRappen: p.unitPriceRappen,
          totalRappen: p.quantity * p.unitPriceRappen,
        })),
        subtotalRappen, vatRate, vatRappen, totalRappen,
        paymentMethod: zahlungsmethode,
        zahlungsfrist,
        notes: notes.trim(),
        createdAt: Timestamp.now(),
      });

      await updateDoc(compRef, { 'invoiceSettings.nextNumber': nextNum + 1 });
      router.push('/dashboard/rechnungen');
    } catch (err: any) {
      setError('Fehler: ' + (err?.message || 'Unbekannt'));
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Neue Rechnung</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Rechnung erstellen und speichern.</p>
        </div>
        <button onClick={() => router.push('/dashboard/rechnungen')}
          className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors">
          ✕ Abbrechen
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Kunde */}
      <div className={sectionClass}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Kunde</h2>
        <div className="space-y-4">

          {/* Kunden Suche */}
          {kunden.length > 0 && (
            <div className="relative">
              <label className={labelClass}>Aus Kundenliste wählen</label>
              {selectedKunde ? (
                <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span>{selectedKunde.typ === 'firma' ? '🏢' : '👤'}</span>
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      {getKundeName(selectedKunde)}
                    </span>
                  </div>
                  <button onClick={clearKunde}
                    className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400">
                    ✕ Ändern
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={kundeSearch}
                    onChange={e => { setKundeSearch(e.target.value); setShowKundeDropdown(true); }}
                    onFocus={() => setShowKundeDropdown(true)}
                    placeholder="Suchen oder neu eingeben..."
                    className={inputClass}
                  />
                  {showKundeDropdown && kundeSearch && filteredKunden.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg overflow-hidden">
                      {filteredKunden.slice(0, 5).map(k => (
                        <button key={k.kundeId}
                          onClick={() => fillFromKunde(k)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-left transition-colors border-b border-gray-100 dark:border-gray-700/50 last:border-b-0">
                          <span>{k.typ === 'firma' ? '🏢' : '👤'}</span>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{getKundeName(k)}</p>
                            {k.email && <p className="text-xs text-gray-400">{k.email}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Oder unten manuell eingeben für neue Kunden
              </p>
            </div>
          )}

          {/* Manuelle Felder */}
          <div>
            <label className={labelClass}>Name / Firma <span className="text-red-500">*</span></label>
            <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
              placeholder="z.B. Max Mustermann AG" className={inputClass} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3">
              <label className={labelClass}>Strasse</label>
              <input type="text" value={customerStreet} onChange={e => setCustomerStreet(e.target.value)}
                placeholder="Musterstrasse 1" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>PLZ</label>
              <input type="text" value={customerZip} onChange={e => setCustomerZip(e.target.value)}
                placeholder="8001" className={inputClass} />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Ort</label>
              <input type="text" value={customerCity} onChange={e => setCustomerCity(e.target.value)}
                placeholder="Zürich" className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>E-Mail <span className="text-gray-400 text-xs">(optional)</span></label>
            <input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)}
              placeholder="kunde@beispiel.ch" className={inputClass} />
          </div>
        </div>
      </div>

      {/* Positionen */}
      <div className={sectionClass}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Positionen</h2>
        <div className="space-y-4">
          {positionen.map((pos, idx) => (
            <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">Position {idx + 1}</span>
                {positionen.length > 1 && (
                  <button onClick={() => removePosition(idx)} className="text-red-500 dark:text-red-400 hover:text-red-700 text-sm">
                    Entfernen
                  </button>
                )}
              </div>
              {katalog.length > 0 && (
                <div>
                  <label className={labelSmClass}>Aus Leistungskatalog wählen</label>
                  <select onChange={e => selectFromKatalog(idx, e.target.value)} defaultValue="" className={inputSmClass}>
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
                <label className={labelSmClass}>Bezeichnung <span className="text-red-500">*</span></label>
                <input type="text" value={pos.name} onChange={e => updatePosition(idx, 'name', e.target.value)}
                  placeholder="z.B. Umzug pro Stunde" className={inputSmClass} />
              </div>
              <div>
                <label className={labelSmClass}>Beschreibung</label>
                <input type="text" value={pos.description} onChange={e => updatePosition(idx, 'description', e.target.value)}
                  placeholder="Zusätzliche Details (optional)" className={inputSmClass} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelSmClass}>Menge</label>
                  <input type="number" value={pos.quantity}
                    onChange={e => updatePosition(idx, 'quantity', parseFloat(e.target.value) || 0)}
                    min="0.1" step="0.5" className={inputSmClass} />
                </div>
                <div>
                  <label className={labelSmClass}>Einheit</label>
                  <input type="text" value={pos.unit}
                    onChange={e => updatePosition(idx, 'unit', e.target.value)}
                    placeholder="Stunde" className={inputSmClass} />
                </div>
                <div>
                  <label className={labelSmClass}>Preis/Einheit (CHF)</label>
                  <input type="number" value={pos.unitPriceRappen / 100}
                    onChange={e => updatePosition(idx, 'unitPriceRappen', Math.round((parseFloat(e.target.value) || 0) * 100))}
                    min="0" step="0.05" placeholder="0.00" className={inputSmClass} />
                </div>
              </div>
              <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                Total: <span className="text-gray-900 dark:text-white font-semibold">{formatCHF(pos.quantity * pos.unitPriceRappen)}</span>
              </div>
            </div>
          ))}
          <button onClick={addPosition}
            className="w-full border border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 text-gray-400 hover:text-blue-500 py-3 rounded-xl transition-colors text-sm">
            + Position hinzufügen
          </button>
        </div>
      </div>

      {/* Zusammenfassung */}
      <div className={sectionClass}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Zusammenfassung</h2>
        <div className="space-y-2">
          <div className="flex justify-between text-gray-600 dark:text-gray-300">
            <span>Subtotal</span>
            <span>{formatCHF(subtotalRappen)}</span>
          </div>
          {vatEnabled ? (
            <div className="flex justify-between text-gray-600 dark:text-gray-300">
              <span>MwSt {(vatRate * 100).toFixed(1)}%</span>
              <span>{formatCHF(vatRappen)}</span>
            </div>
          ) : (
            <div className="flex justify-between text-gray-400 dark:text-gray-500 text-sm">
              <span>MwSt</span>
              <span>nicht MwSt-pflichtig</span>
            </div>
          )}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between text-gray-900 dark:text-white font-bold text-lg">
            <span>Total CHF</span>
            <span>{formatCHF(totalRappen)}</span>
          </div>
        </div>
      </div>

      {/* Zahlungseinstellungen */}
      <div className={sectionClass}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Zahlungseinstellungen</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Zahlungsmethode</label>
              <select value={zahlungsmethode} onChange={e => setZahlungsmethode(e.target.value)} className={inputClass}>
                {ZAHLUNGSMETHODEN.map(z => <option key={z.value} value={z.value}>{z.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Zahlungsfrist</label>
              <select value={zahlungsfrist} onChange={e => setZahlungsfrist(parseInt(e.target.value))} className={inputClass}>
                {ZAHLUNGSFRISTEN.map(z => <option key={z.value} value={z.value}>{z.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Bemerkungen <span className="text-gray-400 text-xs">(optional)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="z.B. Vielen Dank für Ihren Auftrag."
              rows={3} className={`${inputClass} resize-none`} />
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pb-8">
        <button onClick={() => handleSave('draft')} disabled={saving}
          className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-700 dark:text-white font-medium py-3 rounded-lg transition-colors">
          {saving ? 'Wird gespeichert...' : 'Als Entwurf speichern'}
        </button>
        <button onClick={() => handleSave('issued')} disabled={saving}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors">
          {saving ? 'Wird gespeichert...' : 'Rechnung ausstellen'}
        </button>
      </div>
    </div>
  );
}

export default function NeuRechnungPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="text-gray-400">Wird geladen...</div></div>}>
      <NeuRechnungInner />
    </Suspense>
  );
}