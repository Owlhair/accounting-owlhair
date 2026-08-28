import React from 'react';
import { 
  LayoutDashboard, 
  List, 
  Layers, 
  Calendar, 
  FileSpreadsheet, 
  Plus, 
  Sparkles,
  MessageSquareText,
  Users,
  Download
} from 'lucide-react';

export type NavTab = 'dashboard' | 'list' | 'scratch' | 'monthly';

interface NavbarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenAddSales: () => void;
  onOpenAddExpense: () => void;
  onOpenBackup: () => void;
  onOpenChat: () => void;
  onOpenPwaModal?: () => void;
  unconfirmedCount: number;
  chatMessageCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  onOpenAddSales,
  onOpenAddExpense,
  onOpenBackup,
  onOpenChat,
  onOpenPwaModal,
  unconfirmedCount,
  chatMessageCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200/80 shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Brand Logo with Scratch Theme */}
          <div 
            onClick={() => onTabChange('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer select-none shrink-0"
          >
            {/* Custom interlocking block logo */}
            <div className="flex -space-x-1.5 items-center">
              <div className="w-6 h-6 rounded-md bg-emerald-500 shadow-xs flex items-center justify-center text-white font-black text-[11px]">
                売
              </div>
              <div className="w-6 h-6 rounded-md bg-amber-500 shadow-xs flex items-center justify-center text-white font-black text-[11px]">
                費
              </div>
              <div className="w-6 h-6 rounded-md bg-indigo-600 shadow-xs flex items-center justify-center text-white font-black text-[11px]">
                結
              </div>
            </div>
            <div>
              <span className="text-base font-black text-gray-900 tracking-tight flex items-center gap-1">
                Scratch風経理
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded font-bold">
                  v0.1
                </span>
              </span>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => onTabChange('dashboard')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                currentTab === 'dashboard'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              ダッシュボード
            </button>

            <button
              type="button"
              onClick={() => onTabChange('list')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                currentTab === 'list'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              取引一覧
              {unconfirmedCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] bg-rose-500 text-white rounded-full font-mono">
                  {unconfirmedCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onTabChange('scratch')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                currentTab === 'scratch'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Scratchブロック
            </button>

            <button
              type="button"
              onClick={() => onTabChange('monthly')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                currentTab === 'monthly'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              月別集計
            </button>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Team Chat Action Button */}
            <button
              type="button"
              onClick={onOpenChat}
              className="px-2.5 sm:px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900 text-xs font-bold rounded-xl border border-indigo-200 transition-colors flex items-center gap-1.5 shadow-2xs relative"
              title="チームチャットを開く"
            >
              <MessageSquareText className="w-4 h-4 text-indigo-600" />
              <span className="hidden sm:inline">チームチャット</span>
              {chatMessageCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] bg-indigo-600 text-white rounded-full font-mono">
                  {chatMessageCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onOpenAddSales}
              className="px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">売上追加</span>
              <span className="sm:hidden">売上</span>
            </button>

            <button
              type="button"
              onClick={onOpenAddExpense}
              className="px-2.5 sm:px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">経費追加</span>
              <span className="sm:hidden">経費</span>
            </button>

            <button
              type="button"
              onClick={onOpenBackup}
              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
              title="CSV / バックアップ / 設定"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>

            {onOpenPwaModal && (
              <button
                type="button"
                onClick={onOpenPwaModal}
                className="px-2 sm:px-2.5 py-1.5 text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100/90 rounded-xl transition-colors border border-indigo-200 text-xs font-bold flex items-center gap-1"
                title="PWAとしてスマホやPCにインストール"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden md:inline">アプリ化</span>
              </button>
            )}
          </div>

        </div>

        {/* Mobile Navigation Tabs */}
        <div className="md:hidden flex items-center justify-around border-t border-gray-100 py-1.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => onTabChange('dashboard')}
            className={`py-1 px-2 rounded-lg ${currentTab === 'dashboard' ? 'text-indigo-600 font-extrabold' : 'text-gray-500'}`}
          >
            ホーム
          </button>
          <button
            type="button"
            onClick={() => onTabChange('list')}
            className={`py-1 px-2 rounded-lg flex items-center gap-1 ${currentTab === 'list' ? 'text-indigo-600 font-extrabold' : 'text-gray-500'}`}
          >
            一覧
            {unconfirmedCount > 0 && (
              <span className="px-1.5 py-0.2 text-[9px] bg-rose-500 text-white rounded-full">
                {unconfirmedCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => onTabChange('scratch')}
            className={`py-1 px-2 rounded-lg ${currentTab === 'scratch' ? 'text-indigo-600 font-extrabold' : 'text-gray-500'}`}
          >
            ブロック
          </button>
          <button
            type="button"
            onClick={() => onTabChange('monthly')}
            className={`py-1 px-2 rounded-lg ${currentTab === 'monthly' ? 'text-indigo-600 font-extrabold' : 'text-gray-500'}`}
          >
            月別
          </button>
          <button
            type="button"
            onClick={onOpenChat}
            className="py-1 px-2 rounded-lg text-indigo-600 font-bold flex items-center gap-0.5"
          >
            チャット
            {chatMessageCount > 0 && (
              <span className="px-1 py-0.2 text-[8px] bg-indigo-600 text-white rounded-full">
                {chatMessageCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

