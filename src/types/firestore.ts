// ═══════════════════════════════════════════════════════
//  FieldBill - Firestore Schema Types
//  Single source of truth za vse Firestore dokumente
// ═══════════════════════════════════════════════════════

import { Timestamp } from 'firebase/firestore';

// ───────────────────────────────────────────────────────
//  ENUMS
// ───────────────────────────────────────────────────────

export type UserRole = 'boss' | 'employee';

export type PaymentMethod = 'bar' | 'twint' | 'karte' | 'rechnung';

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'cancelled';

// ───────────────────────────────────────────────────────
//  SHARED TYPES
// ───────────────────────────────────────────────────────

export type Address = {
  street: string;
  zip: string;
  city: string;
  country: string; // ISO 3166 kratica, npr. "CH"
};

export type InvoiceSettings = {
  numberTemplate: string;   // npr. "RE-{YYYY}-{NUM4}"
  nextNumber: number;        // naslednja zaporedna številka
  resetYearly: boolean;      // ali se zaporedna številka resetira ob novem letu
};

export type BankDetails = {
  iban: string;              // klasičen IBAN (npr. "CH93...")
  qrIban: string;            // QR-IBAN za Swiss QR-Rechnung (IIDNR 30000-31999)
  bankName: string;          // ime banke (npr. "UBS Switzerland AG")
};

// ───────────────────────────────────────────────────────
//  USER DOCUMENT  →  /users/{uid}
// ───────────────────────────────────────────────────────

export type UserDoc = {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  defaultCompanyId?: string;
  createdAt: Timestamp;
};

// ───────────────────────────────────────────────────────
//  COMPANY DOCUMENT  →  /companies/{companyId}
// ───────────────────────────────────────────────────────

export type CompanyDoc = {
  companyId: string;
  ownerId: string;            // uid lastnika (boss)
  name: string;
  phone: string;
  contactEmail: string;
  website?: string;
  vatNumber?: string;         // CHE-XXX.XXX.XXX MWST
  address: Address;
  logoUrl?: string;           // public URL iz Firebase Storage
  logoStoragePath?: string;   // pot v Storage (za delete)
  vatRate: number;            // npr. 0.081 za 8.1%
  currency: string;           // "CHF"
  invoiceSettings: InvoiceSettings;
  bankDetails?: BankDetails;
  createdAt: Timestamp;
};

// ───────────────────────────────────────────────────────
//  MEMBERSHIP DOCUMENT  →  /memberships/{uid_companyId}
// ───────────────────────────────────────────────────────

export type MembershipDoc = {
  membershipId: string;
  uid: string;
  companyId: string;
  role: UserRole;
  active: boolean;
  displayName: string;
  joinedAt: Timestamp;
};

// ───────────────────────────────────────────────────────
//  ITEM DOCUMENT  →  /companies/{companyId}/items/{itemId}
// ───────────────────────────────────────────────────────

export type ItemDoc = {
  itemId: string;
  name: string;
  description?: string;
  unit: string;             // "Stunde", "km", "Pauschal", "Stück", ...
  priceRappen: number;      // cena v Rappen (1 CHF = 100 Rappen)
  active: boolean;
  createdAt: Timestamp;
};

// ───────────────────────────────────────────────────────
//  INVOICE LINE  →  vnos znotraj /invoices
// ───────────────────────────────────────────────────────

export type InvoiceLine = {
  itemId?: string;          // referenca v Leistungskatalog (opcijsko)
  name: string;
  description?: string;
  unit: string;
  quantity: number;
  unitPriceRappen: number;  // cena na enoto v Rappen
  totalRappen: number;      // quantity * unitPriceRappen
};

// ───────────────────────────────────────────────────────
//  INVOICE DOCUMENT  →  /companies/{companyId}/invoices/{invoiceId}
// ───────────────────────────────────────────────────────

export type InvoiceDoc = {
  invoiceId: string;
  invoiceNumber: string;     // npr. "RE-2026-0001"
  status: InvoiceStatus;
  createdBy: string;         // uid uporabnika, ki je ustvaril
  dateKey: string;           // "YYYY-MM-DD" v Europe/Zurich
  issueDate: Timestamp;
  customerName: string;
  customerAddress?: Address;
  customerEmail?: string;
  lines: InvoiceLine[];
  subtotalRappen: number;
  vatRate: number;           // shranjeno (zgodovinsko - lahko se spremeni)
  vatRappen: number;
  totalRappen: number;
  paymentMethod: PaymentMethod;
  paidAt?: Timestamp;
  notes?: string;
  pdfUrl?: string;           // generiran PDF v Storage
  createdAt: Timestamp;
};

// ───────────────────────────────────────────────────────
//  INVITATION DOCUMENT  →  /companies/{companyId}/invitations/{token}
// ───────────────────────────────────────────────────────

export type InvitationDoc = {
  token: string;
  companyId: string;
  invitedBy: string;         // uid boss-a
  email?: string;
  role: UserRole;
  expiresAt: Timestamp;
  used: boolean;
  usedBy?: string;           // uid uporabnika, ki je uporabil token
  createdAt: Timestamp;
};

// ───────────────────────────────────────────────────────
//  BALANCE DOCUMENT  →  /companies/{companyId}/balances/{monthKey}
// ───────────────────────────────────────────────────────

export type BalanceDoc = {
  monthKey: string;          // "YYYY-MM"
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