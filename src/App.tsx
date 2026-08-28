import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, AppSettings, ChatMessage, TeamMember, TransactionRef } from './types';
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
import { getAvailableMonths, calculateSummary } from './utils/calculations';
import { exportTransactionsToCsv } from './utils/csvExport';

import { Navbar, NavTab } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { TransactionList } from './components/TransactionList';
import { ScratchFlowView } from './components/ScratchFlowView';
import { MonthlyAggregationView } from './components/MonthlyAggregationView';
import { AddSalesModal } from './components/AddSalesModal';
import { AddExpenseModal } from './components/AddExpenseModal';
import { TransactionEditModal } from './components/TransactionEditModal';
import { DataBackupModal } from './components/DataBackupModal';
import { TeamChatDrawer } from './components/TeamChatDrawer';
import { PwaInstallPromptModal } from './components/PwaInstallPromptModal';
import { MessageSquareText } from 'lucide-react';

export default function App() {
  const currentYearMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadTransactions());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const loaded = loadTransactions();
    if (loaded.length > 0) {
      const months = getAvailableMonths(loaded);
      return months[0] || 'ALL';
    }
    return new Date().toISOString().slice(0, 7);
  });

  // Multi-user team chat states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => loadChatMessages());
  const [currentMember, setCurrentMember] = useState<TeamMember>(() => loadCurrentMember());
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [quotedTransaction, setQuotedTransaction] = useState<Transaction | null>(null);

  // Modal visibility states
  const [isAddSalesOpen, setIsAddSalesOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
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

  // Real-time synchronization subscription across browser tabs
  useEffect(() => {
    const unsubscribe = subscribeToChatUpdates((updatedMessages) => {
      setChatMessages(updatedMessages);
    });
    return unsubscribe;
  }, []);

  // Derived available months
  const availableMonths = useMemo(() => {
    const months = getAvailableMonths(transactions);
    if (!months.includes('2025-08')) {
      months.push('2025-08');
    }
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

    setTransactions(prev => [...created, ...prev]);
  };

  // Handler: Update Transaction
  const handleUpdateTransaction = (updated: Transaction) => {
    setTransactions(prev => prev.map(t => (t.id === updated.id ? updated : t)));

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
    setTransactions(prev => [duplicated, ...prev]);
  };

  // Handler: Delete Transaction
  const handleDeleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  // Handler: Toggle Confirmed Status
  const handleToggleConfirm = (id: string) => {
    setTransactions(prev =>
      prev.map(t => {
        if (t.id === id) {
          const nextConfirmed = !t.confirmed;
          const updated = { ...t, confirmed: nextConfirmed, updated_at: new Date().toISOString() };
          
          // Also update chat messages referencing this tx
          setChatMessages(chatPrev =>
            chatPrev.map(msg =>
              msg.transactionRef && msg.transactionRef.id === id
                ? { ...msg, transactionRef: createTransactionRef(updated) }
                : msg
            )
          );

          return updated;
        }
        return t;
      })
    );
  };

  // Handler: Bulk Confirm
  const handleBulkConfirm = (ids: string[]) => {
    const set = new Set(ids);
    setTransactions(prev =>
      prev.map(t => {
        if (set.has(t.id)) {
          const updated = { ...t, confirmed: true, updated_at: new Date().toISOString() };
          return updated;
        }
        return t;
      })
    );
  };

  // Handler: Add Category
  const handleAddCategory = (category: string, type: 'sales' | 'expense') => {
    if (type === 'sales') {
      if (!settings.salesCategories.includes(category)) {
        setSettings(prev => ({
          ...prev,
          salesCategories: [...prev.salesCategories, category],
        }));
      }
    } else {
      if (!settings.expenseCategories.includes(category)) {
        setSettings(prev => ({
          ...prev,
          expenseCategories: [...prev.expenseCategories, category],
        }));
      }
    }
  };

  // Handler: Reset to Sample Demo Data
  const handleResetSampleData = () => {
    const data = resetToSampleData();
    setTransactions(data);
    setChatMessages(resetToSampleChat());
    setSelectedMonth('2025-08');
  };

  // Handler: Clear All
  const handleClearAll = () => {
    const data = clearAllData();
    setTransactions(data);
    setChatMessages(clearChatMessages());
  };

  // Handler: Restore from JSON
  const handleRestoreTransactions = (restored: Transaction[]) => {
    setTransactions(restored);
  };

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
        unconfirmedCount={summary.unconfirmedCount}
        chatMessageCount={chatMessages.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-6">
        {currentTab === 'dashboard' && (
          <Dashboard
            transactions={transactions}
            selectedMonth={selectedMonth}
            onSelectMonth={setSelectedMonth}
            availableMonths={availableMonths}
            onOpenAddSales={() => setIsAddSalesOpen(true)}
            onOpenAddExpense={() => setIsAddExpenseOpen(true)}
            onOpenBackup={() => setIsBackupOpen(true)}
            onOpenChat={() => setIsChatOpen(true)}
            onNavigateToTab={setCurrentTab}
            onEdit={setEditingTransaction}
            onDuplicate={handleDuplicateTransaction}
            onDelete={handleDeleteTransaction}
            onToggleConfirm={handleToggleConfirm}
            onQuoteInChat={handleQuoteInChat}
          />
        )}

        {currentTab === 'list' && (
          <TransactionList
            transactions={transactions}
            selectedMonth={selectedMonth}
            onSelectMonth={setSelectedMonth}
            availableMonths={availableMonths}
            onEdit={setEditingTransaction}
            onDuplicate={handleDuplicateTransaction}
            onDelete={handleDeleteTransaction}
            onToggleConfirm={handleToggleConfirm}
            onBulkConfirm={handleBulkConfirm}
            onOpenAddSales={() => setIsAddSalesOpen(true)}
            onOpenAddExpense={() => setIsAddExpenseOpen(true)}
            onExportCsv={() => exportTransactionsToCsv(transactions)}
            onQuoteInChat={handleQuoteInChat}
          />
        )}

        {currentTab === 'scratch' && (
          <ScratchFlowView
            transactions={transactions}
            selectedMonth={selectedMonth}
            onSelectMonth={setSelectedMonth}
            availableMonths={availableMonths}
            onEdit={setEditingTransaction}
            onDuplicate={handleDuplicateTransaction}
            onDelete={handleDeleteTransaction}
            onToggleConfirm={handleToggleConfirm}
            onOpenAddSales={() => setIsAddSalesOpen(true)}
            onOpenAddExpense={() => setIsAddExpenseOpen(true)}
            onQuoteInChat={handleQuoteInChat}
          />
        )}

        {currentTab === 'monthly' && (
          <MonthlyAggregationView
            transactions={transactions}
            selectedMonth={selectedMonth}
            onSelectMonth={setSelectedMonth}
            onNavigateToTab={setCurrentTab}
          />
        )}
      </main>

      {/* Floating Chat Trigger Button (Bottom Right) */}
      <div className="fixed bottom-5 right-5 z-40">
        <button
          type="button"
          onClick={() => setIsChatOpen(true)}
          className="group flex items-center gap-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 border border-indigo-400/30"
          title="チームチャットを開く"
        >
          <div className="relative">
            <MessageSquareText className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 border-2 border-indigo-700 rounded-full" />
          </div>
          <span className="text-xs font-bold tracking-tight">チームチャット</span>
          {chatMessages.length > 0 && (
            <span className="bg-indigo-900/80 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full border border-indigo-400/30">
              {chatMessages.length}
            </span>
          )}
        </button>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white/70 py-4 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Scratch風経理 Ver.0.1 — 粒度自由な入力とブロック型お金の流れ可視化・チーム協調作業</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsBackupOpen(true)}
              className="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              CSV / JSONエクスポート
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={handleResetSampleData}
              className="text-gray-600 hover:text-gray-900"
            >
              デモデータ再読み込み
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
        defaultMonth={selectedMonth === 'ALL' ? '2025-08' : selectedMonth}
      />

      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        onAddTransactions={handleAddTransactions}
        settings={settings}
        onAddCategory={handleAddCategory}
        defaultMonth={selectedMonth === 'ALL' ? '2025-08' : selectedMonth}
      />

      <TransactionEditModal
        isOpen={!!editingTransaction}
        onClose={() => setEditingTransaction(null)}
        transaction={editingTransaction}
        onUpdate={handleUpdateTransaction}
        onDelete={handleDeleteTransaction}
        settings={settings}
        onQuoteInChat={handleQuoteInChat}
      />

      <DataBackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        transactions={transactions}
        onRestoreTransactions={handleRestoreTransactions}
        onResetSampleData={handleResetSampleData}
        onClearAll={handleClearAll}
      />

      {/* PWA Install Prompt Modal */}
      <PwaInstallPromptModal
        isOpen={isPwaModalOpen}
        onClose={() => setIsPwaModalOpen(false)}
      />

      {/* Real-time Team Chat Drawer */}
      <TeamChatDrawer
        isOpen={isChatOpen}
        onClose={() => {
          setIsChatOpen(false);
          setQuotedTransaction(null);
        }}
        messages={chatMessages}
        onSendMessage={handleSendMessage}
        currentMember={currentMember}
        onSelectMember={setCurrentMember}
        transactions={transactions}
        onOpenTransactionModal={(tx) => {
          setEditingTransaction(tx);
        }}
        onToggleConfirmTransaction={handleToggleConfirm}
        quotedTransaction={quotedTransaction}
        onClearQuotedTransaction={() => setQuotedTransaction(null)}
        onQuoteTransaction={(tx) => setQuotedTransaction(tx)}
      />
    </div>
  );
}

