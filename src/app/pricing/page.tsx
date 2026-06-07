'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const PLANS = [
  {
    name: 'Free',
    price: { monthly: 0, yearly: 0 },
    description: 'Für den Einstieg — kostenlos für immer.',
    color: 'border-gray-200 dark:border-gray-700',
    badge: null,
    cta: 'Kostenlos starten',
    ctaStyle: 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-white',
    features: [
      { text: '3 Rechnungen pro Monat', included: true },
      { text: 'Ausgaben pro Monat', included: false },
      { text: '1 Benutzer', included: true },
      { text: 'PDF Export', included: true },
      { text: 'Bilanz Übersicht', included: true },
      { text: 'Logo auf Rechnungen', included: false },
      { text: 'Steuerexport PDF', included: false },
      { text: 'CSV Export', included: false },
      { text: 'Mitarbeiter hinzufügen', included: false },
      { text: 'FieldBill Wasserzeichen', included: false },
    ],
  },
  {
    name: 'Pro',
    price: { monthly: 39, yearly: 32 },
    description: 'Für selbstständige und kleine Firmen.',
    color: 'border-blue-500',
    badge: 'Beliebteste Wahl',
    cta: '30 Tage kostenlos testen',
    ctaStyle: 'bg-blue-600 hover:bg-blue-700 text-white',
    features: [
      { text: 'Bis zu 50 Rechnungen pro Monat', included: true },
      { text: 'Bis zu 50 Ausgaben pro Monat', included: true },
      { text: 'Bis zu 3 Mitarbeiter', included: true },
      { text: 'PDF Export', included: true },
      { text: 'Bilanz Übersicht', included: true },
      { text: 'Logo auf Rechnungen', included: true },
      { text: 'Steuerexport PDF', included: true },
      { text: 'CSV Export', included: true },
      { text: 'E-Mail Versand', included: true },
      { text: 'Kein Wasserzeichen', included: true },
    ],
  },
  {
    name: 'Business',
    price: { monthly: 79, yearly: 65 },
    description: 'Für wachsende Unternehmen und GmbH.',
    color: 'border-gray-200 dark:border-gray-700',
    badge: null,
    cta: '30 Tage kostenlos testen',
    ctaStyle: 'bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900',
    features: [
      { text: 'Unbegrenzte Rechnungen', included: true },
      { text: 'Unbegrenzte Ausgaben', included: true },
      { text: 'Bis zu 50 Mitarbeiter', included: true },
      { text: 'PDF Export', included: true },
      { text: 'Bilanz Übersicht', included: true },
      { text: 'Logo auf Rechnungen', included: true },
      { text: 'Steuerexport PDF', included: true },
      { text: 'CSV Export', included: true },
      { text: 'E-Mail Versand', included: true },
      { text: 'Swiss QR-Rechnung', included: true },
      { text: 'Prioritaets Support', included: true },
      { text: 'Kein Wasserzeichen', included: true },
    ],
  },
];

const FAQ = [
  {
    q: 'Brauche ich eine Kreditkarte für den Free Plan?',
    a: 'Nein. Der Free Plan ist dauerhaft kostenlos — keine Kreditkarte erforderlich.',
  },
  {
    q: 'Was passiert nach den 30 Tagen?',
    a: 'Nach dem Trial wechseln Sie automatisch auf den Free Plan. Ihre Daten bleiben erhalten.',
  },
  {
    q: 'Kann ich jederzeit kündigen?',
    a: 'Ja. Keine Mindestlaufzeit — monatlich kündbar.',
  },
  {
    q: 'Ist FieldBill für Schweizer Firmen geeignet?',
    a: 'Ja. FieldBill wurde speziell für Schweizer KMU entwickelt — mit MwSt 8.1%, Swiss QR-Rechnung und OR-konformer Archivierung.',
  },
  {
    q: 'Gibt es einen Jahresrabatt?',
    a: 'Ja! Bei Jahreszahlung sparen Sie ca. 20% gegenüber dem Monatspreis.',
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [yearly, setYearly] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      {/* Nav */}
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-blue-600">FieldBill</span>
          <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">Swiss</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/login')}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            Anmelden
          </button>
          <button onClick={() => router.push('/register')}
            className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium">
            Kostenlos starten
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-16">

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Einfache Preise.<br />Keine Überraschungen.
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            Entwickelt für Schweizer KMU — transparent, günstig, MWST-konform.
          </p>

          <div className="flex items-center justify-center gap-3 mt-8">
            <span className={`text-sm font-medium ${!yearly ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
              Monatlich
            </span>
            <button onClick={() => setYearly(!yearly)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${yearly ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${yearly ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className={`text-sm font-medium ${yearly ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
              Jährlich
            </span>
            {yearly && (
              <span className="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                20% Rabatt
              </span>
            )}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {PLANS.map((plan) => (
            <div key={plan.name}
              className={`relative bg-white dark:bg-gray-900 rounded-2xl border-2 ${plan.color} p-8 flex flex-col`}>

              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-blue-600 text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{plan.name}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{plan.description}</p>
              </div>

              <div className="mb-6">
                {plan.price.monthly === 0 ? (
                  <div>
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">Kostenlos</span>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-gray-900 dark:text-white">
                        CHF {yearly ? plan.price.yearly : plan.price.monthly}
                      </span>
                      <span className="text-gray-400 dark:text-gray-500 text-sm">/Monat</span>
                    </div>
                    {yearly && (
                      <p className="text-xs text-gray-400 mt-1">
                        CHF {plan.price.yearly * 12} pro Jahr · statt CHF {plan.price.monthly * 12}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => router.push('/register')}
                className={`w-full py-3 rounded-xl font-medium text-sm transition-colors mb-8 ${plan.ctaStyle}`}>
                {plan.cta}
              </button>

              <ul className="space-y-3 flex-1">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    {feature.included ? (
                      <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-gray-300 dark:text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    <span className={`text-sm ${feature.included ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}`}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Vergleich */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 mb-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            Warum FieldBill?
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Anbieter</th>
                  <th className="text-right py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Preis/Monat</th>
                  <th className="text-right py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Swiss QR</th>
                  <th className="text-right py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Mobil</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-blue-50 dark:bg-blue-900/10">
                  <td className="py-3 px-4 font-bold text-blue-600 dark:text-blue-400">FieldBill Pro</td>
                  <td className="py-3 px-4 text-right font-bold text-blue-600 dark:text-blue-400">CHF 39</td>
                  <td className="py-3 px-4 text-right text-green-500">✓</td>
                  <td className="py-3 px-4 text-right text-green-500">✓</td>
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 px-4 text-gray-700 dark:text-gray-300">Bexio Small</td>
                  <td className="py-3 px-4 text-right text-gray-500">CHF 35</td>
                  <td className="py-3 px-4 text-right text-green-500">✓</td>
                  <td className="py-3 px-4 text-right text-gray-400">teilweise</td>
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 px-4 text-gray-700 dark:text-gray-300">Bexio Medium</td>
                  <td className="py-3 px-4 text-right text-gray-500">CHF 59</td>
                  <td className="py-3 px-4 text-right text-green-500">✓</td>
                  <td className="py-3 px-4 text-right text-gray-400">teilweise</td>
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 px-4 text-gray-700 dark:text-gray-300">AbaNinja</td>
                  <td className="py-3 px-4 text-right text-gray-500">CHF 29+</td>
                  <td className="py-3 px-4 text-right text-green-500">✓</td>
                  <td className="py-3 px-4 text-right text-gray-400">teilweise</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-gray-700 dark:text-gray-300">Magic Heidi</td>
                  <td className="py-3 px-4 text-right text-gray-500">CHF 30</td>
                  <td className="py-3 px-4 text-right text-green-500">✓</td>
                  <td className="py-3 px-4 text-right text-green-500">✓</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mb-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Häufige Fragen
          </h2>
          <div className="space-y-3">
            {FAQ.map((item, idx) => (
              <div key={idx}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left">
                  <span className="font-medium text-gray-900 dark:text-white text-sm">{item.q}</span>
                  <svg className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ml-4 ${openFaq === idx ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA Banner */}
        <div className="bg-blue-600 rounded-2xl p-10 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">
            30 Tage kostenlos testen
          </h2>
          <p className="text-blue-100 mb-6 text-sm">
            Keine Kreditkarte. Keine Verpflichtung. Jederzeit kündbar.
          </p>
          <button onClick={() => router.push('/register')}
            className="bg-white hover:bg-gray-100 text-blue-600 font-bold px-8 py-3 rounded-xl transition-colors">
            Jetzt starten — kostenlos
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-gray-400 text-sm">
            FieldBill · Entwickelt von Vodnik Digital Solutions · vodnik.ch
          </p>
          <p className="text-gray-300 dark:text-gray-600 text-xs mt-1">
            Preise exkl. MwSt · CHF · Schweiz
          </p>
        </div>

      </div>
    </div>
  );
}