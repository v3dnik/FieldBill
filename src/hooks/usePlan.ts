import { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { PlanType, PLAN_LIMITS, PlanLimits } from '@/types/firestore';

type UsePlanReturn = {
  plan: PlanType;
  limits: PlanLimits;
  isReadOnly: boolean;
  companyId: string;
  loading: boolean;
  canCreateInvoice: boolean;
  canCreateExpense: boolean;
  canAddMember: boolean;
  canSendEmail: boolean;
  canExportSteuer: boolean;
  canExportCsv: boolean;
  invoicesThisMonth: number;
  expensesThisMonth: number;
  membersCount: number;
};

export function usePlan(): UsePlanReturn {
  const { user } = useAuth();
  const [plan, setPlan] = useState<PlanType>('free');
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [companyId, setCompanyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [invoicesThisMonth, setInvoicesThisMonth] = useState(0);
  const [expensesThisMonth, setExpensesThisMonth] = useState(0);
  const [membersCount, setMembersCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (!userSnap.exists()) return;
        const cId = userSnap.data().defaultCompanyId;
        setCompanyId(cId);

        const compSnap = await getDoc(doc(db, 'companies', cId));
        if (!compSnap.exists()) return;
        const comp = compSnap.data();

        const currentPlan: PlanType = comp.plan || 'free';
        setPlan(currentPlan);

        if (comp.planExpiresAt) {
          const expiresAt = comp.planExpiresAt.toDate();
          if (expiresAt < new Date() && currentPlan !== 'free') {
            setIsReadOnly(true);
            setPlan('free');
          }
        }

        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // Računi ta mesec
        const invoicesSnap = await getDocs(
          query(
            collection(db, 'companies', cId, 'invoices'),
            where('dateKey', '>=', `${monthKey}-01`),
            where('dateKey', '<=', `${monthKey}-31`)
          )
        );
        setInvoicesThisMonth(invoicesSnap.size);

        // Ausgaben ta mesec
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const expensesSnap = await getDocs(
          query(
            collection(db, 'companies', cId, 'expenses'),
            where('date', '>=', startOfMonth)
          )
        );
        setExpensesThisMonth(expensesSnap.size);

        // Mitarbeiter
        const membersSnap = await getDocs(
          query(
            collection(db, 'memberships'),
            where('companyId', '==', cId),
            where('active', '==', true)
          )
        );
        setMembersCount(membersSnap.size);

      } catch (err) {
        console.error('usePlan error:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user]);

  const limits = PLAN_LIMITS[plan];

  const canCreateInvoice = !isReadOnly &&
    (limits.invoicesPerMonth === null || invoicesThisMonth < limits.invoicesPerMonth);

  const canCreateExpense = !isReadOnly &&
    (limits.expensesPerMonth === null || (limits.expensesPerMonth > 0 && expensesThisMonth < limits.expensesPerMonth));

  const canAddMember = !isReadOnly && membersCount < limits.maxMembers;

  const canSendEmail = !isReadOnly && limits.emailSending;
  const canExportSteuer = !isReadOnly && limits.steuerexport;
  const canExportCsv = !isReadOnly && limits.csvExport;

  return {
    plan,
    limits,
    isReadOnly,
    companyId,
    loading,
    canCreateInvoice,
    canCreateExpense,
    canAddMember,
    canSendEmail,
    canExportSteuer,
    canExportCsv,
    invoicesThisMonth,
    expensesThisMonth,
    membersCount,
  };
}