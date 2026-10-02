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
  const [startYear, setStartYear] = useState<number>(() => fiscalSettings?.fiscalYearStartYear || 2007);
  const [startMonth, setStartMonth] = useState<number>(() => fiscalSettings?.fiscalYearStartMonth || 5);
  const [endMonth, setEndMonth] = useState<number>(() => fiscalSettings?.fiscalYearEndMonth || 4);

  React.useEffect(() => {
    if (isOpen) {
      setStartYear(fiscalSettings?.fiscalYearStartYear || 2007);
      setStartMonth(fiscalSettings?.fiscalYearStartMonth || 5);
      setEndMonth(fiscalSettings?.fiscalYearEndMonth || 4);
    }
  }, [isOpen, fiscalSettings]);

  if (!isOpen) return null;

  const handleStartMonthSelect = (m: number) => {
    setStartMonth(m);
    const defaultEnd = m === 1 ? 12 : m - 1;
    setEndMonth(defaultEnd);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      fiscalYearStartYear: Number(startYear),
      fiscalYearStartMonth: Number(startMonth),
      fiscalYearEndMonth: Number(endMonth),
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Quick Preset Banner */}
          <div className="flex items-center justify-between p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl gap-2">
            <div className="text-[11px] text-indigo-950 font-bold leading-tight">
              👑 第1期 2007年5月スタート（4月決算）
            </div>
            <button
              type="button"
              onClick={() => {
                setStartYear(2007);
                setStartMonth(5);
                setEndMonth(4);
              }}
              className="px-2.5 py-1 text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-2xs shrink-0 cursor-pointer"
            >
              設定に適用
            </button>
          </div>

          {/* First Period Start Year & Month */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              第1期の開始年月（設立年・創業月）
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1980"
                max="2040"
                value={startYear}
                onChange={(e) => setStartYear(Number(e.target.value))}
                className="w-28 px-3 py-1.5 text-xs font-bold font-mono bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
              <span className="text-xs font-bold text-gray-700">年</span>
              <span className="text-xs font-bold text-indigo-600 ml-2">【開始月: {startMonth}月】</span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-gray-500 font-bold">第1期の開始月を選択:</span>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                  <button
                    type="button"
                    key={`start-${m}`}
                    onClick={() => handleStartMonthSelect(m)}
                    className={`py-1.5 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center border cursor-pointer ${
                      startMonth === m
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {m}月開始
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Fiscal Year End Month Selection */}
          <div className="space-y-1.5 pt-1 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-gray-800">
                決算月（締め月）
              </label>
              <span className="text-[11px] text-gray-500">
                ※通常は開始月の前月（{startMonth === 1 ? 12 : startMonth - 1}月）
              </span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                <button
                  type="button"
                  key={`end-${m}`}
                  onClick={() => setEndMonth(m)}
                  className={`py-1.5 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center border cursor-pointer ${
                    endMonth === m
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {m}月決算
                </button>
              ))}
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-150 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              設定プレビュー
            </div>
            <div className="text-xs text-indigo-950 font-medium space-y-1">
              <div>
                ・<span className="font-bold">1事業年度の期間:</span> 毎年 {startMonth}月1日 〜 翌年 {endMonth}月末日
              </div>
              <div>
                ・<span className="font-bold">第1期:</span> {startYear}年{startMonth}月 〜 {startMonth <= endMonth ? startYear : startYear + 1}年{endMonth}月
              </div>
              {startYear === 2007 && startMonth === 5 && endMonth === 4 && (
                <div className="text-emerald-700 font-bold pt-1">
                  ・【現在の期】第19期 (2025/05〜2026/04: 取引192件) / 第20期 (2026/05〜2027/04: 取引12件)
                </div>
              )}
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
