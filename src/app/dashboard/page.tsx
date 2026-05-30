'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { CompanyDoc, UserDoc, MembershipDoc } from '@/types/firestore';
import EmptyStateBanner from '@/components/EmptyStateBanner';

export default function DashboardPage() {
  const { user } = useAuth();

  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [company, setCompany] = useState<CompanyDoc | null>(null);
  const [membership, setMembership] = useState<MembershipDoc | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user) return;

      const userSnap = await getDoc(doc(db, 'users', user.uid));
      if (!userSnap.exists()) return;

      const userData = userSnap.data() as UserDoc;
      setUserDoc(userData);

      if (!userData.defaultCompanyId) return;

      const companySnap = await getDoc(doc(db, 'companies', userData.defaultCompanyId));
      if (companySnap.exists()) {
        setCompany(companySnap.data() as CompanyDoc);
      }

      const membershipId = `${user.uid}_${userData.defaultCompanyId}`;
      const membershipSnap = await getDoc(doc(db, 'memberships', membershipId));
      if (membershipSnap.exists()) {
        setMembership(membershipSnap.data() as MembershipDoc);
      }
    };

    load();
  }, [user]);

  const isBoss = membership?.role === 'boss';

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
      {/* Heading */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          Willkommen, {userDoc?.firstName || 'Benutzer'}!
        </h1>
        <p className="text-slate-400">
          {isBoss ? 'Geschäftsführer' : 'Mitarbeiter'}
          {company?.name && ` bei ${company.name}`}
        </p>
      </div>

      {/* Empty state banner — samo za bossa */}
      {isBoss && <EmptyStateBanner company={company} />}

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h3 className="text-sm text-slate-400 mb-2">Ihre Firma</h3>
          <p className="text-lg font-medium">{company?.name || '—'}</p>
          <p className="text-sm text-slate-400 mt-1">{company?.phone || '—'}</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h3 className="text-sm text-slate-400 mb-2">Ihre Rolle</h3>
          <p className="text-lg font-medium">
            {isBoss ? 'Geschäftsführer (Chef)' : 'Mitarbeiter'}
          </p>
          <p className="text-sm text-slate-400 mt-1">{userDoc?.email}</p>
        </div>
      </div>
    </div>
  );
}