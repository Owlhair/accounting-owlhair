import React, { useState, useEffect } from 'react';
import { Transaction, AppSettings, Granularity, SourceType, TransactionType } from '../types';
import { X, Check, Trash2, Paperclip, AlertCircle, MessageSquareShare } from 'lucide-react';

interface TransactionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onUpdate: (updated: Transaction) => void;
  onDelete: (id: string) => void;
  settings: AppSettings;
  onQuoteInChat?: (tx: Transaction) => void;
}

export const TransactionEditModal: React.FC<TransactionEditModalProps> = ({
  isOpen,
  onClose,
  transaction,
  onUpdate,
  onDelete,
  settings,
  onQuoteInChat,
}) => {
  const [formData, setFormData] = useState<Partial<Transaction>>({});
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (transaction) {
      setFormData({ ...transaction });
      setErrorMessage('');
    }
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const isSales = formData.type === 'sales';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const amt = Number(formData.amount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMessage('有効な金額（1円以上）を入力してください。');
      return;
    }
    if (!formData.date_from || !formData.date_to) {
      setErrorMessage('日付を正しく入力してください。');
      return;
    }
    if (!formData.category) {
      setErrorMessage('カテゴリを選択または入力してください。');
      return;
    }

    onUpdate({
      ...(formData as Transaction),
      amount: amt,
      updated_at: new Date().toISOString(),
    });
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const newAttachment = {
      id: `att-${Date.now()}`,
      file_name: file.name,
      file_type: file.type,
      source_type: (formData.source_type || 'receipt') as SourceType,
      created_at: new Date().toISOString(),
    };
    setFormData({
      ...formData,
      attachments: [...(formData.attachments || []), newAttachment],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-xl w-full my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className={`p-4 sm:p-5 text-white flex items-center justify-between ${
          isSales 
            ? 'bg-gradient-to-r from-emerald-600 to-teal-700' 
            : 'bg-gradient-to-r from-amber-600 to-orange-700'
        }`}>
          <div>
            <h2 className="text-lg font-bold tracking-tight">取引データの編集</h2>
            <p className="text-xs opacity-90">ID: {transaction.id}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Type Selector */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'sales' as TransactionType })}
              className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                formData.type === 'sales'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              売上
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'expense' as TransactionType })}
              className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                formData.type === 'expense'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              経費
            </button>
          </div>

          {/* Dates & Granularity */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">開始日</label>
              <input
                type="date"
                value={formData.date_from || ''}
                onChange={(e) => setFormData({ ...formData, date_from: e.target.value })}
                className="w-full text-xs p-2 border rounded bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">終了日</label>
              <input
                type="date"
                value={formData.date_to || ''}
                onChange={(e) => setFormData({ ...formData, date_to: e.target.value })}
                className="w-full text-xs p-2 border rounded bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">入力粒度</label>
              <select
                value={formData.granularity || 'monthly'}
                onChange={(e) => setFormData({ ...formData, granularity: e.target.value as Granularity })}
                className="w-full text-xs p-2 border rounded bg-white"
              >
                <option value="monthly">月次集計 (monthly)</option>
                <option value="daily">日別集計 (daily)</option>
                <option value="period">期間集計 (period)</option>
                <option value="transaction">個別明細 (transaction)</option>
              </select>
            </div>
          </div>

          {/* Category & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {isSales ? '売上種類' : '経費科目'}
              </label>
              <input
                type="text"
                list="category-suggestions"
                value={formData.category || ''}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full text-sm p-2 border rounded-lg bg-white"
                placeholder="カテゴリ名を入力または選択"
                required
              />
              <datalist id="category-suggestions">
                {(isSales ? settings.salesCategories : settings.expenseCategories).map(c => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">金額 (円)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">¥</span>
                <input
                  type="number"
                  min="0"
                  value={formData.amount !== undefined ? formData.amount : ''}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className="w-full pl-7 pr-3 py-2 text-sm font-mono font-bold border rounded-lg bg-white text-right"
                  required
                />
              </div>
            </div>
          </div>

          {/* Payment Method, Store & Source Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">店舗・部門</label>
              <select
                value={formData.store || '本店'}
                onChange={(e) => setFormData({ ...formData, store: e.target.value })}
                className="w-full text-xs sm:text-sm p-2 border rounded-lg bg-white"
              >
                {settings.stores.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">決済方法</label>
              <select
                value={formData.payment_method || '現金'}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full text-xs sm:text-sm p-2 border rounded-lg bg-white"
              >
                {settings.paymentMethods.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">データ元 (source_type)</label>
              <select
                value={formData.source_type || 'manual'}
                onChange={(e) => setFormData({ ...formData, source_type: e.target.value as SourceType })}
                className="w-full text-xs sm:text-sm p-2 border rounded-lg bg-white"
              >
                <option value="manual">手入力 (manual)</option>
                <option value="receipt">領収書/レシート (receipt)</option>
                <option value="bank">通帳/銀行 (bank)</option>
                <option value="card">カード明細 (card)</option>
                <option value="ocr">OCR (ocr)</option>
                <option value="ai">AI推論 (ai)</option>
                <option value="csv">CSV (csv)</option>
              </select>
            </div>
          </div>

          {/* Description & Memo */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">内容 / 摘要</label>
            <input
              type="text"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full text-xs sm:text-sm p-2 border rounded-lg bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">メモ</label>
            <textarea
              rows={2}
              value={formData.memo || ''}
              onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
              className="w-full text-xs sm:text-sm p-2 border rounded-lg bg-white"
            />
          </div>

          {/* Attachment upload */}
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5" />
                証拠資料・領収書の添付
              </label>
              <label className="cursor-pointer text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                ＋ ファイルを選択
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {formData.attachments && formData.attachments.length > 0 ? (
              <div className="space-y-1.5">
                {formData.attachments.map((att, idx) => (
                  <div key={att.id || idx} className="flex items-center justify-between text-xs bg-white p-2 rounded border border-gray-200">
                    <span className="font-mono truncate">{att.file_name}</span>
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        attachments: formData.attachments?.filter((_, i) => i !== idx)
                      })}
                      className="text-rose-500 hover:text-rose-700 p-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-gray-400">添付ファイルはありません</div>
            )}
          </div>

          {/* Confirmation checkbox */}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
              <input
                type="checkbox"
                checked={formData.confirmed || false}
                onChange={(e) => setFormData({ ...formData, confirmed: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
              />
              <span>確認済み (confirmed)</span>
            </label>

            <button
              type="button"
              onClick={() => {
                if (confirm('この取引データを削除しますか？')) {
                  onDelete(transaction.id);
                  onClose();
                }
              }}
              className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              削除
            </button>
          </div>

          {/* Footer Save / Cancel */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-100">
            {onQuoteInChat && (
              <button
                type="button"
                onClick={() => {
                  onQuoteInChat(transaction);
                  onClose();
                }}
                className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors flex items-center gap-1.5 border border-indigo-200"
              >
                <MessageSquareShare className="w-3.5 h-3.5" />
                チャットで相談する
              </button>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className={`px-5 py-2 text-xs sm:text-sm font-bold text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 ${
                  isSales ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                <Check className="w-4 h-4" />
                変更を保存
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
