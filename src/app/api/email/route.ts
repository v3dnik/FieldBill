import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend('re_FAzn2SQg_HLtUtToUmY6z5XoUoGU22ik6');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, subject, html, pdfBase64, pdfFilename } = body;

    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const attachments = pdfBase64 ? [{
      filename: pdfFilename || 'dokument.pdf',
      content: pdfBase64,
    }] : [];

    const { data, error } = await resend.emails.send({
      from: 'FieldBill <noreply@fieldbill.ch>',
      to,
      subject,
      html,
      attachments,
    });

    if (error) return NextResponse.json({ error }, { status: 400 });
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}