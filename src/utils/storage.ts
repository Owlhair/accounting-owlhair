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
  '銀行振込',
  'クレジットカード',
  'QR決済',
  '未確定',
  'その他',
];

export const SAMPLE_TRANSACTIONS: Transaction[] = [
  // 2025年8月 月間売上 (技術売上: 850,000, 商品売上: 120,000, その他: 30,000 -> 合計 1,000,000円)
  {
    id: 'tx-202508-sales-tech',
    date_from: '2025-08-01',
    date_to: '2025-08-31',
    type: 'sales',
    category: '技術売上',
    amount: 850000,
    payment_method: '銀行振込',
    granularity: 'monthly',
    description: '2025年8月 技術売上（月まとめ）',
    memo: '月次売上集計表より',
    source_type: 'manual',
    confirmed: true,
    created_at: '2025-08-31T18:00:00.000Z',
    updated_at: '2025-08-31T18:00:00.000Z',
  },
  {
    id: 'tx-202508-sales-prod',
    date_from: '2025-08-01',
    date_to: '2025-08-31',
    type: 'sales',
    category: '商品売上',
    amount: 120000,
    payment_method: 'クレジットカード',
    granularity: 'monthly',
    description: '2025年8月 商品売上（月まとめ）',
    memo: 'POSレジ月間データ',
    source_type: 'manual',
    confirmed: true,
    created_at: '2025-08-31T18:05:00.000Z',
    updated_at: '2025-08-31T18:05:00.000Z',
  },
  {
    id: 'tx-202508-sales-other',
    date_from: '2025-08-01',
    date_to: '2025-08-31',
    type: 'sales',
    category: 'その他売上',
    amount: 30000,
    payment_method: '現金',
    granularity: 'monthly',
    description: '2025年8月 その他売上（月まとめ）',
    memo: 'ワークショップ参加費等',
    source_type: 'manual',
    confirmed: true,
    created_at: '2025-08-31T18:10:00.000Z',
    updated_at: '2025-08-31T18:10:00.000Z',
  },
  // 2025年8月 経費 (仕入: 120,000, 消耗品費: 30,000, 通信費: 15,000 -> 合計 165,000円)
  {
    id: 'tx-202508-exp-stock',
    date_from: '2025-08-01',
    date_to: '2025-08-31',
    type: 'expense',
    category: '仕入',
    amount: 120000,
    payment_method: '銀行振込',
    granularity: 'monthly',
    description: '2025年8月 商品・資材仕入',
    memo: '問屋一括請求分',
    source_type: 'manual',
    confirmed: true,
    created_at: '2025-08-31T19:00:00.000Z',
    updated_at: '2025-08-31T19:00:00.000Z',
  },
  {
    id: 'tx-202508-exp-supplies',
    date_from: '2025-08-01',
    date_to: '2025-08-31',
    type: 'expense',
    category: '消耗品費',
    amount: 30000,
    payment_method: 'クレジットカード',
    granularity: 'monthly',
    description: '2025年8月 事務備品・消耗品',
    memo: '通販まとめ買い',
    source_type: 'card',
    confirmed: true,
    created_at: '2025-08-31T19:10:00.000Z',
    updated_at: '2025-08-31T19:10:00.000Z',
  },
  {
    id: 'tx-202508-exp-comm',
    date_from: '2025-08-01',
    date_to: '2025-08-31',
    type: 'expense',
    category: '通信費',
    amount: 15000,
    payment_method: 'クレジットカード',
    granularity: 'monthly',
    description: '2025年8月 光回線・スマホ料金',
    memo: '口座振替・カード明細',
    source_type: 'card',
    confirmed: true,
    created_at: '2025-08-31T19:20:00.000Z',
    updated_at: '2025-08-31T19:20:00.000Z',
  },
  {
    id: 'tx-20250815-receipt-hc',
    date_from: '2025-08-15',
    date_to: '2025-08-15',
    type: 'expense',
    category: '消耗品費',
    amount: 12800,
    payment_method: '現金',
    granularity: 'transaction',
    description: 'ホームセンター 備品購入',
    memo: '領収書No.4820',
    source_type: 'receipt',
    confirmed: false,
    created_at: '2025-08-15T10:30:00.000Z',
    updated_at: '2025-08-15T10:30:00.000Z',
  }
];

export const loadTransactions = (): Transaction[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    if (!raw) {
      // Default to clean empty slate for real production usage
      localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify([]));
      return [];
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load transactions from localStorage:', err);
    return [];
  }
};

export const saveTransactions = (transactions: Transaction[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions));
  } catch (err) {
    console.error('Failed to save transactions to localStorage:', err);
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
      };
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(initialSettings));
      return initialSettings;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load settings:', err);
    return {
      salesCategories: DEFAULT_SALES_CATEGORIES,
      expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
      paymentMethods: DEFAULT_PAYMENT_METHODS,
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
