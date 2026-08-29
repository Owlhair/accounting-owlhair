import React, { useState } from 'react';
import { FiscalSettings } from '../types';
import { X, Calendar, Building2, Store, Check, Plus, Trash2, SlidersHorizontal } from 'lucide-react';

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
}) => {
  const [activeTab, setActiveTab] = useState<'fiscal' | 'stores'>('fiscal');
  const [endMonth, setEndMonth] = useState<number>(fiscalSettings?.fiscalYearEndMonth || 3);
  const [startYear, setStartYear] = useState<number>(fiscalSettings?.fiscalYearStartYear || 2024);
  const [storeList, setStoreList] = useState<string[]>(stores && stores.length > 0 ? stores : ['本店', '2号店', '全社共通']);
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
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[85vh] my-auto">
        
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/90 shrink-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-gray-900">
              設定（決算期 / 店舗）
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 pt-3 border-b border-gray-100 flex items-center gap-4 text-xs font-bold shrink-0 bg-white">
          <button
            type="button"
            onClick={() => setActiveTab('fiscal')}
            className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'fiscal'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            決算期・決算月
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('stores')}
            className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'stores'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            店舗一覧 ({storeList.length})
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            {activeTab === 'fiscal' ? (
              <>
                {/* End Month Selection */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-800">
                    決算月（締め月）
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                      <button
                        type="button"
                        key={m}
                        onClick={() => setEndMonth(m)}
                        className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center border ${
                          endMonth === m
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {m}月
                      </button>
                    ))}
                  </div>
                </div>

                {/* First Period Start Year */}
                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-bold text-gray-800 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-gray-500" />
                    第1期開始年（設立年）
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="2000"
                      max="2035"
                      value={startYear}
                      onChange={(e) => setStartYear(Number(e.target.value))}
                      className="w-28 px-3 py-1.5 text-xs font-bold font-mono bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                    <span className="text-xs font-bold text-gray-700">年スタート</span>
                  </div>
                </div>

                {/* Compact Preview Box */}
                <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-100 text-xs text-indigo-950 font-medium space-y-1">
                  <div className="font-bold text-indigo-900">プレビュー:</div>
                  <div>・事業年度: 毎年 {startMonth}月1日 〜 {endMonth}月末日</div>
                  <div>・第1期: {startYear}年{startMonth}月 〜 {startMonth <= endMonth ? startYear : startYear + 1}年{endMonth}月</div>
                </div>
              </>
            ) : (
              <>
                {/* Store Management Section */}
                <div className="space-y-3">
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
                      className="flex-1 px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddStore}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      追加
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {storeList.map((st) => (
                      <div 
                        key={st}
                        className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
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
          </div>

          {/* Sticky Action Buttons */}
          <div className="p-3.5 px-5 border-t border-gray-100 flex items-center justify-end gap-2 shrink-0 bg-gray-50/50">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-5 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              保存する
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
