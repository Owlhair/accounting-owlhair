import React, { useState, useEffect } from 'react';
import { Transaction, AppSettings, ChatMessage } from '../types';
import { exportTransactionsToCsv, exportTransactionsToJson, parseJsonBackup } from '../utils/csvExport';
import { 
  X, 
  Download, 
  Upload, 
  RefreshCw, 
  Trash2, 
  FileSpreadsheet, 
  FileJson, 
  CheckCircle2, 
  AlertCircle, 
  FolderSync, 
  Save, 
  FolderOpen,
  KeyRound,
  ShieldCheck,
  Check
} from 'lucide-react';
import { 
  isFileSystemAccessSupported, 
  createOrLinkLocalFile, 
  openExistingLocalFile, 
  disconnectLocalFile,
  getActiveFileName 
} from '../utils/fileSystemSync';
import { removePasscodeLock, loadAuthState } from './LoginScreen';

interface DataBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  settings: AppSettings;
  chatMessages: ChatMessage[];
  onRestoreData: (transactions: Transaction[], settings?: AppSettings, chatMessages?: ChatMessage[]) => void;
  onResetSampleData: () => void;
  onClearAll: () => void;
  onLockApp?: () => void;
  onForceUploadToCloud?: () => void;
  onForcePullFromCloud?: () => void;
}

export const DataBackupModal: React.FC<DataBackupModalProps> = ({
  isOpen,
  onClose,
  transactions,
  settings,
  chatMessages,
  onRestoreData,
  onResetSampleData,
  onClearAll,
  onLockApp,
  onForceUploadToCloud,
  onForcePullFromCloud,
}) => {
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [linkedFileName, setLinkedFileName] = useState<string | null>(() => getActiveFileName());
  const [authState, setAuthState] = useState(() => loadAuthState());

  useEffect(() => {
    setLinkedFileName(getActiveFileName());
    setAuthState(loadAuthState());
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCsvDownload = () => {
    exportTransactionsToCsv(transactions);
    setSuccessMessage('CSVファイルをダウンロードしました（店舗列追加・Excel対応UTF-8 BOM付き）');
  };

  const handleJsonDownload = () => {
    exportTransactionsToJson(transactions, settings, chatMessages);
    setSuccessMessage('JSONバックアップ（取引データ・決算期設定・店舗設定・チームチャット）を保存しました');
  };

  const handleLinkNewFile = async () => {
    try {
      setErrorMessage('');
      setSuccessMessage('');
      const res = await createOrLinkLocalFile(transactions, settings, chatMessages);
      setLinkedFileName(res.fileName);
      setSuccessMessage(`ローカルファイル「${res.fileName}」と常時自動同期を開始しました！エクセルのように変更が直接ファイルに自動保存されます。`);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setErrorMessage('ファイル作成に失敗しました: ' + (err as Error).message);
      }
    }
  };

  const handleOpenLinkedFile = async () => {
    try {
      setErrorMessage('');
      setSuccessMessage('');
      const res = await openExistingLocalFile();
      setLinkedFileName(res.fileName);
      onRestoreData(res.transactions, res.settings, res.chatMessages);
      setSuccessMessage(`ローカルファイル「${res.fileName}」を開き、取引 ${res.transactions.length} 件を読み込みました。今後の変更もこのファイルに自動同期されます。`);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setErrorMessage('ファイル読み込みに失敗しました: ' + (err as Error).message);
      }
    }
  };

  const handleDisconnect = async () => {
    await disconnectLocalFile();
    setLinkedFileName(null);
    setSuccessMessage('ローカルファイルとの自動同期連携を解除しました（ブラウザ内保存で動作します）');
  };

  const handleJsonUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setSuccessMessage('');
    setErrorMessage('');
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await parseJsonBackup(file);
      onRestoreData(result.transactions, result.settings, result.chatMessages);
      const settingsNote = result.settings ? '・環境設定（決算期 / 店舗）' : '';
      setSuccessMessage(`バックアップから取引 ${result.transactions.length} 件${settingsNote}を正常に復元しました`);
    } catch (err) {
      setErrorMessage('バックアップの読み込みに失敗しました: ' + (err as Error).message);
    }
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 max-w-lg w-full my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 sm:p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-white/10 rounded-2xl">
              <FolderSync className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">データ管理・自動ファイル同期</h2>
              <p className="text-[11px] text-indigo-200">Excelのような常時保存ファイル連携 ＆ セキュリティ設定</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-gray-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">

          {successMessage && (
            <div className="flex items-center gap-2 p-3 text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-center gap-2 p-3 text-xs bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl font-bold">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 0: Excel-like Auto Local File Sync */}
          <div className="p-4 bg-gradient-to-br from-indigo-50 via-teal-50/40 to-indigo-50/60 border border-indigo-200/80 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-xs text-indigo-950">
                <FolderSync className="w-4 h-4 text-indigo-600" />
                <span>ローカルファイル自動同期（Excel方式）</span>
              </div>
              <span className="text-[10px] font-black bg-indigo-600 text-white px-2.5 py-0.5 rounded-full shadow-xs">
                自動保存
              </span>
            </div>

            <p className="text-[11px] text-indigo-950/80 leading-relaxed font-medium">
              PC上の実ファイル（例: <code>keiri_data.json</code>）と紐付けると、<strong>手動バックアップ不要でエクセルのように常に自動上書き保存</strong>されます。
            </p>

            {linkedFileName ? (
              <div className="p-3.5 bg-white border border-emerald-200 rounded-xl space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-black text-gray-900">{linkedFileName}</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    自動同期中
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-gray-500">入力や編集を行うたびに直接保存されます</span>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="text-[11px] text-rose-600 hover:text-rose-800 font-bold underline"
                  >
                    同期を解除
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleLinkNewFile}
                  className="flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  保存先ファイルを作成・同期
                </button>
                <button
                  type="button"
                  onClick={handleOpenLinkedFile}
                  className="py-2.5 px-3 bg-white hover:bg-gray-50 border border-indigo-200 text-indigo-900 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-indigo-600" />
                  保存済ファイルを開く
                </button>
              </div>
            )}
          </div>

          {/* Section 0.5: Google Cloud (Firestore) Realtime Cloud Sync */}
          <div className="p-4 bg-gradient-to-br from-blue-50 via-indigo-50/50 to-blue-50/70 border border-blue-200/90 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-xs text-blue-950">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Google Cloud リアルタイム同期（複数デバイス）</span>
              </div>
              <span className="text-[10px] font-black bg-blue-600 text-white px-2.5 py-0.5 rounded-full shadow-xs">
                Firestore連携中
              </span>
            </div>

            <p className="text-[11px] text-blue-950/85 leading-relaxed font-medium">
              iPhone・スマホ・PCなど複数の端末で同じURLを開くと、リアルタイムに数字や取引が自動同期されます。
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {onForceUploadToCloud && (
                <button
                  type="button"
                  onClick={onForceUploadToCloud}
                  className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  この端末の全データを送信
                </button>
              )}
              {onForcePullFromCloud && (
                <button
                  type="button"
                  onClick={onForcePullFromCloud}
                  className="py-2.5 px-3 bg-white hover:bg-blue-50 border border-blue-300 text-blue-950 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                  クラウドから最新を受信
                </button>
              )}
            </div>
          </div>

          {/* Section 1: JSON Restore */}
          <div className="space-y-2 pt-1 border-t border-gray-100">
            <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-indigo-600" />
              <span>ファイルから復元（インポート）</span>
            </h3>

            <label className="block p-3.5 border-2 border-dashed border-indigo-200 hover:border-indigo-500 rounded-2xl text-center cursor-pointer transition-colors bg-indigo-50/20 hover:bg-indigo-50/50">
              <Upload className="w-5 h-5 mx-auto text-indigo-500 mb-1" />
              <span className="text-xs font-bold text-indigo-700 block">
                JSONバックアップファイルを選択して復元
              </span>
              <span className="text-[10px] text-gray-500 block mt-0.5">
                （以前保存した .json ファイルを選択すると、決算期・店舗・取引がすべて元通り復元されます）
              </span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleJsonUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Section 2: Exports */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>手動ダウンロード（エクスポート）</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleJsonDownload}
                className="p-3 bg-indigo-50/70 hover:bg-indigo-100 border border-indigo-200 rounded-2xl text-left transition-all flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs text-indigo-900 flex items-center gap-1.5">
                    <FileJson className="w-4 h-4 text-indigo-700" />
                    完全JSONバックアップ
                  </span>
                  <Download className="w-3.5 h-3.5 text-indigo-700" />
                </div>
                <p className="text-[10px] text-indigo-800 font-medium">
                  店舗・決算期・全取引・チャットをワンクリック保存
                </p>
              </button>

              <button
                type="button"
                onClick={handleCsvDownload}
                className="p-3 bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-200 rounded-2xl text-left transition-all flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs text-emerald-900 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                    Excel用 CSV出力
                  </span>
                  <Download className="w-3.5 h-3.5 text-emerald-700" />
                </div>
                <p className="text-[10px] text-emerald-800 font-medium">
                  文字化けなし（UTF-8 BOM付き）Excelで直接閲覧
                </p>
              </button>
            </div>
          </div>

          {/* Section 3: Security Lock & Password */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
              <span>セキュリティ・ログイン設定</span>
            </h3>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-gray-900 block">画面ロック & 暗証番号</span>
                <span className="text-[10px] text-gray-500">
                  {authState.hasPasscode ? 'PIN暗証番号が設定されています' : '暗証番号は未設定（スキップ可能）'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {onLockApp && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onLockApp();
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    今すぐロック
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Reset / Clear */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider">
              初期化・サンプル
            </h3>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  if (confirm('デモサンプルデータを再読み込みしますか？')) {
                    onResetSampleData();
                    setSuccessMessage('デモサンプルデータを再読み込みしました');
                  }
                }}
                className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-gray-600" />
                デモデータにリセット
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm('全ての取引データを削除しますか？この操作は取り消せません。')) {
                    onClearAll();
                    setSuccessMessage('全ての取引データを消去しました');
                  }
                }}
                className="px-3 py-2 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-xl transition-colors border border-rose-200 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                全データ消去
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-3.5 border-t border-gray-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold bg-gray-800 hover:bg-gray-900 text-white rounded-xl transition-colors"
          >
            閉じる
          </button>
        </div>

      </div>
    </div>
  );
};
