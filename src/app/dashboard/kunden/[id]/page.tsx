'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, updateDoc, Timestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { KundeDoc, KundeTyp, InvoiceDoc } from '@/types/firestore';

function formatCHF(rappen: number) {
  return 'CHF ' + (rappen / 100).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function KundeDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [kunde, setKunde] = useState<KundeDoc | null>(null);
  const [companyId, setCompanyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [rechnungen, setRechnungen] = useState<InvoiceDoc[]>([]);

  const [typ, setTyp] = useState<KundeTyp>('firma');
  const [firmenname, setFirmenname] = useState('');
  const [ansprechpartner, setAnsprechpartner] = useState('');
  const [uid, setUid] = useState('');
  const [vorname, setVorname] = useState('');
  const [nachname, setNachname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [zip, setZip] = useState('');
  const [city, setCity] = useState('');
  const [notizen, setNotizen] = useState('');

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      if (!userSnap.exists()) return;
      const cId = userSnap.data().defaultCompanyId;
      setCompanyId(cId);
      const kundeSnap = await getDoc(doc(db, 'companies', cId, 'kunden', id));
      if (!kundeSnap.exists()) { setLoading(false); return; }
      const k = { ...kundeSnap.data(), kundeId: kundeSnap.id } as KundeDoc;
      setKunde(k);
      setTyp(k.typ);
      setFirmenname(k.firmenname || '');
      setAnsprechpartner(k.ansprechpartner || '');
      setUid(k.uid || '');
      setVorname(k.vorname || '');
      setNachname(k.nachname || '');
      setEmail(k.email || '');
      setPhone(k.phone || '');
      setStreet(k.address?.street || '');
      setZip(k.address?.zip || '');
      setCity(k.address?.city || '');
      setNotizen(k.notizen || '');

      // Rechnungen für diesen Kunden laden
      const invSnap = await getDocs(collection(db, 'companies', cId, 'invoices'));
      const name = k.typ === 'firma' ? k.firmenname : `${k.vorname || ''} ${k.nachname || ''}`.trim();
      const invs = invSnap.docs
        .map(d => ({ ...d.data(), invoiceId: d.id } as InvoiceDoc))
        .filter(i => i.customerName === name)
        .sort((a, b) => (b.issueDate?.toDate?.()?.getTime() || 0) - (a.issueDate?.toDate?.()?.getTime() || 0));
      setRechnungen(invs);
      setLoading(false);
    };
    init();
  }, [user, id]);

  const handleSave = async () => {
    if (!companyId) return;
    if (typ === 'firma' && !firmenname.trim()) { setError('Firmenname ist erforderlich.'); return; }
    if (typ === 'privat' && !nachname.trim()) { setError('Nachname ist erforderlich.'); return; }
    setSaving(true); setError('');
    try {
      await updateDoc(doc(db, 'companies', companyId, 'kunden', id), {
        typ,
        firmenname: typ === 'firma' ? firmenname.trim() : '',
        ansprechpartner: typ === 'firma' ? ansprechpartner.trim() : '',
        uid: typ === 'firma' ? uid.trim() : '',
        vorname: typ === 'privat' ? vorname.trim() : '',
        nachname: typ === 'privat' ? nachname.trim() : '',
        email: email.trim(),
        phone: phone.trim(),
        address: { street: street.trim(), zip: zip.trim(), city: city.trim(), country: 'CH' },
        notizen: notizen.trim(),
        updatedAt: Timestamp.now(),
      });
      router.push('/dashboard/kunden');
    } catch (err: any) {
      setError('Fehler: ' + (err?.message || 'Unbekannt'));
    } finally { setSaving(false); }
  };

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    draft:     { label: 'Entwurf',     color: 'text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-gray-700' },
    issued:    { label: 'Ausgestellt', color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/40' },
    paid:      { label: 'Bezahlt',     color: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/40' },
    cancelled: { label: 'Storniert',   color: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/40' },
  };

  const inputClass = "w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500";
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
  const sectionClass = "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-4";

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="text-gray-400">Wird geladen...</div></div>;
  if (!kunde) return <div className="max-w-xl mx-auto px-4 py-8"><p className="text-red-500">Kunde nicht gefunden.</p></div>;

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-5">
      <div>
        <button onClick={() => router.push('/dashboard/kunden')}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm mb-2 flex items-center gap-1 transition-colors">
          ← Zurück
        </button>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {typ === 'firma' ? firmenname || 'Firma' : `${vorname} ${nachname}`.trim() || 'Privatperson'}
          </h1>
          <button onClick={() => router.push(`/dashboard/rechnungen/neu?kundeId=${id}`)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            + Rechnung
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Typ */}
      <div className={sectionClass}>
        <p className={labelClass}>Kundentyp</p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setTyp('firma')}
            className={`p-3 rounded-xl border-2 text-left transition-colors ${typ === 'firma' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
            <p className="text-lg mb-0.5">🏢</p>
            <p className="font-medium text-gray-900 dark:text-white text-sm">Firma</p>
          </button>
          <button onClick={() => setTyp('privat')}
            className={`p-3 rounded-xl border-2 text-left transition-colors ${typ === 'privat' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
            <p className="text-lg mb-0.5">👤</p>
            <p className="font-medium text-gray-900 dark:text-white text-sm">Privatperson</p>
          </button>
        </div>
      </div>

      {/* Firma / Privat */}
      <div className={sectionClass}>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          {typ === 'firma' ? 'Firmendaten' : 'Persönliche Daten'}
        </h2>
        {typ === 'firma' ? (
          <>
            <div>
              <label className={labelClass}>Firmenname <span className="text-red-500">*</span></label>
              <input type="text" value={firmenname} onChange={e => setFirmenname(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Ansprechpartner</label>
              <input type="text" value={ansprechpartner} onChange={e => setAnsprechpartner(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>UID / MwSt-Nr</label>
              <input type="text" value={uid} onChange={e => setUid(e.target.value)} className={`${inputClass} font-mono`} />
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Vorname</label>
              <input type="text" value={vorname} onChange={e => setVorname(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Nachname <span className="text-red-500">*</span></label>
              <input type="text" value={nachname} onChange={e => setNachname(e.target.value)} className={inputClass} />
            </div>
          </div>
        )}
      </div>

      {/* Kontakt */}
      <div className={sectionClass}>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Kontakt</h2>
        <div>
          <label className={labelClass}>E-Mail</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Telefon</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} />
        </div>
      </div>

      {/* Adresse */}
      <div className={sectionClass}>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Adresse</h2>
        <div>
          <label className={labelClass}>Strasse</label>
          <input type="text" value={street} onChange={e => setStreet(e.target.value)} className={inputClass} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>PLZ</label>
            <input type="text" value={zip} onChange={e => setZip(e.target.value)} className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Ort</label>
            <input type="text" value={city} onChange={e => setCity(e.target.value)} className={inputClass} />
          </div>
        </div>
      </div>

      {/* Notizen */}
      <div className={sectionClass}>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Notizen</h2>
        <textarea value={notizen} onChange={e => setNotizen(e.target.value)}
          rows={3} className={`${inputClass} resize-none`} />
      </div>

      {/* Rechnungen Historie */}
      {rechnungen.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Rechnungshistorie ({rechnungen.length})
            </p>
          </div>
          {rechnungen.slice(0, 5).map((inv, idx) => (
            <div key={idx}
              onClick={() => router.push(`/dashboard/rechnungen/${inv.invoiceId}`)}
              className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors last:border-b-0">
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_LABELS[inv.status]?.color}`}>
                  {STATUS_LABELS[inv.status]?.label}
                </span>
                <p className="text-sm text-gray-600 dark:text-gray-400">{inv.invoiceNumber}</p>
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCHF(inv.totalRappen)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3 pb-8">
        <button onClick={() => router.push('/dashboard/kunden')}
          className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-white font-medium py-3 rounded-lg transition-colors">
          Abbrechen
        </button>
        <button onClick={handleSave} disabled={saving}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors">
          {saving ? 'Wird gespeichert...' : 'Speichern'}
        </button>
      </div>
    </div>
  );
}