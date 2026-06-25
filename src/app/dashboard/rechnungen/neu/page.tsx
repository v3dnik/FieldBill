'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { ItemDoc, CompanyDoc, KundeDoc } from '@/types/firestore';
import { usePlan } from '@/hooks/usePlan';
import { Suspense } from 'react';

const ZAHLUNGSMETHODEN = [
  { value: 'bar', label: 'Bar' },
  { value: 'twint', label: 'TWINT' },
  { value: 'karte', label: 'Karte' },
  { value: 'rechnung', label: 'Rechnung' },
];

const ZAHLUNGSFRISTEN = [
  { value: 3, label: '3 Tage' },
  { value: 5, label: '5 Tage' },
  { value: 10, label: '10 Tage' },
  { value: 20, label: '20 Tage' },
  { value: 30, label: '30 Tage' },
  { value: 60, label: '60 Tage' },
  { value: 90, label: '90 Tage' },
];

interface Position {
  itemId?: string;
  name: string;
  description: string;
  unit: string;
  quantity: number;
  unitPriceRappen: number;
}

function formatCHF(rappen: number) {
  return 'CHF ' + (rappen / 100).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getKundeName(k: KundeDoc): string {
  if (k.typ === 'firma') return k.firmenname || '—';
  return `${k.vorname || ''} ${k.nachname || ''}`.trim() || '—';
}

const inputClass = "w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500";
const inputSmClass = "w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm";
const sectionClass = "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6";
const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
const labelSmClass = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1";

function NeuRechnungInner() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const kundeIdParam = searchParams.get('kundeId');

  // ── PLAN LIMITI ──
  const {
    canCreateInvoice,
    canSendEmail,
    invoicesThisMonth,
    limits,
    isReadOnly,
    plan,
    loading: planLoading,
  } = usePlan();

  const [companyId, setCompanyId] = useState('');
  const [company, setCompany] = useState<CompanyDoc | null>(null);
  const [katalog, setKatalog] = useState<ItemDoc[]>([]);
  const [kunden, setKunden] = useState<KundeDoc[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [kundeSearch, setKundeSearch] = useState('');
  const [showKundeDropdown, setShowKundeDropdown] = useState(false);
  const [selectedKunde, setSelectedKunde] = useState<KundeDoc | null>(null);

  const [customerName, setCustomerName] = useState('');
  const [customerStreet, setCustomerStreet] = useState('');
  const [customerZip, setCustomerZip] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  const [positionen, setPositionen] = useState<Position[]>([
    { name: '', description: '', unit: 'Stunde', quantity: 1, unitPriceRappen: 0 }
  ]);

  const [zahlungsmethode, setZahlungsmethode] = useState('bar');
  const [zahlungsfrist, setZahlungsfrist] = useState(30);
  const [notes, setNotes] = useState('');
  const [issueDate] = useState(new Date().toISOString().split('T')[0]);
  const [bereitsBezahlt, setBereitsBezahlt] = useState(false);

  useEffect(() => {
    if (zahlungsmethode === 'bar' || zahlungsmethode === 'twint' || zahlungsmethode === 'karte') {
      setBereitsBezahlt(true);
    } else {
      setBereitsBezahlt(false);
    }
  }, [zahlungsmethode]);

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      if (!userSnap.exists()) return;
      const cId = userSnap.data().defaultCompanyId;
      setCompanyId(cId);
      const [compSnap, itemsSnap, kundenSnap] = await Promise.all([
        getDoc(doc(db, 'companies', cId)),
        getDocs(collection(db, 'companies', cId, 'items')),
        getDocs(collection(db, 'companies', cId, 'kunden')),
      ]);
      if (compSnap.exists()) setCompany(compSnap.data() as CompanyDoc);
      setKatalog(itemsSnap.docs.map(d => ({ ...d.data(), itemId: d.id } as ItemDoc)).filter(i => i.active));
      const kundenList = kundenSnap.docs.map(d => ({ ...d.data(), kundeId: d.id } as KundeDoc));
      setKunden(kundenList);
      if (kundeIdParam) {
        const k = kundenList.find(k => k.kundeId === kundeIdParam);
        if (k) fillFromKunde(k);
      }
    };
    init();
  }, [user, kundeIdParam]);

  const fillFromKunde = (k: KundeDoc) => {
    setSelectedKunde(k);
    const name = getKundeName(k);
    setCustomerName(name);
    setCustomerStreet(k.address?.street || '');
    setCustomerZip(k.address?.zip || '');
    setCustomerCity(k.address?.city || '');
    setCustomerEmail(k.email || '');
    setKundeSearch(name);
    setShowKundeDropdown(false);
  };

  const clearKunde = () => {
    setSelectedKunde(null);
    setKundeSearch('');
    setCustomerName('');
    setCustomerStreet('');
    setCustomerZip('');
    setCustomerCity('');
    setCustomerEmail('');
  };

  const filteredKunden = kunden.filter(k => {
    const name = getKundeName(k).toLowerCase();
    const email = (k.email || '').toLowerCase();
    const s = kundeSearch.toLowerCase();
    return name.includes(s) || email.includes(s);
  });

  const subtotalRappen = positionen.reduce((sum, p) => sum + p.quantity * p.unitPriceRappen, 0);
  const vatEnabled = company?.vatEnabled ?? false;
  const vatRate = vatEnabled ? (company?.vatRate || 0.081) : 0;
  const vatRappen = vatEnabled ? Math.round(subtotalRappen * vatRate) : 0;
  const totalRappen = subtotalRappen + vatRappen;

  const addPosition = () => setPositionen([...positionen, { name: '', description: '', unit: 'Stunde', quantity: 1, unitPriceRappen: 0 }]);
  const removePosition = (idx: number) => setPositionen(positionen.filter((_, i) => i !== idx));

  const updatePosition = (idx: number, field: keyof Position, value: any) => {
    const updated = [...positionen];
    updated[idx] = { ...updated[idx], [field]: value };
    setPositionen(updated);
  };

  const selectFromKatalog = (idx: number, itemId: string) => {
    const item = katalog.find(k => k.itemId === itemId);
    if (!item) return;
    const updated = [...positionen];
    updated[idx] = { itemId: item.itemId, name: item.name, description: item.description || '', unit: item.unit, quantity: 1, unitPriceRappen: item.priceRappen };
    setPositionen(updated);
  };

  const generatePDFBase64 = async (invoiceNumber: string, isQuittung: boolean): Promise<string> => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const now = new Date().toLocaleDateString('de-CH');

    pdf.setFillColor(26, 86, 219);
    pdf.rect(0, 0, pageWidth, 38, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20); pdf.setFont('helvetica', 'bold');
    pdf.text(company?.name || '', 14, 12);

    let hy = 17;
    const inhaber = [company?.ownerFirstName, company?.ownerLastName].filter(Boolean).join(' ').trim();
    if (inhaber) {
      pdf.setFontSize(8); pdf.setFont('helvetica', 'normal');
      pdf.text(`Inhaber: ${inhaber}`, 14, hy);
      hy += 4.5;
    }
    pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
    if (company?.address?.street) { pdf.text(company.address.street, 14, hy); hy += 4.5; }
    if (company?.address?.city) { pdf.text(`${company.address.zip} ${company.address.city}`, 14, hy); hy += 4.5; }
    if (company?.phone) { pdf.text(company.phone, 14, hy); hy += 4.5; }
    if (company?.contactEmail) { pdf.text(company.contactEmail, 14, hy); hy += 4.5; }

    pdf.setFontSize(10); pdf.setFont('helvetica', 'bold');
    pdf.text(isQuittung ? 'QUITTUNG' : 'RECHNUNG', pageWidth - 14, 14, { align: 'right' });
    pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
    pdf.text(invoiceNumber, pageWidth - 14, 21, { align: 'right' });
    pdf.text(`Datum: ${now}`, pageWidth - 14, 27, { align: 'right' });
    if (isQuittung) {
      pdf.text(`Zahlungsart: ${ZAHLUNGSMETHODEN.find(z => z.value === zahlungsmethode)?.label || zahlungsmethode}`, pageWidth - 14, 33, { align: 'right' });
    }

    if (isQuittung) {
      pdf.setFillColor(22, 163, 74);
      pdf.roundedRect(14, 42, 30, 8, 2, 2, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(7); pdf.setFont('helvetica', 'bold');
      pdf.text('BEZAHLT', 29, 47.5, { align: 'center' });
    }

    pdf.setTextColor(107, 114, 128); pdf.setFontSize(8); pdf.setFont('helvetica', 'normal');
    pdf.text('RECHNUNGSEMPFAENGER', 14, 58);
    pdf.setTextColor(17, 24, 39); pdf.setFontSize(10); pdf.setFont('helvetica', 'bold');
    pdf.text(customerName, 14, 65);
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9);
    if (customerStreet) { pdf.setTextColor(55, 65, 81); pdf.text(customerStreet, 14, 71); }
    if (customerZip) pdf.text(`${customerZip} ${customerCity}`, 14, 76);
    if (customerEmail) { pdf.setTextColor(107, 114, 128); pdf.text(customerEmail, 14, 82); }

    const tableBody = positionen.map(p => [
      p.name + (p.description ? `\n${p.description}` : ''),
      p.quantity.toString(), p.unit,
      formatCHF(p.unitPriceRappen),
      formatCHF(p.quantity * p.unitPriceRappen),
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
    pdf.setFontSize(9); pdf.setTextColor(107, 114, 128); pdf.setFont('helvetica', 'normal');
    pdf.text('Subtotal:', totalsX, y);
    pdf.setTextColor(55, 65, 81);
    pdf.text(formatCHF(subtotalRappen), pageWidth - 14, y, { align: 'right' });
    y += 6;

    if (vatEnabled && vatRappen > 0) {
      pdf.setTextColor(107, 114, 128);
      pdf.text(`MwSt ${(vatRate * 100).toFixed(1)}%:`, totalsX, y);
      pdf.setTextColor(55, 65, 81);
      pdf.text(formatCHF(vatRappen), pageWidth - 14, y, { align: 'right' });
      y += 6;
    } else if (!vatEnabled) {
      pdf.setTextColor(107, 114, 128);
      pdf.text('MwSt: nicht pflichtig', totalsX, y);
      y += 6;
    }

    pdf.setDrawColor(26, 86, 219); pdf.setLineWidth(0.5);
    pdf.line(totalsX, y, pageWidth - 14, y); y += 5;
    pdf.setFillColor(26, 86, 219);
    pdf.roundedRect(totalsX - 4, y - 4, 80, 12, 2, 2, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(11); pdf.setFont('helvetica', 'bold');
    pdf.text(isQuittung ? 'BEZAHLT CHF:' : 'TOTAL CHF:', totalsX, y + 4);
    pdf.text(formatCHF(totalRappen), pageWidth - 14, y + 4, { align: 'right' });
    y += 18;

    if (!isQuittung && company?.bankDetails?.iban) {
      pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(17, 24, 39);
      pdf.text('Zahlungsinformationen', 14, y); y += 5;
      pdf.setTextColor(107, 114, 128);
      pdf.text(`IBAN: ${company.bankDetails.iban}`, 14, y); y += 5;
      if (company.bankDetails.bankName) pdf.text(`Bank: ${company.bankDetails.bankName}`, 14, y);
    }

    if (isQuittung) {
      pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(22, 163, 74);
      pdf.text(`Zahlung erhalten am ${now} via ${ZAHLUNGSMETHODEN.find(z => z.value === zahlungsmethode)?.label || zahlungsmethode}`, 14, y);
    }

    const pages = pdf.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(7); pdf.setTextColor(156, 163, 175); pdf.setFont('helvetica', 'normal');
      pdf.text(`Seite ${i} von ${pages}`, pageWidth / 2, 290, { align: 'center' });
      pdf.text('Gemaess OR Art. 958f werden alle Dokumente 10 Jahre archiviert.', pageWidth / 2, 285, { align: 'center' });
      pdf.text('Entwickelt von Vodnik Digital Solutions — vodnik.ch', pageWidth / 2, 294, { align: 'center' });
    }

    return pdf.output('datauristring').split(',')[1];
  };

  const sendEmail = async (toEmail: string, invoiceNumber: string, isQuittung: boolean, pdfBase64: string) => {
    const zahlungsart = ZAHLUNGSMETHODEN.find(z => z.value === zahlungsmethode)?.label || zahlungsmethode;
    const now = new Date().toLocaleDateString('de-CH');
    const subject = isQuittung
      ? `Zahlungsbestaetigung ${invoiceNumber} ✓ — ${company?.name}`
      : `Rechnung ${invoiceNumber} — ${company?.name}`;

    const html = isQuittung ? `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a56db; padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">FieldBill</h1>
          <p style="color: #93c5fd; margin: 4px 0 0 0; font-size: 14px;">${company?.name}</p>
        </div>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px;">
          <p style="color: #16a34a; font-size: 18px; font-weight: bold; margin: 0;">✓ Zahlung bestaetigt</p>
        </div>
        <div style="background: #ffffff; border: 1px solid #e5e7eb; padding: 24px;">
          <p style="color: #374151;">Sehr geehrte Damen und Herren</p>
          <p style="color: #374151;">Wir bestaetigen den Eingang Ihrer Zahlung:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Dokument-Nr.</td>
              <td style="padding: 8px 0; font-weight: bold; color: #111827; text-align: right;">${invoiceNumber}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Betrag</td>
              <td style="padding: 8px 0; font-weight: bold; color: #16a34a; text-align: right; font-size: 18px;">${formatCHF(totalRappen)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Zahlungsart</td>
              <td style="padding: 8px 0; font-weight: bold; color: #111827; text-align: right;">${zahlungsart}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Datum</td>
              <td style="padding: 8px 0; font-weight: bold; color: #111827; text-align: right;">${now}</td>
            </tr>
          </table>
          <p style="color: #374151;">Die Quittung finden Sie im Anhang.</p>
          <p style="color: #374151; margin-top: 24px;">Mit freundlichen Gruessen<br><strong>${company?.name}</strong></p>
        </div>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; padding: 16px; border-radius: 0 0 12px 12px; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">FieldBill — Entwickelt von Vodnik Digital Solutions — vodnik.ch</p>
        </div>
      </div>
    ` : `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a56db; padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">FieldBill</h1>
          <p style="color: #93c5fd; margin: 4px 0 0 0; font-size: 14px;">${company?.name}</p>
        </div>
        <div style="background: #ffffff; border: 1px solid #e5e7eb; padding: 24px;">
          <p style="color: #374151;">Sehr geehrte Damen und Herren</p>
          <p style="color: #374151;">Im Anhang finden Sie unsere Rechnung:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Rechnungs-Nr.</td>
              <td style="padding: 8px 0; font-weight: bold; color: #111827; text-align: right;">${invoiceNumber}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Betrag</td>
              <td style="padding: 8px 0; font-weight: bold; color: #1a56db; text-align: right; font-size: 18px;">${formatCHF(totalRappen)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Zahlungsfrist</td>
              <td style="padding: 8px 0; font-weight: bold; color: #111827; text-align: right;">${zahlungsfrist} Tage</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Zahlungsart</td>
              <td style="padding: 8px 0; font-weight: bold; color: #111827; text-align: right;">${zahlungsart}</td>
            </tr>
          </table>
          ${company?.bankDetails?.iban ? `
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="color: #1e40af; font-weight: bold; margin: 0 0 8px 0; font-size: 14px;">Zahlungsinformationen</p>
            <p style="color: #374151; font-size: 14px; margin: 4px 0;">IBAN: <strong>${company.bankDetails.iban}</strong></p>
            ${company.bankDetails.bankName ? `<p style="color: #374151; font-size: 14px; margin: 4px 0;">Bank: ${company.bankDetails.bankName}</p>` : ''}
          </div>
          ` : ''}
          <p style="color: #374151; margin-top: 24px;">Mit freundlichen Gruessen<br><strong>${company?.name}</strong></p>
        </div>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; padding: 16px; border-radius: 0 0 12px 12px; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">FieldBill — Entwickelt von Vodnik Digital Solutions — vodnik.ch</p>
        </div>
      </div>
    `;

    await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: toEmail, subject, html, pdfBase64,
        pdfFilename: isQuittung ? `Quittung_${invoiceNumber}.pdf` : `Rechnung_${invoiceNumber}.pdf`,
      }),
    });
  };

  const handleSave = async () => {
    if (!canCreateInvoice) {
      setError(`Sie haben das Limit von ${limits.invoicesPerMonth} Rechnungen pro Monat erreicht. Bitte upgraden Sie Ihren Plan.`);
      return;
    }
    if (!customerName.trim()) { setError('Kundenname ist erforderlich.'); return; }
    if (positionen.some(p => !p.name.trim())) { setError('Alle Positionen müssen einen Namen haben.'); return; }
    if (positionen.some(p => p.quantity <= 0)) { setError('Alle Mengen müssen grösser als 0 sein.'); return; }
    setSaving(true); setError('');
    try {
      const compRef = doc(db, 'companies', companyId);
      const compSnap = await getDoc(compRef);
      const compData = compSnap.data()!;
      const nextNum = compData.invoiceSettings?.nextNumber || 1;
      const year = new Date().getFullYear();
      const invoiceNumber = `RE-${year}-${String(nextNum).padStart(4, '0')}`;
      const issueDateObj = new Date(issueDate);
      const dueDateObj = new Date(issueDateObj);
      dueDateObj.setDate(dueDateObj.getDate() + zahlungsfrist);
      const status = bereitsBezahlt ? 'paid' : 'issued';

      await addDoc(collection(db, 'companies', companyId, 'invoices'), {
        invoiceNumber, status,
        createdBy: user!.uid,
        dateKey: issueDate,
        issueDate: Timestamp.fromDate(issueDateObj),
        dueDate: Timestamp.fromDate(dueDateObj),
        customerName: customerName.trim(),
        customerAddress: { street: customerStreet.trim(), zip: customerZip.trim(), city: customerCity.trim(), country: 'CH' },
        customerEmail: customerEmail.trim(),
        lines: positionen.map(p => ({
          itemId: p.itemId || null,
          name: p.name.trim(), description: p.description.trim(),
          unit: p.unit, quantity: p.quantity,
          unitPriceRappen: p.unitPriceRappen,
          totalRappen: p.quantity * p.unitPriceRappen,
        })),
        subtotalRappen, vatRate, vatRappen, totalRappen,
        paymentMethod: zahlungsmethode,
        zahlungsfrist, notes: notes.trim(),
        ...(bereitsBezahlt && { paidAt: Timestamp.now() }),
        createdAt: Timestamp.now(),
      });

      await updateDoc(compRef, { 'invoiceSettings.nextNumber': nextNum + 1 });

      // Email nur wenn plan erlaubt
      if (customerEmail.trim() && canSendEmail) {
        const pdfBase64 = await generatePDFBase64(invoiceNumber, bereitsBezahlt);
        await sendEmail(customerEmail.trim(), invoiceNumber, bereitsBezahlt, pdfBase64);
      }

      router.push('/dashboard/rechnungen');
    } catch (err: any) {
      setError('Fehler: ' + (err?.message || 'Unbekannt'));
      setSaving(false);
    }
  };

  // ── PLAN LIMIT BANNER ──
  const limitReached = !canCreateInvoice;
  const limitWarning = !limitReached && limits.invoicesPerMonth !== null &&
    invoicesThisMonth >= limits.invoicesPerMonth - 1;

  if (planLoading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-gray-400">Wird geladen...</div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {bereitsBezahlt ? 'Neue Quittung' : 'Neue Rechnung'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {bereitsBezahlt ? 'Sofortzahlung erfassen und quittieren.' : 'Rechnung erstellen und ausstellen.'}
          </p>
        </div>
        <button onClick={() => router.push('/dashboard/rechnungen')}
          className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors">
          ✕ Abbrechen
        </button>
      </div>

      {/* Plan Limit erreicht */}
      {limitReached && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-5">
          <p className="text-red-700 dark:text-red-300 font-semibold text-sm">
            🚫 Monatliches Limit erreicht
          </p>
          <p className="text-red-600 dark:text-red-400 text-sm mt-1">
            Sie haben diesen Monat bereits {invoicesThisMonth} von {limits.invoicesPerMonth} Rechnungen erstellt.
            Upgraden Sie auf Pro oder Business für mehr Rechnungen.
          </p>
          <button onClick={() => router.push('/pricing')}
            className="mt-3 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            Plan upgraden →
          </button>
        </div>
      )}

      {/* Plan Limit Warnung */}
      {limitWarning && !limitReached && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-4">
          <p className="text-yellow-700 dark:text-yellow-300 text-sm">
            ⚠️ Sie haben noch <strong>1 Rechnung</strong> übrig diesen Monat ({invoicesThisMonth}/{limits.invoicesPerMonth}).
            <button onClick={() => router.push('/pricing')} className="ml-2 underline">Plan upgraden</button>
          </p>
        </div>
      )}

      {/* Read-only Banner */}
      {isReadOnly && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-xl p-5">
          <p className="text-orange-700 dark:text-orange-300 font-semibold text-sm">
            🔒 Ihr Plan ist abgelaufen
          </p>
          <p className="text-orange-600 dark:text-orange-400 text-sm mt-1">
            Sie befinden sich im Read-only Modus. Bestehende Daten sind sicher archiviert.
          </p>
          <button onClick={() => router.push('/pricing')}
            className="mt-3 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            Plan erneuern →
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Kunde */}
      <div className={sectionClass}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Kunde</h2>
        <div className="space-y-4">
          {kunden.length > 0 && (
            <div className="relative">
              <label className={labelClass}>Aus Kundenliste wählen</label>
              {selectedKunde ? (
                <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span>{selectedKunde.typ === 'firma' ? '🏢' : '👤'}</span>
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{getKundeName(selectedKunde)}</span>
                  </div>
                  <button onClick={clearKunde} className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400">✕ Ändern</button>
                </div>
              ) : (
                <div className="relative">
                  <input type="text" value={kundeSearch}
                    onChange={e => { setKundeSearch(e.target.value); setShowKundeDropdown(true); }}
                    onFocus={() => setShowKundeDropdown(true)}
                    placeholder="Suchen oder neu eingeben..."
                    className={inputClass} />
                  {showKundeDropdown && kundeSearch && filteredKunden.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg overflow-hidden">
                      {filteredKunden.slice(0, 5).map(k => (
                        <button key={k.kundeId} onClick={() => fillFromKunde(k)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-left transition-colors border-b border-gray-100 dark:border-gray-700/50 last:border-b-0">
                          <span>{k.typ === 'firma' ? '🏢' : '👤'}</span>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{getKundeName(k)}</p>
                            {k.email && <p className="text-xs text-gray-400">{k.email}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1">Oder unten manuell eingeben</p>
            </div>
          )}
          <div>
            <label className={labelClass}>Name / Firma <span className="text-red-500">*</span></label>
            <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
              placeholder="z.B. Max Mustermann AG" className={inputClass} disabled={isReadOnly || limitReached} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3">
              <label className={labelClass}>Strasse</label>
              <input type="text" value={customerStreet} onChange={e => setCustomerStreet(e.target.value)}
                placeholder="Musterstrasse 1" className={inputClass} disabled={isReadOnly || limitReached} />
            </div>
            <div>
              <label className={labelClass}>PLZ</label>
              <input type="text" value={customerZip} onChange={e => setCustomerZip(e.target.value)}
                placeholder="8001" className={inputClass} disabled={isReadOnly || limitReached} />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Ort</label>
              <input type="text" value={customerCity} onChange={e => setCustomerCity(e.target.value)}
                placeholder="Zürich" className={inputClass} disabled={isReadOnly || limitReached} />
            </div>
          </div>
          <div>
            <label className={labelClass}>
              E-Mail
              <span className="text-gray-400 text-xs ml-1">
                {customerEmail && canSendEmail ? '— wird automatisch per E-Mail zugestellt' : customerEmail && !canSendEmail ? '— E-Mail Versand nicht im Free Plan' : '(optional)'}
              </span>
            </label>
            <input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)}
              placeholder="kunde@beispiel.ch" className={inputClass} disabled={isReadOnly || limitReached} />
          </div>
        </div>
      </div>

      {/* Positionen */}
      <div className={sectionClass}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Positionen</h2>
        <div className="space-y-4">
          {positionen.map((pos, idx) => (
            <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">Position {idx + 1}</span>
                {positionen.length > 1 && (
                  <button onClick={() => removePosition(idx)} className="text-red-500 dark:text-red-400 hover:text-red-700 text-sm">Entfernen</button>
                )}
              </div>
              {katalog.length > 0 && (
                <div>
                  <label className={labelSmClass}>Aus Leistungskatalog wählen</label>
                  <select onChange={e => selectFromKatalog(idx, e.target.value)} defaultValue="" className={inputSmClass} disabled={isReadOnly || limitReached}>
                    <option value="">— Leistung auswählen —</option>
                    {katalog.map(item => (
                      <option key={item.itemId} value={item.itemId}>{item.name} — {formatCHF(item.priceRappen)} / {item.unit}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className={labelSmClass}>Bezeichnung <span className="text-red-500">*</span></label>
                <input type="text" value={pos.name} onChange={e => updatePosition(idx, 'name', e.target.value)}
                  placeholder="z.B. Umzug pro Stunde" className={inputSmClass} disabled={isReadOnly || limitReached} />
              </div>
              <div>
                <label className={labelSmClass}>Beschreibung</label>
                <input type="text" value={pos.description} onChange={e => updatePosition(idx, 'description', e.target.value)}
                  placeholder="Zusätzliche Details (optional)" className={inputSmClass} disabled={isReadOnly || limitReached} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelSmClass}>Menge</label>
                  <input type="number" value={pos.quantity}
                    onChange={e => updatePosition(idx, 'quantity', parseFloat(e.target.value) || 0)}
                    min="0.1" step="0.5" className={inputSmClass} disabled={isReadOnly || limitReached} />
                </div>
                <div>
                  <label className={labelSmClass}>Einheit</label>
                  <input type="text" value={pos.unit} onChange={e => updatePosition(idx, 'unit', e.target.value)}
                    placeholder="Stunde" className={inputSmClass} disabled={isReadOnly || limitReached} />
                </div>
                <div>
                  <label className={labelSmClass}>Preis/Einheit (CHF)</label>
                  <input type="number" value={pos.unitPriceRappen / 100}
                    onChange={e => updatePosition(idx, 'unitPriceRappen', Math.round((parseFloat(e.target.value) || 0) * 100))}
                    min="0" step="0.05" placeholder="0.00" className={inputSmClass} disabled={isReadOnly || limitReached} />
                </div>
              </div>
              <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                Total: <span className="text-gray-900 dark:text-white font-semibold">{formatCHF(pos.quantity * pos.unitPriceRappen)}</span>
              </div>
            </div>
          ))}
          {!isReadOnly && !limitReached && (
            <button onClick={addPosition}
              className="w-full border border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 text-gray-400 hover:text-blue-500 py-3 rounded-xl transition-colors text-sm">
              + Position hinzufügen
            </button>
          )}
        </div>
      </div>

      {/* Zusammenfassung */}
      <div className={sectionClass}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Zusammenfassung</h2>
        <div className="space-y-2">
          <div className="flex justify-between text-gray-600 dark:text-gray-300">
            <span>Subtotal</span><span>{formatCHF(subtotalRappen)}</span>
          </div>
          {vatEnabled ? (
            <div className="flex justify-between text-gray-600 dark:text-gray-300">
              <span>MwSt {(vatRate * 100).toFixed(1)}%</span><span>{formatCHF(vatRappen)}</span>
            </div>
          ) : (
            <div className="flex justify-between text-gray-400 dark:text-gray-500 text-sm">
              <span>MwSt</span><span>nicht MwSt-pflichtig</span>
            </div>
          )}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between text-gray-900 dark:text-white font-bold text-lg">
            <span>Total CHF</span><span>{formatCHF(totalRappen)}</span>
          </div>
        </div>
      </div>

      {/* Zahlungseinstellungen */}
      <div className={sectionClass}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Zahlungseinstellungen</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Zahlungsmethode</label>
              <select value={zahlungsmethode} onChange={e => setZahlungsmethode(e.target.value)} className={inputClass} disabled={isReadOnly || limitReached}>
                {ZAHLUNGSMETHODEN.map(z => <option key={z.value} value={z.value}>{z.label}</option>)}
              </select>
            </div>
            {!bereitsBezahlt && (
              <div>
                <label className={labelClass}>Zahlungsfrist</label>
                <select value={zahlungsfrist} onChange={e => setZahlungsfrist(parseInt(e.target.value))} className={inputClass} disabled={isReadOnly || limitReached}>
                  {ZAHLUNGSFRISTEN.map(z => <option key={z.value} value={z.value}>{z.label}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className={`flex items-center justify-between p-4 rounded-xl border-2 transition-colors ${
            bereitsBezahlt
              ? 'bg-green-50 dark:bg-green-900/20 border-green-400 dark:border-green-600'
              : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
          }`}>
            <div>
              <p className={`font-medium text-sm ${bereitsBezahlt ? 'text-green-700 dark:text-green-300' : 'text-gray-700 dark:text-gray-300'}`}>
                {bereitsBezahlt ? '✓ Bereits bezahlt — Quittung wird ausgestellt' : 'Noch nicht bezahlt — Rechnung wird ausgestellt'}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {bereitsBezahlt
                  ? `${ZAHLUNGSMETHODEN.find(z => z.value === zahlungsmethode)?.label} — sofort als bezahlt markiert`
                  : 'Zahlungsfrist gilt ab Ausstellungsdatum'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setBereitsBezahlt(!bereitsBezahlt)}
              disabled={isReadOnly || limitReached}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                bereitsBezahlt ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                bereitsBezahlt ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          <div>
            <label className={labelClass}>Bemerkungen <span className="text-gray-400 text-xs">(optional)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="z.B. Vielen Dank für Ihren Auftrag."
              rows={3} className={`${inputClass} resize-none`} disabled={isReadOnly || limitReached} />
          </div>
        </div>
      </div>

      {/* Email Info */}
      {customerEmail && canSendEmail && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
          <p className="text-blue-700 dark:text-blue-300 text-sm font-medium">
            📧 {bereitsBezahlt ? 'Quittung' : 'Rechnung'} wird automatisch an {customerEmail} gesendet
          </p>
        </div>
      )}

      {customerEmail && !canSendEmail && (
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            📧 E-Mail Versand ist im Free Plan nicht verfügbar.
            <button onClick={() => router.push('/pricing')} className="ml-1 text-blue-600 dark:text-blue-400 underline">Upgraden →</button>
          </p>
        </div>
      )}

      {/* Button */}
      {!isReadOnly && !limitReached && (
        <div className="pb-8">
          <button onClick={handleSave} disabled={saving}
            className={`w-full disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors text-base ${
              bereitsBezahlt ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}>
            {saving
              ? (customerEmail && canSendEmail ? 'Wird gespeichert und gesendet...' : 'Wird gespeichert...')
              : bereitsBezahlt
                ? `✓ Quittung ausstellen${customerEmail && canSendEmail ? ' & per E-Mail senden' : ''}`
                : `Rechnung ausstellen${customerEmail && canSendEmail ? ' & per E-Mail senden' : ''}`
            }
          </button>
        </div>
      )}
    </div>
  );
}

export default function NeuRechnungPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="text-gray-400">Wird geladen...</div></div>}>
      <NeuRechnungInner />
    </Suspense>
  );
}