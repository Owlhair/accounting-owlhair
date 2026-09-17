import React, { useState } from 'react';
import { FiscalSettings } from '../types';
import { X, Calendar, Building2, Store, Check, Plus, Trash2, SlidersHorizontal, Tag, Receipt } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  fiscalSettings: FiscalSettings;
  stores: string[];
  closedStores?: string[];
  expenseCategories?: string[];
  salesCategories?: string[];
  onSaveSettings: (newSettings: FiscalSettings, newStores: string[], newClosedStores: string[]) => void;
  onSaveCategories?: (newExpenseCats: string[], newSalesCats: string[]) => void;
  onOpenBackup?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  fiscalSettings,
  stores,
  closedStores = [],
  expenseCategories = [],
  salesCategories = [],
  onSaveSettings,
  onSaveCategories,
}) => {
  const [activeTab, setActiveTab] = useState<'fiscal' | 'stores' | 'categories'>('fiscal');
  const [endMonth, setEndMonth] = useState<number>(fiscalSettings?.fiscalYearEndMonth || 3);
  const [startYear, setStartYear] = useState<number>(fiscalSettings?.fiscalYearStartYear || 2024);
  const [storeList, setStoreList] = useState<string[]>(stores && stores.length > 0 ? stores : ['本店', '2号店', '全社共通']);
  const [closedStoreList, setClosedStoreList] = useState<string[]>(closedStores || []);
  const [newStoreInput, setNewStoreInput] = useState('');

  // Categories state
  const [expenseCatList, setExpenseCatList] = useState<string[]>(expenseCategories && expenseCategories.length > 0 ? expenseCategories : ['仕入', '消耗品費', '修繕費', '通信費', '水道光熱費', '地代家賃']);
  const [salesCatList, setSalesCatList] = useState<string[]>(salesCategories && salesCategories.length > 0 ? salesCategories : ['技術売上', '商品売上', 'その他売上']);
  const [newExpenseCatInput, setNewExpenseCatInput] = useState('');
  const [newSalesCatInput, setNewSalesCatInput] = useState('');

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

  const handleToggleStoreStatus = (name: string) => {
    if (closedStoreList.includes(name)) {
      // 閉店 -> 開店 (ON)
      setClosedStoreList(closedStoreList.filter(s => s !== name));
    } else {
      // 開店 -> 閉店 (OFF)
      setClosedStoreList([...closedStoreList, name]);
    }
  };

  const handleRemoveStore = (name: string) => {
    if (storeList.length <= 1) {
      alert('最低1つの店舗・部門が必要です。');
      return;
    }
    setStoreList(storeList.filter(s => s !== name));
    setClosedStoreList(closedStoreList.filter(s => s !== name));
  };

  const handleAddExpenseCategory = () => {
    const trimmed = newExpenseCatInput.trim();
    if (!trimmed) return;
    if (!expenseCatList.includes(trimmed)) {
      setExpenseCatList([...expenseCatList, trimmed]);
      setNewExpenseCatInput('');
    }
  };

  const handleRemoveExpenseCategory = (cat: string) => {
    if (expenseCatList.length <= 1) {
      alert('最低1つの経費科目が必要です。');
      return;
    }
    setExpenseCatList(expenseCatList.filter(c => c !== cat));
  };

  const handleAddSalesCategory = () => {
    const trimmed = newSalesCatInput.trim();
    if (!trimmed) return;
    if (!salesCatList.includes(trimmed)) {
      setSalesCatList([...salesCatList, trimmed]);
      setNewSalesCatInput('');
    }
  };

  const handleRemoveSalesCategory = (cat: string) => {
    if (salesCatList.length <= 1) {
      alert('最低1つの売上科目が必要です。');
      return;
    }
    setSalesCatList(salesCatList.filter(c => c !== cat));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(
      {
        fiscalYearEndMonth: Number(endMonth),
        fiscalYearStartYear: Number(startYear),
      },
      storeList,
      closedStoreList
    );
    if (onSaveCategories) {
      onSaveCategories(expenseCatList, salesCatList);
    }
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
              設定（決算期 / 店舗 / 勘定科目）
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
          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'categories'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            勘定科目 ({expenseCatList.length + salesCatList.length})
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
            ) : activeTab === 'stores' ? (
              <>
                {/* Store Management Section */}
                <div className="space-y-3">
                  <div className="p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-[11px] text-indigo-900 leading-relaxed">
                    💡 <strong>開店・閉店オンオフ機能:</strong> 店舗の「開店（営業中）」と「閉店（休業）」をスイッチで切り替えられます。閉店にした店舗は、売上カードや経費入力画面で非表示・整理できます。
                  </div>

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
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      追加
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {storeList.map((st) => {
                      const isClosed = closedStoreList.includes(st);
                      return (
                        <div 
                          key={st}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                            isClosed
                              ? 'bg-gray-100/80 border-gray-200 text-gray-500'
                              : 'bg-white border-gray-200 text-gray-900 shadow-xs'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${isClosed ? 'bg-gray-400' : 'bg-emerald-500 shadow-xs ring-2 ring-emerald-100'}`} />
                            <Store className={`w-3.5 h-3.5 shrink-0 ${isClosed ? 'text-gray-400' : 'text-indigo-600'}`} />
                            <span className={`font-bold truncate ${isClosed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                              {st}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Open / Closed Toggle Switch Button */}
                            <button
                              type="button"
                              onClick={() => handleToggleStoreStatus(st)}
                              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                                !isClosed
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-gray-200/80 text-gray-600 border-gray-300 hover:bg-gray-300/80'
                              }`}
                              title={isClosed ? 'クリックして開店（営業中）にする' : 'クリックして閉店（休業）にする'}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${!isClosed ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                              <span>{isClosed ? '閉店中' : '開店中 (ON)'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveStore(st)}
                              className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="店舗を削除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Categories Tab: Expense & Sales */}
                <div className="space-y-5">
                  {/* Expense Categories */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5 text-rose-500" />
                        <h3 className="text-xs font-bold text-gray-900">経費の勘定科目</h3>
                      </div>
                      <span className="text-[11px] text-gray-500 font-medium">
                        全{expenseCatList.length}科目
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      経費登録画面や経費カードで選べる科目一覧です。「修繕費」「消耗品費」などを追加・整理できます。
                    </p>

                    {/* Add Expense Category Input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="新しい経費科目（例: 修繕費、会議費）"
                        value={newExpenseCatInput}
                        onChange={(e) => setNewExpenseCatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddExpenseCategory();
                          }
                        }}
                        className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddExpenseCategory}
                        className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        追加
                      </button>
                    </div>

                    {/* Expense Category Chips */}
                    <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pt-1">
                      {expenseCatList.map((cat) => (
                        <div
                          key={cat}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-50 border border-gray-200 text-gray-800"
                        >
                          <span>{cat}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveExpenseCategory(cat)}
                            className="text-gray-400 hover:text-rose-600 ml-0.5 p-0.5 transition-colors rounded cursor-pointer"
                            title={`${cat}を削除`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Divider */}
                  <hr className="border-gray-100" />

                  {/* Sales Categories */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-emerald-600" />
                        <h3 className="text-xs font-bold text-gray-900">売上の勘定科目</h3>
                      </div>
                      <span className="text-[11px] text-gray-500 font-medium">
                        全{salesCatList.length}科目
                      </span>
                    </div>

                    {/* Add Sales Category Input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="新しい売上科目（例: 技術売上、商品売上）"
                        value={newSalesCatInput}
                        onChange={(e) => setNewSalesCatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSalesCategory();
                          }
                        }}
                        className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddSalesCategory}
                        className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        追加
                      </button>
                    </div>

                    {/* Sales Category Chips */}
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pt-1">
                      {salesCatList.map((cat) => (
                        <div
                          key={cat}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50/50 border border-emerald-200 text-emerald-900"
                        >
                          <span>{cat}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSalesCategory(cat)}
                            className="text-emerald-500 hover:text-rose-600 ml-0.5 p-0.5 transition-colors rounded cursor-pointer"
                            title={`${cat}を削除`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
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
