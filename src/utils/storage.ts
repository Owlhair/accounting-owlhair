import { Transaction, AppSettings, ExpenseCard } from '../types';
import { DEFAULT_SALARY_EMPLOYEES, DEFAULT_SALARY_SETTINGS } from './salaryCalculator';
import persistedTransactionsData from './persisted_transactions.json';

const STORAGE_KEY_TRANSACTIONS = 'scratch_keiri_transactions_v1';
const STORAGE_KEY_SETTINGS = 'scratch_keiri_settings_v1';

export const DEFAULT_SALES_CATEGORIES = [
  '技術売上',
  '商品売上',
  'その他売上',
];

export const DEFAULT_EXPENSE_CATEGORIES = [
  '仕入',
  '消耗品費',
  '修繕費',
  '通信費',
  '水道光熱費',
  '旅費交通費',
  '広告宣伝費',
  '地代家賃',
  '役員報酬',
  '給料手当',
  '法定福利費',
  '外注費',
  '車両費',
  '租税公課',
  '支払手数料',
  'その他',
];

export const DEFAULT_PAYMENT_METHODS = [
  '現金',
  'クレジットカード',
  'QR決済',
  'ポイント',
  '銀行振込',
  '未確定',
  'その他',
];

export const DEFAULT_STORES = [
  '太宰府店',
  '本店',
  '2号店',
  '全社共通',
];

export const DEFAULT_EXPENSE_CARDS: ExpenseCard[] = [
  // 1. カードで決済しているもの（カード内で様々な品目を決済）
  {
    id: 'ec-card',
    title: 'カード',
    timingGroup: 'credit_card',
    store: '全社共通',
    paymentMethod: 'クレジットカード',
    memo: '毎月カードで支払っている各種明細',
    subItems: [
      { id: 'sub-c-1', name: '楽天モバイル', category: '通信費', costType: 'variable', defaultAmount: 6505, store: '全社共通', memo: '通信費' },
      { id: 'sub-c-2', name: '日本通信', category: '通信費', costType: 'variable', defaultAmount: 854, store: '全社共通', memo: '通信費' },
      { id: 'sub-c-3', name: 'お名前.com', category: '通信費', costType: 'variable', defaultAmount: 3751, store: '全社共通', memo: 'ドメイン・サーバー' },
      { id: 'sub-c-4', name: 'BLAST光', category: '通信費', costType: 'fixed', defaultAmount: 6944, store: '全社共通', memo: 'ネット回線' },
      { id: 'sub-c-5', name: 'ミニモ', category: '広告宣伝費', costType: 'variable', defaultAmount: 4620, store: '全社共通', memo: '集客広告' },
      { id: 'sub-c-6', name: 'NTT', category: '通信費', costType: 'fixed', defaultAmount: 8314, store: '全社共通', memo: '固定回線・電話' },
      { id: 'sub-c-7', name: '強髪', category: '仕入', costType: 'variable', defaultAmount: 11000, store: '全社共通', memo: '商品仕入' },
      { id: 'sub-c-8', name: 'AMAZON', category: '通信費', costType: 'variable', defaultAmount: 980, store: '全社共通', memo: '備品消耗品等' },
      { id: 'sub-c-9', name: '弥生会計', category: '通信費', costType: 'fixed', defaultAmount: 30580, store: '全社共通', memo: '会計ソフト' },
      { id: 'sub-c-10', name: 'JCB', category: '支払手数料', costType: 'variable', defaultAmount: 140, store: '全社共通', memo: 'カード決済手数料' },
      { id: 'sub-c-11', name: '日本通信（2）', category: '通信費', costType: 'variable', defaultAmount: 414, store: '全社共通', memo: '通信費' },
      { id: 'sub-c-12', name: '日本通信（3）', category: '通信費', costType: 'variable', defaultAmount: 392, store: '全社共通', memo: '通信費' },
      { id: 'sub-c-13', name: 'ベスト電器', category: '修繕費', costType: 'variable', defaultAmount: 3220, store: '全社共通', memo: '備品・修繕' },
      { id: 'sub-c-14', name: '九州電力', category: '水道光熱費', costType: 'variable', defaultAmount: 25535, store: '全社共通', memo: '電気代' },
      { id: 'sub-c-15', name: '九州電力（2）', category: '水道光熱費', costType: 'variable', defaultAmount: 15525, store: '全社共通', memo: '電気代' },
      { id: 'sub-c-16', name: 'B-zone', category: '仕入', costType: 'variable', defaultAmount: 1108, store: '全社共通', memo: 'ディーラー仕入' },
      { id: 'sub-c-17', name: 'ソフトバンク', category: '通信費', costType: 'variable', defaultAmount: 600, store: '全社共通', memo: '通信費' },
      { id: 'sub-c-18', name: 'ソフトバンク（2）', category: '通信費', costType: 'variable', defaultAmount: 1, store: '全社共通', memo: '通信費' },
      { id: 'sub-c-19', name: 'ソフトバンク（3）', category: '通信費', costType: 'variable', defaultAmount: 1, store: '全社共通', memo: '通信費' },
      { id: 'sub-c-20', name: 'ドコモ', category: '通信費', costType: 'variable', defaultAmount: 1, store: '全社共通', memo: '通信費' },
      { id: 'sub-c-21', name: 'ソフトバンク（4）', category: '通信費', costType: 'variable', defaultAmount: 84, store: '全社共通', memo: '通信費' }
    ],
  },
  // 2. 末にまとめて払うもの
  {
    id: 'ec-month-end',
    title: '月末まとめて支払うもの（請求書・社保・税金）',
    timingGroup: 'month_end',
    store: '全社共通',
    paymentMethod: '銀行振込',
    memo: '社会保険料・税金・買掛金など',
    subItems: [
      { id: 'sub-me-1', name: '社会保険料納付（会社負担＋本人分合算）', category: '法定福利費', costType: 'variable', defaultAmount: 57320, store: '全社共通', memo: '社保本人+会社負担分合算' },
      { id: 'sub-me-2', name: '源泉所得税・住民税（預り金納付）', category: '租税公課', costType: 'variable', defaultAmount: 3863, store: '全社共通', memo: '源泉所得税+住民税 天引き預り金納付' },
      { id: 'sub-me-3', name: '雇用保険・労働保険（会社負担分）', category: '法定福利費', costType: 'variable', defaultAmount: 978, store: '全社共通', memo: '雇用保険 会社負担分' }
    ],
  },
  // 3. 給与
  {
    id: 'ec-salary-board',
    title: '役員報酬・スタッフ給与（支給日振込）',
    paymentMethod: '銀行振込',
    category: '給料手当',
    timingGroup: 'salary',
    costType: 'fixed',
    defaultAmount: 750000,
    store: '全社共通',
    memo: '毎月25日振込 給与・役員報酬',
    subItems: [
      {
        id: 'sub-sal-exec-def',
        name: '役員報酬（定期同額給与）',
        category: '役員報酬',
        costType: 'fixed',
        defaultAmount: 500000,
        store: '全社共通',
        memo: '役員報酬',
      },
      {
        id: 'sub-sal-staff-def',
        name: 'スタッフ給料手当',
        category: '給料手当',
        costType: 'fixed',
        defaultAmount: 250000,
        store: '全社共通',
        memo: 'スタッフ給与',
      },
    ],
  },
  // 4. 月始あたりに払うもの
  {
    id: 'ec-rent',
    title: '店舗・オフィス家賃',
    paymentMethod: '口座振替',
    category: '地代家賃',
    timingGroup: 'month_start',
    costType: 'fixed',
    defaultAmount: 180000,
    store: '全社共通',
    memo: '翌月分前家賃（口座振替・月末/1日引落）',
  },
  // 5. その他
  {
    id: 'ec-util',
    title: '公共料金・通信費（口座引落等）',
    timingGroup: 'other',
    store: '全社共通',
    paymentMethod: '口座振替',
    memo: '毎月の公共料金・ネット回線代',
    subItems: [
      {
        id: 'sub-u-1',
        name: '電気・水道・ガス代',
        category: '水道光熱費',
        costType: 'variable',
        defaultAmount: 32000,
        store: '全社共通',
        memo: '月次使用料（変動）',
      },
      {
        id: 'sub-u-2',
        name: '店舗光回線・固定電話代',
        category: '通信費',
        costType: 'fixed',
        defaultAmount: 8500,
        store: '全社共通',
        memo: 'ネット月額（固定）',
      },
    ],
  },
];

export const DEFAULT_FISCAL_SETTINGS = {
  fiscalYearEndMonth: 3, // デフォルト: 3月決算 (4月1日〜翌年3月31日)
  fiscalYearStartYear: 2024, // 設立・第1期: 2024年4月スタート
};

export const SAMPLE_TRANSACTIONS: Transaction[] = [
  {
    id: `tx-202508-sales-tech-card`,
    date_from: `2025-08-01`,
    date_to: `2025-08-31`,
    type: 'sales',
    category: '技術売上',
    store: '本店',
    amount: 550000,
    payment_method: 'クレジットカード',
    granularity: 'monthly',
    description: `本店 8月技術売上 (クレジットカード)`,
    memo: 'POS月次集計',
    source_type: 'manual',
    confirmed: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: `tx-202508-sales-tech-cash`,
    date_from: `2025-08-01`,
    date_to: `2025-08-31`,
    type: 'sales',
    category: '技術売上',
    store: '本店',
    amount: 200000,
    payment_method: '現金',
    granularity: 'monthly',
    description: `本店 8月技術売上 (現金売上)`,
    memo: 'レジ締め月次合計',
    source_type: 'manual',
    confirmed: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: `tx-202508-sales-tech-qr`,
    date_from: `2025-08-01`,
    date_to: `2025-08-31`,
    type: 'sales',
    category: '技術売上',
    store: '本店',
    amount: 100000,
    payment_method: 'QR決済',
    granularity: 'monthly',
    description: `本店 8月技術売上 (PayPay/LINE Pay等)`,
    memo: 'QR決済ポータルより',
    source_type: 'manual',
    confirmed: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: `tx-202508-sales-tech-point`,
    date_from: `2025-08-01`,
    date_to: `2025-08-31`,
    type: 'sales',
    category: '技術売上',
    store: '本店',
    amount: 20000,
    payment_method: 'ポイント',
    granularity: 'monthly',
    description: `本店 8月技術売上 (ポイント利用分)`,
    memo: 'ポイント利用充当',
    source_type: 'manual',
    confirmed: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: `tx-202508-sales-prod`,
    date_from: `2025-08-01`,
    date_to: `2025-08-31`,
    type: 'sales',
    category: '商品売上',
    store: '本店',
    amount: 120000,
    payment_method: 'クレジットカード',
    granularity: 'monthly',
    description: `本店 8月商品売上（店販シャンプー等）`,
    memo: '店販POS集計',
    source_type: 'manual',
    confirmed: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: `tx-202508-sales-other`,
    date_from: `2025-08-01`,
    date_to: `2025-08-31`,
    type: 'sales',
    category: 'その他売上',
    store: '全社共通',
    amount: 30000,
    payment_method: '銀行振込',
    granularity: 'monthly',
    description: `8月その他売上（講習講師料など）`,
    memo: '',
    source_type: 'manual',
    confirmed: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: `tx-202508-exp-rent`,
    date_from: `2025-08-01`,
    date_to: `2025-08-01`,
    type: 'expense',
    category: '地代家賃',
    store: '本店',
    amount: 250000,
    payment_method: '銀行振込',
    granularity: 'monthly',
    description: `本店 8月分店舗家賃`,
    memo: '毎月自動振込',
    source_type: 'bank',
    confirmed: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: `tx-202508-exp-supplies`,
    date_from: `2025-08-10`,
    date_to: `2025-08-10`,
    type: 'expense',
    category: '仕入',
    store: '本店',
    amount: 145000,
    payment_method: 'クレジットカード',
    granularity: 'transaction',
    description: 'カラー剤・シャンプー等材料仕入',
    memo: 'ディーラー請求分',
    source_type: 'receipt',
    confirmed: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: `tx-202508-exp-util`,
    date_from: `2025-08-25`,
    date_to: `2025-08-25`,
    type: 'expense',
    category: '水道光熱費',
    store: '本店',
    amount: 48000,
    payment_method: 'クレジットカード',
    granularity: 'monthly',
    description: `本店 電気・水道代（8月分）`,
    memo: '',
    source_type: 'card',
    confirmed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const loadTransactions = (): Transaction[] => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return persistedTransactionsData as Transaction[];
    }
    const raw = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(persistedTransactionsData));
      return persistedTransactionsData as Transaction[];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      if (parsed.length === 0 && persistedTransactionsData.length > 0) {
        localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(persistedTransactionsData));
        return persistedTransactionsData as Transaction[];
      }
      if (parsed.length === 9 && parsed.every((t: any) => typeof t.id === 'string' && t.id.startsWith('tx-202508-'))) {
        localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(persistedTransactionsData));
        return persistedTransactionsData as Transaction[];
      }
      return parsed;
    }
    return persistedTransactionsData as Transaction[];
  } catch (err) {
    console.error('Failed to load transactions:', err);
    return persistedTransactionsData as Transaction[];
  }
};

export const saveTransactions = (transactions: Transaction[]): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions));
    }
  } catch (err) {
    console.error('Failed to save transactions:', err);
  }
};

export const loadSettings = (): AppSettings => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return {
        salesCategories: DEFAULT_SALES_CATEGORIES,
        expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
        paymentMethods: DEFAULT_PAYMENT_METHODS,
        stores: DEFAULT_STORES,
        closedStores: [],
        expenseCards: DEFAULT_EXPENSE_CARDS,
        salaryEmployees: DEFAULT_SALARY_EMPLOYEES,
        monthlySalarySnapshots: {},
        salarySettings: DEFAULT_SALARY_SETTINGS,
        fiscalSettings: DEFAULT_FISCAL_SETTINGS,
      };
    }
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!raw) {
      const initialSettings: AppSettings = {
        salesCategories: DEFAULT_SALES_CATEGORIES,
        expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
        paymentMethods: DEFAULT_PAYMENT_METHODS,
        stores: DEFAULT_STORES,
        fiscalSettings: DEFAULT_FISCAL_SETTINGS,
      };
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(initialSettings));
      return initialSettings;
    }
    const parsed = JSON.parse(raw);
    
    let paymentMethods = parsed.paymentMethods || DEFAULT_PAYMENT_METHODS;
    if (!paymentMethods.includes('ポイント')) {
      paymentMethods = [...paymentMethods, 'ポイント'];
    }

    let stores = parsed.stores && parsed.stores.length > 0 ? parsed.stores : DEFAULT_STORES;
    if (!stores.includes('太宰府店')) {
      stores = ['太宰府店', ...stores];
    }

    const closedStores: string[] = Array.isArray(parsed.closedStores) ? parsed.closedStores : [];

    let loadedExpenseCards: ExpenseCard[] = Array.isArray(parsed.expenseCards) && parsed.expenseCards.length > 0 
      ? parsed.expenseCards 
      : DEFAULT_EXPENSE_CARDS;

    // Ensure user's 21-item "カード" card is never lost even if localStorage had old 3-item template
    const hasFullCard = loadedExpenseCards.some((c: ExpenseCard) => (c.title === 'カード' || c.title.includes('カード')) && (c.subItems?.length || 0) >= 10);
    if (!hasFullCard) {
      const defaultCard = DEFAULT_EXPENSE_CARDS.find((c) => c.title === 'カード');
      if (defaultCard) {
        loadedExpenseCards = [defaultCard, ...loadedExpenseCards.filter((c) => c.title !== 'ビジネスカード決済（明細内訳）')];
      }
    }

    // Ensure essential timing groups (especially salary) are never missing
    const hasSalaryCard = loadedExpenseCards.some((c: ExpenseCard) => c.timingGroup === 'salary');
    if (!hasSalaryCard) {
      const defaultSalaryCard = DEFAULT_EXPENSE_CARDS.find((c) => c.timingGroup === 'salary');
      if (defaultSalaryCard) {
        loadedExpenseCards = [...loadedExpenseCards, defaultSalaryCard];
      }
    }

    let expenseCategories = parsed.expenseCategories || DEFAULT_EXPENSE_CATEGORIES;
    if (!expenseCategories.includes('修繕費')) {
      expenseCategories = [...expenseCategories, '修繕費'];
    }

    return {
      salesCategories: parsed.salesCategories || DEFAULT_SALES_CATEGORIES,
      expenseCategories,
      paymentMethods,
      stores,
      closedStores,
      expenseCards: loadedExpenseCards,
      salaryEmployees: parsed.salaryEmployees && parsed.salaryEmployees.length > 0 ? parsed.salaryEmployees : DEFAULT_SALARY_EMPLOYEES,
      monthlySalarySnapshots: parsed.monthlySalarySnapshots || {},
      salarySettings: parsed.salarySettings || DEFAULT_SALARY_SETTINGS,
      fiscalSettings: {
        fiscalYearEndMonth: parsed.fiscalSettings?.fiscalYearEndMonth ?? DEFAULT_FISCAL_SETTINGS.fiscalYearEndMonth,
        fiscalYearStartYear: parsed.fiscalSettings?.fiscalYearStartYear ?? DEFAULT_FISCAL_SETTINGS.fiscalYearStartYear,
      },
    };
  } catch (err) {
    console.error('Failed to load settings:', err);
    return {
      salesCategories: DEFAULT_SALES_CATEGORIES,
      expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
      paymentMethods: DEFAULT_PAYMENT_METHODS,
      stores: DEFAULT_STORES,
      closedStores: [],
      expenseCards: DEFAULT_EXPENSE_CARDS,
      salaryEmployees: DEFAULT_SALARY_EMPLOYEES,
      monthlySalarySnapshots: {},
      salarySettings: DEFAULT_SALARY_SETTINGS,
      fiscalSettings: DEFAULT_FISCAL_SETTINGS,
    };
  }
};

export const saveSettings = (settings: AppSettings): void => {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
};

export const resetToSampleData = (): Transaction[] => {
  localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(SAMPLE_TRANSACTIONS));
  return SAMPLE_TRANSACTIONS;
};

export const clearAllData = (): Transaction[] => {
  localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify([]));
  return [];
};
