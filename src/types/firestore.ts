// ═══════════════════════════════════════════════════════
//  FieldBill - Firestore Schema Types
//  Single source of truth za vse Firestore dokumente
// ═══════════════════════════════════════════════════════

import { Timestamp } from 'firebase/firestore';

export type UserRole = 'boss' | 'employee';
export type PaymentMethod = 'bar' | 'twint' | 'karte' | 'rechnung';
export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'cancelled';
export type KundeTyp = 'firma' | 'privat';
export type PlanType = 'free' | 'pro' | 'business';

export type Address = {
  street: string;
  zip: string;
  city: string;
  country: string;
};

export type InvoiceSettings = {
  numberTemplate: string;
  nextNumber: number;
  resetYearly: boolean;
};

export type BankDetails = {
  iban: string;
  qrIban: string;
  bankName: string;
};

export type PlanLimits = {
  invoicesPerMonth: number | null;  // null = neomejeno
  expensesPerMonth: number | null;  // null = neomejeno
  maxMembers: number;
  maxKunden: number | null;         // null = neomejeno
  emailSending: boolean;
  steuerexport: boolean;
  csvExport: boolean;
  logoOnInvoices: boolean;
  watermark: boolean;
};

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    invoicesPerMonth: 3,
    expensesPerMonth: 3,
    maxMembers: 1,
    maxKunden: 3,
    emailSending: false,
    steuerexport: false,
    csvExport: false,
    logoOnInvoices: false,
    watermark: true,
  },
  pro: {
    invoicesPerMonth: 50,
    expensesPerMonth: 50,
    maxMembers: 3,
    maxKunden: null,
    emailSending: true,
    steuerexport: false,
    csvExport: false,
    logoOnInvoices: true,
    watermark: false,
  },
  business: {
    invoicesPerMonth: null,
    expensesPerMonth: null,
    maxMembers: 50,
    maxKunden: null,
    emailSending: true,
    steuerexport: true,
    csvExport: true,
    logoOnInvoices: true,
    watermark: false,
  },
};

export type UserDoc = {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  defaultCompanyId?: string;
  createdAt: Timestamp;
};

export type CompanyDoc = {
  companyId: string;
  ownerId: string;
  name: string;
  phone: string;
  contactEmail: string;
  website?: string;
  vatEnabled?: boolean;
  vatNumber?: string;
  address: Address;
  logoUrl?: string;
  logoStoragePath?: string;
  vatRate: number;
  currency: string;
  invoiceSettings: InvoiceSettings;
  bankDetails?: BankDetails;
  // ── PLAN ──
  plan: PlanType;
  planExpiresAt?: Timestamp;
  trialEndsAt?: Timestamp;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  createdAt: Timestamp;
};

export type MembershipDoc = {
  membershipId: string;
  uid: string;
  companyId: string;
  role: UserRole;
  active: boolean;
  displayName: string;
  joinedAt: Timestamp;
};

export type ItemDoc = {
  itemId: string;
  name: string;
  description?: string;
  unit: string;
  priceRappen: number;
  active: boolean;
  createdAt: Timestamp;
};

export type InvoiceLine = {
  itemId?: string;
  name: string;
  description?: string;
  unit: string;
  quantity: number;
  unitPriceRappen: number;
  totalRappen: number;
};

export type InvoiceDoc = {
  invoiceId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  createdBy: string;
  dateKey: string;
  issueDate: Timestamp;
  customerName: string;
  customerAddress?: Address;
  customerEmail?: string;
  lines: InvoiceLine[];
  subtotalRappen: number;
  vatRate: number;
  vatRappen: number;
  totalRappen: number;
  paymentMethod: PaymentMethod;
  paidAt?: Timestamp;
  notes?: string;
  pdfUrl?: string;
  createdAt: Timestamp;
};

export type InvitationDoc = {
  token: string;
  companyId: string;
  invitedBy: string;
  email?: string;
  role: UserRole;
  expiresAt: Timestamp;
  used: boolean;
  usedBy?: string;
  createdAt: Timestamp;
};

export type BalanceDoc = {
  monthKey: string;
  totalRappen: number;
  invoiceCount: number;
  byPaymentMethod: {
    bar: number;
    twint: number;
    karte: number;
    rechnung: number;
  };
  updatedAt: Timestamp;
};

export type ExpenseCategory =
  | 'Material'
  | 'Fahrzeug'
  | 'Büro'
  | 'Versicherung'
  | 'Marketing'
  | 'Personal'
  | 'Miete'
  | 'Telefon'
  | 'Zinsen & Bankgebühren'
  | 'Abschreibungen'
  | 'Sonstiges';

export type ExpenseDoc = {
  expenseId: string;
  amountRappen: number;
  date: Timestamp;
  category: ExpenseCategory;
  description: string;
  receiptUrl?: string;
  receiptStoragePath?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
};

export type KundeDoc = {
  kundeId: string;
  typ: KundeTyp;

  firmenname?: string;
  ansprechpartner?: string;
  uid?: string;

  vorname?: string;
  nachname?: string;

  email?: string;
  phone?: string;
  address?: Address;
  notizen?: string;

  rechnungenAnzahl?: number;
  rechnungenTotalRappen?: number;

  createdAt: Timestamp;
  updatedAt?: Timestamp;
};