import React from 'react';
import { Transaction, FiscalPeriod } from '../types';
import { calculateSummary, formatCurrency } from '../utils/calculations';
import { ScratchBlockCard } from './ScratchBlockCard';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  CircleAlert, 
  Plus, 
  ArrowRight, 
  Layers, 
  CheckCircle2,
  SlidersHorizontal,
  Building2,
  Store,
  CreditCard
} from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
  selectedFilter: string; // 'ALL', 'period-1', or 'YYYY-MM'
  onSelectFilter: (filterId: string) => void;
  fiscalPeriods: FiscalPeriod[];
  availableMonths: string[];
  onOpenAddSales: () => void;
  onOpenAddExpense: () => void;
  onOpenFiscalSettings: () => void;
  onNavigateToTab: (tab: 'list' | 'scratch' | 'monthly') => void;
  onEdit: (tx: Transaction) => void;
  onDuplicate: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  onToggleConfirm: (id: string) => void;
  onQuoteInChat?: (tx: Transaction) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  transactions,
  selectedFilter,
  onSelectFilter,
  fiscalPeriods,
  availableMonths,
  onOpenAddSales,
  onOpenAddExpense,
  onOpenFiscalSettings,
  onNavigateToTab,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleConfirm,
  onQuoteInChat,
}) => {
  const summary = calculateSummary(transactions, selectedFilter, fiscalPeriods);

  // Filtered transactions for recent preview
  const currentFilteredTransactions = transactions.filter(t => {
    if (selectedFilter === 'ALL') return true;
    const m = t.date_from ? t.date_from.substring(0, 7) : (t.date_to ? t.date_to.substring(0, 7) : '');
    if (selectedFilter.startsWith('period-')) {
      const p = fiscalPeriods.find(p => p.key === selectedFilter);
      return p ? p.months.includes(m) : true;
    }
    return m === selectedFilter;
  });

  // Determine current active filter label
  const filterLabel = (() => {
    if (selectedFilter === 'ALL') return '全期間（累計）';
    if (selectedFilter.startsWith('period-')) {
      const p = fiscalPeriods.find(p => p.key === selectedFilter);
      return p ? p.label : selectedFilter;
    }
    return `${selectedFilter.replace('-', '年')}月`;
  })();

  return (
    <div className="space-y-6">
      {/* Top Banner / Filter & Action bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
              ダッシュボード
              <span className="text-xs font-semibold px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200/60 rounded-full font-mono">
                {filterLabel}
              </span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {filterLabel}の収支・店舗別概要
            </p>
          </div>
        </div>

        {/* Period Selector, Fiscal Year Settings, and Quick Add */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Period Selector Dropdown */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700">
            <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
            <select
              value={selectedFilter}
              onChange={(e) => onSelectFilter(e.target.value)}
              className="bg-transparent focus:outline-hidden cursor-pointer"
            >
              <optgroup label="期ごとの集計（推奨）">
                {fiscalPeriods.map(p => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="単月">
                {availableMonths.map(m => (
                  <option key={m} value={m}>
                    {m.replace('-', '年')}月
                  </option>
                ))}
              </optgroup>
              <optgroup label="全体">
                <option value="ALL">全期間（累計）</option>
              </optgroup>
            </select>
          </div>

          {/* Settings Trigger */}
          <button
            type="button"
            onClick={onOpenFiscalSettings}
            className="p-2 text-gray-600 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 rounded-xl transition-colors text-xs font-bold flex items-center gap-1"
            title="決算期・店舗設定"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">環境設定</span>
          </button>

          <button
            type="button"
            onClick={onOpenAddSales}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            売上追加
          </button>

          <button
            type="button"
            onClick={onOpenAddExpense}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            経費追加
          </button>
        </div>
      </div>

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales Card */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-150 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-800 mb-2">
            <span>売上合計</span>
            <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-950 tracking-tight">
            {formatCurrency(summary.totalSales)}
          </div>
          <div className="mt-2 text-[11px] text-gray-500 font-medium">
            登録件数: {currentFilteredTransactions.filter(t => t.type === 'sales').length}件
          </div>
        </div>

        {/* Expenses Card */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-amber-150 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-amber-800 mb-2">
            <span>経費合計</span>
            <div className="p-1.5 bg-amber-50 rounded-lg text-amber-600">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-amber-950 tracking-tight">
            {formatCurrency(summary.totalExpenses)}
          </div>
          <div className="mt-2 text-[11px] text-gray-500 font-medium">
            登録件数: {currentFilteredTransactions.filter(t => t.type === 'expense').length}件
          </div>
        </div>

        {/* Net Profit Card */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-indigo-150 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-indigo-800 mb-2">
            <span>差引利益</span>
            <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black font-mono tracking-tight ${
            summary.netBalance >= 0 ? 'text-indigo-950' : 'text-rose-600'
          }`}>
            {formatCurrency(summary.netBalance)}
          </div>
          <div className="mt-2 text-[11px] text-gray-500 font-medium">
            粗利益率: {summary.totalSales > 0 ? ((summary.netBalance / summary.totalSales) * 100).toFixed(1) : 0}%
          </div>
        </div>

        {/* Unconfirmed Status Card */}
        <div 
          onClick={() => onNavigateToTab('list')}
          className={`cursor-pointer transition-all p-4 sm:p-5 rounded-2xl border shadow-xs relative overflow-hidden ${
            summary.unconfirmedCount > 0
              ? 'bg-white border-rose-200 hover:border-rose-300'
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold mb-2">
            <span className={summary.unconfirmedCount > 0 ? 'text-rose-800' : 'text-gray-600'}>
              未確認の取引
            </span>
            <div className={`p-1.5 rounded-lg ${
              summary.unconfirmedCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
            }`}>
              {summary.unconfirmedCount > 0 ? (
                <CircleAlert className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </div>
          </div>
          <div className={`text-2xl font-black font-mono tracking-tight ${
            summary.unconfirmedCount > 0 ? 'text-rose-600' : 'text-gray-900'
          }`}>
            {summary.unconfirmedCount} <span className="text-sm font-bold text-gray-500">件</span>
          </div>
          <div className="mt-2 text-[11px] text-indigo-600 flex items-center gap-1 font-medium">
            <span>一覧で確認する</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* 3-Column Breakdown (Category, Payment Method, Store) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Category Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <h2 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              売上科目別内訳
            </h2>
            <span className="text-xs font-bold font-mono text-emerald-700">
              {formatCurrency(summary.totalSales)}
            </span>
          </div>
          <div className="space-y-1.5">
            {Object.entries(summary.bySalesCategory).length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center">売上データなし</p>
            ) : (
              Object.entries(summary.bySalesCategory).map(([cat, amt]) => (
                <div key={cat} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-gray-50/70">
                  <span className="font-medium text-gray-700 truncate">{cat}</span>
                  <span className="font-mono font-bold text-emerald-950">{formatCurrency(amt)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Payment Method Breakdown (現金, クレジット, QR, ポイント, 銀行振込) */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <h2 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-blue-600" />
              決済種別内訳
            </h2>
            <span className="text-xs font-bold text-gray-500">
              全取引
            </span>
          </div>
          <div className="space-y-1.5">
            {Object.entries(summary.byPaymentMethod).length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center">データなし</p>
            ) : (
              Object.entries(summary.byPaymentMethod).map(([pm, amt]) => (
                <div key={pm} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-gray-50/70">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${
                      pm === '現金' ? 'bg-emerald-500' :
                      pm === 'クレジットカード' ? 'bg-blue-500' :
                      pm === 'QR決済' ? 'bg-amber-500' :
                      pm === 'ポイント' ? 'bg-purple-500' : 'bg-gray-400'
                    }`} />
                    <span className="font-medium text-gray-700 truncate">{pm}</span>
                  </div>
                  <span className="font-mono font-bold text-gray-900">{formatCurrency(amt)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Store / Department Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <h2 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-indigo-600" />
              店舗・部門別内訳
            </h2>
            <span className="text-xs font-bold text-gray-500">
              全取引
            </span>
          </div>
          <div className="space-y-1.5">
            {Object.entries(summary.byStore).length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center">データなし</p>
            ) : (
              Object.entries(summary.byStore).map(([st, amt]) => (
                <div key={st} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-gray-50/70">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-gray-700 truncate">{st}</span>
                  </div>
                  <span className="font-mono font-bold text-indigo-950">{formatCurrency(amt)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions Section */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            最近の取引
          </h2>
          <button
            type="button"
            onClick={() => onNavigateToTab('list')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            全件一覧へ <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {currentFilteredTransactions.length === 0 ? (
          <div className="p-10 text-center space-y-3 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
            <p className="text-xs text-gray-500 font-medium">この期間の取引データがありません</p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={onOpenAddSales}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs"
              >
                + 売上を追加
              </button>
              <button
                type="button"
                onClick={onOpenAddExpense}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs"
              >
                + 経費を追加
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {currentFilteredTransactions.slice(0, 6).map(tx => (
              <ScratchBlockCard
                key={tx.id}
                transaction={tx}
                onEdit={onEdit}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
                onToggleConfirm={onToggleConfirm}
                onQuoteInChat={onQuoteInChat}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
