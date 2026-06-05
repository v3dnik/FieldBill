'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { InvoiceDoc, ExpenseDoc, CompanyDoc } from '@/types/firestore';

function formatCHF(rappen: number) {
  return 'CHF ' + (rappen / 100).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const MONATE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

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
  const [monthlyData, setMonthlyData] = useState<MonthData[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [allInvoices, setAllInvoices] = useState<InvoiceDoc[]>([]);
  const [allExpenses, setAllExpenses] = useState<ExpenseDoc[]>([]);
  const [company, setCompany] = useState<CompanyDoc | null>(null);
  const [exportingYear, setExportingYear] = useState(false);
  const [exportingMonth, setExportingMonth] = useState<number | null>(null);

  const totalEinnahmen = monthlyData.reduce((s, m) => s + m.einnahmenRappen, 0);
  const totalAusgaben = monthlyData.reduce((s, m) => s + m.ausgabenRappen, 0);
  const totalNetto = totalEinnahmen - totalAusgaben;

  const calcMonthly = (invoices: InvoiceDoc[], expenses: ExpenseDoc[], year: number) => {
    setMonthlyData(Array.from({ length: 12 }, (_, month) => {
      const ein = invoices
        .filter(i => { const d = i.issueDate?.toDate?.() ?? new Date(); return d.getFullYear() === year && d.getMonth() === month; })
        .reduce((s, i) => s + (i.totalRappen || 0), 0);
      const aus = expenses
        .filter(e => { const d = e.date?.toDate?.() ?? new Date(); return d.getFullYear() === year && d.getMonth() === month; })
        .reduce((s, e) => s + (e.amountRappen || 0), 0);
      return { month, year, einnahmenRappen: ein, ausgabenRappen: aus, nettoRappen: ein - aus };
    }));
  };

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      if (!userSnap.exists()) return;
      const cId = userSnap.data().defaultCompanyId;
      const [invSnap, expSnap, companySnap] = await Promise.all([
        getDocs(collection(db, 'companies', cId, 'invoices')),
        getDocs(collection(db, 'companies', cId, 'expenses')),
        getDoc(doc(db, 'companies', cId)),
      ]);
      const invoices = invSnap.docs.map(d => d.data() as InvoiceDoc).filter(i => i.status === 'paid');
      const expenses = expSnap.docs.map(d => d.data() as ExpenseDoc);
      if (companySnap.exists()) setCompany(companySnap.data() as CompanyDoc);
      setAllInvoices(invoices);
      setAllExpenses(expenses);
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

  const exportPDF = async (type: 'year' | 'month', month?: number) => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const now = new Date().toLocaleDateString('de-CH');

    pdf.setFillColor(26, 86, 219);
    pdf.rect(0, 0, pageWidth, 30, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('FieldBill', 14, 13);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Finanzuebersicht', 14, 22);

    if (company) {
      pdf.setFontSize(9);
      pdf.text(company.name || '', pageWidth - 14, 10, { align: 'right' });
      if (company.address?.city) pdf.text(`${company.address.zip} ${company.address.city}`, pageWidth - 14, 16, { align: 'right' });
      if (company.contactEmail) pdf.text(company.contactEmail, pageWidth - 14, 22, { align: 'right' });
    }

    const data: MonthData[] = type === 'year' ? monthlyData : monthlyData.filter(m => m.month === month);
    const title = type === 'year' ? `Jahresbilanz ${selectedYear}` : `Monatsbilanz ${MONATE[month!]} ${selectedYear}`;

    pdf.setTextColor(17, 24, 39);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, 14, 42);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    pdf.text(`Erstellt am ${now}`, 14, 50);

    const sumEin = data.reduce((s, m) => s + m.einnahmenRappen, 0);
    const sumAus = data.reduce((s, m) => s + m.ausgabenRappen, 0);
    const sumNetto = sumEin - sumAus;
    const boxY = 58;
    const boxW = (pageWidth - 28 - 8) / 3;

    pdf.setFillColor(240, 253, 244); pdf.setDrawColor(187, 247, 208);
    pdf.roundedRect(14, boxY, boxW, 22, 3, 3, 'FD');
    pdf.setTextColor(107, 114, 128); pdf.setFontSize(8); pdf.setFont('helvetica', 'normal');
    pdf.text('Einnahmen', 14 + boxW / 2, boxY + 7, { align: 'center' });
    pdf.setTextColor(22, 163, 74); pdf.setFontSize(11); pdf.setFont('helvetica', 'bold');
    pdf.text(formatCHF(sumEin), 14 + boxW / 2, boxY + 16, { align: 'center' });

    const box2X = 14 + boxW + 4;
    pdf.setFillColor(254, 242, 242); pdf.setDrawColor(254, 202, 202);
    pdf.roundedRect(box2X, boxY, boxW, 22, 3, 3, 'FD');
    pdf.setTextColor(107, 114, 128); pdf.setFontSize(8); pdf.setFont('helvetica', 'normal');
    pdf.text('Ausgaben', box2X + boxW / 2, boxY + 7, { align: 'center' });
    pdf.setTextColor(220, 38, 38); pdf.setFontSize(11); pdf.setFont('helvetica', 'bold');
    pdf.text(formatCHF(sumAus), box2X + boxW / 2, boxY + 16, { align: 'center' });

    const box3X = 14 + boxW * 2 + 8;
    const nettoPos = sumNetto >= 0;
    pdf.setFillColor(nettoPos ? 240 : 254, nettoPos ? 253 : 242, nettoPos ? 244 : 242);
    pdf.setDrawColor(nettoPos ? 187 : 254, nettoPos ? 247 : 202, nettoPos ? 208 : 202);
    pdf.roundedRect(box3X, boxY, boxW, 22, 3, 3, 'FD');
    pdf.setTextColor(107, 114, 128); pdf.setFontSize(8); pdf.setFont('helvetica', 'normal');
    pdf.text('Netto', box3X + boxW / 2, boxY + 7, { align: 'center' });
    pdf.setTextColor(nettoPos ? 22 : 220, nettoPos ? 163 : 38, nettoPos ? 74 : 38);
    pdf.setFontSize(11); pdf.setFont('helvetica', 'bold');
    pdf.text(formatCHF(sumNetto), box3X + boxW / 2, boxY + 16, { align: 'center' });

    const tableData = data.map(m => [
      MONATE[m.month],
      m.einnahmenRappen > 0 ? formatCHF(m.einnahmenRappen) : '-',
      m.ausgabenRappen > 0 ? formatCHF(m.ausgabenRappen) : '-',
      (m.einnahmenRappen > 0 || m.ausgabenRappen > 0) ? formatCHF(m.nettoRappen) : '-',
    ]);
    tableData.push([
      `Total ${type === 'year' ? selectedYear : MONATE[month!]}`,
      formatCHF(sumEin), formatCHF(sumAus), formatCHF(sumNetto),
    ]);

    autoTable(pdf, {
      startY: boxY + 30,
      head: [['Monat', 'Einnahmen', 'Ausgaben', 'Netto']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [26, 86, 219], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10 },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { fontStyle: 'normal' },
        1: { halign: 'right', textColor: [22, 163, 74] },
        2: { halign: 'right', textColor: [220, 38, 38] },
        3: { halign: 'right' },
      },
      didParseCell: (hookData) => {
        if (hookData.row.index === tableData.length - 1) {
          hookData.cell.styles.fontStyle = 'bold';
          hookData.cell.styles.fillColor = [243, 244, 246];
        }
      },
    });

    const finalY = (pdf as any).lastAutoTable.finalY + 10;
    pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(156, 163, 175);
    pdf.text('Einnahmen basieren auf bezahlten Rechnungen. Fuer die Steuererklaerung wenden Sie sich an einen Treuhander.', 14, finalY);
    pdf.text('Entwickelt von Vodnik Digital Solutions — vodnik.ch', pageWidth / 2, finalY + 6, { align: 'center' });

    const filename = type === 'year'
      ? `FieldBill_Jahresbilanz_${selectedYear}.pdf`
      : `FieldBill_Monatsbilanz_${MONATE[month!]}_${selectedYear}.pdf`;
    pdf.save(filename);
  };

  const handleExportYear = async () => { setExportingYear(true); await exportPDF('year'); setExportingYear(false); };
  const handleExportMonth = async (month: number) => { setExportingMonth(month); await exportPDF('month', month); setExportingMonth(null); };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-gray-400">Wird geladen...</div>
    </div>
  );

  return (
    <div className="px-4 py-8 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bilanz</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Finanzuebersicht Ihres Unternehmens.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select value={selectedYear} onChange={e => handleYearChange(parseInt(e.target.value))}
            className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500">
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={handleExportYear} disabled={exportingYear}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
            {exportingYear ? 'Wird exportiert...' : 'Jahresbericht PDF'}
          </button>
        </div>
      </div>

      {/* Zusammenfassung */}
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
          <p className={`text-xl font-bold ${totalNetto >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatCHF(totalNetto)}
          </p>
        </div>
      </div>

      {/* Tabelle — overflow-x-auto nur auf Mobile */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[500px]">

            {/* Header */}
            <div className="grid grid-cols-5 px-5 py-3 border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500 uppercase tracking-wide">
              <div>Monat</div>
              <div className="text-right">Einnahmen</div>
              <div className="text-right">Ausgaben</div>
              <div className="text-right">Netto</div>
              <div className="text-right">PDF</div>
            </div>

            {/* Rows */}
            {monthlyData.map((m, idx) => {
              const hasData = m.einnahmenRappen > 0 || m.ausgabenRappen > 0;
              return (
                <div key={idx}
                  className={`grid grid-cols-5 px-5 py-3 border-b border-gray-100 dark:border-gray-700/50 ${!hasData && 'opacity-40'}`}>
                  <div className="text-gray-700 dark:text-gray-300 text-sm font-medium">{MONATE[m.month]}</div>
                  <div className="text-right text-green-600 dark:text-green-400 text-sm">
                    {m.einnahmenRappen > 0 ? formatCHF(m.einnahmenRappen) : '—'}
                  </div>
                  <div className="text-right text-red-600 dark:text-red-400 text-sm">
                    {m.ausgabenRappen > 0 ? formatCHF(m.ausgabenRappen) : '—'}
                  </div>
                  <div className={`text-right text-sm font-medium ${m.nettoRappen >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {hasData ? formatCHF(m.nettoRappen) : '—'}
                  </div>
                  <div className="text-right">
                    {hasData ? (
                      <button onClick={() => handleExportMonth(m.month)} disabled={exportingMonth === m.month}
                        className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 px-2 py-1 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors">
                        {exportingMonth === m.month ? '...' : 'PDF'}
                      </button>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Total */}
            <div className="grid grid-cols-5 px-5 py-4 bg-gray-50 dark:bg-gray-700/50">
              <div className="text-gray-900 dark:text-white font-bold text-sm">Total {selectedYear}</div>
              <div className="text-right text-green-600 dark:text-green-400 font-bold text-sm">{formatCHF(totalEinnahmen)}</div>
              <div className="text-right text-red-600 dark:text-red-400 font-bold text-sm">{formatCHF(totalAusgaben)}</div>
              <div className={`text-right font-bold text-sm ${totalNetto >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCHF(totalNetto)}
              </div>
              <div />
            </div>

          </div>
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700 mt-6">
        <p className="text-gray-400 text-xs text-center">
          Einnahmen basieren auf bezahlten Rechnungen. Fuer die Steuererklaerung wenden Sie sich an einen Treuhander.
        </p>
      </div>
    </div>
  );
}