'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { InvoiceDoc, CompanyDoc } from '@/types/firestore';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft:     { label: 'Entwurf',     color: 'text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-gray-700' },
  issued:    { label: 'Ausgestellt', color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/40' },
  paid:      { label: 'Bezahlt',     color: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/40' },
  cancelled: { label: 'Storniert',   color: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/40' },
};

const ZAHLUNG_LABELS: Record<string, string> = {
  bar: 'Bar', twint: 'TWINT', karte: 'Karte', rechnung: 'Rechnung',
};

function formatCHF(rappen: number) {
  return 'CHF ' + (rappen / 100).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(ts: any) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('de-CH');
}

// ── EMAIL MODAL ──
function EmailModal({
  invoice,
  company,
  onClose,
  onSent,
}: {
  invoice: InvoiceDoc;
  company: CompanyDoc | null;
  onClose: () => void;
  onSent: () => void;
}) {
  const [to, setTo] = useState(invoice.customerEmail || '');
  const [subject, setSubject] = useState(`Rechnung ${invoice.invoiceNumber} von ${company?.name || ''}`);
  const [message, setMessage] = useState(
    `Sehr geehrte Damen und Herren,\n\nanbei erhalten Sie die Rechnung ${invoice.invoiceNumber} ueber ${formatCHF(invoice.totalRappen)}.\n\nBitte begleichen Sie den Betrag innerhalb der vereinbarten Frist.\n\nMit freundlichen Gruessen\n${company?.name || ''}`
  );
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!to.trim()) { setError('Bitte E-Mail-Adresse eingeben.'); return; }
    if (!subject.trim()) { setError('Bitte Betreff eingeben.'); return; }
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/send-invoice-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: to.trim(),
          subject: subject.trim(),
          message: message.trim(),
          invoiceNumber: invoice.invoiceNumber,
          customerName: invoice.customerName,
          totalRappen: invoice.totalRappen,
          companyName: company?.name || '',
          companyEmail: company?.contactEmail || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fehler beim Senden.');
      onSent();
    } catch (err: any) {
      setError(err.message || 'Fehler beim Senden.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Rechnung per E-Mail senden</h2>
              <p className="text-xs text-gray-400">{invoice.invoiceNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">An</label>
            <input
              type="email"
              value={to}
              onChange={e => setTo(e.target.value)}
              placeholder="kunde@example.com"
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Betreff</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Nachricht</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={7}
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
            />
          </div>
          <div className="flex items-start gap-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-500/20 rounded-lg px-3.5 py-3">
            <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Der Kunde erhaelt alle Rechnungsdetails direkt im E-Mail formatiert dargestellt.
            </p>
          </div>
          {error && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 px-3.5 py-3 rounded-lg text-sm">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            Abbrechen
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !to.trim()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
          >
            {sending ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Wird gesendet...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Senden
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SUCCESS TOAST ──
function SuccessToast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-green-600 text-white px-5 py-3.5 rounded-xl shadow-lg">
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100 transition-opacity">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ── MAIN PAGE ──
export default function RechnungDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [invoice, setInvoice] = useState<InvoiceDoc | null>(null);
  const [company, setCompany] = useState<CompanyDoc | null>(null);
  const [companyId, setCompanyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [error, setError] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [successToast, setSuccessToast] = useState('');

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (!userSnap.exists()) return;
        const cId = userSnap.data().defaultCompanyId;
        setCompanyId(cId);
        const [invoiceSnap, compSnap] = await Promise.all([
          getDoc(doc(db, 'companies', cId, 'invoices', id)),
          getDoc(doc(db, 'companies', cId)),
        ]);
        if (!invoiceSnap.exists()) { setError('Rechnung nicht gefunden.'); setLoading(false); return; }
        setInvoice({ ...invoiceSnap.data(), invoiceId: invoiceSnap.id } as InvoiceDoc);
        if (compSnap.exists()) setCompany(compSnap.data() as CompanyDoc);
      } catch (err: any) {
        setError('Fehler: ' + (err?.message || 'Unbekannt'));
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user, id]);

  const updateStatus = async (newStatus: string) => {
    if (!invoice || !companyId) return;
    setUpdating(true);
    try {
      const ref = doc(db, 'companies', companyId, 'invoices', id);
      const updateData: any = { status: newStatus };
      if (newStatus === 'paid') updateData.paidAt = Timestamp.now();
      await updateDoc(ref, updateData);
      setInvoice({ ...invoice, status: newStatus as any });
    } catch (err: any) {
      setError('Fehler: ' + (err?.message || 'Unbekannt'));
    } finally {
      setUpdating(false);
    }
  };

  const generatePDF = async () => {
    if (!invoice || !company) return;
    setGeneratingPDF(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const vatEnabled = company.vatEnabled ?? false;

      pdf.setFillColor(26, 86, 219);
      pdf.rect(0, 0, pageWidth, 38, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22); pdf.setFont('helvetica', 'bold');
      pdf.text(company.name || 'Firma', 14, 14);
      pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
      if (company.address?.street) pdf.text(company.address.street, 14, 21);
      if (company.address?.city) pdf.text(`${company.address.zip} ${company.address.city}`, 14, 26);
      if (company.phone) pdf.text(company.phone, 14, 31);
      if (company.contactEmail) pdf.text(company.contactEmail, 14, 36);

      pdf.setFontSize(10); pdf.setFont('helvetica', 'bold');
      pdf.text('RECHNUNG', pageWidth - 14, 14, { align: 'right' });
      pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
      pdf.text(invoice.invoiceNumber, pageWidth - 14, 21, { align: 'right' });
      pdf.text(`Datum: ${formatDate(invoice.issueDate)}`, pageWidth - 14, 27, { align: 'right' });
      if ((invoice as any).dueDate) pdf.text(`Faellig: ${formatDate((invoice as any).dueDate)}`, pageWidth - 14, 33, { align: 'right' });

      const statusColors: Record<string, [number, number, number]> = {
        draft: [107, 114, 128], issued: [37, 99, 235], paid: [22, 163, 74], cancelled: [220, 38, 38],
      };
      const statusLabels: Record<string, string> = {
        draft: 'ENTWURF', issued: 'AUSGESTELLT', paid: 'BEZAHLT', cancelled: 'STORNIERT',
      };
      const sc = statusColors[invoice.status] || [107, 114, 128];
      pdf.setFillColor(...sc);
      pdf.roundedRect(14, 42, 35, 8, 2, 2, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(7); pdf.setFont('helvetica', 'bold');
      pdf.text(statusLabels[invoice.status] || invoice.status.toUpperCase(), 31.5, 47.5, { align: 'center' });

      pdf.setTextColor(107, 114, 128); pdf.setFontSize(8); pdf.setFont('helvetica', 'normal');
      pdf.text('RECHNUNGSEMPFAENGER', 14, 58);
      pdf.setTextColor(17, 24, 39); pdf.setFontSize(10); pdf.setFont('helvetica', 'bold');
      pdf.text(invoice.customerName, 14, 65);
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9);
      if (invoice.customerAddress?.street) {
        pdf.setTextColor(55, 65, 81);
        pdf.text(invoice.customerAddress.street, 14, 71);
        pdf.text(`${invoice.customerAddress.zip} ${invoice.customerAddress.city}`, 14, 76);
      }
      if (invoice.customerEmail) { pdf.setTextColor(107, 114, 128); pdf.text(invoice.customerEmail, 14, 82); }

      const lines = invoice.lines || [];
      const tableBody = lines.map(line => [
        line.name + (line.description ? `\n${line.description}` : ''),
        line.quantity.toString(), line.unit,
        formatCHF(line.unitPriceRappen), formatCHF(line.totalRappen),
      ]);

      autoTable(pdf, {
        startY: 90,
        head: [['Bezeichnung', 'Menge', 'Einheit', 'Preis', 'Total']],
        body: tableBody, theme: 'grid',
        headStyles: { fillColor: [26, 86, 219], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9, textColor: [55, 65, 81] },
        columnStyles: {
          0: { cellWidth: 'auto' }, 1: { halign: 'right', cellWidth: 20 },
          2: { halign: 'center', cellWidth: 20 }, 3: { halign: 'right', cellWidth: 28 },
          4: { halign: 'right', cellWidth: 28, fontStyle: 'bold' },
        },
        alternateRowStyles: { fillColor: [249, 250, 251] },
      });

      let y = (pdf as any).lastAutoTable.finalY + 6;
      const totalsX = pageWidth - 80;
      const totalsW = 66;

      pdf.setFontSize(9); pdf.setTextColor(107, 114, 128); pdf.setFont('helvetica', 'normal');
      pdf.text('Subtotal:', totalsX, y);
      pdf.setTextColor(55, 65, 81);
      pdf.text(formatCHF(invoice.subtotalRappen), pageWidth - 14, y, { align: 'right' });
      y += 6;

      if (vatEnabled && invoice.vatRappen > 0) {
        pdf.setTextColor(107, 114, 128);
        pdf.text(`MwSt ${((invoice.vatRate || 0.081) * 100).toFixed(1)}%:`, totalsX, y);
        pdf.setTextColor(55, 65, 81);
        pdf.text(formatCHF(invoice.vatRappen), pageWidth - 14, y, { align: 'right' });
        y += 6;
      } else if (!vatEnabled) {
        pdf.setTextColor(107, 114, 128);
        pdf.text('MwSt: nicht pflichtig', totalsX, y);
        y += 6;
      }

      pdf.setDrawColor(26, 86, 219); pdf.setLineWidth(0.5);
      pdf.line(totalsX, y, pageWidth - 14, y); y += 5;
      pdf.setFillColor(26, 86, 219);
      pdf.roundedRect(totalsX - 4, y - 4, totalsW + 4, 12, 2, 2, 'F');
      pdf.setTextColor(255, 255, 255); pdf.setFontSize(11); pdf.setFont('helvetica', 'bold');
      pdf.text('TOTAL CHF:', totalsX, y + 4);
      pdf.text(formatCHF(invoice.totalRappen), pageWidth - 14, y + 4, { align: 'right' });
      y += 18;

      if (y > 240) { pdf.addPage(); y = 20; }
      pdf.setFontSize(10); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(17, 24, 39);
      pdf.text('Zahlungsinformationen', 14, y); y += 6;
      pdf.setDrawColor(229, 231, 235); pdf.setLineWidth(0.3);
      pdf.line(14, y, pageWidth - 14, y); y += 5;
      pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(107, 114, 128);
      pdf.text('Zahlungsmethode:', 14, y);
      pdf.setTextColor(55, 65, 81); pdf.setFont('helvetica', 'bold');
      pdf.text(ZAHLUNG_LABELS[invoice.paymentMethod] || invoice.paymentMethod, 60, y); y += 6;
      if ((invoice as any).zahlungsfrist) {
        pdf.setTextColor(107, 114, 128); pdf.setFont('helvetica', 'normal');
        pdf.text('Zahlungsfrist:', 14, y);
        pdf.setTextColor(55, 65, 81); pdf.setFont('helvetica', 'bold');
        pdf.text(`${(invoice as any).zahlungsfrist} Tage`, 60, y); y += 6;
      }
      if (company.bankDetails?.iban) {
        pdf.setTextColor(107, 114, 128); pdf.setFont('helvetica', 'normal');
        pdf.text('IBAN:', 14, y);
        pdf.setTextColor(55, 65, 81); pdf.setFont('helvetica', 'bold');
        pdf.text(company.bankDetails.iban, 60, y); y += 6;
      }
      if (company.bankDetails?.bankName) {
        pdf.setTextColor(107, 114, 128); pdf.setFont('helvetica', 'normal');
        pdf.text('Bank:', 14, y);
        pdf.setTextColor(55, 65, 81); pdf.setFont('helvetica', 'bold');
        pdf.text(company.bankDetails.bankName, 60, y); y += 6;
      }
      if (company.vatNumber && vatEnabled) {
        pdf.setTextColor(107, 114, 128); pdf.setFont('helvetica', 'normal');
        pdf.text('MwSt-Nr:', 14, y);
        pdf.setTextColor(55, 65, 81); pdf.setFont('helvetica', 'bold');
        pdf.text(company.vatNumber, 60, y); y += 6;
      }
      if (invoice.notes) {
        y += 4;
        pdf.setFontSize(10); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(17, 24, 39);
        pdf.text('Bemerkungen', 14, y); y += 6;
        pdf.setDrawColor(229, 231, 235); pdf.line(14, y, pageWidth - 14, y); y += 5;
        pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(55, 65, 81);
        const noteLines = pdf.splitTextToSize(invoice.notes, pageWidth - 28);
        pdf.text(noteLines, 14, y);
      }
      const pages = pdf.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(7); pdf.setTextColor(156, 163, 175); pdf.setFont('helvetica', 'normal');
        pdf.text(`Seite ${i} von ${pages}`, pageWidth / 2, 290, { align: 'center' });
        pdf.text('Gemaess OR Art. 958f werden alle Rechnungen 10 Jahre archiviert.', pageWidth / 2, 285, { align: 'center' });
        pdf.text('Entwickelt von Vodnik Digital Solutions — vodnik.ch', pageWidth / 2, 294, { align: 'center' });
      }
      pdf.save(`${invoice.invoiceNumber}.pdf`);
    } catch (err) {
      console.error(err);
      setError('PDF-Generierung fehlgeschlagen.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-gray-400">Wird geladen...</div>
    </div>
  );
  if (error && !invoice) return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg">{error}</div>
    </div>
  );
  if (!invoice) return null;

  return (
    <>
      {showEmailModal && invoice && (
        <EmailModal
          invoice={invoice}
          company={company}
          onClose={() => setShowEmailModal(false)}
          onSent={() => {
            setShowEmailModal(false);
            setSuccessToast(`E-Mail erfolgreich gesendet an ${invoice.customerEmail || 'Kunde'}.`);
          }}
        />
      )}
      {successToast && (
        <SuccessToast message={successToast} onClose={() => setSuccessToast('')} />
      )}

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <button onClick={() => router.push('/dashboard/rechnungen')}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm mb-2 flex items-center gap-1 transition-colors">
              ← Zurück
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{invoice.invoiceNumber}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_LABELS[invoice.status]?.color}`}>
                {STATUS_LABELS[invoice.status]?.label}
              </span>
              <span className="text-gray-400 dark:text-gray-500 text-sm">{formatDate(invoice.issueDate)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={generatePDF}
              disabled={generatingPDF}
              className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {generatingPDF ? 'Wird erstellt...' : 'PDF'}
            </button>

            <button
              onClick={() => setShowEmailModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Per E-Mail senden
            </button>

            {invoice.status === 'draft' && (
              <button onClick={() => updateStatus('issued')} disabled={updating}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                Ausstellen
              </button>
            )}
            {invoice.status === 'issued' && (
              <>
                <button onClick={() => updateStatus('paid')} disabled={updating}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                  Als Bezahlt markieren
                </button>
                <button onClick={() => updateStatus('cancelled')} disabled={updating}
                  className="bg-red-50 dark:bg-red-600/20 hover:bg-red-100 dark:hover:bg-red-600/30 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                  Stornieren
                </button>
              </>
            )}
            {invoice.status === 'paid' && (
              <span className="text-green-600 dark:text-green-400 text-sm font-medium py-2">
                ✓ Bezahlt am {formatDate((invoice as any).paidAt)}
              </span>
            )}
            {invoice.status === 'cancelled' && (
              <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 px-4 py-2 rounded-lg">
                <span className="text-red-600 dark:text-red-400 text-sm">Storniert — gesetzlich archiviert</span>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        {/* Von / An */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-3">Von</p>
            {company ? (
              <>
                <p className="text-gray-900 dark:text-white font-semibold">{company.name}</p>
                <p className="text-gray-600 dark:text-gray-300 text-sm">{company.address?.street}</p>
                <p className="text-gray-600 dark:text-gray-300 text-sm">{company.address?.zip} {company.address?.city}</p>
                {company.vatNumber && <p className="text-gray-400 text-xs mt-1">MwSt-Nr: {company.vatNumber}</p>}
              </>
            ) : <p className="text-gray-400 text-sm">—</p>}
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-3">An</p>
            <p className="text-gray-900 dark:text-white font-semibold">{invoice.customerName}</p>
            {invoice.customerAddress?.street && <p className="text-gray-600 dark:text-gray-300 text-sm">{invoice.customerAddress.street}</p>}
            {invoice.customerAddress?.zip && <p className="text-gray-600 dark:text-gray-300 text-sm">{invoice.customerAddress.zip} {invoice.customerAddress.city}</p>}
            {invoice.customerEmail && <p className="text-gray-400 text-xs mt-1">{invoice.customerEmail}</p>}
          </div>
        </div>

        {/* Positionen */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Positionen</h2>
          <div className="space-y-1">
            <div className="grid grid-cols-12 gap-2 text-xs text-gray-400 uppercase tracking-wide pb-2 border-b border-gray-200 dark:border-gray-700">
              <div className="col-span-5">Bezeichnung</div>
              <div className="col-span-2 text-right">Menge</div>
              <div className="col-span-2 text-right">Einheit</div>
              <div className="col-span-1 text-right">Preis</div>
              <div className="col-span-2 text-right">Total</div>
            </div>
            {invoice.lines?.map((line, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 py-3 border-b border-gray-100 dark:border-gray-700/50">
                <div className="col-span-5">
                  <p className="text-gray-900 dark:text-white text-sm">{line.name}</p>
                  {line.description && <p className="text-gray-400 text-xs">{line.description}</p>}
                </div>
                <div className="col-span-2 text-right text-gray-600 dark:text-gray-300 text-sm">{line.quantity}</div>
                <div className="col-span-2 text-right text-gray-600 dark:text-gray-300 text-sm">{line.unit}</div>
                <div className="col-span-1 text-right text-gray-600 dark:text-gray-300 text-sm">{formatCHF(line.unitPriceRappen)}</div>
                <div className="col-span-2 text-right text-gray-900 dark:text-white text-sm font-medium">{formatCHF(line.totalRappen)}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2 max-w-xs ml-auto">
            <div className="flex justify-between text-gray-600 dark:text-gray-300 text-sm">
              <span>Subtotal</span><span>{formatCHF(invoice.subtotalRappen)}</span>
            </div>
            {(company?.vatEnabled ?? false) && invoice.vatRappen > 0 ? (
              <div className="flex justify-between text-gray-600 dark:text-gray-300 text-sm">
                <span>MwSt {((invoice.vatRate || 0.081) * 100).toFixed(1)}%</span>
                <span>{formatCHF(invoice.vatRappen)}</span>
              </div>
            ) : (
              <div className="flex justify-between text-gray-400 dark:text-gray-500 text-sm">
                <span>MwSt</span><span>nicht pflichtig</span>
              </div>
            )}
            <div className="flex justify-between text-gray-900 dark:text-white font-bold text-lg border-t border-gray-200 dark:border-gray-700 pt-2">
              <span>Total CHF</span><span>{formatCHF(invoice.totalRappen)}</span>
            </div>
          </div>
        </div>

        {/* Zahlungsinfos */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Zahlungsinformationen</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400 dark:text-gray-500">Zahlungsmethode</p>
              <p className="text-gray-900 dark:text-white font-medium">{ZAHLUNG_LABELS[invoice.paymentMethod] || invoice.paymentMethod}</p>
            </div>
            <div>
              <p className="text-gray-400 dark:text-gray-500">Zahlungsfrist</p>
              <p className="text-gray-900 dark:text-white font-medium">
                {(invoice as any).zahlungsfrist ? `${(invoice as any).zahlungsfrist} Tage` : '30 Tage'}
                {(invoice as any).dueDate && ` (bis ${formatDate((invoice as any).dueDate)})`}
              </p>
            </div>
            {company?.bankDetails?.iban && (
              <div className="col-span-2">
                <p className="text-gray-400 dark:text-gray-500">IBAN</p>
                <p className="text-gray-900 dark:text-white font-medium font-mono">{company.bankDetails.iban}</p>
              </div>
            )}
            {company?.bankDetails?.bankName && (
              <div className="col-span-2">
                <p className="text-gray-400 dark:text-gray-500">Bank</p>
                <p className="text-gray-900 dark:text-white font-medium">{company.bankDetails.bankName}</p>
              </div>
            )}
          </div>
          {invoice.notes && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-gray-400 dark:text-gray-500 text-sm">Bemerkungen</p>
              <p className="text-gray-700 dark:text-gray-300 text-sm mt-1">{invoice.notes}</p>
            </div>
          )}
        </div>

        {/* Swiss Compliance */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-gray-400 text-xs text-center">
            Gemaess OR Art. 958f werden alle Rechnungen 10 Jahre archiviert.
          </p>
        </div>

      </div>
    </>
  );
}
