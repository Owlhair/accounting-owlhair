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
  Download,
  Store,
  Lock,
  FolderSync,
  Calculator,
  FileText,
  Cloud,
  CloudCheck,
  RefreshCw,
} from 'lucide-react';
import { getActiveFileName } from '../utils/fileSystemSync';

export type NavTab = 'dashboard' | 'cards' | 'list' | 'scratch' | 'monthly' | 'statement';

interface NavbarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenAddSales: () => void;
  onOpenAddExpense: () => void;
  onOpenBackup: () => void;
  onOpenChat?: () => void;
  onOpenPwaModal?: () => void;
  onLockApp?: () => void;
  currentUser?: string;
  unconfirmedCount: number;
  chatMessageCount: number;
  isCloudConnected?: boolean;
  isCloudSyncing?: boolean;
  onManualCloudSync?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  onOpenAddSales,
  onOpenAddExpense,
  onOpenBackup,
  onOpenChat,
  onOpenPwaModal,
  onLockApp,
  currentUser,
  unconfirmedCount,
  chatMessageCount,
  isCloudConnected = true,
  isCloudSyncing = false,
  onManualCloudSync,
}) => {
  const activeFileName = getActiveFileName();
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200/80 shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Brand Logo: scracc */}
          <div 
            onClick={() => onTabChange('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer select-none shrink-0"
          >
            {/* Custom geometric block logo */}
            <div className="flex -space-x-1 items-center">
              <div className="w-6 h-6 rounded-lg bg-indigo-600 shadow-xs flex items-center justify-center text-white font-black text-xs tracking-tighter">
                S
              </div>
              <div className="w-6 h-6 rounded-lg bg-emerald-500 shadow-xs flex items-center justify-center text-white font-black text-xs tracking-tighter">
                A
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-black text-gray-900 tracking-tight leading-none">
                scracc
              </span>
              <span className="text-[10px] text-gray-400 font-medium tracking-wide">
                scratch accounting
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
              onClick={() => onTabChange('cards')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                currentTab === 'cards'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Store className="w-3.5 h-3.5 text-emerald-600" />
              売上カード (店舗×月)
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

            <button
              type="button"
              onClick={() => onTabChange('statement')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                currentTab === 'statement'
                  ? 'bg-white text-indigo-950 shadow-xs ring-1 ring-indigo-200'
                  : 'text-gray-600 hover:text-indigo-900'
              }`}
            >
              <Calculator className="w-3.5 h-3.5 text-amber-500" />
              <span>想定決算・税金 (P/L)</span>
            </button>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Cloud Realtime Sync Live Badge */}
            <button
              type="button"
              onClick={onManualCloudSync}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50/90 hover:bg-indigo-100/90 border border-indigo-200/80 text-indigo-700 rounded-xl text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
              title={isCloudConnected ? 'Google Cloud (Firestore) リアルタイム同期中：クリックで今すぐ強制同期' : 'オフラインモード（ローカル保存中）'}
            >
              <RefreshCw className={`w-3 h-3 text-indigo-600 ${isCloudSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline font-semibold">
                {isCloudSyncing ? 'クラウド同期中...' : 'クラウド同期中'}
              </span>
              <span className="sm:hidden text-[10px]">
                {isCloudSyncing ? '同期中' : '同期中'}
              </span>
              <span className={`w-1.5 h-1.5 rounded-full ${isCloudConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
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

            {/* Active file sync status indicator if connected */}
            {activeFileName && (
              <button
                type="button"
                onClick={onOpenBackup}
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold transition-colors"
                title={`ローカルファイル「${activeFileName}」と自動同期中`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="max-w-[100px] truncate">{activeFileName}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenBackup}
              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200 relative"
              title="ファイル自動同期 / バックアップ / 設定"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {activeFileName && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
              )}
            </button>

            {onLockApp && (
              <button
                type="button"
                onClick={onLockApp}
                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors border border-gray-200"
                title="経理画面をロック（ログアウト）"
              >
                <Lock className="w-4 h-4" />
              </button>
            )}

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
        <div className="md:hidden flex items-center justify-around border-t border-gray-100 py-1.5 text-xs font-bold overflow-x-auto">
          <button
            type="button"
            onClick={() => onTabChange('dashboard')}
            className={`py-1 px-2 rounded-lg shrink-0 ${currentTab === 'dashboard' ? 'text-indigo-600 font-extrabold' : 'text-gray-500'}`}
          >
            ホーム
          </button>
          <button
            type="button"
            onClick={() => onTabChange('cards')}
            className={`py-1 px-2 rounded-lg shrink-0 flex items-center gap-1 ${currentTab === 'cards' ? 'text-emerald-700 font-extrabold' : 'text-gray-500'}`}
          >
            売上カード
          </button>
          <button
            type="button"
            onClick={() => onTabChange('list')}
            className={`py-1 px-2 rounded-lg shrink-0 flex items-center gap-1 ${currentTab === 'list' ? 'text-indigo-600 font-extrabold' : 'text-gray-500'}`}
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
            className={`py-1 px-2 rounded-lg shrink-0 ${currentTab === 'scratch' ? 'text-indigo-600 font-extrabold' : 'text-gray-500'}`}
          >
            ブロック
          </button>
          <button
            type="button"
            onClick={() => onTabChange('monthly')}
            className={`py-1 px-2 rounded-lg shrink-0 ${currentTab === 'monthly' ? 'text-indigo-600 font-extrabold' : 'text-gray-500'}`}
          >
            月別
          </button>
          <button
            type="button"
            onClick={() => onTabChange('statement')}
            className={`py-1 px-2 rounded-lg shrink-0 flex items-center gap-1 ${currentTab === 'statement' ? 'text-indigo-900 bg-indigo-50 font-extrabold' : 'text-amber-700 font-bold'}`}
          >
            決算・税金
          </button>
        </div>
      </div>
    </header>
  );
};

