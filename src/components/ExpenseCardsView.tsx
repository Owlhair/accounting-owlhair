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
  ArrowRight,
  Sparkles,
  Zap,
  Tag,
  Store,
  ChevronRight,
  Receipt,
  FileSpreadsheet
} from 'lucide-react';
import { ExpenseCard, ExpenseTimingGroup, ExpenseCostType, Transaction, AppSettings, FiscalPeriod } from '../types';
import { formatCurrency, formatNumber } from '../utils/calculations';

interface ExpenseCardsViewProps {
  settings: AppSettings;
  transactions: Transaction[];
  fiscalPeriods: FiscalPeriod[];
  selectedFilter: string;
  onSelectFilter: (filterId: string) => void;
  onRegisterExpenseBatch: (items: { card: ExpenseCard; amount: number; date: string; memo: string }[]) => void;
  onSaveExpenseCards: (cards: ExpenseCard[]) => void;
}

export const TIMING_GROUP_CONFIG: Record<
  ExpenseTimingGroup,
  { label: string; icon: React.FC<any>; color: string; bg: string; border: string; desc: string; badgeBg: string }
> = {
  credit_card: {
    label: '1. カードで決済しているもの',
    icon: CreditCard,
    color: 'text-indigo-700',
    bg: 'bg-indigo-50/70',
    border: 'border-indigo-200',
    badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    desc: 'Webツール、Google/SNS広告、消耗品備品などのカード決済',
  },
  month_end: {
    label: '2. 末にまとめて払うもの',
    icon: Calendar,
    color: 'text-rose-700',
    bg: 'bg-rose-50/70',
    border: 'border-rose-200',
    badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
    desc: '仕入代金・買掛金振込、月末締めの請求書払いなど',
  },
  salary: {
    label: '3. 給与',
    icon: Users,
    color: 'text-emerald-700',
    bg: 'bg-emerald-50/70',
    border: 'border-emerald-200',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    desc: '役員報酬、スタッフ給料、外注報酬（25日振込等）',
  },
  month_start: {
    label: '4. 月始あたりに払うもの',
    icon: Clock,
    color: 'text-amber-700',
    bg: 'bg-amber-50/70',
    border: 'border-amber-200',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
    desc: '翌月分の前家賃、定期保守料、月初の振込・引落など',
  },
  other: {
    label: '5. そのた',
    icon: HelpCircle,
    color: 'text-slate-700',
    bg: 'bg-slate-50/70',
    border: 'border-slate-200',
    badgeBg: 'bg-slate-100 text-slate-800 border-slate-200',
    desc: '水道光熱費・通信費・交通費・突発的な経費など',
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

  // Current active fiscal period
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

  // Active Selected Month within the period
  const [activeMonth, setActiveMonth] = useState<string>(() => {
    if (currentPeriod?.months?.length > 0) {
      const thisMonth = new Date().toISOString().substring(0, 7);
      if (currentPeriod.months.includes(thisMonth)) return thisMonth;
      return currentPeriod.months[currentPeriod.months.length - 1] || '2025-08';
    }
    return '2025-08';
  });

  // Group filter
  const [activeGroupFilter, setActiveGroupFilter] = useState<string>('ALL');

  // Cost type filter: fixed vs variable
  const [activeCostFilter, setActiveCostFilter] = useState<string>('ALL');

  // Input states per card for activeMonth
  const [cardInputs, setCardInputs] = useState<Record<string, { amount: string; date: string; memo: string; isSelected: boolean }>>(() => {
    const initial: Record<string, { amount: string; date: string; memo: string; isSelected: boolean }> = {};
    expenseCards.forEach((c) => {
      initial[c.id] = {
        amount: c.defaultAmount ? String(c.defaultAmount) : '',
        date: `${activeMonth}-25`,
        memo: c.memo || '',
        isSelected: true,
      };
    });
    return initial;
  });

  // Update input defaults when month changes
  const handleMonthChange = (newMonth: string) => {
    setActiveMonth(newMonth);
    setCardInputs((prev) => {
      const next = { ...prev };
      expenseCards.forEach((c) => {
        if (!next[c.id]) {
          next[c.id] = {
            amount: c.defaultAmount ? String(c.defaultAmount) : '',
            date: `${newMonth}-25`,
            memo: c.memo || '',
            isSelected: true,
          };
        } else {
          next[c.id] = {
            ...next[c.id],
            date: `${newMonth}-25`,
          };
        }
      });
      return next;
    });
  };

  // Add / Edit Card Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<ExpenseCard | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filtered Cards
  const filteredCards = useMemo(() => {
    return expenseCards.filter((card) => {
      if (activeGroupFilter !== 'ALL' && card.timingGroup !== activeGroupFilter) return false;
      if (activeCostFilter !== 'ALL' && card.costType !== activeCostFilter) return false;
      return true;
    });
  }, [expenseCards, activeGroupFilter, activeCostFilter]);

  // Check which cards have existing registered transactions in activeMonth
  const registeredStatus = useMemo(() => {
    const status: Record<string, { count: number; total: number }> = {};
    transactions
      .filter((t) => t.type === 'expense' && (t.date_from || t.date_to || '').startsWith(activeMonth))
      .forEach((t) => {
        expenseCards.forEach((card) => {
          if (t.category === card.category || (t.memo && t.memo.includes(card.title))) {
            if (!status[card.id]) status[card.id] = { count: 0, total: 0 };
            status[card.id].count += 1;
            status[card.id].total += t.amount;
          }
        });
      });
    return status;
  }, [transactions, activeMonth, expenseCards]);

  // Total amount entered for checked cards
  const totalEnteredAmount = useMemo(() => {
    let sum = 0;
    expenseCards.forEach((c) => {
      const inp = cardInputs[c.id];
      if (inp && inp.isSelected) {
        const val = parseInt(inp.amount.replace(/,/g, ''), 10);
        if (!isNaN(val)) sum += val;
      }
    });
    return sum;
  }, [expenseCards, cardInputs]);

  // Total registered in activeMonth across all expense transactions
  const totalMonthExpense = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'expense' && (t.date_from || t.date_to || '').startsWith(activeMonth))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, activeMonth]);

  // Input change handler
  const handleAmountChange = (cardId: string, val: string) => {
    setCardInputs((prev) => ({
      ...prev,
      [cardId]: {
        ...(prev[cardId] || { date: `${activeMonth}-25`, memo: '', isSelected: true }),
        amount: val,
      },
    }));
  };

  const handleDateChange = (cardId: string, val: string) => {
    setCardInputs((prev) => ({
      ...prev,
      [cardId]: {
        ...(prev[cardId] || { amount: '', memo: '', isSelected: true }),
        date: val,
      },
    }));
  };

  const handleToggleSelect = (cardId: string) => {
    setCardInputs((prev) => ({
      ...prev,
      [cardId]: {
        ...(prev[cardId] || { amount: '', date: `${activeMonth}-25`, memo: '', isSelected: false }),
        isSelected: !prev[cardId]?.isSelected,
      },
    }));
  };

  // Batch register
  const handleBatchRegister = () => {
    const items: { card: ExpenseCard; amount: number; date: string; memo: string }[] = [];

    expenseCards.forEach((card) => {
      const inp = cardInputs[card.id];
      if (inp && inp.isSelected) {
        const num = parseInt(inp.amount.replace(/,/g, ''), 10);
        if (!isNaN(num) && num > 0) {
          items.push({
            card,
            amount: num,
            date: inp.date || `${activeMonth}-25`,
            memo: inp.memo || card.memo || '',
          });
        }
      }
    });

    if (items.length === 0) {
      alert('登録する金額が入力されているカードがありません。');
      return;
    }

    onRegisterExpenseBatch(items);
    showToast(`${activeMonth}月分として ${items.length} 件の経費（合計 ¥${items.reduce((s, i) => s + i.amount, 0).toLocaleString()}）を一括登録しました！`);
  };

  // Open Create
  const handleOpenAdd = () => {
    setEditingCard({
      id: `ec-${Date.now()}`,
      title: '',
      category: settings.expenseCategories[0] || '消耗品費',
      timingGroup: 'credit_card',
      costType: 'variable',
      defaultAmount: 0,
      store: settings.stores[0] || '全社共通',
      memo: '',
    });
    setIsModalOpen(true);
  };

  // Save Card
  const handleSaveCard = (card: ExpenseCard) => {
    let updated: ExpenseCard[];
    if (expenseCards.some((c) => c.id === card.id)) {
      updated = expenseCards.map((c) => (c.id === card.id ? card : c));
    } else {
      updated = [...expenseCards, card];
    }
    onSaveExpenseCards(updated);
    setIsModalOpen(false);
    setEditingCard(null);
    showToast(`経費カード「${card.title}」を保存しました`);
  };

  // Delete Card
  const handleDeleteCard = (id: string) => {
    if (!confirm('この経費カードを削除してもよろしいですか？')) return;
    const updated = expenseCards.filter((c) => c.id !== id);
    onSaveExpenseCards(updated);
    showToast('経費カードを削除しました');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-sm font-bold border border-slate-800 animate-in fade-in slide-in-from-bottom-5">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-indigo-900/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="px-3 py-1 bg-rose-500/30 border border-rose-400/40 rounded-full text-xs font-black text-rose-300 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-rose-400" />
                経費カード一括入力
              </span>
              <span className="text-xs text-slate-400 font-medium">5大グループ × 固定費・変動費</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
              <span>経費カードボード</span>
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl leading-relaxed">
              カード決済・月末振込・給与・家賃など、支払グループ別にカード化。金額を入れて「一括登録」するだけで帳簿へ自動反映されます。
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg transition-all flex items-center gap-2 active:scale-95 self-start md:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            新しい経費カードを作成
          </button>
        </div>

        {/* Month Selector & Batch Register Bar */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-rose-400" />
              対象月を選択:
            </span>
            <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-2xl border border-slate-700 overflow-x-auto max-w-full">
              {currentPeriod.months.map((m) => {
                const monthNum = parseInt(m.split('-')[1], 10);
                const isSelected = activeMonth === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleMonthChange(m)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      isSelected
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'text-slate-300 hover:bg-slate-700/60'
                    }`}
                  >
                    {monthNum}月
                  </button>
                );
              })}
            </div>

            <div className="bg-indigo-900/40 border border-indigo-700/50 px-3.5 py-1.5 rounded-2xl flex items-center gap-2">
              <span className="text-xs text-indigo-200 font-bold">入力合計:</span>
              <span className="text-base font-black text-amber-300">¥{totalEnteredAmount.toLocaleString()}</span>
            </div>

            {totalMonthExpense > 0 && (
              <div className="bg-slate-800/80 border border-slate-700 px-3.5 py-1.5 rounded-2xl text-xs text-slate-300">
                <span>{activeMonth}月 登録済総額: </span>
                <span className="font-bold text-white">¥{totalMonthExpense.toLocaleString()}</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleBatchRegister}
            disabled={totalEnteredAmount <= 0}
            className="w-full lg:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:pointer-events-none text-white font-black text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>{activeMonth}月分を一括登録する</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200/80 space-y-4">
        {/* 5 Timing Groups Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            支払グループ
          </span>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveGroupFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeGroupFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              すべて ({expenseCards.length})
            </button>
            {(Object.keys(TIMING_GROUP_CONFIG) as ExpenseTimingGroup[]).map((groupKey) => {
              const info = TIMING_GROUP_CONFIG[groupKey];
              const count = expenseCards.filter((c) => c.timingGroup === groupKey).length;
              return (
                <button
                  key={groupKey}
                  type="button"
                  onClick={() => setActiveGroupFilter(groupKey)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeGroupFilter === groupKey
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <info.icon className="w-3.5 h-3.5" />
                  <span>{info.label.replace(/^[0-9]\.\s*/, '')}</span>
                  <span className="text-[10px] opacity-75 font-normal">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cost Type Filter: Fixed vs Variable */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            金額タイプ
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveCostFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeCostFilter === 'ALL'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              全タイプ
            </button>
            <button
              type="button"
              onClick={() => setActiveCostFilter('fixed')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                activeCostFilter === 'fixed'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              毎月決まっている（固定費）
            </button>
            <button
              type="button"
              onClick={() => setActiveCostFilter('variable')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                activeCostFilter === 'variable'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              毎月変わる（変動費）
            </button>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      {filteredCards.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300 space-y-4">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto">
            <Layers className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800">経費カードがありません</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              クレジットカード決済、家賃、給与、仕入れなど、毎月発生する経費カードを作成して一元管理しましょう。
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold text-xs shadow-md transition-all inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            経費カードを追加する
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredCards.map((card) => {
            const groupInfo = TIMING_GROUP_CONFIG[card.timingGroup] || TIMING_GROUP_CONFIG.other;
            const input = cardInputs[card.id] || { amount: '', date: `${activeMonth}-25`, memo: '', isSelected: true };
            const registered = registeredStatus[card.id];

            return (
              <div
                key={card.id}
                className={`bg-white rounded-3xl border transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between overflow-hidden relative ${
                  input.isSelected ? 'border-rose-300 ring-2 ring-rose-500/10' : 'border-slate-200 opacity-80'
                }`}
              >
                {/* Timing Badge Bar */}
                <div className={`px-4 py-2.5 ${groupInfo.bg} border-b ${groupInfo.border} flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <groupInfo.icon className={`w-4 h-4 ${groupInfo.color}`} />
                    <span className={`text-xs font-black ${groupInfo.color}`}>
                      {groupInfo.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {card.costType === 'fixed' ? (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200">
                        固定費（定額）
                      </span>
                    ) : (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                        変動費
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setEditingCard(card);
                        setIsModalOpen(true);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-white/80 transition-colors"
                      title="カード設定を編集"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCard(card.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white/80 transition-colors"
                      title="カードを削除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-4 flex-1">
                  {/* Title & Tags */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-black text-base text-slate-900 tracking-tight leading-snug">
                        {card.title}
                      </h3>
                      <input
                        type="checkbox"
                        checked={input.isSelected}
                        onChange={() => handleToggleSelect(card.id)}
                        className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 mt-1 cursor-pointer"
                        title="一括登録に含める"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        <Tag className="w-3 h-3 text-slate-500" />
                        {card.category}
                      </span>
                      {card.store && card.store !== '全社共通' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          <Store className="w-3 h-3 text-indigo-500" />
                          {card.store}
                        </span>
                      )}
                    </div>

                    {card.memo && (
                      <p className="text-[11px] text-slate-500 mt-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                        {card.memo}
                      </p>
                    )}
                  </div>

                  {/* Registered Status in activeMonth */}
                  {registered && (
                    <div className="p-2.5 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl flex items-center justify-between text-xs font-bold text-emerald-800">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{activeMonth}月に登録済:</span>
                      </span>
                      <span className="font-black">
                        ¥{registered.total.toLocaleString()} ({registered.count}件)
                      </span>
                    </div>
                  )}

                  {/* Input Form for this month */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider">
                      {activeMonth}月の支払金額
                    </label>

                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">¥</span>
                      <input
                        type="text"
                        value={input.amount}
                        onChange={(e) => handleAmountChange(card.id, e.target.value)}
                        placeholder={card.defaultAmount ? card.defaultAmount.toLocaleString() : '0'}
                        className="w-full pl-8 pr-4 py-2.5 bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 rounded-2xl font-black text-base text-slate-900 transition-all text-right"
                      />
                    </div>

                    {/* Quick Preset for fixed amount */}
                    {card.defaultAmount && card.defaultAmount > 0 && (
                      <div className="flex items-center justify-end gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => handleAmountChange(card.id, String(card.defaultAmount))}
                          className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 rounded-md transition-colors"
                        >
                          固定額セット (¥{card.defaultAmount.toLocaleString()})
                        </button>
                      </div>
                    )}

                    {/* Payment Date Input */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-[11px] text-slate-500 font-bold">支払日:</span>
                      <input
                        type="date"
                        value={input.date}
                        onChange={(e) => handleDateChange(card.id, e.target.value)}
                        className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit / Add Modal */}
      {isModalOpen && editingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-slate-900 to-rose-950 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black tracking-tight">
                  {editingCard.title ? '経費カードの編集' : '新しい経費カードの作成'}
                </h3>
                <p className="text-xs text-rose-200 mt-0.5">
                  支払グループや固定・変動タイプを設定して毎月の入力を自動化
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingCard(null);
                }}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Title */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  項目名・支払い名 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingCard.title}
                  onChange={(e) => setEditingCard({ ...editingCard, title: e.target.value })}
                  placeholder="例: 店舗家賃、Google広告料、役員報酬、商品仕入など"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-rose-500 focus:outline-none"
                />
              </div>

              {/* Timing Group */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
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
                        onClick={() => setEditingCard({ ...editingCard, timingGroup: groupKey })}
                        className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-2.5 cursor-pointer ${
                          isSelected
                            ? 'border-rose-500 bg-rose-50/70 ring-2 ring-rose-500/20'
                            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100'
                        }`}
                      >
                        <info.icon className={`w-4 h-4 mt-0.5 ${isSelected ? 'text-rose-600' : 'text-slate-500'}`} />
                        <div>
                          <div className={`text-xs font-black ${isSelected ? 'text-rose-900' : 'text-slate-800'}`}>
                            {info.label}
                          </div>
                          <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                            {info.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cost Type: Fixed vs Variable */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  金額タイプ <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingCard({ ...editingCard, costType: 'fixed' })}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                      editingCard.costType === 'fixed'
                        ? 'border-blue-500 bg-blue-50/80 ring-2 ring-blue-500/20 text-blue-950 font-black'
                        : 'border-slate-200 bg-slate-50 text-slate-700 font-bold'
                    }`}
                  >
                    <div className="text-xs">毎月決まっている（固定費）</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">家賃・役員報酬・月額リースなど</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingCard({ ...editingCard, costType: 'variable' })}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                      editingCard.costType === 'variable'
                        ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-500/20 text-amber-950 font-black'
                        : 'border-slate-200 bg-slate-50 text-slate-700 font-bold'
                    }`}
                  >
                    <div className="text-xs">毎月変わる（変動費）</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">クレカ請求・仕入・水道光熱費など</div>
                  </button>
                </div>
              </div>

              {/* Category & Store */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    勘定科目 <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editingCard.category}
                    onChange={(e) => setEditingCard({ ...editingCard, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  >
                    {settings.expenseCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    店舗・拠点
                  </label>
                  <select
                    value={editingCard.store || '全社共通'}
                    onChange={(e) => setEditingCard({ ...editingCard, store: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  >
                    {settings.stores.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Default Amount */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  基準・固定金額 (円)
                </label>
                <input
                  type="number"
                  value={editingCard.defaultAmount || ''}
                  onChange={(e) => setEditingCard({ ...editingCard, defaultAmount: parseInt(e.target.value, 10) || 0 })}
                  placeholder="例: 180000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 text-right"
                />
              </div>

              {/* Memo */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  備考・メモ（引落口座や決済カード名など）
                </label>
                <input
                  type="text"
                  value={editingCard.memo || ''}
                  onChange={(e) => setEditingCard({ ...editingCard, memo: e.target.value })}
                  placeholder="例: 三井住友VISAカード引落、毎月27日振込など"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingCard(null);
                }}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="button"
                disabled={!editingCard.title.trim()}
                onClick={() => handleSaveCard(editingCard)}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
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
