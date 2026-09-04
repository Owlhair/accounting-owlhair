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
  Receipt,
  Copy,
  LayoutGrid,
  List,
  RotateCcw,
  ArrowDownToLine,
  Check,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import {
  ExpenseCard,
  ExpenseCardSubItem,
  ExpenseTimingGroup,
  ExpenseCostType,
  Transaction,
  AppSettings,
  FiscalPeriod,
} from '../types';

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
  {
    label: string;
    icon: React.FC<any>;
    color: string;
    bg: string;
    border: string;
    accentBg: string;
    desc: string;
    defaultMethod: string;
  }
> = {
  credit_card: {
    label: '1. カードで決済しているもの',
    icon: CreditCard,
    color: 'text-indigo-700',
    bg: 'bg-indigo-50/70',
    border: 'border-indigo-200',
    accentBg: 'from-indigo-600 to-indigo-800',
    defaultMethod: 'クレジットカード',
    desc: 'カード決済で買ったもの（広告費、SaaSツール、備品など買ったものごとに科目を設定）',
  },
  month_end: {
    label: '2. 末にまとめて払うもの',
    icon: Calendar,
    color: 'text-rose-700',
    bg: 'bg-rose-50/70',
    border: 'border-rose-200',
    accentBg: 'from-rose-600 to-rose-800',
    defaultMethod: '銀行振込',
    desc: '月末締めの仕入・外注費・買掛金など',
  },
  salary: {
    label: '3. 給与',
    icon: Users,
    color: 'text-emerald-700',
    bg: 'bg-emerald-50/70',
    border: 'border-emerald-200',
    accentBg: 'from-emerald-600 to-emerald-800',
    defaultMethod: '銀行振込',
    desc: '役員報酬、正社員・パート給与、外注報酬（25日振込等）',
  },
  month_start: {
    label: '4. 月始あたりに払うもの',
    icon: Clock,
    color: 'text-amber-700',
    bg: 'bg-amber-50/70',
    border: 'border-amber-200',
    accentBg: 'from-amber-600 to-amber-800',
    defaultMethod: '口座振替',
    desc: '翌月前家賃、定期保守料など',
  },
  other: {
    label: '5. そのた',
    icon: HelpCircle,
    color: 'text-slate-700',
    bg: 'bg-slate-50/70',
    border: 'border-slate-200',
    accentBg: 'from-slate-700 to-slate-900',
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
  const closedStores = settings.closedStores || [];

  // Active Fiscal Period
  const currentPeriod = useMemo(() => {
    if (selectedFilter.startsWith('period-')) {
      return fiscalPeriods.find((p) => p.key === selectedFilter) || fiscalPeriods[0];
    }
    return (
      fiscalPeriods[0] || {
        periodNumber: 1,
        label: '第1期',
        key: 'period-1',
        startDate: '2024-04-01',
        endDate: '2025-03-31',
        startMonth: '2024-04',
        endMonth: '2025-03',
        months: ['2024-04', '2024-05', '2024-06', '2024-07', '2024-08', '2024-09', '2024-10', '2024-11', '2024-12', '2025-01', '2025-02', '2025-03'],
      }
    );
  }, [selectedFilter, fiscalPeriods]);

  // Active Month
  const [activeMonth, setActiveMonth] = useState<string>(() => {
    if (currentPeriod?.months?.length > 0) {
      const thisMonth = new Date().toISOString().substring(0, 7);
      if (currentPeriod.months.includes(thisMonth)) return thisMonth;
      return currentPeriod.months[currentPeriod.months.length - 1] || '2025-08';
    }
    return '2025-08';
  });

  // Layout View Mode: 'grid' (Card layout) vs 'list' (Classic table list)
  const [viewLayout, setViewLayout] = useState<'grid' | 'list'>(() => {
    try {
      const saved = localStorage.getItem('scratch_keiri_expense_view_layout');
      if (saved === 'grid' || saved === 'list') return saved;
    } catch (e) {}
    return 'grid'; // Default is card grid!
  });

  const handleLayoutChange = (mode: 'grid' | 'list') => {
    setViewLayout(mode);
    try {
      localStorage.setItem('scratch_keiri_expense_view_layout', mode);
    } catch (e) {}
  };

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

  // Update input dates when month changes
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
    setTimeout(() => setToastMessage(null), 3500);
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

  // Available stores (excluding closed stores)
  const availableStores = useMemo(() => {
    const all = settings.stores && settings.stores.length > 0 ? settings.stores : ['太宰府店', '本店', '2号店', '全社共通'];
    return all.filter((s) => !closedStores.includes(s));
  }, [settings.stores, closedStores]);

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

  const handleMemoChange = (key: string, val: string) => {
    setInputs((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || { amount: '', date: `${activeMonth}-25`, isSelected: true }),
        memo: val,
      },
    }));
  };

  const handleToggleSelect = (key: string) => {
    setInputs((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || { amount: '', date: `${activeMonth}-25`, memo: '', isSelected: true }),
        isSelected: !prev[key]?.isSelected,
      },
    }));
  };

  const handleSetFixedAmount = (key: string, defaultAmount?: number) => {
    if (defaultAmount) {
      handleAmountChange(key, String(defaultAmount));
    }
  };

  // Helper to calculate previous month string (e.g. "2025-06" -> "2025-05")
  const getPreviousMonth = (monthStr: string): string => {
    const [y, m] = monthStr.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const prevY = prevDate.getFullYear();
    const prevM = String(prevDate.getMonth() + 1).padStart(2, '0');
    return `${prevY}-${prevM}`;
  };

  const prevMonthStr = useMemo(() => getPreviousMonth(activeMonth), [activeMonth]);

  // COPY FEATURE 1: Copy previous month's amounts across all cards or single card
  const handleCopyPreviousMonthData = (targetCardId?: string) => {
    const prevMonth = getPreviousMonth(activeMonth);
    let copiedCount = 0;
    let copiedTotal = 0;

    // Find actual transactions recorded in the previous month
    const prevMonthTx = transactions.filter((t) => {
      const txMonth = (t.date_from || t.date_to || '').substring(0, 7);
      return t.type === 'expense' && txMonth === prevMonth;
    });

    setInputs((prev) => {
      const next = { ...prev };

      expenseCards.forEach((card) => {
        if (targetCardId && card.id !== targetCardId) return;

        if (card.subItems && card.subItems.length > 0) {
          card.subItems.forEach((sub) => {
            const key = `${card.id}_${sub.id}`;
            // 1. Try to find matched transaction from prevMonth
            const matchedTx = prevMonthTx.find(
              (t) =>
                t.description.includes(sub.name) ||
                (t.category === sub.category && (!sub.store || sub.store === '全社共通' || t.store === sub.store))
            );

            let amt = '';
            if (matchedTx && matchedTx.amount > 0) {
              amt = String(matchedTx.amount);
            } else if (sub.defaultAmount && sub.defaultAmount > 0) {
              amt = String(sub.defaultAmount);
            }

            if (amt) {
              next[key] = {
                ...(next[key] || { date: `${activeMonth}-25`, memo: sub.memo || '', isSelected: true }),
                amount: amt,
                isSelected: true,
              };
              copiedCount++;
              copiedTotal += Number(amt) || 0;
            }
          });
        } else {
          const key = card.id;
          const matchedTx = prevMonthTx.find(
            (t) => t.description.includes(card.title) || (card.category && t.category === card.category)
          );

          let amt = '';
          if (matchedTx && matchedTx.amount > 0) {
            amt = String(matchedTx.amount);
          } else if (card.defaultAmount && card.defaultAmount > 0) {
            amt = String(card.defaultAmount);
          }

          if (amt) {
            next[key] = {
              ...(next[key] || { date: `${activeMonth}-25`, memo: card.memo || '', isSelected: true }),
              amount: amt,
              isSelected: true,
            };
            copiedCount++;
            copiedTotal += Number(amt) || 0;
          }
        }
      });

      return next;
    });

    const [prevY, prevM] = prevMonth.split('-');
    if (copiedCount > 0) {
      showToast(
        `📋 前月 (${prevY}年${parseInt(prevM, 10)}月度) から ${copiedCount}件 (合計 ¥${copiedTotal.toLocaleString()}) をコピーしました！`
      );
    } else {
      showToast(`前月 (${prevY}年${parseInt(prevM, 10)}月度) のデータが未登録のため、各品目の定額・標準設定値を反映しました。`);
    }
  };

  // COPY FEATURE 2: Duplicate an entire card
  const handleDuplicateCard = (cardId: string) => {
    const target = expenseCards.find((c) => c.id === cardId);
    if (!target) return;

    const newCardId = `ec-${Date.now()}`;
    const duplicated: ExpenseCard = {
      ...target,
      id: newCardId,
      title: `${target.title} (コピー)`,
      subItems: target.subItems?.map((s, idx) => ({
        ...s,
        id: `sub-${Date.now()}-${idx}`,
      })),
    };

    const updatedCards = [...expenseCards, duplicated];
    onSaveExpenseCards(updatedCards);
    showToast(`カード「${duplicated.title}」を複製して作成しました`);
  };

  // COPY FEATURE 3: Duplicate a subItem within a card
  const handleDuplicateSubItem = (cardId: string, subItem: ExpenseCardSubItem) => {
    const targetCard = expenseCards.find((c) => c.id === cardId);
    if (!targetCard || !targetCard.subItems) return;

    const newSubItem: ExpenseCardSubItem = {
      ...subItem,
      id: `sub-${Date.now()}`,
      name: `${subItem.name} (コピー)`,
    };

    const updatedSubItems = [...targetCard.subItems, newSubItem];
    const updatedCard: ExpenseCard = { ...targetCard, subItems: updatedSubItems };
    const updatedCards = expenseCards.map((c) => (c.id === cardId ? updatedCard : c));
    onSaveExpenseCards(updatedCards);

    // Also populate input state
    const newKey = `${cardId}_${newSubItem.id}`;
    setInputs((prev) => ({
      ...prev,
      [newKey]: {
        amount: newSubItem.defaultAmount ? String(newSubItem.defaultAmount) : '',
        date: `${activeMonth}-25`,
        memo: newSubItem.memo || '',
        isSelected: true,
      },
    }));

    showToast(`品目「${newSubItem.name}」を複製しました`);
  };

  // Calculate card subtotal for a specific card
  const getCardEnteredSubtotal = (card: ExpenseCard) => {
    let subtotal = 0;
    if (card.subItems && card.subItems.length > 0) {
      card.subItems.forEach((sub) => {
        const key = `${card.id}_${sub.id}`;
        const item = inputs[key];
        if (item?.isSelected) {
          subtotal += Number(item.amount) || 0;
        }
      });
    } else {
      const item = inputs[card.id];
      if (item?.isSelected) {
        subtotal += Number(item.amount) || 0;
      }
    }
    return subtotal;
  };

  // Calculate Total Entered Amount
  const totalEnteredAmount = useMemo(() => {
    let sum = 0;
    filteredCards.forEach((card) => {
      sum += getCardEnteredSubtotal(card);
    });
    return sum;
  }, [filteredCards, inputs]);

  // Calculate count of entered items
  const enteredItemsCount = useMemo(() => {
    let count = 0;
    filteredCards.forEach((card) => {
      if (card.subItems && card.subItems.length > 0) {
        card.subItems.forEach((sub) => {
          const item = inputs[`${card.id}_${sub.id}`];
          if (item?.isSelected && Number(item.amount) > 0) count++;
        });
      } else {
        const item = inputs[card.id];
        if (item?.isSelected && Number(item.amount) > 0) count++;
      }
    });
    return count;
  }, [filteredCards, inputs]);

  // Execute Batch Register
  const handleBatchRegister = () => {
    const itemsToRegister: BatchExpenseItem[] = [];

    filteredCards.forEach((card) => {
      if (card.subItems && card.subItems.length > 0) {
        card.subItems.forEach((sub) => {
          const key = `${card.id}_${sub.id}`;
          const input = inputs[key];
          const amt = Number(input?.amount);
          if (input?.isSelected && amt > 0) {
            itemsToRegister.push({
              title: `${card.title} - ${sub.name}`,
              category: sub.category,
              costType: sub.costType,
              paymentMethod: card.paymentMethod || 'クレジットカード',
              store: sub.store || '全社共通',
              amount: amt,
              date: input.date || `${activeMonth}-25`,
              memo: [card.memo, sub.memo, input.memo].filter(Boolean).join(' / '),
            });
          }
        });
      } else {
        const input = inputs[card.id];
        const amt = Number(input?.amount);
        if (input?.isSelected && amt > 0) {
          itemsToRegister.push({
            title: card.title,
            category: card.category || '消耗品費',
            costType: card.costType || 'variable',
            paymentMethod: card.paymentMethod || '口座振替',
            store: '全社共通',
            amount: amt,
            date: input.date || `${activeMonth}-25`,
            memo: [card.memo, input.memo].filter(Boolean).join(' / '),
          });
        }
      }
    });

    if (itemsToRegister.length === 0) {
      alert('登録対象の金額が入力されていません。金額を入力してください。');
      return;
    }

    onRegisterExpenseBatch(itemsToRegister);
    showToast(`🎉 ${activeMonth}月分の経費 ${itemsToRegister.length}件 (合計 ¥${totalEnteredAmount.toLocaleString()}) を一括登録しました！`);
  };

  // Card Operations
  const handleOpenAddCard = () => {
    const newCard: ExpenseCard = {
      id: `ec-${Date.now()}`,
      title: '',
      timingGroup: 'credit_card',
      paymentMethod: 'クレジットカード',
      category: settings.expenseCategories[0] || '消耗品費',
      costType: 'variable',
      subItems: [
        {
          id: `sub-${Date.now()}-1`,
          name: '',
          category: settings.expenseCategories[0] || '消耗品費',
          costType: 'variable',
          defaultAmount: 0,
          store: '全社共通',
          memo: '',
        },
      ],
    };
    setEditingCard(newCard);
    setIsCardModalOpen(true);
  };

  const handleOpenEditCard = (card: ExpenseCard) => {
    setEditingCard({ ...card, subItems: card.subItems ? [...card.subItems] : [] });
    setIsCardModalOpen(true);
  };

  const handleSaveCard = (savedCard: ExpenseCard) => {
    if (!savedCard.title.trim()) {
      alert('カードタイトル・決済名を入力してください');
      return;
    }

    const exists = expenseCards.some((c) => c.id === savedCard.id);
    let updated: ExpenseCard[];
    if (exists) {
      updated = expenseCards.map((c) => (c.id === savedCard.id ? savedCard : c));
    } else {
      updated = [...expenseCards, savedCard];
    }

    onSaveExpenseCards(updated);
    setIsCardModalOpen(false);
    setEditingCard(null);
    showToast('経費カードを保存しました');
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
      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-sm font-bold border border-slate-800 animate-in fade-in slide-in-from-bottom-5">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Main Banner & Controls */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900">
                  経費カード一括入力
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  カード決済や月末支払いで<strong>「何を買ったか（品目）」ごとに勘定科目・固定/変動を分けて</strong>管理します
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* View Layout Switcher (Card Grid vs Table List) */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => handleLayoutChange('grid')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewLayout === 'grid'
                    ? 'bg-white text-rose-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="カード型レイアウト"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>カード型</span>
              </button>
              <button
                type="button"
                onClick={() => handleLayoutChange('list')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewLayout === 'list'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="リスト型レイアウト"
              >
                <List className="w-3.5 h-3.5" />
                <span>リスト型</span>
              </button>
            </div>

            {/* Add Card Button */}
            <button
              type="button"
              onClick={handleOpenAddCard}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新しい支払い枠・カードを追加</span>
            </button>
          </div>
        </div>

        {/* Month Selector & Power Copy Bar */}
        <div className="pt-4 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>対象月:</span>
            </div>

            {/* Month Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto max-w-full">
              {currentPeriod.months.map((m) => {
                const monthNum = parseInt(m.split('-')[1], 10);
                const isSelected = activeMonth === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleMonthChange(m)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
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

            {/* SUPER HELPFUL: COPY PREVIOUS MONTH BUTTON */}
            <button
              type="button"
              onClick={() => handleCopyPreviousMonthData()}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
              title={`毎月重複する経費を前月(${parseInt(prevMonthStr.split('-')[1], 10)}月度)からワンクリックで一括反映します`}
            >
              <Copy className="w-3.5 h-3.5 text-indigo-600" />
              <span>前月 ({parseInt(prevMonthStr.split('-')[1], 10)}月) の金額をコピー</span>
            </button>
          </div>

          {/* Subtotal & Batch Submit */}
          <div className="flex items-center gap-3 justify-between lg:justify-end">
            <div className="bg-rose-50 border border-rose-100 px-3.5 py-1.5 rounded-xl flex items-center gap-2.5 text-xs">
              <span className="text-rose-700 font-medium">
                当月入力計 ({enteredItemsCount}件):
              </span>
              <span className="font-bold font-mono text-rose-900 text-sm">
                ¥{totalEnteredAmount.toLocaleString()}
              </span>
            </div>

            <button
              type="button"
              onClick={handleBatchRegister}
              disabled={totalEnteredAmount <= 0}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{parseInt(activeMonth.split('-')[1], 10)}月分を一括登録する</span>
            </button>
          </div>
        </div>
      </div>

      {/* Timing Group Filter Strip */}
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
                isSelected ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <info.icon className="w-3.5 h-3.5" />
              <span>{info.label.replace(/^[0-9]\.\s*/, '')}</span>
              <span className="text-[10px] opacity-75 font-normal">({count})</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: CARD GRID LAYOUT (ユーザー要望のカード型！)                       */}
      {/* ========================================================================= */}
      {viewLayout === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredCards.map((card) => {
            const groupInfo = TIMING_GROUP_CONFIG[card.timingGroup] || TIMING_GROUP_CONFIG.other;
            const hasSubItems = card.subItems && card.subItems.length > 0;
            const cardSubtotal = getCardEnteredSubtotal(card);

            return (
              <div
                key={card.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div>
                  {/* Card Header with group accent */}
                  <div className={`p-4 bg-gradient-to-r ${groupInfo.accentBg} text-white relative`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-white/15 backdrop-blur-xs rounded-xl text-white">
                          <groupInfo.icon className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-white/70 block uppercase tracking-wider">
                            {groupInfo.label.replace(/^[0-9]\.\s*/, '')}
                          </span>
                          <h2 className="text-sm font-black text-white line-clamp-1">
                            {card.title}
                          </h2>
                        </div>
                      </div>

                      {/* Card Action Menu */}
                      <div className="flex items-center gap-1 bg-black/20 backdrop-blur-xs p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => handleCopyPreviousMonthData(card.id)}
                          className="p-1 text-white/80 hover:text-white rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
                          title="このカードの前月の金額をコピー"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateCard(card.id)}
                          className="p-1 text-white/80 hover:text-white rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
                          title="このカードを複製（コピーして新規作成）"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditCard(card)}
                          className="p-1 text-white/80 hover:text-white rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
                          title="設定を編集"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCard(card.id)}
                          className="p-1 text-white/80 hover:text-rose-200 rounded-lg hover:bg-rose-500/40 transition-colors cursor-pointer"
                          title="カードを削除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Sub-header info row: Payment method + Subtotal badge */}
                    <div className="mt-3 pt-2.5 border-t border-white/15 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-[11px] text-white/90">
                        <CreditCard className="w-3 h-3 text-white/70" />
                        <span>{card.paymentMethod || groupInfo.defaultMethod}</span>
                        {card.memo && (
                          <span className="text-white/60 text-[10px] ml-1 line-clamp-1">
                            ({card.memo})
                          </span>
                        )}
                      </div>

                      <div className="bg-white/20 px-2 py-0.5 rounded-lg text-white font-mono text-xs font-black">
                        小計: ¥{cardSubtotal.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Card Body: Purchased Sub-Items (何を買ったか) */}
                  <div className="p-4 space-y-3">
                    {hasSubItems ? (
                      card.subItems!.map((sub) => {
                        const key = `${card.id}_${sub.id}`;
                        const currentVal = inputs[key]?.amount ?? '';
                        const isSelected = inputs[key]?.isSelected ?? true;
                        const isFixed = sub.costType === 'fixed';

                        return (
                          <div
                            key={sub.id}
                            className={`p-3 rounded-2xl border transition-all ${
                              isSelected
                                ? 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                                : 'bg-slate-100/50 border-slate-200 opacity-60'
                            }`}
                          >
                            {/* Item Title & Tags */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelect(key)}
                                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer shrink-0"
                                />
                                <span className="text-xs font-black text-slate-800 truncate" title={sub.name}>
                                  {sub.name}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {/* Duplicate subItem button */}
                                <button
                                  type="button"
                                  onClick={() => handleDuplicateSubItem(card.id, sub)}
                                  className="p-1 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-white transition-colors cursor-pointer"
                                  title="この品目を複製（コピー）"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditSubItem(card.id, sub)}
                                  className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-white transition-colors cursor-pointer"
                                  title="品目を編集"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSubItem(card.id, sub.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-white transition-colors cursor-pointer"
                                  title="品目を削除"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {/* Tags: Category & Cost Type & Store */}
                            <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white text-slate-700 border border-slate-200/80 shadow-2xs">
                                {sub.category}
                              </span>
                              {isFixed ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                                  固定費
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                                  変動費
                                </span>
                              )}
                              {sub.store && sub.store !== '全社共通' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                  {sub.store}
                                </span>
                              )}
                            </div>

                            {/* Amount Input & Helper Actions */}
                            <div className="mt-2.5 flex items-center justify-between gap-2">
                              <div className="relative flex-1">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                                  ¥
                                </span>
                                <input
                                  type="text"
                                  value={currentVal}
                                  onChange={(e) => handleAmountChange(key, e.target.value)}
                                  placeholder={sub.defaultAmount ? sub.defaultAmount.toLocaleString() : '0'}
                                  className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-slate-200 focus:border-rose-500 rounded-xl font-bold text-xs text-slate-900 text-right font-mono shadow-2xs focus:outline-none"
                                />
                              </div>

                              {isFixed && sub.defaultAmount ? (
                                <button
                                  type="button"
                                  onClick={() => handleSetFixedAmount(key, sub.defaultAmount)}
                                  className="px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold rounded-lg border border-blue-200 transition-colors cursor-pointer shrink-0"
                                  title="固定費の定額をセット"
                                >
                                  定額入力
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      /* Card with no sub-items yet */
                      <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-600">カード単体計上</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white text-slate-700 border border-slate-200">
                            {card.category || '消耗品費'}
                          </span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                            ¥
                          </span>
                          <input
                            type="text"
                            value={inputs[card.id]?.amount ?? ''}
                            onChange={(e) => handleAmountChange(card.id, e.target.value)}
                            placeholder={card.defaultAmount ? card.defaultAmount.toLocaleString() : '0'}
                            className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-slate-200 focus:border-rose-500 rounded-xl font-bold text-xs text-slate-900 text-right font-mono focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer: Add SubItem Button */}
                <div className="p-3 bg-slate-50/80 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleOpenAddSubItem(card.id)}
                    className="w-full py-2 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-bold text-xs rounded-xl border border-dashed border-slate-300 hover:border-rose-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ 購入品目を追加</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: LIST VIEW (コンパクトな行一覧)                                    */}
      {/* ========================================================================= */}
      {viewLayout === 'list' && (
        <div className="space-y-4">
          {filteredCards.map((card) => {
            const groupInfo = TIMING_GROUP_CONFIG[card.timingGroup] || TIMING_GROUP_CONFIG.other;
            const hasSubItems = card.subItems && card.subItems.length > 0;
            const cardSubtotal = getCardEnteredSubtotal(card);

            return (
              <div
                key={card.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
              >
                {/* Header Row */}
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl bg-white border border-slate-200 ${groupInfo.color} shadow-2xs`}>
                      <groupInfo.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900">{card.title}</span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          ({card.paymentMethod || groupInfo.defaultMethod})
                        </span>
                      </div>
                      {card.memo && <p className="text-[11px] text-slate-400 mt-0.5">{card.memo}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <div className="text-xs font-mono font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100">
                      小計: ¥{cardSubtotal.toLocaleString()}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyPreviousMonthData(card.id)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-indigo-700 border border-slate-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      title="このカードの前月の金額をコピー"
                    >
                      <Copy className="w-3 h-3" />
                      <span>前月コピー</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDuplicateCard(card.id)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200 cursor-pointer"
                      title="カードを複製"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenAddSubItem(card.id)}
                      className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>品目追加</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditCard(card)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200 cursor-pointer"
                      title="カードを編集"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteCard(card.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-200 cursor-pointer"
                      title="カードを削除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Sub items rows */}
                <div className="divide-y divide-slate-100">
                  {hasSubItems ? (
                    card.subItems!.map((sub) => {
                      const key = `${card.id}_${sub.id}`;
                      const currentVal = inputs[key]?.amount ?? '';
                      const isSelected = inputs[key]?.isSelected ?? true;
                      const isFixed = sub.costType === 'fixed';

                      return (
                        <div
                          key={sub.id}
                          className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                            isSelected ? 'hover:bg-slate-50/60' : 'bg-slate-50/40 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(key)}
                              className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-900">{sub.name}</span>
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">
                                  {sub.category}
                                </span>
                                {isFixed ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                                    固定費
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700">
                                    変動費
                                  </span>
                                )}
                                {sub.store && sub.store !== '全社共通' && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                                    {sub.store}
                                  </span>
                                )}
                              </div>
                              {sub.memo && <p className="text-[11px] text-slate-400 mt-0.5">{sub.memo}</p>}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <div className="relative w-32">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                                ¥
                              </span>
                              <input
                                type="text"
                                value={currentVal}
                                onChange={(e) => handleAmountChange(key, e.target.value)}
                                placeholder={sub.defaultAmount ? sub.defaultAmount.toLocaleString() : '0'}
                                className="w-full pl-6 pr-2.5 py-1.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-rose-500 rounded-xl font-bold text-xs text-slate-900 text-right font-mono"
                              />
                            </div>

                            {isFixed && sub.defaultAmount ? (
                              <button
                                type="button"
                                onClick={() => handleSetFixedAmount(key, sub.defaultAmount)}
                                className="px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold rounded-lg border border-blue-200 cursor-pointer"
                              >
                                定額
                              </button>
                            ) : null}

                            <button
                              type="button"
                              onClick={() => handleDuplicateSubItem(card.id, sub)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                              title="品目を複製"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditSubItem(card.id, sub)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                              title="品目を編集"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteSubItem(card.id, sub.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                              title="品目を削除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-3.5 text-xs text-slate-400 text-center">
                      品目が登録されていません。「品目追加」から購入内容を追加してください。
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: Sub-Item Add / Edit Modal (何を買ったか)                         */}
      {/* ========================================================================= */}
      {editingSubItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
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

              {/* Store attribution (respecting open/closed stores) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  帰属店舗
                </label>
                <select
                  value={editingSubItem.subItem.store || '全社共通'}
                  onChange={(e) =>
                    setEditingSubItem({
                      ...editingSubItem,
                      subItem: { ...editingSubItem.subItem, store: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-rose-500"
                >
                  <option value="全社共通">全社共通（本部・会社全体）</option>
                  {availableStores.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
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
                  placeholder="例: 3アカウント分、自動引落など"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingSubItem(null)}
                className="px-3.5 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleSaveSubItem}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                保存する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Main Card Add / Edit Modal (支払い枠の設定)                       */}
      {/* ========================================================================= */}
      {isCardModalOpen && editingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">
                  {editingCard.title ? `支払い枠・カードの編集: ${editingCard.title}` : '新しい支払い枠・カードを追加'}
                </h3>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  クレジットカードや月末振込などの枠を設定します
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCardModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  カード・支払い枠名 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingCard.title}
                  onChange={(e) => setEditingCard({ ...editingCard, title: e.target.value })}
                  placeholder="例: アメックス法人カード、三井住友ビジネスカード、月末仕入振込等"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-rose-500"
                />
              </div>

              {/* Timing Group */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  支払いのタイミング・性質 <span className="text-rose-500">*</span>
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
                            paymentMethod: editingCard.paymentMethod || info.defaultMethod,
                          })
                        }
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                          isSelected
                            ? 'border-rose-500 bg-rose-50/60 text-rose-900 font-bold'
                            : 'border-slate-200 bg-slate-50 text-slate-600'
                        }`}
                      >
                        <info.icon className="w-4 h-4 shrink-0" />
                        <span className="text-xs truncate">{info.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  決済方法 <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editingCard.paymentMethod}
                  onChange={(e) => setEditingCard({ ...editingCard, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-rose-500"
                >
                  <option value="クレジットカード">クレジットカード</option>
                  <option value="銀行振込">銀行振込</option>
                  <option value="口座振替">口座振替（自動引落）</option>
                  <option value="現金">現金</option>
                  <option value="その他">その他</option>
                </select>
              </div>

              {/* Memo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  締め日・引落日・メモ
                </label>
                <input
                  type="text"
                  value={editingCard.memo || ''}
                  onChange={(e) => setEditingCard({ ...editingCard, memo: e.target.value })}
                  placeholder="例: 毎月末締め、翌月27日引き落とし等"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCardModalOpen(false)}
                className="px-3.5 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => handleSaveCard(editingCard)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
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
