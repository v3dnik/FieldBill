'use client';

import { useEffect, useState } from 'react';
import { collection, query, getDocs, doc, getDoc, updateDoc, deleteDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { MembershipDoc, UserDoc } from '@/types/firestore';

interface Mitarbeiter {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'boss' | 'worker';
  active: boolean;
  createdAt: any;
}

export default function MitarbeiterPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isBoss, setIsBoss] = useState(false);
  const [companyId, setCompanyId] = useState('');
  const [mitarbeiter, setMitarbeiter] = useState<Mitarbeiter[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Neu hinzufügen state
  const [showForm, setShowForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<'boss' | 'worker'>('worker');
  const [newPassword, setNewPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const loadMitarbeiter = async (cId: string) => {
    // Lade alle Memberships für diese Company
    const membershipsSnap = await getDocs(collection(db, 'memberships'));
    const companyMemberships = membershipsSnap.docs
      .filter(d => d.data().companyId === cId)
      .map(d => d.data() as MembershipDoc);

    const list: Mitarbeiter[] = [];
    for (const m of companyMemberships) {
      const userSnap = await getDoc(doc(db, 'users', m.userId));
      if (userSnap.exists()) {
        const u = userSnap.data() as UserDoc;
        list.push({
          uid: m.userId,
          email: u.email || '',
          firstName: u.firstName || '',
          lastName: u.lastName || '',
          phone: u.phone || '',
          role: m.role,
          active: m.active !== false,
          createdAt: m.createdAt,
        });
      }
    }
    // Boss zuerst, dann alphabetisch
    list.sort((a, b) => {
      if (a.role === 'boss' && b.role !== 'boss') return -1;
      if (a.role !== 'boss' && b.role === 'boss') return 1;
      return a.firstName.localeCompare(b.firstName);
    });
    setMitarbeiter(list);
  };

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (!userSnap.exists()) return;
        const cId = userSnap.data().defaultCompanyId;
        if (!cId) return;
        setCompanyId(cId);
        const membershipSnap = await getDoc(doc(db, 'memberships', `${user.uid}_${cId}`));
        if (membershipSnap.exists()) {
          setIsBoss((membershipSnap.data() as MembershipDoc).role === 'boss');
        }
        await loadMitarbeiter(cId);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user]);

  // Toggle aktiv/inaktiv
  const handleToggleActive = async (m: Mitarbeiter) => {
    if (!isBoss || m.uid === user?.uid) return;
    try {
      await updateDoc(doc(db, 'memberships', `${m.uid}_${companyId}`), {
        active: !m.active,
      });
      setMitarbeiter(prev =>
        prev.map(p => p.uid === m.uid ? { ...p, active: !p.active } : p)
      );
      showSuccess(`${m.firstName} wurde ${!m.active ? 'aktiviert' : 'deaktiviert'}.`);
    } catch (err) {
      setError('Fehler beim Aktualisieren.');
    }
  };

  // Löschen (Membership entfernen)
  const handleDelete = async (m: Mitarbeiter) => {
    if (!isBoss || m.uid === user?.uid) return;
    try {
      await deleteDoc(doc(db, 'memberships', `${m.uid}_${companyId}`));
      setMitarbeiter(prev => prev.filter(p => p.uid !== m.uid));
      setDeleteConfirm(null);
      showSuccess(`${m.firstName} ${m.lastName} wurde entfernt.`);
    } catch (err) {
      setError('Fehler beim Entfernen.');
    }
  };

  // Neuen Mitarbeiter via Firebase Admin API hinzufügen
  // Da wir kein Backend haben, erstellen wir nur den Firestore Eintrag
  // Der Mitarbeiter muss sich selbst registrieren
  const handleAddMitarbeiter = async () => {
    setError('');
    if (!newEmail.trim()) { setError('E-Mail ist erforderlich.'); return; }
    if (!newFirstName.trim()) { setError('Vorname ist erforderlich.'); return; }
    if (!newLastName.trim()) { setError('Nachname ist erforderlich.'); return; }

    setIsSaving(true);
    try {
      // Prüfe ob User mit dieser Email bereits existiert
      const usersSnap = await getDocs(collection(db, 'users'));
      const existingUser = usersSnap.docs.find(d => d.data().email === newEmail.trim());

      if (existingUser) {
        // User existiert — füge Membership hinzu
        const existingUid = existingUser.id;
        const membershipId = `${existingUid}_${companyId}`;
        const existingMembership = await getDoc(doc(db, 'memberships', membershipId));

        if (existingMembership.exists()) {
          setError('Dieser Benutzer ist bereits Mitglied dieser Firma.');
          setIsSaving(false);
          return;
        }

        await setDoc(doc(db, 'memberships', membershipId), {
          userId: existingUid,
          companyId,
          role: newRole,
          active: true,
          createdAt: Timestamp.now(),
        });

        await loadMitarbeiter(companyId);
        resetForm();
        showSuccess('Mitarbeiter erfolgreich hinzugefügt!');
      } else {
        // User existiert nicht — zeige Hinweis
        setError(`Kein Konto mit der E-Mail "${newEmail}" gefunden. Der Mitarbeiter muss sich zuerst unter /register registrieren.`);
      }
    } catch (err: any) {
      setError('Fehler: ' + (err?.message || 'Unbekannt'));
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setNewEmail(''); setNewFirstName(''); setNewLastName('');
    setNewPhone(''); setNewRole('worker'); setNewPassword('');
  };

  const inputClass = "w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 text-sm";

  const roleLabel = (role: string) => role === 'boss' ? 'Geschäftsführer' : 'Mitarbeiter';
  const roleBadge = (role: string) => role === 'boss'
    ? 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/30'
    : 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30';

  if (isLoading) return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <p className="text-gray-400">Wird geladen...</p>
    </div>
  );

  if (!isBoss) return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-6">
        <p className="text-yellow-700 dark:text-yellow-300 font-medium">
          Nur der Geschäftsführer kann Mitarbeiter verwalten.
        </p>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mitarbeiter</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
            {mitarbeiter.length} {mitarbeiter.length === 1 ? 'Person' : 'Personen'} im Team
          </p>
        </div>
        {isBoss && !showForm && (
          <button onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
            + Hinzufügen
          </button>
        )}
      </div>

      {/* Success / Error */}
      {success && (
        <div className="mb-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 px-4 py-3 rounded-xl text-sm">
          ✓ {success}
        </div>
      )}
      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-300 px-4 py-3 rounded-xl text-sm">
          {error}
          <button onClick={() => setError('')} className="ml-2 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Hinzufügen Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Neuen Mitarbeiter hinzufügen
          </h2>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg px-4 py-3 mb-4">
            <p className="text-blue-700 dark:text-blue-300 text-sm">
              ℹ️ Der Mitarbeiter muss bereits ein FieldBill-Konto haben. Falls nicht, muss er sich zuerst unter <strong>/register</strong> registrieren.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                E-Mail <span className="text-red-500">*</span>
              </label>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                className={inputClass} placeholder="mitarbeiter@firma.ch" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Rolle <span className="text-red-500">*</span>
              </label>
              <select value={newRole} onChange={e => setNewRole(e.target.value as 'boss' | 'worker')}
                className={inputClass}>
                <option value="worker">Mitarbeiter</option>
                <option value="boss">Geschäftsführer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Vorname <span className="text-red-500">*</span>
              </label>
              <input type="text" value={newFirstName} onChange={e => setNewFirstName(e.target.value)}
                className={inputClass} placeholder="Max" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Nachname <span className="text-red-500">*</span>
              </label>
              <input type="text" value={newLastName} onChange={e => setNewLastName(e.target.value)}
                className={inputClass} placeholder="Mustermann" />
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleAddMitarbeiter} disabled={isSaving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-sm rounded-lg transition-colors">
              {isSaving ? 'Wird gespeichert...' : 'Hinzufügen'}
            </button>
            <button onClick={resetForm}
              className="px-6 py-2.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-white font-medium text-sm rounded-lg transition-colors">
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Mitarbeiter Liste */}
      {mitarbeiter.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-12 text-center">
          <p className="text-4xl mb-3">👥</p>
          <p className="text-gray-500 dark:text-slate-400">Noch keine Mitarbeiter erfasst.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
          {mitarbeiter.map((m, idx) => (
            <div key={m.uid}
              className={`p-4 ${idx > 0 ? 'border-t border-gray-100 dark:border-slate-700' : ''} ${!m.active ? 'opacity-50' : ''}`}>

              {/* Main row */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {m.firstName?.[0]?.toUpperCase() || m.email[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {m.firstName} {m.lastName}
                        {m.uid === user?.uid && (
                          <span className="text-xs text-gray-400 dark:text-slate-500 ml-1">(Sie)</span>
                        )}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleBadge(m.role)}`}>
                        {roleLabel(m.role)}
                      </span>
                      {!m.active && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                          Inaktiv
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-slate-400 truncate">{m.email}</p>
                    {m.phone && (
                      <p className="text-xs text-gray-400 dark:text-slate-500">{m.phone}</p>
                    )}
                  </div>
                </div>

                {/* Actions — nicht für sich selbst */}
                {isBoss && m.uid !== user?.uid && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => handleToggleActive(m)}
                      className="text-xs text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white px-2 py-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors">
                      {m.active ? 'Deaktivieren' : 'Aktivieren'}
                    </button>
                    <button onClick={() => setDeleteConfirm(m.uid)}
                      className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors">
                      Entfernen
                    </button>
                  </div>
                )}
              </div>

              {/* Delete confirm */}
              {deleteConfirm === m.uid && (
                <div className="mt-3 pt-3 border-t border-red-100 dark:border-red-900/30 flex items-center gap-3">
                  <p className="text-sm text-red-600 dark:text-red-400 flex-1">
                    {m.firstName} {m.lastName} wirklich entfernen?
                  </p>
                  <button onClick={() => handleDelete(m)}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors">
                    Ja, entfernen
                  </button>
                  <button onClick={() => setDeleteConfirm(null)}
                    className="px-3 py-1.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-white text-sm rounded-lg transition-colors">
                    Abbrechen
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="mt-6 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl p-4">
        <p className="text-xs text-gray-400 dark:text-slate-500 text-center">
          Geschäftsführer haben vollen Zugriff. Mitarbeiter können nur eigene Einträge erstellen.
        </p>
      </div>
    </div>
  );
}