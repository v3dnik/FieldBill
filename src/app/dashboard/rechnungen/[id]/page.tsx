'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { InvoiceDoc, CompanyDoc } from '@/types/firestore';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft:     { label: 'Entwurf',     color: 'text-gray-400 bg-gray-700' },
  issued:    { label: 'Ausgestellt', color: 'text-blue-400 bg-blue-900/40' },
  paid:      { label: 'Bezahlt',     color: 'text-green-400 bg-green-900/40' },
  cancelled: { label: 'Storniert',   color: 'text-red-400 bg-red-900/40' },
};

const ZAHLUNG_LABELS: Record<string, string> = {
  bar: 'Bar', twint: 'TWINT', karte: 'Karte', rechnung: 'Rechnung',
};

function formatCHF(rappen: number) {
  const chf = rappen / 100;
  return 'CHF ' + chf.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(ts: any) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('de-CH');
}

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
  const [error, setError] = useState('');

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

        if (!invoiceSnap.exists()) {
          setError('Rechnung nicht gefunden.');
          setLoading(false);
          return;
        }

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

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-gray-400">Wird geladen...</div>
    </div>
  );

  if (error && !invoice) return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">{error}</div>
    </div>
  );

  if (!invoice) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => router.push('/dashboard/rechnungen')}
            className="text-gray-400 hover:text-white text-sm mb-2 flex items-center gap-1"
          >
            ← Zurück
          </button>
          <h1 className="text-2xl font-bold text-white">{invoice.invoiceNumber}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_LABELS[invoice.status]?.color}`}>
              {STATUS_LABELS[invoice.status]?.label}
            </span>
            <span className="text-gray-400 text-sm">{formatDate(invoice.issueDate)}</span>
          </div>
        </div>

        {/* Status Actions */}
        <div className="flex gap-2 flex-wrap justify-end">

          {/* PDF Download — immer sichtbar */}
          <a
            href={`/api/pdf/${invoice.invoiceId}?companyId=${companyId}`}
            target="_blank"
            className="bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            📄 PDF herunterladen
          </a>

          {invoice.status === 'draft' && (
            <button
              onClick={() => updateStatus('issued')}
              disabled={updating}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Ausstellen
            </button>
          )}
          {invoice.status === 'issued' && (
            <>
              <button
                onClick={() => updateStatus('paid')}
                disabled={updating}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Als Bezahlt markieren
              </button>
              <button
                onClick={() => updateStatus('cancelled')}
                disabled={updating}
                className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Stornieren
              </button>
            </>
          )}
          {invoice.status === 'paid' && (
            <span className="text-green-400 text-sm font-medium py-2">
              ✓ Bezahlt am {formatDate((invoice as any).paidAt)}
            </span>
          )}
          {invoice.status === 'cancelled' && (
            <div className="flex items-center gap-2 bg-red-900/20 border border-red-500/30 px-4 py-2 rounded-lg">
              <span className="text-red-400 text-sm">🔒 Storniert — gesetzlich archiviert</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Absender + Empfänger */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-xs uppercase tracking-wide mb-3">Von</p>
          {company ? (
            <>
              <p className="text-white font-semibold">{company.name}</p>
              <p className="text-gray-300 text-sm">{company.address?.street}</p>
              <p className="text-gray-300 text-sm">{company.address?.zip} {company.address?.city}</p>
              {company.vatNumber && <p className="text-gray-400 text-xs mt-1">MwSt-Nr: {company.vatNumber}</p>}
            </>
          ) : (
            <p className="text-gray-400 text-sm">—</p>
          )}
        </div>
        <div className="bg-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-xs uppercase tracking-wide mb-3">An</p>
          <p className="text-white font-semibold">{invoice.customerName}</p>
          {invoice.customerAddress?.street && (
            <p className="text-gray-300 text-sm">{invoice.customerAddress.street}</p>
          )}
          {invoice.customerAddress?.zip && (
            <p className="text-gray-300 text-sm">{invoice.customerAddress.zip} {invoice.customerAddress.city}</p>
          )}
          {invoice.customerEmail && (
            <p className="text-gray-400 text-xs mt-1">{invoice.customerEmail}</p>
          )}
        </div>
      </div>

      {/* Positionen */}
      <div className="bg-gray-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-4">Positionen</h2>
        <div className="space-y-1">
          <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 uppercase tracking-wide pb-2 border-b border-gray-700">
            <div className="col-span-5">Bezeichnung</div>
            <div className="col-span-2 text-right">Menge</div>
            <div className="col-span-2 text-right">Einheit</div>
            <div className="col-span-1 text-right">Preis</div>
            <div className="col-span-2 text-right">Total</div>
          </div>
          {invoice.lines?.map((line, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 py-3 border-b border-gray-700/50">
              <div className="col-span-5">
                <p className="text-white text-sm">{line.name}</p>
                {line.description && <p className="text-gray-400 text-xs">{line.description}</p>}
              </div>
              <div className="col-span-2 text-right text-gray-300 text-sm">{line.quantity}</div>
              <div className="col-span-2 text-right text-gray-300 text-sm">{line.unit}</div>
              <div className="col-span-1 text-right text-gray-300 text-sm">
                {formatCHF(line.unitPriceRappen)}
              </div>
              <div className="col-span-2 text-right text-white text-sm font-medium">
                {formatCHF(line.totalRappen)}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2 max-w-xs ml-auto">
          <div className="flex justify-between text-gray-300 text-sm">
            <span>Subtotal</span>
            <span>{formatCHF(invoice.subtotalRappen)}</span>
          </div>
          <div className="flex justify-between text-gray-300 text-sm">
            <span>MwSt {((invoice.vatRate || 0.081) * 100).toFixed(1)}%</span>
            <span>{formatCHF(invoice.vatRappen)}</span>
          </div>
          <div className="flex justify-between text-white font-bold text-lg border-t border-gray-700 pt-2">
            <span>Total CHF</span>
            <span>{formatCHF(invoice.totalRappen)}</span>
          </div>
        </div>
      </div>

      {/* Zahlungsinfos */}
      <div className="bg-gray-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-4">Zahlungsinformationen</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Zahlungsmethode</p>
            <p className="text-white font-medium">{ZAHLUNG_LABELS[invoice.paymentMethod] || invoice.paymentMethod}</p>
          </div>
          <div>
            <p className="text-gray-400">Zahlungsfrist</p>
            <p className="text-white font-medium">
              {(invoice as any).zahlungsfrist ? `${(invoice as any).zahlungsfrist} Tage` : '30 Tage'}
              {(invoice as any).dueDate && ` (bis ${formatDate((invoice as any).dueDate)})`}
            </p>
          </div>
          {company?.bankDetails?.iban && (
            <div className="col-span-2">
              <p className="text-gray-400">IBAN</p>
              <p className="text-white font-medium font-mono">{company.bankDetails.iban}</p>
            </div>
          )}
        </div>
        {invoice.notes && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-gray-400 text-sm">Bemerkungen</p>
            <p className="text-gray-300 text-sm mt-1">{invoice.notes}</p>
          </div>
        )}
      </div>

      {/* Swiss Compliance Hinweis */}
      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
        <p className="text-gray-500 text-xs text-center">
          🇨🇭 Gemäss Schweizer Obligationenrecht (OR Art. 958f) werden alle Rechnungen 10 Jahre archiviert.
        </p>
      </div>

    </div>
  );
}