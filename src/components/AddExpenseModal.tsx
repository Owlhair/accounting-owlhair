import React, { useState } from 'react';
import { Transaction, AppSettings } from '../types';
import { formatCurrency } from '../utils/calculations';
import { X, Plus, Trash2, Tag, Sparkles, Check, AlertCircle, Store } from 'lucide-react';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTransactions: (transactions: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>[]) => void;
  settings: AppSettings;
  onAddCategory: (category: string, type: 'sales' | 'expense') => void;
  defaultMonth?: string;
}

type InputMode = 'monthly_bulk' | 'receipt_batch' | 'single';

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  onAddTransactions,
  settings,
  onAddCategory,
  defaultMonth = '2025-08',
}) => {
  const [mode, setMode] = useState<InputMode>('monthly_bulk');
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedStore, setSelectedStore] = useState(settings.stores[0] || '本店');
  const [paymentMethod, setPaymentMethod] = useState('クレジットカード');
  const [memo, setMemo] = useState('');
  const [confirmed, setConfirmed] = useState(true);
  const [newCatInput, setNewCatInput] = useState('');
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Mode 1: Monthly bulk default rows for expenses
  const [monthlyRows, setMonthlyRows] = useState<Array<{ category: string; amount: string; paymentMethod: string; store: string }>>([
    { category: '地代家賃', amount: '250000', paymentMethod: '銀行振込', store: settings.stores[0] || '本店' },
    { category: '仕入', amount: '145000', paymentMethod: 'クレジットカード', store: settings.stores[0] || '本店' },
    { category: '水道光熱費', amount: '48000', paymentMethod: 'クレジットカード', store: settings.stores[0] || '本店' },
    { category: '消耗品費', amount: '30000', paymentMethod: 'クレジットカード', store: settings.stores[0] || '本店' },
    { category: '通信費', amount: '15000', paymentMethod: 'クレジットカード', store: settings.stores[0] || '本店' },
    { category: '旅費交通費', amount: '', paymentMethod: '現金', store: '全社共通' },
    { category: '広告宣伝費', amount: '', paymentMethod: 'クレジットカード', store: settings.stores[0] || '本店' },
    { category: '外注費', amount: '', paymentMethod: '銀行振込', store: '全社共通' },
    { category: 'その他', amount: '', paymentMethod: '現金', store: settings.stores[0] || '本店' },
  ]);

  // Mode 2: Receipt / Daily list
  const [receiptRows, setReceiptRows] = useState<Array<{ date: string; storeName: string; store: string; category: string; amount: string; paymentMethod: string }>>([
    { date: `${defaultMonth}-10`, storeName: 'ホームセンター', store: settings.stores[0] || '本店', category: '消耗品費', amount: '12800', paymentMethod: '現金' },
    { date: `${defaultMonth}-12`, storeName: 'JR東日本', store: '全社共通', category: '旅費交通費', amount: '3500', paymentMethod: 'クレジットカード' },
    { date: `${defaultMonth}-18`, storeName: 'カフェ打合せ', store: '全社共通', category: 'その他', amount: '1200', paymentMethod: '現金' },
  ]);

  // Mode 3: Single receipt
  const [singleDate, setSingleDate] = useState(`${defaultMonth}-15`);
  const [singleStore, setSingleStore] = useState(settings.stores[0] || '本店');
  const [singleCategory, setSingleCategory] = useState('消耗品費');
  const [singlePaymentMethod, setSinglePaymentMethod] = useState('クレジットカード');
  const [singleAmount, setSingleAmount] = useState('12800');
  const [singleDescription, setSingleDescription] = useState('');
  const [singleVendor, setSingleVendor] = useState('ホームセンター');

  if (!isOpen) return null;

  // Compute live total for Mode 1
  const monthlyTotal = monthlyRows.reduce((sum, r) => {
    const val = Number(r.amount.replace(/,/g, '')) || 0;
    return sum + val;
  }, 0);

  // Compute live total for Mode 2
  const receiptTotal = receiptRows.reduce((sum, r) => {
    const val = Number(r.amount.replace(/,/g, '')) || 0;
    return sum + val;
  }, 0);

  const handleAddNewCategory = () => {
    if (!newCatInput.trim()) return;
    onAddCategory(newCatInput.trim(), 'expense');
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

      if (mode === 'monthly_bulk') {
        const validRows = monthlyRows.filter(r => Number(r.amount.replace(/,/g, '')) > 0);
        if (validRows.length === 0) {
          setErrorMessage('少なくとも1つの経費科目に金額を入力してください。');
          return;
        }

        validRows.forEach(r => {
          itemsToAdd.push({
            date_from: dateFrom,
            date_to: dateTo,
            type: 'expense',
            category: r.category,
            store: r.store || selectedStore,
            amount: Number(r.amount.replace(/,/g, '')),
            payment_method: r.paymentMethod || paymentMethod,
            granularity: 'monthly',
            description: `${r.store || selectedStore} ${selectedMonth} ${r.category}（月まとめ）`,
            memo: memo || '月次経費まとめ入力',
            source_type: 'manual',
            confirmed,
          });
        });
      } else if (mode === 'receipt_batch') {
        const validRows = receiptRows.filter(r => Number(r.amount.replace(/,/g, '')) > 0 && r.date);
        if (validRows.length === 0) {
          setErrorMessage('有効な領収書・明細行がありません。日付と金額を入力してください。');
          return;
        }

        validRows.forEach(r => {
          itemsToAdd.push({
            date_from: r.date,
            date_to: r.date,
            type: 'expense',
            category: r.category,
            store: r.store || selectedStore,
            amount: Number(r.amount.replace(/,/g, '')),
            payment_method: r.paymentMethod,
            granularity: 'transaction',
            description: r.storeName ? `${r.storeName} (${r.category})` : `${r.date} ${r.category}`,
            memo: r.storeName ? `支払先: ${r.storeName}` : '',
            source_type: 'receipt',
            confirmed,
          });
        });
      } else if (mode === 'single') {
        const amt = Number(singleAmount.replace(/,/g, ''));
        if (isNaN(amt) || amt <= 0) {
          setErrorMessage('有効な金額（1円以上）を入力してください。');
          return;
        }
        if (!singleDate) {
          setErrorMessage('日付を入力してください。');
          return;
        }

        itemsToAdd.push({
          date_from: singleDate,
          date_to: singleDate,
          type: 'expense',
          category: singleCategory,
          store: singleStore,
          amount: amt,
          payment_method: singlePaymentMethod,
          granularity: 'transaction',
          description: singleDescription || (singleVendor ? `${singleVendor} (${singleCategory})` : `${singleDate} ${singleCategory}`),
          memo: singleVendor ? `支払先: ${singleVendor}` : memo,
          source_type: 'receipt',
          confirmed,
        });
      }

      onAddTransactions(itemsToAdd);
      onClose();
    } catch (err: any) {
      setErrorMessage('保存時にエラーが発生しました: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-amber-100 max-w-2xl w-full my-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-slate-50 p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                経費の一括 / 単体登録
                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                  店舗・決済種別対応
                </span>
              </h2>
              <p className="text-xs text-gray-500">
                月間の科目別まとめや領収書など、手元の領収書・通帳に合わせて入力できます
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="bg-gray-50/70 px-6 pt-3 border-b border-gray-100 flex gap-2 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setMode('monthly_bulk')}
            className={`px-3.5 py-2 rounded-t-xl font-bold transition-all border-b-2 whitespace-nowrap ${
              mode === 'monthly_bulk'
                ? 'bg-white text-amber-700 border-amber-600 shadow-xs'
                : 'text-gray-500 hover:text-gray-800 border-transparent'
            }`}
          >
            📊 科目別月次まとめ
          </button>
          <button
            type="button"
            onClick={() => setMode('receipt_batch')}
            className={`px-3.5 py-2 rounded-t-xl font-bold transition-all border-b-2 whitespace-nowrap ${
              mode === 'receipt_batch'
                ? 'bg-white text-amber-700 border-amber-600 shadow-xs'
                : 'text-gray-500 hover:text-gray-800 border-transparent'
            }`}
          >
            🧾 領収書・明細まとめ
          </button>
          <button
            type="button"
            onClick={() => setMode('single')}
            className={`px-3.5 py-2 rounded-t-xl font-bold transition-all border-b-2 whitespace-nowrap ${
              mode === 'single'
                ? 'bg-white text-amber-700 border-amber-600 shadow-xs'
                : 'text-gray-500 hover:text-gray-800 border-transparent'
            }`}
          >
            ✏️ 個別経費入力
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* MODE 1: MONTHLY BULK */}
          {mode === 'monthly_bulk' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gray-50/80 p-3.5 rounded-2xl border border-gray-200/80">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">対象年月</label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full text-xs font-bold font-mono px-2.5 py-1.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1 flex items-center gap-1">
                    <Store className="w-3 h-3 text-indigo-600" />
                    デフォルト店舗
                  </label>
                  <select
                    value={selectedStore}
                    onChange={(e) => setSelectedStore(e.target.value)}
                    className="w-full text-xs font-bold px-2.5 py-1.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  >
                    {settings.stores.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">基本支払方法</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full text-xs font-bold px-2.5 py-1.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  >
                    {settings.paymentMethods.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-600" />
                    経費科目ごとの金額（入力した項目のみ登録されます）
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddingCat(true)}
                    className="text-xs text-amber-700 hover:text-amber-800 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    経費科目を追加
                  </button>
                </div>

                {isAddingCat && (
                  <div className="flex gap-2 mb-3 p-2 bg-amber-50 rounded-xl border border-amber-200 animate-in fade-in">
                    <input
                      type="text"
                      placeholder="新しい経費科目（例: 会議費, 研修費）"
                      value={newCatInput}
                      onChange={(e) => setNewCatInput(e.target.value)}
                      className="text-xs px-2.5 py-1.5 border rounded bg-white flex-1 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={handleAddNewCategory}
                      className="px-3 py-1.5 bg-amber-600 text-white rounded text-xs font-bold"
                    >
                      追加
                    </button>
                  </div>
                )}

                <div className="space-y-2 border border-gray-200 rounded-2xl p-3 bg-white max-h-64 overflow-y-auto">
                  {monthlyRows.map((row, idx) => (
                    <div key={row.category} className="flex items-center gap-2">
                      <span className="w-24 text-xs font-bold text-gray-700 truncate">{row.category}</span>
                      <select
                        value={row.store || selectedStore}
                        onChange={(e) => {
                          const next = [...monthlyRows];
                          next[idx].store = e.target.value;
                          setMonthlyRows(next);
                        }}
                        className="w-24 px-2 py-1 text-[11px] bg-gray-50 border border-gray-200 rounded-lg"
                      >
                        {settings.stores.map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={row.amount ? Number(row.amount.replace(/,/g, '')).toLocaleString() : ''}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9]/g, '');
                            const next = [...monthlyRows];
                            next[idx].amount = raw;
                            setMonthlyRows(next);
                          }}
                          className="w-full px-2.5 py-1 text-right font-mono font-bold text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-amber-500"
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

                <div className="mt-2.5 flex items-center justify-between p-2.5 bg-amber-50/80 rounded-xl text-xs font-bold text-amber-950">
                  <span>月次経費合計:</span>
                  <span className="font-mono text-sm">{formatCurrency(monthlyTotal)}</span>
                </div>
              </div>
            </div>
          )}

          {/* MODE 2: RECEIPT BATCH */}
          {mode === 'receipt_batch' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">領収書・明細一覧</span>
                <button
                  type="button"
                  onClick={() => setReceiptRows([...receiptRows, {
                    date: `${selectedMonth}-01`,
                    storeName: '',
                    store: selectedStore,
                    category: settings.expenseCategories[0] || '消耗品費',
                    amount: '',
                    paymentMethod: 'クレジットカード'
                  }])}
                  className="px-2.5 py-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  行を追加
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {receiptRows.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs">
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) => {
                        const next = [...receiptRows];
                        next[idx].date = e.target.value;
                        setReceiptRows(next);
                      }}
                      className="w-28 px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-mono"
                    />
                    <select
                      value={row.store}
                      onChange={(e) => {
                        const next = [...receiptRows];
                        next[idx].store = e.target.value;
                        setReceiptRows(next);
                      }}
                      className="w-20 px-2 py-1 bg-white border border-gray-200 rounded-lg text-[11px]"
                    >
                      {settings.stores.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="支払先（例: ホームセンター）"
                      value={row.storeName}
                      onChange={(e) => {
                        const next = [...receiptRows];
                        next[idx].storeName = e.target.value;
                        setReceiptRows(next);
                      }}
                      className="w-28 px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs"
                    />
                    <select
                      value={row.category}
                      onChange={(e) => {
                        const next = [...receiptRows];
                        next[idx].category = e.target.value;
                        setReceiptRows(next);
                      }}
                      className="w-24 px-2 py-1 bg-white border border-gray-200 rounded-lg text-[11px]"
                    >
                      {settings.expenseCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="金額"
                      value={row.amount ? Number(row.amount.replace(/,/g, '')).toLocaleString() : ''}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        const next = [...receiptRows];
                        next[idx].amount = raw;
                        setReceiptRows(next);
                      }}
                      className="w-24 px-2 py-1 text-right font-mono font-bold bg-white border border-gray-200 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setReceiptRows(receiptRows.filter((_, i) => i !== idx))}
                      className="p-1 text-gray-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MODE 3: SINGLE EXPENSE */}
          {mode === 'single' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">取引日</label>
                  <input
                    type="date"
                    value={singleDate}
                    onChange={(e) => setSingleDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold font-mono focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">店舗・部門</label>
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
                  <label className="block text-xs font-bold text-gray-700 mb-1">経費科目</label>
                  <select
                    value={singleCategory}
                    onChange={(e) => setSingleCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:bg-white"
                  >
                    {settings.expenseCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">決済方法</label>
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
                <label className="block text-xs font-bold text-gray-700 mb-1">金額</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="例: 12,800"
                    value={singleAmount ? Number(singleAmount.replace(/,/g, '')).toLocaleString() : ''}
                    onChange={(e) => setSingleAmount(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full px-3 py-2.5 text-base font-bold font-mono bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs font-bold text-gray-400">円</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">支払先 / 購入店</label>
                <input
                  type="text"
                  placeholder="例: ホームセンター、JR東日本、NTT東日本など"
                  value={singleVendor}
                  onChange={(e) => setSingleVendor(e.target.value)}
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
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-gray-300"
              />
              <span className="text-xs font-bold text-gray-700">
                確認済（レシート精算済）として登録
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
                className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                経費を登録する
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
