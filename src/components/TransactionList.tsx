import React, { useState, useMemo } from 'react';
import { Transaction, FiscalPeriod } from '../types';
import { formatCurrency, getGranularityLabel, getSourceTypeLabel } from '../utils/calculations';
import { 
  Search, 
  Filter, 
  CheckCircle2, 
  CircleAlert, 
  Edit3, 
  Copy, 
  Trash2, 
  Download, 
  Plus, 
  Building2,
  SlidersHorizontal,
  CheckCheck,
  MessageSquareShare
} from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  selectedFilter: string;
  onSelectFilter: (filterId: string) => void;
  fiscalPeriods: FiscalPeriod[];
  availableMonths: string[];
  onEdit: (tx: Transaction) => void;
  onDuplicate: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  onToggleConfirm: (id: string) => void;
  onBulkConfirm: (ids: string[]) => void;
  onOpenAddSales: () => void;
  onOpenAddExpense: () => void;
  onOpenFiscalSettings: () => void;
  onExportCsv: () => void;
  onQuoteInChat?: (tx: Transaction) => void;
}

type FilterType = 'all' | 'sales' | 'expense' | 'unconfirmed';

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  selectedFilter,
  onSelectFilter,
  fiscalPeriods,
  availableMonths,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleConfirm,
  onBulkConfirm,
  onOpenAddSales,
  onOpenAddExpense,
  onOpenFiscalSettings,
  onExportCsv,
  onQuoteInChat,
}) => {
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [granularityFilter, setGranularityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // Filter by period or month
      if (selectedFilter !== 'ALL') {
        const m = tx.date_from ? tx.date_from.substring(0, 7) : (tx.date_to ? tx.date_to.substring(0, 7) : '');
        if (selectedFilter.startsWith('period-')) {
          const p = fiscalPeriods.find(p => p.key === selectedFilter);
          if (p && !p.months.includes(m)) return false;
        } else if (m !== selectedFilter) {
          return false;
        }
      }

      // Type & Confirmation filter
      if (filterType === 'sales' && tx.type !== 'sales') return false;
      if (filterType === 'expense' && tx.type !== 'expense') return false;
      if (filterType === 'unconfirmed' && tx.confirmed) return false;

      // Granularity filter
      if (granularityFilter !== 'ALL' && tx.granularity !== granularityFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCat = tx.category.toLowerCase().includes(q);
        const matchDesc = (tx.description || '').toLowerCase().includes(q);
        const matchMemo = (tx.memo || '').toLowerCase().includes(q);
        const matchMethod = (tx.payment_method || '').toLowerCase().includes(q);
        const matchAmt = String(tx.amount).includes(q);
        if (!matchCat && !matchDesc && !matchMemo && !matchMethod && !matchAmt) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, selectedFilter, fiscalPeriods, filterType, granularityFilter, searchQuery]);

  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredTransactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTransactions.map(t => t.id)));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkConfirmSelected = () => {
    if (selectedIds.size === 0) return;
    onBulkConfirm(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-gray-200/80 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="摘要、科目、金額、メモで検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

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
              className="p-2 text-gray-600 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 border border-gray-200 rounded-xl transition-colors shrink-0"
              title="決算期設定"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Action Buttons */}
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

            <button
              type="button"
              onClick={onExportCsv}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 border border-gray-200"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
          </div>
        </div>

        {/* Filter Pills and Bulk Confirm */}
        <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 bg-gray-100/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterType === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              すべて ({filteredTransactions.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('sales')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterType === 'sales' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              売上のみ
            </button>
            <button
              type="button"
              onClick={() => setFilterType('expense')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterType === 'expense' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-800 hover:bg-amber-50'
              }`}
            >
              経費のみ
            </button>
            <button
              type="button"
              onClick={() => setFilterType('unconfirmed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterType === 'unconfirmed' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              未確認のみ
            </button>
          </div>

          {/* Granularity Dropdown */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Filter className="w-3.5 h-3.5" />
              <span>粒度:</span>
              <select
                value={granularityFilter}
                onChange={(e) => setGranularityFilter(e.target.value)}
                className="bg-transparent border-0 font-bold text-gray-800 focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">すべて</option>
                <option value="monthly">月まとめ</option>
                <option value="daily">日まとめ</option>
                <option value="period">期間まとめ</option>
                <option value="transaction">1取引ごと</option>
              </select>
            </div>

            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={handleBulkConfirmSelected}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                選択した{selectedIds.size}件を確認済みにする
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-bold">
                <th className="py-3 px-3 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={filteredTransactions.length > 0 && selectedIds.size === filteredTransactions.length}
                    onChange={handleToggleSelectAll}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="py-3 px-3 w-28">日付 / 期間</th>
                <th className="py-3 px-3 w-20">種別</th>
                <th className="py-3 px-3 w-24">粒度</th>
                <th className="py-3 px-3 w-32">科目</th>
                <th className="py-3 px-3">摘要・メモ</th>
                <th className="py-3 px-3 w-28 text-right">金額</th>
                <th className="py-3 px-3 w-24 text-center">ステータス</th>
                <th className="py-3 px-3 w-28 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400 font-medium">
                    該当する取引データがありません
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isSales = tx.type === 'sales';
                  const isSelected = selectedIds.has(tx.id);

                  return (
                    <tr 
                      key={tx.id} 
                      className={`hover:bg-indigo-50/20 transition-colors ${isSelected ? 'bg-indigo-50/40' : ''}`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(tx.id)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>

                      <td className="py-3 px-3 font-mono text-gray-700">
                        {tx.date_from === tx.date_to || !tx.date_to ? (
                          <span>{tx.date_from}</span>
                        ) : (
                          <span className="text-[11px] leading-tight block">
                            {tx.date_from}<br />〜{tx.date_to}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                          isSales ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isSales ? '売上' : '経費'}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[11px] font-medium">
                          {getGranularityLabel(tx.granularity)}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-bold text-gray-900">
                        {tx.category}
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-medium text-gray-800">{tx.description}</div>
                        {tx.memo && (
                          <div className="text-[11px] text-gray-400 truncate max-w-xs">{tx.memo}</div>
                        )}
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-400">
                          <span>{tx.payment_method}</span>
                          <span>•</span>
                          <span>{getSourceTypeLabel(tx.source_type)}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-sm">
                        <span className={isSales ? 'text-emerald-700' : 'text-amber-800'}>
                          {formatCurrency(tx.amount)}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => onToggleConfirm(tx.id)}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 mx-auto transition-all ${
                            tx.confirmed
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
                          }`}
                        >
                          {tx.confirmed ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              確認済
                            </>
                          ) : (
                            <>
                              <CircleAlert className="w-3 h-3 text-rose-500" />
                              未確認
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {onQuoteInChat && (
                            <button
                              type="button"
                              onClick={() => onQuoteInChat(tx)}
                              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="チャットに引用"
                            >
                              <MessageSquareShare className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onDuplicate(tx)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="複製"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onEdit(tx)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="編集"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(tx.id)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="削除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
