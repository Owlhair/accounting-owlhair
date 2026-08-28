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
  Sparkles,
  FileSpreadsheet
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
  onOpenBackup,
  onOpenChat,
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

  const recentItems = [...currentMonthTransactions].slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Top Banner / Month Selector & Actions */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white rounded-2xl shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
              経理ダッシュボード
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              大雑把な月次集計から個別領収書まで、簡単にお金の流れを整理
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Month selector */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-700">
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
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            売上を追加
          </button>

          <button
            type="button"
            onClick={onOpenAddExpense}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            経費を追加
          </button>
        </div>
      </div>

      {/* Zero State / Empty Workspace Welcome Banner */}
      {transactions.length === 0 && (
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-2xl p-6 sm:p-7 shadow-lg border border-indigo-700/50 space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-xl">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                ✨ まっさらな本番モードで利用開始
              </span>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                サンプルの数字をクリアしました！
              </h2>
              <p className="text-xs text-indigo-200 leading-relaxed">
                実際の売上や経費を入力しながら、使い心地や修正したい点を確認していきましょう。大雑把な「月次まとめ（概算）」でも、レシート1枚ごとの個別入力でもOKです。
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5 shrink-0">
              <button
                type="button"
                onClick={onOpenAddSales}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 active:scale-98"
              >
                <Plus className="w-4 h-4" />
                実際の売上を登録
              </button>
              <button
                type="button"
                onClick={onOpenAddExpense}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 active:scale-98"
              >
                <Plus className="w-4 h-4" />
                実際の経費を登録
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-indigo-700/60 text-xs text-indigo-100">
            <div className="bg-white/10 p-3 rounded-xl backdrop-blur-xs">
              <span className="font-bold text-white block mb-0.5">① 粒度は自由</span>
              <span className="text-[11px] text-indigo-200">「8月分 売上100万」などの月まとめでも、「文具代1,200円」などのレシートでも登録可能。</span>
            </div>
            <div className="bg-white/10 p-3 rounded-xl backdrop-blur-xs">
              <span className="font-bold text-white block mb-0.5">② PWAアプリ化対応</span>
              <span className="text-[11px] text-indigo-200">スマホやPCのホーム画面に追加して、全画面でネイティブアプリのように使えます。</span>
            </div>
            <div className="bg-white/10 p-3 rounded-xl backdrop-blur-xs">
              <span className="font-bold text-white block mb-0.5">③ チームチャット</span>
              <span className="text-[11px] text-indigo-200">気になる仕訳を引用しながら、税理士や役員とリアルタイムで相談・確認できます。</span>
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Sales Card */}
        <div className="bg-gradient-to-br from-emerald-50 to-white p-4 sm:p-5 rounded-2xl border border-emerald-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-800 mb-2">
            <span>売上合計 ({selectedMonth === 'ALL' ? '全期間' : selectedMonth})</span>
            <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-950 tracking-tight">
            {formatCurrency(summary.totalSales)}
          </div>
          <div className="mt-2 text-[11px] text-emerald-700 font-medium">
            登録件数: {currentMonthTransactions.filter(t => t.type === 'sales').length}件
          </div>
        </div>

        {/* Expenses Card */}
        <div className="bg-gradient-to-br from-amber-50 to-white p-4 sm:p-5 rounded-2xl border border-amber-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-amber-800 mb-2">
            <span>経費合計 ({selectedMonth === 'ALL' ? '全期間' : selectedMonth})</span>
            <div className="p-1.5 bg-amber-100 rounded-lg text-amber-700">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-amber-950 tracking-tight">
            {formatCurrency(summary.totalExpenses)}
          </div>
          <div className="mt-2 text-[11px] text-amber-700 font-medium">
            登録件数: {currentMonthTransactions.filter(t => t.type === 'expense').length}件
          </div>
        </div>

        {/* Net Profit Card */}
        <div className="bg-gradient-to-br from-indigo-50 to-white p-4 sm:p-5 rounded-2xl border border-indigo-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-indigo-800 mb-2">
            <span>差引利益 (売上 - 経費)</span>
            <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-700">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black font-mono tracking-tight ${
            summary.netBalance >= 0 ? 'text-indigo-950' : 'text-rose-600'
          }`}>
            {formatCurrency(summary.netBalance)}
          </div>
          <div className="mt-2 text-[11px] text-indigo-600 font-medium">
            粗利益率: {summary.totalSales > 0 ? ((summary.netBalance / summary.totalSales) * 100).toFixed(1) : 0}%
          </div>
        </div>

        {/* Unconfirmed Status Card */}
        <div 
          onClick={() => onNavigateToTab('list')}
          className={`cursor-pointer transition-all p-4 sm:p-5 rounded-2xl border shadow-xs relative overflow-hidden ${
            summary.unconfirmedCount > 0
              ? 'bg-gradient-to-br from-rose-50 to-white border-rose-200 hover:border-rose-300 hover:shadow-sm'
              : 'bg-gradient-to-br from-slate-50 to-white border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold mb-2">
            <span className={summary.unconfirmedCount > 0 ? 'text-rose-800' : 'text-gray-600'}>
              未確認の取引
            </span>
            <div className={`p-1.5 rounded-lg ${
              summary.unconfirmedCount > 0 ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-500'
            }`}>
              <CircleAlert className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black font-mono tracking-tight ${
            summary.unconfirmedCount > 0 ? 'text-rose-600' : 'text-gray-700'
          }`}>
            {summary.unconfirmedCount} <span className="text-sm font-bold">件</span>
          </div>
          <div className="mt-2 text-[11px] text-gray-500 flex items-center gap-1 font-medium">
            <span>一覧で確認する</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* Quick Visual Categories Breakdown & Scratch Highlight */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Left 2 Cols: Category Breakdown */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200/80 p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              内訳サマリー ({selectedMonth === 'ALL' ? '全期間' : selectedMonth})
            </h2>
            <button
              type="button"
              onClick={() => onNavigateToTab('monthly')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
            >
              月別推移表へ <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Sales Categories */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center justify-between">
                <span>売上内訳</span>
                <span className="font-mono">{formatCurrency(summary.totalSales)}</span>
              </h3>
              <div className="space-y-1.5 bg-emerald-50/40 p-3 rounded-xl border border-emerald-100">
                {Object.entries(summary.bySalesCategory).length === 0 ? (
                  <p className="text-xs text-gray-400 py-2 text-center">売上なし</p>
                ) : (
                  Object.entries(summary.bySalesCategory).map(([cat, amt]) => (
                    <div key={cat} className="flex items-center justify-between text-xs py-0.5">
                      <span className="font-medium text-gray-700 truncate max-w-[130px]">{cat}</span>
                      <span className="font-mono font-bold text-emerald-950">{formatCurrency(amt)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Expense Categories */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center justify-between">
                <span>経費内訳</span>
                <span className="font-mono">{formatCurrency(summary.totalExpenses)}</span>
              </h3>
              <div className="space-y-1.5 bg-amber-50/40 p-3 rounded-xl border border-amber-100">
                {Object.entries(summary.byExpenseCategory).length === 0 ? (
                  <p className="text-xs text-gray-400 py-2 text-center">経費なし</p>
                ) : (
                  Object.entries(summary.byExpenseCategory).map(([cat, amt]) => (
                    <div key={cat} className="flex items-center justify-between text-xs py-0.5">
                      <span className="font-medium text-gray-700 truncate max-w-[130px]">{cat}</span>
                      <span className="font-mono font-bold text-amber-950">{formatCurrency(amt)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions Row */}
          <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-gray-500 font-medium">便利機能:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onNavigateToTab('scratch')}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition-colors flex items-center gap-1"
              >
                <Layers className="w-3.5 h-3.5" />
                ブロックフローで確認
              </button>
              <button
                type="button"
                onClick={onOpenBackup}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors flex items-center gap-1"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                CSV / バックアップ
              </button>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Scratch Flow Teaser / Quick Block Preview */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-5 space-y-3 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-3">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                Scratchブロック表示
              </h2>
              <button
                type="button"
                onClick={() => onNavigateToTab('scratch')}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold"
              >
                すべて見る
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-3">
              取引データはお金の流れを表すブロックとして可視化されます。
            </p>

            {recentItems.length > 0 ? (
              <div className="space-y-2">
                <ScratchBlockCard
                  transaction={recentItems[0]}
                  compact={true}
                  onEdit={onEdit}
                  onDuplicate={onDuplicate}
                  onDelete={onDelete}
                  onToggleConfirm={onToggleConfirm}
                  onQuoteInChat={onQuoteInChat}
                />
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-gray-400 bg-gray-50 rounded-xl">
                取引データがありません
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onNavigateToTab('scratch')}
            className="w-full mt-3 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1"
          >
            <Layers className="w-3.5 h-3.5" />
            全ブロックを表示する
          </button>
        </div>

      </div>

      {/* Recent Transactions List Section */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">
            最近の取引データ ({selectedMonth === 'ALL' ? '全期間' : selectedMonth})
          </h2>
          <button
            type="button"
            onClick={() => onNavigateToTab('list')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            取引一覧テーブルへ <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {currentMonthTransactions.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400">データがありません</div>
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
