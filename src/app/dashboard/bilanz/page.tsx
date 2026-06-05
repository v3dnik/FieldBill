'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { InvoiceDoc, ExpenseDoc, CompanyDoc } from '@/types/firestore';
import { useTheme } from 'next-themes';

function formatCHF(rappen: number) {
  return 'CHF ' + (rappen / 100).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const MONATE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const MONATE_SHORT = ['Jan','Feb','Mrz','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];

interface MonthData {
  month: number;
  year: number;
  einnahmenRappen: number;
  ausgabenRappen: number;
  nettoRappen: number;
}

export default function BilanzPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<MonthData[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [allInvoices, setAllInvoices] = useState<InvoiceDoc[]>([]);
  const [allExpenses, setAllExpenses] = useState<ExpenseDoc[]>([]);
  const [company, setCompany] = useState<CompanyDoc | null>(null);
  const [exportingYear, setExportingYear] = useState(false);
  const [exportingMonth, setExportingMonth] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [prevYearData, setPrevYearData] = useState<MonthData[]>([]);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<any>(null);

  const totalEinnahmen = monthlyData.reduce((s, m) => s + m.einnahmenRappen, 0);
  const totalAusgaben = monthlyData.reduce((s, m) => s + m.ausgabenRappen, 0);
  const totalNetto = totalEinnahmen - totalAusgaben;

  const prevTotalEinnahmen = prevYearData.reduce((s, m) => s + m.einnahmenRappen, 0);
  const prevTotalAusgaben = prevYearData.reduce((s, m) => s + m.ausgabenRappen, 0);
  const prevTotalNetto = prevTotalEinnahmen - prevTotalAusgaben;

  const trendPct = (curr: number, prev: number) => {
    if (prev === 0) return null;
    return ((curr - prev) / prev * 100).toFixed(0);
  };

  const calcMonthly = (invoices: InvoiceDoc[], expenses: ExpenseDoc[], year: number): MonthData[] => {
    return Array.from({ length: 12 }, (_, month) => {
      const ein = invoices
        .filter(i => { const d = i.issueDate?.toDate?.() ?? new Date(); return d.getFullYear() === year && d.getMonth() === month; })
        .reduce((s, i) => s + (i.totalRappen || 0), 0);
      const aus = expenses
        .filter(e => { const d = e.date?.toDate?.() ?? new Date(); return d.getFullYear() === year && d.getMonth() === month; })
        .reduce((s, e) => s + (e.amountRappen || 0), 0);
      return { month, year, einnahmenRappen: ein, ausgabenRappen: aus, nettoRappen: ein - aus };
    });
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
      const curr = calcMonthly(invoices, expenses, selectedYear);
      const prev = calcMonthly(invoices, expenses, selectedYear - 1);
      setMonthlyData(curr);
      setPrevYearData(prev);
      setLoading(false);
    };
    init();
  }, [user]);

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    setSelectedMonth(null);
    const curr = calcMonthly(allInvoices, allExpenses, year);
    const prev = calcMonthly(allInvoices, allExpenses, year - 1);
    setMonthlyData(curr);
    setPrevYearData(prev);
  };

  // Chart
  useEffect(() => {
    if (!chartRef.current || monthlyData.length === 0) return;
    if (chartInstance.current) chartInstance.current.destroy();
    const isDark = theme === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const textColor = isDark ? '#9ca3af' : '#6b7280';

    import('chart.js').then(({ Chart, CategoryScale, LinearScale, BarElement, Tooltip, Legend }) => {
      Chart.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);
      chartInstance.current = new Chart(chartRef.current!, {
        type: 'bar',
        data: {
          labels: MONATE_SHORT,
          datasets: [
            {
              label: 'Einnahmen',
              data: monthlyData.map(m => m.einnahmenRappen / 100),
              backgroundColor: isDark ? 'rgba(22,163,74,0.8)' : 'rgba(22,163,74,0.7)',
              borderRadius: 4,
              borderSkipped: false,
            },
            {
              label: 'Ausgaben',
              data: monthlyData.map(m => m.ausgabenRappen / 100),
              backgroundColor: isDark ? 'rgba(220,38,38,0.8)' : 'rgba(220,38,38,0.7)',
              borderRadius: 4,
              borderSkipped: false,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          onClick: (_, elements) => {
            if (elements.length > 0) {
              setSelectedMonth(elements[0].index);
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.dataset.label}: CHF ${(ctx.parsed.y ?? 0).toLocaleString('de-CH', { minimumFractionDigits: 2 })}`,
              },
            },
          },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 }, maxRotation: 0 } },
            y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 }, callback: (v) => `${Number(v).toLocaleString('de-CH')}` } },
          },
        },
      });
    });
    return () => { if (chartInstance.current) chartInstance.current.destroy(); };
  }, [monthlyData, theme]);

  const exportPDF = async (type: 'year' | 'month', month?: number) => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const now = new Date().toLocaleDateString('de-CH');

    pdf.setFillColor(26, 86, 219);
    pdf.rect(0, 0, pageWidth, 30, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20); pdf.setFont('helvetica', 'bold');
    pdf.text('FieldBill', 14, 13);
    pdf.setFontSize(10); pdf.setFont('helvetica', 'normal');
    pdf.text('Finanzuebersicht', 14, 22);

    if (company) {
      pdf.setFontSize(9);
      pdf.text(company.name || '', pageWidth - 14, 10, { align: 'right' });
      if (company.address?.city) pdf.text(`${company.address.zip} ${company.address.city}`, pageWidth - 14, 16, { align: 'right' });
      if (company.contactEmail) pdf.text(company.contactEmail, pageWidth - 14, 22, { align: 'right' });
    }

    const data = type === 'year' ? monthlyData : monthlyData.filter(m => m.month === month);
    const title = type === 'year' ? `Jahresbilanz ${selectedYear}` : `Monatsbilanz ${MONATE[month!]} ${selectedYear}`;
    const sumEin = data.reduce((s, m) => s + m.einnahmenRappen, 0);
    const sumAus = data.reduce((s, m) => s + m.ausgabenRappen, 0);
    const sumNetto = sumEin - sumAus;

    pdf.setTextColor(17, 24, 39); pdf.setFontSize(16); pdf.setFont('helvetica', 'bold');
    pdf.text(title, 14, 42);
    pdf.setFontSize(10); pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    pdf.text(`Erstellt am ${now}`, 14, 50);

    const boxY = 58; const boxW = (pageWidth - 28 - 8) / 3;
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

    const box3X = 14 + boxW * 2 + 8; const nettoPos = sumNetto >= 0;
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
    tableData.push([`Total ${type === 'year' ? selectedYear : MONATE[month!]}`, formatCHF(sumEin), formatCHF(sumAus), formatCHF(sumNetto)]);

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
    pdf.save(type === 'year' ? `FieldBill_Jahresbilanz_${selectedYear}.pdf` : `FieldBill_Monatsbilanz_${MONATE[month!]}_${selectedYear}.pdf`);
  };

  const handleExportYear = async () => { setExportingYear(true); await exportPDF('year'); setExportingYear(false); };
  const handleExportMonth = async (month: number) => { setExportingMonth(month); await exportPDF('month', month); setExportingMonth(null); };

  const selectedMonthData = selectedMonth !== null ? monthlyData[selectedMonth] : null;
  const einTrend = trendPct(totalEinnahmen, prevTotalEinnahmen);
  const ausTrend = trendPct(totalAusgaben, prevTotalAusgaben);
  const nettoTrend = trendPct(totalNetto, prevTotalNetto);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-gray-400">Wird geladen...</div>
    </div>
  );

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bilanz</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Finanzuebersicht Ihres Unternehmens</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedYear} onChange={e => handleYearChange(parseInt(e.target.value))}
            className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500">
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={handleExportYear} disabled={exportingYear}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
            {exportingYear ? 'Exportiert...' : 'Jahresbericht PDF'}
          </button>
        </div>
      </div>

      {/* KPI Kartice */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Einnahmen {selectedYear}</p>
          <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatCHF(totalEinnahmen)}</p>
          {einTrend && (
            <p className={`text-xs mt-1 ${Number(einTrend) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {Number(einTrend) >= 0 ? '▲' : '▼'} {Math.abs(Number(einTrend))}% vs {selectedYear - 1}
            </p>
          )}
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Ausgaben {selectedYear}</p>
          <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatCHF(totalAusgaben)}</p>
          {ausTrend && (
            <p className={`text-xs mt-1 ${Number(ausTrend) <= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {Number(ausTrend) >= 0 ? '▲' : '▼'} {Math.abs(Number(ausTrend))}% vs {selectedYear - 1}
            </p>
          )}
        </div>
        <div className={`rounded-xl p-4 border ${totalNetto >= 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-500/30' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-500/30'}`}>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Netto {selectedYear}</p>
          <p className={`text-xl font-bold ${totalNetto >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatCHF(totalNetto)}
          </p>
          {nettoTrend && (
            <p className={`text-xs mt-1 ${Number(nettoTrend) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {Number(nettoTrend) >= 0 ? '▲' : '▼'} {Math.abs(Number(nettoTrend))}% vs {selectedYear - 1}
            </p>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Monatliche Uebersicht
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-2 font-normal">Tippen Sie auf einen Balken</span>
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-green-600"></div>
              <span className="text-xs text-gray-500 dark:text-gray-400">Einnahmen</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-red-600"></div>
              <span className="text-xs text-gray-500 dark:text-gray-400">Ausgaben</span>
            </div>
          </div>
        </div>
        <div style={{ height: '200px', position: 'relative' }}>
          <canvas ref={chartRef} role="img" aria-label="Monatliche Einnahmen und Ausgaben" />
        </div>
      </div>

      {/* Monatsliste — klikni za detail */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Monatsübersicht</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Monat antippen für Details</p>
        </div>

        {monthlyData.map((m, idx) => {
          const hasData = m.einnahmenRappen > 0 || m.ausgabenRappen > 0;
          const isSelected = selectedMonth === idx;
          return (
            <div key={idx}>
              {/* Monatszeile */}
              <div
                onClick={() => setSelectedMonth(isSelected ? null : idx)}
                className={`flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-700/50 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : hasData
                      ? 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                      : 'opacity-40'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className={`text-sm font-medium ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    {MONATE[m.month]}
                  </span>
                  {hasData && (
                    <div className="flex gap-3 text-xs">
                      <span className="text-green-600 dark:text-green-400">
                        {m.einnahmenRappen > 0 ? formatCHF(m.einnahmenRappen) : '—'}
                      </span>
                      <span className="text-red-600 dark:text-red-400">
                        {m.ausgabenRappen > 0 ? formatCHF(m.ausgabenRappen) : '—'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {hasData && (
                    <span className={`text-sm font-medium ${m.nettoRappen >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {m.nettoRappen >= 0 ? '+' : ''}{formatCHF(m.nettoRappen)}
                    </span>
                  )}
                  {hasData && (
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${isSelected ? 'rotate-90' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Detail panel */}
              {isSelected && selectedMonthData && (
                <div className="px-5 py-4 bg-gray-50 dark:bg-gray-700/30 border-b border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Einnahmen</p>
                      <p className="text-sm font-bold text-green-600 dark:text-green-400">
                        {selectedMonthData.einnahmenRappen > 0 ? formatCHF(selectedMonthData.einnahmenRappen) : '—'}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Ausgaben</p>
                      <p className="text-sm font-bold text-red-600 dark:text-red-400">
                        {selectedMonthData.ausgabenRappen > 0 ? formatCHF(selectedMonthData.ausgabenRappen) : '—'}
                      </p>
                    </div>
                    <div className={`rounded-lg p-3 text-center border ${selectedMonthData.nettoRappen >= 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'}`}>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Netto</p>
                      <p className={`text-sm font-bold ${selectedMonthData.nettoRappen >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCHF(selectedMonthData.nettoRappen)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleExportMonth(selectedMonthData.month)}
                    disabled={exportingMonth === selectedMonthData.month}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                    {exportingMonth === selectedMonthData.month ? 'Exportiert...' : `${MONATE[selectedMonthData.month]} PDF exportieren`}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Total */}
        <div className="px-5 py-4 bg-gray-50 dark:bg-gray-700/50 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-900 dark:text-white">Total {selectedYear}</span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-green-600 dark:text-green-400">{formatCHF(totalEinnahmen)}</span>
            <span className="text-xs text-red-600 dark:text-red-400">{formatCHF(totalAusgaben)}</span>
            <span className={`text-sm font-bold ${totalNetto >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {totalNetto >= 0 ? '+' : ''}{formatCHF(totalNetto)}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <p className="text-gray-400 text-xs text-center">
          Einnahmen basieren auf bezahlten Rechnungen. Fuer die Steuererklaerung wenden Sie sich an einen Treuhander.
        </p>
      </div>

    </div>
  );
}