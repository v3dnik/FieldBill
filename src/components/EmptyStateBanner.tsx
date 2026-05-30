'use client';

import Link from 'next/link';
import { CompanyDoc } from '@/types/firestore';

type EmptyStateBannerProps = {
  company: CompanyDoc | null;
};

type MissingItem = {
  label: string;
  href: string;
};

export default function EmptyStateBanner({ company }: EmptyStateBannerProps) {
  if (!company) return null;

  // Preveri, kaj manjka
  const missing: MissingItem[] = [];

  const hasAddress =
    !!company.address?.street &&
    !!company.address?.zip &&
    !!company.address?.city;
  if (!hasAddress) {
    missing.push({ label: 'Firmenadresse', href: '/dashboard/firma' });
  }

  const hasIban = !!company.bankDetails?.iban;
  const hasQrIban = !!company.bankDetails?.qrIban;
  if (!hasIban && !hasQrIban) {
    missing.push({ label: 'Bankverbindung (IBAN)', href: '/dashboard/firma' });
  }

  const hasLogo = !!company.logoUrl;
  if (!hasLogo) {
    missing.push({ label: 'Firmenlogo', href: '/dashboard/firma' });
  }

  // Če ni nič manjka — ne prikaži banner-ja
  if (missing.length === 0) return null;

  return (
    <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-6 mb-6">
      <div className="flex items-start gap-3 mb-4">
        <span className="text-2xl">⚠️</span>
        <div className="flex-1">
          <h3 className="text-yellow-200 font-semibold mb-1">
            Ihr Firmenprofil ist unvollständig
          </h3>
          <p className="text-sm text-slate-400">
            Bevor Sie professionelle Rechnungen erstellen können, ergänzen Sie bitte:
          </p>
        </div>
      </div>

      {/* Seznam manjkajočih stvari */}
      <ul className="space-y-2 mb-4 ml-9">
        {missing.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-sm text-slate-300">
            <span className="text-yellow-500">•</span>
            <span>{item.label}</span>
          </li>
        ))}
      </ul>

      {/* CTA gumb */}
      <div className="ml-9">
        <Link
          href="/dashboard/firma"
          className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-medium rounded-md transition-colors"
        >
          Jetzt vervollständigen
          <span>→</span>
        </Link>
      </div>
    </div>
  );
}