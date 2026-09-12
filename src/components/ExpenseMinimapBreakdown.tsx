import React from 'react';
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
  AlertCircle 
} from 'lucide-react';
import { Transaction, ExpenseCard } from '../types';

interface ExpenseMinimapBreakdownProps {
  activeMonth: string;
  transactions: Transaction[];
  expenseCards: ExpenseCard[];
  inputs: Record<string, { amount?: number | string; isSelected?: boolean }>;
  totalAllCardsAmount: number;
  isOpen: boolean;
  onToggle: () => void;
}

export const ExpenseMinimapBreakdown: React.FC<ExpenseMinimapBreakdownProps> = ({
  activeMonth,
  transactions,
  expenseCards,
  inputs,
  totalAllCardsAmount,
  isOpen,
  onToggle,
}) => {
  const [year, monthNum] = activeMonth.split('-');
  const monthInt = parseInt(monthNum, 10);

  // 1. Registered expense transactions for this activeMonth
  const activeMonthTxs = React.useMemo(() => {
    return transactions
      .filter(
        (t) =>
          t.type === 'expense' &&
          ((t.date_from && t.date_from.startsWith(activeMonth)) ||
            (t.date_to && t.date_to.startsWith(activeMonth)))
      )
      .sort((a, b) => {
        // Sort by date then amount desc
        const dA = a.date_from || a.date_to || '';
        const dB = b.date_from || b.date_to || '';
        if (dA !== dB) return dA.localeCompare(dB);
        return (b.amount || 0) - (a.amount || 0);
      });
  }, [transactions, activeMonth]);

  const registeredTotal = activeMonthTxs.reduce((sum, t) => sum + (t.amount || 0), 0);
  const isRegistered = activeMonthTxs.length > 0;

  // 2. Planned cards list for this month (when reviewing or if un-registered)
  const plannedCardsData = React.useMemo(() => {
    return expenseCards.map((card) => {
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
    }).filter((c) => c.total > 0);
  }, [expenseCards, inputs]);

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
              {isRegistered ? '出納帳 合計' : 'カード予定 合計'}
            </span>
            <span className="text-sm font-black font-mono text-rose-950">
              ¥{(isRegistered ? registeredTotal : totalAllCardsAmount).toLocaleString()}
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
          <p className="text-[11px] text-slate-500 mb-2.5">
            ※ 上のミニマップで「{monthInt}月」の数字（
            {isRegistered
              ? `¥${Math.round(registeredTotal / 10000)}万`
              : `予 ¥${Math.round(totalAllCardsAmount / 10000)}万`}
            ）のもとになっている経費カード・仕訳の一覧です。
          </p>

          {isRegistered ? (
            /* Registered Transactions Cards Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {activeMonthTxs.map((tx) => (
                <div
                  key={tx.id}
                  className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs hover:border-rose-300 hover:shadow-xs transition-all flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getCategoryBadgeClass(
                          tx.category
                        )}`}
                      >
                        {tx.category}
                      </span>
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

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
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
                </div>
              ))}
            </div>
          ) : (
            /* Unregistered Planned Cards Grid */
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50/80 px-3 py-1.5 rounded-lg border border-amber-200 mb-2">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>
                  {monthInt}月度はまだ出納帳へ計上されていません。現在の設定に基づいた予定カード一覧です。
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
          )}
        </div>
      )}
    </div>
  );
};
