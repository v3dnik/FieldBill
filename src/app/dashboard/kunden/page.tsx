'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy, onSnapshot, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { KundeDoc } from '@/types/firestore';

function getDisplayName(k: KundeDoc): string {
  if (k.typ === 'firma') return k.firmenname || '—';
  return `${k.vorname || ''} ${k.nachname || ''}`.trim() || '—';
}

function getSubtitle(k: KundeDoc): string {
  if (k.typ === 'firma' && k.ansprechpartner) return k.ansprechpartner;
  if (k.email) return k.email;
  return '';
}

export default function KundenPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [kunden, setKunden] = useState<KundeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'firma' | 'privat'>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      if (!userSnap.exists()) return;
      const cId = userSnap.data().defaultCompanyId;
      setCompanyId(cId);
      const q = query(collection(db, 'companies', cId, 'kunden'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q, snap => {
        setKunden(snap.docs.map(d => ({ ...d.data(), kundeId: d.id } as KundeDoc)));
        setLoading(false);
      });
      return unsub;
    };
    init();
  }, [user]);

  const handleDelete = async (kundeId: string) => {
    if (!companyId) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'companies', companyId, 'kunden', kundeId));
      setDeleteConfirm(null);
    } catch (err) { console.error(err); }
    finally { setDeleting(false); }
  };

  const filtered = kunden
    .filter(k => filter === 'all' || k.typ === filter)
    .filter(k => {
      if (!search) return true;
      const name = getDisplayName(k).toLowerCase();
      const email = (k.email || '').toLowerCase();
      const s = search.toLowerCase();
      return name.includes(s) || email.includes(s);
    });

  return (
    <div className="px-4 py-8 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kunden</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            {kunden.length} {kunden.length === 1 ? 'Kunde' : 'Kunden'} gespeichert
          </p>
        </div>
        <button onClick={() => router.push('/dashboard/kunden/neu')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors">
          + Neu
        </button>
      </div>

      {/* Suche + Filter */}
      {kunden.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <input
            type="text"
            placeholder="Suchen nach Name oder E-Mail..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
          <div className="flex gap-2">
            {(['all', 'firma', 'privat'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}>
                {f === 'all' ? 'Alle' : f === 'firma' ? '🏢 Firma' : '👤 Privat'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Liste */}
      {loading ? (
        <div className="text-gray-400 text-center py-12">Wird geladen...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-12 text-center">
          <p className="text-4xl mb-3">{kunden.length === 0 ? '👥' : '🔍'}</p>
          <p className="text-gray-500 dark:text-gray-400">
            {kunden.length === 0 ? 'Noch keine Kunden erfasst.' : 'Keine Kunden gefunden.'}
          </p>
          {kunden.length === 0 && (
            <button onClick={() => router.push('/dashboard/kunden/neu')}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors">
              Ersten Kunden erfassen
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(kunde => (
            <div key={kunde.kundeId}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div
                  className="flex items-center gap-3 flex-1 cursor-pointer"
                  onClick={() => router.push(`/dashboard/kunden/${kunde.kundeId}`)}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${
                    kunde.typ === 'firma'
                      ? 'bg-blue-100 dark:bg-blue-900/40'
                      : 'bg-green-100 dark:bg-green-900/40'
                  }`}>
                    {kunde.typ === 'firma' ? '🏢' : '👤'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {getDisplayName(kunde)}
                    </p>
                    {getSubtitle(kunde) && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                        {getSubtitle(kunde)}
                      </p>
                    )}
                    {kunde.address?.city && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {kunde.address.zip} {kunde.address.city}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                  {/* Rechnung erstellen */}
                  <button
                    onClick={() => router.push(`/dashboard/rechnungen/neu?kundeId=${kunde.kundeId}`)}
                    className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-3 py-1.5 rounded-lg transition-colors font-medium">
                    + Rechnung
                  </button>
                  <button
                    onClick={() => router.push(`/dashboard/kunden/${kunde.kundeId}`)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
                    ✏️
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(kunde.kundeId)}
                    className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                    🗑️
                  </button>
                </div>
              </div>

              {/* Statistik */}
              {(kunde.rechnungenAnzahl || 0) > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50 flex gap-4">
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {kunde.rechnungenAnzahl} {kunde.rechnungenAnzahl === 1 ? 'Rechnung' : 'Rechnungen'}
                  </span>
                  {kunde.rechnungenTotalRappen && (
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                      CHF {(kunde.rechnungenTotalRappen / 100).toLocaleString('de-CH', { minimumFractionDigits: 2 })} total
                    </span>
                  )}
                </div>
              )}

              {/* Delete confirm */}
              {deleteConfirm === kunde.kundeId && (
                <div className="mt-3 pt-3 border-t border-red-100 dark:border-red-900/30 flex items-center gap-3 flex-wrap">
                  <p className="text-sm text-red-600 dark:text-red-400 flex-1">Kunden wirklich loeschen?</p>
                  <button onClick={() => handleDelete(kunde.kundeId)} disabled={deleting}
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