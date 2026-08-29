import { Transaction, AppSettings, ChatMessage } from '../types';
import { getGranularityLabel, getSourceTypeLabel } from './calculations';

export interface FullBackupPayload {
  version: number;
  exported_at: string;
  transactions: Transaction[];
  settings?: AppSettings;
  chatMessages?: ChatMessage[];
}

export const exportTransactionsToCsv = (transactions: Transaction[], filenamePrefix = 'scratch_keiri'): void => {
  const headers = [
    'ID',
    '開始日',
    '終了日',
    '区分',
    'カテゴリ',
    '店舗・部門',
    '金額(円)',
    '決済方法',
    '入力粒度',
    '内容',
    'メモ',
    '確認状態',
    'データ元',
    '作成日時',
  ];

  const escapeCsv = (str: string | number | undefined | null): string => {
    if (str === undefined || str === null) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const typeLabels: Record<string, string> = {
    sales: '売上',
    expense: '経費',
    deposit: '入金',
    withdrawal: '出金',
    transfer: '振替',
    other: 'その他',
  };

  const rows = transactions.map(tx => [
    escapeCsv(tx.id),
    escapeCsv(tx.date_from),
    escapeCsv(tx.date_to),
    escapeCsv(typeLabels[tx.type] || tx.type),
    escapeCsv(tx.category),
    escapeCsv(tx.store || '全社共通'),
    escapeCsv(tx.amount),
    escapeCsv(tx.payment_method),
    escapeCsv(getGranularityLabel(tx.granularity)),
    escapeCsv(tx.description),
    escapeCsv(tx.memo || ''),
    escapeCsv(tx.confirmed ? '確認済' : '未確認'),
    escapeCsv(getSourceTypeLabel(tx.source_type)),
    escapeCsv(tx.created_at),
  ]);

  // Prepend UTF-8 BOM (\uFEFF) for Excel compatibility with Japanese text
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `${filenamePrefix}_${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportTransactionsToJson = (
  transactions: Transaction[],
  settings?: AppSettings,
  chatMessages?: ChatMessage[]
): void => {
  const payload: FullBackupPayload = {
    version: 2,
    exported_at: new Date().toISOString(),
    transactions,
    settings,
    chatMessages,
  };
  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `scratch_keiri_backup_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export interface ParsedBackupResult {
  transactions: Transaction[];
  settings?: AppSettings;
  chatMessages?: ChatMessage[];
}

export const parseJsonBackup = async (file: File): Promise<ParsedBackupResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);

        // Check if format is modern FullBackupPayload object
        if (data && typeof data === 'object' && !Array.isArray(data) && Array.isArray(data.transactions)) {
          const txList = data.transactions as Transaction[];
          const isValid = txList.every(item => item && typeof item === 'object' && 'id' in item && 'amount' in item);
          if (!isValid) {
            throw new Error('取引データに必要なプロパティ(id, amount等)が不足しています');
          }
          resolve({
            transactions: txList,
            settings: data.settings,
            chatMessages: data.chatMessages,
          });
          return;
        }

        // Format is legacy Transaction[] array
        if (Array.isArray(data)) {
          const isValid = data.every(item => item && typeof item === 'object' && 'id' in item && 'amount' in item);
          if (!isValid) {
            throw new Error('データ構造に必要なプロパティ(id, amount等)が不足しています');
          }
          resolve({
            transactions: data as Transaction[],
          });
          return;
        }

        throw new Error('JSONの形式が正しくありません（バックアップ形式または取引配列である必要があります）');
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
    reader.readAsText(file);
  });
};

