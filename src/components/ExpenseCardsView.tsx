import React, { useState, useMemo, useCallback } from 'react';
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
  Calculator,
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
  ArrowRightLeft,
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
import { ExpenseMinimapBreakdown } from './ExpenseMinimapBreakdown';
import { DEFAULT_EXPENSE_CARDS } from '../utils/storage';

// LocalStorage key for draft inputs entered per month in expense cards
const DRAFT_STORAGE_KEY = 'scratch_keiri_expense_cards_monthly_drafts';

const loadMonthlyDrafts = (): Record<string, Record<string, { amount: string; date: string; memo: string; isSelected: boolean }>> => {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load expense card drafts', e);
  }
  return {};
};

const saveMonthlyDrafts = (drafts: Record<string, Record<string, { amount: string; date: string; memo: string; isSelected: boolean }>>) => {
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
  } catch (e) {
    console.error('Failed to save expense card drafts', e);
  }
};

// Helper to safely shift a date string (YYYY-MM-DD) into targetMonth (YYYY-MM)
const moveDateToMonth = (dateStr: string | undefined, targetMonth: string): string => {
  if (!dateStr) return `${targetMonth}-25`;
  const parts = dateStr.split('-');
  const origDay = parts.length >= 3 ? Number(parts[2]) : 25;
  const [newYear, newMonth] = targetMonth.split('-').map(Number);
  const maxDayInNewMonth = new Date(newYear, newMonth, 0).getDate();
  const newDay = Math.min(origDay || 25, maxDayInNewMonth);
  return `${targetMonth}-${String(newDay).padStart(2, '0')}`;
};

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
  onNavigateToSalary?: () => void;
  onSyncSalaryToExpenseCards?: (targetMonth: string) => void;
  onRegisterSalaryToTransactions?: (targetMonth: string) => void;
  onEditTransaction?: (tx: Transaction) => void;
  onDeleteTransaction?: (id: string) => void;
  onBatchUpdateTransactions?: (updated: Transaction[], deletedIds?: string[]) => void;
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
  onNavigateToSalary,
  onSyncSalaryToExpenseCards,
  onRegisterSalaryToTransactions,
  onEditTransaction,
  onDeleteTransaction,
  onBatchUpdateTransactions,
}) => {
  const expenseCards = useMemo(() => {
    let cards = settings.expenseCards && settings.expenseCards.length > 0 ? settings.expenseCards : DEFAULT_EXPENSE_CARDS;
    const hasSalary = cards.some((c) => c.timingGroup === 'salary');
    if (!hasSalary) {
      const defaultSalaryCard = DEFAULT_EXPENSE_CARDS.find((c) => c.timingGroup === 'salary') || {
        id: 'ec-salary-board',
        title: '役員報酬・スタッフ給与（支給日振込）',
        timingGroup: 'salary' as const,
        paymentMethod: '銀行振込',
        category: '給料手当',
        store: '全社共通',
        memo: `毎月${settings.salarySettings?.payDay || 25}日振込 給与・役員報酬`,
        subItems: [
          {
            id: 'sub-sal-exec-def',
            name: '役員報酬（定期同額給与）',
            category: '役員報酬',
            costType: 'fixed' as const,
            defaultAmount: 500000,
            store: '全社共通',
            memo: '役員報酬',
          },
          {
            id: 'sub-sal-staff-def',
            name: 'スタッフ給料手当',
            category: '給料手当',
            costType: 'fixed' as const,
            defaultAmount: 250000,
            store: '全社共通',
            memo: 'スタッフ給与',
          },
        ],
      };
      cards = [defaultSalaryCard, ...cards];
    }
    return cards;
  }, [settings.expenseCards, settings.salarySettings]);
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

  // Keep active month in sync when period changes
  React.useEffect(() => {
    if (currentPeriod?.months?.length > 0 && !currentPeriod.months.includes(activeMonth)) {
      setActiveMonth(currentPeriod.months[0]);
    }
  }, [currentPeriod, activeMonth]);

  // Monthly expense totals from transactions for the 12-month minimap
  const expenseMonthTotals = useMemo(() => {
    const totals: Record<string, { total: number; count: number }> = {};
    currentPeriod.months.forEach((m) => {
      const txs = transactions.filter(
        (t) =>
          t.type === 'expense' &&
          ((t.date_from && t.date_from.startsWith(m)) || (t.date_to && t.date_to.startsWith(m)))
      );
      const sum = txs.reduce((acc, t) => acc + (t.amount || 0), 0);
      totals[m] = { total: sum, count: txs.length };
    });
    return totals;
  }, [currentPeriod.months, transactions]);

  // Registered expenses for the currently active month from ledger
  const activeMonthRegistered = expenseMonthTotals[activeMonth] || { total: 0, count: 0 };

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

  // Toggle for Pattern B minimap constituent cards breakdown
  const [showMinimapBreakdown, setShowMinimapBreakdown] = useState<boolean>(true);

  // Monthly Drafts state (preserves amounts and inputs entered across months in memory & localStorage)
  const [monthlyDrafts, setMonthlyDrafts] = useState<
    Record<string, Record<string, { amount: string; date: string; memo: string; isSelected: boolean }>>
  >(() => loadMonthlyDrafts());

  // Helper to build inputs for a specific month
  const buildInputsForMonth = useCallback(
    (targetMonth: string, cards: ExpenseCard[]) => {
      const initial: Record<string, { amount: string; date: string; memo: string; isSelected: boolean }> = {};
      const targetDraft = monthlyDrafts[targetMonth];

      // Transactions for this target month in the ledger
      const monthTxs = transactions.filter(
        (t) =>
          t.type === 'expense' &&
          ((t.date_from && t.date_from.startsWith(targetMonth)) ||
            (t.date_to && t.date_to.startsWith(targetMonth)))
      );

      cards.forEach((card) => {
        const defaultDate = (card.timingGroup === 'month_end' || card.id.includes('month-end'))
          ? `${targetMonth}-${new Date(Number(targetMonth.split('-')[0]), Number(targetMonth.split('-')[1]), 0).getDate()}`
          : (card.timingGroup === 'salary'
              ? `${targetMonth}-${String(settings.salarySettings?.payDay || 25).padStart(2, '0')}`
              : `${targetMonth}-25`);

        if (card.subItems && card.subItems.length > 0) {
          card.subItems.forEach((sub) => {
            const key = `${card.id}_${sub.id}`;
            if (targetDraft && targetDraft[key] !== undefined) {
              initial[key] = {
                ...targetDraft[key],
                date: targetDraft[key].date || defaultDate,
              };
              return;
            }

            if (monthTxs.length > 0) {
              const matchedTx = monthTxs.find(
                (tx) =>
                  (tx.description && tx.description.includes(sub.name)) ||
                  (tx.category === sub.category && (!sub.store || sub.store === '全社共通' || tx.store === sub.store))
              );
              if (matchedTx) {
                initial[key] = {
                  amount: String(matchedTx.amount || 0),
                  date: matchedTx.date_from || matchedTx.date_to || defaultDate,
                  memo: matchedTx.memo || sub.memo || '',
                  isSelected: true,
                };
                return;
              }
            }

            const isFixedOrSalary = card.timingGroup === 'salary' || card.timingGroup === 'month_end' || sub.costType === 'fixed';
            initial[key] = {
              amount: isFixedOrSalary && sub.defaultAmount ? String(sub.defaultAmount) : '',
              date: defaultDate,
              memo: sub.memo || '',
              isSelected: true,
            };
          });
        } else {
          const key = card.id;
          if (targetDraft && targetDraft[key] !== undefined) {
            initial[key] = {
              ...targetDraft[key],
              date: targetDraft[key].date || defaultDate,
            };
            return;
          }

          if (monthTxs.length > 0) {
            const matchedTx = monthTxs.find(
              (tx) =>
                (tx.description && tx.description.includes(card.title)) ||
                (card.category && tx.category === card.category)
            );
            if (matchedTx) {
              initial[key] = {
                amount: String(matchedTx.amount || 0),
                date: matchedTx.date_from || matchedTx.date_to || defaultDate,
                memo: matchedTx.memo || card.memo || '',
                isSelected: true,
              };
              return;
            }
          }

          const isFixedOrSalary = card.timingGroup === 'salary' || card.timingGroup === 'month_end' || card.costType === 'fixed';
          initial[key] = {
            amount: isFixedOrSalary && card.defaultAmount ? String(card.defaultAmount) : '',
            date: defaultDate,
            memo: card.memo || '',
            isSelected: true,
          };
        }
      });

      return initial;
    },
    [transactions, settings.salarySettings, monthlyDrafts]
  );

  // Input states keyed by "cardId" or "cardId_subItemId"
  const [inputs, setInputs] = useState<Record<string, { amount: string; date: string; memo: string; isSelected: boolean }>>(() => {
    return buildInputsForMonth(activeMonth, expenseCards);
  });

  // Sync inputs with expenseCards whenever expenseCards updates (e.g. from salary sync or settings edit)
  React.useEffect(() => {
    setInputs((prev) => {
      let changed = false;
      const next = { ...prev };

      expenseCards.forEach((card) => {
        const defaultDate = (card.timingGroup === 'month_end' || card.id.includes('month-end'))
          ? `${activeMonth}-${new Date(Number(activeMonth.split('-')[0]), Number(activeMonth.split('-')[1]), 0).getDate()}`
          : (card.timingGroup === 'salary'
              ? `${activeMonth}-${String(settings.salarySettings?.payDay || 25).padStart(2, '0')}`
              : `${activeMonth}-25`);

        if (card.subItems && card.subItems.length > 0) {
          card.subItems.forEach((sub) => {
            const key = `${card.id}_${sub.id}`;
            const targetAmount = sub.defaultAmount ? String(sub.defaultAmount) : '';
            if (!next[key]) {
              next[key] = {
                amount: targetAmount,
                date: defaultDate,
                memo: sub.memo || '',
                isSelected: true,
              };
              changed = true;
            } else if (card.timingGroup === 'salary' || card.timingGroup === 'month_end') {
              if (sub.defaultAmount && next[key].amount !== targetAmount) {
                next[key] = {
                  ...next[key],
                  amount: targetAmount,
                  date: next[key].date || defaultDate,
                  memo: sub.memo || next[key].memo,
                };
                changed = true;
              }
            }
          });
        } else {
          const key = card.id;
          const targetAmount = card.defaultAmount ? String(card.defaultAmount) : '';
          if (!next[key]) {
            next[key] = {
              amount: targetAmount,
              date: defaultDate,
              memo: card.memo || '',
              isSelected: true,
            };
            changed = true;
          } else if (card.timingGroup === 'salary' || card.timingGroup === 'month_end') {
            if (card.defaultAmount && next[key].amount !== targetAmount) {
              next[key] = {
                ...next[key],
                amount: targetAmount,
                date: next[key].date || defaultDate,
                memo: card.memo || next[key].memo,
              };
              changed = true;
            }
          }
        }
      });

      return changed ? next : prev;
    });
  }, [expenseCards, activeMonth, settings.salarySettings]);

  // Update input dates and amounts cleanly when month changes
  const handleMonthChange = (newMonth: string) => {
    setActiveMonth(newMonth);
    setShowMinimapBreakdown(true);
    setInputs(buildInputsForMonth(newMonth, expenseCards));
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
    setInputs((prev) => {
      const next = {
        ...prev,
        [key]: {
          ...(prev[key] || { date: `${activeMonth}-25`, memo: '', isSelected: true }),
          amount: val,
        },
      };
      return next;
    });

    setMonthlyDrafts((prev) => {
      const curMonth = prev[activeMonth] || {};
      const updated = {
        ...prev,
        [activeMonth]: {
          ...curMonth,
          [key]: {
            ...(curMonth[key] || inputs[key] || { date: `${activeMonth}-25`, memo: '', isSelected: true }),
            amount: val,
          },
        },
      };
      saveMonthlyDrafts(updated);
      return updated;
    });
  };

  const handleDateChange = (key: string, val: string) => {
    setInputs((prev) => {
      const next = {
        ...prev,
        [key]: {
          ...(prev[key] || { amount: '', memo: '', isSelected: true }),
          date: val,
        },
      };
      return next;
    });

    setMonthlyDrafts((prev) => {
      const curMonth = prev[activeMonth] || {};
      const updated = {
        ...prev,
        [activeMonth]: {
          ...curMonth,
          [key]: {
            ...(curMonth[key] || inputs[key] || { amount: '', memo: '', isSelected: true }),
            date: val,
          },
        },
      };
      saveMonthlyDrafts(updated);
      return updated;
    });
  };

  const handleMemoChange = (key: string, val: string) => {
    setInputs((prev) => {
      const next = {
        ...prev,
        [key]: {
          ...(prev[key] || { amount: '', date: `${activeMonth}-25`, isSelected: true }),
          memo: val,
        },
      };
      return next;
    });

    setMonthlyDrafts((prev) => {
      const curMonth = prev[activeMonth] || {};
      const updated = {
        ...prev,
        [activeMonth]: {
          ...curMonth,
          [key]: {
            ...(curMonth[key] || inputs[key] || { amount: '', date: `${activeMonth}-25`, isSelected: true }),
            memo: val,
          },
        },
      };
      saveMonthlyDrafts(updated);
      return updated;
    });
  };

  const handleToggleSelect = (key: string) => {
    setInputs((prev) => {
      const next = {
        ...prev,
        [key]: {
          ...(prev[key] || { amount: '', date: `${activeMonth}-25`, memo: '', isSelected: true }),
          isSelected: !prev[key]?.isSelected,
        },
      };
      return next;
    });

    setMonthlyDrafts((prev) => {
      const curMonth = prev[activeMonth] || {};
      const updated = {
        ...prev,
        [activeMonth]: {
          ...curMonth,
          [key]: {
            ...(curMonth[key] || inputs[key] || { amount: '', date: `${activeMonth}-25`, memo: '', isSelected: true }),
            isSelected: !(curMonth[key]?.isSelected ?? inputs[key]?.isSelected ?? true),
          },
        },
      };
      saveMonthlyDrafts(updated);
      return updated;
    });
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

  // MOVE / COPY FEATURE: Move or copy cards/amounts to another month
  interface MoveMonthModalState {
    isOpen: boolean;
    mode: 'single' | 'all';
    card?: ExpenseCard;
  }

  const [moveModalState, setMoveModalState] = useState<MoveMonthModalState | null>(null);
  const [targetMoveMonth, setTargetMoveMonth] = useState<string>('');
  const [moveActionType, setMoveActionType] = useState<'move' | 'copy'>('move');
  const [includeTransactions, setIncludeTransactions] = useState<boolean>(true);

  // All months across all fiscal periods for target picker
  const allAvailableMonths = useMemo(() => {
    const list: { month: string; label: string; periodLabel: string }[] = [];
    fiscalPeriods.forEach((p) => {
      (p.months || []).forEach((m) => {
        if (!list.some((x) => x.month === m)) {
          const [y, mm] = m.split('-');
          list.push({
            month: m,
            label: `${y}年${parseInt(mm, 10)}月度`,
            periodLabel: p.label,
          });
        }
      });
    });
    return list;
  }, [fiscalPeriods]);

  // Helper to calculate next month string (e.g. "2025-06" -> "2025-07")
  const getNextMonth = (monthStr: string): string => {
    const [y, m] = monthStr.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    const nextY = nextDate.getFullYear();
    const nextM = String(nextDate.getMonth() + 1).padStart(2, '0');
    return `${nextY}-${nextM}`;
  };

  const nextMonthStr = useMemo(() => getNextMonth(activeMonth), [activeMonth]);

  const handleOpenMoveCardModal = (card: ExpenseCard) => {
    const months = currentPeriod.months || [];
    const currentIdx = months.indexOf(activeMonth);
    const nextM = currentIdx >= 0 && currentIdx < months.length - 1 
      ? months[currentIdx + 1] 
      : getNextMonth(activeMonth);

    setTargetMoveMonth(nextM !== activeMonth ? nextM : (allAvailableMonths.find(m => m.month !== activeMonth)?.month || ''));
    setMoveActionType('move');
    setIncludeTransactions(true);
    setMoveModalState({
      isOpen: true,
      mode: 'single',
      card,
    });
  };

  const handleOpenMoveMonthModal = () => {
    const months = currentPeriod.months || [];
    const currentIdx = months.indexOf(activeMonth);
    const nextM = currentIdx >= 0 && currentIdx < months.length - 1 
      ? months[currentIdx + 1] 
      : getNextMonth(activeMonth);

    setTargetMoveMonth(nextM !== activeMonth ? nextM : (allAvailableMonths.find(m => m.month !== activeMonth)?.month || ''));
    setMoveActionType('move');
    setIncludeTransactions(true);
    setMoveModalState({
      isOpen: true,
      mode: 'all',
    });
  };

  const handleExecuteMove = () => {
    if (!moveModalState || !targetMoveMonth) {
      alert('移動先の月を選択してください。');
      return;
    }
    if (targetMoveMonth === activeMonth) {
      alert('移動先の月には、現在と異なる月を指定してください。');
      return;
    }

    const { mode, card } = moveModalState;
    const sourceMonth = activeMonth;
    const targetMonth = targetMoveMonth;

    // 1. Identify which keys belong to this card / month
    let targetKeys: string[] = [];
    if (mode === 'single' && card) {
      if (card.subItems && card.subItems.length > 0) {
        targetKeys = card.subItems.map((s) => `${card.id}_${s.id}`);
      } else {
        targetKeys = [card.id];
      }
    } else {
      // All cards
      targetKeys = Object.keys(inputs);
      expenseCards.forEach((c) => {
        if (c.subItems && c.subItems.length > 0) {
          c.subItems.forEach((s) => {
            const k = `${c.id}_${s.id}`;
            if (!targetKeys.includes(k)) targetKeys.push(k);
          });
        } else {
          if (!targetKeys.includes(c.id)) targetKeys.push(c.id);
        }
      });
    }

    // 2. Drafts shift
    const curSourceDraft = { ...(monthlyDrafts[sourceMonth] || inputs) };
    const curTargetDraft = { ...(monthlyDrafts[targetMonth] || buildInputsForMonth(targetMonth, expenseCards)) };

    let movedItemsCount = 0;
    let movedTotalAmount = 0;

    targetKeys.forEach((key) => {
      const item = inputs[key] || curSourceDraft[key];
      if (item && item.amount !== undefined && item.amount !== '' && Number(item.amount) > 0) {
        const amtNum = Number(item.amount) || 0;
        movedTotalAmount += amtNum;
        movedItemsCount++;

        const newDate = moveDateToMonth(item.date, targetMonth);
        curTargetDraft[key] = {
          ...item,
          date: newDate,
        };

        if (moveActionType === 'move') {
          curSourceDraft[key] = {
            ...item,
            amount: '',
          };
        }
      }
    });

    const updatedAllDrafts = {
      ...monthlyDrafts,
      [sourceMonth]: curSourceDraft,
      [targetMonth]: curTargetDraft,
    };
    setMonthlyDrafts(updatedAllDrafts);
    saveMonthlyDrafts(updatedAllDrafts);

    // 3. Transactions shift if requested
    let movedTxsCount = 0;
    if (includeTransactions && onBatchUpdateTransactions) {
      const sourceTxs = transactions.filter((t) => {
        if (t.type !== 'expense') return false;
        const txMonth = (t.date_from || t.date_to || '').substring(0, 7);
        if (txMonth !== sourceMonth) return false;

        if (mode === 'single' && card) {
          const matchesCardTitle = t.description?.includes(card.title);
          const matchesSubItem = card.subItems?.some((sub) => t.description?.includes(sub.name));
          const matchesCategory = card.category && t.category === card.category;
          return matchesCardTitle || matchesSubItem || matchesCategory;
        }
        return true;
      });

      if (sourceTxs.length > 0) {
        movedTxsCount = sourceTxs.length;
        if (moveActionType === 'move') {
          const updatedTxs: Transaction[] = sourceTxs.map((t) => ({
            ...t,
            date_from: moveDateToMonth(t.date_from, targetMonth),
            date_to: moveDateToMonth(t.date_to, targetMonth),
            updated_at: new Date().toISOString(),
          }));
          onBatchUpdateTransactions(updatedTxs);
        } else {
          // Copy
          const timestamp = new Date().toISOString();
          const clonedTxs: Transaction[] = sourceTxs.map((t, idx) => ({
            ...t,
            id: `tx-expcard-copy-${targetMonth.replace('-', '')}-${Date.now()}-${idx}`,
            date_from: moveDateToMonth(t.date_from, targetMonth),
            date_to: moveDateToMonth(t.date_to, targetMonth),
            created_at: timestamp,
            updated_at: timestamp,
          }));
          onBatchUpdateTransactions(clonedTxs);
        }
      }
    }

    // 4. Switch to target month and apply inputs
    setActiveMonth(targetMonth);
    setInputs(curTargetDraft);

    // 5. Close modal
    setMoveModalState(null);

    // 6. Toast notification
    const [targetY, targetM] = targetMonth.split('-');
    const [srcY, srcM] = sourceMonth.split('-');
    const targetLabel = `${targetY}年${parseInt(targetM, 10)}月度`;
    const sourceLabel = `${srcY}年${parseInt(srcM, 10)}月度`;
    const actionLabel = moveActionType === 'move' ? '移動' : 'コピー';
    const targetName = mode === 'single' && card ? `「${card.title}」` : 'すべての経費データ';

    showToast(
      `🚚 ${targetName} を ${sourceLabel} から ${targetLabel} へ${actionLabel}しました！（入力品目: ${movedItemsCount}件, 出納帳取引: ${movedTxsCount}件）`
    );
  };

  // Restore default salary card if missing or removed
  const handleRestoreSalaryCard = () => {
    const defaultSalaryCard = DEFAULT_EXPENSE_CARDS.find((c) => c.timingGroup === 'salary') || {
      id: 'ec-salary-board',
      title: '役員報酬・スタッフ給与（支給日振込）',
      timingGroup: 'salary' as const,
      paymentMethod: '銀行振込',
      category: '給料手当',
      store: '全社共通',
      memo: `毎月${settings.salarySettings?.payDay || 25}日振込 給与・役員報酬`,
      subItems: [
        {
          id: 'sub-sal-exec-def',
          name: '役員報酬（定期同額給与）',
          category: '役員報酬',
          costType: 'fixed' as const,
          defaultAmount: 500000,
          store: '全社共通',
          memo: '役員報酬',
        },
        {
          id: 'sub-sal-staff-def',
          name: 'スタッフ給料手当',
          category: '給料手当',
          costType: 'fixed' as const,
          defaultAmount: 250000,
          store: '全社共通',
          memo: 'スタッフ給与',
        },
      ],
    };

    const updated = [defaultSalaryCard, ...expenseCards.filter((c) => c.timingGroup !== 'salary')];
    onSaveExpenseCards(updated);
    showToast('役員報酬・給与カードを復元しました');
  };

  // Calculate card subtotal for a specific card
  const getCardEnteredSubtotal = (card: ExpenseCard) => {
    let subtotal = 0;
    if (card.subItems && card.subItems.length > 0) {
      card.subItems.forEach((sub) => {
        const key = `${card.id}_${sub.id}`;
        const item = inputs[key];
        const isSelected = item?.isSelected ?? true;
        if (isSelected) {
          const amtStr = item?.amount !== undefined && item?.amount !== '' 
            ? item.amount 
            : (sub.defaultAmount ? String(sub.defaultAmount) : '0');
          subtotal += Number(amtStr) || 0;
        }
      });
    } else {
      const item = inputs[card.id];
      const isSelected = item?.isSelected ?? true;
      if (isSelected) {
        const amtStr = item?.amount !== undefined && item?.amount !== '' 
          ? item.amount 
          : (card.defaultAmount ? String(card.defaultAmount) : '0');
        subtotal += Number(amtStr) || 0;
      }
    }
    return subtotal;
  };

  // Calculate Total Entered Amount for filtered cards
  const totalEnteredAmount = useMemo(() => {
    let sum = 0;
    filteredCards.forEach((card) => {
      sum += getCardEnteredSubtotal(card);
    });
    return sum;
  }, [filteredCards, inputs]);

  // Calculate count of entered items for filtered cards
  const enteredItemsCount = useMemo(() => {
    let count = 0;
    filteredCards.forEach((card) => {
      if (card.subItems && card.subItems.length > 0) {
        card.subItems.forEach((sub) => {
          const item = inputs[`${card.id}_${sub.id}`];
          const isSelected = item?.isSelected ?? true;
          const amt = item?.amount !== undefined && item?.amount !== '' 
            ? Number(item.amount) 
            : (sub.defaultAmount || 0);
          if (isSelected && amt > 0) count++;
        });
      } else {
        const item = inputs[card.id];
        const isSelected = item?.isSelected ?? true;
        const amt = item?.amount !== undefined && item?.amount !== '' 
          ? Number(item.amount) 
          : (card.defaultAmount || 0);
        if (isSelected && amt > 0) count++;
      }
    });
    return count;
  }, [filteredCards, inputs]);

  // Total across ALL cards for this activeMonth (regardless of timing filter)
  const totalAllCardsAmount = useMemo(() => {
    let sum = 0;
    expenseCards.forEach((card) => {
      sum += getCardEnteredSubtotal(card);
    });
    return sum;
  }, [expenseCards, inputs]);

  // Total entered items count across ALL cards
  const allCardsEnteredCount = useMemo(() => {
    let count = 0;
    expenseCards.forEach((card) => {
      if (card.subItems && card.subItems.length > 0) {
        card.subItems.forEach((sub) => {
          const item = inputs[`${card.id}_${sub.id}`];
          const isSelected = item?.isSelected ?? true;
          const amt = item?.amount !== undefined && item?.amount !== '' 
            ? Number(item.amount) 
            : (sub.defaultAmount || 0);
          if (isSelected && amt > 0) count++;
        });
      } else {
        const item = inputs[card.id];
        const isSelected = item?.isSelected ?? true;
        const amt = item?.amount !== undefined && item?.amount !== '' 
          ? Number(item.amount) 
          : (card.defaultAmount || 0);
        if (isSelected && amt > 0) count++;
      }
    });
    return count;
  }, [expenseCards, inputs]);

  // Execute Batch Register (supports registering all cards or filtered cards)
  const handleBatchRegister = (registerAllCards: boolean = false) => {
    const itemsToRegister: BatchExpenseItem[] = [];
    const targetCards = (registerAllCards || activeGroupFilter === 'ALL') ? expenseCards : filteredCards;

    // Check if salary has already been registered in ledger for this month
    const hasSalaryRegisteredInMonth = transactions.some(
      (t) =>
        t.type === 'expense' &&
        (t.category === '役員報酬' || t.category === '給料手当' || t.category === '法定福利費') &&
        ((t.date_from && t.date_from.startsWith(activeMonth)) ||
          (t.date_to && t.date_to.startsWith(activeMonth)))
    );

    targetCards.forEach((card) => {
      // If salary has already been registered in ledger for this month and this is a salary card,
      // skip auto-adding it during general batch register to avoid duplicating salary expenses!
      if (card.timingGroup === 'salary' && hasSalaryRegisteredInMonth && activeGroupFilter !== 'salary') {
        return;
      }

      const defaultDate = (card.timingGroup === 'month_end' || card.id.includes('month-end'))
        ? `${activeMonth}-${new Date(Number(activeMonth.split('-')[0]), Number(activeMonth.split('-')[1]), 0).getDate()}`
        : (card.timingGroup === 'salary'
            ? `${activeMonth}-${String(settings.salarySettings?.payDay || 25).padStart(2, '0')}`
            : `${activeMonth}-25`);

      if (card.subItems && card.subItems.length > 0) {
        card.subItems.forEach((sub) => {
          const key = `${card.id}_${sub.id}`;
          const input = inputs[key];
          const isSelected = input?.isSelected ?? true;
          const amt = (input?.amount !== undefined && input?.amount !== '') 
            ? Number(input.amount) 
            : (sub.defaultAmount || 0);

          if (isSelected && amt > 0) {
            itemsToRegister.push({
              title: `${card.title} - ${sub.name}`,
              category: sub.category,
              costType: sub.costType,
              paymentMethod: card.paymentMethod || '銀行振込',
              store: sub.store || '全社共通',
              amount: amt,
              date: input?.date || defaultDate,
              memo: [card.memo, sub.memo, input?.memo].filter(Boolean).join(' / '),
            });
          }
        });
      } else {
        const input = inputs[card.id];
        const isSelected = input?.isSelected ?? true;
        const amt = (input?.amount !== undefined && input?.amount !== '') 
          ? Number(input.amount) 
          : (card.defaultAmount || 0);

        if (isSelected && amt > 0) {
          itemsToRegister.push({
            title: card.title,
            category: card.category || '消耗品費',
            costType: card.costType || 'variable',
            paymentMethod: card.paymentMethod || '口座振替',
            store: '全社共通',
            amount: amt,
            date: input?.date || defaultDate,
            memo: [card.memo, input?.memo].filter(Boolean).join(' / '),
          });
        }
      }
    });

    // Check if expenses have already been registered for this month
    const existingMonthExpenses = transactions.filter(
      (t) =>
        t.type === 'expense' &&
        ((t.date_from && t.date_from.startsWith(activeMonth)) ||
          (t.date_to && t.date_to.startsWith(activeMonth)))
    );
    if (existingMonthExpenses.length > 0) {
      const ok = window.confirm(
        `【確認】${activeMonth}月度には既に出納帳に ${existingMonthExpenses.length}件の経費データが登録されています。\n重複して計上しますか？\n（重複を避けたい場合は「キャンセル」を押してください）`
      );
      if (!ok) return;
    }

    if (itemsToRegister.length === 0) {
      alert('登録対象の金額が入力されていません。金額を入力してください。');
      return;
    }

    const totalBatchAmt = itemsToRegister.reduce((sum, item) => sum + item.amount, 0);
    onRegisterExpenseBatch(itemsToRegister);
    showToast(`🎉 ${activeMonth}月分の経費 ${itemsToRegister.length}件 (合計 ¥${totalBatchAmt.toLocaleString()}) を出納帳へ一括計上しました！`);
  };

  // Register a single card's items to transactions immediately
  const handleRegisterSingleCard = (card: ExpenseCard) => {
    const itemsToRegister: BatchExpenseItem[] = [];
    const defaultDate = (card.timingGroup === 'month_end' || card.id.includes('month-end'))
      ? `${activeMonth}-${new Date(Number(activeMonth.split('-')[0]), Number(activeMonth.split('-')[1]), 0).getDate()}`
      : (card.timingGroup === 'salary'
          ? `${activeMonth}-${String(settings.salarySettings?.payDay || 25).padStart(2, '0')}`
          : `${activeMonth}-25`);

    if (card.subItems && card.subItems.length > 0) {
      card.subItems.forEach((sub) => {
        const key = `${card.id}_${sub.id}`;
        const input = inputs[key];
        const isSelected = input?.isSelected ?? true;
        const amt = (input?.amount !== undefined && input?.amount !== '') 
          ? Number(input.amount) 
          : (sub.defaultAmount || 0);

        if (isSelected && amt > 0) {
          itemsToRegister.push({
            title: `${card.title} - ${sub.name}`,
            category: sub.category,
            costType: sub.costType,
            paymentMethod: card.paymentMethod || '銀行振込',
            store: sub.store || '全社共通',
            amount: amt,
            date: input?.date || defaultDate,
            memo: [card.memo, sub.memo, input?.memo].filter(Boolean).join(' / '),
          });
        }
      });
    } else {
      const input = inputs[card.id];
      const isSelected = input?.isSelected ?? true;
      const amt = (input?.amount !== undefined && input?.amount !== '') 
        ? Number(input.amount) 
        : (card.defaultAmount || 0);

      if (isSelected && amt > 0) {
        itemsToRegister.push({
          title: card.title,
          category: card.category || '消耗品費',
          costType: card.costType || 'variable',
          paymentMethod: card.paymentMethod || '口座振替',
          store: '全社共通',
          amount: amt,
          date: input?.date || defaultDate,
          memo: [card.memo, input?.memo].filter(Boolean).join(' / '),
        });
      }
    }

    // Check if transactions already exist for this card in this month
    const existingCardTxs = transactions.filter(
      (t) =>
        t.type === 'expense' &&
        ((t.date_from && t.date_from.startsWith(activeMonth)) ||
          (t.date_to && t.date_to.startsWith(activeMonth))) &&
        (t.description?.includes(card.title) || (card.category && t.category === card.category))
    );
    if (existingCardTxs.length > 0) {
      const ok = window.confirm(
        `【確認】「${card.title}」に関する経費は${activeMonth}月度に既に出納帳に登録されています（${existingCardTxs.length}件）。\n追加で計上しますか？`
      );
      if (!ok) return;
    }

    if (itemsToRegister.length === 0) {
      alert('登録対象の金額が0円です。金額を入力または選択してください。');
      return;
    }

    const singleTotal = itemsToRegister.reduce((acc, i) => acc + i.amount, 0);
    onRegisterExpenseBatch(itemsToRegister);
    showToast(`✅ カード「${card.title}」の ${itemsToRegister.length}件 (合計 ¥${singleTotal.toLocaleString()}) を出納帳に計上しました！`);
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

      {/* Top Header Card: Title & Fiscal Period Selector */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
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

        {/* Fiscal Period Switcher & Action Controls */}
        <div className="flex items-center flex-wrap gap-2 w-full md:w-auto justify-between md:justify-end">
          {/* Period Selector */}
          <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-xl border border-gray-200">
            <Calendar className="w-3.5 h-3.5 text-gray-500 ml-1.5" />
            <select
              value={selectedFilter.startsWith('period-') ? selectedFilter : fiscalPeriods[0]?.key || 'period-1'}
              onChange={(e) => onSelectFilter(e.target.value)}
              className="text-xs font-bold bg-transparent text-gray-800 focus:outline-hidden pr-2 py-1 cursor-pointer"
            >
              {fiscalPeriods.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* View Layout Switcher (Card Grid vs Table List) */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => handleLayoutChange('grid')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewLayout === 'grid'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="カード型レイアウト"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-rose-600" />
              <span>カード型</span>
            </button>
            <button
              type="button"
              onClick={() => handleLayoutChange('list')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewLayout === 'list'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="リスト型レイアウト"
            >
              <List className="w-3.5 h-3.5 text-slate-600" />
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
            <span>支払い枠・カード追加</span>
          </button>
        </div>
      </div>

      {/* 12-Month Selector Pill Strip (Progress Tracker) - Matched to Sales Card */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-gray-200/80 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-gray-700 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-rose-600" />
            {currentPeriod.label} 月別進捗ミニマップ (対象月を選択):
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-500 font-medium hidden sm:inline">
              緑 = 経費計上済 / 灰 = 未計上
            </span>
            <button
              type="button"
              onClick={() => setShowMinimapBreakdown(!showMinimapBreakdown)}
              className="px-2 py-0.5 text-[11px] font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 rounded-md border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>{showMinimapBreakdown ? '内訳カードを閉じる' : '内訳カードを表示'}</span>
            </button>
          </div>
        </div>

        {/* 12 Month Pills Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5">
          {currentPeriod.months.map((m) => {
            const [, monthNum] = m.split('-');
            const monthData = expenseMonthTotals[m] || { total: 0, count: 0 };
            const isSelected = activeMonth === m;
            const hasRegisteredTx = monthData.count > 0;

            return (
              <button
                key={m}
                type="button"
                onClick={() => handleMonthChange(m)}
                className={`py-2 px-1.5 rounded-xl text-center transition-all flex flex-col items-center justify-center border relative cursor-pointer ${
                  isSelected
                    ? 'ring-2 ring-rose-500 bg-rose-50/90 border-rose-500 shadow-xs'
                    : hasRegisteredTx
                    ? 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-100/50'
                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                }`}
              >
                <span className={`text-xs font-black font-mono ${isSelected ? 'text-rose-950' : 'text-gray-800'}`}>
                  {parseInt(monthNum, 10)}月
                </span>

                <span className="text-[10px] font-bold font-mono text-gray-500">
                  {monthData.total > 0 
                    ? `¥${Math.round(monthData.total / 10000)}万` 
                    : (isSelected && totalAllCardsAmount > 0 
                        ? `予 ¥${Math.round(totalAllCardsAmount / 10000)}万` 
                        : '-')}
                </span>

                <div className="flex items-center gap-1 mt-1">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      hasRegisteredTx ? 'bg-emerald-500' : isSelected && totalAllCardsAmount > 0 ? 'bg-amber-400' : 'bg-gray-300'
                    }`}
                  />
                  <span className="text-[9px] font-mono text-gray-400">
                    {hasRegisteredTx ? `${monthData.count}件` : isSelected && totalAllCardsAmount > 0 ? '予定' : '未'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pattern B: Minimap Constituent Cards Breakdown */}
      <ExpenseMinimapBreakdown
        activeMonth={activeMonth}
        transactions={transactions}
        expenseCards={expenseCards}
        inputs={inputs}
        totalAllCardsAmount={totalAllCardsAmount}
        isOpen={showMinimapBreakdown}
        onToggle={() => setShowMinimapBreakdown(!showMinimapBreakdown)}
        onEditTransaction={onEditTransaction}
        onDeleteTransaction={onDeleteTransaction}
      />

      {/* Active Month Clean Action Bar */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 bg-rose-50 text-rose-800 font-bold text-xs rounded-lg border border-rose-200">
            {activeMonth.replace('-', '年 ')}月度 経費カード
          </span>

          <button
            type="button"
            onClick={() => handleCopyPreviousMonthData()}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
            title={`毎月重複する経費を前月(${parseInt(prevMonthStr.split('-')[1], 10)}月度)からワンクリックで一括反映します`}
          >
            <Copy className="w-3.5 h-3.5 text-slate-500" />
            <span>前月 ({parseInt(prevMonthStr.split('-')[1], 10)}月) コピー</span>
          </button>

          <button
            type="button"
            onClick={handleOpenMoveMonthModal}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
            title="間違えて入力した経費カードや計上データを、別の月（対象月）へまとめて移動・振替します"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600" />
            <span>他月へまとめて移動</span>
          </button>

          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold rounded-lg">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            給与自動連動中
          </span>
        </div>

        {/* Totals & Batch Submit */}
        <div className="flex flex-wrap items-center gap-2 justify-between xl:justify-end">
          {/* Card Total */}
          <div className="bg-rose-50/70 border border-rose-200 px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs">
            <span className="text-rose-700 font-medium whitespace-nowrap">
              カード計:
            </span>
            <span className="font-bold font-mono text-rose-900 text-sm">
              ¥{totalAllCardsAmount.toLocaleString()}
            </span>
          </div>

          {/* Registered Ledger Status */}
          <div className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs ${
            activeMonthRegistered.total > 0 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
              : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            <span className="font-medium whitespace-nowrap">出納帳:</span>
            <span className="font-bold font-mono text-xs">
              ¥{activeMonthRegistered.total.toLocaleString()}
            </span>
            {activeMonthRegistered.total > 0 ? (
              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-[10px]">
                計上済
              </span>
            ) : (
              <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded font-medium text-[10px]">
                未計上
              </span>
            )}
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-1.5">
            {activeGroupFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => handleBatchRegister(false)}
                disabled={totalEnteredAmount <= 0}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:pointer-events-none text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                title="現在選択されているグループの品目のみを出納帳へ計上します"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" />
                <span>表示中のみ計上</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleBatchRegister(true)}
              disabled={totalAllCardsAmount <= 0}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              title="給与・月末支払いを含む当月すべての経費カードを出納帳へ一括計上し、経費合計へ反映します"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{activeMonthRegistered.total > 0 ? '出納帳を最新計上に更新' : '全カードを一括計上'}</span>
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
        filteredCards.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {activeGroupFilter === 'salary' ? '給与・役員報酬カードが表示されていません' : '該当する経費カードがありません'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {activeGroupFilter === 'salary'
                  ? '給与カードを復元して表示できます。'
                  : 'フィルター条件を「すべて」にするか、カードを新規作成してください。'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              {activeGroupFilter === 'salary' ? (
                <button
                  type="button"
                  onClick={handleRestoreSalaryCard}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
                >
                  給与・役員報酬カードを復元
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveGroupFilter('ALL')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  すべてのカードを表示
                </button>
              )}
              <button
                type="button"
                onClick={handleOpenAddCard}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
              >
                + 新規カードを追加
              </button>
            </div>
          </div>
        ) : (
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
                          onClick={() => handleOpenMoveCardModal(card)}
                          className="p-1 text-white/80 hover:text-white rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
                          title="このカードの経費データを他の月に移動（またはコピー）"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </button>
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

                      <div className="flex items-center gap-1.5">
                        <div className="bg-white/20 px-2 py-0.5 rounded-lg text-white font-mono text-xs font-black">
                          小計: ¥{cardSubtotal.toLocaleString()}
                        </div>
                        {cardSubtotal > 0 && (
                          <button
                            type="button"
                            onClick={() => handleRegisterSingleCard(card)}
                            className="px-2 py-0.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-[10px] rounded-lg transition-all shadow-2xs flex items-center gap-1 cursor-pointer active:scale-95"
                            title="このカードの品目を今すぐ出納帳・経費に計上"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>計上</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Body: Purchased Sub-Items (何を買ったか) */}
                  <div className="p-4 space-y-3">
                    {hasSubItems ? (
                      card.subItems!.map((sub) => {
                        const key = `${card.id}_${sub.id}`;
                        const currentVal = (inputs[key]?.amount !== undefined && inputs[key]?.amount !== '')
                          ? inputs[key]!.amount
                          : (sub.defaultAmount ? String(sub.defaultAmount) : '');
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
                            value={(inputs[card.id]?.amount !== undefined && inputs[card.id]?.amount !== '') ? inputs[card.id]!.amount : (card.defaultAmount ? String(card.defaultAmount) : '')}
                            onChange={(e) => handleAmountChange(card.id, e.target.value)}
                            placeholder={card.defaultAmount ? card.defaultAmount.toLocaleString() : '0'}
                            className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-slate-200 focus:border-rose-500 rounded-xl font-bold text-xs text-slate-900 text-right font-mono focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer: Add SubItem Button or Salary shortcut */}
                <div className="p-3 bg-slate-50/80 border-t border-slate-100 space-y-2">
                  {card.timingGroup === 'salary' && onNavigateToSalary && (
                    <button
                      type="button"
                      onClick={onNavigateToSalary}
                      className="w-full py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Calculator className="w-3.5 h-3.5 text-emerald-600" />
                      <span>給与・役員報酬台帳（社保・税金自動計算）へ</span>
                    </button>
                  )}
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
      ))}

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

                    {cardSubtotal > 0 && (
                      <button
                        type="button"
                        onClick={() => handleRegisterSingleCard(card)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95"
                        title="このカードの品目を今すぐ出納帳・経費に計上"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>計上</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenMoveCardModal(card)}
                      className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      title="このカードの経費データを他の月に移動（またはコピー）"
                    >
                      <ArrowRightLeft className="w-3 h-3 text-indigo-600" />
                      <span>他月移動</span>
                    </button>

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
                      const currentVal = (inputs[key]?.amount !== undefined && inputs[key]?.amount !== '')
                        ? inputs[key]!.amount
                        : (sub.defaultAmount ? String(sub.defaultAmount) : '');
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

      {/* Move / Copy Month Modal */}
      {moveModalState && moveModalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-indigo-700 via-indigo-800 to-slate-900 text-white flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-xs border border-white/10">
                  <ArrowRightLeft className="w-5 h-5 text-indigo-200" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">
                    {moveModalState.mode === 'single' && moveModalState.card
                      ? `経費カード「${moveModalState.card.title}」の月移動`
                      : `${activeMonth.replace('-', '年')}月度 経費カードの一括移動`}
                  </h3>
                  <p className="text-xs text-indigo-200/90 mt-0.5">
                    誤って違う月に入力した金額や出納帳データを別の月にスライド移動できます
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMoveModalState(null)}
                className="p-1.5 text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Target item summary card */}
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
                    移動対象データ
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {moveModalState.mode === 'single' && moveModalState.card
                      ? moveModalState.card.title
                      : `すべての経費カード (${expenseCards.length}枚)`}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 block">
                    入力金額合計
                  </span>
                  <span className="text-sm font-black font-mono text-indigo-900">
                    ¥{moveModalState.mode === 'single' && moveModalState.card
                      ? getCardEnteredSubtotal(moveModalState.card).toLocaleString()
                      : totalAllCardsAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Month Shift Selector: From -> To */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  移動元（現在） ➔ 移動先（新月度）
                </label>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] font-semibold text-slate-500 block">現在の月度</span>
                    <span className="text-xs font-black text-slate-800">
                      {activeMonth.replace('-', '年')}月度
                    </span>
                  </div>

                  <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center">
                    <ArrowRightLeft className="w-4 h-4" />
                  </div>

                  <div>
                    <select
                      value={targetMoveMonth}
                      onChange={(e) => setTargetMoveMonth(e.target.value)}
                      className="w-full p-2.5 bg-white border-2 border-indigo-500 rounded-xl text-xs font-black text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-400 cursor-pointer shadow-xs"
                    >
                      {allAvailableMonths.map((m) => (
                        <option
                          key={m.month}
                          value={m.month}
                          disabled={m.month === activeMonth}
                        >
                          {m.label} {m.month === activeMonth ? ' (現在選択中)' : ''} ({m.periodLabel})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Quick month selection shortcuts */}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] text-slate-400 font-medium">クイック指定:</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (prevMonthStr !== activeMonth) setTargetMoveMonth(prevMonthStr);
                    }}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold rounded-md cursor-pointer transition-colors"
                  >
                    ◀ 前月 ({prevMonthStr})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (nextMonthStr !== activeMonth) setTargetMoveMonth(nextMonthStr);
                    }}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold rounded-md cursor-pointer transition-colors"
                  >
                    翌月 ({nextMonthStr}) ▶
                  </button>
                </div>
              </div>

              {/* Action Type Selection (Move vs Copy) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  移動方法（動作モード）
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label
                    className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                      moveActionType === 'move'
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="moveActionType"
                        value="move"
                        checked={moveActionType === 'move'}
                        onChange={() => setMoveActionType('move')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-black text-slate-900">
                        他の月へ移動（振替）
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 pl-5">
                      入力ミス修正用。元の月の入力値はクリアされ、指定した月へ移動します。
                    </p>
                  </label>

                  <label
                    className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                      moveActionType === 'copy'
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="moveActionType"
                        value="copy"
                        checked={moveActionType === 'copy'}
                        onChange={() => setMoveActionType('copy')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-black text-slate-900">
                        他の月へコピー（複製）
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 pl-5">
                      元の月のデータを残したまま、指定した月へ同じ金額を複製します。
                    </p>
                  </label>
                </div>
              </div>

              {/* Transactions sync checkbox */}
              {onBatchUpdateTransactions && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeTransactions}
                      onChange={(e) => setIncludeTransactions(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        出納帳に計上済みの取引データも新しい月へ{moveActionType === 'move' ? '移動' : 'コピー'}する
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        すでに「計上」ボタンを押して出納帳に記録されている取引の日付も、連動して新しい月度の日付へ変更されます。
                      </p>
                    </div>
                  </label>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setMoveModalState(null)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl cursor-pointer hover:bg-slate-100"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleExecuteMove}
                disabled={!targetMoveMonth || targetMoveMonth === activeMonth}
                className={`px-5 py-2.5 text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  !targetMoveMonth || targetMoveMonth === activeMonth
                    ? 'bg-slate-300 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-indigo-200'
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>
                  {targetMoveMonth ? `${targetMoveMonth.split('-')[0]}年${parseInt(targetMoveMonth.split('-')[1], 10)}月度へ` : ''}
                  {moveActionType === 'move' ? '移動する' : 'コピーする'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
