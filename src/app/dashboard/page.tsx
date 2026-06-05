'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { CompanyDoc, UserDoc, MembershipDoc, InvoiceDoc, ExpenseDoc } from '@/types/firestore';
import { useRouter } from 'next/navigation';
import EmptyStateBanner from '@/components/EmptyStateBanner';

function formatCHF(rappen: number) {
  return 'CHF ' + (rappen / 100).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [company, setCompany] = useState<CompanyDoc | null>(null);
  const [membership, setMembership] = useState<MembershipDoc | null>(null);
  const [loading, setLoading] = useState(true);

  // Statistiken
  const [totalEinnahmenMonat, setTotalEinnahmenMonat] = useState(0);
  const [totalAusgabenMonat, setTotalAusgabenMonat] = useState(0);
  const [offeneRechnungen, setOffeneRechnungen] = useState<InvoiceDoc[]>([]);
  const [letzteRechnungen, setLetzteRechnungen] = useState<InvoiceDoc[]>([]);
  const [totalJahr, setTotalJahr] = useState(0);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      if (!userSnap.exists()) return;
      const userData = userSnap.data() as UserDoc;
      setUserDoc(userData);
      if (!userData.defaultCompanyId) { setLoading(false); return; }
      const cId = userData.defaultCompanyId;

      const [companySnap, membershipSnap, invSnap, expSnap] = await Promise.all([
        getDoc(doc(db, 'companies', cId)),
        getDoc(doc(db, 'memberships', `${user.uid}_${cId}`)),
        getDocs(collection(db, 'companies', cId, 'invoices')),
        getDocs(collection(db, 'companies', cId, 'expenses')),
      ]);

      if (companySnap.exists()) setCompany(companySnap.data() as CompanyDoc);
      if (membershipSnap.exists()) setMembership(membershipSnap.data() as MembershipDoc);

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const invoices = invSnap.docs.map(d => ({ ...d.data(), invoiceId: d.id } as InvoiceDoc));
      const expenses = expSnap.docs.map(d => d.data() as ExpenseDoc);

      // Offene Rechnungen
      const offen = invoices.filter(i => i.status === 'issued');
      setOffeneRechnungen(offen);

      // Letzte 3 Rechnungen
      const sorted = [...invoices].sort((a, b) => {
        const aDate = a.issueDate?.toDate?.() ?? new Date(0);
        const bDate = b.issueDate?.toDate?.() ?? new Date(0);
        return bDate.getTime() - aDate.getTime();
      });
      setLetzteRechnungen(sorted.slice(0, 3));

      // Einnahmen diesen Monat (bezahlt)
      const einMonat = invoices
        .filter(i => {
          if (i.status !== 'paid') return false;
          const d = i.issueDate?.toDate?.() ?? new Date();
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((s, i) => s + i.totalRappen, 0);
      setTotalEinnahmenMonat(einMonat);

      // Ausgaben diesen Monat
      const ausMonat = expenses
        .filter(e => {
          const d = e.date?.toDate?.() ?? new Date();
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((s, e) => s + e.amountRappen, 0);
      setTotalAusgabenMonat(ausMonat);

      // Jahresumsatz
      const jahresTotal = invoices
        .filter(i => {
          if (i.status !== 'paid') return false;
          const d = i.issueDate?.toDate?.() ?? new Date();
          return d.getFullYear() === currentYear;
        })
        .reduce((s, i) => s + i.totalRappen, 0);
      setTotalJahr(jahresTotal);

      setLoading(false);
    };
    load();
  }, [user]);

  const isBoss = membership?.role === 'boss';
  const nettoMonat = totalEinnahmenMonat - totalAusgabenMonat;
  const MONATE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  const currentMonatName = MONATE[new Date().getMonth()];
  const currentYear = new Date().getFullYear();

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    draft:     { label: 'Entwurf',     color: 'text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-gray-700' },
    issued:    { label: 'Ausgestellt', color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/40' },
    paid:      { label: 'Bezahlt',     color: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/40' },
    cancelled: { label: 'Storniert',   color: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/40' },
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-gray-400">Wird geladen...</div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">

      {/* Begrüssung */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1">
          Willkommen, {userDoc?.firstName || 'Benutzer'}!
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          {isBoss ? 'Geschäftsführer' : 'Mitarbeiter'}
          {company?.name && ` · ${company.name}`}
        </p>
      </div>

      {isBoss && <EmptyStateBanner company={company} />}

      {/* KPI Kartice — aktueller Monat */}
      <div>
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
          {currentMonatName} {currentYear}
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Einnahmen</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatCHF(totalEinnahmenMonat)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">bezahlt</p>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Ausgaben</p>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatCHF(totalAusgabenMonat)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">diesen Monat</p>
          </div>
          <div className={`rounded-xl p-4 border ${nettoMonat >= 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-500/30' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-500/30'}`}>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Netto</p>
            <p className={`text-lg font-bold ${nettoMonat >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatCHF(nettoMonat)}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Gewinn/Verlust</p>
          </div>
        </div>
      </div>

      {/* Jahresumsatz */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wide">Jahresumsatz {currentYear}</p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">{formatCHF(totalJahr)}</p>
        </div>
        <button onClick={() => router.push('/dashboard/bilanz')}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">
          Bilanz öffnen →
        </button>
      </div>

      {/* Offene Rechnungen */}
      {offeneRechnungen.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Offene Rechnungen</p>
              <span className="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 text-xs font-medium px-2 py-0.5 rounded-full">
                {offeneRechnungen.length}
              </span>
            </div>
            <p className="text-sm font-bold text-yellow-600 dark:text-yellow-400">
              {formatCHF(offeneRechnungen.reduce((s, i) => s + i.totalRappen, 0))}
            </p>
          </div>
          {offeneRechnungen.slice(0, 3).map((inv, idx) => (
            <div key={idx}
              onClick={() => router.push(`/dashboard/rechnungen/${inv.invoiceId}`)}
              className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{inv.customerName}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{inv.invoiceNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCHF(inv.totalRappen)}</p>
                <p className="text-xs text-blue-500 dark:text-blue-400">Ausgestellt</p>
              </div>
            </div>
          ))}
          {offeneRechnungen.length > 3 && (
            <div className="px-5 py-3 text-center">
              <button onClick={() => router.push('/dashboard/rechnungen')}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                Alle {offeneRechnungen.length} offene Rechnungen anzeigen →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Letzte Rechnungen */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Letzte Rechnungen</p>
          <button onClick={() => router.push('/dashboard/rechnungen')}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
            Alle anzeigen →
          </button>
        </div>
        {letzteRechnungen.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-gray-400 dark:text-gray-500 text-sm">Noch keine Rechnungen.</p>
            <button onClick={() => router.push('/dashboard/rechnungen/neu')}
              className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline">
              Erste Rechnung erstellen →
            </button>
          </div>
        ) : (
          letzteRechnungen.map((inv, idx) => (
            <div key={idx}
              onClick={() => router.push(`/dashboard/rechnungen/${inv.invoiceId}`)}
              className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors last:border-b-0">
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_LABELS[inv.status]?.color}`}>
                  {STATUS_LABELS[inv.status]?.label}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{inv.customerName}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {inv.invoiceNumber} · {inv.issueDate?.toDate?.()?.toLocaleDateString('de-CH')}
                  </p>
                </div>
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCHF(inv.totalRappen)}</p>
            </div>
          ))
        )}
      </div>

      {/* Schnellzugriff */}
      <div>
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Schnellzugriff</p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => router.push('/dashboard/rechnungen/neu')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-colors text-sm">
            + Neue Rechnung
          </button>
          <button onClick={() => router.push('/dashboard/ausgaben/neu')}
            className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium py-3 rounded-xl transition-colors text-sm">
            + Neue Ausgabe
          </button>
        </div>
      </div>

    </div>
  );
}