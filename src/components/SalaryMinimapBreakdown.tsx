import React, { useState } from 'react';
import { 
  Users, 
  Store, 
  CheckCircle2, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  Briefcase, 
  UserCheck, 
  Receipt, 
  CreditCard,
  Building2,
  Edit3,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { SalaryEmployee, Transaction, SalaryCalculationResult } from '../types';
import { calculateTotalSalarySummary } from '../utils/salaryCalculator';

export type TotalSalarySummaryType = ReturnType<typeof calculateTotalSalarySummary>;

interface SalaryMinimapBreakdownProps {
  activeMonth: string;
  calculationResults: SalaryCalculationResult[];
  summary: TotalSalarySummaryType;
  isRegistered: boolean;
  salaryTxCount: number;
  transactions: Transaction[];
  isOpen: boolean;
  onToggle: () => void;
  onEditEmployee?: (emp: SalaryEmployee) => void;
  onEditTransaction?: (tx: Transaction) => void;
  onDeleteTransaction?: (id: string) => void;
}

export const SalaryMinimapBreakdown: React.FC<SalaryMinimapBreakdownProps> = ({
  activeMonth,
  calculationResults,
  summary,
  isRegistered,
  salaryTxCount,
  transactions,
  isOpen,
  onToggle,
  onEditEmployee,
  onEditTransaction,
  onDeleteTransaction,
}) => {
  const [year, monthNum] = activeMonth.split('-');
  const monthInt = parseInt(monthNum, 10);

  // Local state for inline delete confirmation & bulk cleanup
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isConfirmingBulkClean, setIsConfirmingBulkClean] = useState<boolean>(false);

  // Find registered salary transactions for this activeMonth
  const salaryTxs = React.useMemo(() => {
    return transactions.filter(
      (t) =>
        t.type === 'expense' &&
        (t.category === '役員報酬' ||
          t.category === '給料手当' ||
          t.category === '法定福利費' ||
          t.description?.includes('給料') ||
          t.description?.includes('報酬') ||
          t.description?.includes('社会保険')) &&
        ((t.date_from && t.date_from.startsWith(activeMonth)) ||
          (t.date_to && t.date_to.startsWith(activeMonth)))
    );
  }, [transactions, activeMonth]);

  // Duplicate detection among registered salary transactions
  const duplicateInfo = React.useMemo(() => {
    const dups = new Set<string>();
    const groups: Record<string, Transaction[]> = {};

    salaryTxs.forEach((t) => {
      // Group by category, exact amount, and clean description prefix so genuine duplicates are detected accurately
      const cleanDesc = (t.description || '').replace(/\s+/g, '').slice(0, 10);
      const key = `${t.category}_${t.amount}_${cleanDesc}_${t.store || ''}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });

    const redundantTxIds: string[] = [];

    Object.values(groups).forEach((group) => {
      if (group.length > 1) {
        group.forEach((t) => dups.add(t.id));
        // Keep the first, mark remainder as redundant
        const [keep, ...redundant] = group;
        redundant.forEach((r) => redundantTxIds.push(r.id));
      }
    });

    return {
      duplicateIds: dups,
      redundantTxIds,
      count: redundantTxIds.length,
    };
  }, [salaryTxs]);

  const registeredSalaryTotal = salaryTxs
    .filter((t) => t.category === '役員報酬' || t.category === '給料手当')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const displayTotal = isRegistered && registeredSalaryTotal > 0 ? registeredSalaryTotal : summary.totalGross;

  return (
    <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl overflow-hidden transition-all shadow-2xs">
      {/* Header Bar with Toggle */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-slate-100/80 transition-colors text-left cursor-pointer select-none"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span>【{year}年{monthInt}月度】ミニマップ金額の内訳（スタッフ給与・役員報酬カード）</span>
          </span>

          {isRegistered ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100/90 text-emerald-800 text-[11px] font-bold rounded-md border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              出納帳 計上済 ({salaryTxCount}件)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100/80 text-amber-800 text-[11px] font-bold rounded-md border border-amber-200">
              <Clock className="w-3 h-3 text-amber-600" />
              出納帳 未計上 (計算対象 {calculationResults.length}名)
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-slate-500 font-medium block">
              {isRegistered && registeredSalaryTotal > 0 ? '出納帳 給与計' : '総支給 予定計'}
            </span>
            <span className="text-sm font-black font-mono text-emerald-950">
              ¥{displayTotal.toLocaleString()}
            </span>
          </div>

          <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-2xs">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </button>

      {/* Expanded Breakdown Body */}
      {isOpen && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-200/80 bg-white/60 space-y-3">
          <p className="text-[11px] text-slate-500">
            ※ 上のミニマップで「{monthInt}月」の数字（¥{Math.round(displayTotal / 10000)}万
            ）のもとになっている各スタッフ・役員の給与カード一覧です。
          </p>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs">
              <span className="text-[10px] text-slate-500 block">役員報酬 計</span>
              <span className="font-mono font-bold text-slate-900 text-xs">
                ¥{summary.totalExecutive.toLocaleString()}
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs">
              <span className="text-[10px] text-slate-500 block">スタッフ給料 計</span>
              <span className="font-mono font-bold text-slate-900 text-xs">
                ¥{summary.totalSalary.toLocaleString()}
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs">
              <span className="text-[10px] text-slate-500 block">手取り振込 計</span>
              <span className="font-mono font-bold text-emerald-900 text-xs">
                ¥{summary.totalNet.toLocaleString()}
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs">
              <span className="text-[10px] text-slate-500 block">会社総負担（社保込）</span>
              <span className="font-mono font-bold text-indigo-900 text-xs">
                ¥{summary.totalCompanyCost.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Staff Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {calculationResults.map((res) => {
              const emp = res.employee;
              const isExec = emp.type === 'executive';

              return (
                <div
                  key={emp.id}
                  onClick={() => onEditEmployee && onEditEmployee(emp)}
                  className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs hover:border-emerald-300 hover:shadow-xs transition-all flex flex-col justify-between cursor-pointer"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                            isExec
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {isExec ? <Briefcase className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        </span>
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {emp.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                            isExec
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : 'bg-blue-50 text-blue-800 border-blue-200'
                          }`}
                        >
                          {isExec ? '役員報酬' : '給料手当'}
                        </span>
                        {emp.store && (
                          <span className="text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                            {emp.store}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Breakdown details */}
                    <div className="space-y-1 text-[11px] bg-slate-50/70 p-2 rounded-lg border border-slate-100 my-1.5">
                      <div className="flex items-center justify-between text-slate-600">
                        <span>基本給 + 手当:</span>
                        <span className="font-mono">
                          ¥{(emp.baseSalary || 0).toLocaleString()}
                          {(emp.allowances || 0) > 0 ? ` + ¥${emp.allowances.toLocaleString()}` : ''}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>手取り振込額:</span>
                        <span className="font-mono font-bold text-emerald-800">
                          ¥{res.netSalary.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500 text-[10px]">
                        <span>会社総負担額:</span>
                        <span className="font-mono">
                          ¥{res.totalCompanyCost.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Row: Gross Total */}
                  <div className="mt-1 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-400">総支給額</span>
                    <span className="font-mono font-black text-slate-950 text-sm">
                      ¥{res.grossSalary.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Registered transactions reference (if any) */}
          {salaryTxs.length > 0 && (
            <div className="mt-2.5 pt-2.5 border-t border-slate-200/80 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <span className="text-[11px] font-bold text-slate-700 block">
                  出納帳に計上されている給与・社保の取引レコード ({salaryTxs.length}件):
                </span>

                {/* Bulk clean duplicates button if found */}
                {duplicateInfo.count > 0 && (
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    {isConfirmingBulkClean ? (
                      <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-amber-300">
                        <span className="text-[10px] font-bold text-rose-800">
                          重複 {duplicateInfo.count}件を削除？
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (onDeleteTransaction) {
                              duplicateInfo.redundantTxIds.forEach((id) => onDeleteTransaction(id));
                            }
                            setIsConfirmingBulkClean(false);
                          }}
                          className="px-1.5 py-0.5 text-[9px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded cursor-pointer"
                        >
                          一括削除
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsConfirmingBulkClean(false)}
                          className="px-1 py-0.5 text-[9px] text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsConfirmingBulkClean(true)}
                        className="px-2 py-0.5 text-[10px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded border border-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3 h-3 text-amber-700" />
                        <span>給与の重複（{duplicateInfo.count}件）を一括削除</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Duplicate alert note if any */}
              {duplicateInfo.count > 0 && (
                <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>
                    同じ科目の給与仕訳が重複して計上されています。不要な行の「削除」ボタン、または右上の「一括削除」で整理してください。
                  </span>
                </div>
              )}

              <div className="space-y-1.5">
                {salaryTxs.map((t) => {
                  const isDuplicate = duplicateInfo.duplicateIds.has(t.id);
                  const isConfirming = confirmDeleteId === t.id;

                  return (
                    <div
                      key={t.id}
                      className={`text-[11px] bg-white px-2.5 py-2 rounded-lg border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                        isDuplicate
                          ? 'border-amber-300 bg-amber-50/20'
                          : 'border-slate-200/80 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                          {t.category}
                        </span>
                        {isDuplicate && (
                          <span className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-900 rounded border border-amber-300 shrink-0">
                            <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                            重複
                          </span>
                        )}
                        <span className="truncate text-slate-700 font-medium">
                          {t.description}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0 hidden md:inline">
                          {t.date_from || t.date_to}
                        </span>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                        <span className="font-mono font-bold text-slate-900 text-xs">
                          ¥{(t.amount || 0).toLocaleString()}
                        </span>

                        {isConfirming ? (
                          <div className="flex items-center gap-1 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                            <span className="text-[10px] font-bold text-rose-900">削除？</span>
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteTransaction?.(t.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-1.5 py-0.5 text-[9px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded cursor-pointer"
                            >
                              実行
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-1 py-0.5 text-[9px] text-slate-600 hover:bg-slate-200 rounded cursor-pointer"
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            {onEditTransaction && (
                              <button
                                type="button"
                                onClick={() => onEditTransaction(t)}
                                className="p-1 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                                title="修正・編集"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {onDeleteTransaction && (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(t.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title="削除"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
