import { TeamMember, ChatMessage, Transaction } from '../types';

const STORAGE_KEY_CHAT_MESSAGES = 'scratch_keiri_chat_messages_v1';
const STORAGE_KEY_CURRENT_MEMBER = 'scratch_keiri_current_member_v1';

export const DEFAULT_TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'user-keiri-sato',
    name: '佐藤 (経理)',
    role: '経理担当',
    avatarColor: 'bg-indigo-600',
  },
  {
    id: 'user-ceo-tanaka',
    name: '田中 (代表)',
    role: '代表取締役',
    avatarColor: 'bg-emerald-600',
  },
  {
    id: 'user-tax-yamada',
    name: '山田 (税理士)',
    role: '顧問税理士',
    avatarColor: 'bg-amber-600',
  },
  {
    id: 'user-sales-suzuki',
    name: '鈴木 (営業)',
    role: '営業・現場',
    avatarColor: 'bg-violet-600',
  },
];

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    sender: DEFAULT_TEAM_MEMBERS[0], // 佐藤 (経理)
    text: 'お疲れ様です！2025年8月分の月次売上（技術売上85万＋商品売上120万＋その他3万＝100万円）と、概算経費の入力をまとめました。',
    timestamp: '2025-08-31T19:30:00.000Z',
  },
  {
    id: 'msg-2',
    sender: DEFAULT_TEAM_MEMBERS[1], // 田中 (代表)
    text: '佐藤さんありがとうございます！8月の売上100万達成確認しました。差引利益も80万円以上残せていて順調ですね。',
    timestamp: '2025-08-31T19:35:00.000Z',
  },
  {
    id: 'msg-3',
    sender: DEFAULT_TEAM_MEMBERS[0], // 佐藤 (経理)
    text: '山田先生、8/15のホームセンターのレシート（12,800円）ですが、「消耗品費」の扱いで問題ないかご確認いただけますでしょうか？',
    timestamp: '2025-08-31T19:40:00.000Z',
    transactionRef: {
      id: 'tx-20250815-receipt-hc',
      description: 'ホームセンター 備品購入',
      amount: 12800,
      type: 'expense',
      category: '消耗品費',
      confirmed: false,
      date_from: '2025-08-15',
    },
  },
  {
    id: 'msg-4',
    sender: DEFAULT_TEAM_MEMBERS[2], // 山田 (税理士)
    text: '山田です。拝見しました！事務棚や文具類の購入ですので「消耗品費」で問題ありません。確認済みに更新しておきますね。',
    timestamp: '2025-08-31T19:45:00.000Z',
  },
];

// BroadcastChannel for instant real-time multi-tab synchronization
let chatBroadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    chatBroadcastChannel = new BroadcastChannel('scratch_keiri_realtime_chat');
  }
} catch (e) {
  console.warn('BroadcastChannel not supported in this environment', e);
}

export const loadChatMessages = (): ChatMessage[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CHAT_MESSAGES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_CHAT_MESSAGES, JSON.stringify([]));
      return [];
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load chat messages:', err);
    return [];
  }
};

export const resetToSampleChat = (): ChatMessage[] => {
  localStorage.setItem(STORAGE_KEY_CHAT_MESSAGES, JSON.stringify(INITIAL_CHAT_MESSAGES));
  if (chatBroadcastChannel) {
    chatBroadcastChannel.postMessage({ type: 'CHAT_MESSAGES_UPDATED', messages: INITIAL_CHAT_MESSAGES });
  }
  return INITIAL_CHAT_MESSAGES;
};

export const clearChatMessages = (): ChatMessage[] => {
  localStorage.setItem(STORAGE_KEY_CHAT_MESSAGES, JSON.stringify([]));
  if (chatBroadcastChannel) {
    chatBroadcastChannel.postMessage({ type: 'CHAT_MESSAGES_UPDATED', messages: [] });
  }
  return [];
};

export const saveChatMessages = (messages: ChatMessage[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY_CHAT_MESSAGES, JSON.stringify(messages));
    // Broadcast to other tabs
    if (chatBroadcastChannel) {
      chatBroadcastChannel.postMessage({ type: 'CHAT_MESSAGES_UPDATED', messages });
    }
  } catch (err) {
    console.error('Failed to save chat messages:', err);
  }
};

export const loadCurrentMember = (): TeamMember => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CURRENT_MEMBER);
    if (!raw) {
      return DEFAULT_TEAM_MEMBERS[0];
    }
    return JSON.parse(raw);
  } catch (err) {
    return DEFAULT_TEAM_MEMBERS[0];
  }
};

export const saveCurrentMember = (member: TeamMember): void => {
  try {
    localStorage.setItem(STORAGE_KEY_CURRENT_MEMBER, JSON.stringify(member));
  } catch (err) {
    console.error('Failed to save current member:', err);
  }
};

export const subscribeToChatUpdates = (callback: (messages: ChatMessage[]) => void): () => void => {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY_CHAT_MESSAGES && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue);
        callback(parsed);
      } catch (e) {
        // ignore
      }
    }
  };

  const handleBroadcast = (event: MessageEvent) => {
    if (event.data && event.data.type === 'CHAT_MESSAGES_UPDATED' && Array.isArray(event.data.messages)) {
      callback(event.data.messages);
    }
  };

  window.addEventListener('storage', handleStorage);
  if (chatBroadcastChannel) {
    chatBroadcastChannel.addEventListener('message', handleBroadcast);
  }

  return () => {
    window.removeEventListener('storage', handleStorage);
    if (chatBroadcastChannel) {
      chatBroadcastChannel.removeEventListener('message', handleBroadcast);
    }
  };
};

export const createTransactionRef = (tx: Transaction) => {
  return {
    id: tx.id,
    description: tx.description || tx.category,
    amount: tx.amount,
    type: tx.type,
    category: tx.category,
    confirmed: tx.confirmed,
    date_from: tx.date_from,
  };
};
