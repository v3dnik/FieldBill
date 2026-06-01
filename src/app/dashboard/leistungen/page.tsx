'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, query, orderBy, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { ItemDoc, MembershipDoc } from '@/types/firestore';
import { formatCHF } from '@/lib/format';

export default function LeistungenPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<ItemDoc[]>([]);
  const [isBoss, setIsBoss] = useState(false);
  const [companyId, setCompanyId] = useState<string>('');
  const [showInactive, setShowInactive] = useState(false);

  const loadItems = async (cid: string) => {
    const snap = await getDocs(query(collection(db, 'companies', cid, 'items'), orderBy('name', 'asc')));
    setItems(snap.docs.map(d => ({ ...d.data(), itemId: d.id } as ItemDoc)));
  };

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (!userSnap.exists()) return;
        const cid = userSnap.data().defaultCompanyId;
        if (!cid) return;
        setCompanyId(cid);
        const membershipSnap = await getDoc(doc(db, 'memberships', `${user.uid}_${cid}`));
        if (membershipSnap.exists()) setIsBoss((membershipSnap.data() as MembershipDoc).role === 'boss');
        await loadItems(cid);
      } catch (err) { console.error(err); }
      finally { setIsLoading(false); }
    };
    load();
  }, [user]);

  const handleToggleActive = async (item: ItemDoc) => {
    if (!isBoss) return;
    await updateDoc(doc(db, 'companies', companyId, 'items', item.itemId), { active: !item.active });
    setItems(prev => prev.map(i => i.itemId === item.itemId ? { ...i, active: !i.active } : i));
  };

  const visibleItems = items.filter(item => showInactive || item.active);

  if (isLoading) return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <p className="text-gray-400">Wird geladen...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1">Leistungen</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm">Ihre Dienstleistungen für Rechnungen.</p>
        </div>
        {isBoss && (
          <Link href="/dashboard/leistungen/neu"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap">
            + Neu
          </Link>
        )}
      </div>

      {/* Filter */}
      {items.some(i => !i.active) && (
        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400 cursor-pointer">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="rounded" />
            <span>Inaktive Leistungen anzeigen</span>
          </label>
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-8 text-center">
          <div className="text-5xl mb-3">📦</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Noch keine Leistungen</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
            Fügen Sie Ihre erste Dienstleistung hinzu — z.B. &quot;Umzug pro Stunde&quot;.
          </p>
          {isBoss && (
            <Link href="/dashboard/leistungen/neu"
              className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">
              Erste Leistung hinzufügen
            </Link>
          )}
        </div>
      )}

      {/* List */}
      {visibleItems.length > 0 && (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
          {visibleItems.map((item, idx) => (
            <div key={item.itemId}
              className={`flex items-center justify-between gap-4 p-4 ${idx > 0 ? 'border-t border-gray-100 dark:border-slate-700' : ''} ${!item.active ? 'opacity-50' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base font-medium text-gray-900 dark:text-white truncate">{item.name}</h3>
                  {!item.active && (
                    <span className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 px-2 py-0.5 rounded">
                      Inaktiv
                    </span>
                  )}
                </div>
                {item.description && (
                  <p className="text-sm text-gray-500 dark:text-slate-400 truncate">{item.description}</p>
                )}
                <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
                  <span className="font-mono">{formatCHF(item.priceRappen)}</span>
                  <span className="mx-2">·</span>
                  <span>pro {item.unit}</span>
                </p>
              </div>
              {isBoss && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => handleToggleActive(item)}
                    className="text-xs text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white px-2 py-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors">
                    {item.active ? 'Deaktivieren' : 'Aktivieren'}
                  </button>
                  <Link href={`/dashboard/leistungen/${item.itemId}/bearbeiten`}
                    className="text-sm text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 px-3 py-1 hover:bg-blue-50 dark:hover:bg-slate-700 rounded transition-colors">
                    Bearbeiten
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}