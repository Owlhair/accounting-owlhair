import React, { useState } from 'react';
import { Transaction, AppSettings } from '../types';
import { formatCurrency } from '../utils/calculations';
import { X, Plus, Trash2, Tag, Sparkles, Check, AlertCircle } from 'lucide-react';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTransactions: (transactions: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>[]) => void;
  settings: AppSettings;
  onAddCategory: (category: string, type: 'sales' | 'expense') => void;
  defaultMonth?: string;
}

type InputMode = 'monthly_bulk' | 'receipt_batch' | 'period_total' | 'single';

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
  const [paymentMethod, setPaymentMethod] = useState('クレジットカード');
  const [memo, setMemo] = useState('');
  const [confirmed, setConfirmed] = useState(true);
  const [newCatInput, setNewCatInput] = useState('');
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Mode 1: Monthly bulk default rows for expenses
  const [monthlyRows, setMonthlyRows] = useState<Array<{ category: string; amount: string; paymentMethod: string }>>([
    { category: '仕入', amount: '120000', paymentMethod: '銀行振込' },
    { category: '消耗品費', amount: '30000', paymentMethod: 'クレジットカード' },
    { category: '通信費', amount: '15000', paymentMethod: 'クレジットカード' },
    { category: '水道光熱費', amount: '', paymentMethod: '銀行振込' },
    { category: '地代家賃', amount: '', paymentMethod: '銀行振込' },
    { category: '旅費交通費', amount: '', paymentMethod: '現金' },
  ]);

  // Mode 2: Receipt / Daily list
  const [receiptRows, setReceiptRows] = useState<Array<{ date: string; store: string; category: string; amount: string; paymentMethod: string }>>([
    { date: `${defaultMonth}-10`, store: 'ホームセンター', category: '消耗品費', amount: '12800', paymentMethod: '現金' },
    { date: `${defaultMonth}-12`, store: 'JR東日本', category: '旅費交通費', amount: '3500', paymentMethod: 'クレジットカード' },
    { date: `${defaultMonth}-18`, store: 'カフェ打合せ', category: 'その他', amount: '1200', paymentMethod: '現金' },
  ]);

  // Mode 3: Period total
  const [periodDateFrom, setPeriodDateFrom] = useState(`${defaultMonth}-01`);
  const [periodDateTo, setPeriodDateTo] = useState(`${defaultMonth}-31`);
  const [periodCategory, setPeriodCategory] = useState('仕入');
  const [periodAmount, setPeriodAmount] = useState('200000');
  const [periodMemo, setPeriodMemo] = useState('請求書一括精算');

  // Mode 4: Single receipt
  const [singleDate, setSingleDate] = useState(`${defaultMonth}-15`);
  const [singleCategory, setSingleCategory] = useState('消耗品費');
  const [singleAmount, setSingleAmount] = useState('12800');
  const [singleDescription, setSingleDescription] = useState('ホームセンター 事務用品・工具');
  const [singleStore, setSingleStore] = useState('ホームセンター');

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
      setMonthlyRows([...monthlyRows, { category: newCatInput.trim(), amount: '', paymentMethod }]);
    }
    setNewCatInput('');
    setIsAddingCat(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    try {
      const itemsToAdd: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>[] = [];

      if (mode === 'monthly_bulk') {
        const validRows = monthlyRows.filter(r => Number(r.amount.replace(/,/g, '')) > 0);
        if (validRows.length === 0) {
          setErrorMessage('少なくとも1つの経費科目に金額を入力してください。');
          return;
        }

        const [y, m] = selectedMonth.split('-');
        const lastDay = new Date(Number(y), Number(m), 0).getDate();
        const dateFrom = `${selectedMonth}-01`;
        const dateTo = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;

        validRows.forEach(r => {
          itemsToAdd.push({
            date_from: dateFrom,
            date_to: dateTo,
            type: 'expense',
            category: r.category,
            amount: Number(r.amount.replace(/,/g, '')),
            payment_method: r.paymentMethod || paymentMethod,
            granularity: 'monthly',
            description: `${selectedMonth} ${r.category}（月まとめ）`,
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
            amount: Number(r.amount.replace(/,/g, '')),
            payment_method: r.paymentMethod,
            granularity: 'transaction',
            description: r.store ? `${r.store} ${r.category}` : `${r.date} ${r.category}`,
            memo: r.store ? `支払先: ${r.store}` : '',
            source_type: 'receipt',
            confirmed,
          });
        });
      } else if (mode === 'period_total') {
        const amt = Number(periodAmount.replace(/,/g, ''));
        if (isNaN(amt) || amt <= 0) {
          setErrorMessage('有効な金額（1円以上）を入力してください。');
          return;
        }
        if (!periodDateFrom || !periodDateTo) {
          setErrorMessage('開始日と終了日を正しく入力してください。');
          return;
        }

        itemsToAdd.push({
          date_from: periodDateFrom,
          date_to: periodDateTo,
          type: 'expense',
          category: periodCategory,
          amount: amt,
          payment_method: paymentMethod,
          granularity: 'period',
          description: `${periodDateFrom}〜${periodDateTo} ${periodCategory}`,
          memo: periodMemo,
          source_type: 'manual',
          confirmed,
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
          amount: amt,
          payment_method: paymentMethod,
          granularity: 'transaction',
          description: singleDescription || (singleStore ? `${singleStore} ${singleCategory}` : `${singleDate} ${singleCategory}`),
          memo: singleStore ? `店舗/支払先: ${singleStore}` : memo,
          source_type: 'receipt',
          confirmed,
        });
      }

      onAddTransactions(itemsToAdd);
      onClose();
    } catch (err) {
      setErrorMessage('保存時にエラーが発生しました: ' + (err as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-amber-100 max-w-2xl w-full my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-700 p-4 sm:p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/15 rounded-xl backdrop-blur-xs">
              <Sparkles className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">経費を追加する</h2>
              <p className="text-xs text-amber-100 mt-0.5">
                月間の科目別まとめや領収書など、手元の領収書・通帳に合わせて入力できます
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-amber-100 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="bg-amber-50/70 p-2 border-b border-amber-100 flex gap-1.5 overflow-x-auto text-xs sm:text-sm">
          <button
            type="button"
            onClick={() => setMode('monthly_bulk')}
            className={`px-3 py-2 rounded-lg font-medium transition-all shrink-0 ${
              mode === 'monthly_bulk'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-950 hover:bg-amber-100/70'
            }`}
          >
            📊 月まとめで入力（推奨）
          </button>
          <button
            type="button"
            onClick={() => setMode('receipt_batch')}
            className={`px-3 py-2 rounded-lg font-medium transition-all shrink-0 ${
              mode === 'receipt_batch'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-950 hover:bg-amber-100/70'
            }`}
          >
            🧾 領収書・明細まとめ
          </button>
          <button
            type="button"
            onClick={() => setMode('period_total')}
            className={`px-3 py-2 rounded-lg font-medium transition-all shrink-0 ${
              mode === 'period_total'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-950 hover:bg-amber-100/70'
            }`}
          >
            📑 期間・概算まとめ
          </button>
          <button
            type="button"
            onClick={() => setMode('single')}
            className={`px-3 py-2 rounded-lg font-medium transition-all shrink-0 ${
              mode === 'single'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-950 hover:bg-amber-100/70'
            }`}
          >
            ✏️ 個別領収書入力
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* MODE 1: MONTHLY BULK */}
          {mode === 'monthly_bulk' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-amber-50/40 p-3.5 rounded-xl border border-amber-100">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">対象年月</label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full text-sm px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">基本支払方法</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full text-sm px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
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
                  <div className="flex gap-2 mb-3 p-2 bg-amber-50 rounded-lg border border-amber-200 animate-in fade-in">
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
                      className="px-3 py-1.5 bg-amber-600 text-white rounded text-xs font-medium hover:bg-amber-700"
                    >
                      追加
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingCat(false)}
                      className="px-2 py-1.5 text-gray-500 text-xs hover:bg-gray-200 rounded"
                    >
                      キャンセル
                    </button>
                  </div>
                )}

                <div className="space-y-2">
                  {monthlyRows.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-50/70 p-2.5 rounded-xl border border-gray-200">
                      <div className="w-1/3 text-xs font-bold text-gray-800 truncate" title={row.category}>
                        {row.category}
                      </div>
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">¥</span>
                        <input
                          type="number"
                          placeholder="0"
                          min="0"
                          value={row.amount}
                          onChange={(e) => {
                            const newRows = [...monthlyRows];
                            newRows[idx].amount = e.target.value;
                            setMonthlyRows(newRows);
                          }}
                          className="w-full pl-6 pr-2 py-1.5 text-sm font-mono font-bold bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden text-right"
                        />
                      </div>
                      <select
                        value={row.paymentMethod}
                        onChange={(e) => {
                          const newRows = [...monthlyRows];
                          newRows[idx].paymentMethod = e.target.value;
                          setMonthlyRows(newRows);
                        }}
                        className="w-28 text-xs py-1.5 px-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                      >
                        {settings.paymentMethods.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setMonthlyRows(monthlyRows.filter((_, i) => i !== idx))}
                        className="text-gray-400 hover:text-rose-500 p-1"
                        title="行を削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex justify-start">
                  <button
                    type="button"
                    onClick={() => setMonthlyRows([...monthlyRows, { category: settings.expenseCategories[0] || '仕入', amount: '', paymentMethod }])}
                    className="text-xs font-medium text-amber-700 hover:text-amber-800 flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    別の科目を追加
                  </button>
                </div>

                {/* Live total display */}
                <div className="mt-3 p-3 bg-amber-100/70 rounded-xl border border-amber-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-950">
                    {selectedMonth} 経費合計（見込み）:
                  </span>
                  <span className="text-lg font-extrabold font-mono text-amber-900">
                    {formatCurrency(monthlyTotal)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* MODE 2: RECEIPT / DAILY BATCH */}
          {mode === 'receipt_batch' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                領収書やレシートの束を日付・店舗・金額順にまとめて登録できます。
              </p>

              <div className="space-y-2">
                {receiptRows.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-200 items-center">
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) => {
                        const newRows = [...receiptRows];
                        newRows[idx].date = e.target.value;
                        setReceiptRows(newRows);
                      }}
                      className="sm:col-span-3 text-xs p-1.5 border rounded bg-white"
                      required
                    />
                    <input
                      type="text"
                      placeholder="店舗/支払先"
                      value={row.store}
                      onChange={(e) => {
                        const newRows = [...receiptRows];
                        newRows[idx].store = e.target.value;
                        setReceiptRows(newRows);
                      }}
                      className="sm:col-span-3 text-xs p-1.5 border rounded bg-white"
                    />
                    <select
                      value={row.category}
                      onChange={(e) => {
                        const newRows = [...receiptRows];
                        newRows[idx].category = e.target.value;
                        setReceiptRows(newRows);
                      }}
                      className="sm:col-span-2 text-xs p-1.5 border rounded bg-white"
                    >
                      {settings.expenseCategories.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <div className="sm:col-span-2 relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">¥</span>
                      <input
                        type="number"
                        placeholder="金額"
                        value={row.amount}
                        onChange={(e) => {
                          const newRows = [...receiptRows];
                          newRows[idx].amount = e.target.value;
                          setReceiptRows(newRows);
                        }}
                        className="w-full pl-5 pr-1 py-1 text-xs font-mono font-bold bg-white border rounded text-right"
                      />
                    </div>
                    <select
                      value={row.paymentMethod}
                      onChange={(e) => {
                        const newRows = [...receiptRows];
                        newRows[idx].paymentMethod = e.target.value;
                        setReceiptRows(newRows);
                      }}
                      className="sm:col-span-1 text-xs p-1.5 border rounded bg-white"
                    >
                      {settings.paymentMethods.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setReceiptRows(receiptRows.filter((_, i) => i !== idx))}
                        className="text-gray-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setReceiptRows([...receiptRows, { date: `${selectedMonth}-15`, store: '', category: '消耗品費', amount: '', paymentMethod: '現金' }])}
                  className="text-xs font-medium text-amber-700 hover:text-amber-800 flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  領収書行を追加
                </button>
                <div className="text-xs font-bold text-gray-700">
                  経費合計: <span className="font-mono text-amber-700 text-sm font-extrabold">{formatCurrency(receiptTotal)}</span>
                </div>
              </div>
            </div>
          )}

          {/* MODE 3: PERIOD / ESTIMATE */}
          {mode === 'period_total' && (
            <div className="space-y-3 bg-amber-50/30 p-3.5 rounded-xl border border-amber-100">
              <div className="text-xs text-amber-900 bg-amber-100/60 p-2.5 rounded-lg">
                💡 「今月の仕入請求書合計20万円」「通信費一括」など、期間の合計額を1件として登録できます。
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">期間（開始日）</label>
                  <input
                    type="date"
                    value={periodDateFrom}
                    onChange={(e) => setPeriodDateFrom(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3 py-2 border rounded-lg bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">期間（終了日）</label>
                  <input
                    type="date"
                    value={periodDateTo}
                    onChange={(e) => setPeriodDateTo(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3 py-2 border rounded-lg bg-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">経費科目</label>
                  <select
                    value={periodCategory}
                    onChange={(e) => setPeriodCategory(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3 py-2 border rounded-lg bg-white"
                  >
                    {settings.expenseCategories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">金額 (円)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">¥</span>
                    <input
                      type="number"
                      placeholder="200000"
                      min="0"
                      value={periodAmount}
                      onChange={(e) => setPeriodAmount(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 text-sm font-mono font-bold border rounded-lg bg-white text-right"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">集計メモ</label>
                <input
                  type="text"
                  placeholder="例: 問屋一括請求分 / 通帳引き落とし合算"
                  value={periodMemo}
                  onChange={(e) => setPeriodMemo(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3 py-2 border rounded-lg bg-white"
                />
              </div>
            </div>
          )}

          {/* MODE 4: SINGLE RECEIPT */}
          {mode === 'single' && (
            <div className="space-y-3 bg-gray-50/50 p-3.5 rounded-xl border border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">日付</label>
                  <input
                    type="date"
                    value={singleDate}
                    onChange={(e) => setSingleDate(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3 py-2 border rounded-lg bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">経費科目</label>
                  <select
                    value={singleCategory}
                    onChange={(e) => setSingleCategory(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3 py-2 border rounded-lg bg-white"
                  >
                    {settings.expenseCategories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">金額 (円)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">¥</span>
                    <input
                      type="number"
                      placeholder="12800"
                      min="0"
                      value={singleAmount}
                      onChange={(e) => setSingleAmount(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 text-sm font-mono font-bold border rounded-lg bg-white text-right"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">支払方法</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3 py-2 border rounded-lg bg-white"
                  >
                    {settings.paymentMethods.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">店舗 / 支払先</label>
                  <input
                    type="text"
                    placeholder="例: ホームセンター コーナン"
                    value={singleStore}
                    onChange={(e) => setSingleStore(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3 py-2 border rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">内容 / 摘要</label>
                  <input
                    type="text"
                    placeholder="例: 事務備品・作業用手袋"
                    value={singleDescription}
                    onChange={(e) => setSingleDescription(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3 py-2 border rounded-lg bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Common Footer Settings */}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
              />
              <span>確認済みとして登録する</span>
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs sm:text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs hover:shadow transition-all flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                経費データを登録
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
