import React from 'react';
import { 
  Store, 
  CreditCard, 
  Coins, 
  QrCode, 
  Building, 
  Gift, 
  CheckCircle2, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  Edit2 
} from 'lucide-react';

interface StoreCardItem {
  store: string;
  isClosed: boolean;
  month: string;
  breakdown: Record<string, number>;
  total: number;
  isFilled: boolean;
  txCount: number;
  cashAmt: number;
  cashlessAmt: number;
  cashlessPercent: number;
  memo?: string;
}

interface SalesMinimapBreakdownProps {
  activeMonth: string;
  currentMonthCards: StoreCardItem[];
  monthTotal: number;
  isOpen: boolean;
  onToggle: () => void;
  onOpenStoreModal?: (storeName: string) => void;
}

export const SalesMinimapBreakdown: React.FC<SalesMinimapBreakdownProps> = ({
  activeMonth,
  currentMonthCards,
  monthTotal,
  isOpen,
  onToggle,
  onOpenStoreModal,
}) => {
  const [year, monthNum] = activeMonth.split('-');
  const monthInt = parseInt(monthNum, 10);

  const filledCount = currentMonthCards.filter((c) => c.isFilled).length;
  const isAllFilled = filledCount === currentMonthCards.length && currentMonthCards.length > 0;

  const getMethodIcon = (method: string) => {
    switch (method) {
      case '現金':
        return <Coins className="w-3 h-3 text-amber-500" />;
      case 'クレジットカード':
        return <CreditCard className="w-3 h-3 text-blue-500" />;
      case 'QR決済':
        return <QrCode className="w-3 h-3 text-emerald-500" />;
      case '銀行振込':
        return <Building className="w-3 h-3 text-indigo-500" />;
      case 'ポイント':
        return <Gift className="w-3 h-3 text-purple-500" />;
      default:
        return <Coins className="w-3 h-3 text-gray-500" />;
    }
  };

  return (
    <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl overflow-hidden transition-all shadow-2xs">
      {/* Header Bar with Toggle */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-slate-100/80 transition-colors text-left cursor-pointer select-none"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span>【{year}年{monthInt}月度】ミニマップ金額の内訳（店舗別売上カード一覧）</span>
          </span>

          {isAllFilled ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100/90 text-emerald-800 text-[11px] font-bold rounded-md border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              全店舗入力完了 ({filledCount}/{currentMonthCards.length}店)
            </span>
          ) : filledCount > 0 ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100/80 text-amber-800 text-[11px] font-bold rounded-md border border-amber-200">
              <Clock className="w-3 h-3 text-amber-600" />
              一部入力済 ({filledCount}/{currentMonthCards.length}店)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-200 text-slate-700 text-[11px] font-bold rounded-md border border-slate-300">
              未入力 (0/{currentMonthCards.length}店)
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-slate-500 font-medium block">店舗売上 合計</span>
            <span className="text-sm font-black font-mono text-emerald-950">
              ¥{monthTotal.toLocaleString()}
            </span>
          </div>

          <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-2xs">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </button>

      {/* Expanded Breakdown Body */}
      {isOpen && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-200/80 bg-white/60">
          <p className="text-[11px] text-slate-500 mb-2.5">
            ※ 上のミニマップで「{monthInt}月」の数字（¥{Math.round(monthTotal / 10000)}万
            ）のもとになっている各店舗カードの内訳です。クリックで編集できます。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {currentMonthCards.map((card) => {
              // Active payment methods with amounts > 0
              const activeMethods = (Object.entries(card.breakdown) as [string, number][]).filter(
                ([, amt]) => typeof amt === 'number' && amt > 0
              );

              return (
                <div
                  key={card.store}
                  onClick={() => onOpenStoreModal && onOpenStoreModal(card.store)}
                  className={`bg-white p-3 rounded-xl border shadow-2xs transition-all flex flex-col justify-between cursor-pointer hover:shadow-xs ${
                    card.isFilled
                      ? 'border-emerald-200/90 hover:border-emerald-400'
                      : 'border-slate-200/90 hover:border-slate-400'
                  }`}
                >
                  <div>
                    {/* Top Row: Store Name & Status */}
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="flex items-center gap-1 text-xs font-black text-slate-900">
                        <Store className="w-3.5 h-3.5 text-emerald-600" />
                        {card.store}
                      </span>

                      <div className="flex items-center gap-1">
                        {card.isFilled ? (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-bold rounded border border-emerald-200">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                            入力済
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-medium rounded border border-slate-200">
                            未入力
                          </span>
                        )}
                        <button
                          type="button"
                          className="text-slate-400 hover:text-emerald-700 p-0.5 rounded"
                          title="店舗カードを編集"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Breakdown Pills */}
                    {activeMethods.length > 0 ? (
                      <div className="flex flex-wrap gap-1 my-2">
                        {activeMethods.map(([method, amt]) => (
                          <span
                            key={method}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 text-slate-700 rounded border border-slate-200 text-[10px] font-mono"
                          >
                            {getMethodIcon(method)}
                            <span className="font-sans text-[9px] text-slate-500">{method}:</span>
                            <span className="font-bold">¥{amt.toLocaleString()}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="py-2 text-[10px] text-slate-400 italic">
                        決済内訳はまだ登録されていません
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Row: Total */}
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-400">
                      {card.isFilled ? `${card.txCount}件の取引` : '未計上'}
                    </span>
                    <span
                      className={`font-mono font-black text-sm ${
                        card.total > 0 ? 'text-emerald-950' : 'text-slate-400'
                      }`}
                    >
                      ¥{card.total.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
