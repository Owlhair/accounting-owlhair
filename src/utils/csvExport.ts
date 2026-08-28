import { Transaction } from '../types';
import { getGranularityLabel, getSourceTypeLabel } from './calculations';

export const exportTransactionsToCsv = (transactions: Transaction[], filenamePrefix = 'scratch_keiri'): void => {
  const headers = [
    'ID',
    '開始日',
    '終了日',
    '区分',
    'カテゴリ',
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

export const exportTransactionsToJson = (transactions: Transaction[]): void => {
  const jsonStr = JSON.stringify(transactions, null, 2);
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

export const parseJsonBackup = async (file: File): Promise<Transaction[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);
        if (!Array.isArray(data)) {
          throw new Error('JSONの形式が正しくありません（配列形式である必要があります）');
        }
        // Basic validation
        const isValid = data.every(item => item && typeof item === 'object' && 'id' in item && 'amount' in item);
        if (!isValid) {
          throw new Error('データ構造に必要なプロパティ(id, amount等)が不足しています');
        }
        resolve(data as Transaction[]);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
    reader.readAsText(file);
  });
};
