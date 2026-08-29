import React, { useState } from 'react';
import { FiscalSettings } from '../types';
import { X, Calendar, Building2, Store, Check, Plus, Trash2, SlidersHorizontal, Sparkles } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  fiscalSettings: FiscalSettings;
  stores: string[];
  onSaveSettings: (newSettings: FiscalSettings, newStores: string[]) => void;
  onOpenBackup?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  fiscalSettings,
  stores,
  onSaveSettings,
  onOpenBackup,
}) => {
  const [activeTab, setActiveTab] = useState<'fiscal' | 'stores'>('fiscal');
  const [endMonth, setEndMonth] = useState<number>(fiscalSettings.fiscalYearEndMonth || 3);
  const [startYear, setStartYear] = useState<number>(fiscalSettings.fiscalYearStartYear || 2024);
  const [storeList, setStoreList] = useState<string[]>(stores || ['本店', '2号店', '全社共通']);
  const [newStoreInput, setNewStoreInput] = useState('');

  if (!isOpen) return null;

  const startMonth = (endMonth % 12) + 1;

  const handleAddStore = () => {
    const trimmed = newStoreInput.trim();
    if (!trimmed) return;
    if (!storeList.includes(trimmed)) {
      setStoreList([...storeList, trimmed]);
      setNewStoreInput('');
    }
  };

  const handleRemoveStore = (name: string) => {
    if (storeList.length <= 1) {
      alert('最低1つの店舗・部門が必要です。');
      return;
    }
    setStoreList(storeList.filter(s => s !== name));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(
      {
        fiscalYearEndMonth: Number(endMonth),
        fiscalYearStartYear: Number(startYear),
      },
      storeList
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-gray-150 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                システム環境設定
              </h2>
              <p className="text-xs text-gray-500">
                決算期・決算月および店舗・部門の設定
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

        {/* Tab Toggle */}
        <div className="px-6 pt-4 border-b border-gray-100 flex items-center gap-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('fiscal')}
            className={`pb-3 flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'fiscal'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            決算期・決算月
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('stores')}
            className={`pb-3 flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'stores'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Store className="w-4 h-4" />
            店舗・部門設定 ({storeList.length})
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {activeTab === 'fiscal' ? (
            <>
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
            </>
          ) : (
            <>
              {/* Store Management Section */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-800">
                    登録店舗・部門一覧
                  </label>
                  <p className="text-xs text-gray-500">
                    売上・経費の入力時に選択できる店舗リストです（例: 本店, 2号店, 全社共通など）
                  </p>
                </div>

                {/* Add Store Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="新しい店舗名（例: 渋谷店）"
                    value={newStoreInput}
                    onChange={(e) => setNewStoreInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddStore();
                      }
                    }}
                    className="flex-1 px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddStore}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    追加
                  </button>
                </div>

                {/* Stores List */}
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {storeList.map((st) => (
                    <div 
                      key={st}
                      className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                    >
                      <div className="flex items-center gap-2 font-bold text-gray-800">
                        <Store className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{st}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveStore(st)}
                        className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Cache Notice & Backup link */}
          <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/60 text-[11px] text-amber-900 flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <span className="font-bold block">💡 設定の保存とブラウザキャッシュについて:</span>
              <span className="text-amber-800">
                設定はブラウザ内に自動保存されます。ブラウザの「キャッシュ・閲覧履歴の全消去」を行うと初期化されるため、定期的に「バックアップ」からJSON保存しておくことを推奨します。
              </span>
            </div>
            {onOpenBackup && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBackup();
                }}
                className="shrink-0 px-2.5 py-1 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors whitespace-nowrap"
              >
                バックアップへ
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
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
              設定を保存する
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
