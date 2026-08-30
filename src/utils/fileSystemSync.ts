// File System Access API & IndexedDB auto-sync manager
// Allows saving and opening a real local ledger file (e.g. `scratch_keiri_ledger.json`)
// that auto-syncs with the app just like a local Excel file!

import { AppSettings, ChatMessage, Transaction } from '../types';

export interface LedgerFileState {
  fileName: string | null;
  lastSavedAt: string | null;
  isAutoSaveEnabled: boolean;
  fileHandleAvailable: boolean;
  status: 'idle' | 'saving' | 'saved' | 'error';
}

const DB_NAME = 'scratch_keiri_fs_db';
const DB_VERSION = 1;
const STORE_NAME = 'file_handles';
const HANDLE_KEY = 'current_ledger_handle';

// IndexedDB helper for storing FileSystemFileHandle
const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB is not supported in this environment'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getSavedFileHandle = async (): Promise<FileSystemFileHandle | null> => {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(HANDLE_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
};

export const setSavedFileHandle = async (handle: FileSystemFileHandle | null): Promise<void> => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      if (handle) {
        store.put(handle, HANDLE_KEY);
      } else {
        store.delete(HANDLE_KEY);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error('Failed to save file handle to IndexedDB', e);
  }
};

export interface LedgerBackupPayload {
  app_name: string;
  version: number;
  updated_at: string;
  transactions: Transaction[];
  settings?: AppSettings;
  chatMessages?: ChatMessage[];
}

let activeFileHandle: FileSystemFileHandle | null = null;

export const isFileSystemAccessSupported = (): boolean => {
  return typeof window !== 'undefined' && 'showSaveFilePicker' in window && 'showOpenFilePicker' in window;
};

// Request user to choose a new ledger file on their local PC / disk
export const createOrLinkLocalFile = async (
  transactions: Transaction[],
  settings?: AppSettings,
  chatMessages?: ChatMessage[]
): Promise<{ fileName: string }> => {
  if (!isFileSystemAccessSupported()) {
    throw new Error('お使いのブラウザはローカルファイル直接連携（File System Access API）に対応していません。Google Chrome / Edge 等の最新ブラウザをご利用いただくか、通常のJSONダウンロードをご利用ください。');
  }

  // @ts-ignore
  const handle = await window.showSaveFilePicker({
    suggestedName: `scratch_keiri_data_${new Date().toISOString().slice(0, 10)}.json`,
    types: [
      {
        description: '経理データファイル (*.json)',
        accept: { 'application/json': ['.json'] },
      },
    ],
  });

  activeFileHandle = handle;
  await setSavedFileHandle(handle);

  // Initial save to file
  await writeToActiveHandle(transactions, settings, chatMessages);

  return { fileName: handle.name };
};

// Open an existing ledger file from disk
export const openExistingLocalFile = async (): Promise<{
  fileName: string;
  transactions: Transaction[];
  settings?: AppSettings;
  chatMessages?: ChatMessage[];
}> => {
  if (!isFileSystemAccessSupported()) {
    throw new Error('お使いのブラウザはローカルファイル直接連携に対応していません。');
  }

  // @ts-ignore
  const [handle] = await window.showOpenFilePicker({
    types: [
      {
        description: '経理データファイル (*.json)',
        accept: { 'application/json': ['.json'] },
      },
    ],
    multiple: false,
  });

  if (!handle) {
    throw new Error('ファイルが選択されませんでした');
  }

  const file = await handle.getFile();
  const text = await file.text();
  const data = JSON.parse(text);

  let transactions: Transaction[] = [];
  let settings: AppSettings | undefined = undefined;
  let chatMessages: ChatMessage[] | undefined = undefined;

  if (data && typeof data === 'object' && !Array.isArray(data) && Array.isArray(data.transactions)) {
    transactions = data.transactions;
    settings = data.settings;
    chatMessages = data.chatMessages;
  } else if (Array.isArray(data)) {
    transactions = data;
  } else {
    throw new Error('選択されたファイルは有効な経理データ形式ではありません');
  }

  activeFileHandle = handle;
  await setSavedFileHandle(handle);

  return {
    fileName: handle.name,
    transactions,
    settings,
    chatMessages,
  };
};

// Disconnect active file link
export const disconnectLocalFile = async (): Promise<void> => {
  activeFileHandle = null;
  await setSavedFileHandle(null);
};

// Get current active file name
export const getActiveFileName = (): string | null => {
  return activeFileHandle ? activeFileHandle.name : null;
};

// Auto write to the active file handle if permission is granted
export const writeToActiveHandle = async (
  transactions: Transaction[],
  settings?: AppSettings,
  chatMessages?: ChatMessage[]
): Promise<boolean> => {
  if (!activeFileHandle) {
    const saved = await getSavedFileHandle();
    if (saved) {
      activeFileHandle = saved;
    }
  }

  if (!activeFileHandle) {
    return false;
  }

  try {
    // Check or query permission
    // @ts-ignore
    const permission = await activeFileHandle.queryPermission({ mode: 'readwrite' });
    if (permission !== 'granted') {
      // Cannot silently prompt in background, must wait for user gesture if needed
      return false;
    }

    const payload: LedgerBackupPayload = {
      app_name: 'scracc (Scratch Accounting)',
      version: 2,
      updated_at: new Date().toISOString(),
      transactions,
      settings,
      chatMessages,
    };

    // @ts-ignore
    const writable = await activeFileHandle.createWritable();
    await writable.write(JSON.stringify(payload, null, 2));
    await writable.close();
    return true;
  } catch (err) {
    console.warn('Auto file save warning:', err);
    return false;
  }
};
