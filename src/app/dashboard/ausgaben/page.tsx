'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { ExpenseDoc, ExpenseCategory } from '@/types/firestore';

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  Material:     'text-orange-400 bg-orange-900/30',
  Fahrzeug:     'text-blue-400 bg-blue-900/30',
  Büro:         'text-purple-400 bg-purple-900/30',
  Versicherung: 'text-yellow-400 bg-yellow-900/30',
  Marketing:    'text-pink-400 bg-pink-900/30',
  Personal:     'text-green-400 bg-green-900/30',
  Miete:        'text-red-400 bg-red-900/30',
  Telefon:      'text-cyan-400 bg-cyan-900/30',
  Sonstiges:    'text-gray-400 bg-gray-700',
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

export default function AusgabenPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [expenses, setExpenses] = useState<ExpenseDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState('');
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      if (!userSnap.exists()) return;
      const cId = userSnap.data().defaultCompanyId;
      setCompanyId(cId);
      const q = query(
        collection(db, 'companies', cId, 'expenses'),
        orderBy('date', 'desc')
      );
      const unsub = onSnapshot(q, snap => {
        const data = snap.docs.map(d => ({ ...d.data(), expenseId: d.id } as ExpenseDoc));
        setExpenses(data);
        setLoading(false);
      });
      return unsub;
    };
    init();
  }, [user]);

  const filtered = filter === 'all' ? expenses : expenses.filter(e => e.category === filter);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amountRappen, 0);
  const categories = Array.from(new Set(expenses.map(e => e.category)));

  return (
    <div className="px-4 py-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Ausgaben</h1>
          <p className="text-gray-400 mt-1">Ihre Geschäftsausgaben.</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/ausgaben/neu')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Neu
        </button>
      </div>

      {!loading && expenses.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-sm">Total Ausgaben</p>
            <p className="text-red-400 text-xl font-bold mt-1">{formatCHF(totalExpenses)}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-sm">Anzahl</p>
            <p className="text-white text-xl font-bold mt-1">{expenses.length}</p>
          </div>
        </div>
      )}

      {!loading && expenses.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            Alle
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === cat ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-gray-400 text-center py-12">Wird geladen...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-400 text-lg">
            {filter === 'all' ? 'Noch keine Ausgaben erfasst.' : 'Keine Ausgaben in dieser Kategorie.'}
          </p>
          {filter === 'all' && (
            <button
              onClick={() => router.push('/dashboard/ausgaben/neu')}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
            >
              Erste Ausgabe erfassen
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(expense => (
            <div key={expense.expenseId} className="bg-gray-800 rounded-xl p-4 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[expense.category]}`}>
                    {expense.category}
                  </span>
                  <span className="text-gray-500 text-xs">{formatDate(expense.date)}</span>
                </div>
                <p className="text-gray-300 text-sm truncate">{expense.description}</p>
                {expense.receiptUrl && (
                  <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs mt-1 inline-block hover:text-blue-300">
                    📎 Beleg ansehen
                  </a>
                )}
              </div>
              <div className="text-right ml-4">
                <p className="text-red-400 font-bold">{formatCHF(expense.amountRappen)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}