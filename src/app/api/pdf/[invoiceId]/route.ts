import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const adminDb = getFirestore();

function formatCHF(rappen: number) {
  return (rappen / 100).toLocaleString('de-CH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(ts: any) {
  if (!ts) return '—';
  const d = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
  return d.toLocaleDateString('de-CH');
}

function mm2pt(mm: number): number {
  return mm * 2.8346456693;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await params;
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'companyId fehlt' }, { status: 400 });
    }

    const [invoiceSnap, companySnap] = await Promise.all([
      adminDb.doc(`companies/${companyId}/invoices/${invoiceId}`).get(),
      adminDb.doc(`companies/${companyId}`).get(),
    ]);

    if (!invoiceSnap.exists) {
      return NextResponse.json({ error: 'Rechnung nicht gefunden' }, { status: 404 });
    }

    const invoice = invoiceSnap.data()!;
    const company = companySnap.data()!;

    const PDFDocument = (await import('pdfkit')).default;
    const { SwissQRBill } = await import('swissqrbill/pdf');

    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    // ─── HEADER: Logo ───
    let headerTextY = mm2pt(20);

    if (company.logoUrl) {
      try {
        const logoRes = await fetch(company.logoUrl);
        const logoBuffer = Buffer.from(await logoRes.arrayBuffer());
        doc.image(logoBuffer, mm2pt(20), mm2pt(15), {
          fit: [mm2pt(50), mm2pt(25)],
          align: 'center',
        });
        headerTextY = mm2pt(44);
      } catch (e) {
        // Logo nicht verfügbar — überspringen
      }
    }

    // ─── HEADER: Absender ───
    doc
      .fontSize(13)
      .font('Helvetica-Bold')
      .text(company.name || '', mm2pt(20), headerTextY)
      .fontSize(9)
      .font('Helvetica')
      .text(company.address?.street || '', mm2pt(20), headerTextY + mm2pt(7))
      .text(`${company.address?.zip || ''} ${company.address?.city || ''}`, mm2pt(20), headerTextY + mm2pt(12));

    if (company.vatNumber) {
      doc.text(`MwSt-Nr: ${company.vatNumber}`, mm2pt(20), headerTextY + mm2pt(17));
    }

    if (company.contactEmail) {
      doc.text(company.contactEmail, mm2pt(20), headerTextY + mm2pt(22));
    }

    // ─── Rechnungsinfo rechts ───
    doc
      .fontSize(9)
      .font('Helvetica')
      .text(`Rechnungsnummer: ${invoice.invoiceNumber}`, mm2pt(120), mm2pt(20), { width: mm2pt(70), align: 'right' })
      .text(`Datum: ${formatDate(invoice.issueDate)}`, mm2pt(120), mm2pt(26), { width: mm2pt(70), align: 'right' })
      .text(`Fällig bis: ${formatDate(invoice.dueDate)}`, mm2pt(120), mm2pt(32), { width: mm2pt(70), align: 'right' });

    // ─── Linie ───
    const lineY = company.logoUrl ? mm2pt(72) : mm2pt(52);
    doc
      .moveTo(mm2pt(20), lineY)
      .lineTo(mm2pt(190), lineY)
      .strokeColor('#cccccc')
      .stroke();

    // ─── Empfänger ───
    const empfY = lineY + mm2pt(8);
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#000000')
      .text(invoice.customerName || '', mm2pt(20), empfY)
      .fontSize(9)
      .font('Helvetica');

    if (invoice.customerAddress?.street) {
      doc.text(invoice.customerAddress.street, mm2pt(20), empfY + mm2pt(7));
    }
    if (invoice.customerAddress?.zip) {
      doc.text(`${invoice.customerAddress.zip} ${invoice.customerAddress.city}`, mm2pt(20), empfY + mm2pt(13));
    }
    if (invoice.customerEmail) {
      doc.text(invoice.customerEmail, mm2pt(20), empfY + mm2pt(19));
    }

    // ─── Titel ───
    const titelY = empfY + mm2pt(28);
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text(`Rechnung ${invoice.invoiceNumber}`, mm2pt(20), titelY);

    // ─── Positionen Header ───
    const tableY = titelY + mm2pt(15);
    doc
      .fontSize(8)
      .font('Helvetica-Bold')
      .fillColor('#666666')
      .text('Bezeichnung', mm2pt(20), tableY)
      .text('Menge', mm2pt(110), tableY, { width: mm2pt(20), align: 'right' })
      .text('Einheit', mm2pt(133), tableY)
      .text('Preis', mm2pt(153), tableY, { width: mm2pt(17), align: 'right' })
      .text('Total', mm2pt(172), tableY, { width: mm2pt(18), align: 'right' });

    doc
      .moveTo(mm2pt(20), tableY + 12)
      .lineTo(mm2pt(190), tableY + 12)
      .strokeColor('#cccccc')
      .stroke();

    // ─── Positionen Zeilen ───
    let y = tableY + mm2pt(7);
    doc.fillColor('#000000');

    (invoice.lines || []).forEach((line: any) => {
      y += mm2pt(7);
      doc
        .fontSize(9)
        .font('Helvetica')
        .text(line.name || '', mm2pt(20), y, { width: mm2pt(85) })
        .text(String(line.quantity), mm2pt(110), y, { width: mm2pt(20), align: 'right' })
        .text(line.unit || '', mm2pt(133), y)
        .text(`CHF ${formatCHF(line.unitPriceRappen)}`, mm2pt(150), y, { width: mm2pt(20), align: 'right' })
        .text(`CHF ${formatCHF(line.totalRappen)}`, mm2pt(170), y, { width: mm2pt(20), align: 'right' });

      if (line.description) {
        y += mm2pt(5);
        doc
          .fontSize(8)
          .fillColor('#888888')
          .text(line.description, mm2pt(20), y, { width: mm2pt(85) })
          .fillColor('#000000');
      }

      doc
        .moveTo(mm2pt(20), y + mm2pt(5))
        .lineTo(mm2pt(190), y + mm2pt(5))
        .strokeColor('#eeeeee')
        .stroke();
    });

    // ─── Totals ───
    y += mm2pt(12);

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#444444')
      .text('Subtotal', mm2pt(130), y, { width: mm2pt(40) })
      .text(`CHF ${formatCHF(invoice.subtotalRappen)}`, mm2pt(150), y, { width: mm2pt(40), align: 'right' });

    y += mm2pt(7);
    doc
      .text(`MwSt ${((invoice.vatRate || 0.081) * 100).toFixed(1)}%`, mm2pt(130), y, { width: mm2pt(40) })
      .text(`CHF ${formatCHF(invoice.vatRappen)}`, mm2pt(150), y, { width: mm2pt(40), align: 'right' });

    doc
      .moveTo(mm2pt(130), y + mm2pt(5))
      .lineTo(mm2pt(190), y + mm2pt(5))
      .strokeColor('#333333')
      .stroke();

    y += mm2pt(10);
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#000000')
      .text('Total CHF', mm2pt(130), y, { width: mm2pt(40) })
      .text(`CHF ${formatCHF(invoice.totalRappen)}`, mm2pt(150), y, { width: mm2pt(40), align: 'right' });

    // ─── Zahlungsinfos ───
    y += mm2pt(15);
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#444444')
      .text(`Zahlungsmethode: ${invoice.paymentMethod?.toUpperCase() || '—'}`, mm2pt(20), y);

    if (company.bankDetails?.iban) {
      y += mm2pt(6);
      doc.text(`IBAN: ${company.bankDetails.iban}`, mm2pt(20), y);
    }

    if (invoice.notes) {
      y += mm2pt(10);
      doc
        .fontSize(9)
        .font('Helvetica-Oblique')
        .fillColor('#555555')
        .text(invoice.notes, mm2pt(20), y, { width: mm2pt(170) });
    }

    // ─── Swiss QR-Bill ───
    const qrData = {
      currency: 'CHF' as const,
      amount: invoice.totalRappen / 100,
      creditor: {
        name: company.name || '',
        address: company.address?.street || '',
        zip: company.address?.zip || '0000',
        city: company.address?.city || '',
        account: company.bankDetails?.iban?.replace(/\s/g, '') || 'CH0000000000000000000',
        country: 'CH' as const,
      },
      debtor: {
        name: invoice.customerName || '',
        address: invoice.customerAddress?.street || '',
        zip: invoice.customerAddress?.zip || '0000',
        city: invoice.customerAddress?.city || '',
        country: 'CH' as const,
      },
      reference: undefined,
      message: invoice.invoiceNumber,
    };

    const qrBill = new SwissQRBill(qrData);
    qrBill.attachTo(doc);

    await new Promise<void>((resolve) => {
      doc.on('end', resolve);
      doc.end();
    });

    const pdfBuffer = Buffer.concat(chunks);

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error('PDF Fehler:', err);
    return NextResponse.json(
      { error: err?.message || 'PDF Generierung fehlgeschlagen' },
      { status: 500 }
    );
  }
}