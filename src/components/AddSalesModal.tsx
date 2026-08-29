import React, { useState } from 'react';
import { Transaction, AppSettings } from '../types';
import { formatCurrency, formatNumber } from '../utils/calculations';
import { X, Plus, Trash2, Calendar, Tag, CreditCard, Sparkles, Check, AlertCircle, Store, Coins } from 'lucide-react';

interface AddSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTransactions: (transactions: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>[]) => void;
  settings: AppSettings;
  onAddCategory: (category: string, type: 'sales' | 'expense') => void;
  defaultMonth?: string;
}

type InputMode = 'store_breakdown' | 'monthly_bulk' | 'daily_batch' | 'single';

export const AddSalesModal: React.FC<AddSalesModalProps> = ({
  isOpen,
  onClose,
  onAddTransactions,
  settings,
  onAddCategory,
  defaultMonth = '2025-08',
}) => {
  const [mode, setMode] = useState<InputMode>('store_breakdown');
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedStore, setSelectedStore] = useState(settings.stores[0] || '本店');
  const [selectedCategory, setSelectedCategory] = useState(settings.salesCategories[0] || '技術売上');
  const [paymentMethod, setPaymentMethod] = useState('クレジットカード');
  const [memo, setMemo] = useState('');
  const [confirmed, setConfirmed] = useState(true);
  const [newCatInput, setNewCatInput] = useState('');
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Mode 0: Store breakdown (売上の種別: 店舗 × 決済種別[現金, クレジット, QR, ポイント, その他] またはカテゴリ別)
  const [breakdownRows, setBreakdownRows] = useState<Array<{ paymentMethod: string; amount: string; memo: string }>>([
    { paymentMethod: 'クレジットカード', amount: '650000', memo: '' },
    { paymentMethod: '現金', amount: '250000', memo: '' },
    { paymentMethod: 'QR決済', amount: '120000', memo: '' },
    { paymentMethod: 'ポイント', amount: '30000', memo: '' },
    { paymentMethod: '銀行振込', amount: '', memo: '' },
  ]);

  // Mode 1: Monthly bulk state (Category-wise matrix)
  const [monthlyRows, setMonthlyRows] = useState<Array<{ category: string; amount: string; paymentMethod: string; store: string }>>([
    { category: '技術売上', amount: '850000', paymentMethod: 'クレジットカード', store: settings.stores[0] || '本店' },
    { category: '商品売上', amount: '120000', paymentMethod: 'クレジットカード', store: settings.stores[0] || '本店' },
    { category: 'その他売上', amount: '30000', paymentMethod: '銀行振込', store: '全社共通' },
  ]);

  // Mode 2: Daily batch rows
  const [dailyRows, setDailyRows] = useState<Array<{ date: string; store: string; category: string; amount: string; paymentMethod: string; memo: string }>>([
    { date: `${defaultMonth}-01`, store: settings.stores[0] || '本店', category: '技術売上', amount: '35000', paymentMethod: '現金', memo: '' },
    { date: `${defaultMonth}-02`, store: settings.stores[0] || '本店', category: '技術売上', amount: '42000', paymentMethod: 'クレジットカード', memo: '' },
    { date: `${defaultMonth}-03`, store: settings.stores[0] || '本店', category: '商品売上', amount: '10000', paymentMethod: 'QR決済', memo: '' },
  ]);

  // Mode 3: Single custom state
  const [singleDate, setSingleDate] = useState(`${defaultMonth}-15`);
  const [singleStore, setSingleStore] = useState(settings.stores[0] || '本店');
  const [singleCategory, setSingleCategory] = useState(settings.salesCategories[0] || '技術売上');
  const [singlePaymentMethod, setSinglePaymentMethod] = useState('クレジットカード');
  const [singleAmount, setSingleAmount] = useState('');
  const [singleDescription, setSingleDescription] = useState('');

  if (!isOpen) return null;

  // Compute live total for Mode 0 (Store Breakdown)
  const breakdownTotal = breakdownRows.reduce((sum, r) => {
    const val = Number(r.amount.replace(/,/g, '')) || 0;
    return sum + val;
  }, 0);

  // Compute live total for Mode 1
  const monthlyTotal = monthlyRows.reduce((sum, r) => {
    const val = Number(r.amount.replace(/,/g, '')) || 0;
    return sum + val;
  }, 0);

  // Compute live total for Mode 2
  const dailyTotal = dailyRows.reduce((sum, r) => {
    const val = Number(r.amount.replace(/,/g, '')) || 0;
    return sum + val;
  }, 0);

  const handleAddNewCategory = () => {
    if (!newCatInput.trim()) return;
    onAddCategory(newCatInput.trim(), 'sales');
    if (mode === 'monthly_bulk') {
      setMonthlyRows([...monthlyRows, { category: newCatInput.trim(), amount: '', paymentMethod, store: selectedStore }]);
    }
    setNewCatInput('');
    setIsAddingCat(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    try {
      const itemsToAdd: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>[] = [];
      const [y, m] = selectedMonth.split('-');
      const lastDay = new Date(Number(y), Number(m), 0).getDate();
      const dateFrom = `${selectedMonth}-01`;
      const dateTo = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;

      if (mode === 'store_breakdown') {
        const validRows = breakdownRows.filter(r => Number(r.amount.replace(/,/g, '')) > 0);
        if (validRows.length === 0) {
          setErrorMessage('少なくとも1つの決済種別に金額を入力してください。');
          return;
        }

        validRows.forEach(r => {
          const amt = Number(r.amount.replace(/,/g, ''));
          itemsToAdd.push({
            date_from: dateFrom,
            date_to: dateTo,
            type: 'sales',
            category: selectedCategory,
            store: selectedStore,
            amount: amt,
            payment_method: r.paymentMethod,
            granularity: 'monthly',
            description: `${selectedStore} ${selectedMonth} ${selectedCategory} (${r.paymentMethod})`,
            memo: r.memo || memo || `${selectedStore}売上（決済別内訳）`,
            source_type: 'manual',
            confirmed,
          });
        });
      } else if (mode === 'monthly_bulk') {
        const validRows = monthlyRows.filter(r => Number(r.amount.replace(/,/g, '')) > 0);
        if (validRows.length === 0) {
          setErrorMessage('少なくとも1つのカテゴリに金額を入力してください。');
          return;
        }

        validRows.forEach(r => {
          itemsToAdd.push({
            date_from: dateFrom,
            date_to: dateTo,
            type: 'sales',
            category: r.category,
            store: r.store || selectedStore,
            amount: Number(r.amount.replace(/,/g, '')),
            payment_method: r.paymentMethod || paymentMethod,
            granularity: 'monthly',
            description: `${r.store || selectedStore} ${selectedMonth} ${r.category}（月まとめ）`,
            memo: memo || '月次売上まとめ入力',
            source_type: 'manual',
            confirmed,
          });
        });
      } else if (mode === 'daily_batch') {
        const validRows = dailyRows.filter(r => Number(r.amount.replace(/,/g, '')) > 0 && r.date);
        if (validRows.length === 0) {
          setErrorMessage('有効な日別売上行がありません。日付と金額を入力してください。');
          return;
        }

        validRows.forEach(r => {
          itemsToAdd.push({
            date_from: r.date,
            date_to: r.date,
            type: 'sales',
            category: r.category,
            store: r.store || selectedStore,
            amount: Number(r.amount.replace(/,/g, '')),
            payment_method: r.paymentMethod,
            granularity: 'daily',
            description: `${r.store || selectedStore} ${r.date} ${r.category}`,
            memo: r.memo || '日別まとめ入力',
            source_type: 'manual',
            confirmed,
          });
        });
      } else if (mode === 'single') {
        const amt = Number(singleAmount.replace(/,/g, ''));
        if (isNaN(amt) || amt <= 0) {
          setErrorMessage('有効な金額（1円以上）を入力してください。');
          return;
        }

        itemsToAdd.push({
          date_from: singleDate,
          date_to: singleDate,
          type: 'sales',
          category: singleCategory,
          store: singleStore,
          amount: amt,
          payment_method: singlePaymentMethod,
          granularity: 'transaction',
          description: singleDescription.trim() || `${singleStore} ${singleCategory} (${singlePaymentMethod})`,
          memo: memo || '',
          source_type: 'manual',
          confirmed,
        });
      }

      onAddTransactions(itemsToAdd);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || '登録中にエラーが発生しました。');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-gray-150 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-emerald-50/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                売上の一括 / 単体登録
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  店舗・決済種別対応
                </span>
              </h2>
              <p className="text-xs text-gray-500">
                店舗別・決済種別（現金/クレジット/QR/ポイント等）ごとの売上を素早く計上
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Mode Tabs */}
        <div className="px-6 pt-3 bg-gray-50/70 border-b border-gray-100 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setMode('store_breakdown')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
              mode === 'store_breakdown'
                ? 'bg-white text-emerald-700 border-emerald-600 shadow-xs'
                : 'text-gray-500 hover:text-gray-800 border-transparent'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            店舗 × 決済種別内訳（推奨）
          </button>

          <button
            type="button"
            onClick={() => setMode('monthly_bulk')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
              mode === 'monthly_bulk'
                ? 'bg-white text-emerald-700 border-emerald-600 shadow-xs'
                : 'text-gray-500 hover:text-gray-800 border-transparent'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            カテゴリ別月次まとめ
          </button>

          <button
            type="button"
            onClick={() => setMode('daily_batch')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
              mode === 'daily_batch'
                ? 'bg-white text-emerald-700 border-emerald-600 shadow-xs'
                : 'text-gray-500 hover:text-gray-800 border-transparent'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            日別明細入力
          </button>

          <button
            type="button"
            onClick={() => setMode('single')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
              mode === 'single'
                ? 'bg-white text-emerald-700 border-emerald-600 shadow-xs'
                : 'text-gray-500 hover:text-gray-800 border-transparent'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            単発売上（その他売上等）
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Mode 0: Store × Payment breakdown */}
          {mode === 'store_breakdown' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gray-50/80 p-3.5 rounded-2xl border border-gray-200/80">
                {/* Target Month */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    対象月 (YYYY-MM)
                  </label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Target Store */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1 flex items-center gap-1">
                    <Store className="w-3 h-3 text-indigo-600" />
                    対象店舗
                  </label>
                  <select
                    value={selectedStore}
                    onChange={(e) => setSelectedStore(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  >
                    {settings.stores.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    売上カテゴリ
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  >
                    {settings.salesCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Payment Methods Input Matrix */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                    決済種別ごとの月次売上内訳
                  </span>
                  <span className="text-[11px] font-normal text-gray-500">
                    該当しない項目は空欄または0でOK
                  </span>
                </div>

                <div className="space-y-2 border border-gray-200 rounded-2xl p-3 bg-white">
                  {breakdownRows.map((row, idx) => (
                    <div key={row.paymentMethod} className="flex items-center gap-2.5">
                      <div className="w-28 text-xs font-bold text-gray-700 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          row.paymentMethod === '現金' ? 'bg-emerald-500' :
                          row.paymentMethod === 'クレジットカード' ? 'bg-blue-500' :
                          row.paymentMethod === 'QR決済' ? 'bg-amber-500' :
                          row.paymentMethod === 'ポイント' ? 'bg-purple-500' : 'bg-gray-400'
                        }`} />
                        <span>{row.paymentMethod}</span>
                      </div>

                      <div className="flex-1 relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={row.amount ? Number(row.amount.replace(/,/g, '')).toLocaleString() : ''}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9]/g, '');
                            const next = [...breakdownRows];
                            next[idx].amount = raw;
                            setBreakdownRows(next);
                          }}
                          className="w-full px-3 py-1.5 text-right font-mono font-bold text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        />
                        <span className="absolute right-2.5 top-1.5 text-[11px] font-bold text-gray-400 pointer-events-none">
                          円
                        </span>
                      </div>

                      <input
                        type="text"
                        placeholder="メモ (任意)"
                        value={row.memo}
                        onChange={(e) => {
                          const next = [...breakdownRows];
                          next[idx].memo = e.target.value;
                          setBreakdownRows(next);
                        }}
                        className="w-36 px-2.5 py-1.5 text-[11px] bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  ))}
                </div>

                {/* Breakdown Total Bar */}
                <div className="flex items-center justify-between p-3 bg-emerald-50/70 border border-emerald-150 rounded-2xl">
                  <span className="text-xs font-bold text-emerald-950">
                    {selectedStore} {selectedMonth} 合計売上高:
                  </span>
                  <span className="text-sm font-bold font-mono text-emerald-700">
                    {formatCurrency(breakdownTotal)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Mode 1: Monthly Category Bulk */}
          {mode === 'monthly_bulk' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50/80 p-3 rounded-2xl border border-gray-200">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    対象月
                  </label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    デフォルト店舗
                  </label>
                  <select
                    value={selectedStore}
                    onChange={(e) => setSelectedStore(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold"
                  >
                    {settings.stores.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold text-gray-700">カテゴリ別売上</div>
                <div className="space-y-2 border border-gray-200 rounded-2xl p-3 bg-white">
                  {monthlyRows.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-24 text-xs font-bold text-gray-700 truncate">{row.category}</span>
                      <select
                        value={row.store || selectedStore}
                        onChange={(e) => {
                          const next = [...monthlyRows];
                          next[idx].store = e.target.value;
                          setMonthlyRows(next);
                        }}
                        className="w-24 px-2 py-1 text-[11px] font-medium bg-gray-50 border border-gray-200 rounded-lg"
                      >
                        {settings.stores.map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          placeholder="0"
                          value={row.amount ? Number(row.amount.replace(/,/g, '')).toLocaleString() : ''}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9]/g, '');
                            const next = [...monthlyRows];
                            next[idx].amount = raw;
                            setMonthlyRows(next);
                          }}
                          className="w-full px-2.5 py-1 text-right font-mono font-bold text-xs bg-gray-50 border border-gray-200 rounded-lg"
                        />
                      </div>
                      <select
                        value={row.paymentMethod}
                        onChange={(e) => {
                          const next = [...monthlyRows];
                          next[idx].paymentMethod = e.target.value;
                          setMonthlyRows(next);
                        }}
                        className="w-28 px-2 py-1 text-[11px] bg-gray-50 border border-gray-200 rounded-lg"
                      >
                        {settings.paymentMethods.map(pm => (
                          <option key={pm} value={pm}>{pm}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between p-2.5 bg-emerald-50 rounded-xl text-xs font-bold text-emerald-900">
                  <span>月次合計:</span>
                  <span className="font-mono">{formatCurrency(monthlyTotal)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Mode 2: Daily Batch */}
          {mode === 'daily_batch' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">日別売上明細</span>
                <button
                  type="button"
                  onClick={() => setDailyRows([...dailyRows, {
                    date: `${selectedMonth}-01`,
                    store: selectedStore,
                    category: settings.salesCategories[0] || '技術売上',
                    amount: '',
                    paymentMethod: '現金',
                    memo: ''
                  }])}
                  className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  行を追加
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {dailyRows.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs">
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) => {
                        const next = [...dailyRows];
                        next[idx].date = e.target.value;
                        setDailyRows(next);
                      }}
                      className="w-32 px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-mono"
                    />
                    <select
                      value={row.store}
                      onChange={(e) => {
                        const next = [...dailyRows];
                        next[idx].store = e.target.value;
                        setDailyRows(next);
                      }}
                      className="w-24 px-2 py-1 bg-white border border-gray-200 rounded-lg text-[11px]"
                    >
                      {settings.stores.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                    <select
                      value={row.category}
                      onChange={(e) => {
                        const next = [...dailyRows];
                        next[idx].category = e.target.value;
                        setDailyRows(next);
                      }}
                      className="w-24 px-2 py-1 bg-white border border-gray-200 rounded-lg text-[11px]"
                    >
                      {settings.salesCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="金額"
                      value={row.amount ? Number(row.amount.replace(/,/g, '')).toLocaleString() : ''}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        const next = [...dailyRows];
                        next[idx].amount = raw;
                        setDailyRows(next);
                      }}
                      className="w-24 px-2 py-1 text-right font-mono font-bold bg-white border border-gray-200 rounded-lg"
                    />
                    <select
                      value={row.paymentMethod}
                      onChange={(e) => {
                        const next = [...dailyRows];
                        next[idx].paymentMethod = e.target.value;
                        setDailyRows(next);
                      }}
                      className="w-28 px-2 py-1 bg-white border border-gray-200 rounded-lg text-[11px]"
                    >
                      {settings.paymentMethods.map(pm => (
                        <option key={pm} value={pm}>{pm}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setDailyRows(dailyRows.filter((_, i) => i !== idx))}
                      className="p-1 text-gray-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mode 3: Single Transaction (その他売上等) */}
          {mode === 'single' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    取引日
                  </label>
                  <input
                    type="date"
                    value={singleDate}
                    onChange={(e) => setSingleDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold font-mono focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    店舗・部門
                  </label>
                  <select
                    value={singleStore}
                    onChange={(e) => setSingleStore(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:bg-white"
                  >
                    {settings.stores.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    カテゴリ
                  </label>
                  <select
                    value={singleCategory}
                    onChange={(e) => setSingleCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:bg-white"
                  >
                    {settings.salesCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    決済方法
                  </label>
                  <select
                    value={singlePaymentMethod}
                    onChange={(e) => setSinglePaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:bg-white"
                  >
                    {settings.paymentMethods.map(pm => (
                      <option key={pm} value={pm}>{pm}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  売上金額
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="例: 50,000"
                    value={singleAmount ? Number(singleAmount.replace(/,/g, '')).toLocaleString() : ''}
                    onChange={(e) => setSingleAmount(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full px-3 py-2.5 text-base font-bold font-mono bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs font-bold text-gray-400">円</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  内容・説明
                </label>
                <input
                  type="text"
                  placeholder="例: 外部セミナー講師料、自動販売機手数料など"
                  value={singleDescription}
                  onChange={(e) => setSingleDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white"
                />
              </div>
            </div>
          )}

          {/* Confirm Status Checkbox */}
          <div className="pt-2 flex items-center justify-between border-t border-gray-100">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300"
              />
              <span className="text-xs font-bold text-gray-700">
                確認済（レジ締め・確定済データ）として登録
              </span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                売上を登録する
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
