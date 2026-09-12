import React from 'react';
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
  Building2
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
}) => {
  const [year, monthNum] = activeMonth.split('-');
  const monthInt = parseInt(monthNum, 10);

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
            <div className="mt-2 pt-2 border-t border-slate-200/80">
              <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
                出納帳に計上されている給与・社保の取引レコード ({salaryTxs.length}件):
              </span>
              <div className="space-y-1">
                {salaryTxs.map((t) => (
                  <div
                    key={t.id}
                    className="text-[11px] bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/80 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                        {t.category}
                      </span>
                      <span className="truncate text-slate-700">{t.description}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900 shrink-0">
                      ¥{(t.amount || 0).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
