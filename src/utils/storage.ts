import { Transaction, AppSettings, ExpenseCard } from '../types';

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
  '通信費',
  '水道光熱費',
  '旅費交通費',
  '広告宣伝費',
  '地代家賃',
  '役員報酬',
  '給料手当',
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
    id: 'ec-1',
    title: 'ビジネスカード決済（明細内訳）',
    timingGroup: 'credit_card',
    store: '全社共通',
    paymentMethod: 'クレジットカード',
    memo: '毎月カードで支払っている各種明細',
    subItems: [
      {
        id: 'sub-1',
        name: 'Google/SNS広告費',
        category: '広告宣伝費',
        costType: 'variable',
        defaultAmount: 50000,
        store: '全社共通',
        memo: '集客用WEB広告（変動）',
      },
      {
        id: 'sub-2',
        name: 'WEBサーバー・SaaS月額ツール（Canva・Adobe等）',
        category: '通信費',
        costType: 'fixed',
        defaultAmount: 18000,
        store: '全社共通',
        memo: 'クラウドツール定額利用料（固定）',
      },
      {
        id: 'sub-3',
        name: 'Amazon・備品消耗品カード買い出し',
        category: '消耗品費',
        costType: 'variable',
        defaultAmount: 15000,
        store: '全社共通',
        memo: '店舗資材・日用品（変動）',
      },
    ],
  },
  // 2. 末にまとめて払うもの
  {
    id: 'ec-2',
    title: '月末まとめて支払うもの（請求書払い）',
    timingGroup: 'month_end',
    store: '全社共通',
    paymentMethod: '銀行振込',
    memo: '末締め翌月末の振込一覧',
    subItems: [
      {
        id: 'sub-4',
        name: 'メイン問屋 商品仕入（買掛金）',
        category: '仕入',
        costType: 'variable',
        defaultAmount: 300000,
        store: '全社共通',
        memo: '請求書確認（変動）',
      },
      {
        id: 'sub-5',
        name: '外部委託・パートナー報酬',
        category: '外注費',
        costType: 'variable',
        defaultAmount: 80000,
        store: '全社共通',
        memo: '制作・開発パートナー振込',
      },
    ],
  },
  // 3. 給与
  {
    id: 'ec-3',
    title: '役員報酬・スタッフ給料',
    paymentMethod: '銀行振込',
    category: '給料手当',
    timingGroup: 'salary',
    costType: 'fixed',
    defaultAmount: 500000,
    store: '全社共通',
    memo: '毎月25日振込',
  },
  // 4. 月始あたりに払うもの
  {
    id: 'ec-4',
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
    id: 'ec-5',
    title: '公共料金・通信費（口座引落等）',
    timingGroup: 'other',
    store: '全社共通',
    paymentMethod: '口座振替',
    memo: '毎月の公共料金・ネット回線代',
    subItems: [
      {
        id: 'sub-6',
        name: '電気・水道・ガス代',
        category: '水道光熱費',
        costType: 'variable',
        defaultAmount: 32000,
        store: '全社共通',
        memo: '月次使用料（変動）',
      },
      {
        id: 'sub-7',
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
    const raw = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(SAMPLE_TRANSACTIONS));
      return SAMPLE_TRANSACTIONS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load transactions:', err);
    return SAMPLE_TRANSACTIONS;
  }
};

export const saveTransactions = (transactions: Transaction[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions));
  } catch (err) {
    console.error('Failed to save transactions:', err);
  }
};

export const loadSettings = (): AppSettings => {
  try {
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

    return {
      salesCategories: parsed.salesCategories || DEFAULT_SALES_CATEGORIES,
      expenseCategories: parsed.expenseCategories || DEFAULT_EXPENSE_CATEGORIES,
      paymentMethods,
      stores,
      expenseCards: parsed.expenseCards && parsed.expenseCards.length > 0 ? parsed.expenseCards : DEFAULT_EXPENSE_CARDS,
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
      expenseCards: DEFAULT_EXPENSE_CARDS,
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
