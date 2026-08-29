import React from 'react';
import { Transaction } from '../types';
import { formatCurrency, getGranularityLabel, getSourceTypeLabel } from '../utils/calculations';
import { 
  ArrowDown, 
  CheckCircle2, 
  CircleAlert, 
  Copy, 
  Edit3, 
  Trash2, 
  Calendar, 
  Tag, 
  CreditCard,
  FileText,
  Paperclip,
  MessageSquareShare
} from 'lucide-react';

interface ScratchBlockCardProps {
  transaction: Transaction;
  onEdit?: (tx: Transaction) => void;
  onDuplicate?: (tx: Transaction) => void;
  onDelete?: (id: string) => void;
  onToggleConfirm?: (id: string) => void;
  onQuoteInChat?: (tx: Transaction) => void;
  compact?: boolean;
}

export const ScratchBlockCard: React.FC<ScratchBlockCardProps> = ({
  transaction,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleConfirm,
  onQuoteInChat,
  compact = false,
}) => {
  const isSales = transaction.type === 'sales';
  const isConfirmed = transaction.confirmed;

  const dateDisplay = transaction.date_from === transaction.date_to
    ? transaction.date_from
    : `${transaction.date_from} 〜 ${transaction.date_to}`;

  return (
    <div 
      id={`scratch-block-${transaction.id}`}
      className={`group relative rounded-xl border transition-all duration-200 shadow-sm hover:shadow-md ${
        isSales 
          ? 'bg-gradient-to-b from-emerald-50/50 to-white border-emerald-200/80 hover:border-emerald-300' 
          : 'bg-gradient-to-b from-amber-50/50 to-white border-amber-200/80 hover:border-amber-300'
      } ${compact ? 'p-3' : 'p-4'}`}
    >
      {/* Top Header / Meta bar */}
      <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-gray-100">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span 
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold tracking-wide ${
              isSales 
                ? 'bg-emerald-600 text-white' 
                : 'bg-amber-600 text-white'
            }`}
          >
            {isSales ? '売上' : '経費'}
          </span>

          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
            {getGranularityLabel(transaction.granularity)}
          </span>

          {transaction.store && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {transaction.store}
            </span>
          )}

          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
            <Calendar className="w-3.5 h-3.5" />
            <span className="font-mono">{dateDisplay}</span>
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onToggleConfirm?.(transaction.id)}
            title={isConfirmed ? '確認済み（クリックで未確認に変更）' : '未確認（クリックで確認済みに変更）'}
            className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full transition-colors ${
              isConfirmed
                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                : 'bg-rose-100 text-rose-700 hover:bg-rose-200 animate-pulse'
            }`}
          >
            {isConfirmed ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>確認済</span>
              </>
            ) : (
              <>
                <CircleAlert className="w-3.5 h-3.5 text-rose-600" />
                <span>未確認</span>
              </>
            )}
          </button>

          {onQuoteInChat && (
            <button
              type="button"
              onClick={() => onQuoteInChat(transaction)}
              className="p-1 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
              title="チャットで相談・共有"
            >
              <MessageSquareShare className="w-4 h-4" />
            </button>
          )}

          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(transaction)}
              className="p-1 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
              title="編集"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}

          {onDuplicate && (
            <button
              type="button"
              onClick={() => onDuplicate(transaction)}
              className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="複製"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(transaction.id)}
              className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
              title="削除"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Visual Scratch-Style Blocks Stack */}
      <div className="flex flex-col items-center gap-1.5 my-2">
        {/* Block 1: Event / Category & Amount */}
        <div 
          className={`w-full relative rounded-lg px-3.5 py-2.5 text-white font-medium shadow-sm transition-transform ${
            isSales 
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600' 
              : 'bg-gradient-to-r from-amber-600 to-orange-600'
          }`}
          style={{
            clipPath: 'polygon(0% 0%, 15% 0%, 20% 6px, 35% 6px, 40% 0%, 100% 0%, 100% 100%, 40% 100%, 35% calc(100% - 6px), 20% calc(100% - 6px), 15% 100%, 0% 100%)',
            paddingTop: '10px',
            paddingBottom: '10px'
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 opacity-90" />
              <span className="font-bold tracking-tight text-sm sm:text-base">
                {transaction.category}
              </span>
            </div>
            <div className="font-mono font-extrabold text-base sm:text-lg tracking-tight bg-black/15 px-2.5 py-0.5 rounded-full border border-white/20">
              {formatCurrency(transaction.amount)}
            </div>
          </div>
        </div>

        {/* Scratch Flow Connector Notch / Arrow */}
        <div className="flex items-center justify-center -my-1 z-10">
          <div className={`p-1 rounded-full text-white shadow-xs ${
            isSales ? 'bg-emerald-700/80' : 'bg-amber-700/80'
          }`}>
            <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
        </div>

        {/* Block 2: Settlement Method & Destination */}
        <div 
          className="w-full relative rounded-lg px-3.5 py-2 text-white font-medium shadow-sm bg-gradient-to-r from-indigo-600 to-blue-600"
          style={{
            clipPath: 'polygon(0% 0%, 15% 0%, 20% 6px, 35% 6px, 40% 0%, 100% 0%, 100% 100%, 0% 100%)',
            paddingTop: '10px',
            paddingBottom: '8px'
          }}
        >
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 opacity-90" />
              <span>決済方法 / 振替先:</span>
              <span className="font-bold bg-white/20 px-2 py-0.5 rounded">
                {transaction.payment_method || '未設定'}
              </span>
            </div>
            <div className="text-white/80 text-xs hidden sm:block">
              {getSourceTypeLabel(transaction.source_type)}
            </div>
          </div>
        </div>
      </div>

      {/* Description & Memo Footer */}
      {(transaction.description || transaction.memo || (transaction.attachments && transaction.attachments.length > 0)) && (
        <div className="mt-2.5 pt-2 border-t border-gray-100/80 text-xs text-gray-600 flex flex-col gap-1">
          {transaction.description && (
            <div className="flex items-start gap-1.5 font-medium text-gray-800">
              <FileText className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
              <span>{transaction.description}</span>
            </div>
          )}
          {transaction.memo && (
            <div className="text-gray-500 pl-5 text-[11px] italic">
              メモ: {transaction.memo}
            </div>
          )}
          {transaction.attachments && transaction.attachments.length > 0 && (
            <div className="flex items-center gap-1 text-indigo-600 pl-5 text-[11px]">
              <Paperclip className="w-3 h-3" />
              <span>添付資料 {transaction.attachments.length}件</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
