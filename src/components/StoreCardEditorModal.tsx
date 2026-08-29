import React, { useState, useEffect } from 'react';
import { Transaction, AppSettings } from '../types';
import { formatCurrency } from '../utils/calculations';
import { X, Check, Store, Calendar, ArrowRight, Sparkles, AlertCircle, Coins, CreditCard, QrCode, Building, Gift } from 'lucide-react';

interface StoreCardEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  month: string; // YYYY-MM
  store: string;
  stores: string[];
  paymentMethods: string[];
  existingTransactions: Transaction[];
  onSaveCard: (
    month: string,
    store: string,
    breakdown: Record<string, number>,
    memo?: string
  ) => void;
  onSaveAndNext?: (
    currentMonth: string,
    nextStore: string,
    breakdown: Record<string, number>,
    memo?: string
  ) => void;
}

export const StoreCardEditorModal: React.FC<StoreCardEditorModalProps> = ({
  isOpen,
  onClose,
  month,
  store,
  stores,
  paymentMethods,
  existingTransactions,
  onSaveCard,
  onSaveAndNext,
}) => {
  const [currentStore, setCurrentStore] = useState(store);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [memo, setMemo] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Primary payment methods to highlight
  const standardMethods = ['現金', 'クレジットカード', 'QR決済', '銀行振込', 'ポイント', 'その他'];
  const allMethods = Array.from(new Set([...standardMethods, ...paymentMethods])).filter(m => m !== '未確定');

  // Load existing values whenever store or month changes
  useEffect(() => {
    setCurrentStore(store);
  }, [store]);

  useEffect(() => {
    if (!isOpen) return;

    // Filter transactions for this store & month
    const storeTx = existingTransactions.filter(t => {
      const txMonth = (t.date_from || t.date_to || '').substring(0, 7);
      const txStore = t.store || '全社共通';
      return t.type === 'sales' && txStore === currentStore && txMonth === month;
    });

    const initAmounts: Record<string, string> = {};
    allMethods.forEach(m => {
      initAmounts[m] = '';
    });

    let foundMemo = '';
    storeTx.forEach(t => {
      const m = t.payment_method || '現金';
      const prev = Number(initAmounts[m] || '0');
      initAmounts[m] = String(prev + (t.amount || 0));
      if (t.memo && !foundMemo) foundMemo = t.memo;
    });

    setAmounts(initAmounts);
    setMemo(foundMemo || `${currentStore} ${month}度 売上`);
    setErrorMessage('');
  }, [isOpen, currentStore, month, existingTransactions]);

  if (!isOpen) return null;

  const [yStr, mStr] = month.split('-');
  const formattedMonthLabel = `${yStr}年 ${parseInt(mStr, 10)}月度`;

  // Calculate live total
  const totalAmount: number = Object.values(amounts).reduce<number>((sum, val) => {
    const strVal = String(val || '');
    const num = Number(strVal.replace(/,/g, '')) || 0;
    return sum + num;
  }, 0);

  // Cashless sum
  const cashAmount: number = Number(String(amounts['現金'] || '').replace(/,/g, '')) || 0;
  const cashlessAmount: number = totalAmount - cashAmount;
  const cashlessPercent: number = totalAmount > 0 ? Math.round((cashlessAmount / totalAmount) * 100) : 0;

  // Next store calculation
  const storeIndex = stores.indexOf(currentStore);
  const nextStore = storeIndex >= 0 && storeIndex < stores.length - 1 ? stores[storeIndex + 1] : null;

  const handleAmountChange = (method: string, rawVal: string) => {
    const clean = rawVal.replace(/[^0-9]/g, '');
    setAmounts(prev => ({
      ...prev,
      [method]: clean,
    }));
  };

  const getBreakdownNumbers = (): Record<string, number> => {
    const result: Record<string, number> = {};
    Object.entries(amounts).forEach(([method, val]) => {
      const strVal = String(val || '');
      const num = Number(strVal.replace(/,/g, '')) || 0;
      if (num > 0) {
        result[method] = num;
      }
    });
    return result;
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const breakdown = getBreakdownNumbers();
    onSaveCard(month, currentStore, breakdown, memo);
    onClose();
  };

  const handleSaveAndNextStore = () => {
    if (!nextStore) return;
    const breakdown = getBreakdownNumbers();
    if (onSaveAndNext) {
      onSaveAndNext(month, nextStore, breakdown, memo);
      setCurrentStore(nextStore);
    } else {
      onSaveCard(month, currentStore, breakdown, memo);
      setCurrentStore(nextStore);
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case '現金':
        return <Coins className="w-4 h-4 text-amber-600" />;
      case 'クレジットカード':
        return <CreditCard className="w-4 h-4 text-indigo-600" />;
      case 'QR決済':
        return <QrCode className="w-4 h-4 text-emerald-600" />;
      case '銀行振込':
        return <Building className="w-4 h-4 text-blue-600" />;
      case 'ポイント':
        return <Gift className="w-4 h-4 text-rose-500" />;
      default:
        return <Coins className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh] my-auto">
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-gray-150 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-gray-900">
                  {currentStore}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100/90 text-emerald-800 border border-emerald-200">
                  {formattedMonthLabel}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 font-medium">
                決済種別ごとの月次売上を入力してカードを埋めます
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Store Selector Pills */}
        <div className="px-5 py-2.5 bg-gray-50/80 border-b border-gray-150 flex items-center gap-2 overflow-x-auto text-xs shrink-0">
          <span className="text-[11px] font-bold text-gray-500 shrink-0">店舗切替:</span>
          {stores.map(st => (
            <button
              key={st}
              type="button"
              onClick={() => setCurrentStore(st)}
              className={`px-3 py-1 rounded-lg font-bold transition-all whitespace-nowrap text-xs ${
                currentStore === st
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            {errorMessage && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Total Highlight Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-100 uppercase tracking-wider block">
                  {currentStore} • {formattedMonthLabel} 売上合計
                </span>
                <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
              {totalAmount > 0 && (
                <div className="text-right bg-white/15 px-3 py-1.5 rounded-xl border border-white/20">
                  <div className="text-[10px] text-emerald-100 font-medium">キャッシュレス比率</div>
                  <div className="text-sm font-black font-mono">{cashlessPercent}%</div>
                </div>
              )}
            </div>

            {/* Payment Method Input Rows */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-gray-700 px-1">
                <span>決済種別</span>
                <span>売上金額 (税込)</span>
              </div>

              <div className="space-y-2">
                {allMethods.map((method, idx) => {
                  const val = amounts[method] || '';
                  const num = Number(val.replace(/,/g, '')) || 0;
                  const percentOfTotal = totalAmount > 0 ? Math.round((num / totalAmount) * 100) : 0;

                  return (
                    <div
                      key={method}
                      className={`p-2.5 rounded-xl border transition-all flex items-center gap-3 ${
                        num > 0
                          ? 'bg-emerald-50/40 border-emerald-200 shadow-2xs'
                          : 'bg-gray-50/70 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 w-32 sm:w-36 shrink-0">
                        <div className="p-1.5 rounded-lg bg-white shadow-2xs border border-gray-150">
                          {getMethodIcon(method)}
                        </div>
                        <span className="text-xs font-bold text-gray-800 truncate">
                          {method}
                        </span>
                      </div>

                      <div className="flex-1 relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={val ? Number(val.replace(/,/g, '')).toLocaleString() : ''}
                          onChange={(e) => handleAmountChange(method, e.target.value)}
                          className={`w-full px-3 py-1.5 text-right font-mono font-bold text-sm rounded-xl border transition-all focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                            num > 0
                              ? 'bg-white border-emerald-300 text-gray-900'
                              : 'bg-white border-gray-200 text-gray-700 placeholder-gray-300'
                          }`}
                        />
                        <span className="absolute right-2.5 top-2 text-xs font-bold text-gray-400 pointer-events-none">
                          円
                        </span>
                      </div>

                      {totalAmount > 0 && num > 0 && (
                        <div className="w-12 text-right text-[11px] font-bold font-mono text-emerald-700 shrink-0">
                          {percentOfTotal}%
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Memo Field */}
            <div className="pt-1">
              <label className="block text-[11px] font-bold text-gray-600 mb-1">
                メモ・特記事項（任意）
              </label>
              <input
                type="text"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="例: GWセール実施、店販キャンペーン強化月間など"
                className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="p-4 border-t border-gray-150 flex items-center justify-between shrink-0 bg-gray-50/80 gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 rounded-xl transition-colors"
            >
              キャンセル
            </button>

            <div className="flex items-center gap-2">
              {nextStore && (
                <button
                  type="button"
                  onClick={handleSaveAndNextStore}
                  className="px-3.5 py-2 text-xs font-bold bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-xl shadow-2xs transition-colors flex items-center gap-1.5"
                >
                  <span>保存して {nextStore} を入力</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                カードを保存
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
