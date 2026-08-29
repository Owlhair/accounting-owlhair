import React, { useState, useMemo } from 'react';
import { Transaction, AppSettings, FiscalPeriod } from '../types';
import { formatCurrency, formatNumber } from '../utils/calculations';
import { StoreCardEditorModal } from './StoreCardEditorModal';
import { 
  Store, 
  Calendar, 
  Plus, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Building2, 
  CreditCard, 
  Coins, 
  QrCode, 
  Building, 
  Gift, 
  TrendingUp, 
  BarChart3, 
  Layers, 
  ArrowRight,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  PieChart,
  FileSpreadsheet
} from 'lucide-react';

interface StoreSalesCardBoardProps {
  transactions: Transaction[];
  settings: AppSettings;
  fiscalPeriods: FiscalPeriod[];
  selectedFilter: string;
  onSelectFilter: (filterId: string) => void;
  onOpenFiscalSettings: () => void;
  onSaveStoreCard: (
    month: string,
    store: string,
    breakdown: Record<string, number>,
    memo?: string
  ) => void;
  onDeleteStoreCard?: (month: string, store: string) => void;
}

export const StoreSalesCardBoard: React.FC<StoreSalesCardBoardProps> = ({
  transactions,
  settings,
  fiscalPeriods,
  selectedFilter,
  onSelectFilter,
  onOpenFiscalSettings,
  onSaveStoreCard,
  onDeleteStoreCard,
}) => {
  // Current active fiscal period
  const currentPeriod = useMemo(() => {
    if (selectedFilter.startsWith('period-')) {
      return fiscalPeriods.find(p => p.key === selectedFilter) || fiscalPeriods[0];
    }
    return fiscalPeriods[0] || {
      periodNumber: 1,
      label: '第1期',
      key: 'period-1',
      startDate: '2024-04-01',
      endDate: '2025-03-31',
      startMonth: '2024-04',
      endMonth: '2025-03',
      months: ['2024-04', '2024-05', '2024-06', '2024-07', '2024-08', '2024-09', '2024-10', '2024-11', '2024-12', '2025-01', '2025-02', '2025-03'],
    };
  }, [fiscalPeriods, selectedFilter]);

  // Selected Month within current period
  const [activeMonth, setActiveMonth] = useState<string>(() => {
    if (currentPeriod?.months?.length > 0) {
      // Find month with most recent transactions, or default to first month
      const monthWithTx = currentPeriod.months.find(m => 
        transactions.some(t => t.type === 'sales' && ((t.date_from && t.date_from.startsWith(m)) || (t.date_to && t.date_to.startsWith(m))))
      );
      return monthWithTx || currentPeriod.months[0];
    }
    return '2025-05';
  });

  // Keep active month in sync when period changes
  React.useEffect(() => {
    if (currentPeriod?.months?.length > 0 && !currentPeriod.months.includes(activeMonth)) {
      setActiveMonth(currentPeriod.months[0]);
    }
  }, [currentPeriod, activeMonth]);

  // View Mode: 'cards' | 'matrix' | 'comparison'
  const [viewMode, setViewMode] = useState<'cards' | 'matrix' | 'comparison'>('cards');

  // Modal State for editing a store card
  const [modalStore, setModalStore] = useState<string | null>(null);

  // List of stores
  const storeList = settings.stores && settings.stores.length > 0 ? settings.stores : ['太宰府店', '本店', '2号店', '全社共通'];
  const paymentMethodsList = settings.paymentMethods || ['現金', 'クレジットカード', 'QR決済', '銀行振込', 'ポイント', 'その他'];

  // Calculate store card data for the active month
  const currentMonthCards = useMemo(() => {
    const cards = storeList.map(storeName => {
      // Find sales transactions matching this store & month
      const storeTx = transactions.filter(t => {
        const txMonth = (t.date_from || t.date_to || '').substring(0, 7);
        const txStore = t.store || '全社共通';
        return t.type === 'sales' && txStore === storeName && txMonth === activeMonth;
      });

      const breakdown: Record<string, number> = {
        '現金': 0,
        'クレジットカード': 0,
        'QR決済': 0,
        '銀行振込': 0,
        'ポイント': 0,
        'その他': 0,
      };

      let total = 0;
      let memo = '';

      storeTx.forEach(t => {
        const m = t.payment_method || 'その他';
        const amt = Number(t.amount) || 0;
        breakdown[m] = (breakdown[m] || 0) + amt;
        total += amt;
        if (t.memo && !memo) memo = t.memo;
      });

      const isFilled = storeTx.length > 0 && total > 0;
      const cashAmt = breakdown['現金'] || 0;
      const cashlessAmt = total - cashAmt;
      const cashlessPercent = total > 0 ? Math.round((cashlessAmt / total) * 100) : 0;

      return {
        store: storeName,
        month: activeMonth,
        breakdown,
        total,
        isFilled,
        txCount: storeTx.length,
        cashAmt,
        cashlessAmt,
        cashlessPercent,
        memo,
      };
    });

    // Company Total Card (全社合計)
    const companyBreakdown: Record<string, number> = {
      '現金': 0,
      'クレジットカード': 0,
      'QR決済': 0,
      '銀行振込': 0,
      'ポイント': 0,
      'その他': 0,
    };
    let companyTotal = 0;

    cards.forEach(c => {
      Object.entries(c.breakdown).forEach(([m, amt]) => {
        const numAmt = Number(amt) || 0;
        companyBreakdown[m] = (companyBreakdown[m] || 0) + numAmt;
      });
      companyTotal += c.total;
    });

    const filledCount = cards.filter(c => c.isFilled).length;
    const totalStores = cards.length;
    const isAllFilled = filledCount === totalStores && totalStores > 0;

    const companyCash = companyBreakdown['現金'] || 0;
    const companyCashless = companyTotal - companyCash;
    const companyCashlessPercent = companyTotal > 0 ? Math.round((companyCashless / companyTotal) * 100) : 0;

    return {
      cards,
      companyCard: {
        month: activeMonth,
        breakdown: companyBreakdown,
        total: companyTotal,
        cashAmt: companyCash,
        cashlessAmt: companyCashless,
        cashlessPercent: companyCashlessPercent,
        filledCount,
        totalStores,
        isAllFilled,
      },
      filledCount,
      totalStores,
    };
  }, [transactions, storeList, activeMonth]);

  // Calculate 12-Month Matrix Data for current period
  const matrixData = useMemo(() => {
    if (!currentPeriod || !currentPeriod.months) return { rows: [], monthTotals: {}, grandTotal: 0 };

    const monthTotals: Record<string, number> = {};
    currentPeriod.months.forEach(m => {
      monthTotals[m] = 0;
    });

    const rows = storeList.map(storeName => {
      const monthAmounts: Record<string, { total: number; isFilled: boolean; cash: number; cashless: number }> = {};
      let storeAnnualTotal = 0;

      currentPeriod.months.forEach(m => {
        const txs = transactions.filter(t => {
          const txM = (t.date_from || t.date_to || '').substring(0, 7);
          const txStore = t.store || '全社共通';
          return t.type === 'sales' && txStore === storeName && txM === m;
        });

        let mTotal = 0;
        let mCash = 0;
        txs.forEach(t => {
          const amt = Number(t.amount) || 0;
          mTotal += amt;
          if (t.payment_method === '現金') mCash += amt;
        });

        monthAmounts[m] = {
          total: mTotal,
          isFilled: txs.length > 0 && mTotal > 0,
          cash: mCash,
          cashless: mTotal - mCash,
        };

        storeAnnualTotal += mTotal;
        monthTotals[m] = (monthTotals[m] || 0) + mTotal;
      });

      return {
        store: storeName,
        monthAmounts,
        annualTotal: storeAnnualTotal,
      };
    });

    const grandTotal = Object.values(monthTotals).reduce((a, b) => a + b, 0);

    return {
      rows,
      monthTotals,
      grandTotal,
    };
  }, [transactions, storeList, currentPeriod]);

  // Helper for formatted month label (e.g. "2025年 5月")
  const formatMonthText = (mStr: string) => {
    const [y, m] = mStr.split('-');
    return `${y}年 ${parseInt(m, 10)}月`;
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case '現金':
        return <Coins className="w-3.5 h-3.5 text-amber-600" />;
      case 'クレジットカード':
        return <CreditCard className="w-3.5 h-3.5 text-indigo-600" />;
      case 'QR決済':
        return <QrCode className="w-3.5 h-3.5 text-emerald-600" />;
      case '銀行振込':
        return <Building className="w-3.5 h-3.5 text-blue-600" />;
      case 'ポイント':
        return <Gift className="w-3.5 h-3.5 text-rose-500" />;
      default:
        return <Coins className="w-3.5 h-3.5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header Card: Title & Fiscal Period Selector */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">
                  店舗・月別 売上カードボード
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-black bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                  カード入力方式
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium">
                各店舗のカードを埋めると全社合計カードが自動生成され、12ヶ月の推移・比較が完了します
              </p>
            </div>
          </div>
        </div>

        {/* Fiscal Period Switcher & View Switcher */}
        <div className="flex items-center flex-wrap gap-2 w-full md:w-auto justify-between md:justify-end">
          {/* Period Selector */}
          <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-xl border border-gray-200">
            <Calendar className="w-3.5 h-3.5 text-gray-500 ml-1.5" />
            <select
              value={selectedFilter.startsWith('period-') ? selectedFilter : fiscalPeriods[0]?.key || 'period-1'}
              onChange={(e) => onSelectFilter(e.target.value)}
              className="text-xs font-bold bg-transparent text-gray-800 focus:outline-hidden pr-2 py-1 cursor-pointer"
            >
              {fiscalPeriods.map(p => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Buttons */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                viewMode === 'cards'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              月別カード
            </button>
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                viewMode === 'matrix'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
              12ヶ月マトリクス
            </button>
            <button
              type="button"
              onClick={() => setViewMode('comparison')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                viewMode === 'comparison'
                  ? 'bg-white text-amber-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <PieChart className="w-3.5 h-3.5 text-amber-600" />
              店舗別比較・シェア
            </button>
          </div>
        </div>
      </div>

      {/* 12-Month Selector Pill Strip (Progress Tracker) */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-gray-200/80 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-gray-700 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            {currentPeriod.label} 月別進捗ミニマップ (対象月を選択):
          </span>
          <span className="text-[11px] text-gray-500 font-medium">
            緑 = 全店舗入力完了 / 黄 = 一部入力 / 灰 = 未入力
          </span>
        </div>

        {/* 12 Month Pills */}
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5">
          {currentPeriod.months.map(m => {
            const [y, monthNum] = m.split('-');
            const monthTotal = matrixData.monthTotals[m] || 0;
            
            // Check status of stores for this month
            const filledCount = storeList.filter(st => {
              const txs = transactions.filter(t => {
                const txM = (t.date_from || t.date_to || '').substring(0, 7);
                const txStore = t.store || '全社共通';
                return t.type === 'sales' && txStore === st && txM === m;
              });
              return txs.length > 0;
            }).length;

            const isSelected = activeMonth === m;
            const isFull = filledCount === storeList.length && storeList.length > 0;
            const isPartial = filledCount > 0 && !isFull;

            return (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setActiveMonth(m);
                  if (viewMode !== 'cards') setViewMode('cards');
                }}
                className={`py-2 px-1.5 rounded-xl text-center transition-all flex flex-col items-center justify-center border relative ${
                  isSelected
                    ? 'ring-2 ring-emerald-500 bg-emerald-50/90 border-emerald-500 shadow-xs'
                    : isFull
                    ? 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-100/50'
                    : isPartial
                    ? 'bg-amber-50/50 border-amber-200 hover:bg-amber-100/50'
                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                }`}
              >
                <span className={`text-xs font-black font-mono ${isSelected ? 'text-emerald-950' : 'text-gray-800'}`}>
                  {parseInt(monthNum, 10)}月
                </span>
                
                <span className="text-[10px] font-bold font-mono text-gray-500">
                  {monthTotal > 0 ? `¥${Math.round(monthTotal / 10000)}万` : '-'}
                </span>

                <div className="flex items-center gap-0.5 mt-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    isFull ? 'bg-emerald-500' : isPartial ? 'bg-amber-500' : 'bg-gray-300'
                  }`} />
                  <span className="text-[9px] font-mono text-gray-400">
                    {filledCount}/{storeList.length}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODE 1: MONTHLY CARD VIEW (店舗×月 カードボード)          */}
      {/* ========================================================= */}
      {viewMode === 'cards' && (
        <div className="space-y-5">
          
          {/* Active Month Progress & Quick Action Bar */}
          <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-black font-mono">
                  {formatMonthText(activeMonth)}度
                </span>
                <h2 className="text-lg font-black tracking-tight text-white">
                  売上カード進捗状況
                </h2>
              </div>
              <p className="text-xs text-emerald-100/80 mt-1">
                入力完了: <span className="font-bold text-white font-mono">{currentMonthCards.filledCount}</span> / {currentMonthCards.totalStores} 店舗 
                {currentMonthCards.filledCount === currentMonthCards.totalStores ? ' (🎉 全店舗のカードが完成しました！)' : ` (残り ${currentMonthCards.totalStores - currentMonthCards.filledCount} 店舗が未入力)`}
              </p>
            </div>

            {/* Quick Fill Unfilled Card Button */}
            <div className="flex items-center gap-2">
              {currentMonthCards.cards.find(c => !c.isFilled) ? (
                <button
                  type="button"
                  onClick={() => {
                    const firstEmpty = currentMonthCards.cards.find(c => !c.isFilled);
                    if (firstEmpty) setModalStore(firstEmpty.store);
                  }}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 text-xs font-black rounded-xl shadow-md transition-transform active:scale-95 flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-emerald-900" />
                  <span>未入力カードを埋める ({currentMonthCards.cards.find(c => !c.isFilled)?.store})</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-emerald-300 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{formatMonthText(activeMonth)} 完了済</span>
                </div>
              )}
            </div>
          </div>

          {/* Cards Grid: Company Total Card + Individual Store Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            
            {/* 1. COMPANY TOTAL CARD (全社合計カード) */}
            <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white rounded-3xl p-5 border border-indigo-700/50 shadow-md flex flex-col justify-between relative overflow-hidden group">
              {/* Subtle background glow accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
              
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-indigo-800/80">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-xs">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">
                        全社合計カード
                      </h3>
                      <span className="text-[10px] text-indigo-300 font-bold font-mono">
                        {formatMonthText(activeMonth)}度 全店舗合算
                      </span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                    currentMonthCards.companyCard.isAllFilled
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                  }`}>
                    {currentMonthCards.companyCard.filledCount}/{currentMonthCards.companyCard.totalStores} 店舗合算
                  </span>
                </div>

                {/* Breakdown rows */}
                <div className="py-3.5 space-y-2 text-xs">
                  {paymentMethodsList.map(method => {
                    const amt = currentMonthCards.companyCard.breakdown[method] || 0;
                    const percent = currentMonthCards.companyCard.total > 0
                      ? Math.round((amt / currentMonthCards.companyCard.total) * 100)
                      : 0;

                    return (
                      <div key={method} className="flex items-center justify-between py-1 border-b border-indigo-900/40">
                        <div className="flex items-center gap-2 text-indigo-200">
                          {getMethodIcon(method)}
                          <span className="font-bold text-xs">{method}</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="font-bold text-white text-xs">
                            {formatCurrency(amt)}
                          </span>
                          <span className="text-[10px] text-indigo-400 w-8 text-right font-medium">
                            {amt > 0 ? `${percent}%` : '-'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Company Card Footer / Total */}
              <div className="pt-3 border-t border-indigo-800/80">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-black text-indigo-300 uppercase">
                    全社 月売上合計:
                  </span>
                  <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400 tracking-tight">
                    {formatCurrency(currentMonthCards.companyCard.total)}
                  </span>
                </div>
                {currentMonthCards.companyCard.total > 0 && (
                  <div className="mt-2 text-[11px] text-indigo-300 flex items-center justify-between bg-indigo-900/50 p-2 rounded-xl border border-indigo-800/60 font-medium">
                    <span>キャッシュレス比率:</span>
                    <span className="font-bold font-mono text-white">
                      {currentMonthCards.companyCard.cashlessPercent}% ({formatCurrency(currentMonthCards.companyCard.cashlessAmt)})
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. INDIVIDUAL STORE CARDS (太宰府店, 本店, 2号店...) */}
            {currentMonthCards.cards.map(card => {
              return (
                <div
                  key={card.store}
                  className={`rounded-3xl p-5 border transition-all flex flex-col justify-between ${
                    card.isFilled
                      ? 'bg-white border-gray-200 shadow-xs hover:shadow-md'
                      : 'bg-amber-50/20 border-dashed border-2 border-amber-300 hover:border-amber-400 hover:bg-amber-50/40 shadow-2xs'
                  }`}
                >
                  <div>
                    {/* Store Card Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-2xs ${
                          card.isFilled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          <Store className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-gray-900">
                            {card.store}
                          </h3>
                          <span className="text-[10px] text-gray-400 font-bold font-mono">
                            {formatMonthText(activeMonth)}
                          </span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      {card.isFilled ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          入力済
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          未入力
                        </span>
                      )}
                    </div>

                    {/* Breakdown Matrix or Empty State */}
                    {card.isFilled ? (
                      <div className="py-3.5 space-y-1.5 text-xs">
                        {paymentMethodsList.map(method => {
                          const amt = card.breakdown[method] || 0;
                          return (
                            <div
                              key={method}
                              className={`flex items-center justify-between py-1 px-1.5 rounded-lg ${
                                amt > 0 ? 'bg-gray-50/80 font-bold' : 'text-gray-400'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {getMethodIcon(method)}
                                <span className={amt > 0 ? 'text-gray-800' : 'text-gray-400 font-medium'}>
                                  {method}
                                </span>
                              </div>
                              <span className={`font-mono ${amt > 0 ? 'text-gray-900 font-bold' : 'text-gray-400'}`}>
                                {amt > 0 ? formatCurrency(amt) : '—'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Empty Puzzle Card View */
                      <div className="py-6 flex flex-col items-center justify-center text-center space-y-2">
                        <div className="w-12 h-12 rounded-2xl bg-amber-100/70 text-amber-700 flex items-center justify-center shadow-2xs border border-amber-200/80">
                          <Sparkles className="w-6 h-6" />
                        </div>
                        <div className="text-xs font-bold text-gray-800">
                          {card.store} のカードはまだ空です
                        </div>
                        <p className="text-[11px] text-gray-500 max-w-[200px]">
                          レジ締めや月次売上の数字を入力してパズルを埋めましょう
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom / Action */}
                  <div className="pt-3 border-t border-gray-100">
                    {card.isFilled ? (
                      <div className="space-y-3">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs font-bold text-gray-600">
                            月売上合計:
                          </span>
                          <span className="text-lg font-black font-mono text-emerald-700">
                            {formatCurrency(card.total)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setModalStore(card.store)}
                            className="flex-1 py-1.5 px-3 bg-gray-100 hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 text-xs font-bold rounded-xl border border-gray-200 transition-colors flex items-center justify-center gap-1"
                          >
                            <span>✏️ 金額を編集・確認</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setModalStore(card.store)}
                        className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-xs transition-transform active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>このカードを入力する</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODE 2: 12-MONTH MATRIX VIEW (12ヶ月マトリクス表)          */}
      {/* ========================================================= */}
      {viewMode === 'matrix' && (
        <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-sm font-black text-gray-900">
                12ヶ月 店舗別 売上マトリクス
              </h2>
              <p className="text-xs text-gray-500">
                {currentPeriod.label} 全店舗の月別売上推移と年間累計
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500 font-bold block">年間総合計</span>
              <span className="text-lg font-black font-mono text-emerald-700">
                {formatCurrency(matrixData.grandTotal)}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-bold">
                  <th className="py-2.5 px-3 sticky left-0 bg-gray-50/95 z-10">店舗名</th>
                  {currentPeriod.months.map(m => (
                    <th key={m} className="py-2.5 px-3 text-right font-mono min-w-[90px]">
                      {parseInt(m.split('-')[1], 10)}月
                    </th>
                  ))}
                  <th className="py-2.5 px-3 text-right font-mono bg-indigo-50/50 text-indigo-950 font-black min-w-[110px]">
                    年間合計
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {matrixData.rows.map(row => (
                  <tr key={row.store} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3 px-3 font-bold text-gray-900 sticky left-0 bg-white shadow-2xs z-10 flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{row.store}</span>
                    </td>
                    {currentPeriod.months.map(m => {
                      const data = row.monthAmounts[m];
                      return (
                        <td
                          key={m}
                          onClick={() => {
                            setActiveMonth(m);
                            setModalStore(row.store);
                          }}
                          className="py-3 px-3 text-right font-mono cursor-pointer hover:bg-emerald-50/50 transition-colors group"
                        >
                          {data && data.isFilled ? (
                            <span className="font-bold text-gray-900 group-hover:text-emerald-700">
                              {formatCurrency(data.total)}
                            </span>
                          ) : (
                            <span className="text-gray-300 font-medium group-hover:text-emerald-600">
                              + 未入力
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-3 px-3 text-right font-mono font-black text-indigo-900 bg-indigo-50/20">
                      {formatCurrency(row.annualTotal)}
                    </td>
                  </tr>
                ))}

                {/* Company Month Total Row */}
                <tr className="bg-gray-100/70 font-black text-gray-900 border-t-2 border-gray-300">
                  <td className="py-3 px-3 sticky left-0 bg-gray-100 z-10 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>全社月次合計</span>
                  </td>
                  {currentPeriod.months.map(m => (
                    <td key={m} className="py-3 px-3 text-right font-mono text-emerald-800">
                      {formatCurrency(matrixData.monthTotals[m] || 0)}
                    </td>
                  ))}
                  <td className="py-3 px-3 text-right font-mono text-indigo-950 bg-indigo-100/80 font-black text-sm">
                    {formatCurrency(matrixData.grandTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODE 3: COMPARISON & SHARE VIEW (店舗別比較・推移)         */}
      {/* ========================================================= */}
      {viewMode === 'comparison' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Store Annual Share Breakdown */}
          <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <PieChart className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-black text-gray-900">
                店舗別 売上シェア (年間累計)
              </h3>
            </div>

            <div className="space-y-3">
              {matrixData.rows.map(row => {
                const percent = matrixData.grandTotal > 0
                  ? Math.round((row.annualTotal / matrixData.grandTotal) * 100)
                  : 0;

                return (
                  <div key={row.store} className="space-y-1.5 p-3 rounded-2xl bg-gray-50 border border-gray-150">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-black text-gray-900 flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-emerald-600" />
                        {row.store}
                      </span>
                      <div className="font-mono font-black">
                        <span>{formatCurrency(row.annualTotal)}</span>
                        <span className="text-emerald-700 ml-2">({percent}%)</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Monthly Trend Bars */}
          <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-black text-gray-900">
                全社 月別売上推移グラフ
              </h3>
            </div>

            {/* Bar Chart Visualization */}
            <div className="space-y-2 pt-2">
              {currentPeriod.months.map(m => {
                const total = matrixData.monthTotals[m] || 0;
                const totalsList: number[] = Object.values(matrixData.monthTotals).map(v => Number(v) || 0);
                const maxMonth = Math.max(...totalsList, 1);
                const percent = Math.round((total / maxMonth) * 100);

                return (
                  <div key={m} className="flex items-center gap-2 text-xs">
                    <span className="w-12 font-mono font-bold text-gray-600 shrink-0">
                      {parseInt(m.split('-')[1], 10)}月
                    </span>
                    <div className="flex-1 h-5 bg-gray-100 rounded-lg overflow-hidden relative">
                      <div
                        className="h-full bg-indigo-500 hover:bg-indigo-600 transition-all rounded-lg flex items-center justify-end pr-1.5"
                        style={{ width: `${Math.max(percent, total > 0 ? 5 : 0)}%` }}
                      />
                    </div>
                    <span className="w-24 text-right font-mono font-bold text-gray-800 shrink-0">
                      {total > 0 ? formatCurrency(total) : '¥0'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Store Card Modal for Fast In-Place Filling/Editing */}
      {modalStore && (
        <StoreCardEditorModal
          isOpen={!!modalStore}
          onClose={() => setModalStore(null)}
          month={activeMonth}
          store={modalStore}
          stores={storeList}
          paymentMethods={paymentMethodsList}
          existingTransactions={transactions}
          onSaveCard={(m, st, breakdown, memo) => {
            onSaveStoreCard(m, st, breakdown, memo);
          }}
          onSaveAndNext={(currentM, nextSt, breakdown, memo) => {
            onSaveStoreCard(currentM, modalStore, breakdown, memo);
            setModalStore(nextSt);
          }}
        />
      )}

    </div>
  );
};
