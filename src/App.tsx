import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, AppSettings, ChatMessage, TeamMember, TransactionRef, FiscalSettings, ExpenseCard } from './types';
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
      if (saved && ['dashboard', 'cards', 'list', 'scratch', 'monthly', 'statement'].includes(saved)) {
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
