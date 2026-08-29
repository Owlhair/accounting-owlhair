import { Transaction, AggregationSummary, MonthlySummary, FiscalSettings, FiscalPeriod, PeriodSummary } from '../types';

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
 * Gets effective date string for sorting or period checking
 */
export const getTransactionDate = (tx: Transaction): string => {
  return tx.date_from || tx.date_to || '';
};

/**
 * Generates available fiscal periods automatically based on:
 * - fiscalYearEndMonth (決算月 1-12)
 * - fiscalYearStartYear (第1期開始年)
 * - Actual transactions in the dataset and current real-world year
 */
export const calculateFiscalPeriods = (
  transactions: Transaction[],
  settings: FiscalSettings
): FiscalPeriod[] => {
  const { fiscalYearEndMonth, fiscalYearStartYear } = settings || { fiscalYearEndMonth: 3, fiscalYearStartYear: 2024 };
  const startMonthNum = (fiscalYearEndMonth % 12) + 1; // e.g., if endMonth=3 -> startMonth=4

  // Determine latest year among actual transactions
  let maxYearInTx = fiscalYearStartYear;
  transactions.forEach(tx => {
    const d = getTransactionDate(tx);
    if (d && d.length >= 4) {
      const y = parseInt(d.substring(0, 4), 10);
      if (!isNaN(y) && y > maxYearInTx) {
        maxYearInTx = y;
      }
    }
  });

  // Calculate periods only up to the latest transaction year (or at most current year)
  const currentCalYear = 2025;
  const targetMaxYear = Math.max(maxYearInTx, currentCalYear);
  const totalPeriodsToGenerate = Math.max(1, targetMaxYear - fiscalYearStartYear + 1);

  const periods: FiscalPeriod[] = [];

  for (let pNum = 1; pNum <= totalPeriodsToGenerate; pNum++) {
    const startCalYear = fiscalYearStartYear + (pNum - 1);
    const endCalYear = startMonthNum <= fiscalYearEndMonth ? startCalYear : startCalYear + 1;

    const startMonthStr = `${startCalYear}-${String(startMonthNum).padStart(2, '0')}`;
    const endMonthStr = `${endCalYear}-${String(fiscalYearEndMonth).padStart(2, '0')}`;
    
    // Calculate last day of endMonth
    const lastDay = new Date(endCalYear, fiscalYearEndMonth, 0).getDate();
    const startDate = `${startMonthStr}-01`;
    const endDate = `${endMonthStr}-${String(lastDay).padStart(2, '0')}`;

    // Collect all 12 months belonging to this period
    const months: string[] = [];
    let curY = startCalYear;
    let curM = startMonthNum;
    for (let i = 0; i < 12; i++) {
      months.push(`${curY}-${String(curM).padStart(2, '0')}`);
      curM++;
      if (curM > 12) {
        curM = 1;
        curY++;
      }
    }

    periods.push({
      periodNumber: pNum,
      label: `第${pNum}期 (${startMonthStr.replace('-', '/')}〜${endMonthStr.replace('-', '/')})`,
      key: `period-${pNum}`,
      startDate,
      endDate,
      startMonth: startMonthStr,
      endMonth: endMonthStr,
      months,
    });
  }

  // Return sorted descending by period number (newest first)
  return periods.sort((a, b) => b.periodNumber - a.periodNumber);
};

/**
 * Checks which fiscal period a given date/month belongs to
 */
export const getFiscalPeriodForDate = (
  dateStr: string,
  periods: FiscalPeriod[]
): FiscalPeriod | undefined => {
  if (!dateStr) return undefined;
  const month = dateStr.length >= 7 ? dateStr.substring(0, 7) : '';
  return periods.find(p => p.months.includes(month));
};

/**
 * Checks if a transaction falls within a selected period or month filter
 */
export const isTransactionInFilter = (
  tx: Transaction,
  filterId: string,
  periods: FiscalPeriod[]
): boolean => {
  if (!filterId || filterId === 'ALL') return true;

  const month = getTransactionMonth(tx);
  if (month === '未設定') return false;

  if (filterId.startsWith('period-')) {
    const period = periods.find(p => p.key === filterId);
    if (!period) return true;
    return period.months.includes(month);
  }

  // Month filter (YYYY-MM)
  const monthFrom = tx.date_from ? tx.date_from.substring(0, 7) : '';
  const monthTo = tx.date_to ? tx.date_to.substring(0, 7) : '';
  return monthFrom === filterId || monthTo === filterId;
};

/**
 * Legacy support for isTransactionInMonth
 */
export const isTransactionInMonth = (tx: Transaction, selectedMonth: string): boolean => {
  if (!selectedMonth || selectedMonth === 'ALL') return true;
  const monthFrom = tx.date_from ? tx.date_from.substring(0, 7) : '';
  const monthTo = tx.date_to ? tx.date_to.substring(0, 7) : '';
  return monthFrom === selectedMonth || monthTo === selectedMonth;
};

/**
 * Calculates complete aggregation metrics dynamically from raw transactions.
 */
export const calculateSummary = (
  transactions: Transaction[],
  filterId?: string,
  periods?: FiscalPeriod[]
): AggregationSummary => {
  const filtered = filterId && filterId !== 'ALL'
    ? (periods 
        ? transactions.filter(t => isTransactionInFilter(t, filterId, periods))
        : transactions.filter(t => isTransactionInMonth(t, filterId)))
    : transactions;

  let totalSales = 0;
  let totalExpenses = 0;
  let unconfirmedCount = 0;

  const bySalesCategory: Record<string, number> = {};
  const byExpenseCategory: Record<string, number> = {};
  const byPaymentMethod: Record<string, number> = {};
  const byStore: Record<string, number> = {};
  
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

    const store = tx.store || '未設定';
    byStore[store] = (byStore[store] || 0) + amt;
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
    byStore,
    byGranularity,
  };
};

/**
 * Computes period-by-period summaries (期ごとの集計)
 */
export const calculatePeriodSummaries = (
  transactions: Transaction[],
  periods: FiscalPeriod[]
): PeriodSummary[] => {
  const monthlySummaries = calculateMonthlySummaries(transactions);
  const monthlyMap = new Map<string, MonthlySummary>();
  monthlySummaries.forEach(m => monthlyMap.set(m.month, m));

  return periods.map(period => {
    let sales = 0;
    let expenses = 0;
    let unconfirmed = 0;
    let count = 0;
    const periodMonths: MonthlySummary[] = [];

    period.months.forEach(month => {
      const mSummary = monthlyMap.get(month) || {
        month,
        sales: 0,
        expenses: 0,
        net: 0,
        unconfirmed: 0,
        count: 0,
      };
      periodMonths.push(mSummary);
      sales += mSummary.sales;
      expenses += mSummary.expenses;
      unconfirmed += mSummary.unconfirmed;
      count += mSummary.count;
    });

    return {
      period,
      sales,
      expenses,
      net: sales - expenses,
      unconfirmed,
      count,
      monthlySummaries: periodMonths,
    };
  });
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
  const monthsSet = new Set<string>();
  transactions.forEach(tx => {
    if (tx.date_from && tx.date_from.length >= 7) {
      monthsSet.add(tx.date_from.substring(0, 7));
    }
    if (tx.date_to && tx.date_to.length >= 7) {
      monthsSet.add(tx.date_to.substring(0, 7));
    }
  });
  return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
};

export const getGranularityLabel = (g: string): string => {
  switch (g) {
    case 'monthly':
      return '月まとめ';
    case 'daily':
      return '日まとめ';
    case 'period':
      return '期間まとめ';
    case 'transaction':
      return '1取引';
    default:
      return g;
  }
};

export const getSourceTypeLabel = (s: string): string => {
  switch (s) {
    case 'receipt':
      return 'レシート';
    case 'bank':
      return '銀行通帳';
    case 'card':
      return 'カード明細';
    case 'import':
    case 'csv':
      return 'CSV';
    case 'ocr':
      return '画像OCR';
    case 'ai':
      return 'AI抽出';
    case 'manual':
    default:
      return '手入力';
  }
};
