import Link from 'next/link';

export default function AgbPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-blue-600">FieldBill</Link>
        <Link href="/login" className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium">
          Anmelden
        </Link>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Allgemeine Geschäftsbedingungen</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-2 text-sm">Stand: {new Date().toLocaleDateString('de-CH')}</p>
        <p className="text-gray-500 dark:text-gray-400 mb-10 text-sm">
          Vodnik Digital Solutions · Tomaz Vodnik · Fischthürweg 37, 4802 Strengelbach
        </p>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-4 mb-8">
          <p className="text-yellow-800 dark:text-yellow-300 text-sm font-medium">Beta Version</p>
          <p className="text-yellow-700 dark:text-yellow-400 text-sm mt-1">
            FieldBill befindet sich in der Beta-Phase. Diese AGB können sich noch ändern.
          </p>
        </div>

        <div className="space-y-6 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">

          {[
            { title: '§ 1 Geltungsbereich und Vertragsparteien', content: [
              'Diese Allgemeinen Geschäftsbedingungen gelten für alle Verträge zwischen Vodnik Digital Solutions, Inhaber Tomaz Vodnik, Fischthürweg 37, 4802 Strengelbach (nachfolgend "Anbieter") und den Nutzern der Software FieldBill (nachfolgend "Kunde").',
              'FieldBill ist eine cloudbasierte Rechnungs- und Buchhaltungssoftware für Schweizer Kleinunternehmen, erreichbar unter www.fieldbill.ch.',
              'Mit der Registrierung akzeptiert der Kunde diese AGB vollumfänglich.',
              'Diese AGB richten sich ausschliesslich an Unternehmer. FieldBill ist nicht für Konsumenten bestimmt.',
            ]},
            { title: '§ 2 Leistungsbeschreibung', content: [
              'FieldBill stellt eine webbasierte SaaS-Lösung bereit mit: Rechnungserstellung (inkl. Swiss QR-Rechnung), Ausgabenverwaltung, Finanzbilanz, Steuerexport-Unterlagen, Kundenverwaltung, Mehrbenutzer-Funktion, PDF- und CSV-Export.',
              'Der Leistungsumfang richtet sich nach der gewählten Abonnementstufe (Free, Pro, Business). Details: www.fieldbill.ch/pricing.',
              'FieldBill ersetzt keine professionelle Steuer- oder Rechtsberatung. Der Anbieter übernimmt keine Haftung für die steuerliche Korrektheit der erstellten Dokumente.',
            ]},
            { title: '§ 3 Registrierung und Benutzerkonto', content: [
              'Zur Nutzung ist eine Registrierung mit gültiger E-Mail-Adresse erforderlich. Der Kunde garantiert die Richtigkeit seiner Angaben.',
              'Der Kunde ist für die Geheimhaltung seiner Zugangsdaten verantwortlich.',
              'Der Anbieter kann Konten bei Missbrauch oder AGB-Verstoss sperren.',
            ]},
            { title: '§ 4 Abonnement, Preise und Zahlung', content: [
              'FieldBill wird in drei Stufen angeboten: Free (kostenlos), Pro (CHF 39/Monat) und Business (CHF 79/Monat). Preise exkl. MwSt.',
              'Neue Konten erhalten 30 Tage kostenlose Pro-Testphase. Nach Ablauf erfolgt automatische Rückstufung auf Free.',
              'Abrechnung monatlich oder jährlich im Voraus über Stripe Inc.',
              'Preisänderungen werden 30 Tage im Voraus angekündigt. Bei Erhöhungen besteht ausserordentliches Kündigungsrecht.',
            ]},
            { title: '§ 5 Kündigung', content: [
              'Free-Abonnements laufen auf unbestimmte Zeit.',
              'Kostenpflichtige Abonnements sind monatlich kündbar, bei Jahreszahlung zum Ende der Laufzeit.',
              'Kündigung per App-Einstellungen oder E-Mail an info@fieldbill.ch.',
              'Nach Kündigung: 30 Tage Datenexport möglich, danach unwiderrufliche Löschung.',
            ]},
            { title: '§ 6 Verfügbarkeit und Datensicherung', content: [
              'Angestrebte Verfügbarkeit: 99% im Jahresdurchschnitt. Kein Rechtsanspruch.',
              'Regelmässige Datensicherungen. Kein Rechtsanspruch auf Datensicherung.',
              'Keine Haftung für Datenverluste durch höhere Gewalt oder Dritte.',
            ]},
            { title: '§ 7 Pflichten des Kunden', content: [
              'Nutzung ausschliesslich für legale Zwecke.',
              'Verantwortung für Richtigkeit der eingegebenen Daten.',
              'Eigenverantwortung für steuerliche und buchhalterische Vorschriften.',
              'Reverse Engineering, Kopieren oder Weiterverkauf der Software ist untersagt.',
            ]},
            { title: '§ 8 Haftungsbeschränkung', content: [
              'Haftung nur bei Vorsatz oder grober Fahrlässigkeit.',
              'Keine Haftung für indirekte Schäden, Folgeschäden oder entgangenen Gewinn.',
              'Maximale Haftung: Betrag der in den letzten 12 Monaten bezahlten Abonnementgebühren.',
              'Keine Gewähr für steuerliche Konformität der erstellten Dokumente.',
            ]},
            { title: '§ 9 Geistiges Eigentum', content: [
              'Alle Rechte an FieldBill verbleiben beim Anbieter.',
              'Dem Kunden wird ein nicht-exklusives Nutzungsrecht für die Abonnementdauer eingeräumt.',
              'Vom Kunden eingegebene Daten bleiben Eigentum des Kunden.',
            ]},
            { title: '§ 10 Änderungen der AGB', content: [
              'AGB-Änderungen werden per E-Mail angekündigt.',
              'Kein Widerspruch innerhalb von 30 Tagen gilt als Zustimmung.',
            ]},
            { title: '§ 11 Anwendbares Recht und Gerichtsstand', content: [
              'Es gilt Schweizer Recht, unter Ausschluss von Kollisionsnormen und UN-Kaufrecht.',
              'Gerichtsstand: Aarau, Kanton Aargau, Schweiz.',
            ]},
            { title: '§ 12 Schlussbestimmungen', content: [
              'Unwirksame Bestimmungen berühren die übrigen nicht.',
              'Kontakt: info@fieldbill.ch · Vodnik Digital Solutions · Fischthürweg 37, 4802 Strengelbach',
            ]},
          ].map((section, idx) => (
            <div key={idx} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
              <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">{section.title}</h2>
              <div className="space-y-2">
                {section.content.map((text, i) => (
                  <p key={i} className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {i + 1}. {text}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-4 justify-center mt-12 text-sm">
          <Link href="/impressum" className="text-blue-600 dark:text-blue-400 hover:underline">Impressum</Link>
          <Link href="/datenschutz" className="text-blue-600 dark:text-blue-400 hover:underline">Datenschutz</Link>
          <Link href="/pricing" className="text-blue-600 dark:text-blue-400 hover:underline">Preise</Link>
        </div>
        <p className="text-center text-gray-400 text-xs mt-4">
          © {new Date().getFullYear()} Vodnik Digital Solutions · FieldBill
        </p>
      </div>
    </div>
  );
}