import { Transaction, AggregationSummary, MonthlySummary } from '../types';

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('ja-JP').format(num);
};

/**
 * Extracts month key "YYYY-MM" from date_from or date_to
 */
export const getTransactionMonth = (tx: Transaction): string => {
  if (tx.date_from && tx.date_from.length >= 7) {
    return tx.date_from.substring(0, 7);
  }
  if (tx.date_to && tx.date_to.length >= 7) {
    return tx.date_to.substring(0, 7);
  }
  return '未設定';
};

/**
 * Checks if a transaction falls within the selected month (YYYY-MM) or period
 */
export const isTransactionInMonth = (tx: Transaction, selectedMonth: string): boolean => {
  if (!selectedMonth || selectedMonth === 'ALL') return true;
  const monthFrom = tx.date_from ? tx.date_from.substring(0, 7) : '';
  const monthTo = tx.date_to ? tx.date_to.substring(0, 7) : '';
  return monthFrom === selectedMonth || monthTo === selectedMonth;
};

/**
 * Checks if a transaction falls within the selected year (YYYY)
 */
export const isTransactionInYear = (tx: Transaction, selectedYear: string): boolean => {
  if (!selectedYear || selectedYear === 'ALL') return true;
  const yearFrom = tx.date_from ? tx.date_from.substring(0, 4) : '';
  const yearTo = tx.date_to ? tx.date_to.substring(0, 4) : '';
  return yearFrom === selectedYear || yearTo === selectedYear;
};

/**
 * Calculates complete aggregation metrics dynamically from raw transactions.
 * Separates raw data from calculated summaries to prevent discrepancies.
 */
export const calculateSummary = (
  transactions: Transaction[],
  filterMonth?: string
): AggregationSummary => {
  const filtered = filterMonth && filterMonth !== 'ALL'
    ? transactions.filter(t => isTransactionInMonth(t, filterMonth))
    : transactions;

  let totalSales = 0;
  let totalExpenses = 0;
  let unconfirmedCount = 0;

  const bySalesCategory: Record<string, number> = {};
  const byExpenseCategory: Record<string, number> = {};
  const byPaymentMethod: Record<string, number> = {};
  
  const byGranularity: AggregationSummary['byGranularity'] = {
    monthly: { count: 0, totalSales: 0, totalExpenses: 0 },
    daily: { count: 0, totalSales: 0, totalExpenses: 0 },
    period: { count: 0, totalSales: 0, totalExpenses: 0 },
    transaction: { count: 0, totalSales: 0, totalExpenses: 0 },
  };

  filtered.forEach(tx => {
    const amt = Number(tx.amount) || 0;
    if (!tx.confirmed) {
      unconfirmedCount += 1;
    }

    if (tx.type === 'sales') {
      totalSales += amt;
      bySalesCategory[tx.category] = (bySalesCategory[tx.category] || 0) + amt;
      if (byGranularity[tx.granularity]) {
        byGranularity[tx.granularity].totalSales += amt;
        byGranularity[tx.granularity].count += 1;
      }
    } else if (tx.type === 'expense') {
      totalExpenses += amt;
      byExpenseCategory[tx.category] = (byExpenseCategory[tx.category] || 0) + amt;
      if (byGranularity[tx.granularity]) {
        byGranularity[tx.granularity].totalExpenses += amt;
        byGranularity[tx.granularity].count += 1;
      }
    }

    const method = tx.payment_method || '未設定';
    byPaymentMethod[method] = (byPaymentMethod[method] || 0) + amt;
  });

  return {
    totalSales,
    totalExpenses,
    netBalance: totalSales - totalExpenses,
    unconfirmedCount,
    transactionCount: filtered.length,
    bySalesCategory,
    byExpenseCategory,
    byPaymentMethod,
    byGranularity,
  };
};

/**
 * Computes month-by-month historical summaries
 */
export const calculateMonthlySummaries = (transactions: Transaction[]): MonthlySummary[] => {
  const monthsMap: Record<string, MonthlySummary> = {};

  transactions.forEach(tx => {
    const month = getTransactionMonth(tx);
    if (month === '未設定') return;

    if (!monthsMap[month]) {
      monthsMap[month] = {
        month,
        sales: 0,
        expenses: 0,
        net: 0,
        unconfirmed: 0,
        count: 0,
      };
    }

    const amt = Number(tx.amount) || 0;
    monthsMap[month].count += 1;
    if (!tx.confirmed) {
      monthsMap[month].unconfirmed += 1;
    }

    if (tx.type === 'sales') {
      monthsMap[month].sales += amt;
    } else if (tx.type === 'expense') {
      monthsMap[month].expenses += amt;
    }
  });

  const list = Object.values(monthsMap).map(m => ({
    ...m,
    net: m.sales - m.expenses,
  }));

  // Sort descending by month
  return list.sort((a, b) => b.month.localeCompare(a.month));
};

/**
 * Gets all unique available months from the transaction dataset
 */
export const getAvailableMonths = (transactions: Transaction[]): string[] => {
  const months = new Set<string>();
  transactions.forEach(t => {
    const m = getTransactionMonth(t);
    if (m && m !== '未設定') months.add(m);
  });
  return Array.from(months).sort((a, b) => b.localeCompare(a));
};

/**
 * Human readable label for granularity
 */
export const getGranularityLabel = (granularity: string): string => {
  switch (granularity) {
    case 'monthly':
      return '月次集計';
    case 'daily':
      return '日別集計';
    case 'period':
      return '期間集計';
    case 'transaction':
      return '個別明細';
    default:
      return granularity;
  }
};

/**
 * Human readable label for source type
 */
export const getSourceTypeLabel = (source: string): string => {
  switch (source) {
    case 'manual':
      return '手入力';
    case 'receipt':
      return '領収書/レシート';
    case 'bank':
      return '通帳/銀行';
    case 'card':
      return 'カード明細';
    case 'ocr':
      return 'OCR読取';
    case 'ai':
      return 'AI推論';
    case 'csv':
      return 'CSV取込';
    case 'import':
      return 'インポート';
    default:
      return source;
  }
};
