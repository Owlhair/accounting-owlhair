import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
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
  Calendar,
  CheckCheck,
  MessageSquareShare
} from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  availableMonths: string[];
  onEdit: (tx: Transaction) => void;
  onDuplicate: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  onToggleConfirm: (id: string) => void;
  onBulkConfirm: (ids: string[]) => void;
  onOpenAddSales: () => void;
  onOpenAddExpense: () => void;
  onExportCsv: () => void;
  onQuoteInChat?: (tx: Transaction) => void;
}

type FilterType = 'all' | 'sales' | 'expense' | 'unconfirmed';

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  selectedMonth,
  onSelectMonth,
  availableMonths,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleConfirm,
  onBulkConfirm,
  onOpenAddSales,
  onOpenAddExpense,
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
      // Month filter
      if (selectedMonth !== 'ALL') {
        const m1 = tx.date_from ? tx.date_from.substring(0, 7) : '';
        const m2 = tx.date_to ? tx.date_to.substring(0, 7) : '';
        if (m1 !== selectedMonth && m2 !== selectedMonth) {
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
  }, [transactions, selectedMonth, filterType, granularityFilter, searchQuery]);

  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredTransactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTransactions.map(t => t.id)));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleBulkConfirmClick = () => {
    if (selectedIds.size === 0) return;
    onBulkConfirm(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-gray-200/80 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Main Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-gray-100/80 rounded-xl overflow-x-auto">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                filterType === 'all'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              すべて ({transactions.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('sales')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                filterType === 'sales'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              売上のみ ({transactions.filter(t => t.type === 'sales').length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('expense')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                filterType === 'expense'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-800 hover:bg-amber-50'
              }`}
            >
              経費のみ ({transactions.filter(t => t.type === 'expense').length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('unconfirmed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
                filterType === 'unconfirmed'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              <CircleAlert className="w-3.5 h-3.5" />
              未確認 ({transactions.filter(t => !t.confirmed).length})
            </button>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={onOpenAddSales}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              売上追加
            </button>
            <button
              type="button"
              onClick={onOpenAddExpense}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              経費追加
            </button>
            <button
              type="button"
              onClick={onExportCsv}
              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
              title="CSVエクスポート"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Secondary Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          {/* Month selector */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
              <Calendar className="w-4 h-4" />
            </div>
            <select
              value={selectedMonth}
              onChange={(e) => onSelectMonth(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium text-gray-700"
            >
              <option value="ALL">全ての期間</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{m.replace('-', '年')}月</option>
              ))}
            </select>
          </div>

          {/* Granularity filter */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
              <Filter className="w-4 h-4" />
            </div>
            <select
              value={granularityFilter}
              onChange={(e) => setGranularityFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium text-gray-700"
            >
              <option value="ALL">全ての粒度 (月次/日別/個別)</option>
              <option value="monthly">月次集計 (monthly)</option>
              <option value="daily">日別集計 (daily)</option>
              <option value="period">期間集計 (period)</option>
              <option value="transaction">個別明細 (transaction)</option>
            </select>
          </div>

          {/* Search query */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="カテゴリ、内容、メモ、金額で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-gray-700"
            />
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl animate-in fade-in">
            <span className="text-xs font-bold text-indigo-900">
              {selectedIds.size} 件を選択中
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBulkConfirmClick}
                className="px-3 py-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                選択項目を確認済みにする
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transaction Table / List */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200/80 overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-sm font-medium">該当する取引データはありません</p>
            <p className="text-xs mt-1">「売上追加」または「経費追加」から登録してください</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-200">
                <tr>
                  <th className="p-3 w-8">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0}
                      onChange={handleToggleSelectAll}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="p-3">日付 / 期間</th>
                  <th className="p-3">区分</th>
                  <th className="p-3">カテゴリ</th>
                  <th className="p-3 text-right">金額</th>
                  <th className="p-3">決済方法</th>
                  <th className="p-3">入力粒度</th>
                  <th className="p-3">内容 / メモ</th>
                  <th className="p-3 text-center">状態</th>
                  <th className="p-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTransactions.map((tx) => {
                  const isSales = tx.type === 'sales';
                  const dateStr = tx.date_from === tx.date_to ? tx.date_from : `${tx.date_from} 〜 ${tx.date_to}`;
                  const isSelected = selectedIds.has(tx.id);

                  return (
                    <tr 
                      key={tx.id} 
                      className={`hover:bg-gray-50/80 transition-colors ${isSelected ? 'bg-indigo-50/40' : ''}`}
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(tx.id)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>

                      <td className="p-3 font-mono font-medium text-gray-700 whitespace-nowrap">
                        {dateStr}
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[11px] ${
                          isSales ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isSales ? '売上' : '経費'}
                        </span>
                      </td>

                      <td className="p-3 font-bold text-gray-900 whitespace-nowrap">
                        {tx.category}
                      </td>

                      <td className={`p-3 font-mono font-extrabold text-right whitespace-nowrap ${
                        isSales ? 'text-emerald-600' : 'text-amber-600'
                      }`}>
                        {formatCurrency(tx.amount)}
                      </td>

                      <td className="p-3 text-gray-600 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-700">
                          {tx.payment_method || '未設定'}
                        </span>
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <span className="text-[11px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                          {getGranularityLabel(tx.granularity)}
                        </span>
                      </td>

                      <td className="p-3 text-gray-600 max-w-xs truncate" title={tx.description || tx.memo || ''}>
                        <div className="font-medium text-gray-800 truncate">{tx.description || '-'}</div>
                        {tx.memo && <div className="text-[10px] text-gray-400 truncate">メモ: {tx.memo}</div>}
                      </td>

                      <td className="p-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onToggleConfirm(tx.id)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors ${
                            tx.confirmed
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                          }`}
                        >
                          {tx.confirmed ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>確認済</span>
                            </>
                          ) : (
                            <>
                              <CircleAlert className="w-3 h-3 text-rose-600" />
                              <span>未確認</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {onQuoteInChat && (
                            <button
                              type="button"
                              onClick={() => onQuoteInChat(tx)}
                              className="p-1 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                              title="チャットで相談・共有"
                            >
                              <MessageSquareShare className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onEdit(tx)}
                            className="p-1 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                            title="編集"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDuplicate(tx)}
                            className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="複製"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`この取引（${tx.category}: ${formatCurrency(tx.amount)}）を削除しますか？`)) {
                                onDelete(tx.id);
                              }
                            }}
                            className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                            title="削除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
