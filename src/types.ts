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
  store?: string; // 店舗名 (例: 本店, 2号店, 共通など)
  granularity: Granularity;
  description: string;
  memo?: string;
  source_type: SourceType;
  confirmed: boolean;
  created_at: string;
  updated_at: string;
  attachments?: Attachment[];
}

export interface FiscalSettings {
  fiscalYearEndMonth: number; // 決算月 (1〜12, デフォルト: 3月決算なら 3)
  fiscalYearStartYear: number; // 設立年 / 第1期開始年 (例: 2024)
}

export type ExpenseTimingGroup = 
  | 'credit_card'   // 1. カードで決済しているもの
  | 'month_end'     // 2. 末にまとめて払うもの
  | 'salary'        // 3. 給与
  | 'month_start'   // 4. 月始あたりに払うもの
  | 'other';        // 5. その他

export type ExpenseCostType = 
  | 'fixed'         // 毎月支払う金額が決まっているもの（固定費）
  | 'variable';     // 毎月変わるもの（変動費）

export interface ExpenseCard {
  id: string;
  title: string;                  // 項目名（例: Google広告・サーバー代、仕入れ代金、役員報酬、店舗家賃等）
  category: string;               // 勘定科目（例: 広告宣伝費、仕入高、給料手当、地代家賃など）
  timingGroup: ExpenseTimingGroup;// 支払タイミンググループ
  costType: ExpenseCostType;      // 固定額 or 変動額
  defaultAmount?: number;         // 固定費の場合の基準金額（または前月目安）
  store?: string;                 // 店舗・拠点（全社共通、本店など）
  memo?: string;                  // メモ（例: 毎月27日引落、三井住友カード等）
}

export interface AppSettings {
  salesCategories: string[];
  expenseCategories: string[];
  paymentMethods: string[];
  stores: string[]; // 店舗リスト (例: ['全社共通', '本店', '2号店'])
  expenseCards?: ExpenseCard[]; // 経費カード一覧設定
  fiscalSettings: FiscalSettings;
}

export interface FiscalPeriod {
  periodNumber: number; // 期数 (例: 1, 2, 3...)
  label: string; // 表示用ラベル (例: "第1期 (2024/04〜2025/03)")
  key: string; // 識別キー (例: "period-1")
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  startMonth: string; // YYYY-MM
  endMonth: string; // YYYY-MM
  months: string[]; // この期に含まれる YYYY-MM の配列
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
  byStore: Record<string, number>;
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

export interface PeriodSummary {
  period: FiscalPeriod;
  sales: number;
  expenses: number;
  net: number;
  unconfirmed: number;
  count: number;
  monthlySummaries: MonthlySummary[];
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
  store?: string;
}

export interface ChatMessage {
  id: string;
  sender: TeamMember;
  text: string;
  timestamp: string;
  transactionRef?: TransactionRef;
  isSystemEvent?: boolean;
}
