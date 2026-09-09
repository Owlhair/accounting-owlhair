import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, AppSettings, ChatMessage, TeamMember, TransactionRef, FiscalSettings, ExpenseCard, SalaryEmployee, SalarySettings } from './types';
import { 
  loadTransactions, 
  saveTransactions, 
  loadSettings, 
  saveSettings, 
  resetToSampleData, 
  clearAllData 
} from './utils/storage';
import { 
  loadChatMessages, 
  saveChatMessages, 
  loadCurrentMember, 
  saveCurrentMember, 
  subscribeToChatUpdates,
  createTransactionRef,
  resetToSampleChat,
  clearChatMessages
} from './utils/chatStorage';
import { 
  getAvailableMonths, 
  calculateSummary, 
  calculateFiscalPeriods 
} from './utils/calculations';
import { exportTransactionsToCsv } from './utils/csvExport';
import { writeToActiveHandle } from './utils/fileSystemSync';
import { 
  initFirestoreRealtimeSync,
  syncSaveTransactionToFirestore,
  syncDeleteTransactionFromFirestore,
  syncSaveSettingsToFirestore,
  syncAddChatMessageToFirestore,
  uploadAllTransactionsToFirestore,
  pullLatestFromFirestore,
} from './utils/firestoreSync';

import { Navbar, NavTab } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { TransactionList } from './components/TransactionList';
import { ScratchFlowView } from './components/ScratchFlowView';
import { MonthlyAggregationView } from './components/MonthlyAggregationView';
import { StoreSalesCardBoard } from './components/StoreSalesCardBoard';
import { ExpenseCardsView } from './components/ExpenseCardsView';
import { SalaryView } from './components/SalaryView';
import { SalaryTotalSummary, SalaryCalculationResult, calculateEmployeeSalary, calculateTotalSalarySummary } from './utils/salaryCalculator';
import { FinancialStatementView } from './components/FinancialStatementView';
import { AddSalesModal } from './components/AddSalesModal';
import { AddExpenseModal } from './components/AddExpenseModal';
import { TransactionEditModal } from './components/TransactionEditModal';
import { DataBackupModal } from './components/DataBackupModal';
import { SettingsModal } from './components/SettingsModal';
import { TeamChatDrawer } from './components/TeamChatDrawer';
import { PwaInstallPromptModal } from './components/PwaInstallPromptModal';
import { LoginScreen, loadAuthState, clearAuthSession } from './components/LoginScreen';
import { MessageSquareText } from 'lucide-react';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const auth = loadAuthState();
    return auth.isUnlocked;
  });
  const [currentUser, setCurrentUser] = useState<string>(() => {
    return loadAuthState().user;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => loadTransactions());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [currentTab, setCurrentTab] = useState<NavTab>(() => {
    try {
      const saved = localStorage.getItem('scratch_keiri_current_tab');
      if (saved && ['dashboard', 'cards', 'expenseCards', 'salary', 'list', 'scratch', 'monthly', 'statement'].includes(saved)) {
        return saved as NavTab;
      }
    } catch (e) {}
    return 'dashboard';
  });

  // Automatically write to linked local ledger file in background whenever transactions, settings, or chat change
  useEffect(() => {
    writeToActiveHandle(transactions, settings, chatMessages).catch(() => {});
  }, [transactions, settings]);

  // Save currentTab to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('scratch_keiri_current_tab', currentTab);
    } catch (e) {}
  }, [currentTab]);

  // Compute fiscal periods automatically based on settings and transactions
  const fiscalPeriods = useMemo(() => {
    return calculateFiscalPeriods(transactions, settings.fiscalSettings);
  }, [transactions, settings.fiscalSettings]);

  // Selected filter (Defaults to saved filter, or period with active transactions)
  const [selectedFilter, setSelectedFilter] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('scratch_keiri_selected_filter');
      if (saved) return saved;
    } catch (e) {}

    const loaded = loadTransactions();
    const loadedSettings = loadSettings();
    const periods = calculateFiscalPeriods(loaded, loadedSettings.fiscalSettings);
    
    // Find the period with the most recent transaction
    if (loaded.length > 0) {
      for (const period of periods.slice().reverse()) {
        const hasTx = loaded.some(t => {
          const m = (t.date_from || t.date_to || '').substring(0, 7);
          return period.months.includes(m);
        });
        if (hasTx) return period.key;
      }
    }
    return periods[0]?.key || 'ALL';
  });

  // Save selectedFilter to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('scratch_keiri_selected_filter', selectedFilter);
    } catch (e) {}
  }, [selectedFilter]);

  // Keep selected filter valid if periods update
  useEffect(() => {
    if (selectedFilter.startsWith('period-')) {
      const exists = fiscalPeriods.some(p => p.key === selectedFilter);
      if (!exists && fiscalPeriods.length > 0) {
        setSelectedFilter(fiscalPeriods[0].key);
      }
    }
  }, [fiscalPeriods, selectedFilter]);

  // Active month for modals based on current view/filter
  const activeInputMonth = useMemo(() => {
    if (selectedFilter && selectedFilter !== 'ALL' && !selectedFilter.startsWith('period-')) {
      return selectedFilter;
    }
    if (selectedFilter && selectedFilter.startsWith('period-')) {
      const period = fiscalPeriods.find(p => p.key === selectedFilter);
      if (period && period.months.length > 0) {
        // Pick the most relevant month in this period (e.g. latest month that has transactions, or first)
        const monthWithTx = period.months.slice().reverse().find(m => 
          transactions.some(t => (t.date_from && t.date_from.startsWith(m)) || (t.date_to && t.date_to.startsWith(m)))
        );
        return monthWithTx || period.months[0];
      }
    }
    if (transactions.length > 0) {
      const d = transactions[0].date_from || transactions[0].date_to;
      if (d && d.length >= 7) return d.substring(0, 7);
    }
    return '2025-08';
  }, [selectedFilter, fiscalPeriods, transactions]);

  // Multi-user team chat states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => loadChatMessages());
  const [currentMember, setCurrentMember] = useState<TeamMember>(() => loadCurrentMember());
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [quotedTransaction, setQuotedTransaction] = useState<Transaction | null>(null);

  // Modal visibility states
  const [isAddSalesOpen, setIsAddSalesOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isFiscalSettingsOpen, setIsFiscalSettingsOpen] = useState(false);
  const [isPwaModalOpen, setIsPwaModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Sync transactions with localStorage
  useEffect(() => {
    saveTransactions(transactions);
  }, [transactions]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Sync member with localStorage
  useEffect(() => {
    saveCurrentMember(currentMember);
  }, [currentMember]);

  // Real-time synchronization subscription across browser tabs & devices via Firebase Firestore
  const [isCloudConnected, setIsCloudConnected] = useState(true);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  useEffect(() => {
    const unsubscribeFirestore = initFirestoreRealtimeSync({
      onTransactionsUpdate: (cloudTx) => {
        setTransactions(cloudTx);
      },
      onSettingsUpdate: (cloudSettings) => {
        setSettings(cloudSettings);
      },
      onChatUpdate: (cloudChat) => {
        setChatMessages(cloudChat);
      },
      onStatusChange: (status) => {
        setIsCloudConnected(status.isConnected);
        setIsCloudSyncing(status.isSyncing);
      },
    });

    const unsubscribeLocalChat = subscribeToChatUpdates((updatedMessages) => {
      setChatMessages(updatedMessages);
    });

    return () => {
      unsubscribeFirestore?.();
      unsubscribeLocalChat();
    };
  }, []);

  // Derived available months for optional single-month drilldown
  const availableMonths = useMemo(() => {
    const months = getAvailableMonths(transactions);
    return months.sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  // Calculate unconfirmed count across all items
  const summary = useMemo(() => calculateSummary(transactions), [transactions]);

  // Chat: Send message handler
  const handleSendMessage = (text: string, transactionRef?: TransactionRef) => {
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      sender: currentMember,
      text,
      timestamp: new Date().toISOString(),
      transactionRef,
    };

    const nextMessages = [...chatMessages, newMsg];
    setChatMessages(nextMessages);
    saveChatMessages(nextMessages);
    syncAddChatMessageToFirestore(newMsg);
  };

  // Chat: Quote transaction & open drawer
  const handleQuoteInChat = (tx: Transaction) => {
    setQuotedTransaction(tx);
    setIsChatOpen(true);
  };

  // Handler: Add Transactions (Single or Batch)
  const handleAddTransactions = (newItems: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>[]) => {
    const timestamp = new Date().toISOString();
    const created: Transaction[] = newItems.map((item, idx) => ({
      ...item,
      id: `tx-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      created_at: timestamp,
      updated_at: timestamp,
    }));

    setTransactions(prev => {
      const updated = [...created, ...prev];
      saveTransactions(updated);
      return updated;
    });

    created.forEach(tx => syncSaveTransactionToFirestore(tx));
  };

  // Handler: Update Transaction
  const handleUpdateTransaction = (updated: Transaction) => {
    setTransactions(prev => {
      const next = prev.map(t => (t.id === updated.id ? updated : t));
      saveTransactions(next);
      return next;
    });

    syncSaveTransactionToFirestore(updated);

    // Also update any chat messages that reference this transaction
    setChatMessages(prev =>
      prev.map(msg => {
        if (msg.transactionRef && msg.transactionRef.id === updated.id) {
          return {
            ...msg,
            transactionRef: createTransactionRef(updated),
          };
        }
        return msg;
      })
    );
  };

  // Handler: Duplicate Transaction
  const handleDuplicateTransaction = (tx: Transaction) => {
    const timestamp = new Date().toISOString();
    const duplicated: Transaction = {
      ...tx,
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      description: `${tx.description || tx.category} (コピー)`,
      created_at: timestamp,
      updated_at: timestamp,
    };
    setTransactions(prev => {
      const updated = [duplicated, ...prev];
      saveTransactions(updated);
      return updated;
    });
    syncSaveTransactionToFirestore(duplicated);
  };

  // Handler: Delete Transaction
  const handleDeleteTransaction = (id: string) => {
    setTransactions(prev => {
      const updated = prev.filter(t => t.id !== id);
      saveTransactions(updated);
      return updated;
    });
    syncDeleteTransactionFromFirestore(id);
  };

  // Handler: Toggle Confirmed Status
  const handleToggleConfirm = (id: string) => {
    setTransactions(prev => {
      const updated = prev.map(t => {
        if (t.id === id) {
          const nextConfirmed = !t.confirmed;
          const nextTx = { ...t, confirmed: nextConfirmed, updated_at: new Date().toISOString() };
          syncSaveTransactionToFirestore(nextTx);
          return nextTx;
        }
        return t;
      });
      saveTransactions(updated);
      return updated;
    });
  };

  // Handler: Bulk Confirm
  const handleBulkConfirm = (ids: string[]) => {
    const set = new Set(ids);
    setTransactions(prev => {
      const updated = prev.map(t => {
        if (set.has(t.id)) {
          const nextTx = { ...t, confirmed: true, updated_at: new Date().toISOString() };
          syncSaveTransactionToFirestore(nextTx);
          return nextTx;
        }
        return t;
      });
      saveTransactions(updated);
      return updated;
    });
  };

  // Handler: Add Category
  const handleAddCategory = (category: string, type: 'sales' | 'expense') => {
    if (type === 'sales') {
      if (!settings.salesCategories.includes(category)) {
        setSettings(prev => {
          const updated = {
            ...prev,
            salesCategories: [...prev.salesCategories, category],
          };
          saveSettings(updated);
          syncSaveSettingsToFirestore(updated);
          return updated;
        });
      }
    } else {
      if (!settings.expenseCategories.includes(category)) {
        setSettings(prev => {
          const updated = {
            ...prev,
            expenseCategories: [...prev.expenseCategories, category],
          };
          saveSettings(updated);
          syncSaveSettingsToFirestore(updated);
          return updated;
        });
      }
    }
  };

  // Handler: Save Store Sales Card (店舗・月別の売上カード保存)
  const handleSaveStoreCard = (
    month: string,
    store: string,
    breakdown: Record<string, number>,
    memo?: string
  ) => {
    const [y, m] = month.split('-');
    const lastDay = new Date(Number(y), Number(m), 0).getDate();
    const dateFrom = `${month}-01`;
    const dateTo = `${month}-${String(lastDay).padStart(2, '0')}`;
    const timestamp = new Date().toISOString();

    setTransactions(prev => {
      // Filter out existing sales transactions for this store & month
      const nonStoreMonthlyTx = prev.filter(t => {
        const txMonth = (t.date_from || t.date_to || '').substring(0, 7);
        const txStore = t.store || '全社共通';
        return !(t.type === 'sales' && txStore === store && txMonth === month);
      });

      // Delete removed tx from firestore
      prev.filter(t => {
        const txMonth = (t.date_from || t.date_to || '').substring(0, 7);
        const txStore = t.store || '全社共通';
        return (t.type === 'sales' && txStore === store && txMonth === month);
      }).forEach(t => syncDeleteTransactionFromFirestore(t.id));

      // Create new transactions for each payment method in breakdown
      const newItems: Transaction[] = [];
      Object.entries(breakdown).forEach(([method, amount], idx) => {
        if (amount > 0) {
          const item: Transaction = {
            id: `tx-${month.replace('-', '')}-${store}-${method}-${Date.now()}-${idx}`,
            date_from: dateFrom,
            date_to: dateTo,
            type: 'sales',
            category: '技術売上',
            store: store,
            amount: amount,
            payment_method: method,
            granularity: 'monthly',
            description: `${store} ${month} 売上 (${method})`,
            memo: memo || `${store} ${month}度 売上カード`,
            source_type: 'manual',
            confirmed: true,
            created_at: timestamp,
            updated_at: timestamp,
          };
          newItems.push(item);
          syncSaveTransactionToFirestore(item);
        }
      });

      const updated = [...newItems, ...nonStoreMonthlyTx];
      saveTransactions(updated);
      return updated;
    });
  };

  // Handler: Save Expense Cards configuration
  const handleSaveExpenseCards = (cards: ExpenseCard[]) => {
    const updated: AppSettings = {
      ...settings,
      expenseCards: cards,
    };
    setSettings(updated);
    saveSettings(updated);
    syncSaveSettingsToFirestore(updated);
  };

  // Handler: Batch Register from Expense Cards
  const handleRegisterExpenseBatch = (items: { title: string; category: string; costType: 'fixed' | 'variable'; paymentMethod: string; store: string; amount: number; date: string; memo: string }[]) => {
    const timestamp = new Date().toISOString();
    const newItems: Transaction[] = items.map((item, idx) => {
      const monthStr = item.date.substring(0, 7);
      const isMonthlyGranularity = item.costType === 'fixed';
      const dateParts = item.date.split('-');
      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10);
      const lastDay = new Date(year, month, 0).getDate();
      const dateFrom = isMonthlyGranularity ? `${monthStr}-01` : item.date;
      const dateTo = isMonthlyGranularity ? `${monthStr}-${String(lastDay).padStart(2, '0')}` : item.date;

      return {
        id: `tx-expcard-${Date.now()}-${idx}`,
        date_from: dateFrom,
        date_to: dateTo,
        type: 'expense' as const,
        category: item.category,
        store: item.store || '全社共通',
        amount: item.amount,
        payment_method: item.paymentMethod || 'クレジットカード',
        granularity: isMonthlyGranularity ? 'monthly' as const : 'daily' as const,
        description: `${item.title} (${item.category})`,
        memo: item.memo || `${item.title} 一括計上`,
        source_type: 'manual' as const,
        confirmed: true,
        created_at: timestamp,
        updated_at: timestamp,
      };
    });

    setTransactions((prev) => {
      const updated = [...newItems, ...prev];
      saveTransactions(updated);
      return updated;
    });

    newItems.forEach((tx) => syncSaveTransactionToFirestore(tx));

    const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);
    handleSendMessage(
      `📋 【経費一括計上】${items[0].date.substring(0, 7)}月分として ${items.length} 件（合計 ¥${totalAmount.toLocaleString()}）の経費カード取引を計上・反映しました。`
    );
  };

  // Handler: Save Salary Employees
  const handleSaveSalaryEmployees = (newEmployees: SalaryEmployee[], targetMonth?: string) => {
    const snapshots = { ...(settings.monthlySalarySnapshots || {}) };
    if (targetMonth) {
      snapshots[targetMonth] = newEmployees;
    }
    const updated: AppSettings = {
      ...settings,
      salaryEmployees: newEmployees,
      monthlySalarySnapshots: snapshots,
    };
    setSettings(updated);
    saveSettings(updated);
    syncSaveSettingsToFirestore(updated);
  };

  // Handler: Save Salary Settings
  const handleSaveSalarySettings = (newSalarySettings: SalarySettings) => {
    const updated: AppSettings = {
      ...settings,
      salarySettings: newSalarySettings,
    };
    setSettings(updated);
    saveSettings(updated);
    syncSaveSettingsToFirestore(updated);
  };

  // Handler: Register Salary and Month-End Payments to Transactions
  const handleRegisterSalaryToTransactions = (
    payloadOrSummary: any,
    secondArgTargetMonth?: string,
    thirdArgResults?: SalaryCalculationResult[]
  ) => {
    let targetMonth: string;
    let payDate: string;
    let monthEndDate: string;
    let summary: SalaryTotalSummary;
    let results: SalaryCalculationResult[] = [];

    if (payloadOrSummary && typeof payloadOrSummary === 'object' && 'targetMonth' in payloadOrSummary) {
      targetMonth = payloadOrSummary.targetMonth;
      summary = payloadOrSummary.summary;
      results = payloadOrSummary.results || [];
      const [yearStr, monthStr] = targetMonth.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const payDay = settings.salarySettings?.payDay || 25;
      payDate = payloadOrSummary.payDate || `${targetMonth}-${String(payDay).padStart(2, '0')}`;
      const lastDay = new Date(year, month, 0).getDate();
      monthEndDate = payloadOrSummary.monthEndDate || `${targetMonth}-${String(lastDay).padStart(2, '0')}`;
    } else {
      summary = payloadOrSummary as SalaryTotalSummary;
      targetMonth = secondArgTargetMonth || new Date().toISOString().substring(0, 7);
      results = thirdArgResults || [];
      const [yearStr, monthStr] = targetMonth.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const payDay = settings.salarySettings?.payDay || 25;
      payDate = `${targetMonth}-${String(payDay).padStart(2, '0')}`;
      const lastDay = new Date(year, month, 0).getDate();
      monthEndDate = `${targetMonth}-${String(lastDay).padStart(2, '0')}`;
    }

    const timestamp = new Date().toISOString();
    const newTxList: Transaction[] = [];

    // Save current employees to monthly snapshots
    const snapshots = { ...(settings.monthlySalarySnapshots || {}) };
    if (results && results.length > 0) {
      snapshots[targetMonth] = results.map(r => r.employee);
    }

    // Ensure '法定福利費' category exists in expense categories
    let updatedCategories = settings.expenseCategories;
    if (!updatedCategories.includes('法定福利費')) {
      updatedCategories = [...updatedCategories, '法定福利費'];
    }
    const updatedSettings = { 
      ...settings, 
      expenseCategories: updatedCategories,
      monthlySalarySnapshots: snapshots,
    };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
    syncSaveSettingsToFirestore(updatedSettings);

    // 1. 役員報酬支給（支給日: 25日等）
    if (summary.totalExecutiveRemuneration > 0) {
      newTxList.push({
        id: `tx-sal-exec-${Date.now()}-1`,
        date_from: payDate,
        date_to: payDate,
        type: 'expense',
        category: '役員報酬',
        store: '全社共通',
        amount: summary.totalExecutiveRemuneration,
        payment_method: '銀行振込',
        granularity: 'monthly',
        description: `${targetMonth}分 役員報酬支給 (${summary.executiveCount}名)`,
        memo: `役員報酬（定期同額給与）。手取り振込＋源泉控除`,
        source_type: 'manual',
        confirmed: true,
        created_at: timestamp,
        updated_at: timestamp,
      });
    }

    // 2. 給料手当支給（支給日: 25日等）
    if (summary.totalStaffSalary > 0) {
      newTxList.push({
        id: `tx-sal-staff-${Date.now()}-2`,
        date_from: payDate,
        date_to: payDate,
        type: 'expense',
        category: '給料手当',
        store: '全社共通',
        amount: summary.totalStaffSalary,
        payment_method: '銀行振込',
        granularity: 'monthly',
        description: `${targetMonth}分 給料手当支給 (${summary.staffCount}名)`,
        memo: `スタッフ給与（手当 ¥${summary.totalAllowances.toLocaleString()}含む）手取り振込＋各種控除`,
        source_type: 'manual',
        confirmed: true,
        created_at: timestamp,
        updated_at: timestamp,
      });
    }

    // 3. 【末の支払い】社会保険料納付 (健康保険・厚生年金・介護・子ども子育て拠出金)
    // 会社負担分 ＋ 本人預り分 を合算した総納付額！
    const socialInsPayment = summary.monthEndSummary.socialInsurancePayment;
    if (socialInsPayment > 0) {
      newTxList.push({
        id: `tx-sal-soc-${Date.now()}-3`,
        date_from: monthEndDate,
        date_to: monthEndDate,
        type: 'expense',
        category: '法定福利費',
        store: '全社共通',
        amount: socialInsPayment,
        payment_method: '口座振替',
        granularity: 'monthly',
        description: `${targetMonth}分 社会保険料納付 (会社負担分 + 本人預り分 合計)`,
        memo: `【末の支払い】健保・厚年等口座引落。会社負担分: ¥${summary.totalCompanySocialInsurance.toLocaleString()} / 本人分預り: ¥${summary.totalSocialInsurance.toLocaleString()}`,
        source_type: 'manual',
        confirmed: true,
        created_at: timestamp,
        updated_at: timestamp,
      });
    }

    // 4. 【末の支払い】雇用保険 会社負担分
    const laborInsPayment = summary.monthEndSummary.laborInsurancePayment;
    if (laborInsPayment > 0) {
      newTxList.push({
        id: `tx-sal-labor-${Date.now()}-4`,
        date_from: monthEndDate,
        date_to: monthEndDate,
        type: 'expense',
        category: '法定福利費',
        store: '全社共通',
        amount: laborInsPayment,
        payment_method: '銀行振込',
        granularity: 'monthly',
        description: `${targetMonth}分 雇用保険 会社負担分（法定福利費）`,
        memo: `【末の支払い】雇用保険の事業主会社負担分（総支給額 × 9.5/1000）`,
        source_type: 'manual',
        confirmed: true,
        created_at: timestamp,
        updated_at: timestamp,
      });
    }

    // 5. 【末の支払い】源泉所得税・住民税 預り金納付
    const taxPayment = summary.monthEndSummary.withholdingTaxPayment + summary.monthEndSummary.residentTaxPayment;
    if (taxPayment > 0) {
      newTxList.push({
        id: `tx-sal-tax-${Date.now()}-5`,
        date_from: monthEndDate,
        date_to: monthEndDate,
        type: 'expense',
        category: '租税公課',
        store: '全社共通',
        amount: taxPayment,
        payment_method: '銀行振込',
        granularity: 'monthly',
        description: `${targetMonth}分 源泉所得税・住民税納付（給与天引き預り金）`,
        memo: `【末の支払い】源泉所得税 ¥${summary.monthEndSummary.withholdingTaxPayment.toLocaleString()} + 住民税 ¥${summary.monthEndSummary.residentTaxPayment.toLocaleString()} の納付`,
        source_type: 'manual',
        confirmed: true,
        created_at: timestamp,
        updated_at: timestamp,
      });
    }

    setTransactions((prev) => {
      // Clean up previous salary transactions for the same targetMonth if any so re-registering cleanly replaces
      const filtered = prev.filter(t => !(
        t.type === 'expense' &&
        (
          t.id.startsWith(`tx-sal-`) ||
          t.description.includes(`${targetMonth}分 役員報酬`) ||
          t.description.includes(`${targetMonth}分 給料手当`) ||
          t.description.includes(`${targetMonth}分 社会保険料`) ||
          t.description.includes(`${targetMonth}分 雇用保険`) ||
          t.description.includes(`${targetMonth}分 源泉所得税`)
        ) &&
        (
          (t.date_from && t.date_from.startsWith(targetMonth)) ||
          t.description.includes(`${targetMonth}分`)
        )
      ));
      const updated = [...newTxList, ...filtered];
      saveTransactions(updated);
      return updated;
    });

    newTxList.forEach(tx => syncSaveTransactionToFirestore(tx));

    // Automatically sync salary & month-end cards to expense cards as well!
    handleSyncSalaryToExpenseCards(summary, targetMonth, true);

    const totalCost = summary.totalCompanyCost;
    handleSendMessage(
      `💼 【給与＆月末支払い計上】${targetMonth}月分の給与（役員報酬/給料手当）および【末の支払い（社保会社+本人合算納付 ¥${socialInsPayment.toLocaleString()}等）】計 ${newTxList.length} 件を一括計上しました。（会社総人件費: ¥${totalCost.toLocaleString()}）`
    );

    alert(
      `✅ 【給与＆月末支払いの計上完了】\n${targetMonth}月分として計 ${newTxList.length} 件の取引データを登録しました！\n\n` +
      `① 25日支給分:\n・役員報酬: ¥${summary.totalExecutiveRemuneration.toLocaleString()}\n・給料手当: ¥${summary.totalStaffSalary.toLocaleString()}\n・手取り振込計: ¥${summary.totalNetSalary.toLocaleString()}\n\n` +
      `② 月末の支払い納付分:\n・社会保険料 (会社負担+本人預り合算): ¥${socialInsPayment.toLocaleString()}\n・税金納付 (源泉+住民税): ¥${taxPayment.toLocaleString()}\n・雇用保険会社分: ¥${laborInsPayment.toLocaleString()}\n\n` +
      `★ 月末の支払い合計: ¥${summary.monthEndSummary.totalMonthEndPayment.toLocaleString()}\n\n` +
      `※経費カード画面にも、出来上がった給与報酬カード（役員報酬・給料手当・社保納付）を自動反映しました！`
    );
  };

  // Handler: Sync Salary & Month-End Cards to Expense Cards (給与報酬出来上がりカードを経費カードへ反映)
  const handleSyncSalaryToExpenseCards = (summary: SalaryTotalSummary, targetMonth: string, silent = false) => {
    const currentCards = [...(settings.expenseCards || [])];

    // 1. 【3. 給与グループ（timingGroup: 'salary'）のカード】
    let salaryCard = currentCards.find(c => c.timingGroup === 'salary');
    if (!salaryCard) {
      salaryCard = {
        id: `ec-salary-board`,
        title: '役員報酬・スタッフ給与（支給日振込）',
        timingGroup: 'salary',
        paymentMethod: '銀行振込',
        store: '全社共通',
        memo: `毎月${settings.salarySettings?.payDay || 25}日振込 給与・役員報酬`,
        subItems: [],
      };
      currentCards.push(salaryCard);
    }

    const salarySubItems = [...(salaryCard.subItems || [])];

    // 1-1. 役員報酬サブアイテム
    if (summary.totalExecutiveRemuneration > 0) {
      const execIdx = salarySubItems.findIndex(i => i.name.includes('役員報酬') || i.category === '役員報酬');
      if (execIdx >= 0) {
        salarySubItems[execIdx] = {
          ...salarySubItems[execIdx],
          defaultAmount: summary.totalExecutiveRemuneration,
          memo: `役員${summary.executiveCount}名分 (${targetMonth}給与台帳)`,
        };
      } else {
        salarySubItems.push({
          id: `sub-sal-exec-${Date.now()}`,
          name: '役員報酬（定期同額給与）',
          category: '役員報酬',
          costType: 'fixed',
          defaultAmount: summary.totalExecutiveRemuneration,
          store: '全社共通',
          memo: `役員${summary.executiveCount}名分 (${targetMonth}給与台帳)`,
        });
      }
    }

    // 1-2. スタッフ給料手当サブアイテム
    if (summary.totalStaffSalary > 0) {
      const staffIdx = salarySubItems.findIndex(i => i.name.includes('給料') || i.name.includes('スタッフ') || i.category === '給料手当');
      if (staffIdx >= 0) {
        salarySubItems[staffIdx] = {
          ...salarySubItems[staffIdx],
          defaultAmount: summary.totalStaffSalary,
          memo: `スタッフ${summary.staffCount}名分 (手当計 ¥${summary.totalAllowances.toLocaleString()}含む)`,
        };
      } else {
        salarySubItems.push({
          id: `sub-sal-staff-${Date.now()}`,
          name: 'スタッフ給料手当',
          category: '給料手当',
          costType: 'fixed',
          defaultAmount: summary.totalStaffSalary,
          store: '全社共通',
          memo: `スタッフ${summary.staffCount}名分 (手当計 ¥${summary.totalAllowances.toLocaleString()}含む)`,
        });
      }
    }

    salaryCard.subItems = salarySubItems;
    salaryCard.defaultAmount = summary.totalGross;

    // 2. 【2. 末にまとめて払うものグループ（timingGroup: 'month_end'）のカード】
    let monthEndCard = currentCards.find(c => c.timingGroup === 'month_end');
    const socialInsTotal = summary.monthEndSummary.socialInsurancePayment;
    const laborInsTotal = summary.monthEndSummary.laborInsurancePayment;
    const taxesTotal = summary.monthEndSummary.withholdingTaxPayment + summary.monthEndSummary.residentTaxPayment;

    if (!monthEndCard) {
      monthEndCard = {
        id: `ec-month-end-${Date.now()}`,
        title: '月末まとめて支払うもの（請求書・社保・税金）',
        timingGroup: 'month_end',
        paymentMethod: '口座振替',
        store: '全社共通',
        memo: '社会保険料・税金・買掛金など',
        subItems: [],
      };
      currentCards.push(monthEndCard);
    }

    const existingSubItems = [...(monthEndCard.subItems || [])];

    // 2-1. 社会保険料（会社負担＋本人分合算）
    if (socialInsTotal > 0) {
      const socIdx = existingSubItems.findIndex(i => i.name.includes('社会保険料'));
      if (socIdx >= 0) {
        existingSubItems[socIdx] = {
          ...existingSubItems[socIdx],
          defaultAmount: socialInsTotal,
          memo: `社保本人+会社負担分合算 (${targetMonth}給与台帳)`,
        };
      } else {
        existingSubItems.push({
          id: `sub-soc-${Date.now()}`,
          name: '社会保険料納付（会社負担＋本人分合算）',
          category: '法定福利費',
          costType: 'fixed',
          defaultAmount: socialInsTotal,
          store: '全社共通',
          memo: `健保・厚年・介護・子ども子育て (本人+会社負担合算)`,
        });
      }
    }

    // 2-2. 労働保険
    if (laborInsTotal > 0) {
      const laborIdx = existingSubItems.findIndex(i => i.name.includes('雇用保険') || i.name.includes('労働保険'));
      if (laborIdx >= 0) {
        existingSubItems[laborIdx] = {
          ...existingSubItems[laborIdx],
          defaultAmount: laborInsTotal,
          memo: `雇用保険 会社負担分 (${targetMonth}給与台帳)`,
        };
      } else {
        existingSubItems.push({
          id: `sub-labor-${Date.now()}`,
          name: '雇用保険・労働保険（会社負担分）',
          category: '法定福利費',
          costType: 'fixed',
          defaultAmount: laborInsTotal,
          store: '全社共通',
          memo: '事業主会社負担分',
        });
      }
    }

    // 2-3. 源泉税・住民税
    if (taxesTotal > 0) {
      const taxIdx = existingSubItems.findIndex(i => i.name.includes('源泉') || i.name.includes('税金納付'));
      if (taxIdx >= 0) {
        existingSubItems[taxIdx] = {
          ...existingSubItems[taxIdx],
          defaultAmount: taxesTotal,
          memo: `源泉所得税+住民税 天引き預り金納付 (${targetMonth}給与台帳)`,
        };
      } else {
        existingSubItems.push({
          id: `sub-tax-${Date.now()}`,
          name: '源泉所得税・住民税（預り金納付）',
          category: '租税公課',
          costType: 'fixed',
          defaultAmount: taxesTotal,
          store: '全社共通',
          memo: '給与天引き分の月末納付',
        });
      }
    }

    monthEndCard.subItems = existingSubItems;
    monthEndCard.defaultAmount = summary.monthEndSummary.totalMonthEndPayment;

    const updatedCards = currentCards.map(c => {
      if (c.id === salaryCard!.id) return salaryCard!;
      if (c.id === monthEndCard!.id) return monthEndCard!;
      return c;
    });

    const updatedSettings: AppSettings = {
      ...settings,
      expenseCards: updatedCards,
    };

    setSettings(updatedSettings);
    saveSettings(updatedSettings);
    syncSaveSettingsToFirestore(updatedSettings);

    // Automatically register transactions to ledger so that total expense amounts across all views (Dashboard, Monthly Progress, PL, Transactions) update immediately!
    if (!silent) {
      handleRegisterSalaryToTransactions(summary, targetMonth, summary ? undefined : undefined);
      handleSendMessage(
        `✅ 【給与・月末支払いを出納帳及び経費カードへ反映しました】\n` +
        `・役員報酬: ¥${summary.totalExecutiveRemuneration.toLocaleString()} (${summary.executiveCount}名)\n` +
        `・スタッフ給料手当: ¥${summary.totalStaffSalary.toLocaleString()} (${summary.staffCount}名)\n` +
        `・社会保険料納付（会社+本人）: ¥${socialInsTotal.toLocaleString()}\n` +
        `・雇用保険会社負担: ¥${laborInsTotal.toLocaleString()}\n` +
        `・源泉税・住民税納付: ¥${taxesTotal.toLocaleString()}\n` +
        `経費カードの品目金額、月別進捗、試算表、および出納帳の経費合計金額へ即座に反映されました。`
      );
    }
  };

  // Handler: Save Settings (Fiscal & Stores)
  const handleSaveSettings = (newFiscalSettings: FiscalSettings, newStores: string[], newClosedStores: string[] = []) => {
    const isFiscalChanged =
      newFiscalSettings.fiscalYearEndMonth !== settings.fiscalSettings.fiscalYearEndMonth ||
      newFiscalSettings.fiscalYearStartYear !== settings.fiscalSettings.fiscalYearStartYear;

    const updatedSettings: AppSettings = {
      ...settings,
      fiscalSettings: newFiscalSettings,
      stores: newStores,
      closedStores: newClosedStores,
    };

    setSettings(updatedSettings);
    saveSettings(updatedSettings);
    syncSaveSettingsToFirestore(updatedSettings);

    // If fiscal year settings did not change (e.g. user only added or edited stores), DO NOT CHANGE selectedFilter!
    if (!isFiscalChanged) {
      return;
    }

    // If fiscal year settings DID change, only change selectedFilter if the current filter is no longer valid
    const newPeriods = calculateFiscalPeriods(transactions, newFiscalSettings);
    const isCurrentPeriodStillValid = newPeriods.some(p => p.key === selectedFilter);
    const isSingleMonth = availableMonths.includes(selectedFilter);
    const isAll = selectedFilter === 'ALL';

    if (!isCurrentPeriodStillValid && !isSingleMonth && !isAll) {
      if (newPeriods.length > 0) {
        setSelectedFilter(newPeriods[0].key);
      } else {
        setSelectedFilter('ALL');
      }
    }
  };

  // Handler: Reset to Sample Demo Data
  const handleResetSampleData = () => {
    const data = resetToSampleData();
    setTransactions(data);
    const sampleChat = resetToSampleChat();
    setChatMessages(sampleChat);
    const periods = calculateFiscalPeriods(data, settings.fiscalSettings);
    setSelectedFilter(periods[0]?.key || 'ALL');
    uploadAllTransactionsToFirestore(data);
  };

  // Handler: Clear All
  const handleClearAll = () => {
    const data = clearAllData();
    setTransactions(data);
    setChatMessages(clearChatMessages());
    uploadAllTransactionsToFirestore([]);
  };

  // Handler: Restore from JSON (Transactions + Settings + Chat)
  const handleRestoreData = (
    restoredTransactions: Transaction[],
    restoredSettings?: AppSettings,
    restoredChatMessages?: ChatMessage[]
  ) => {
    setTransactions(restoredTransactions);
    saveTransactions(restoredTransactions);
    uploadAllTransactionsToFirestore(restoredTransactions);

    if (restoredSettings) {
      const mergedSettings: AppSettings = {
        ...settings,
        ...restoredSettings,
        stores: restoredSettings.stores && restoredSettings.stores.length > 0 ? restoredSettings.stores : settings.stores,
        fiscalSettings: {
          fiscalYearEndMonth: restoredSettings.fiscalSettings?.fiscalYearEndMonth ?? settings.fiscalSettings.fiscalYearEndMonth,
          fiscalYearStartYear: restoredSettings.fiscalSettings?.fiscalYearStartYear ?? settings.fiscalSettings.fiscalYearStartYear,
        },
      };
      setSettings(mergedSettings);
      saveSettings(mergedSettings);
      syncSaveSettingsToFirestore(mergedSettings);
    }
    if (restoredChatMessages && Array.isArray(restoredChatMessages)) {
      setChatMessages(restoredChatMessages);
      saveChatMessages(restoredChatMessages);
    }
  };

  // Handler: Force Push / Pull manual sync
  const handleForceUploadToCloud = async () => {
    setIsCloudSyncing(true);
    const success = await uploadAllTransactionsToFirestore(transactions);
    await syncSaveSettingsToFirestore(settings);
    setIsCloudSyncing(false);
    if (success) {
      alert(`クラウドへ取引データ（${transactions.length}件）を正常に同期・送信しました！他の端末をリロードまたは確認してください。`);
    } else {
      alert('クラウド同期に失敗しました。ネットワーク接続をご確認ください。');
    }
  };

  const handleForcePullFromCloud = async () => {
    setIsCloudSyncing(true);
    try {
      const result = await pullLatestFromFirestore();
      if (result.transactions.length > 0) {
        setTransactions(result.transactions);
        saveTransactions(result.transactions);
      }
      if (result.settings) {
        setSettings(result.settings);
        saveSettings(result.settings);
      }
      if (result.chatMessages.length > 0) {
        setChatMessages(result.chatMessages);
        saveChatMessages(result.chatMessages);
      }
      alert(`クラウドから最新データ（取引 ${result.transactions.length} 件）を受信・同期しました！`);
    } catch (e: any) {
      alert('クラウドからのデータ取得に失敗しました: ' + e.message);
    } finally {
      setIsCloudSyncing(false);
    }
  };

  // Lock Application handler
  const handleLockApp = () => {
    clearAuthSession();
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return (
      <LoginScreen 
        onUnlock={(user) => {
          setCurrentUser(user);
          setIsAuthenticated(true);
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/60 text-gray-800 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white relative">
      {/* Top Sticky Navbar */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onOpenAddSales={() => setIsAddSalesOpen(true)}
        onOpenAddExpense={() => setIsAddExpenseOpen(true)}
        onOpenBackup={() => setIsBackupOpen(true)}
        onOpenChat={() => setIsChatOpen(true)}
        onOpenPwaModal={() => setIsPwaModalOpen(true)}
        onLockApp={handleLockApp}
        currentUser={currentUser}
        unconfirmedCount={summary.unconfirmedCount}
        chatMessageCount={chatMessages.length}
        isCloudConnected={isCloudConnected}
        isCloudSyncing={isCloudSyncing}
        onManualCloudSync={handleForcePullFromCloud}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-6">
        {currentTab === 'dashboard' && (
          <Dashboard
            transactions={transactions}
            selectedFilter={selectedFilter}
            onSelectFilter={setSelectedFilter}
            fiscalPeriods={fiscalPeriods}
            availableMonths={availableMonths}
            onOpenAddSales={() => setIsAddSalesOpen(true)}
            onOpenAddExpense={() => setIsAddExpenseOpen(true)}
            onOpenFiscalSettings={() => setIsFiscalSettingsOpen(true)}
            onNavigateToTab={setCurrentTab}
            onEdit={setEditingTransaction}
            onDuplicate={handleDuplicateTransaction}
            onDelete={handleDeleteTransaction}
            onToggleConfirm={handleToggleConfirm}
            onQuoteInChat={handleQuoteInChat}
          />
        )}

        {currentTab === 'cards' && (
          <StoreSalesCardBoard
            transactions={transactions}
            settings={settings}
            fiscalPeriods={fiscalPeriods}
            selectedFilter={selectedFilter}
            onSelectFilter={setSelectedFilter}
            onOpenFiscalSettings={() => setIsFiscalSettingsOpen(true)}
            onSaveStoreCard={handleSaveStoreCard}
          />
        )}

        {currentTab === 'expenseCards' && (
          <ExpenseCardsView
            settings={settings}
            transactions={transactions}
            fiscalPeriods={fiscalPeriods}
            selectedFilter={selectedFilter}
            onSelectFilter={setSelectedFilter}
            onRegisterExpenseBatch={handleRegisterExpenseBatch}
            onSaveExpenseCards={handleSaveExpenseCards}
            onNavigateToSalary={() => setCurrentTab('salary')}
            onSyncSalaryToExpenseCards={(targetMonth) => {
              const emps = (settings.monthlySalarySnapshots && settings.monthlySalarySnapshots[targetMonth]) || settings.salaryEmployees || [];
              const salarySettings = settings.salarySettings || {
                payDay: 25,
                monthEndPayDay: 0,
                healthInsuranceRate: 0.05,
                careInsuranceRate: 0.008,
                pensionRate: 0.0915,
                empInsuranceEmployeeRate: 0.006,
                empInsuranceCompanyRate: 0.0095,
                childContributionRate: 0.0036,
              };
              const results = emps.map(e => calculateEmployeeSalary(e, salarySettings));
              const summary = calculateTotalSalarySummary(results);
              handleSyncSalaryToExpenseCards(summary, targetMonth);
            }}
            onRegisterSalaryToTransactions={(targetMonth) => {
              const emps = (settings.monthlySalarySnapshots && settings.monthlySalarySnapshots[targetMonth]) || settings.salaryEmployees || [];
              const salarySettings = settings.salarySettings || {
                payDay: 25,
                monthEndPayDay: 0,
                healthInsuranceRate: 0.05,
                careInsuranceRate: 0.008,
                pensionRate: 0.0915,
                empInsuranceEmployeeRate: 0.006,
                empInsuranceCompanyRate: 0.0095,
                childContributionRate: 0.0036,
              };
              const results = emps.map(e => calculateEmployeeSalary(e, salarySettings));
              const summary = calculateTotalSalarySummary(results);
              handleRegisterSalaryToTransactions(summary, targetMonth, results);
            }}
          />
        )}

        {currentTab === 'salary' && (
          <SalaryView
            settings={settings}
            transactions={transactions}
            fiscalPeriods={fiscalPeriods}
            selectedFilter={selectedFilter}
            onSelectFilter={setSelectedFilter}
            onSaveSalaryEmployees={handleSaveSalaryEmployees}
            onSaveSalarySettings={handleSaveSalarySettings}
            onRegisterSalaryToTransactions={handleRegisterSalaryToTransactions}
            onSyncToMonthEndExpenseCard={handleSyncSalaryToExpenseCards}
          />
        )}

        {currentTab === 'list' && (
          <TransactionList
            transactions={transactions}
            selectedFilter={selectedFilter}
            onSelectFilter={setSelectedFilter}
            fiscalPeriods={fiscalPeriods}
            availableMonths={availableMonths}
            onEdit={setEditingTransaction}
            onDuplicate={handleDuplicateTransaction}
            onDelete={handleDeleteTransaction}
            onToggleConfirm={handleToggleConfirm}
            onBulkConfirm={handleBulkConfirm}
            onOpenAddSales={() => setIsAddSalesOpen(true)}
            onOpenAddExpense={() => setIsAddExpenseOpen(true)}
            onOpenFiscalSettings={() => setIsFiscalSettingsOpen(true)}
            onExportCsv={() => exportTransactionsToCsv(transactions)}
            onQuoteInChat={handleQuoteInChat}
          />
        )}

        {currentTab === 'scratch' && (
          <ScratchFlowView
            transactions={transactions}
            selectedFilter={selectedFilter}
            onSelectFilter={setSelectedFilter}
            fiscalPeriods={fiscalPeriods}
            availableMonths={availableMonths}
            onEdit={setEditingTransaction}
            onDuplicate={handleDuplicateTransaction}
            onDelete={handleDeleteTransaction}
            onToggleConfirm={handleToggleConfirm}
            onOpenAddSales={() => setIsAddSalesOpen(true)}
            onOpenAddExpense={() => setIsAddExpenseOpen(true)}
            onOpenFiscalSettings={() => setIsFiscalSettingsOpen(true)}
            onQuoteInChat={handleQuoteInChat}
          />
        )}

        {currentTab === 'monthly' && (
          <MonthlyAggregationView
            transactions={transactions}
            selectedFilter={selectedFilter}
            onSelectFilter={setSelectedFilter}
            fiscalPeriods={fiscalPeriods}
            availableMonths={availableMonths}
            onOpenFiscalSettings={() => setIsFiscalSettingsOpen(true)}
            onNavigateToTab={setCurrentTab}
          />
        )}

        {currentTab === 'statement' && (
          <FinancialStatementView
            transactions={transactions}
            fiscalPeriods={fiscalPeriods}
            selectedFilter={selectedFilter}
            onSelectFilter={setSelectedFilter}
            onOpenAddExpense={() => setIsAddExpenseOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white/70 py-4 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-medium text-gray-600">scracc — scratch accounting</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsFiscalSettingsOpen(true)}
              className="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              決算期・決算月設定
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setIsBackupOpen(true)}
              className="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              バックアップ / JSON
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={handleResetSampleData}
              className="text-gray-500 hover:text-gray-800"
            >
              デモデータ読み込み
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AddSalesModal
        isOpen={isAddSalesOpen}
        onClose={() => setIsAddSalesOpen(false)}
        onAddTransactions={handleAddTransactions}
        settings={settings}
        onAddCategory={handleAddCategory}
        defaultMonth={activeInputMonth}
      />

      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        onAddTransactions={handleAddTransactions}
        settings={settings}
        onAddCategory={handleAddCategory}
        defaultMonth={activeInputMonth}
      />

      <TransactionEditModal
        isOpen={!!editingTransaction}
        onClose={() => setEditingTransaction(null)}
        transaction={editingTransaction}
        onSave={handleUpdateTransaction}
        settings={settings}
        onAddCategory={handleAddCategory}
      />

      <SettingsModal
        isOpen={isFiscalSettingsOpen}
        onClose={() => setIsFiscalSettingsOpen(false)}
        fiscalSettings={settings.fiscalSettings}
        stores={settings.stores}
        closedStores={settings.closedStores}
        onSaveSettings={handleSaveSettings}
        onOpenBackup={() => setIsBackupOpen(true)}
      />

      <DataBackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        transactions={transactions}
        settings={settings}
        chatMessages={chatMessages}
        onRestoreData={handleRestoreData}
        onResetSampleData={handleResetSampleData}
        onClearAll={handleClearAll}
        onLockApp={handleLockApp}
        onForceUploadToCloud={handleForceUploadToCloud}
        onForcePullFromCloud={handleForcePullFromCloud}
      />

      <PwaInstallPromptModal
        isOpen={isPwaModalOpen}
        onClose={() => setIsPwaModalOpen(false)}
      />

      <TeamChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={chatMessages}
        currentMember={currentMember}
        onSendMessage={handleSendMessage}
        onChangeMember={setCurrentMember}
        quotedTransaction={quotedTransaction}
        onClearQuote={() => setQuotedTransaction(null)}
      />
    </div>
  );
}
