import React, { useState } from 'react';
import { Transaction, FiscalPeriod } from '../types';
import { 
  calculatePeriodSummaries, 
  calculateMonthlySummaries, 
  calculateSummary, 
  formatCurrency 
} from '../utils/calculations';
import { Building2, Calendar, TrendingUp, TrendingDown, Wallet, SlidersHorizontal, ChevronRight, ChevronDown } from 'lucide-react';

interface MonthlyAggregationViewProps {
  transactions: Transaction[];
  selectedFilter: string;
  onSelectFilter: (filterId: string) => void;
  fiscalPeriods: FiscalPeriod[];
  availableMonths: string[];
  onOpenFiscalSettings: () => void;
  onNavigateToTab: (tab: 'list' | 'scratch') => void;
}

export const MonthlyAggregationView: React.FC<MonthlyAggregationViewProps> = ({
  transactions,
  selectedFilter,
  onSelectFilter,
  fiscalPeriods,
  availableMonths,
  onOpenFiscalSettings,
  onNavigateToTab,
}) => {
  const periodSummaries = calculatePeriodSummaries(transactions, fiscalPeriods);
  const currentSummary = calculateSummary(transactions, selectedFilter, fiscalPeriods);
  const [expandedPeriod, setExpandedPeriod] = useState<string>(
    fiscalPeriods[0]?.key || 'period-1'
  );

  const selectedPeriodObj = fiscalPeriods.find(p => p.key === selectedFilter);
  const filterLabel = selectedFilter === 'ALL'
    ? '全期間の累計'
    : selectedPeriodObj
      ? selectedPeriodObj.label
      : `${selectedFilter.replace('-', '年')}月分`;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            期別・月別集計表
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            設定された決算月に基づいて各期（12ヶ月）と月次推移を自動集計します
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenFiscalSettings}
            className="px-3 py-1.5 bg-gray-50 hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 border border-gray-200 hover:border-indigo-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
            決算期設定
          </button>

          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-700">
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
        </div>
      </div>

      {/* Highlight KPI Cards for Current Selected Period / Filter */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-150 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-800 mb-1">
            <span>売上合計 ({filterLabel})</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-950">
            {formatCurrency(currentSummary.totalSales)}
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-amber-150 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-amber-800 mb-1">
            <span>経費合計 ({filterLabel})</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-amber-950">
            {formatCurrency(currentSummary.totalExpenses)}
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-indigo-150 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-indigo-800 mb-1">
            <span>差引利益 ({filterLabel})</span>
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black font-mono ${currentSummary.netBalance >= 0 ? 'text-indigo-950' : 'text-rose-600'}`}>
            {formatCurrency(currentSummary.netBalance)}
          </div>
        </div>
      </div>

      {/* Fiscal Periods Accordion / Breakdown Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
            期ごとの年度決算サマリー
          </h3>
        </div>

        <div className="space-y-3">
          {periodSummaries.map((pSum) => {
            const isExpanded = expandedPeriod === pSum.period.key;
            const isSelected = selectedFilter === pSum.period.key;

            return (
              <div 
                key={pSum.period.key}
                className={`bg-white rounded-2xl border transition-all overflow-hidden shadow-xs ${
                  isSelected ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-gray-200/80'
                }`}
              >
                {/* Period Row Header */}
                <div 
                  onClick={() => setExpandedPeriod(isExpanded ? '' : pSum.period.key)}
                  className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/70 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-gray-900">
                          {pSum.period.label}
                        </span>
                        {isSelected && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-600 text-white rounded-full">
                            選択中
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 font-mono">
                        {pSum.period.startDate} 〜 {pSum.period.endDate}（{pSum.count}件の取引）
                      </p>
                    </div>
                  </div>

                  {/* Period Mini Stats */}
                  <div className="flex items-center gap-6 text-xs justify-between md:justify-end">
                    <div>
                      <span className="text-gray-400 text-[10px] block">期中売上</span>
                      <span className="font-mono font-bold text-emerald-800 text-sm">
                        {formatCurrency(pSum.sales)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 text-[10px] block">期中経費</span>
                      <span className="font-mono font-bold text-amber-800 text-sm">
                        {formatCurrency(pSum.expenses)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 text-[10px] block">期中利益</span>
                      <span className={`font-mono font-bold text-sm ${pSum.net >= 0 ? 'text-indigo-900' : 'text-rose-600'}`}>
                        {formatCurrency(pSum.net)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectFilter(pSum.period.key);
                      }}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-indigo-600 hover:text-white text-gray-700 text-xs font-bold rounded-xl transition-colors shrink-0"
                    >
                      この期を基準にする
                    </button>
                  </div>
                </div>

                {/* Expanded Month-by-Month Table within this Period */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/40 p-4 sm:p-5 space-y-3 animate-in fade-in duration-150">
                    <div className="text-xs font-bold text-gray-600 flex items-center justify-between">
                      <span>{pSum.period.label} の月別推移</span>
                      <span className="text-[11px] text-gray-400">（12ヶ月分）</span>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto shadow-2xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-50 text-gray-500 border-b border-gray-200 font-bold">
                            <th className="py-2.5 px-3">対象月</th>
                            <th className="py-2.5 px-3 text-right">売上</th>
                            <th className="py-2.5 px-3 text-right">経費</th>
                            <th className="py-2.5 px-3 text-right">差引利益</th>
                            <th className="py-2.5 px-3 text-center">件数</th>
                            <th className="py-2.5 px-3 text-center">操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {pSum.monthlySummaries.map((m) => (
                            <tr key={m.month} className="hover:bg-gray-50/80">
                              <td className="py-2.5 px-3 font-mono font-bold text-gray-800">
                                {m.month.replace('-', '年')}月
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800">
                                {formatCurrency(m.sales)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-800">
                                {formatCurrency(m.expenses)}
                              </td>
                              <td className={`py-2.5 px-3 text-right font-mono font-bold ${m.net >= 0 ? 'text-indigo-900' : 'text-rose-600'}`}>
                                {formatCurrency(m.net)}
                              </td>
                              <td className="py-2.5 px-3 text-center text-gray-500 font-mono">
                                {m.count}件
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSelectFilter(m.month);
                                    onNavigateToTab('list');
                                  }}
                                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                                >
                                  明細を見る
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-indigo-50/50 border-t-2 border-indigo-200 font-bold">
                            <td className="py-2.5 px-3 text-indigo-950 font-black">
                              年度合計
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-900">
                              {formatCurrency(pSum.sales)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-black text-amber-900">
                              {formatCurrency(pSum.expenses)}
                            </td>
                            <td className={`py-2.5 px-3 text-right font-mono font-black ${pSum.net >= 0 ? 'text-indigo-950' : 'text-rose-700'}`}>
                              {formatCurrency(pSum.net)}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-black text-indigo-950">
                              {pSum.count}件
                            </td>
                            <td className="py-2.5 px-3 text-center"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
