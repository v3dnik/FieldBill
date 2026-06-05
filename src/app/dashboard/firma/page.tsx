'use client';

import { useEffect, useState, FormEvent } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { CompanyDoc, MembershipDoc } from '@/types/firestore';
import { isValidIban, isValidQrIban, normalizeIban, formatIban } from '@/lib/iban';
import LogoUploader from '@/components/LogoUploader';

export default function FirmenprofilPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isBoss, setIsBoss] = useState(false);
  const [companyId, setCompanyId] = useState<string>('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [street, setStreet] = useState('');
  const [zip, setZip] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('CH');
  const [vatEnabled, setVatEnabled] = useState(false);
  const [vatNumber, setVatNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [iban, setIban] = useState('');
  const [qrIban, setQrIban] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoStoragePath, setLogoStoragePath] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (!userSnap.exists()) return;
        const cid = userSnap.data().defaultCompanyId;
        if (!cid) return;
        setCompanyId(cid);
        const membershipSnap = await getDoc(doc(db, 'memberships', `${user.uid}_${cid}`));
        if (membershipSnap.exists()) setIsBoss((membershipSnap.data() as MembershipDoc).role === 'boss');
        const companySnap = await getDoc(doc(db, 'companies', cid));
        if (companySnap.exists()) {
          const c = companySnap.data() as CompanyDoc;
          setName(c.name || '');
          setPhone(c.phone || '');
          setContactEmail(c.contactEmail || '');
          setWebsite(c.website || '');
          setStreet(c.address?.street || '');
          setZip(c.address?.zip || '');
          setCity(c.address?.city || '');
          setCountry(c.address?.country || 'CH');
          setVatEnabled(c.vatEnabled ?? false);
          setVatNumber(c.vatNumber || '');
          setBankName(c.bankDetails?.bankName || '');
          setIban(c.bankDetails?.iban ? formatIban(c.bankDetails.iban) : '');
          setQrIban(c.bankDetails?.qrIban ? formatIban(c.bankDetails.qrIban) : '');
          setLogoUrl(c.logoUrl || '');
          setLogoStoragePath(c.logoStoragePath || '');
        }
      } catch (err) { console.error(err); }
      finally { setIsLoading(false); }
    };
    load();
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null); setSuccessMessage(null);
    if (!name.trim()) { setError('Firmenname ist erforderlich.'); return; }
    const cleanIban = iban.trim() ? normalizeIban(iban) : '';
    const cleanQrIban = qrIban.trim() ? normalizeIban(qrIban) : '';
    if (cleanIban && !isValidIban(cleanIban)) { setError('IBAN ist ungültig.'); return; }
    if (cleanQrIban && !isValidQrIban(cleanQrIban)) { setError('QR-IBAN ist ungültig.'); return; }
    if (vatEnabled && !vatNumber.trim()) { setError('MwSt-Nummer ist erforderlich wenn MwSt aktiviert.'); return; }
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'companies', companyId), {
        name: name.trim(),
        phone: phone.trim(),
        contactEmail: contactEmail.trim(),
        website: website.trim(),
        address: { street: street.trim(), zip: zip.trim(), city: city.trim(), country },
        vatEnabled,
        vatNumber: vatNumber.trim(),
        bankDetails: { bankName: bankName.trim(), iban: cleanIban, qrIban: cleanQrIban },
      });
      setSuccessMessage('Firmenprofil erfolgreich gespeichert!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Speichern fehlgeschlagen. Bitte erneut versuchen.');
    } finally { setIsSaving(false); }
  };

  const inputClass = "w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500";
  const sectionClass = "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6";
  const labelClass = "block text-sm font-medium mb-2 text-gray-700 dark:text-slate-300";
  const sectionTitleClass = "text-lg font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-slate-700";

  if (isLoading) return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <p className="text-gray-400">Wird geladen...</p>
    </div>
  );

  if (!isBoss) return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-6">
        <p className="text-yellow-700 dark:text-yellow-300 font-medium">Sie haben keine Berechtigung, das Firmenprofil zu bearbeiten.</p>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">Nur der Geschäftsführer kann diese Daten ändern.</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">Firmenprofil</h1>
        <p className="text-gray-500 dark:text-slate-400 text-sm">Vervollständigen Sie die Daten — diese erscheinen auf allen Rechnungen.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Allgemein */}
        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>Allgemein</h2>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Firmenname <span className="text-red-500">*</span></label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)}
                className={inputClass} placeholder="z.B. Müller Umzüge GmbH" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Telefon</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  className={inputClass} placeholder="+41 79 123 45 67" />
              </div>
              <div>
                <label className={labelClass}>E-Mail</label>
                <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)}
                  className={inputClass} placeholder="info@firma.ch" />
              </div>
            </div>
            <div>
              <label className={labelClass}>Website</label>
              <input type="url" value={website} onChange={e => setWebsite(e.target.value)}
                className={inputClass} placeholder="https://www.firma.ch" />
            </div>
          </div>
        </section>

        {/* Adresse */}
        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>Adresse</h2>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Strasse und Nr.</label>
              <input type="text" value={street} onChange={e => setStreet(e.target.value)}
                className={inputClass} placeholder="Bahnhofstrasse 1" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>PLZ</label>
                <input type="text" value={zip} onChange={e => setZip(e.target.value)}
                  className={inputClass} placeholder="8001" />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Ort</label>
                <input type="text" value={city} onChange={e => setCity(e.target.value)}
                  className={inputClass} placeholder="Zürich" />
              </div>
            </div>
            <div>
              <label className={labelClass}>Land</label>
              <select value={country} onChange={e => setCountry(e.target.value)} className={inputClass}>
                <option value="CH">Schweiz (CH)</option>
                <option value="LI">Liechtenstein (LI)</option>
                <option value="DE">Deutschland (DE)</option>
                <option value="AT">Österreich (AT)</option>
                <option value="FR">Frankreich (FR)</option>
                <option value="IT">Italien (IT)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Logo */}
        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>Logo</h2>
          <LogoUploader
            companyId={companyId}
            currentLogoUrl={logoUrl}
            currentLogoPath={logoStoragePath}
            onUploadSuccess={(url, path) => {
              setLogoUrl(url); setLogoStoragePath(path);
              setSuccessMessage('Logo erfolgreich hochgeladen!');
              setTimeout(() => setSuccessMessage(null), 3000);
            }}
            onDeleteSuccess={() => {
              setLogoUrl(''); setLogoStoragePath('');
              setSuccessMessage('Logo erfolgreich gelöscht.');
              setTimeout(() => setSuccessMessage(null), 3000);
            }}
          />
        </section>

        {/* MwSt */}
        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>Mehrwertsteuer</h2>
          <div className="space-y-4">

            {/* Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">MwSt-pflichtig</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  Aktivieren wenn Jahresumsatz &gt; CHF 100'000
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVatEnabled(!vatEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  vatEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  vatEnabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* MwSt Nummer — nur wenn aktiviert */}
            {vatEnabled && (
              <div>
                <label className={labelClass}>
                  MwSt-Nummer <span className="text-red-500">*</span>
                </label>
                <input type="text" value={vatNumber} onChange={e => setVatNumber(e.target.value)}
                  className={`${inputClass} font-mono`} placeholder="CHE-123.456.789 MWST" />
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">
                  MwSt 8.1% wird automatisch auf alle Rechnungen angewendet.
                </p>
              </div>
            )}

            {!vatEnabled && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg px-4 py-3">
                <p className="text-blue-700 dark:text-blue-300 text-sm">
                  Ohne MwSt — Rechnungen werden ohne Mehrwertsteuer ausgestellt.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Bank */}
        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>Bank für QR-Rechnung</h2>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Bankname</label>
              <input type="text" value={bankName} onChange={e => setBankName(e.target.value)}
                className={inputClass} placeholder="z.B. UBS Switzerland AG" />
            </div>
            <div>
              <label className={labelClass}>IBAN</label>
              <input type="text" value={iban} onChange={e => setIban(e.target.value)}
                className={`${inputClass} font-mono`} placeholder="CH93 0076 2011 6238 5295 7" />
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">Normaler IBAN für Banküberweisungen.</p>
            </div>
            <div>
              <label className={labelClass}>QR-IBAN <span className="text-blue-500">⭐</span></label>
              <input type="text" value={qrIban} onChange={e => setQrIban(e.target.value)}
                className={`${inputClass} font-mono`} placeholder="CH44 3199 9123 0008 8901 2" />
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">
                Spezielle IBAN für Swiss QR-Rechnungen. Kostenlos bei Ihrer Bank beantragen.
              </p>
            </div>
          </div>
        </section>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-200 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-600 dark:text-green-200 px-4 py-3 rounded-xl text-sm">
            ✓ {successMessage}
          </div>
        )}

        <div className="flex justify-end">
          <button type="submit" disabled={isSaving}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors">
            {isSaving ? 'Wird gespeichert...' : 'Speichern'}
          </button>
        </div>
      </form>
    </div>
  );
}