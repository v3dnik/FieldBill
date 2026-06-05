import Link from 'next/link';

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-blue-600">FieldBill</Link>
        <Link href="/login" className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium">
          Anmelden
        </Link>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Impressum</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-10 text-sm">Gemäss Art. 3 UWG und Art. 13 DSG</p>

        <div className="space-y-8">

          <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
              Anbieter
            </h2>
            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <p className="font-medium text-gray-900 dark:text-white text-base">Vodnik Digital Solutions</p>
              <p>Inhaber: Tomaz Vodnik</p>
              <p>Fischthürweg 37</p>
              <p>4802 Strengelbach</p>
              <p>Kanton Aargau, Schweiz</p>
            </div>
          </section>

          <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
              Kontakt
            </h2>
            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <p>E-Mail: <a href="mailto:info@fieldbill.ch" className="text-blue-600 dark:text-blue-400 hover:underline">info@fieldbill.ch</a></p>
              <p>Website: <a href="https://www.fieldbill.ch" className="text-blue-600 dark:text-blue-400 hover:underline">www.fieldbill.ch</a></p>
            </div>
          </section>

          <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
              Unternehmensform
            </h2>
            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <p>Einzelunternehmen (Selbstständigerwerbender)</p>
              <p>Nicht im Handelsregister eingetragen</p>
              <p>Nicht MwSt-pflichtig (Jahresumsatz unter CHF 100'000)</p>
            </div>
          </section>

          <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
              Verantwortlich für den Inhalt
            </h2>
            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <p>Tomaz Vodnik</p>
              <p>Fischthürweg 37, 4802 Strengelbach</p>
            </div>
          </section>

          <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
              Haftungsausschluss
            </h2>
            <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <p>Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind ausschliesslich deren Betreiber verantwortlich.</p>
              <p>FieldBill ist ein Hilfsmittel für die Rechnungsstellung. Es ersetzt keine professionelle Steuer- oder Rechtsberatung.</p>
            </div>
          </section>

          <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
              Urheberrecht
            </h2>
            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <p>Alle Inhalte dieser Website — Texte, Grafiken, Logos und Software — sind urheberrechtlich geschützt.</p>
              <p>© {new Date().getFullYear()} Vodnik Digital Solutions. Alle Rechte vorbehalten.</p>
            </div>
          </section>

          <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
              Technische Infrastruktur
            </h2>
            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <p>Hosting: Vercel Inc., San Francisco, USA</p>
              <p>Datenbank: Google Firebase (Alphabet Inc., USA)</p>
              <p>Entwickelt mit: Next.js, TypeScript, Tailwind CSS</p>
            </div>
          </section>

          <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
              Rechtliche Dokumente
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-700 dark:text-gray-300">Allgemeine Geschäftsbedingungen (AGB)</span>
                <Link href="/agb" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">Öffnen →</Link>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-700 dark:text-gray-300">Datenschutzerklärung</span>
                <Link href="/datenschutz" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">Öffnen →</Link>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-700 dark:text-gray-300">Preise und Abonnements</span>
                <Link href="/pricing" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">Öffnen →</Link>
              </div>
            </div>
          </section>

        </div>

        <p className="text-center text-gray-400 text-xs mt-12">
          FieldBill · Vodnik Digital Solutions · Stand {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}