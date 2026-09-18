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
  AlertTriangle,
  ThumbsUp
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
  const [year, monthNum] = (activeMonth || '2025-08').split('-');
  const monthInt = parseInt(monthNum || '8', 10);

  // Local state for inline delete confirmation & bulk cleanup
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isConfirmingBulkClean, setIsConfirmingBulkClean] = useState<boolean>(false);

  // Acknowledged duplicates persistence (e.g. "ありがとう、でもこれで合ってるよ。")
  const [acknowledgedDuplicateIds, setAcknowledgedDuplicateIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('scratch_keiri_acknowledged_duplicate_txs');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [ackFeedback, setAckFeedback] = useState<string | null>(null);

  const saveAcknowledgedDuplicates = (ids: string[]) => {
    setAcknowledgedDuplicateIds(ids);
    try {
      localStorage.setItem('scratch_keiri_acknowledged_duplicate_txs', JSON.stringify(ids));
    } catch (e) {}
  };

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
    const unackDups = new Set<string>();
    const allDups = new Set<string>();
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
        group.forEach((t) => {
          allDups.add(t.id);
          if (!acknowledgedDuplicateIds.includes(t.id)) {
            unackDups.add(t.id);
          }
        });

        const unackGroup = group.filter((t) => !acknowledgedDuplicateIds.includes(t.id));
        if (unackGroup.length > 1) {
          const [keep, ...redundant] = unackGroup;
          redundant.forEach((r) => redundantTxIds.push(r.id));
        }
      }
    });

    const currentMonthTxIds = new Set(salaryTxs.map((t) => t.id));
    const currentMonthAckCount = acknowledgedDuplicateIds.filter((id) => currentMonthTxIds.has(id)).length;

    return {
      duplicateIds: unackDups,
      allDuplicateIds: allDups,
      redundantTxIds,
      count: redundantTxIds.length,
      acknowledgedCount: currentMonthAckCount,
      groups,
    };
  }, [salaryTxs, acknowledgedDuplicateIds]);

  const handleAcknowledgeAllDuplicates = () => {
    const toAdd = Array.from(duplicateInfo.duplicateIds);
    if (toAdd.length === 0) return;
    const nextList = Array.from(new Set([...acknowledgedDuplicateIds, ...toAdd]));
    saveAcknowledgedDuplicates(nextList);
    setAckFeedback(`『ありがとう、でもこれで合ってるよ。』を受け付けました。重複警告を非表示にしました。（${toAdd.length}件を正規計上として確認）`);
    setTimeout(() => setAckFeedback(null), 5000);
  };

  const handleAcknowledgeSingleDuplicate = (txId: string) => {
    const tx = salaryTxs.find((t) => t.id === txId);
    if (!tx) return;
    const cleanDesc = (tx.description || '').replace(/\s+/g, '').slice(0, 10);
    const key = `${tx.category}_${tx.amount}_${cleanDesc}_${tx.store || ''}`;
    const group = duplicateInfo.groups[key] || [tx];
    const peerIds = group.map((t) => t.id);

    const nextList = Array.from(new Set([...acknowledgedDuplicateIds, ...peerIds]));
    saveAcknowledgedDuplicates(nextList);
    setAckFeedback(`「${tx.description || tx.category}」（¥${(tx.amount || 0).toLocaleString()}）の重複確認を完了しました。`);
    setTimeout(() => setAckFeedback(null), 4000);
  };

  const handleResetAcknowledgedDuplicates = () => {
    const currentMonthTxIds = new Set(salaryTxs.map((t) => t.id));
    const nextList = acknowledgedDuplicateIds.filter((id) => !currentMonthTxIds.has(id));
    saveAcknowledgedDuplicates(nextList);
    setAckFeedback('重複確認の記録をリセットし、警告を再表示しました。');
    setTimeout(() => setAckFeedback(null), 4000);
  };

  const registeredSalaryTotal = salaryTxs
    .filter((t) => t.category === '役員報酬' || t.category === '給料手当')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const displayTotal = isRegistered && registeredSalaryTotal > 0 ? registeredSalaryTotal : (summary?.totalGross ?? 0);

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
                ¥{(summary?.totalExecutiveRemuneration ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs">
              <span className="text-[10px] text-slate-500 block">スタッフ給料 計</span>
              <span className="font-mono font-bold text-slate-900 text-xs">
                ¥{(summary?.totalStaffSalary ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs">
              <span className="text-[10px] text-slate-500 block">手取り振込 計</span>
              <span className="font-mono font-bold text-emerald-900 text-xs">
                ¥{(summary?.totalNetSalary ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs">
              <span className="text-[10px] text-slate-500 block">会社総負担（社保込）</span>
              <span className="font-mono font-bold text-indigo-900 text-xs">
                ¥{(summary?.totalCompanyCost ?? 0).toLocaleString()}
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
                          {(res.totalAllowances || 0) > 0 ? ` + ¥${res.totalAllowances.toLocaleString()}` : ''}
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
              {/* Feedback toast */}
              {ackFeedback && (
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-950 flex items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{ackFeedback}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAckFeedback(null)}
                    className="text-emerald-700 hover:text-emerald-900 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Acknowledged info note */}
              {duplicateInfo.acknowledgedCount > 0 && duplicateInfo.count === 0 && (
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-2 text-[11px] text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    「これで合ってるよ」と確認済みの給与明細が {duplicateInfo.acknowledgedCount}件 あります
                  </span>
                  <button
                    type="button"
                    onClick={handleResetAcknowledgedDuplicates}
                    className="text-slate-500 hover:text-rose-600 underline text-[10px] cursor-pointer"
                  >
                    確認を取り消す
                  </button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <span className="text-[11px] font-bold text-slate-700 block">
                  出納帳に計上されている給与・社保の取引レコード ({salaryTxs.length}件):
                </span>

                {/* Bulk clean duplicates button if found */}
                {duplicateInfo.count > 0 && (
                  <div className="flex items-center gap-1.5 self-end sm:self-auto flex-wrap">
                    <button
                      type="button"
                      onClick={handleAcknowledgeAllDuplicates}
                      className="px-2 py-0.5 text-[10px] font-bold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 rounded border border-emerald-300 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      title="重複ではなく、この内容で正しい支払いとして承認し警告を消す"
                    >
                      <ThumbsUp className="w-3 h-3 text-emerald-700" />
                      <span>ありがとう、でもこれで合ってるよ。</span>
                    </button>

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
                        className="px-2 py-0.5 text-[10px] font-medium text-amber-900 bg-amber-100 hover:bg-amber-200 rounded border border-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
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
                    同じ科目の給与仕訳が重複して計上されています。意図した正常な支出の場合は「これで合ってるよ」を押すと警告を非表示にできます。
                  </span>
                </div>
              )}

              <div className="space-y-1.5">
                {salaryTxs.map((t) => {
                  const isDuplicate = duplicateInfo.duplicateIds.has(t.id);
                  const isAcknowledged = acknowledgedDuplicateIds.includes(t.id);
                  const isConfirming = confirmDeleteId === t.id;

                  return (
                    <div
                      key={t.id}
                      className={`text-[11px] bg-white px-2.5 py-2 rounded-lg border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                        isDuplicate
                          ? 'border-amber-300 bg-amber-50/20'
                          : isAcknowledged
                            ? 'border-emerald-200/80'
                            : 'border-slate-200/80 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate flex-wrap">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                          {t.category}
                        </span>
                        {isDuplicate && (
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-900 rounded border border-amber-300">
                              <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                              重複
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAcknowledgeSingleDuplicate(t.id)}
                              className="px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded cursor-pointer transition-colors shadow-2xs flex items-center gap-0.5"
                              title="この給与明細はこれで合っているとして確認"
                            >
                              <ThumbsUp className="w-2.5 h-2.5 text-emerald-600" />
                              合ってるよ
                            </button>
                          </div>
                        )}
                        {isAcknowledged && (
                          <span className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[9px] font-bold bg-emerald-50 text-emerald-800 rounded border border-emerald-200 shrink-0">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                            確認済み
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
