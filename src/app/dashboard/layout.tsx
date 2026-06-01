'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import Navigation from '@/components/Navigation';
import { UserDoc, MembershipDoc } from '@/types/firestore';

type DashboardContextData = {
  userDoc: UserDoc | null;
  membership: MembershipDoc | null;
  companyId: string | null;
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [data, setData] = useState<DashboardContextData>({
    userDoc: null,
    membership: null,
    companyId: null,
  });
  const [isLoadingData, setIsLoadingData] = useState(true);

  // ZAŠČITA: če neprijavljen → /login
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Naloži podatke iz Firestore
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      try {
        // 1. Uporabniški dokument
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (!userSnap.exists()) {
          setIsLoadingData(false);
          return;
        }

        const userData = userSnap.data() as UserDoc;
        const companyId = userData.defaultCompanyId;

        if (!companyId) {
          setIsLoadingData(false);
          return;
        }

        // 2. Članstvo (vsebuje role)
        const membershipId = `${user.uid}_${companyId}`;
        const membershipSnap = await getDoc(doc(db, 'memberships', membershipId));

        const membershipData = membershipSnap.exists()
          ? (membershipSnap.data() as MembershipDoc)
          : null;

        setData({
          userDoc: userData,
          membership: membershipData,
          companyId: companyId,
        });
      } catch (err) {
        console.error('Fehler beim Laden der Daten:', err);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, [user]);

  // Loading screen
  if (authLoading || isLoadingData) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <p className="text-gray-400 dark:text-slate-400">Wird geladen...</p>
      </main>
    );
  }

  // Če ni user-ja, useEffect bo preusmeril; tukaj samo null
  if (!user || !data.membership) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white">
      {/* Navigacija (sidebar desktop + bottom nav mobile) */}
      <Navigation role={data.membership.role} />

      {/* Glavni content prostor */}
      <div className="md:pl-64">
        {/* Padding-bottom za mobile bottom nav */}
        <main className="pb-20 md:pb-0">
          {children}
        </main>
      </div>
    </div>
  );
}