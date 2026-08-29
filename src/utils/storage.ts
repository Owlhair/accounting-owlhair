import { Transaction, AppSettings } from '../types';

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
