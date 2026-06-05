import Link from 'next/link';

export default function DatenschutzPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-blue-600">FieldBill</Link>
        <Link href="/login" className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium">
          Anmelden
        </Link>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Datenschutzerklärung</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-2 text-sm">Stand: {new Date().toLocaleDateString('de-CH')}</p>
        <p className="text-gray-500 dark:text-gray-400 mb-10 text-sm">
          Gemäss nDSG (Schweizer Datenschutzgesetz) und DSGVO
        </p>

        <div className="space-y-6 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">1. Verantwortliche Stelle</h2>
            <div className="text-gray-600 dark:text-gray-400 space-y-1">
              <p className="font-medium">Vodnik Digital Solutions</p>
              <p>Inhaber: Tomaz Vodnik</p>
              <p>Fischthürweg 37, 4802 Strengelbach, Aargau, Schweiz</p>
              <p>E-Mail: <a href="mailto:info@fieldbill.ch" className="text-blue-600 dark:text-blue-400 hover:underline">info@fieldbill.ch</a></p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">2. Grundsätze</h2>
            <div className="space-y-2 text-gray-600 dark:text-gray-400">
              <p>Wir verarbeiten personenbezogene Daten nur soweit nötig. Wir verkaufen keine Daten an Dritte. Wir halten die Grundsätze der Datensparsamkeit und Zweckbindung ein.</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">3. Erhobene Daten</h2>
            <div className="space-y-4 text-gray-600 dark:text-gray-400">
              <div>
                <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Registrierungsdaten</p>
                <p>E-Mail, Vor- und Nachname, Firmendaten (Name, Adresse, MwSt-Nr). Zweck: Bereitstellung des Kontos.</p>
              </div>
              <div>
                <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Nutzungsdaten</p>
                <p>Rechnungen, Ausgaben, Kundendaten, Zahlungsinfos (IBAN). Zweck: Erbringung der Softwareleistungen.</p>
              </div>
              <div>
                <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Technische Daten</p>
                <p>IP-Adresse (anonymisiert), Browser-Typ, Zugriffszeitpunkt. Zweck: Sicherheit und Fehleranalyse.</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">4. Drittanbieter</h2>
            <div className="space-y-4 text-gray-600 dark:text-gray-400">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="font-medium text-gray-700 dark:text-gray-300">Google Firebase (Alphabet Inc., USA)</p>
                <p className="text-xs mt-1">Authentication, Datenbank (Firestore), Datei-Speicher. Server primär in Europa. EU-US Data Privacy Framework zertifiziert.</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="font-medium text-gray-700 dark:text-gray-300">Vercel Inc. (USA)</p>
                <p className="text-xs mt-1">Hosting der Webanwendung. Verarbeitet technische Zugriffsdaten.</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="font-medium text-gray-700 dark:text-gray-300">Stripe Inc. (USA) — geplant</p>
                <p className="text-xs mt-1">Zahlungsabwicklung für kostenpflichtige Abonnements. PCI-DSS-zertifiziert. Keine Kreditkartendaten bei FieldBill gespeichert.</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">5. Aufbewahrungsfristen</h2>
            <div className="space-y-2 text-gray-600 dark:text-gray-400">
              <p>Rechnungen und Buchungsbelege: Mindestens 10 Jahre (OR Art. 958f)</p>
              <p>Kontodaten: Dauer des Vertragsverhältnisses + 30 Tage nach Kündigung</p>
              <p>Technische Logs: Maximal 90 Tage</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">6. Ihre Rechte (nDSG / DSGVO)</h2>
            <div className="space-y-2 text-gray-600 dark:text-gray-400">
              <p>✓ Auskunftsrecht über gespeicherte Daten</p>
              <p>✓ Berichtigungsrecht für unrichtige Daten</p>
              <p>✓ Löschungsrecht (soweit keine Aufbewahrungspflicht)</p>
              <p>✓ Datenportabilität (CSV / PDF Export)</p>
              <p>✓ Widerspruchsrecht</p>
              <p className="mt-3">Anfragen an: <a href="mailto:info@fieldbill.ch" className="text-blue-600 dark:text-blue-400 hover:underline">info@fieldbill.ch</a></p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">7. Datensicherheit</h2>
            <div className="space-y-2 text-gray-600 dark:text-gray-400">
              <p>Alle Übertragungen verschlüsselt via HTTPS/TLS. Passwörter nicht im Klartext (Firebase Auth). Zugriff durch Firestore Security Rules beschränkt.</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">8. Beschwerderecht</h2>
            <div className="text-gray-600 dark:text-gray-400">
              <p>Eidgenössischer Datenschutz- und Öffentlichkeitsbeauftragter (EDÖB)</p>
              <p>Feldeggweg 1, 3003 Bern · <a href="https://www.edoeb.admin.ch" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">www.edoeb.admin.ch</a></p>
            </div>
          </div>

        </div>

        <div className="flex flex-wrap gap-4 justify-center mt-12 text-sm">
          <Link href="/impressum" className="text-blue-600 dark:text-blue-400 hover:underline">Impressum</Link>
          <Link href="/agb" className="text-blue-600 dark:text-blue-400 hover:underline">AGB</Link>
          <Link href="/pricing" className="text-blue-600 dark:text-blue-400 hover:underline">Preise</Link>
        </div>
        <p className="text-center text-gray-400 text-xs mt-4">
          © {new Date().getFullYear()} Vodnik Digital Solutions · FieldBill
        </p>
      </div>
    </div>
  );
}