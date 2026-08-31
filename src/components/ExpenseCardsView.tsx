import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Calendar,
  Users,
  Clock,
  HelpCircle,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  DollarSign,
  Layers,
  Sparkles,
  Tag,
  Store,
  Receipt
} from 'lucide-react';
import { ExpenseCard, ExpenseCardSubItem, ExpenseTimingGroup, ExpenseCostType, Transaction, AppSettings, FiscalPeriod } from '../types';

interface BatchExpenseItem {
  title: string;
  category: string;
  costType: ExpenseCostType;
  paymentMethod: string;
  store: string;
  amount: number;
  date: string;
  memo: string;
}

interface ExpenseCardsViewProps {
  settings: AppSettings;
  transactions: Transaction[];
  fiscalPeriods: FiscalPeriod[];
  selectedFilter: string;
  onSelectFilter: (filterId: string) => void;
  onRegisterExpenseBatch: (items: BatchExpenseItem[]) => void;
  onSaveExpenseCards: (cards: ExpenseCard[]) => void;
}

export const TIMING_GROUP_CONFIG: Record<
  ExpenseTimingGroup,
  { label: string; icon: React.FC<any>; color: string; bg: string; border: string; desc: string; defaultMethod: string }
> = {
  credit_card: {
    label: '1. カードで決済しているもの',
    icon: CreditCard,
    color: 'text-indigo-700',
    bg: 'bg-indigo-50/70',
    border: 'border-indigo-200',
    defaultMethod: 'クレジットカード',
    desc: 'カード決済で買ったもの（広告費、SaaSツール、備品など買ったものごとに科目を設定）',
  },
  month_end: {
    label: '2. 末にまとめて払うもの',
    icon: Calendar,
    color: 'text-rose-700',
    bg: 'bg-rose-50/70',
    border: 'border-rose-200',
    defaultMethod: '銀行振込',
    desc: '月末締めの仕入・外注費・買掛金など',
  },
  salary: {
    label: '3. 給与',
    icon: Users,
    color: 'text-emerald-700',
    bg: 'bg-emerald-50/70',
    border: 'border-emerald-200',
    defaultMethod: '銀行振込',
    desc: '役員報酬、正社員・パート給与、外注報酬（25日振込等）',
  },
  month_start: {
    label: '4. 月始あたりに払うもの',
    icon: Clock,
    color: 'text-amber-700',
    bg: 'bg-amber-50/70',
    border: 'border-amber-200',
    defaultMethod: '口座振替',
    desc: '翌月前家賃、定期保守料など',
  },
  other: {
    label: '5. そのた',
    icon: HelpCircle,
    color: 'text-slate-700',
    bg: 'bg-slate-50/70',
    border: 'border-slate-200',
    defaultMethod: '口座振替',
    desc: '水道光熱費、通信費、突発的な支払いなど',
  },
};

export const ExpenseCardsView: React.FC<ExpenseCardsViewProps> = ({
  settings,
  transactions,
  fiscalPeriods,
  selectedFilter,
  onSelectFilter,
  onRegisterExpenseBatch,
  onSaveExpenseCards,
}) => {
  const expenseCards = settings.expenseCards || [];

  // Active Fiscal Period
  const currentPeriod = useMemo(() => {
    if (selectedFilter.startsWith('period-')) {
      return fiscalPeriods.find(p => p.key === selectedFilter) || fiscalPeriods[0];
    }
    return fiscalPeriods[0] || {
      periodNumber: 1,
      label: '第1期',
      key: 'period-1',
      startDate: '2024-04-01',
      endDate: '2025-03-31',
      startMonth: '2024-04',
      endMonth: '2025-03',
      months: ['2024-04', '2024-05', '2024-06', '2024-07', '2024-08', '2024-09', '2024-10', '2024-11', '2024-12', '2025-01', '2025-02', '2025-03'],
    };
  }, [fiscalPeriods, selectedFilter]);

  // Active Month
  const [activeMonth, setActiveMonth] = useState<string>(() => {
    if (currentPeriod?.months?.length > 0) {
      const thisMonth = new Date().toISOString().substring(0, 7);
      if (currentPeriod.months.includes(thisMonth)) return thisMonth;
      return currentPeriod.months[currentPeriod.months.length - 1] || '2025-08';
    }
    return '2025-08';
  });

  // Filter by timing group
  const [activeGroupFilter, setActiveGroupFilter] = useState<string>('ALL');

  // Input states keyed by "cardId" or "cardId_subItemId"
  const [inputs, setInputs] = useState<Record<string, { amount: string; date: string; memo: string; isSelected: boolean }>>(() => {
    const initial: Record<string, { amount: string; date: string; memo: string; isSelected: boolean }> = {};
    expenseCards.forEach((card) => {
      if (card.subItems && card.subItems.length > 0) {
        card.subItems.forEach((sub) => {
          const key = `${card.id}_${sub.id}`;
          initial[key] = {
            amount: sub.defaultAmount ? String(sub.defaultAmount) : '',
            date: `${activeMonth}-25`,
            memo: sub.memo || '',
            isSelected: true,
          };
        });
      } else {
        initial[card.id] = {
          amount: card.defaultAmount ? String(card.defaultAmount) : '',
          date: `${activeMonth}-25`,
          memo: card.memo || '',
          isSelected: true,
        };
      }
    });
    return initial;
  });

  // Update input defaults when month changes
  const handleMonthChange = (newMonth: string) => {
    setActiveMonth(newMonth);
    setInputs((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        next[k] = {
          ...next[k],
          date: `${newMonth}-25`,
        };
      });
      return next;
    });
  };

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Card Editor Modal
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<ExpenseCard | null>(null);

  // Sub-item Quick Add Modal / State
  const [editingSubItem, setEditingSubItem] = useState<{
    cardId: string;
    subItem: ExpenseCardSubItem;
    isNew: boolean;
  } | null>(null);

  // Filtered Cards
  const filteredCards = useMemo(() => {
    return expenseCards.filter((c) => {
      if (activeGroupFilter !== 'ALL' && c.timingGroup !== activeGroupFilter) return false;
      return true;
    });
  }, [expenseCards, activeGroupFilter]);

  // Input change helpers
  const handleAmountChange = (key: string, val: string) => {
    setInputs((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || { date: `${activeMonth}-25`, memo: '', isSelected: true }),
        amount: val,
      },
    }));
  };

  const handleDateChange = (key: string, val: string) => {
    setInputs((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || { amount: '', memo: '', isSelected: true }),
        date: val,
      },
    }));
  };

  const handleToggleSelect = (key: string) => {
    setInputs((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || { amount: '', date: `${activeMonth}-25`, memo: '', isSelected: false }),
        isSelected: !prev[key]?.isSelected,
      },
    }));
  };

  // Calculate total entered amount
  const totalEnteredAmount = useMemo(() => {
    let sum = 0;
    expenseCards.forEach((card) => {
      if (card.subItems && card.subItems.length > 0) {
        card.subItems.forEach((sub) => {
          const key = `${card.id}_${sub.id}`;
          const inp = inputs[key];
          if (inp && inp.isSelected) {
            const num = parseInt(inp.amount.replace(/,/g, ''), 10);
            if (!isNaN(num)) sum += num;
          }
        });
      } else {
        const inp = inputs[card.id];
        if (inp && inp.isSelected) {
          const num = parseInt(inp.amount.replace(/,/g, ''), 10);
          if (!isNaN(num)) sum += num;
        }
      }
    });
    return sum;
  }, [expenseCards, inputs]);

  // Batch register handler
  const handleBatchRegister = () => {
    const itemsToRegister: BatchExpenseItem[] = [];

    expenseCards.forEach((card) => {
      const defaultMethod = TIMING_GROUP_CONFIG[card.timingGroup]?.defaultMethod || 'クレジットカード';
      const paymentMethod = card.paymentMethod || defaultMethod;

      if (card.subItems && card.subItems.length > 0) {
        card.subItems.forEach((sub) => {
          const key = `${card.id}_${sub.id}`;
          const inp = inputs[key];
          if (inp && inp.isSelected) {
            const num = parseInt(inp.amount.replace(/,/g, ''), 10);
            if (!isNaN(num) && num > 0) {
              itemsToRegister.push({
                title: `${card.title} - ${sub.name}`,
                category: sub.category,
                costType: sub.costType,
                paymentMethod,
                store: sub.store || card.store || '全社共通',
                amount: num,
                date: inp.date || `${activeMonth}-25`,
                memo: inp.memo || sub.memo || card.memo || '',
              });
            }
          }
        });
      } else {
        const inp = inputs[card.id];
        if (inp && inp.isSelected) {
          const num = parseInt(inp.amount.replace(/,/g, ''), 10);
          if (!isNaN(num) && num > 0) {
            itemsToRegister.push({
              title: card.title,
              category: card.category || '消耗品費',
              costType: card.costType || 'variable',
              paymentMethod,
              store: card.store || '全社共通',
              amount: num,
              date: inp.date || `${activeMonth}-25`,
              memo: inp.memo || card.memo || '',
            });
          }
        }
      }
    });

    if (itemsToRegister.length === 0) {
      alert('登録する金額が入力されている品目がありません。');
      return;
    }

    onRegisterExpenseBatch(itemsToRegister);
    showToast(`${activeMonth}月分として ${itemsToRegister.length} 件（合計 ¥${itemsToRegister.reduce((s, i) => s + i.amount, 0).toLocaleString()}）の経費を一括計上しました！`);
  };

  // Card Operations
  const handleOpenAddCard = () => {
    setEditingCard({
      id: `ec-${Date.now()}`,
      title: '',
      timingGroup: 'credit_card',
      paymentMethod: 'クレジットカード',
      store: settings.stores[0] || '全社共通',
      memo: '',
      subItems: [],
    });
    setIsCardModalOpen(true);
  };

  const handleSaveCard = (card: ExpenseCard) => {
    let updated: ExpenseCard[];
    if (expenseCards.some((c) => c.id === card.id)) {
      updated = expenseCards.map((c) => (c.id === card.id ? card : c));
    } else {
      updated = [...expenseCards, card];
    }
    onSaveExpenseCards(updated);
    setIsCardModalOpen(false);
    setEditingCard(null);
    showToast(`カード「${card.title}」を保存しました`);
  };

  const handleDeleteCard = (cardId: string) => {
    if (!confirm('この経費カードを削除してもよろしいですか？')) return;
    const updated = expenseCards.filter((c) => c.id !== cardId);
    onSaveExpenseCards(updated);
    showToast('カードを削除しました');
  };

  // Sub-Item Operations
  const handleOpenAddSubItem = (cardId: string) => {
    setEditingSubItem({
      cardId,
      subItem: {
        id: `sub-${Date.now()}`,
        name: '',
        category: settings.expenseCategories[0] || '消耗品費',
        costType: 'variable',
        defaultAmount: 0,
        store: '全社共通',
        memo: '',
      },
      isNew: true,
    });
  };

  const handleOpenEditSubItem = (cardId: string, subItem: ExpenseCardSubItem) => {
    setEditingSubItem({
      cardId,
      subItem: { ...subItem },
      isNew: false,
    });
  };

  const handleSaveSubItem = () => {
    if (!editingSubItem) return;
    const { cardId, subItem, isNew } = editingSubItem;
    if (!subItem.name.trim()) {
      alert('品目・サービス名を入力してください');
      return;
    }

    const targetCard = expenseCards.find((c) => c.id === cardId);
    if (!targetCard) return;

    const existingSubItems = targetCard.subItems || [];
    let updatedSubItems: ExpenseCardSubItem[];

    if (isNew) {
      updatedSubItems = [...existingSubItems, subItem];
    } else {
      updatedSubItems = existingSubItems.map((s) => (s.id === subItem.id ? subItem : s));
    }

    const updatedCard: ExpenseCard = {
      ...targetCard,
      subItems: updatedSubItems,
    };

    const updatedCards = expenseCards.map((c) => (c.id === cardId ? updatedCard : c));
    onSaveExpenseCards(updatedCards);

    // Update input state for this subItem
    const key = `${cardId}_${subItem.id}`;
    if (!inputs[key]) {
      setInputs((prev) => ({
        ...prev,
        [key]: {
          amount: subItem.defaultAmount ? String(subItem.defaultAmount) : '',
          date: `${activeMonth}-25`,
          memo: subItem.memo || '',
          isSelected: true,
        },
      }));
    }

    setEditingSubItem(null);
    showToast(`品目「${subItem.name}」を保存しました`);
  };

  const handleDeleteSubItem = (cardId: string, subItemId: string) => {
    if (!confirm('この品目を削除してもよろしいですか？')) return;
    const targetCard = expenseCards.find((c) => c.id === cardId);
    if (!targetCard || !targetCard.subItems) return;

    const updatedSubItems = targetCard.subItems.filter((s) => s.id !== subItemId);
    const updatedCard: ExpenseCard = { ...targetCard, subItems: updatedSubItems };
    const updatedCards = expenseCards.map((c) => (c.id === cardId ? updatedCard : c));
    onSaveExpenseCards(updatedCards);
    showToast('品目を削除しました');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-sm font-bold border border-slate-800 animate-in fade-in slide-in-from-bottom-5">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-rose-600" />
              <span>経費カード一括入力</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              カード決済や月末支払いで<strong>「何を買ったか（品目）」ごとに勘定科目を分けて</strong>金額を入力・一括計上できます
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddCard}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新しい支払い枠・カードを追加</span>
          </button>
        </div>

        {/* Month Selector & Batch Register Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              対象月:
            </span>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto max-w-full">
              {currentPeriod.months.map((m) => {
                const monthNum = parseInt(m.split('-')[1], 10);
                const isSelected = activeMonth === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleMonthChange(m)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {monthNum}月
                  </button>
                );
              })}
            </div>

            <div className="bg-rose-50 border border-rose-100 px-3 py-1 rounded-xl flex items-center gap-2 text-xs">
              <span className="text-rose-700 font-medium">合計:</span>
              <span className="font-bold font-mono text-rose-900 text-sm">¥{totalEnteredAmount.toLocaleString()}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleBatchRegister}
            disabled={totalEnteredAmount <= 0}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{activeMonth}月分を一括登録する</span>
          </button>
        </div>
      </div>

      {/* Timing Group Filter */}
      <div className="flex flex-wrap items-center gap-1.5 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveGroupFilter('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeGroupFilter === 'ALL'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          すべて ({expenseCards.length})
        </button>
        {(Object.keys(TIMING_GROUP_CONFIG) as ExpenseTimingGroup[]).map((groupKey) => {
          const info = TIMING_GROUP_CONFIG[groupKey];
          const count = expenseCards.filter((c) => c.timingGroup === groupKey).length;
          const isSelected = activeGroupFilter === groupKey;
          return (
            <button
              key={groupKey}
              type="button"
              onClick={() => setActiveGroupFilter(groupKey)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <info.icon className="w-3.5 h-3.5" />
              <span>{info.label.replace(/^[0-9]\.\s*/, '')}</span>
              <span className="text-[10px] opacity-75 font-normal">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Cards List */}
      <div className="space-y-5">
        {filteredCards.map((card) => {
          const groupInfo = TIMING_GROUP_CONFIG[card.timingGroup] || TIMING_GROUP_CONFIG.other;
          const hasSubItems = card.subItems && card.subItems.length > 0;

          // Compute total entered for this card
          let cardTotal = 0;
          if (hasSubItems) {
            card.subItems!.forEach((sub) => {
              const key = `${card.id}_${sub.id}`;
              const inp = inputs[key];
              if (inp && inp.isSelected) {
                const n = parseInt(inp.amount.replace(/,/g, ''), 10);
                if (!isNaN(n)) cardTotal += n;
              }
            });
          } else {
            const inp = inputs[card.id];
            if (inp && inp.isSelected) {
              const n = parseInt(inp.amount.replace(/,/g, ''), 10);
              if (!isNaN(n)) cardTotal += n;
            }
          }

          return (
            <div
              key={card.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
            >
              {/* Card Header Bar */}
              <div className={`px-5 py-3.5 ${groupInfo.bg} border-b ${groupInfo.border} flex flex-col sm:flex-row sm:items-center justify-between gap-2`}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/80 rounded-xl shadow-xs">
                    <groupInfo.icon className={`w-4 h-4 ${groupInfo.color}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm">{card.title}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/80 border ${groupInfo.border} ${groupInfo.color}`}>
                        {groupInfo.label.replace(/^[0-9]\.\s*/, '')}
                      </span>
                      {card.paymentMethod && (
                        <span className="text-[10px] text-slate-500 font-medium bg-white/60 px-1.5 py-0.5 rounded">
                          {card.paymentMethod}
                        </span>
                      )}
                    </div>
                    {card.memo && <p className="text-[11px] text-slate-500 mt-0.5">{card.memo}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block font-medium">この枠の入力小計</span>
                    <span className="text-sm font-bold font-mono text-slate-900">
                      ¥{cardTotal.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 border-l border-slate-200/60 pl-2">
                    <button
                      type="button"
                      onClick={() => handleOpenAddSubItem(card.id)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg shadow-xs flex items-center gap-1 cursor-pointer"
                      title="このカードに買った品目を追加"
                    >
                      <Plus className="w-3 h-3 text-rose-600" />
                      <span>品目を追加</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCard(card);
                        setIsCardModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-white transition-colors"
                      title="カード設定を編集"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCard(card.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white transition-colors"
                      title="カードを削除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Sub-Items List (What was bought) */}
              <div className="divide-y divide-slate-100">
                {hasSubItems ? (
                  card.subItems!.map((sub) => {
                    const key = `${card.id}_${sub.id}`;
                    const input = inputs[key] || { amount: '', date: `${activeMonth}-25`, memo: '', isSelected: true };
                    const isFixed = sub.costType === 'fixed';

                    return (
                      <div
                        key={sub.id}
                        className={`p-4 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                          input.isSelected ? 'bg-white' : 'bg-slate-50/60 opacity-60'
                        }`}
                      >
                        {/* Item Details: Title, Category, CostType */}
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={input.isSelected}
                            onChange={() => handleToggleSelect(key)}
                            className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 mt-1 cursor-pointer shrink-0"
                            title="一括登録に含める"
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-sm text-slate-900">{sub.name}</span>

                              {/* Category Badge */}
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                <Tag className="w-3 h-3 text-slate-400" />
                                {sub.category}
                              </span>

                              {/* Cost Type Badge */}
                              {isFixed ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                                  固定費（定額）
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                                  変動費
                                </span>
                              )}

                              {sub.store && sub.store !== '全社共通' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700">
                                  <Store className="w-3 h-3 text-indigo-400" />
                                  {sub.store}
                                </span>
                              )}
                            </div>

                            {sub.memo && (
                              <p className="text-[11px] text-slate-500 mt-1">{sub.memo}</p>
                            )}
                          </div>
                        </div>

                        {/* Amount & Date Input Controls */}
                        <div className="flex flex-wrap items-center gap-3 self-end lg:self-auto shrink-0">
                          {/* Quick fixed set */}
                          {isFixed && sub.defaultAmount && sub.defaultAmount > 0 && (
                            <button
                              type="button"
                              onClick={() => handleAmountChange(key, String(sub.defaultAmount))}
                              className="text-[11px] font-bold px-2 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 rounded-lg transition-colors cursor-pointer"
                            >
                              固定額 ¥{sub.defaultAmount.toLocaleString()}
                            </button>
                          )}

                          {/* Amount Input */}
                          <div className="relative w-36">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">¥</span>
                            <input
                              type="text"
                              value={input.amount}
                              onChange={(e) => handleAmountChange(key, e.target.value)}
                              placeholder={sub.defaultAmount ? sub.defaultAmount.toLocaleString() : '0'}
                              className="w-full pl-6 pr-3 py-1.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl font-bold text-sm text-slate-900 transition-all text-right font-mono"
                            />
                          </div>

                          {/* Date Input */}
                          <input
                            type="date"
                            value={input.date}
                            onChange={(e) => handleDateChange(key, e.target.value)}
                            className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:outline-none focus:border-rose-500"
                          />

                          {/* Edit / Delete item */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditSubItem(card.id, sub)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                              title="品目を編集"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSubItem(card.id, sub.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100"
                              title="品目を削除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  /* Single Item Card (no subItems defined yet) */
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={inputs[card.id]?.isSelected ?? true}
                        onChange={() => handleToggleSelect(card.id)}
                        className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-700">（カード単体計上）</span>
                          {card.category && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">
                              {card.category}
                            </span>
                          )}
                          {card.costType === 'fixed' ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">固定費</span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700">変動費</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          右上の「品目を追加」からGoogle広告やサーバー代など明細を分けて登録できます
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <div className="relative w-36">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">¥</span>
                        <input
                          type="text"
                          value={inputs[card.id]?.amount ?? ''}
                          onChange={(e) => handleAmountChange(card.id, e.target.value)}
                          placeholder={card.defaultAmount ? card.defaultAmount.toLocaleString() : '0'}
                          className="w-full pl-6 pr-3 py-1.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-rose-500 rounded-xl font-bold text-sm text-slate-900 text-right font-mono"
                        />
                      </div>

                      <input
                        type="date"
                        value={inputs[card.id]?.date ?? `${activeMonth}-25`}
                        onChange={(e) => handleDateChange(card.id, e.target.value)}
                        className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sub-Item Add / Edit Modal */}
      {editingSubItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">
                  {editingSubItem.isNew ? '品目の追加（何を買ったか）' : '品目の編集'}
                </h3>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  購入内容ごとに勘定科目と固定／変動を設定します
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingSubItem(null)}
                className="text-slate-400 hover:text-white font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  品目・サービス名 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingSubItem.subItem.name}
                  onChange={(e) =>
                    setEditingSubItem({
                      ...editingSubItem,
                      subItem: { ...editingSubItem.subItem, name: e.target.value },
                    })
                  }
                  placeholder="例: Google広告、Canva、店舗消耗品、AWSサーバー等"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-rose-500 focus:outline-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  勘定科目 <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editingSubItem.subItem.category}
                  onChange={(e) =>
                    setEditingSubItem({
                      ...editingSubItem,
                      subItem: { ...editingSubItem.subItem, category: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-rose-500"
                >
                  {settings.expenseCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cost Type: Fixed vs Variable */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  金額タイプ <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingSubItem({
                        ...editingSubItem,
                        subItem: { ...editingSubItem.subItem, costType: 'fixed' },
                      })
                    }
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      editingSubItem.subItem.costType === 'fixed'
                        ? 'border-blue-500 bg-blue-50 text-blue-900 font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="text-xs">固定費（定額）</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">SaaS月額・家賃等</div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setEditingSubItem({
                        ...editingSubItem,
                        subItem: { ...editingSubItem.subItem, costType: 'variable' },
                      })
                    }
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      editingSubItem.subItem.costType === 'variable'
                        ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="text-xs">変動費</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">広告・仕入・買い出し等</div>
                  </button>
                </div>
              </div>

              {/* Default Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  目安・固定金額 (円)
                </label>
                <input
                  type="number"
                  value={editingSubItem.subItem.defaultAmount || ''}
                  onChange={(e) =>
                    setEditingSubItem({
                      ...editingSubItem,
                      subItem: { ...editingSubItem.subItem, defaultAmount: parseInt(e.target.value, 10) || 0 },
                    })
                  }
                  placeholder="例: 15000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 text-right font-mono"
                />
              </div>

              {/* Memo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  メモ・備考
                </label>
                <input
                  type="text"
                  value={editingSubItem.subItem.memo || ''}
                  onChange={(e) =>
                    setEditingSubItem({
                      ...editingSubItem,
                      subItem: { ...editingSubItem.subItem, memo: e.target.value },
                    })
                  }
                  placeholder="例: 月初引落、3アカウント分など"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingSubItem(null)}
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleSaveSubItem}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
              >
                保存する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Card Add / Edit Modal */}
      {isCardModalOpen && editingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">
                  {editingCard.title ? '支払い枠・カードの編集' : '新しい支払い枠・カードを作成'}
                </h3>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  カード名や支払いタイミング（決済グループ）を設定します
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCardModalOpen(false);
                  setEditingCard(null);
                }}
                className="text-slate-400 hover:text-white font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  カード名・支払枠名 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingCard.title}
                  onChange={(e) => setEditingCard({ ...editingCard, title: e.target.value })}
                  placeholder="例: 三井住友カード決済、月末買掛金支払、役員報酬など"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              {/* Timing Group */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  支払グループ（タイミング） <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(Object.keys(TIMING_GROUP_CONFIG) as ExpenseTimingGroup[]).map((groupKey) => {
                    const info = TIMING_GROUP_CONFIG[groupKey];
                    const isSelected = editingCard.timingGroup === groupKey;
                    return (
                      <button
                        key={groupKey}
                        type="button"
                        onClick={() =>
                          setEditingCard({
                            ...editingCard,
                            timingGroup: groupKey,
                            paymentMethod: info.defaultMethod,
                          })
                        }
                        className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2 cursor-pointer ${
                          isSelected
                            ? 'border-rose-500 bg-rose-50 ring-1 ring-rose-500 text-rose-950 font-bold'
                            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <info.icon className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-rose-600' : 'text-slate-400'}`} />
                        <div>
                          <div className="text-xs">{info.label}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{info.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  決済方法
                </label>
                <select
                  value={editingCard.paymentMethod || 'クレジットカード'}
                  onChange={(e) => setEditingCard({ ...editingCard, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                >
                  {settings.paymentMethods.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Memo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  備考・引落口座メモなど
                </label>
                <input
                  type="text"
                  value={editingCard.memo || ''}
                  onChange={(e) => setEditingCard({ ...editingCard, memo: e.target.value })}
                  placeholder="例: 毎月27日引落、メインカードなど"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsCardModalOpen(false);
                  setEditingCard(null);
                }}
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="button"
                disabled={!editingCard.title.trim()}
                onClick={() => handleSaveCard(editingCard)}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
              >
                保存する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
