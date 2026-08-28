import React from 'react';
import { Transaction } from '../types';
import { 
  calculateMonthlySummaries, 
  calculateSummary, 
  formatCurrency, 
  getGranularityLabel 
} from '../utils/calculations';
import { Calendar, TrendingUp, TrendingDown, Wallet, PieChart, ArrowRight } from 'lucide-react';

interface MonthlyAggregationViewProps {
  transactions: Transaction[];
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  onNavigateToTab: (tab: 'list' | 'scratch') => void;
}

export const MonthlyAggregationView: React.FC<MonthlyAggregationViewProps> = ({
  transactions,
  selectedMonth,
  onSelectMonth,
  onNavigateToTab,
}) => {
  const monthlyList = calculateMonthlySummaries(transactions);
  const currentSummary = calculateSummary(transactions, selectedMonth);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            月別・カテゴリ別集計
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            取引データからリアルタイムに自動集計されます（元データと集計を分離し不整合を防止）。
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">表示期間:</span>
          <select
            value={selectedMonth}
            onChange={(e) => onSelectMonth(e.target.value)}
            className="text-xs font-bold px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">全期間（累計）</option>
            {monthlyList.map(m => (
              <option key={m.month} value={m.month}>
                {m.month.replace('-', '年')}月
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected Month / Period Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-4 rounded-2xl border border-emerald-200">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-800 mb-1">
            <span>売上合計 ({selectedMonth === 'ALL' ? '全期間' : selectedMonth})</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-extrabold font-mono text-emerald-950">
            {formatCurrency(currentSummary.totalSales)}
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-4 rounded-2xl border border-amber-200">
          <div className="flex items-center justify-between text-xs font-bold text-amber-800 mb-1">
            <span>経費合計 ({selectedMonth === 'ALL' ? '全期間' : selectedMonth})</span>
            <TrendingDown className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-extrabold font-mono text-amber-950">
            {formatCurrency(currentSummary.totalExpenses)}
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-500/10 to-blue-500/5 p-4 rounded-2xl border border-indigo-200">
          <div className="flex items-center justify-between text-xs font-bold text-indigo-800 mb-1">
            <span>差引利益 (売上 - 経費)</span>
            <Wallet className="w-4 h-4 text-indigo-600" />
          </div>
          <div className={`text-xl font-extrabold font-mono ${
            currentSummary.netBalance >= 0 ? 'text-indigo-950' : 'text-rose-600'
          }`}>
            {formatCurrency(currentSummary.netBalance)}
          </div>
        </div>
      </div>

      {/* Monthly Summary Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            月次推移一覧
          </h3>
          <span className="text-xs text-gray-400">行をクリックして対象月を選択</span>
        </div>

        {monthlyList.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400">データが登録されていません</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                <tr>
                  <th className="p-3">年月</th>
                  <th className="p-3 text-right text-emerald-700">売上</th>
                  <th className="p-3 text-right text-amber-700">経費</th>
                  <th className="p-3 text-right text-indigo-800">差引利益</th>
                  <th className="p-3 text-center">件数 (未確認)</th>
                  <th className="p-3 text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {monthlyList.map((m) => {
                  const isSelected = selectedMonth === m.month;
                  return (
                    <tr
                      key={m.month}
                      onClick={() => onSelectMonth(m.month)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-indigo-50/70 font-semibold' : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="p-3 font-mono font-bold text-gray-900">
                        {m.month.replace('-', '年')}月
                        {isSelected && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.2 bg-indigo-600 text-white rounded">選択中</span>
                        )}
                      </td>
                      <td className="p-3 font-mono font-bold text-right text-emerald-700">
                        {formatCurrency(m.sales)}
                      </td>
                      <td className="p-3 font-mono font-bold text-right text-amber-700">
                        {formatCurrency(m.expenses)}
                      </td>
                      <td className={`p-3 font-mono font-bold text-right ${
                        m.net >= 0 ? 'text-indigo-900' : 'text-rose-600'
                      }`}>
                        {formatCurrency(m.net)}
                      </td>
                      <td className="p-3 text-center text-gray-600">
                        {m.count}件 {m.unconfirmed > 0 && <span className="text-rose-600 font-bold">({m.unconfirmed}件未確認)</span>}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectMonth(m.month);
                            onNavigateToTab('list');
                          }}
                          className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          明細を見る <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Category Breakdowns (Sales vs Expenses) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sales Categories */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-4 space-y-3">
          <h3 className="text-sm font-bold text-emerald-900 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <PieChart className="w-4 h-4 text-emerald-600" />
              売上種類別 内訳 ({selectedMonth === 'ALL' ? '全期間' : selectedMonth})
            </span>
            <span className="font-mono text-emerald-700">{formatCurrency(currentSummary.totalSales)}</span>
          </h3>

          <div className="space-y-2">
            {Object.entries(currentSummary.bySalesCategory).length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">売上データはありません</p>
            ) : (
              Object.entries(currentSummary.bySalesCategory).map(([cat, amt]) => {
                const pct = currentSummary.totalSales > 0 ? (amt / currentSummary.totalSales) * 100 : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium text-gray-700">
                      <span>{cat}</span>
                      <span className="font-mono font-bold">
                        {formatCurrency(amt)} <span className="text-gray-400 text-[10px]">({pct.toFixed(1)}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Expense Categories */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-4 space-y-3">
          <h3 className="text-sm font-bold text-amber-900 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <PieChart className="w-4 h-4 text-amber-600" />
              経費科目別 内訳 ({selectedMonth === 'ALL' ? '全期間' : selectedMonth})
            </span>
            <span className="font-mono text-amber-700">{formatCurrency(currentSummary.totalExpenses)}</span>
          </h3>

          <div className="space-y-2">
            {Object.entries(currentSummary.byExpenseCategory).length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">経費データはありません</p>
            ) : (
              Object.entries(currentSummary.byExpenseCategory).map(([cat, amt]) => {
                const pct = currentSummary.totalExpenses > 0 ? (amt / currentSummary.totalExpenses) * 100 : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium text-gray-700">
                      <span>{cat}</span>
                      <span className="font-mono font-bold">
                        {formatCurrency(amt)} <span className="text-gray-400 text-[10px]">({pct.toFixed(1)}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Input Granularity & Payment Methods Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Payment Methods */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-4 space-y-3">
          <h3 className="text-sm font-bold text-gray-800">
            💳 決済方法別 流通額
          </h3>
          <div className="space-y-2">
            {Object.entries(currentSummary.byPaymentMethod).map(([method, amt]) => (
              <div key={method} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-100 last:border-0">
                <span className="font-medium text-gray-700">{method}</span>
                <span className="font-mono font-bold text-gray-900">{formatCurrency(amt)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Input Granularity */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-4 space-y-3">
          <h3 className="text-sm font-bold text-gray-800">
            📊 入力粒度別の登録件数
          </h3>
          <div className="space-y-2">
            {Object.entries(currentSummary.byGranularity).map(([granularityKey, data]) => (
              <div key={granularityKey} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-100 last:border-0">
                <span className="font-medium text-gray-700">{getGranularityLabel(granularityKey)}</span>
                <div className="text-right font-mono">
                  <span className="font-bold text-gray-900">{data.count}件</span>
                  <span className="text-[11px] text-gray-400 ml-2">
                    (売上: {formatCurrency(data.totalSales)} / 経費: {formatCurrency(data.totalExpenses)})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
