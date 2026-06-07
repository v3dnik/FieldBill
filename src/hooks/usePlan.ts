import { useState, useEffect } from 'react';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
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
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Vse račune naložimo in filtriramo v JS
        const invoicesSnap = await getDocs(collection(db, 'companies', cId, 'invoices'));
        const invoiceCount = invoicesSnap.docs.filter(d => {
          const dateKey = d.data().dateKey as string;
          if (!dateKey) return false;
          const [year, month] = dateKey.split('-').map(Number);
          return year === currentYear && month === currentMonth + 1;
        }).length;
        setInvoicesThisMonth(invoiceCount);

        // Vse ausgaben naložimo in filtriramo v JS
        const expensesSnap = await getDocs(collection(db, 'companies', cId, 'expenses'));
        const expenseCount = expensesSnap.docs.filter(d => {
          const date = d.data().date?.toDate?.();
          if (!date) return false;
          return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        }).length;
        setExpensesThisMonth(expenseCount);

        // Mitarbeiter
        const membersSnap = await getDocs(collection(db, 'memberships'));
        const memberCount = membersSnap.docs.filter(d => {
          const data = d.data();
          return data.companyId === cId && data.active === true;
        }).length;
        setMembersCount(memberCount);

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
    plan, limits, isReadOnly, companyId, loading,
    canCreateInvoice, canCreateExpense, canAddMember,
    canSendEmail, canExportSteuer, canExportCsv,
    invoicesThisMonth, expensesThisMonth, membersCount,
  };
}