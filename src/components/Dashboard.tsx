import React from 'react';
import { Transaction } from '../types';
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
  Calendar,
  CheckCircle2
} from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  availableMonths: string[];
  onOpenAddSales: () => void;
  onOpenAddExpense: () => void;
  onOpenBackup: () => void;
  onOpenChat: () => void;
  onNavigateToTab: (tab: 'list' | 'scratch' | 'monthly') => void;
  onEdit: (tx: Transaction) => void;
  onDuplicate: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  onToggleConfirm: (id: string) => void;
  onQuoteInChat?: (tx: Transaction) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  transactions,
  selectedMonth,
  onSelectMonth,
  availableMonths,
  onOpenAddSales,
  onOpenAddExpense,
  onNavigateToTab,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleConfirm,
  onQuoteInChat,
}) => {
  const summary = calculateSummary(transactions, selectedMonth);

  // Month-filtered transactions for recent preview
  const currentMonthTransactions = selectedMonth === 'ALL'
    ? transactions
    : transactions.filter(t => {
        const m1 = t.date_from ? t.date_from.substring(0, 7) : '';
        const m2 = t.date_to ? t.date_to.substring(0, 7) : '';
        return m1 === selectedMonth || m2 === selectedMonth;
      });

  const recentItems = [...currentMonthTransactions].slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Top Header / Period Selector & Core Actions */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-1 items-center">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 shadow-xs flex items-center justify-center text-white font-black text-sm">
              S
            </div>
            <div className="w-8 h-8 rounded-xl bg-emerald-500 shadow-xs flex items-center justify-center text-white font-black text-sm">
              A
            </div>
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
              ダッシュボード
            </h1>
            <p className="text-xs text-gray-500">
              {selectedMonth === 'ALL' ? '全期間の累計' : `${selectedMonth.replace('-', '年')}月分`}の収支概要
            </p>
          </div>
        </div>

        {/* Period Selector & Quick Add */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700">
            <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
            <select
              value={selectedMonth}
              onChange={(e) => onSelectMonth(e.target.value)}
              className="bg-transparent focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">全期間（累計）</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{m.replace('-', '年')}月</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onOpenAddSales}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            売上を追加
          </button>

          <button
            type="button"
            onClick={onOpenAddExpense}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            経費を追加
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
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
            登録件数: {currentMonthTransactions.filter(t => t.type === 'sales').length}件
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
            登録件数: {currentMonthTransactions.filter(t => t.type === 'expense').length}件
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

      {/* Category Breakdown (2 Column Clean Layout) */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
            カテゴリ別内訳 ({selectedMonth === 'ALL' ? '全期間' : selectedMonth})
          </h2>
          <button
            type="button"
            onClick={() => onNavigateToTab('monthly')}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
          >
            月別集計表 <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Sales Categories */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-900 px-1">
              <span>売上内訳</span>
              <span className="font-mono">{formatCurrency(summary.totalSales)}</span>
            </div>
            <div className="space-y-1.5 bg-emerald-50/30 p-3.5 rounded-xl border border-emerald-100">
              {Object.entries(summary.bySalesCategory).length === 0 ? (
                <p className="text-xs text-gray-400 py-3 text-center">売上データなし</p>
              ) : (
                Object.entries(summary.bySalesCategory).map(([cat, amt]) => (
                  <div key={cat} className="flex items-center justify-between text-xs py-1">
                    <span className="font-medium text-gray-700 truncate max-w-[160px]">{cat}</span>
                    <span className="font-mono font-bold text-emerald-950">{formatCurrency(amt)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Expense Categories */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-amber-900 px-1">
              <span>経費内訳</span>
              <span className="font-mono">{formatCurrency(summary.totalExpenses)}</span>
            </div>
            <div className="space-y-1.5 bg-amber-50/30 p-3.5 rounded-xl border border-amber-100">
              {Object.entries(summary.byExpenseCategory).length === 0 ? (
                <p className="text-xs text-gray-400 py-3 text-center">経費データなし</p>
              ) : (
                Object.entries(summary.byExpenseCategory).map(([cat, amt]) => (
                  <div key={cat} className="flex items-center justify-between text-xs py-1">
                    <span className="font-medium text-gray-700 truncate max-w-[160px]">{cat}</span>
                    <span className="font-mono font-bold text-amber-950">{formatCurrency(amt)}</span>
                  </div>
                ))
              )}
            </div>
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

        {currentMonthTransactions.length === 0 ? (
          <div className="p-10 text-center space-y-3 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
            <p className="text-xs text-gray-500 font-medium">取引データがありません</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentItems.map(tx => (
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
