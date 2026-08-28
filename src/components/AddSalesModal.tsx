import React, { useState } from 'react';
import { Transaction, AppSettings } from '../types';
import { formatCurrency, formatNumber } from '../utils/calculations';
import { X, Plus, Trash2, Calendar, Tag, CreditCard, Sparkles, Check, AlertCircle } from 'lucide-react';

interface AddSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTransactions: (transactions: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>[]) => void;
  settings: AppSettings;
  onAddCategory: (category: string, type: 'sales' | 'expense') => void;
  defaultMonth?: string;
}

type InputMode = 'monthly_bulk' | 'daily_batch' | 'period_total' | 'single';

export const AddSalesModal: React.FC<AddSalesModalProps> = ({
  isOpen,
  onClose,
  onAddTransactions,
  settings,
  onAddCategory,
  defaultMonth = '2025-08',
}) => {
  const [mode, setMode] = useState<InputMode>('monthly_bulk');
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [paymentMethod, setPaymentMethod] = useState('銀行振込');
  const [memo, setMemo] = useState('');
  const [confirmed, setConfirmed] = useState(true);
  const [newCatInput, setNewCatInput] = useState('');
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Mode 1: Monthly bulk state (Category-wise matrix)
  const [monthlyRows, setMonthlyRows] = useState<Array<{ category: string; amount: string; paymentMethod: string }>>([
    { category: '技術売上', amount: '850000', paymentMethod: '銀行振込' },
    { category: '商品売上', amount: '120000', paymentMethod: 'クレジットカード' },
    { category: 'その他売上', amount: '30000', paymentMethod: '現金' },
  ]);

  // Mode 2: Daily batch rows
  const [dailyRows, setDailyRows] = useState<Array<{ date: string; category: string; amount: string; paymentMethod: string; memo: string }>>([
    { date: `${defaultMonth}-01`, category: '技術売上', amount: '35000', paymentMethod: '現金', memo: '' },
    { date: `${defaultMonth}-02`, category: '技術売上', amount: '42000', paymentMethod: 'クレジットカード', memo: '' },
    { date: `${defaultMonth}-03`, category: '商品売上', amount: '10000', paymentMethod: 'QR決済', memo: '' },
  ]);

  // Mode 3: Period / Known total state
  const [periodDateFrom, setPeriodDateFrom] = useState(`${defaultMonth}-01`);
  const [periodDateTo, setPeriodDateTo] = useState(`${defaultMonth}-31`);
  const [periodCategory, setPeriodCategory] = useState('技術売上');
  const [periodAmount, setPeriodAmount] = useState('1250000');
  const [periodMemo, setPeriodMemo] = useState('既存集計資料より登録');

  // Mode 4: Single custom state
  const [singleDate, setSingleDate] = useState(`${defaultMonth}-15`);
  const [singleCategory, setSingleCategory] = useState('技術売上');
  const [singleAmount, setSingleAmount] = useState('');
  const [singleDescription, setSingleDescription] = useState('');

  if (!isOpen) return null;

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
          setErrorMessage('少なくとも1つのカテゴリに金額を入力してください。');
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
            type: 'sales',
            category: r.category,
            amount: Number(r.amount.replace(/,/g, '')),
            payment_method: r.paymentMethod || paymentMethod,
            granularity: 'monthly',
            description: `${selectedMonth} ${r.category}（月まとめ）`,
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
            amount: Number(r.amount.replace(/,/g, '')),
            payment_method: r.paymentMethod,
            granularity: 'daily',
            description: `${r.date} ${r.category}`,
            memo: r.memo || '日別まとめ入力',
            source_type: 'manual',
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
          type: 'sales',
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
          type: 'sales',
          category: singleCategory,
          amount: amt,
          payment_method: paymentMethod,
          granularity: 'transaction',
          description: singleDescription || `${singleDate} ${singleCategory}`,
          memo,
          source_type: 'manual',
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
      <div className="bg-white rounded-2xl shadow-xl border border-emerald-100 max-w-2xl w-full my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 sm:p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/15 rounded-xl backdrop-blur-xs">
              <Sparkles className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">売上を追加する</h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                大雑把な月まとめ・日別・合計金額など、手元の情報に合わせて入力できます
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-emerald-100 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="bg-emerald-50/70 p-2 border-b border-emerald-100 flex gap-1.5 overflow-x-auto text-xs sm:text-sm">
          <button
            type="button"
            onClick={() => setMode('monthly_bulk')}
            className={`px-3 py-2 rounded-lg font-medium transition-all shrink-0 ${
              mode === 'monthly_bulk'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-950 hover:bg-emerald-100/70'
            }`}
          >
            📊 月まとめで入力（推奨）
          </button>
          <button
            type="button"
            onClick={() => setMode('daily_batch')}
            className={`px-3 py-2 rounded-lg font-medium transition-all shrink-0 ${
              mode === 'daily_batch'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-950 hover:bg-emerald-100/70'
            }`}
          >
            📅 日別で入力
          </button>
          <button
            type="button"
            onClick={() => setMode('period_total')}
            className={`px-3 py-2 rounded-lg font-medium transition-all shrink-0 ${
              mode === 'period_total'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-950 hover:bg-emerald-100/70'
            }`}
          >
            📑 期間・合計まとめ
          </button>
          <button
            type="button"
            onClick={() => setMode('single')}
            className={`px-3 py-2 rounded-lg font-medium transition-all shrink-0 ${
              mode === 'single'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-950 hover:bg-emerald-100/70'
            }`}
          >
            ✏️ 個別・自由入力
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-100">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">対象年月</label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full text-sm px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">基本決済方法</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full text-sm px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
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
                    <Tag className="w-3.5 h-3.5 text-emerald-600" />
                    売上種類ごとの金額（入力した項目のみ登録されます）
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddingCat(true)}
                    className="text-xs text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    売上種類を追加
                  </button>
                </div>

                {isAddingCat && (
                  <div className="flex gap-2 mb-3 p-2 bg-emerald-50 rounded-lg border border-emerald-200 animate-in fade-in">
                    <input
                      type="text"
                      placeholder="新しい売上種類（例: カット, デリバリー）"
                      value={newCatInput}
                      onChange={(e) => setNewCatInput(e.target.value)}
                      className="text-xs px-2.5 py-1.5 border rounded bg-white flex-1 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={handleAddNewCategory}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700"
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
                          className="w-full pl-6 pr-2 py-1.5 text-sm font-mono font-bold bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-right"
                        />
                      </div>
                      <select
                        value={row.paymentMethod}
                        onChange={(e) => {
                          const newRows = [...monthlyRows];
                          newRows[idx].paymentMethod = e.target.value;
                          setMonthlyRows(newRows);
                        }}
                        className="w-28 text-xs py-1.5 px-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      >
                        {settings.paymentMethods.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      {monthlyRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setMonthlyRows(monthlyRows.filter((_, i) => i !== idx))}
                          className="text-gray-400 hover:text-rose-500 p-1"
                          title="行を削除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Live total display */}
                <div className="mt-3 p-3 bg-emerald-100/70 rounded-xl border border-emerald-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950">
                    {selectedMonth} 売上合計（見込み）:
                  </span>
                  <span className="text-lg font-extrabold font-mono text-emerald-900">
                    {formatCurrency(monthlyTotal)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* MODE 2: DAILY BATCH */}
          {mode === 'daily_batch' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                日ごとの売上メモやレジ締めデータをまとめて入力できます。
              </p>

              <div className="space-y-2">
                {dailyRows.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-200 items-center">
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) => {
                        const newRows = [...dailyRows];
                        newRows[idx].date = e.target.value;
                        setDailyRows(newRows);
                      }}
                      className="sm:col-span-3 text-xs p-1.5 border rounded bg-white"
                      required
                    />
                    <select
                      value={row.category}
                      onChange={(e) => {
                        const newRows = [...dailyRows];
                        newRows[idx].category = e.target.value;
                        setDailyRows(newRows);
                      }}
                      className="sm:col-span-3 text-xs p-1.5 border rounded bg-white"
                    >
                      {settings.salesCategories.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <div className="sm:col-span-3 relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">¥</span>
                      <input
                        type="number"
                        placeholder="金額"
                        value={row.amount}
                        onChange={(e) => {
                          const newRows = [...dailyRows];
                          newRows[idx].amount = e.target.value;
                          setDailyRows(newRows);
                        }}
                        className="w-full pl-5 pr-2 py-1 text-xs font-mono font-bold bg-white border rounded text-right"
                      />
                    </div>
                    <select
                      value={row.paymentMethod}
                      onChange={(e) => {
                        const newRows = [...dailyRows];
                        newRows[idx].paymentMethod = e.target.value;
                        setDailyRows(newRows);
                      }}
                      className="sm:col-span-2 text-xs p-1.5 border rounded bg-white"
                    >
                      {settings.paymentMethods.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setDailyRows(dailyRows.filter((_, i) => i !== idx))}
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
                  onClick={() => setDailyRows([...dailyRows, { date: `${selectedMonth}-01`, category: settings.salesCategories[0] || '技術売上', amount: '', paymentMethod: '現金', memo: '' }])}
                  className="text-xs font-medium text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  行を追加
                </button>
                <div className="text-xs font-bold text-gray-700">
                  日別合計: <span className="font-mono text-emerald-700 text-sm font-extrabold">{formatCurrency(dailyTotal)}</span>
                </div>
              </div>
            </div>
          )}

          {/* MODE 3: PERIOD / KNOWN TOTAL */}
          {mode === 'period_total' && (
            <div className="space-y-3 bg-emerald-50/30 p-3.5 rounded-xl border border-emerald-100">
              <div className="text-xs text-emerald-900 bg-emerald-100/60 p-2.5 rounded-lg">
                💡 「2025年8月の売上合計は125万円だった」といった確定資料がある場合、日付を無理に特定せず期間集計としてそのまま登録できます。
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
                  <label className="block text-xs font-semibold text-gray-700 mb-1">売上区分 / 種類</label>
                  <select
                    value={periodCategory}
                    onChange={(e) => setPeriodCategory(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3 py-2 border rounded-lg bg-white"
                  >
                    {settings.salesCategories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">合計金額 (円)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">¥</span>
                    <input
                      type="number"
                      placeholder="1250000"
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
                <label className="block text-xs font-semibold text-gray-700 mb-1">集計メモ・資料参照元</label>
                <input
                  type="text"
                  placeholder="例: 2025年8月POS月計表 / 既存資料より集計"
                  value={periodMemo}
                  onChange={(e) => setPeriodMemo(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3 py-2 border rounded-lg bg-white"
                />
              </div>
            </div>
          )}

          {/* MODE 4: SINGLE */}
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
                  <label className="block text-xs font-semibold text-gray-700 mb-1">売上種類</label>
                  <select
                    value={singleCategory}
                    onChange={(e) => setSingleCategory(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3 py-2 border rounded-lg bg-white"
                  >
                    {settings.salesCategories.map(c => (
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
                      placeholder="0"
                      min="0"
                      value={singleAmount}
                      onChange={(e) => setSingleAmount(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 text-sm font-mono font-bold border rounded-lg bg-white text-right"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">決済方法</label>
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

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">内容 / 摘要</label>
                <input
                  type="text"
                  placeholder="例: 法人コンサルティング報酬"
                  value={singleDescription}
                  onChange={(e) => setSingleDescription(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3 py-2 border rounded-lg bg-white"
                />
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
                className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
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
                className="px-5 py-2 text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs hover:shadow transition-all flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                売上データを登録
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
