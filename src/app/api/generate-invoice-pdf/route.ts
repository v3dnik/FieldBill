import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { SwissQRBill } from 'swissqrbill/pdf';

export async function POST(req: NextRequest) {
  try {
    const { invoice, company } = await req.json();

    const doc = new PDFDocument({ autoFirstPage: false, size: 'A4' });
    const buffers: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => buffers.push(chunk));

    await new Promise<void>((resolve, reject) => {
      doc.on('end', resolve);
      doc.on('error', reject);

      doc.addPage();

      const pageWidth = doc.page.width;
      const margin = 40;

      // ── HEADER BLAU ──
      doc.rect(0, 0, pageWidth, 100).fill('#1a56db');
      doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold')
        .text(company.name || 'Firma', margin, 20);
      doc.fontSize(9).font('Helvetica');
      if (company.address?.street) doc.text(company.address.street, margin, 48);
      if (company.address?.city) doc.text(`${company.address.zip} ${company.address.city}`, margin, 60);
      if (company.phone) doc.text(company.phone, margin, 72);
      if (company.contactEmail) doc.text(company.contactEmail, margin, 84);

      // Rechnung info rechts
      doc.fontSize(10).font('Helvetica-Bold')
        .text('RECHNUNG', margin, 20, { align: 'right' });
      doc.fontSize(9).font('Helvetica')
        .text(invoice.invoiceNumber, margin, 34, { align: 'right' })
        .text(`Datum: ${formatDate(invoice.issueDate)}`, margin, 46, { align: 'right' });

      // ── EMPFAENGER ──
      doc.fillColor('#6b7280').fontSize(8).font('Helvetica')
        .text('RECHNUNGSEMPFAENGER', margin, 120);
      doc.fillColor('#111827').fontSize(11).font('Helvetica-Bold')
        .text(invoice.customerName, margin, 134);
      doc.fontSize(9).font('Helvetica').fillColor('#374151');
      let empY = 150;
      if (invoice.customerAddress?.street) {
        doc.text(invoice.customerAddress.street, margin, empY); empY += 14;
        doc.text(`${invoice.customerAddress.zip} ${invoice.customerAddress.city}`, margin, empY); empY += 14;
      }
      if (invoice.customerEmail) {
        doc.fillColor('#6b7280').text(invoice.customerEmail, margin, empY);
      }

      // ── POSITIONEN TABELLE ──
      let y = 230;
      doc.rect(margin, y, pageWidth - margin * 2, 20).fill('#1a56db');
      doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
      doc.text('Bezeichnung', margin + 5, y + 6);
      doc.text('Menge', 330, y + 6);
      doc.text('Einheit', 380, y + 6);
      doc.text('Preis', 430, y + 6);
      doc.text('Total', 490, y + 6, { width: 60, align: 'right' });
      y += 20;

      const lines = invoice.lines || [];
      lines.forEach((line: any, idx: number) => {
        if (idx % 2 === 0) doc.rect(margin, y, pageWidth - margin * 2, 20).fill('#f9fafb');
        doc.fillColor('#374151').fontSize(9).font('Helvetica');
        doc.text(line.name, margin + 5, y + 6, { width: 180 });
        doc.text(line.quantity.toString(), 330, y + 6);
        doc.text(line.unit, 380, y + 6);
        doc.text(formatCHF(line.unitPriceRappen), 420, y + 6, { width: 60, align: 'right' });
        doc.font('Helvetica-Bold').text(formatCHF(line.totalRappen), 480, y + 6, { width: 70, align: 'right' });
        y += 20;
      });

      y += 10;

      // ── TOTALS ──
      const totalsX = 380;
      doc.fillColor('#6b7280').fontSize(9).font('Helvetica');
      doc.text('Subtotal:', totalsX, y);
      doc.fillColor('#374151').text(formatCHF(invoice.subtotalRappen), totalsX, y, { width: 170, align: 'right' });
      y += 16;

      const vatEnabled = company.vatEnabled ?? false;
      if (vatEnabled && invoice.vatRappen > 0) {
        doc.fillColor('#6b7280').text(`MwSt ${((invoice.vatRate || 0.081) * 100).toFixed(1)}%:`, totalsX, y);
        doc.fillColor('#374151').text(formatCHF(invoice.vatRappen), totalsX, y, { width: 170, align: 'right' });
        y += 16;
      } else {
        doc.fillColor('#6b7280').text('MwSt: nicht pflichtig', totalsX, y);
        y += 16;
      }

      doc.rect(totalsX, y, 170, 24).fill('#1a56db');
      doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold');
      doc.text('TOTAL CHF:', totalsX + 5, y + 7);
      doc.text(formatCHF(invoice.totalRappen), totalsX, y + 7, { width: 165, align: 'right' });
      y += 34;

      // ── ZAHLUNGSINFOS ──
      y += 10;
      doc.fillColor('#111827').fontSize(10).font('Helvetica-Bold').text('Zahlungsinformationen', margin, y);
      y += 14;
      doc.rect(margin, y, pageWidth - margin * 2, 0.5).fill('#e5e7eb');
      y += 8;

      const zahlungLabels: Record<string, string> = { bar: 'Bar', twint: 'TWINT', karte: 'Karte', rechnung: 'Rechnung' };
      doc.fillColor('#6b7280').fontSize(9).font('Helvetica').text('Zahlungsmethode:', margin, y);
      doc.fillColor('#374151').font('Helvetica-Bold').text(zahlungLabels[invoice.paymentMethod] || invoice.paymentMethod, 180, y);
      y += 14;

      if (invoice.zahlungsfrist) {
        doc.fillColor('#6b7280').font('Helvetica').text('Zahlungsfrist:', margin, y);
        doc.fillColor('#374151').font('Helvetica-Bold').text(`${invoice.zahlungsfrist} Tage`, 180, y);
        y += 14;
      }

      if (company.bankDetails?.iban) {
        doc.fillColor('#6b7280').font('Helvetica').text('IBAN:', margin, y);
        doc.fillColor('#374151').font('Helvetica-Bold').text(company.bankDetails.iban, 180, y);
        y += 14;
      }

      if (company.bankDetails?.bankName) {
        doc.fillColor('#6b7280').font('Helvetica').text('Bank:', margin, y);
        doc.fillColor('#374151').font('Helvetica-Bold').text(company.bankDetails.bankName, 180, y);
        y += 14;
      }

      if (invoice.notes) {
        y += 8;
        doc.fillColor('#111827').fontSize(10).font('Helvetica-Bold').text('Bemerkungen', margin, y);
        y += 14;
        doc.fillColor('#374151').fontSize(9).font('Helvetica').text(invoice.notes, margin, y, { width: pageWidth - margin * 2 });
        y += 20;
      }

      // ── SWISS QR BILL ──
      const iban = (company.bankDetails?.iban || '').replace(/\s/g, '');
      if (iban) {
        const qrData = {
          currency: 'CHF' as const,
          amount: invoice.totalRappen / 100,
          creditor: {
            name: company.name,
            address: company.address?.street || '',
            zip: parseInt(company.address?.zip || '0'),
            city: company.address?.city || '',
            country: 'CH' as const,
            account: iban,
          },
          debtor: {
            name: invoice.customerName,
            address: invoice.customerAddress?.street || '',
            zip: parseInt(invoice.customerAddress?.zip || '0'),
            city: invoice.customerAddress?.city || '',
            country: 'CH' as const,
          },
          message: invoice.invoiceNumber,
        };

        const qrBill = new SwissQRBill(qrData);
        qrBill.attachTo(doc);
      }

      doc.end();
    });

    const pdfBuffer = Buffer.concat(buffers);

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error('PDF generation error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function formatCHF(rappen: number) {
  return 'CHF ' + (rappen / 100).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(ts: any) {
  if (!ts) return '—';
  const d = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
  return d.toLocaleDateString('de-CH');
}