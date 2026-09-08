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

export interface ExpenseCardSubItem {
  id: string;
  name: string;                  // 購入内容・品目名（例: Google広告、Canva、Adobe、AWSサーバー、事務消耗品など）
  category: string;              // 勘定科目（例: 広告宣伝費、通信費、消耗品費など）
  costType: ExpenseCostType;     // 固定費 or 変動費
  defaultAmount?: number;        // 目安・固定金額
  store?: string;                // 店舗
  memo?: string;                 // メモ
}

export interface ExpenseCard {
  id: string;
  title: string;                  // 枠名・カード名（例: ビジネスカード決済、月末買掛金支払、役員報酬、店舗家賃等）
  timingGroup: ExpenseTimingGroup;// 支払タイミンググループ
  category?: string;              // （単一アイテムの場合の勘定科目）
  costType?: ExpenseCostType;     // （単一アイテムの場合の固定・変動）
  defaultAmount?: number;         // （単一アイテムの場合の固定額）
  store?: string;                 // 店舗・拠点（全社共通、本店など）
  memo?: string;                  // メモ（例: 毎月27日引落、三井住友カード等）
  paymentMethod?: string;         // 決済方法（クレジットカード、銀行振込、口座振替など）
  subItems?: ExpenseCardSubItem[];// カード内で支払っている品目リスト（何を買ったか）
}

export interface StoreStatusInfo {
  name: string;
  isOpen: boolean; // 開店中(true) / 閉店(false)
  memo?: string;
}

// 給与・役員報酬の種別
export type SalaryEmployeeType = 'salary' | 'executive'; // 給与（給料手当） | 役員報酬

export interface SalaryAllowance {
  id: string;
  title: string;       // 手当名（役職手当、通勤手当、固定残業代など）
  amount: number;      // 金額
  isTaxable?: boolean; // 課税対象か（通勤手当の一部などは非課税だが原則課税）
}

export interface SalaryEmployee {
  id: string;
  name: string;                    // 氏名
  type: SalaryEmployeeType;        // 名目: 給与 / 役員報酬
  store: string;                   // 帰属店舗（太宰府店、本店、全社共通など）
  baseSalary: number;              // 基本給 / 報酬月額
  allowances: SalaryAllowance[];   // 各種手当
  hasSocialInsurance: boolean;     // 社会保険（健康保険・厚生年金）オン/オフ
  hasEmploymentInsurance: boolean; // 雇用保険 オン/オフ（役員は原則OFF）
  hasCareInsurance?: boolean;      // 介護保険（40歳以上65歳未満）オン/オフ
  dependentsCount: number;         // 扶養親族等の数（源泉税計算用、0人〜）
  residentTax: number;             // 住民税（毎月の特別徴収額）
  memo?: string;                   // 備考・口座情報など
  isActive: boolean;               // 在籍中（オン/オフ）
  // 手動微調整（決定通知書の確定金額で上書きしたい場合）
  customOverrides?: {
    healthInsurance?: number;      // 健保本人負担
    welfarePension?: number;       // 厚年本人負担
    employmentInsurance?: number;  // 雇用保険本人負担
    incomeTax?: number;            // 源泉所得税
  };
}

export interface SalarySettings {
  payDay: number;                  // 給与支給日（例: 25日）
  monthEndPayDay: number;          // 月末支払日（例: 月末=0 または 翌月末等）
  // 料率設定（標準プリセットあり）
  healthInsuranceRate: number;     // 健保折半率（例: 0.05 = 5.0%）
  careInsuranceRate: number;       // 介護折半率（例: 0.008 = 0.8%）
  pensionRate: number;             // 厚年折半率（例: 0.0915 = 9.15%）
  empInsuranceEmployeeRate: number;// 雇用保険本人負担率（例: 0.006 = 0.6%）
  empInsuranceCompanyRate: number; // 雇用保険会社負担率（例: 0.0095 = 0.95%）
  childContributionRate: number;   // 子ども子育て拠出金率（例: 0.0036 = 0.36%）
}

export interface SalaryCalculationResult {
  employee: SalaryEmployee;
  totalBase: number;               // 基本給
  totalAllowances: number;         // 手当計
  grossSalary: number;             // 総支給額 (額面)
  
  // 本人控除項目
  healthInsurance: number;         // 健康保険料（本人分）
  careInsurance: number;           // 介護保険料（本人分）
  welfarePension: number;          // 厚生年金保険料（本人分）
  socialInsuranceTotal: number;    // 社会保険料本人負担合計 (健保+介護+厚年)
  employmentInsurance: number;     // 雇用保険料（本人分）
  taxableAmount: number;           // 課税対象額
  incomeTax: number;               // 源泉所得税
  residentTax: number;             // 住民税
  totalDeductions: number;         // 控除合計額
  netSalary: number;               // 差引支給額 (手取り振込額)
  
  // 会社負担分 (法定福利費)
  companyHealthInsurance: number;  // 健保（会社負担）
  companyCareInsurance: number;    // 介護（会社負担）
  companyWelfarePension: number;   // 厚年（会社負担）
  companyChildContribution: number;// 子ども・子育て拠出金（会社全額負担）
  companySocialInsuranceTotal: number; // 社保会社負担計
  companyEmploymentInsurance: number;  // 雇用保険会社負担
  companyTotalStatutoryWelfare: number;// 会社負担法定福利費計
  
  // 総人件費
  totalCompanyCost: number;        // 会社の総人件費 (総支給額 + 法定福利費会社負担)
  
  // 月末にまとめて納付する金額（本人分預り金 + 会社負担分）
  monthEndPaymentTotal: number;    // (社保本人+社保会社) + 雇用保険会社 + 源泉税 + 住民税
}

export interface AppSettings {
  salesCategories: string[];
  expenseCategories: string[];
  paymentMethods: string[];
  stores: string[]; // 店舗リスト (例: ['全社共通', '本店', '2号店'])
  closedStores?: string[]; // 閉店・休業中の店舗リスト (オンオフのオフ)
  expenseCards?: ExpenseCard[]; // 経費カード一覧設定
  salaryEmployees?: SalaryEmployee[]; // 給与・役員報酬 メンバー設定
  salarySettings?: SalarySettings;     // 給与計算・料率設定
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
