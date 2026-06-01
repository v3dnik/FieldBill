'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { InvoiceDoc, ExpenseDoc } from '@/types/firestore';

function formatCHF(rappen: number) {
  return 'CHF ' + (rappen / 100).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const MONATE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

interface MonthData { month: number; year: number; einnahmenRappen: number; ausgabenRappen: number; nettoRappen: number; }

export default function BilanzPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<MonthData[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [allInvoices, setAllInvoices] = useState<InvoiceDoc[]>([]);
  const [allExpenses, setAllExpenses] = useState<ExpenseDoc[]>([]);

  const totalEinnahmen = monthlyData.reduce((s, m) => s + m.einnahmenRappen, 0);
  const totalAusgaben = monthlyData.reduce((s, m) => s + m.ausgabenRappen, 0);
  const totalNetto = totalEinnahmen - totalAusgaben;

  const calcMonthly = (invoices: InvoiceDoc[], expenses: ExpenseDoc[], year: number) => {
    setMonthlyData(Array.from({ length: 12 }, (_, month) => {
      const ein = invoices.filter(i => { const d = i.issueDate?.toDate?.() ?? new Date(); return d.getFullYear() === year && d.getMonth() === month; }).reduce((s, i) => s + (i.totalRappen || 0), 0);
      const aus = expenses.filter(e => { const d = e.date?.toDate?.() ?? new Date(); return d.getFullYear() === year && d.getMonth() === month; }).reduce((s, e) => s + (e.amountRappen || 0), 0);
      return { month, year, einnahmenRappen: ein, ausgabenRappen: aus, nettoRappen: ein - aus };
    }));
  };

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      if (!userSnap.exists()) return;
      const cId = userSnap.data().defaultCompanyId;
      const [invSnap, expSnap] = await Promise.all([
        getDocs(collection(db, 'companies', cId, 'invoices')),
        getDocs(collection(db, 'companies', cId, 'expenses')),
      ]);
      const invoices = invSnap.docs.map(d => d.data() as InvoiceDoc).filter(i => i.status === 'paid');
      const expenses = expSnap.docs.map(d => d.data() as ExpenseDoc);
      setAllInvoices(invoices); setAllExpenses(expenses);
      const years = new Set<number>([new Date().getFullYear()]);
      invoices.forEach(i => years.add((i.issueDate?.toDate?.() ?? new Date()).getFullYear()));
      expenses.forEach(e => years.add((e.date?.toDate?.() ?? new Date()).getFullYear()));
      setAvailableYears(Array.from(years).sort((a, b) => b - a));
      calcMonthly(invoices, expenses, selectedYear);
      setLoading(false);
    };
    init();
  }, [user]);

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    calcMonthly(allInvoices, allExpenses, year);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-gray-400">Wird geladen...</div>
    </div>
  );

  return (
    <div className="px-4 py-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bilanz</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Finanzübersicht Ihres Unternehmens.</p>
        </div>
        <select value={selectedYear} onChange={e => handleYearChange(parseInt(e.target.value))}
          className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500">
          {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Jahres-Zusammenfassung */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Einnahmen {selectedYear}</p>
          <p className="text-green-600 dark:text-green-400 text-xl font-bold">{formatCHF(totalEinnahmen)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Ausgaben {selectedYear}</p>
          <p className="text-red-600 dark:text-red-400 text-xl font-bold">{formatCHF(totalAusgaben)}</p>
        </div>
        <div className={`rounded-xl p-5 border ${totalNetto >= 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-500/30' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-500/30'}`}>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Netto {selectedYear}</p>
          <p className={`text-xl font-bold ${totalNetto >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatCHF(totalNetto)}</p>
        </div>
      </div>

      {/* Tabelle */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="grid grid-cols-4 px-5 py-3 border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide">
          <div>Monat</div><div className="text-right">Einnahmen</div><div className="text-right">Ausgaben</div><div className="text-right">Netto</div>
        </div>
        {monthlyData.map((m, idx) => {
          const hasData = m.einnahmenRappen > 0 || m.ausgabenRappen > 0;
          return (
            <div key={idx} className={`grid grid-cols-4 px-5 py-3 border-b border-gray-100 dark:border-gray-700/50 ${!hasData && 'opacity-40'}`}>
              <div className="text-gray-700 dark:text-gray-300 text-sm font-medium">{MONATE[m.month]}</div>
              <div className="text-right text-green-600 dark:text-green-400 text-sm">{m.einnahmenRappen > 0 ? formatCHF(m.einnahmenRappen) : '—'}</div>
              <div className="text-right text-red-600 dark:text-red-400 text-sm">{m.ausgabenRappen > 0 ? formatCHF(m.ausgabenRappen) : '—'}</div>
              <div className={`text-right text-sm font-medium ${m.nettoRappen >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{hasData ? formatCHF(m.nettoRappen) : '—'}</div>
            </div>
          );
        })}
        <div className="grid grid-cols-4 px-5 py-4 bg-gray-50 dark:bg-gray-700/50">
          <div className="text-gray-900 dark:text-white font-bold text-sm">Total {selectedYear}</div>
          <div className="text-right text-green-600 dark:text-green-400 font-bold text-sm">{formatCHF(totalEinnahmen)}</div>
          <div className="text-right text-red-600 dark:text-red-400 font-bold text-sm">{formatCHF(totalAusgaben)}</div>
          <div className={`text-right font-bold text-sm ${totalNetto >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatCHF(totalNetto)}</div>
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700 mt-6">
        <p className="text-gray-400 text-xs text-center">
          🇨🇭 Einnahmen basieren auf bezahlten Rechnungen. Für die Steuererklärung wenden Sie sich an einen Treuhänder.
        </p>
      </div>
    </div>
  );
}