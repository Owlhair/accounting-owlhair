import React, { useState } from 'react';
import { FiscalSettings } from '../types';
import { X, Calendar, Building2, Check, Sparkles } from 'lucide-react';

interface FiscalYearSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  fiscalSettings: FiscalSettings;
  onSave: (newSettings: FiscalSettings) => void;
}

export const FiscalYearSettingsModal: React.FC<FiscalYearSettingsModalProps> = ({
  isOpen,
  onClose,
  fiscalSettings,
  onSave,
}) => {
  const [endMonth, setEndMonth] = useState<number>(fiscalSettings.fiscalYearEndMonth || 3);
  const [startYear, setStartYear] = useState<number>(fiscalSettings.fiscalYearStartYear || 2024);

  if (!isOpen) return null;

  const startMonth = (endMonth % 12) + 1;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      fiscalYearEndMonth: Number(endMonth),
      fiscalYearStartYear: Number(startYear),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-gray-150 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                決算期・決算月の設定
              </h2>
              <p className="text-xs text-gray-500">
                決算月に合わせて自動で「期」を計算・集計します
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

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Fiscal Year End Month Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-800 flex items-center justify-between">
              <span>決算月（何月締めか）</span>
              <span className="text-[11px] text-indigo-600 font-normal">例: 3月決算、12月決算</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setEndMonth(m)}
                  className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center border ${
                    endMonth === m
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-gray-50/80 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                  }`}
                >
                  <span>{m}月</span>
                  <span className="text-[9px] opacity-80">決算</span>
                </button>
              ))}
            </div>
          </div>

          {/* First Period Start Year */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-gray-500" />
              第1期の開始年（設立年 / 開業年）
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="2000"
                max="2040"
                value={startYear}
                onChange={(e) => setStartYear(Number(e.target.value))}
                className="w-32 px-3 py-2 text-sm font-bold font-mono bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
              <span className="text-xs font-bold text-gray-600">年スタート</span>
            </div>
            <p className="text-[11px] text-gray-400">
              この年が「第1期」となり、以降自動で第2期、第3期...と繰り上がります。
            </p>
          </div>

          {/* Live Preview Box */}
          <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-150 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              設定プレビュー
            </div>
            <div className="text-xs text-indigo-950 font-medium space-y-1">
              <div>
                ・<span className="font-bold">1事業年度の期間:</span> 毎年 {startMonth}月1日 〜 翌年 {endMonth}月{endMonth === 2 ? '末' : '末'}日
              </div>
              <div>
                ・<span className="font-bold">第1期:</span> {startYear}年{startMonth}月 〜 {startMonth <= endMonth ? startYear : startYear + 1}年{endMonth}月
              </div>
              <div>
                ・<span className="font-bold">第2期:</span> {startYear + 1}年{startMonth}月 〜 {startMonth <= endMonth ? startYear + 1 : startYear + 2}年{endMonth}月
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              期の設定を適用する
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
