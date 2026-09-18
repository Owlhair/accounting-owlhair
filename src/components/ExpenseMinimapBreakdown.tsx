import React, { useState } from 'react';
import { 
  Receipt, 
  Tag, 
  Store, 
  CreditCard, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  AlertCircle,
  Edit3,
  Trash2,
  AlertTriangle,
  Check,
  X
} from 'lucide-react';
import { Transaction, ExpenseCard } from '../types';

interface ExpenseMinimapBreakdownProps {
  activeMonth: string;
  transactions: Transaction[];
  expenseCards: ExpenseCard[];
  inputs: Record<string, { amount?: number | string; isSelected?: boolean }>;
  totalAllCardsAmount: number;
  activeGroupFilter?: string;
  isOpen: boolean;
  onToggle: () => void;
  onEditTransaction?: (tx: Transaction) => void;
  onDeleteTransaction?: (id: string) => void;
}

export const ExpenseMinimapBreakdown: React.FC<ExpenseMinimapBreakdownProps> = ({
  activeMonth,
  transactions,
  expenseCards,
  inputs,
  totalAllCardsAmount,
  activeGroupFilter = 'ALL',
  isOpen,
  onToggle,
  onEditTransaction,
  onDeleteTransaction,
}) => {
  const [year, monthNum] = activeMonth.split('-');
  const monthInt = parseInt(monthNum, 10);

  // Local state for inline delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isConfirmingBulkClean, setIsConfirmingBulkClean] = useState<boolean>(false);

  // Filter tab inside breakdown
  const [internalFilter, setInternalFilter] = useState<string>('all');

  // Keep internal filter in sync when parent changes activeGroupFilter
  React.useEffect(() => {
    if (activeGroupFilter && activeGroupFilter !== 'ALL') {
      setInternalFilter(activeGroupFilter);
    } else {
      setInternalFilter('all');
    }
  }, [activeGroupFilter]);

  // 1. Registered expense transactions for this activeMonth
  const allActiveMonthTxs = React.useMemo(() => {
    return transactions
      .filter(
        (t) =>
          t.type === 'expense' &&
          ((t.date_from && t.date_from.startsWith(activeMonth)) ||
            (t.date_to && t.date_to.startsWith(activeMonth)))
      )
      .sort((a, b) => {
        const dA = a.date_from || a.date_to || '';
        const dB = b.date_from || b.date_to || '';
        if (dA !== dB) return dA.localeCompare(dB);
        return (b.amount || 0) - (a.amount || 0);
      });
  }, [transactions, activeMonth]);

  // Filtered transactions based on internalFilter
  const activeMonthTxs = React.useMemo(() => {
    if (internalFilter === 'all') return allActiveMonthTxs;

    return allActiveMonthTxs.filter((t) => {
      if (internalFilter === 'credit_card') {
        const isCardMethod = t.payment_method === 'クレジットカード' || (t.payment_method && t.payment_method.includes('カード'));
        const hasCardDesc = t.description && (t.description.includes('カード') || t.description.includes('ビジネスカード'));
        return isCardMethod || hasCardDesc;
      }
      if (internalFilter === 'salary') {
        return (
          t.category.includes('給料') ||
          t.category.includes('役員報酬') ||
          t.category.includes('報酬') ||
          t.category.includes('法定福利')
        );
      }
      if (internalFilter === 'month_end') {
        const isMonthEndMethod = t.payment_method === '口座振替' || t.payment_method === '銀行振込';
        return isMonthEndMethod || (t.date_from && t.date_from.endsWith('-30') || t.date_from?.endsWith('-31'));
      }
      return true;
    });
  }, [allActiveMonthTxs, internalFilter]);

  const registeredTotal = activeMonthTxs.reduce((sum, t) => sum + (t.amount || 0), 0);
  const allRegisteredTotal = allActiveMonthTxs.reduce((sum, t) => sum + (t.amount || 0), 0);
  const isRegistered = allActiveMonthTxs.length > 0;

  // Duplicate detection for this active month
  const duplicateInfo = React.useMemo(() => {
    const dups = new Set<string>();
    const duplicateGroups: Record<string, Transaction[]> = {};

    activeMonthTxs.forEach((tx) => {
      // Group key: detect duplicates only when category, amount, and description/store closely match
      const descKey = (tx.description || '').replace(/\s+/g, '').slice(0, 10);
      const key = `${tx.category}_${tx.amount}_${descKey}_${tx.store || ''}`;
      if (!duplicateGroups[key]) {
        duplicateGroups[key] = [];
      }
      duplicateGroups[key].push(tx);
    });

    const redundantTxIds: string[] = [];

    Object.values(duplicateGroups).forEach((group) => {
      if (group.length > 1) {
        group.forEach((t) => dups.add(t.id));
        // Sort by created_at desc if present, keep the earliest or latest, mark others redundant
        const [keep, ...redundant] = group;
        redundant.forEach((r) => redundantTxIds.push(r.id));
      }
    });

    return {
      duplicateIds: dups,
      redundantTxIds,
      count: redundantTxIds.length,
    };
  }, [activeMonthTxs]);

  // 2. Planned cards list for this month (when reviewing or if un-registered)
  const plannedCardsData = React.useMemo(() => {
    return expenseCards
      .filter((card) => {
        if (internalFilter === 'all') return true;
        return card.timingGroup === internalFilter;
      })
      .map((card) => {
        let cardSubtotal = 0;
        const subItemsBreakdown: { name: string; category: string; amount: number }[] = [];

        if (card.subItems && card.subItems.length > 0) {
          card.subItems.forEach((sub) => {
            const itemInput = inputs[`${card.id}_${sub.id}`];
            const isSel = itemInput?.isSelected ?? true;
            const amt =
              itemInput?.amount !== undefined && itemInput?.amount !== ''
                ? Number(itemInput.amount)
                : sub.defaultAmount || 0;
            if (isSel && amt > 0) {
              cardSubtotal += amt;
              subItemsBreakdown.push({
                name: sub.name,
                category: sub.category || card.category || '経費',
                amount: amt,
              });
            }
          });
        } else {
          const itemInput = inputs[card.id];
          const isSel = itemInput?.isSelected ?? true;
          const amt =
            itemInput?.amount !== undefined && itemInput?.amount !== ''
              ? Number(itemInput.amount)
              : card.defaultAmount || 0;
          if (isSel && amt > 0) {
            cardSubtotal += amt;
            subItemsBreakdown.push({
              name: card.title,
              category: card.category || '経費',
              amount: amt,
            });
          }
        }

        return {
          card,
          total: cardSubtotal,
          subItems: subItemsBreakdown,
        };
      })
      .filter((c) => c.total > 0);
  }, [expenseCards, inputs, internalFilter]);

  const plannedTotal = plannedCardsData.reduce((sum, c) => sum + c.total, 0);
  const displayTotal = internalFilter !== 'all' 
    ? (activeMonthTxs.length > 0 ? registeredTotal : plannedTotal)
    : (isRegistered ? allRegisteredTotal : totalAllCardsAmount);

  // Color helper for categories
  const getCategoryBadgeClass = (category: string) => {
    if (category.includes('給料') || category.includes('報酬')) {
      return 'bg-blue-50 text-blue-800 border-blue-200';
    }
    if (category.includes('法定福利') || category.includes('保険')) {
      return 'bg-indigo-50 text-indigo-800 border-indigo-200';
    }
    if (category.includes('租税') || category.includes('税金')) {
      return 'bg-amber-50 text-amber-800 border-amber-200';
    }
    if (category.includes('地代') || category.includes('家賃')) {
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
    if (category.includes('光熱') || category.includes('水道')) {
      return 'bg-orange-50 text-orange-800 border-orange-200';
    }
    if (category.includes('通信') || category.includes('広告')) {
      return 'bg-cyan-50 text-cyan-800 border-cyan-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

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
            <Layers className="w-3.5 h-3.5 text-rose-600" />
            <span>【{year}年{monthInt}月度】ミニマップ金額の内訳カード一覧</span>
          </span>

          {isRegistered ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100/90 text-emerald-800 text-[11px] font-bold rounded-md border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              出納帳 計上済 ({activeMonthTxs.length}件)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100/80 text-amber-800 text-[11px] font-bold rounded-md border border-amber-200">
              <Clock className="w-3 h-3 text-amber-600" />
              出納帳 未計上 (カード設定予定 {plannedCardsData.length}枚)
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-slate-500 font-medium block">
              {internalFilter !== 'all'
                ? `${internalFilter === 'credit_card' ? 'カード決済' : internalFilter === 'salary' ? '給与' : '月末払'} 計`
                : (isRegistered ? '出納帳 合計' : 'カード予定 合計')}
            </span>
            <span className="text-sm font-black font-mono text-rose-950">
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
        <div className="px-4 pb-4 pt-1 border-t border-slate-200/80 bg-white/60">
          {/* Breakdown Filter Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap my-2 pb-2 border-b border-slate-200/80">
            <span className="text-[11px] font-bold text-slate-500 mr-1">内訳の絞り込み:</span>
            {[
              { id: 'all', label: `すべて (${allActiveMonthTxs.length > 0 ? allActiveMonthTxs.length + '件' : expenseCards.length + '枚'})` },
              { id: 'credit_card', label: '💳 カード決済' },
              { id: 'salary', label: '👥 給与・役員報酬' },
              { id: 'month_end', label: '🏢 月末払い・家賃' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setInternalFilter(tab.id)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  internalFilter === tab.id
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
            {internalFilter !== 'all' && (
              <span className="ml-auto text-xs font-mono font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                {internalFilter === 'credit_card' ? 'カード決済小計' : '小計'}: ¥{displayTotal.toLocaleString()}
              </span>
            )}
          </div>

          <p className="text-[11px] text-slate-500 mb-2.5">
            ※ 上のミニマップ「{monthInt}月」の数字（
            {isRegistered
              ? `¥${Math.round(allRegisteredTotal / 10000)}万`
              : `予 ¥${Math.round(totalAllCardsAmount / 10000)}万`}
            ）の内訳一覧です。{internalFilter === 'credit_card' && '（カード決済のみ表示中）'}
          </p>

          {activeMonthTxs.length > 0 ? (
            <div className="space-y-3">
              {/* Duplicate Detection Warning Banner & 1-Click Clean */}
              {duplicateInfo.count > 0 && (
                <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
                  <div className="flex items-start sm:items-center gap-2">
                    <div className="p-1.5 bg-amber-100 rounded-lg text-amber-700 shrink-0 mt-0.5 sm:mt-0">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-amber-950 block">
                        給与・経費の重複計上（{duplicateInfo.count}件）が検出されました
                      </span>
                      <span className="text-[11px] text-amber-800 block">
                        同じ科目や金額が複数回登録されています。各カードの「削除」ボタン、または右の一括ボタンで重複分を整理できます。
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {isConfirmingBulkClean ? (
                      <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-amber-300 shadow-xs">
                        <span className="text-[11px] font-bold text-rose-800">
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
                          className="px-2 py-0.5 text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded transition-colors cursor-pointer"
                        >
                          一括削除
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsConfirmingBulkClean(false)}
                          className="px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsConfirmingBulkClean(true)}
                        className="px-2.5 py-1 text-xs font-bold text-amber-900 bg-amber-200/80 hover:bg-amber-300 rounded-lg border border-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-amber-800" />
                        <span>重複分（{duplicateInfo.count}件）を一括整理</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Registered Transactions Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {activeMonthTxs.map((tx) => {
                  const isDuplicate = duplicateInfo.duplicateIds.has(tx.id);
                  const isConfirming = confirmDeleteId === tx.id;

                  return (
                    <div
                      key={tx.id}
                      className={`bg-white p-3 rounded-xl border transition-all flex flex-col justify-between ${
                        isDuplicate 
                          ? 'border-amber-300 bg-amber-50/20 shadow-xs' 
                          : 'border-slate-200/90 shadow-2xs hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <div className="flex items-center gap-1">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getCategoryBadgeClass(
                                tx.category
                              )}`}
                            >
                              {tx.category}
                            </span>
                            {isDuplicate && (
                              <span className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-900 rounded border border-amber-300">
                                <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                                重複の疑い
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">
                            {tx.date_from || tx.date_to || '-'}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                          {tx.description || tx.category}
                        </h4>

                        {tx.memo && (
                          <p className="text-[10px] text-slate-500 line-clamp-2 bg-slate-50 p-1 rounded border border-slate-100">
                            {tx.memo}
                          </p>
                        )}
                      </div>

                      {/* Card Bottom: Metadata, Amount, and Edit/Delete Actions */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                            {tx.store && (
                              <span className="flex items-center gap-0.5">
                                <Store className="w-3 h-3 text-slate-400" />
                                {tx.store}
                              </span>
                            )}
                            {tx.payment_method && (
                              <span className="flex items-center gap-0.5">
                                <CreditCard className="w-3 h-3 text-slate-400" />
                                {tx.payment_method}
                              </span>
                            )}
                          </div>

                          <span className="font-mono font-black text-rose-900 text-sm">
                            ¥{(tx.amount || 0).toLocaleString()}
                          </span>
                        </div>

                        {/* Direct Edit / Delete Action Buttons */}
                        {isConfirming ? (
                          <div className="p-1.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between gap-1 animate-in fade-in duration-150">
                            <span className="text-[11px] font-bold text-rose-900 truncate">
                              この仕訳を削除しますか？
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteTransaction?.(tx.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="px-2 py-0.5 text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded transition-colors cursor-pointer"
                              >
                                削除実行
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-1.5 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                              >
                                取消
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5 pt-0.5">
                            {onEditTransaction && (
                              <button
                                type="button"
                                onClick={() => onEditTransaction(tx)}
                                className="px-2 py-1 text-[11px] font-medium text-slate-700 hover:text-indigo-700 bg-slate-50 hover:bg-indigo-50/80 rounded-md border border-slate-200 hover:border-indigo-200 transition-colors flex items-center gap-1 cursor-pointer"
                                title="仕訳を編集・修正"
                              >
                                <Edit3 className="w-3 h-3 text-indigo-600" />
                                <span>修正</span>
                              </button>
                            )}

                            {onDeleteTransaction && (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(tx.id)}
                                className="px-2 py-1 text-[11px] font-medium text-rose-700 hover:text-rose-900 bg-rose-50/60 hover:bg-rose-100/80 rounded-md border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
                                title="仕訳を出納帳から削除"
                              >
                                <Trash2 className="w-3 h-3 text-rose-600" />
                                <span>削除</span>
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
          ) : plannedCardsData.length > 0 ? (
            /* Unregistered Planned Cards Grid */
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50/80 px-3 py-1.5 rounded-lg border border-amber-200 mb-2">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>
                  {internalFilter !== 'all' ? `${internalFilter === 'credit_card' ? 'カード決済' : '選択したグループ'}の` : `${monthInt}月度の`}予定カード内訳一覧です（出納帳にはまだ計上されていません）。
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {plannedCardsData.map(({ card, total, subItems }) => (
                  <div
                    key={card.id}
                    className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {card.timingGroup === 'salary'
                            ? '給与'
                            : card.timingGroup === 'month_end'
                            ? '月末払'
                            : card.timingGroup === 'credit_card'
                            ? 'カード決済'
                            : '通常経費'}
                        </span>
                        <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-semibold">
                          予定
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 mb-1">{card.title}</h4>

                      {subItems.length > 0 && (
                        <div className="space-y-1 my-1.5 max-h-24 overflow-y-auto">
                          {subItems.map((sub, idx) => (
                            <div
                              key={idx}
                              className="text-[10px] flex items-center justify-between text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded"
                            >
                              <span className="truncate pr-1">{sub.name}</span>
                              <span className="font-mono font-medium shrink-0">
                                ¥{sub.amount.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[10px] text-slate-400">
                        {card.store || '全社共通'}
                      </span>
                      <span className="font-mono font-black text-rose-900 text-sm">
                        ¥{total.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-500 bg-slate-50/70 rounded-xl border border-slate-200">
              該当する経費データはありません（フィルター条件に一致する仕訳・カードがありません）。
            </div>
          )}
        </div>
      )}
    </div>
  );
};
