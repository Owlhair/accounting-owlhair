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
  onStatusChange?: (status: { isConnected: boolean; isSyncing: boolean; message?: string }) => void;
}

/**
 * Initialize Firestore Realtime Listeners
 * Whenever any device updates transactions, settings, or chat, all connected devices update instantly!
 */
export function initFirestoreRealtimeSync(callbacks: FirestoreSyncCallback) {
  callbacks.onStatusChange?.({ isConnected: true, isSyncing: true, message: 'クラウド接続中...' });

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
        
        // Update local cache & state
        saveTransactions(cloudTxList);
        callbacks.onTransactionsUpdate?.(cloudTxList);
        callbacks.onStatusChange?.({ isConnected: true, isSyncing: false, message: `クラウド同期中 (${cloudTxList.length}件)` });
      } else {
        // If Firestore is empty on the cloud, seed current local transactions
        const localTx = loadTransactions();
        if (localTx.length > 0) {
          uploadAllTransactionsToFirestore(localTx);
        }
        callbacks.onStatusChange?.({ isConnected: true, isSyncing: false, message: 'クラウド同期済' });
      }
    },
    (error) => {
      console.warn('Firestore transactions listener error:', error);
      callbacks.onStatusChange?.({ isConnected: false, isSyncing: false, message: 'クラウド接続エラー' });
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

  testFirestoreConnection();

  return () => {
    unsubTx();
    unsubSettings();
    unsubChat();
  };
}

/**
 * Save / Update a single transaction to Firestore
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
 * Delete a single transaction from Firestore
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
 * Upload all transactions to Firestore (Overwrites collection)
 */
export async function uploadAllTransactionsToFirestore(transactions: Transaction[]) {
  try {
    // 1. Fetch current docs in collection to delete obsolete ones
    const snap = await getDocs(collection(db, TRANSACTIONS_COL));
    const currentCloudIds = new Set(snap.docs.map(d => d.id));
    const newIds = new Set(transactions.map(t => t.id));

    // Batch operations (max 500 per batch in firestore)
    const batch = writeBatch(db);
    let opCount = 0;

    // Delete obsolete
    snap.docs.forEach((docSnap) => {
      if (!newIds.has(docSnap.id)) {
        batch.delete(docSnap.ref);
        opCount++;
      }
    });

    // Write / update
    transactions.forEach((tx) => {
      const docRef = doc(db, TRANSACTIONS_COL, tx.id);
      batch.set(docRef, tx, { merge: true });
      opCount++;
    });

    if (opCount > 0) {
      await batch.commit();
    }
    return true;
  } catch (err) {
    console.error('Error uploading transactions to Firestore:', err);
    return false;
  }
}

/**
 * Pull all data fresh from Firestore
 */
export async function pullLatestFromFirestore(): Promise<{
  transactions: Transaction[];
  settings?: AppSettings;
  chatMessages: ChatMessage[];
}> {
  const [txSnap, settingsSnap, chatSnap] = await Promise.all([
    getDocs(collection(db, TRANSACTIONS_COL)),
    getDocs(collection(db, SETTINGS_COL)),
    getDocs(collection(db, CHAT_COL)),
  ]);

  const transactions: Transaction[] = [];
  txSnap.forEach(d => transactions.push(d.data() as Transaction));
  transactions.sort((a, b) => (b.date_from || '').localeCompare(a.date_from || ''));

  let settings: AppSettings | undefined = undefined;
  settingsSnap.forEach(d => {
    if (d.id === 'global_config') {
      settings = d.data() as AppSettings;
    }
  });

  const chatMessages: ChatMessage[] = [];
  chatSnap.forEach(d => chatMessages.push(d.data() as ChatMessage));
  chatMessages.sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));

  return { transactions, settings, chatMessages };
}
