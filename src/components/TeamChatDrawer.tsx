import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, TeamMember, Transaction } from '../types';
import { DEFAULT_TEAM_MEMBERS, createTransactionRef } from '../utils/chatStorage';
import { formatCurrency } from '../utils/calculations';
import { 
  X, 
  Send, 
  Paperclip, 
  Users, 
  CheckCircle2, 
  CircleAlert, 
  MessageSquare, 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Sparkles,
  ExternalLink,
  ChevronDown,
  UserCheck
} from 'lucide-react';

interface TeamChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string, transactionRef?: ReturnType<typeof createTransactionRef>) => void;
  currentMember: TeamMember;
  onSelectMember: (member: TeamMember) => void;
  transactions: Transaction[];
  onOpenTransactionModal: (tx: Transaction) => void;
  onToggleConfirmTransaction: (id: string) => void;
  quotedTransaction: Transaction | null;
  onClearQuotedTransaction: () => void;
  onQuoteTransaction: (tx: Transaction) => void;
}

export const TeamChatDrawer: React.FC<TeamChatDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  currentMember,
  onSelectMember,
  transactions,
  onOpenTransactionModal,
  onToggleConfirmTransaction,
  quotedTransaction,
  onClearQuotedTransaction,
  onQuoteTransaction,
}) => {
  const [inputText, setInputText] = useState('');
  const [isPickingTx, setIsPickingTx] = useState(false);
  const [txSearchQuery, setTxSearchQuery] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus textarea when opened or quoted
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen, quotedTransaction]);

  if (!isOpen) return null;

  const handleSend = () => {
    if (!inputText.trim() && !quotedTransaction) return;

    const txRef = quotedTransaction ? createTransactionRef(quotedTransaction) : undefined;
    onSendMessage(inputText.trim(), txRef);
    setInputText('');
    onClearQuotedTransaction();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickTemplates = [
    'この領収書の勘定科目は何になりますか？',
    '8月分の月次売上まとめを登録しました。ご確認願います！',
    '未確認のレシートについて添付写真の再送をお願いします。',
    '内容を確認し、問題ありませんでした！確認済みに変更します。',
  ];

  // Filter transactions for quote picker
  const filteredTxForPicker = transactions.filter(t => {
    if (!txSearchQuery) return true;
    const q = txSearchQuery.toLowerCase();
    return (
      t.description.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.amount.toString().includes(q) ||
      (t.date_from && t.date_from.includes(q))
    );
  }).slice(0, 8);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      
      {/* Drawer Container */}
      <div 
        className="w-full max-w-lg bg-slate-50 h-full shadow-2xl flex flex-col border-l border-gray-200 animate-in slide-in-from-right duration-300 relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Drawer Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 shrink-0 shadow-md border-b border-indigo-950/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-300 border border-indigo-400/20">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold tracking-tight">経理チームチャット</h2>
                  <span className="flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    同期中
                  </span>
                </div>
                <p className="text-xs text-indigo-200/80">複数人での仕訳確認・相談・リアルタイム共有</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Persona / Member Switcher */}
          <div className="mt-3 pt-3 border-t border-indigo-800/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-indigo-200 font-medium">
              <UserCheck className="w-3.5 h-3.5" />
              <span>発言者アカウント:</span>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMemberDropdown(!showMemberDropdown)}
                className="flex items-center gap-2 bg-indigo-900/80 hover:bg-indigo-800/90 text-white px-2.5 py-1 rounded-xl border border-indigo-700/60 transition-all font-bold"
              >
                <span className={`w-2.5 h-2.5 rounded-full ${currentMember.avatarColor}`} />
                <span>{currentMember.name}</span>
                <span className="text-[10px] px-1 bg-white/20 rounded font-normal text-indigo-100">
                  {currentMember.role}
                </span>
                <ChevronDown className="w-3 h-3 text-indigo-300" />
              </button>

              {/* Dropdown Menu */}
              {showMemberDropdown && (
                <div className="absolute right-0 mt-1 w-56 bg-white text-gray-800 rounded-xl shadow-xl border border-gray-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    メンバーを切り替えて発言
                  </div>
                  {DEFAULT_TEAM_MEMBERS.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        onSelectMember(m);
                        setShowMemberDropdown(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-indigo-50 transition-colors ${
                        currentMember.id === m.id ? 'bg-indigo-50/80 font-bold text-indigo-900' : 'text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${m.avatarColor}`} />
                        <span>{m.name}</span>
                      </div>
                      <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                        {m.role}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chat Messages List */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
              <MessageSquare className="w-10 h-10 text-gray-300 mb-2" />
              <p className="text-sm font-bold text-gray-600">メッセージはまだありません</p>
              <p className="text-xs text-gray-400 max-w-xs mt-1">
                領収書の確認や月次売上の共有など、チームメンバーにメッセージを送ってみましょう。
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender.id === currentMember.id;
              const formattedTime = new Date(msg.timestamp).toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  {/* Sender Header */}
                  <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-gray-500">
                    <span className={`w-2 h-2 rounded-full ${msg.sender.avatarColor}`} />
                    <span className="font-bold text-gray-700">{msg.sender.name}</span>
                    <span className="text-[10px] text-gray-400 bg-gray-200/70 px-1.5 py-0.2 rounded font-medium">
                      {msg.sender.role}
                    </span>
                    <span className="text-[10px] text-gray-400 ml-1">{formattedTime}</span>
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-xs space-y-2 leading-relaxed ${
                      isMine
                        ? 'bg-indigo-600 text-white rounded-tr-xs'
                        : 'bg-white text-gray-800 border border-gray-200 rounded-tl-xs'
                    }`}
                  >
                    {/* Text content */}
                    {msg.text && (
                      <p className="whitespace-pre-wrap select-text font-normal">{msg.text}</p>
                    )}

                    {/* Attached Transaction Card in Chat */}
                    {msg.transactionRef && (
                      <div
                        className={`mt-2 p-2.5 rounded-xl border transition-all text-xs ${
                          isMine
                            ? 'bg-indigo-700/80 border-indigo-500/50 text-indigo-50'
                            : 'bg-slate-50 border-gray-200 text-gray-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <div className="flex items-center gap-1.5 font-bold">
                            {msg.transactionRef.type === 'sales' ? (
                              <span className="p-0.5 bg-emerald-500 text-white rounded">
                                <TrendingUp className="w-3 h-3" />
                              </span>
                            ) : (
                              <span className="p-0.5 bg-amber-500 text-white rounded">
                                <TrendingDown className="w-3 h-3" />
                              </span>
                            )}
                            <span className="truncate max-w-[130px]">{msg.transactionRef.category}</span>
                          </div>

                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            msg.transactionRef.confirmed
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {msg.transactionRef.confirmed ? '確認済' : '未確認'}
                          </span>
                        </div>

                        <div className="font-bold text-sm font-mono tracking-tight mb-1">
                          {formatCurrency(msg.transactionRef.amount)}
                        </div>

                        <div className="text-[11px] opacity-90 truncate mb-2">
                          {msg.transactionRef.description}
                        </div>

                        {/* Transaction Quick Actions */}
                        <div className="pt-2 border-t border-black/10 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const found = transactions.find(t => t.id === msg.transactionRef?.id);
                              if (found) {
                                onOpenTransactionModal(found);
                              }
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors ${
                              isMine
                                ? 'bg-white/20 hover:bg-white/30 text-white'
                                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                            }`}
                          >
                            <ExternalLink className="w-3 h-3" />
                            取引詳細を開く
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (msg.transactionRef?.id) {
                                onToggleConfirmTransaction(msg.transactionRef.id);
                              }
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors ${
                              msg.transactionRef.confirmed
                                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            }`}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            {msg.transactionRef.confirmed ? '未確認に戻す' : '確認済みにする'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quoted Transaction Draft Badge */}
        {quotedTransaction && (
          <div className="bg-indigo-50 border-t border-b border-indigo-200 px-4 py-2 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-xs overflow-hidden">
              <span className="p-1 bg-indigo-600 text-white rounded">
                <Paperclip className="w-3.5 h-3.5" />
              </span>
              <div className="truncate">
                <span className="font-bold text-indigo-900 mr-1.5">
                  [{quotedTransaction.type === 'sales' ? '売上' : '経費'}] {quotedTransaction.category}
                </span>
                <span className="font-mono text-indigo-950 font-bold mr-1.5">
                  {formatCurrency(quotedTransaction.amount)}
                </span>
                <span className="text-gray-500 text-[11px] truncate">
                  ({quotedTransaction.description})
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClearQuotedTransaction}
              className="p-1 text-gray-400 hover:text-gray-700 rounded-full hover:bg-indigo-100"
              title="引用を解除"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Quick Suggestion Chips */}
        <div className="bg-white border-t border-gray-100 px-3 py-2 shrink-0 overflow-x-auto flex gap-1.5 scrollbar-none">
          {quickTemplates.map((tpl, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setInputText(tpl)}
              className="text-[10px] font-medium bg-gray-100 hover:bg-indigo-50 hover:text-indigo-800 text-gray-600 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors border border-gray-200/70 shrink-0"
            >
              {tpl}
            </button>
          ))}
        </div>

        {/* Input Form Footer */}
        <div className="bg-white p-3 border-t border-gray-200 shrink-0 space-y-2">
          <div className="relative flex items-center gap-2">
            
            {/* Quote Transaction Picker Trigger */}
            <button
              type="button"
              onClick={() => setIsPickingTx(!isPickingTx)}
              className={`p-2.5 rounded-xl border transition-colors flex items-center gap-1 text-xs font-bold ${
                isPickingTx || quotedTransaction
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'
              }`}
              title="取引を引用して質問・共有"
            >
              <Paperclip className="w-4 h-4" />
              <span className="hidden sm:inline">取引を引用</span>
            </button>

            {/* Text Input */}
            <textarea
              ref={textareaRef}
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="メッセージを入力... (Shift+Enterで改行, Enterで送信)"
              className="flex-1 text-xs p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden resize-none leading-relaxed"
            />

            {/* Send Button */}
            <button
              type="button"
              onClick={handleSend}
              disabled={!inputText.trim() && !quotedTransaction}
              className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl shadow-xs transition-all flex items-center justify-center shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] text-gray-400 px-1">
            <span>※ 別タブで開いているブラウザとも即座にリアルタイム同期します</span>
            <span>Enterで送信</span>
          </div>
        </div>

        {/* Transaction Picker Modal / Popover */}
        {isPickingTx && (
          <div className="absolute inset-x-0 bottom-24 bg-white border-t border-indigo-200 shadow-2xl rounded-t-2xl p-4 z-40 max-h-72 flex flex-col animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                相談・引用する取引を選択
              </h3>
              <button
                type="button"
                onClick={() => setIsPickingTx(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="取引名、科目、金額で検索..."
                value={txSearchQuery}
                onChange={(e) => setTxSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {filteredTxForPicker.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-4">該当する取引がありません</p>
              ) : (
                filteredTxForPicker.map(tx => (
                  <div
                    key={tx.id}
                    onClick={() => {
                      onQuoteTransaction(tx);
                      setIsPickingTx(false);
                    }}
                    className="p-2 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-300 rounded-xl cursor-pointer transition-colors flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate mr-2">
                      <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                        tx.type === 'sales' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {tx.type === 'sales' ? '売上' : '経費'}
                      </span>
                      <span className="font-bold text-gray-800">{tx.category}</span>
                      <span className="text-gray-500 truncate">{tx.description}</span>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-gray-900">{formatCurrency(tx.amount)}</div>
                      <span className={`text-[9px] ${tx.confirmed ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {tx.confirmed ? '確認済' : '未確認'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
