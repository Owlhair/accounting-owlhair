import React, { useState } from 'react';
import { Transaction } from '../types';
import { ScratchBlockCard } from './ScratchBlockCard';
import { formatCurrency } from '../utils/calculations';
import { Layers, Plus, Calendar, Filter, Sparkles } from 'lucide-react';

interface ScratchFlowViewProps {
  transactions: Transaction[];
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  availableMonths: string[];
  onEdit: (tx: Transaction) => void;
  onDuplicate: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  onToggleConfirm: (id: string) => void;
  onOpenAddSales: () => void;
  onOpenAddExpense: () => void;
  onQuoteInChat?: (tx: Transaction) => void;
}

type BlockFilter = 'all' | 'sales' | 'expense' | 'unconfirmed';

export const ScratchFlowView: React.FC<ScratchFlowViewProps> = ({
  transactions,
  selectedMonth,
  onSelectMonth,
  availableMonths,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleConfirm,
  onOpenAddSales,
  onOpenAddExpense,
  onQuoteInChat,
}) => {
  const [filter, setFilter] = useState<BlockFilter>('all');

  const filtered = transactions.filter(tx => {
    if (selectedMonth !== 'ALL') {
      const m1 = tx.date_from ? tx.date_from.substring(0, 7) : '';
      const m2 = tx.date_to ? tx.date_to.substring(0, 7) : '';
      if (m1 !== selectedMonth && m2 !== selectedMonth) return false;
    }
    if (filter === 'sales' && tx.type !== 'sales') return false;
    if (filter === 'expense' && tx.type !== 'expense') return false;
    if (filter === 'unconfirmed' && tx.confirmed) return false;
    return true;
  });

  const salesBlocks = filtered.filter(t => t.type === 'sales');
  const expenseBlocks = filtered.filter(t => t.type === 'expense');

  return (
    <div className="space-y-5">
      {/* Visual Header & Controls */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-850 to-slate-900 rounded-2xl p-4 sm:p-6 text-white shadow-md relative overflow-hidden">
        {/* Background Scratch Block pattern motif */}
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1.5 bg-indigo-500/30 rounded-lg text-indigo-300 backdrop-blur-xs">
                <Layers className="w-5 h-5" />
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
                Scratch風ブロックフロー
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-indigo-200/90 max-w-xl">
              取引データをブロックとして積み重ね、お金の発生源からカテゴリ・決済方法への流れを視覚的に把握できます。
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenAddSales}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              売上ブロック追加
            </button>
            <button
              type="button"
              onClick={onOpenAddExpense}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              経費ブロック追加
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="mt-5 pt-4 border-t border-indigo-700/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-indigo-300 font-medium flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> 絞り込み:
            </span>
            <div className="flex gap-1 bg-black/25 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  filter === 'all' ? 'bg-indigo-600 text-white' : 'text-indigo-200 hover:text-white'
                }`}
              >
                すべて ({filtered.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('sales')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  filter === 'sales' ? 'bg-emerald-600 text-white' : 'text-emerald-300 hover:text-white'
                }`}
              >
                売上 ({salesBlocks.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('expense')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  filter === 'expense' ? 'bg-amber-600 text-white' : 'text-amber-300 hover:text-white'
                }`}
              >
                経費 ({expenseBlocks.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('unconfirmed')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  filter === 'unconfirmed' ? 'bg-rose-600 text-white' : 'text-rose-300 hover:text-white'
                }`}
              >
                未確認のみ
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-300" />
            <select
              value={selectedMonth}
              onChange={(e) => onSelectMonth(e.target.value)}
              className="bg-indigo-950/80 text-white text-xs px-3 py-1.5 rounded-xl border border-indigo-700/60 focus:ring-2 focus:ring-indigo-400 focus:outline-hidden font-medium"
            >
              <option value="ALL">全ての期間</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{m.replace('-', '年')}月</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Blocks */}
      {filtered.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-300 text-center text-gray-400">
          <Sparkles className="w-8 h-8 mx-auto text-gray-300 mb-2" />
          <p className="text-sm font-bold text-gray-600">表示できるブロックがありません</p>
          <p className="text-xs text-gray-400 mt-1">
            「売上ブロック追加」または「経費ブロック追加」から登録してください。
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
