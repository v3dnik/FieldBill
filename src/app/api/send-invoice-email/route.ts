import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend('re_FAzn2SQg_HLtUtToUmY6z5XoUoGU22ik6');

function formatCHF(rappen: number) {
  return 'CHF ' + (rappen / 100).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function POST(req: NextRequest) {
  try {
    const {
      to,
      subject,
      message,
      invoiceNumber,
      customerName,
      totalRappen,
      companyName,
      companyEmail,
    } = await req.json();

    if (!to || !subject || !message) {
      return NextResponse.json({ error: 'Fehlende Pflichtfelder.' }, { status: 400 });
    }

    const messageHtml = message.replace(/\n/g, '<br>');

    const html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="background:#1a56db;border-radius:12px 12px 0 0;padding:32px 40px;">
              <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${companyName}</p>
              <p style="margin:6px 0 0;color:#93c5fd;font-size:13px;">Rechnungsversand via FieldBill</p>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:36px 40px;">
              <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px 20px;">
                    <p style="margin:0;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">Rechnung</p>
                    <p style="margin:4px 0 0;color:#1e40af;font-size:20px;font-weight:700;">${invoiceNumber}</p>
                    <p style="margin:6px 0 0;color:#374151;font-size:15px;font-weight:600;">${formatCHF(totalRappen)}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.7;">${messageHtml}</p>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;">
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
                Diese E-Mail wurde ueber <strong>FieldBill</strong> versendet.<br>
                Bei Fragen wenden Sie sich direkt an: <a href="mailto:${companyEmail}" style="color:#1a56db;text-decoration:none;">${companyEmail}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:11px;">
                Gemaess OR Art. 958f werden alle Rechnungen 10 Jahre archiviert.<br>
                Entwickelt von <a href="https://vodnik.ch" style="color:#1a56db;text-decoration:none;">Vodnik Digital Solutions</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const { data, error } = await resend.emails.send({
      from: `${companyName} <onboarding@resend.dev>`,
      to: [to],
      subject,
      html,
      replyTo: companyEmail || undefined,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (err: any) {
    console.error('API error:', err);
    return NextResponse.json({ error: err.message || 'Interner Fehler.' }, { status: 500 });
  }
}