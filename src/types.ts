export type TransactionType = 'sales' | 'expense' | 'deposit' | 'withdrawal' | 'transfer' | 'other';

export type Granularity = 'transaction' | 'daily' | 'monthly' | 'period';

export type SourceType = 'manual' | 'receipt' | 'bank' | 'card' | 'import' | 'ocr' | 'ai' | 'csv';

export interface Attachment {
  id: string;
  file_name: string;
  file_type?: string;
  data_url?: string;
  source_type: SourceType;
  created_at: string;
}

export interface Transaction {
  id: string;
  date_from: string; // YYYY-MM-DD or YYYY-MM
  date_to: string;   // YYYY-MM-DD or YYYY-MM
  type: TransactionType;
  category: string;
  subcategory?: string;
  amount: number;
  payment_method: string;
  granularity: Granularity;
  description: string;
  memo?: string;
  source_type: SourceType;
  confirmed: boolean;
  created_at: string;
  updated_at: string;
  attachments?: Attachment[];
}

export interface AppSettings {
  salesCategories: string[];
  expenseCategories: string[];
  paymentMethods: string[];
}

export interface AggregationSummary {
  totalSales: number;
  totalExpenses: number;
  netBalance: number;
  unconfirmedCount: number;
  transactionCount: number;
  bySalesCategory: Record<string, number>;
  byExpenseCategory: Record<string, number>;
  byPaymentMethod: Record<string, number>;
  byGranularity: Record<Granularity, { count: number; totalSales: number; totalExpenses: number }>;
}

export interface MonthlySummary {
  month: string; // YYYY-MM
  sales: number;
  expenses: number;
  net: number;
  unconfirmed: number;
  count: number;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatarColor: string;
}

export interface TransactionRef {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  confirmed: boolean;
  date_from?: string;
}

export interface ChatMessage {
  id: string;
  sender: TeamMember;
  text: string;
  timestamp: string;
  transactionRef?: TransactionRef;
  isSystemEvent?: boolean;
}
