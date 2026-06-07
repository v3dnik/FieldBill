'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection, query, orderBy, onSnapshot,
  doc, getDoc, deleteDoc, updateDoc, Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { usePlan } from '@/hooks/usePlan';
import { ExpenseDoc, ExpenseCategory, MembershipDoc } from '@/types/firestore';

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  Material:               'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/30',
  Fahrzeug:               'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30',
  Büro:                   'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/30',
  Versicherung:           'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/30',
  Marketing:              'text-pink-600 bg-pink-50 dark:text-pink-400 dark:bg-pink-900/30',
  Personal:               'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30',
  Miete:                  'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30',
  Telefon:                'text-cyan-600 bg-cyan-50 dark:text-cyan-400 dark:bg-cyan-900/30',
  'Zinsen & Bankgebühren':'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-900/30',
  Abschreibungen:         'text-teal-600 bg-teal-50 dark:text-teal-400 dark:bg-teal-900/30',
  Sonstiges:              'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700',
};

const KATEGORIEN: ExpenseCategory[] = [
  'Material', 'Fahrzeug', 'Büro', 'Versicherung',
  'Marketing', 'Personal', 'Miete', 'Telefon',
  'Zinsen & Bankgebühren', 'Abschreibungen', 'Sonstiges'
];

function formatCHF(rappen: number) {
  return 'CHF ' + (rappen / 100).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(ts: any) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('de-CH');
}

function toDateInputValue(ts: any): string {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toISOString().split('T')[0];
}

export default function AusgabenPage() {
  const { user } = useAuth();
  const router = useRouter();
  const {
    canCreateExpense,
    expensesThisMonth,
    limits,
    isReadOnly,
    loading: planLoading,
  } = usePlan();

  const [expenses, setExpenses] = useState<ExpenseDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [isBoss, setIsBoss] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBetrag, setEditBetrag] = useState('');
  const [editDatum, setEditDatum] = useState('');
  const [editKategorie, setEditKategorie] = useState<ExpenseCategory>('Sonstiges');
  const [editBeschreibung, setEditBeschreibung] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      if (!userSnap.exists()) return;
      const cId = userSnap.data().defaultCompanyId;
      setCompanyId(cId);
      const membershipSnap = await getDoc(doc(db, 'memberships', `${user.uid}_${cId}`));
      const role = membershipSnap.exists() ? (membershipSnap.data() as MembershipDoc).role : 'employee';
      setIsBoss(role === 'boss');
      const q = query(collection(db, 'companies', cId, 'expenses'), orderBy('date', 'desc'));
      const unsub = onSnapshot(q, snap => {
        let all = snap.docs.map(d => ({ ...d.data(), expenseId: d.id } as ExpenseDoc));
        if (role !== 'boss') all = all.filter(e => (e as any).createdBy === user.uid);
        setExpenses(all);
        setLoading(false);
      });
      return unsub;
    };
    init();
  }, [user]);

  const startEdit = (expense: ExpenseDoc) => {
    setEditingId(expense.expenseId);
    setEditBetrag((expense.amountRappen / 100).toFixed(2));
    setEditDatum(toDateInputValue(expense.date));
    setEditKategorie(expense.category);
    setEditBeschreibung(expense.description);
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (expenseId: string) => {
    if (!companyId) return;
    setEditSaving(true);
    try {
      await updateDoc(doc(db, 'companies', companyId, 'expenses', expenseId), {
        amountRappen: Math.round(parseFloat(editBetrag) * 100),
        date: Timestamp.fromDate(new Date(editDatum)),
        category: editKategorie,
        description: editBeschreibung.trim(),
        updatedAt: Timestamp.now(),
      });
      setEditingId(null);
    } catch (err) { console.error(err); }
    finally { setEditSaving(false); }
  };

  const handleDelete = async (expenseId: string) => {
    if (!companyId) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'companies', companyId, 'expenses', expenseId));
      setDeleteConfirm(null);
    } catch (err) { console.error(err); }
    finally { setDeleting(false); }
  };

  const filtered = filter === 'all' ? expenses : expenses.filter(e => e.category === filter);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amountRappen, 0);
  const categories = Array.from(new Set(expenses.map(e => e.category)));

  const inputClass = "w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500";

  return (
    <div className="px-4 py-8 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ausgaben</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {isBoss ? 'Alle Ausgaben der Firma.' : 'Ihre eigenen Ausgaben.'}
          </p>
        </div>
        {canCreateExpense ? (
          <button onClick={() => router.push('/dashboard/ausgaben/neu')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors">
            + Neu
          </button>
        ) : (
          <button disabled
            title={isReadOnly ? 'Plan abgelaufen — Read-only Modus' : 'Monatliches Limit erreicht'}
            className="bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 font-medium px-4 py-2 rounded-lg cursor-not-allowed">
            + Neu
          </button>
        )}
      </div>

      {/* Plan Limit / Read-only Banner */}
      {!planLoading && !canCreateExpense && (
        <div className={`mb-6 rounded-xl p-4 border ${
          isReadOnly
            ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
        }`}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              {isReadOnly ? (
                <>
                  <p className="font-semibold text-sm text-orange-700 dark:text-orange-300">🔒 Ihr Plan ist abgelaufen</p>
                  <p className="text-sm text-orange-600 dark:text-orange-400 mt-0.5">
                    Read-only Modus — bestehende Daten sind sicher archiviert.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-sm text-red-700 dark:text-red-300">🚫 Monatliches Limit erreicht</p>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">
                    Sie haben {expensesThisMonth} von {limits.expensesPerMonth} Ausgaben diesen Monat erfasst.
                  </p>
                </>
              )}
            </div>
            <button onClick={() => router.push('/pricing')}
              className={`text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
                isReadOnly ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'
              }`}>
              {isReadOnly ? 'Plan erneuern →' : 'Plan upgraden →'}
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
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

      {/* Filter */}
      {!loading && expenses.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <button onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}>
            Alle
          </button>
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}>
              {cat}
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
            {filter === 'all' ? 'Noch keine Ausgaben erfasst.' : 'Keine Ausgaben in dieser Kategorie.'}
          </p>
          {filter === 'all' && canCreateExpense && (
            <button onClick={() => router.push('/dashboard/ausgaben/neu')}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors">
              Erste Ausgabe erfassen
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(expense => (
            <div key={expense.expenseId}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">

              {editingId === expense.expenseId ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Betrag (CHF)</label>
                      <input type="number" step="0.01" value={editBetrag}
                        onChange={e => setEditBetrag(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Datum</label>
                      <input type="date" value={editDatum}
                        onChange={e => setEditDatum(e.target.value)} className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Kategorie</label>
                    <select value={editKategorie}
                      onChange={e => setEditKategorie(e.target.value as ExpenseCategory)} className={inputClass}>
                      {KATEGORIEN.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Beschreibung</label>
                    <input type="text" value={editBeschreibung}
                      onChange={e => setEditBeschreibung(e.target.value)} className={inputClass} />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => saveEdit(expense.expenseId)} disabled={editSaving}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors">
                      {editSaving ? 'Speichern...' : 'Speichern'}
                    </button>
                    <button onClick={cancelEdit}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-white text-sm rounded-lg transition-colors">
                      Abbrechen
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[expense.category] || 'text-gray-600 bg-gray-100'}`}>
                        {expense.category}
                      </span>
                      <span className="text-gray-400 dark:text-gray-500 text-xs">{formatDate(expense.date)}</span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 text-sm truncate">{expense.description}</p>
                    {expense.receiptUrl && (
                      <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer"
                        className="text-blue-500 text-xs mt-1 inline-block hover:underline">
                        Beleg ansehen
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                    <p className="text-red-600 dark:text-red-400 font-bold text-sm">{formatCHF(expense.amountRappen)}</p>
                    <button onClick={() => startEdit(expense)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
                      ✏️
                    </button>
                    <button onClick={() => setDeleteConfirm(expense.expenseId)}
                      className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                      🗑️
                    </button>
                  </div>
                </div>
              )}

              {deleteConfirm === expense.expenseId && (
                <div className="mt-3 pt-3 border-t border-red-100 dark:border-red-900/30 flex items-center gap-3 flex-wrap">
                  <p className="text-sm text-red-600 dark:text-red-400 flex-1">Ausgabe wirklich loeschen?</p>
                  <button onClick={() => handleDelete(expense.expenseId)} disabled={deleting}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors">
                    {deleting ? '...' : 'Ja, loeschen'}
                  </button>
                  <button onClick={() => setDeleteConfirm(null)}
                    className="px-3 py-1.5 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-white text-sm rounded-lg transition-colors">
                    Abbrechen
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}