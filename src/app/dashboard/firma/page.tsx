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

  // Loading & saving states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Role & permissions
  const [isBoss, setIsBoss] = useState(false);
  const [companyId, setCompanyId] = useState<string>('');

  // Form state — Allgemein
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [website, setWebsite] = useState('');

  // Form state — Adresse
  const [street, setStreet] = useState('');
  const [zip, setZip] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('CH');

  // Form state — MwSt
  const [vatNumber, setVatNumber] = useState('');

  // Form state — Bank
  const [bankName, setBankName] = useState('');
  const [iban, setIban] = useState('');
  const [qrIban, setQrIban] = useState('');

  // Logo state
  const [logoUrl, setLogoUrl] = useState('');
  const [logoStoragePath, setLogoStoragePath] = useState('');

  // Naloži obstoječe podatke
  useEffect(() => {
    const load = async () => {
      if (!user) return;

      try {
        // Najprej preberi userja, da dobiš companyId
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (!userSnap.exists()) return;

        const userData = userSnap.data();
        const cid = userData.defaultCompanyId;
        if (!cid) return;

        setCompanyId(cid);

        // Preveri vlogo (samo boss lahko ureja)
        const membershipSnap = await getDoc(doc(db, 'memberships', `${user.uid}_${cid}`));
        if (membershipSnap.exists()) {
          const m = membershipSnap.data() as MembershipDoc;
          setIsBoss(m.role === 'boss');
        }

        // Naloži firma podatke
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
          setVatNumber(c.vatNumber || '');
          setBankName(c.bankDetails?.bankName || '');
          setIban(c.bankDetails?.iban ? formatIban(c.bankDetails.iban) : '');
          setQrIban(c.bankDetails?.qrIban ? formatIban(c.bankDetails.qrIban) : '');
          setLogoUrl(c.logoUrl || '');
          setLogoStoragePath(c.logoStoragePath || '');
        }
      } catch (err) {
        console.error('Fehler beim Laden:', err);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Validacija
    if (!name.trim()) {
      setError('Firmenname ist erforderlich.');
      return;
    }

    // IBAN validacija (samo če je vnesen)
    const cleanIban = iban.trim() ? normalizeIban(iban) : '';
    const cleanQrIban = qrIban.trim() ? normalizeIban(qrIban) : '';

    if (cleanIban && !isValidIban(cleanIban)) {
      setError('IBAN ist ungültig. Bitte prüfen Sie die Eingabe.');
      return;
    }

    if (cleanQrIban && !isValidQrIban(cleanQrIban)) {
      setError('QR-IBAN ist ungültig. QR-IBAN muss eine spezielle Bank-Nummer haben (IID 30000-31999). Fragen Sie Ihre Bank.');
      return;
    }

    setIsSaving(true);

    try {
      await updateDoc(doc(db, 'companies', companyId), {
        name: name.trim(),
        phone: phone.trim(),
        contactEmail: contactEmail.trim(),
        website: website.trim(),
        address: {
          street: street.trim(),
          zip: zip.trim(),
          city: city.trim(),
          country: country,
        },
        vatNumber: vatNumber.trim(),
        bankDetails: {
          bankName: bankName.trim(),
          iban: cleanIban,
          qrIban: cleanQrIban,
        },
      });

      setSuccessMessage('Firmenprofil erfolgreich gespeichert!');

      // Pobriši uspeh po 3 sekundah
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Fehler beim Speichern:', err);
      setError('Speichern fehlgeschlagen. Bitte erneut versuchen.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8">
        <p className="text-slate-400">Wird geladen...</p>
      </div>
    );
  }

  if (!isBoss) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8">
        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-6">
          <p className="text-yellow-300 font-medium">
            Sie haben keine Berechtigung, das Firmenprofil zu bearbeiten.
          </p>
          <p className="text-sm text-slate-400 mt-2">
            Nur der Geschäftsführer kann diese Daten ändern.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8">
      {/* Heading */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Firmenprofil</h1>
        <p className="text-slate-400 text-sm">
          Vervollständigen Sie die Daten — diese erscheinen auf allen Rechnungen.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ───── ALLGEMEIN ───── */}
        <section className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 pb-2 border-b border-slate-700">
            Allgemein
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-300">
                Firmenname <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500"
                placeholder="z.B. Müller Umzüge GmbH"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-300">Telefon</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500"
                  placeholder="+41 79 123 45 67"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-300">E-Mail</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500"
                  placeholder="info@firma.ch"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-slate-300">Website</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500"
                placeholder="https://www.firma.ch"
              />
            </div>
          </div>
        </section>

        {/* ───── ADRESSE ───── */}
        <section className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 pb-2 border-b border-slate-700">
            Adresse
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-300">Strasse und Nr.</label>
              <input
                type="text"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500"
                placeholder="Bahnhofstrasse 1"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-300">PLZ</label>
                <input
                  type="text"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500"
                  placeholder="8001"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2 text-slate-300">Ort</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500"
                  placeholder="Zürich"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-slate-300">Land</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500"
              >
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

        {/* ───── LOGO ───── */}
        <section className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 pb-2 border-b border-slate-700">
            Logo
          </h2>

          <LogoUploader
            companyId={companyId}
            currentLogoUrl={logoUrl}
            currentLogoPath={logoStoragePath}
            onUploadSuccess={(url, path) => {
              setLogoUrl(url);
              setLogoStoragePath(path);
              setSuccessMessage('Logo erfolgreich hochgeladen!');
              setTimeout(() => setSuccessMessage(null), 3000);
            }}
            onDeleteSuccess={() => {
              setLogoUrl('');
              setLogoStoragePath('');
              setSuccessMessage('Logo erfolgreich gelöscht.');
              setTimeout(() => setSuccessMessage(null), 3000);
            }}
          />
        </section>

        {/* ───── MWST ───── */}
        <section className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 pb-2 border-b border-slate-700">
            Mehrwertsteuer
          </h2>

          <div>
            <label className="block text-sm font-medium mb-2 text-slate-300">MwSt-Nummer</label>
            <input
              type="text"
              value={vatNumber}
              onChange={(e) => setVatNumber(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500 font-mono"
              placeholder="CHE-123.456.789 MWST"
            />
            <p className="text-xs text-slate-500 mt-2">
              ℹ️ Optional. Nur erforderlich wenn Sie MwSt-pflichtig sind (Jahresumsatz {'>'} CHF 100&apos;000).
            </p>
          </div>
        </section>

        {/* ───── BANK ───── */}
        <section className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 pb-2 border-b border-slate-700">
            Bank für QR-Rechnung
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-300">Bankname</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500"
                placeholder="z.B. UBS Switzerland AG"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-slate-300">IBAN</label>
              <input
                type="text"
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500 font-mono"
                placeholder="CH93 0076 2011 6238 5295 7"
              />
              <p className="text-xs text-slate-500 mt-2">
                Normaler IBAN für Banküberweisungen.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-slate-300">
                QR-IBAN <span className="text-blue-400">⭐</span>
              </label>
              <input
                type="text"
                value={qrIban}
                onChange={(e) => setQrIban(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500 font-mono"
                placeholder="CH44 3199 9123 0008 8901 2"
              />
              <p className="text-xs text-slate-500 mt-2">
                ℹ️ Der QR-IBAN ist eine spezielle IBAN für Swiss QR-Rechnungen. Sie können ihn kostenlos bei Ihrer Bank beantragen.
              </p>
            </div>
          </div>
        </section>

        {/* ───── ERROR / SUCCESS ───── */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-200 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-900/30 border border-green-700 text-green-200 px-4 py-3 rounded-md text-sm">
            ✓ {successMessage}
          </div>
        )}

        {/* ───── SUBMIT ───── */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-md transition-colors"
          >
            {isSaving ? 'Wird gespeichert...' : 'Speichern'}
          </button>
        </div>
      </form>
    </div>
  );
}