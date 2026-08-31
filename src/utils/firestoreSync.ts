import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db, testFirestoreConnection } from '../lib/firebase';
import { Transaction, AppSettings, ChatMessage } from '../types';
import { loadTransactions, saveTransactions, loadSettings, saveSettings } from './storage';
import { loadChatMessages, saveChatMessages } from './chatStorage';

// Firestore collection names
const TRANSACTIONS_COL = 'transactions';
const SETTINGS_COL = 'app_settings';
const CHAT_COL = 'chat_messages';

let isListening = false;

export interface FirestoreSyncCallback {
  onTransactionsUpdate?: (transactions: Transaction[]) => void;
  onSettingsUpdate?: (settings: AppSettings) => void;
  onChatUpdate?: (messages: ChatMessage[]) => void;
  onStatusChange?: (status: { isConnected: boolean; isSyncing: boolean }) => void;
}

/**
 * Initialize Firestore Realtime Listeners
 * Whenever any device updates transactions, settings, or chat, all connected devices update instantly!
 */
export function initFirestoreRealtimeSync(callbacks: FirestoreSyncCallback) {
  if (isListening) return;
  isListening = true;

  callbacks.onStatusChange?.({ isConnected: true, isSyncing: true });

  // 1. Transactions realtime listener
  const txColRef = collection(db, TRANSACTIONS_COL);
  const unsubTx = onSnapshot(
    txColRef,
    (snapshot) => {
      if (!snapshot.empty) {
        const cloudTxList: Transaction[] = [];
        snapshot.forEach((docSnap) => {
          cloudTxList.push(docSnap.data() as Transaction);
        });
        
        // Sort by date descending
        cloudTxList.sort((a, b) => (b.date_from || '').localeCompare(a.date_from || ''));
        
        // Update local cache
        saveTransactions(cloudTxList);
        callbacks.onTransactionsUpdate?.(cloudTxList);
      } else {
        // If Firestore is empty but local has initial data, seed to Firestore
        const localTx = loadTransactions();
        if (localTx.length > 0) {
          uploadLocalTransactionsToFirestore(localTx);
        }
      }
      callbacks.onStatusChange?.({ isConnected: true, isSyncing: false });
    },
    (error) => {
      console.warn('Firestore transactions listener error:', error);
      callbacks.onStatusChange?.({ isConnected: false, isSyncing: false });
    }
  );

  // 2. Settings realtime listener
  const settingsDocRef = doc(db, SETTINGS_COL, 'global_config');
  const unsubSettings = onSnapshot(
    settingsDocRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const cloudSettings = docSnap.data() as AppSettings;
        saveSettings(cloudSettings);
        callbacks.onSettingsUpdate?.(cloudSettings);
      } else {
        const localSettings = loadSettings();
        setDoc(settingsDocRef, localSettings).catch(console.error);
      }
    },
    (error) => {
      console.warn('Firestore settings listener error:', error);
    }
  );

  // 3. Chat messages realtime listener
  const chatColRef = collection(db, CHAT_COL);
  const unsubChat = onSnapshot(
    chatColRef,
    (snapshot) => {
      if (!snapshot.empty) {
        const cloudChat: ChatMessage[] = [];
        snapshot.forEach((docSnap) => {
          cloudChat.push(docSnap.data() as ChatMessage);
        });
        cloudChat.sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
        saveChatMessages(cloudChat);
        callbacks.onChatUpdate?.(cloudChat);
      } else {
        const localChat = loadChatMessages();
        if (localChat.length > 0) {
          localChat.forEach((msg) => {
            setDoc(doc(db, CHAT_COL, msg.id), msg).catch(console.error);
          });
        }
      }
    },
    (error) => {
      console.warn('Firestore chat listener error:', error);
    }
  );

  // Test connection on boot
  testFirestoreConnection();

  return () => {
    unsubTx();
    unsubSettings();
    unsubChat();
    isListening = false;
  };
}

/**
 * Save / Update a transaction to Firestore
 */
export async function syncSaveTransactionToFirestore(transaction: Transaction) {
  try {
    const docRef = doc(db, TRANSACTIONS_COL, transaction.id);
    await setDoc(docRef, transaction, { merge: true });
    return true;
  } catch (err) {
    console.error('Error saving transaction to Firestore:', err);
    return false;
  }
}

/**
 * Delete a transaction from Firestore
 */
export async function syncDeleteTransactionFromFirestore(transactionId: string) {
  try {
    const docRef = doc(db, TRANSACTIONS_COL, transactionId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error('Error deleting transaction from Firestore:', err);
    return false;
  }
}

/**
 * Save updated Settings to Firestore
 */
export async function syncSaveSettingsToFirestore(settings: AppSettings) {
  try {
    const docRef = doc(db, SETTINGS_COL, 'global_config');
    await setDoc(docRef, settings, { merge: true });
    return true;
  } catch (err) {
    console.error('Error saving settings to Firestore:', err);
    return false;
  }
}

/**
 * Add Chat Message to Firestore
 */
export async function syncAddChatMessageToFirestore(message: ChatMessage) {
  try {
    const docRef = doc(db, CHAT_COL, message.id);
    await setDoc(docRef, message);
    return true;
  } catch (err) {
    console.error('Error adding chat message to Firestore:', err);
    return false;
  }
}

/**
 * Batch upload local transactions to Firestore
 */
export async function uploadLocalTransactionsToFirestore(transactions: Transaction[]) {
  try {
    const batch = writeBatch(db);
    transactions.forEach((tx) => {
      const docRef = doc(db, TRANSACTIONS_COL, tx.id);
      batch.set(docRef, tx, { merge: true });
    });
    await batch.commit();
    return true;
  } catch (err) {
    console.error('Batch upload error:', err);
    return false;
  }
}
