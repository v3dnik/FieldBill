'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { usePlan } from '@/hooks/usePlan';
import { KundeTyp } from '@/types/firestore';

export default function NeuKundePage() {
  const { user } = useAuth();
  const router = useRouter();
  const {
    canAddKunde,
    kundenCount,
    limits,
    isReadOnly,
    loading: planLoading,
  } = usePlan();

  const [companyId, setCompanyId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [typ, setTyp] = useState<KundeTyp>('firma');

  // Firma felder
  const [firmenname, setFirmenname] = useState('');
  const [ansprechpartner, setAnsprechpartner] = useState('');
  const [uid, setUid] = useState('');

  // Privat felder
  const [vorname, setVorname] = useState('');
  const [nachname, setNachname] = useState('');

  // Gemeinsam
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
      if (userSnap.exists()) setCompanyId(userSnap.data().defaultCompanyId);
    };
    init();
  }, [user]);

  const handleSave = async () => {
    if (!user || !companyId) return;
    if (!canAddKunde) {
      setError(isReadOnly
        ? 'Ihr Plan ist abgelaufen — Read-only Modus.'
        : `Sie haben das Limit von ${limits.maxKunden} Kunden erreicht. Bitte upgraden Sie Ihren Plan.`);
      return;
    }
    if (typ === 'firma' && !firmenname.trim()) { setError('Firmenname ist erforderlich.'); return; }
    if (typ === 'privat' && !nachname.trim()) { setError('Nachname ist erforderlich.'); return; }
    setSaving(true); setError('');
    try {
      await addDoc(collection(db, 'companies', companyId, 'kunden'), {
        typ,
        ...(typ === 'firma' && {
          firmenname: firmenname.trim(),
          ansprechpartner: ansprechpartner.trim(),
          uid: uid.trim(),
        }),
        ...(typ === 'privat' && {
          vorname: vorname.trim(),
          nachname: nachname.trim(),
        }),
        email: email.trim(),
        phone: phone.trim(),
        address: {
          street: street.trim(),
          zip: zip.trim(),
          city: city.trim(),
          country: 'CH',
        },
        notizen: notizen.trim(),
        rechnungenAnzahl: 0,
        rechnungenTotalRappen: 0,
        createdAt: Timestamp.now(),
      });
      router.push('/dashboard/kunden');
    } catch (err: any) {
      setError('Fehler: ' + (err?.message || 'Unbekannt'));
      setSaving(false);
    }
  };

  const inputClass = "w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500";
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
  const sectionClass = "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-4";

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-5">
      <div>
        <button onClick={() => router.push('/dashboard/kunden')}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm mb-2 flex items-center gap-1 transition-colors">
          ← Zurück
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Neuer Kunde</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Kunden erfassen und speichern.</p>
      </div>

      {/* Plan Limit / Read-only Banner */}
      {!planLoading && !canAddKunde && (
        <div className={`rounded-xl p-4 border ${
          isReadOnly
            ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
        }`}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              {isReadOnly ? (
                <>
                  <p className="font-semibold text-sm text-orange-700 dark:text-orange-300">🔒 Ihr Plan ist abgelaufen</p>
                  <p className="text-sm text-orange-600 dark:text-orange-400 mt-0.5">
                    Read-only Modus — bestehende Daten sind sicher archiviert.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-sm text-red-700 dark:text-red-300">🚫 Kunden-Limit erreicht</p>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">
                    Sie haben {kundenCount} von {limits.maxKunden} möglichen Kunden gespeichert.
                  </p>
                </>
              )}
            </div>
            <button onClick={() => router.push('/pricing')}
              className={`text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
                isReadOnly ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'
              }`}>
              {isReadOnly ? 'Plan erneuern →' : 'Plan upgraden →'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Typ Auswahl */}
      <div className={sectionClass}>
        <p className={labelClass}>Kundentyp <span className="text-red-500">*</span></p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setTyp('firma')} disabled={!canAddKunde}
            className={`p-4 rounded-xl border-2 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              typ === 'firma'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
            }`}>
            <p className="text-2xl mb-1">🏢</p>
            <p className="font-medium text-gray-900 dark:text-white text-sm">Firma</p>
            <p className="text-xs text-gray-400 mt-0.5">GmbH, AG, Einzelfirma</p>
          </button>
          <button onClick={() => setTyp('privat')} disabled={!canAddKunde}
            className={`p-4 rounded-xl border-2 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              typ === 'privat'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
            }`}>
            <p className="text-2xl mb-1">👤</p>
            <p className="font-medium text-gray-900 dark:text-white text-sm">Privatperson</p>
            <p className="text-xs text-gray-400 mt-0.5">Einzelperson</p>
          </button>
        </div>
      </div>

      {/* Firma oder Privat Felder */}
      <div className={sectionClass}>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          {typ === 'firma' ? 'Firmendaten' : 'Persönliche Daten'}
        </h2>
        {typ === 'firma' ? (
          <>
            <div>
              <label className={labelClass}>Firmenname <span className="text-red-500">*</span></label>
              <input type="text" value={firmenname} onChange={e => setFirmenname(e.target.value)}
                placeholder="Firmenname" className={inputClass} disabled={!canAddKunde} />
            </div>
            <div>
              <label className={labelClass}>Ansprechpartner <span className="text-gray-400 text-xs">(optional)</span></label>
              <input type="text" value={ansprechpartner} onChange={e => setAnsprechpartner(e.target.value)}
                placeholder="Ansprechpartner" className={inputClass} disabled={!canAddKunde} />
            </div>
            <div>
              <label className={labelClass}>UID / MwSt-Nr <span className="text-gray-400 text-xs">(optional)</span></label>
              <input type="text" value={uid} onChange={e => setUid(e.target.value)}
                placeholder="UID / MwSt-Nr" className={`${inputClass} font-mono`} disabled={!canAddKunde} />
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Vorname</label>
              <input type="text" value={vorname} onChange={e => setVorname(e.target.value)}
                placeholder="Vorname" className={inputClass} disabled={!canAddKunde} />
            </div>
            <div>
              <label className={labelClass}>Nachname <span className="text-red-500">*</span></label>
              <input type="text" value={nachname} onChange={e => setNachname(e.target.value)}
                placeholder="Nachname" className={inputClass} disabled={!canAddKunde} />
            </div>
          </div>
        )}
      </div>

      {/* Kontakt */}
      <div className={sectionClass}>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Kontakt</h2>
        <div>
          <label className={labelClass}>E-Mail</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="E-Mail" className={inputClass} disabled={!canAddKunde} />
        </div>
        <div>
          <label className={labelClass}>Telefon</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="Telefon" className={inputClass} disabled={!canAddKunde} />
        </div>
      </div>

      {/* Adresse */}
      <div className={sectionClass}>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Adresse</h2>
        <div>
          <label className={labelClass}>Strasse</label>
          <input type="text" value={street} onChange={e => setStreet(e.target.value)}
            placeholder="Strasse" className={inputClass} disabled={!canAddKunde} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>PLZ</label>
            <input type="text" value={zip} onChange={e => setZip(e.target.value)}
              placeholder="PLZ" className={inputClass} disabled={!canAddKunde} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Ort</label>
            <input type="text" value={city} onChange={e => setCity(e.target.value)}
              placeholder="Ort" className={inputClass} disabled={!canAddKunde} />
          </div>
        </div>
      </div>

      {/* Notizen */}
      <div className={sectionClass}>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Notizen</h2>
        <textarea value={notizen} onChange={e => setNotizen(e.target.value)}
          placeholder="Notizen"
          rows={3} className={`${inputClass} resize-none`} disabled={!canAddKunde} />
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pb-8">
        <button onClick={() => router.push('/dashboard/kunden')}
          className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-white font-medium py-3 rounded-lg transition-colors">
          Abbrechen
        </button>
        <button onClick={handleSave} disabled={saving || !canAddKunde}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors">
          {saving ? 'Wird gespeichert...' : 'Kunde speichern'}
        </button>
      </div>
    </div>
  );
}