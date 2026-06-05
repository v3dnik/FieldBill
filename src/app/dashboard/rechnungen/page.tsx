'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { InvoiceDoc, MembershipDoc } from '@/types/firestore';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft:     { label: 'Entwurf',    color: 'text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-gray-700' },
  issued:    { label: 'Ausgestellt', color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/40' },
  paid:      { label: 'Bezahlt',    color: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/40' },
  cancelled: { label: 'Storniert',  color: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/40' },
};

function formatCHF(rappen: number) {
  return 'CHF ' + (rappen / 100).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(ts: any) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('de-CH');
}

export default function RechnungenPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [isBoss, setIsBoss] = useState(false);

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      if (!userSnap.exists()) return;
      const cId = userSnap.data().defaultCompanyId;

      // Preveri vlogo
      const membershipSnap = await getDoc(doc(db, 'memberships', `${user.uid}_${cId}`));
      const role = membershipSnap.exists()
        ? (membershipSnap.data() as MembershipDoc).role
        : 'employee';
      setIsBoss(role === 'boss');

      const q = query(
        collection(db, 'companies', cId, 'invoices'),
        orderBy('createdAt', 'desc')
      );

      const unsub = onSnapshot(q, snap => {
        let all = snap.docs.map(d => ({ ...d.data(), invoiceId: d.id } as InvoiceDoc));
        // Employee vidi samo svoje
        if (role !== 'boss') {
          all = all.filter(i => i.createdBy === user.uid);
        }
        setInvoices(all);
        setLoading(false);
      });
      return unsub;
    };
    init();
  }, [user]);

  const filtered = filter === 'all' ? invoices : invoices.filter(i => i.status === filter);
  const totalOpen = invoices.filter(i => i.status === 'issued').reduce((s, i) => s + i.totalRappen, 0);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.totalRappen, 0);

  return (
    <div className="px-4 py-8 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Rechnungen</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {isBoss ? 'Alle Rechnungen der Firma.' : 'Ihre eigenen Rechnungen.'}
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard/rechnungen/neu')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors">
          + Neu
        </button>
      </div>

      {/* Stats */}
      {!loading && invoices.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Offen</p>
            <p className="text-gray-900 dark:text-white text-xl font-bold mt-1">{formatCHF(totalOpen)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Bezahlt</p>
            <p className="text-green-600 dark:text-green-400 text-xl font-bold mt-1">{formatCHF(totalPaid)}</p>
          </div>
        </div>
      )}

      {/* Filter */}
      {!loading && invoices.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {['all', 'draft', 'issued', 'paid', 'cancelled'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}>
              {f === 'all' ? 'Alle' : STATUS_LABELS[f]?.label}
            </button>
          ))}
        </div>
      )}

      {/* Liste */}
      {loading ? (
        <div className="text-gray-400 text-center py-12">Wird geladen...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            {filter === 'all' ? 'Noch keine Rechnungen.' : 'Keine Rechnungen in dieser Kategorie.'}
          </p>
          {filter === 'all' && (
            <button onClick={() => router.push('/dashboard/rechnungen/neu')}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors">
              Erste Rechnung erstellen
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(invoice => (
            <div key={invoice.invoiceId}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-gray-900 dark:text-white font-semibold">{invoice.invoiceNumber}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_LABELS[invoice.status]?.color}`}>
                    {STATUS_LABELS[invoice.status]?.label}
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-sm truncate">{invoice.customerName}</p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">{formatDate(invoice.issueDate)}</p>
              </div>
              <div className="text-right ml-4">
                <p className="text-gray-900 dark:text-white font-bold">{formatCHF(invoice.totalRappen)}</p>
                <button
                  onClick={() => router.push(`/dashboard/rechnungen/${invoice.invoiceId}`)}
                  className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 text-sm mt-1">
                  Öffnen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}