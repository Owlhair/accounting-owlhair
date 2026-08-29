import React, { useState } from 'react';
import { Transaction, FiscalPeriod } from '../types';
import { ScratchBlockCard } from './ScratchBlockCard';
import { Layers, Plus, Building2, SlidersHorizontal } from 'lucide-react';

interface ScratchFlowViewProps {
  transactions: Transaction[];
  selectedFilter: string;
  onSelectFilter: (filterId: string) => void;
  fiscalPeriods: FiscalPeriod[];
  availableMonths: string[];
  onEdit: (tx: Transaction) => void;
  onDuplicate: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  onToggleConfirm: (id: string) => void;
  onOpenAddSales: () => void;
  onOpenAddExpense: () => void;
  onOpenFiscalSettings: () => void;
  onQuoteInChat?: (tx: Transaction) => void;
}

type BlockFilter = 'all' | 'sales' | 'expense' | 'unconfirmed';

export const ScratchFlowView: React.FC<ScratchFlowViewProps> = ({
  transactions,
  selectedFilter,
  onSelectFilter,
  fiscalPeriods,
  availableMonths,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleConfirm,
  onOpenAddSales,
  onOpenAddExpense,
  onOpenFiscalSettings,
  onQuoteInChat,
}) => {
  const [filter, setFilter] = useState<BlockFilter>('all');

  const filtered = transactions.filter(tx => {
    if (selectedFilter !== 'ALL') {
      const m = tx.date_from ? tx.date_from.substring(0, 7) : (tx.date_to ? tx.date_to.substring(0, 7) : '');
      if (selectedFilter.startsWith('period-')) {
        const p = fiscalPeriods.find(p => p.key === selectedFilter);
        if (p && !p.months.includes(m)) return false;
      } else if (m !== selectedFilter) {
        return false;
      }
    }
    if (filter === 'sales' && tx.type !== 'sales') return false;
    if (filter === 'expense' && tx.type !== 'expense') return false;
    if (filter === 'unconfirmed' && tx.confirmed) return false;
    return true;
  });

  const salesBlocks = filtered.filter(t => t.type === 'sales');
  const expenseBlocks = filtered.filter(t => t.type === 'expense');

  return (
    <div className="space-y-4">
      {/* Top Header & Filter Controls */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-gray-200/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900">
                ブロックフロー
              </h2>
              <p className="text-xs text-gray-500">
                取引をお金の流れのブロックとして視覚的に確認
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenAddSales}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              売上追加
            </button>
            <button
              type="button"
              onClick={onOpenAddExpense}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              経費追加
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 bg-gray-100/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filter === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              すべて ({filtered.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('sales')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filter === 'sales' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              売上のみ ({salesBlocks.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('expense')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filter === 'expense' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-800 hover:bg-amber-50'
              }`}
            >
              経費のみ ({expenseBlocks.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unconfirmed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filter === 'unconfirmed' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              未確認
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-700">
              <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
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

            <button
              type="button"
              onClick={onOpenFiscalSettings}
              className="p-1.5 text-gray-600 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 border border-gray-200 rounded-xl transition-colors"
              title="決算期設定"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Blocks */}
      {filtered.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-200 text-center text-gray-400 space-y-2">
          <Layers className="w-8 h-8 mx-auto text-gray-300" />
          <p className="text-sm font-bold text-gray-600">表示できるブロックがありません</p>
          <p className="text-xs text-gray-400">
            「売上追加」または「経費追加」から登録してください。
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.map(tx => (
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
  );
};
