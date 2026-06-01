'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { ExpenseDoc, ExpenseCategory } from '@/types/firestore';

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  Material:     'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/30',
  Fahrzeug:     'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30',
  Büro:         'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/30',
  Versicherung: 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/30',
  Marketing:    'text-pink-600 bg-pink-50 dark:text-pink-400 dark:bg-pink-900/30',
  Personal:     'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30',
  Miete:        'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30',
  Telefon:      'text-cyan-600 bg-cyan-50 dark:text-cyan-400 dark:bg-cyan-900/30',
  Sonstiges:    'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700',
};

function formatCHF(rappen: number) {
  return 'CHF ' + (rappen / 100).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      if (!userSnap.exists()) return;
      const cId = userSnap.data().defaultCompanyId;
      const q = query(collection(db, 'companies', cId, 'expenses'), orderBy('date', 'desc'));
      const unsub = onSnapshot(q, snap => {
        setExpenses(snap.docs.map(d => ({ ...d.data(), expenseId: d.id } as ExpenseDoc)));
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ausgaben</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Ihre Geschäftsausgaben.</p>
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
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Total Ausgaben</p>
            <p className="text-red-600 dark:text-red-400 text-xl font-bold mt-1">{formatCHF(totalExpenses)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Anzahl</p>
            <p className="text-gray-900 dark:text-white text-xl font-bold mt-1">{expenses.length}</p>
          </div>
        </div>
      )}

      {!loading && expenses.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Alle
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-gray-400 text-center py-12">Wird geladen...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-lg">
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
            <div key={expense.expenseId}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[expense.category]}`}>
                    {expense.category}
                  </span>
                  <span className="text-gray-400 dark:text-gray-500 text-xs">{formatDate(expense.date)}</span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 text-sm truncate">{expense.description}</p>
                {expense.receiptUrl && (
                  <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer"
                    className="text-blue-500 dark:text-blue-400 text-xs mt-1 inline-block hover:underline">
                    📎 Beleg ansehen
                  </a>
                )}
              </div>
              <div className="text-right ml-4">
                <p className="text-red-600 dark:text-red-400 font-bold">{formatCHF(expense.amountRappen)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}