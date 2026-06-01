'use client';

import { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { InvoiceDoc, ExpenseDoc } from '@/types/firestore';

function formatCHF(rappen: number) {
  const chf = rappen / 100;
  return 'CHF ' + chf.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const MONATE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

interface MonthData {
  month: number;
  year: number;
  einnahmenRappen: number;
  ausgabenRappen: number;
  nettoRappen: number;
}

export default function BilanzPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [monthlyData, setMonthlyData] = useState<MonthData[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  const totalEinnahmen = monthlyData.reduce((sum, m) => sum + m.einnahmenRappen, 0);
  const totalAusgaben = monthlyData.reduce((sum, m) => sum + m.ausgabenRappen, 0);
  const totalNetto = totalEinnahmen - totalAusgaben;

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (!userSnap.exists()) return;
        const cId = userSnap.data().defaultCompanyId;

        // Alle Rechnungen laden (nur bezahlte)
        const invoicesSnap = await getDocs(collection(db, 'companies', cId, 'invoices'));
        const invoices = invoicesSnap.docs
          .map(d => d.data() as InvoiceDoc)
          .filter(i => i.status === 'paid');

        // Alle Ausgaben laden
        const expensesSnap = await getDocs(collection(db, 'companies', cId, 'expenses'));
        const expenses = expensesSnap.docs.map(d => d.data() as ExpenseDoc);

        // Jahre ermitteln
        const years = new Set<number>();
        invoices.forEach(i => {
          const d = i.issueDate?.toDate ? i.issueDate.toDate() : new Date();
          years.add(d.getFullYear());
        });
        expenses.forEach(e => {
          const d = e.date?.toDate ? e.date.toDate() : new Date();
          years.add(d.getFullYear());
        });
        years.add(new Date().getFullYear());
        const sortedYears = Array.from(years).sort((a, b) => b - a);
        setAvailableYears(sortedYears);

        // Monatsdaten berechnen
        calculateMonthlyData(invoices, expenses, selectedYear);
      } catch (err: any) {
        setError('Fehler: ' + (err?.message || 'Unbekannt'));
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user]);

  const calculateMonthlyData = (invoices: InvoiceDoc[], expenses: ExpenseDoc[], year: number) => {
    const data: MonthData[] = [];

    for (let month = 0; month < 12; month++) {
      // Einnahmen (bezahlte Rechnungen)
      const einnahmenRappen = invoices
        .filter(i => {
          const d = i.issueDate?.toDate ? i.issueDate.toDate() : new Date();
          return d.getFullYear() === year && d.getMonth() === month;
        })
        .reduce((sum, i) => sum + (i.totalRappen || 0), 0);

      // Ausgaben
      const ausgabenRappen = expenses
        .filter(e => {
          const d = e.date?.toDate ? e.date.toDate() : new Date();
          return d.getFullYear() === year && d.getMonth() === month;
        })
        .reduce((sum, e) => sum + (e.amountRappen || 0), 0);

      data.push({
        month,
        year,
        einnahmenRappen,
        ausgabenRappen,
        nettoRappen: einnahmenRappen - ausgabenRappen,
      });
    }

    setMonthlyData(data);
  };

  const handleYearChange = async (year: number) => {
    setSelectedYear(year);
    setLoading(true);
    try {
      const userSnap = await getDoc(doc(db, 'users', user!.uid));
      if (!userSnap.exists()) return;
      const cId = userSnap.data().defaultCompanyId;

      const [invoicesSnap, expensesSnap] = await Promise.all([
        getDocs(collection(db, 'companies', cId, 'invoices')),
        getDocs(collection(db, 'companies', cId, 'expenses')),
      ]);

      const invoices = invoicesSnap.docs
        .map(d => d.data() as InvoiceDoc)
        .filter(i => i.status === 'paid');
      const expenses = expensesSnap.docs.map(d => d.data() as ExpenseDoc);

      calculateMonthlyData(invoices, expenses, year);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-gray-400">Wird geladen...</div>
    </div>
  );

  return (
    <div className="px-4 py-8 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Bilanz</h1>
          <p className="text-gray-400 mt-1">Finanzübersicht Ihres Unternehmens.</p>
        </div>
        <select
          value={selectedYear}
          onChange={e => handleYearChange(parseInt(e.target.value))}
          className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
        >
          {availableYears.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Jahres-Zusammenfassung */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-1">Einnahmen {selectedYear}</p>
          <p className="text-green-400 text-xl font-bold">{formatCHF(totalEinnahmen)}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-1">Ausgaben {selectedYear}</p>
          <p className="text-red-400 text-xl font-bold">{formatCHF(totalAusgaben)}</p>
        </div>
        <div className={`rounded-xl p-5 ${totalNetto >= 0 ? 'bg-green-900/20 border border-green-500/30' : 'bg-red-900/20 border border-red-500/30'}`}>
          <p className="text-gray-400 text-sm mb-1">Netto {selectedYear}</p>
          <p className={`text-xl font-bold ${totalNetto >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCHF(totalNetto)}
          </p>
        </div>
      </div>

      {/* Monatstabelle */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-4 gap-0 text-xs text-gray-500 uppercase tracking-wide px-5 py-3 border-b border-gray-700">
          <div>Monat</div>
          <div className="text-right">Einnahmen</div>
          <div className="text-right">Ausgaben</div>
          <div className="text-right">Netto</div>
        </div>

        {monthlyData.map((m, idx) => {
          const hasData = m.einnahmenRappen > 0 || m.ausgabenRappen > 0;
          return (
            <div
              key={idx}
              className={`grid grid-cols-4 gap-0 px-5 py-3 border-b border-gray-700/50 ${hasData ? '' : 'opacity-40'}`}
            >
              <div className="text-gray-300 text-sm font-medium">{MONATE[m.month]}</div>
              <div className="text-right text-green-400 text-sm">
                {m.einnahmenRappen > 0 ? formatCHF(m.einnahmenRappen) : '—'}
              </div>
              <div className="text-right text-red-400 text-sm">
                {m.ausgabenRappen > 0 ? formatCHF(m.ausgabenRappen) : '—'}
              </div>
              <div className={`text-right text-sm font-medium ${m.nettoRappen >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {hasData ? formatCHF(m.nettoRappen) : '—'}
              </div>
            </div>
          );
        })}

        {/* Total row */}
        <div className="grid grid-cols-4 gap-0 px-5 py-4 bg-gray-700/50">
          <div className="text-white font-bold text-sm">Total {selectedYear}</div>
          <div className="text-right text-green-400 font-bold text-sm">{formatCHF(totalEinnahmen)}</div>
          <div className="text-right text-red-400 font-bold text-sm">{formatCHF(totalAusgaben)}</div>
          <div className={`text-right font-bold text-sm ${totalNetto >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCHF(totalNetto)}
          </div>
        </div>
      </div>

      {/* Swiss Compliance */}
      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 mt-6">
        <p className="text-gray-500 text-xs text-center">
          🇨🇭 Einnahmen basieren auf bezahlten Rechnungen. Für die Steuererklärung wenden Sie sich an einen Treuhänder.
        </p>
      </div>

    </div>
  );
}