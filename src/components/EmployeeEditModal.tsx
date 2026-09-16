import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  User, 
  Building2, 
  Coins, 
  ShieldCheck, 
  Trash2, 
  Plus, 
  Check, 
  Briefcase, 
  Receipt,
  HelpCircle,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { SalaryEmployee, SalarySettings, SalaryAllowance } from '../types';
import { calculateEmployeeSalary } from '../utils/salaryCalculator';

interface EmployeeEditModalProps {
  isOpen: boolean;
  employee: SalaryEmployee | null;
  salarySettings: SalarySettings;
  stores: string[];
  onClose: () => void;
  onSave: (updated: SalaryEmployee) => void;
}

export const EmployeeEditModal: React.FC<EmployeeEditModalProps> = ({
  isOpen,
  employee,
  salarySettings,
  stores,
  onClose,
  onSave,
}) => {
  const [draft, setDraft] = useState<SalaryEmployee | null>(null);

  useEffect(() => {
    if (employee) {
      setDraft(JSON.parse(JSON.stringify(employee)));
    } else {
      setDraft(null);
    }
  }, [employee, isOpen]);

  // Live calculation preview
  const calcResult = useMemo(() => {
    if (!draft) return null;
    return calculateEmployeeSalary(draft, salarySettings);
  }, [draft, salarySettings]);

  if (!isOpen || !draft) return null;

  const isExecutive = draft.type === 'executive';

  const handleBaseSalaryChange = (val: number) => {
    const safeVal = Math.max(0, isNaN(val) ? 0 : val);
    setDraft({ ...draft, baseSalary: safeVal });
  };

  const handleAddBaseSalaryDelta = (delta: number) => {
    const current = draft.baseSalary || 0;
    const safeVal = Math.max(0, current + delta);
    setDraft({ ...draft, baseSalary: safeVal });
  };

  const handleAddAllowance = () => {
    const newAlw: SalaryAllowance = {
      id: `alw-${Date.now()}`,
      title: '役職手当',
      amount: 10000,
      isTaxable: true,
    };
    setDraft({
      ...draft,
      allowances: [...(draft.allowances || []), newAlw],
    });
  };

  const handleUpdateAllowance = (alwId: string, field: keyof SalaryAllowance, value: any) => {
    const updatedAlws = (draft.allowances || []).map(a => {
      if (a.id === alwId) {
        if (field === 'amount') {
          return { ...a, amount: Math.max(0, isNaN(Number(value)) ? 0 : Number(value)) };
        }
        return { ...a, [field]: value };
      }
      return a;
    });
    setDraft({ ...draft, allowances: updatedAlws });
  };

  const handleRemoveAllowance = (alwId: string) => {
    setDraft({
      ...draft,
      allowances: (draft.allowances || []).filter(a => a.id !== alwId),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    onSave(draft);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div 
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isExecutive ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {isExecutive ? <Briefcase className="w-5 h-5" /> : <User className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                {draft.name || 'メンバー'} の給与・役員報酬設定
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${
                  isExecutive 
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {isExecutive ? '役員報酬' : '給料手当'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                報酬月額・基本給や手当、社会保険・税金の天引き設定を変更できます
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-slate-700">
          
          {/* 基本プロフィール */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 氏名 */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                氏名 <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="例: 山田 太郎"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* 区分 (役員報酬 / 給料手当) */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                支給区分
              </label>
              <select
                value={draft.type}
                onChange={(e) => {
                  const nextType = e.target.value as 'salary' | 'executive';
                  const nextEmpIns = nextType === 'executive' ? false : draft.hasEmploymentInsurance;
                  setDraft({ ...draft, type: nextType, hasEmploymentInsurance: nextEmpIns });
                }}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-hidden"
              >
                <option value="executive">💼 役員報酬 (定期同額給与)</option>
                <option value="salary">👤 給与 (一般正社員・パート)</option>
              </select>
            </div>

            {/* 所属店舗 */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                所属店舗 / 部門
              </label>
              <select
                value={draft.store || (stores[0] || '全社共通')}
                onChange={(e) => setDraft({ ...draft, store: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-hidden"
              >
                {stores.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 報酬月額 / 基本給（最重要） */}
          <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-indigo-600" />
                {isExecutive ? '役員報酬月額（税引前定期同額給与）' : '基本給（月額）'}
              </label>
              <span className="text-xs text-indigo-600 font-mono">
                {isExecutive ? '※年度途中での改定は原則注意' : '※固定基本給'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">
                  ¥
                </span>
                <input
                  type="number"
                  step="1000"
                  min="0"
                  value={draft.baseSalary || 0}
                  onChange={(e) => handleBaseSalaryChange(Number(e.target.value))}
                  className="w-full pl-8 pr-4 py-2.5 bg-white border border-indigo-200 rounded-xl text-right font-mono font-bold text-lg text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden shadow-2xs"
                />
              </div>

              {/* クイック増減ボタン */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => handleAddBaseSalaryDelta(10000)}
                  className="px-2.5 py-2 text-xs font-semibold bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 rounded-lg transition-colors whitespace-nowrap"
                >
                  +1万
                </button>
                <button
                  type="button"
                  onClick={() => handleAddBaseSalaryDelta(50000)}
                  className="px-2.5 py-2 text-xs font-semibold bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 rounded-lg transition-colors whitespace-nowrap"
                >
                  +5万
                </button>
                <button
                  type="button"
                  onClick={() => handleAddBaseSalaryDelta(100000)}
                  className="px-2.5 py-2 text-xs font-semibold bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 rounded-lg transition-colors whitespace-nowrap"
                >
                  +10万
                </button>
                <button
                  type="button"
                  onClick={() => handleAddBaseSalaryDelta(-10000)}
                  className="px-2.5 py-2 text-xs font-semibold bg-white border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-700 rounded-lg transition-colors whitespace-nowrap"
                >
                  -1万
                </button>
              </div>
            </div>
          </div>

          {/* 各種手当 (Allowances) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-600" />
                各種手当（役職手当・職能手当・通勤手当等）
              </span>
              <button
                type="button"
                onClick={handleAddAllowance}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                手当を追加
              </button>
            </div>

            {(draft.allowances || []).length === 0 ? (
              <div className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200 text-center">
                手当はありません（基本給のみ）
              </div>
            ) : (
              <div className="space-y-2 bg-slate-50/70 p-3 rounded-xl border border-slate-200">
                {(draft.allowances || []).map((alw) => (
                  <div key={alw.id} className="flex items-center justify-between gap-3 bg-white p-2 rounded-lg border border-slate-200">
                    <input
                      type="text"
                      value={alw.title}
                      onChange={(e) => handleUpdateAllowance(alw.id, 'title', e.target.value)}
                      placeholder="手当名"
                      className="text-xs font-medium text-slate-800 bg-transparent border-b border-slate-300 px-1 py-1 w-32 focus:border-indigo-500 focus:outline-hidden"
                    />
                    <label className="text-xs text-slate-500 flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={alw.isTaxable !== false}
                        onChange={(e) => handleUpdateAllowance(alw.id, 'isTaxable', e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      課税対象
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-400">¥</span>
                      <input
                        type="number"
                        step="500"
                        value={alw.amount || 0}
                        onChange={(e) => handleUpdateAllowance(alw.id, 'amount', Number(e.target.value))}
                        className="w-28 text-right text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-md px-2 py-1 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveAllowance(alw.id)}
                        className="text-slate-400 hover:text-rose-500 p-1 rounded hover:bg-rose-50 transition-colors ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 社会保険・労働保険・控除設定 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            {/* 社会保険・雇用保険 */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                社会保険・雇用保険
              </span>

              <div className="space-y-2">
                <label className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors">
                  <span className="text-xs font-medium text-slate-700">社会保険 (健保・厚年)</span>
                  <input
                    type="checkbox"
                    checked={draft.hasSocialInsurance}
                    onChange={(e) => setDraft({ ...draft, hasSocialInsurance: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-slate-700">雇用保険</span>
                    {isExecutive && (
                      <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">
                        ※役員は通常OFF
                      </span>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={draft.hasEmploymentInsurance}
                    onChange={(e) => setDraft({ ...draft, hasEmploymentInsurance: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors">
                  <span className="text-xs font-medium text-slate-700">介護保険 (40歳以上)</span>
                  <input
                    type="checkbox"
                    checked={draft.hasCareInsurance}
                    onChange={(e) => setDraft({ ...draft, hasCareInsurance: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </label>
              </div>
            </div>

            {/* 税金・扶養設定 */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-purple-600" />
                税額・控除設定
              </span>

              <div className="space-y-3">
                {/* 扶養親族等の数 */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                  <div>
                    <div className="text-xs font-medium text-slate-700">扶養親族等の数</div>
                    <div className="text-[10px] text-slate-400">源泉所得税甲欄の控除区分</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDraft({ ...draft, dependentsCount: Math.max(0, (draft.dependentsCount || 0) - 1) })}
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-mono font-bold text-sm">
                      {draft.dependentsCount || 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDraft({ ...draft, dependentsCount: Math.min(15, (draft.dependentsCount || 0) + 1) })}
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* 住民税（月額） */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                  <div>
                    <div className="text-xs font-medium text-slate-700">住民税（特別徴収月額）</div>
                    <div className="text-[10px] text-slate-400">自治体納付書記載の月額</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-400">¥</span>
                    <input
                      type="number"
                      step="100"
                      min="0"
                      value={draft.residentTax || 0}
                      onChange={(e) => setDraft({ ...draft, residentTax: Math.max(0, isNaN(Number(e.target.value)) ? 0 : Number(e.target.value)) })}
                      className="w-24 text-right text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-md px-2 py-1 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* メモ */}
                <div>
                  <input
                    type="text"
                    value={draft.memo || ''}
                    onChange={(e) => setDraft({ ...draft, memo: e.target.value })}
                    placeholder="備考メモ（例: 昇給予定あり、短時間勤務）"
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* リアルタイム計算プレビューバー */}
          {calcResult && (
            <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold flex items-center gap-1.5 text-slate-300">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  リアルタイム計算プレビュー
                </span>
                <span>標準報酬月額: ¥{calcResult.standardMonthlyFee.toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 block">総支給額 (額面)</span>
                  <span className="text-sm font-bold font-mono text-white">
                    ¥{calcResult.totalGross.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">控除合計 (社保+税金)</span>
                  <span className="text-sm font-bold font-mono text-rose-400">
                    -¥{calcResult.totalDeductions.toLocaleString()}
                  </span>
                </div>
                <div className="col-span-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-emerald-400 font-bold block">差引手取り振込額 (支給日)</span>
                    <span className="text-base font-black font-mono text-emerald-300">
                      ¥{calcResult.netSalary.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">会社負担法定福利費</span>
                    <span className="text-xs font-mono font-semibold text-slate-300">
                      +¥{calcResult.companyTotalStatutoryWelfare.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-3.5 border-t border-slate-100 bg-slate-50/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            給与設定を保存する
          </button>
        </div>
      </div>
    </div>
  );
};
