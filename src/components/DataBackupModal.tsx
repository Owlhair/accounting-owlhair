import React, { useState } from 'react';
import { Transaction } from '../types';
import { exportTransactionsToCsv, exportTransactionsToJson, parseJsonBackup } from '../utils/csvExport';
import { X, Download, Upload, RefreshCw, Trash2, FileSpreadsheet, FileJson, CheckCircle2, AlertCircle } from 'lucide-react';

interface DataBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  onRestoreTransactions: (transactions: Transaction[]) => void;
  onResetSampleData: () => void;
  onClearAll: () => void;
}

export const DataBackupModal: React.FC<DataBackupModalProps> = ({
  isOpen,
  onClose,
  transactions,
  onRestoreTransactions,
  onResetSampleData,
  onClearAll,
}) => {
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleCsvDownload = () => {
    exportTransactionsToCsv(transactions);
    setSuccessMessage('CSVファイルをダウンロードしました（Excel対応UTF-8 BOM付き）');
  };

  const handleJsonDownload = () => {
    exportTransactionsToJson(transactions);
    setSuccessMessage('JSONバックアップファイルをダウンロードしました');
  };

  const handleJsonUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setSuccessMessage('');
    setErrorMessage('');
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await parseJsonBackup(file);
      onRestoreTransactions(data);
      setSuccessMessage(`JSONバックアップから ${data.length} 件の取引データを復元しました`);
    } catch (err) {
      setErrorMessage('バックアップの読み込みに失敗しました: ' + (err as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-lg w-full my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-indigo-900 p-4 sm:p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <FileSpreadsheet className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">データ管理・バックアップ</h2>
              <p className="text-xs text-indigo-200">CSV/JSON出力・復元・サンプルデータ初期化</p>
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
        <div className="p-5 space-y-5">
          {successMessage && (
            <div className="flex items-center gap-2 p-3 text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-center gap-2 p-3 text-xs bg-rose-50 border border-rose-200 text-rose-800 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Exports */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              1. データ出力（エクスポート）
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleCsvDownload}
                className="p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-left transition-all flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-emerald-900 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                    CSV出力
                  </span>
                  <Download className="w-3.5 h-3.5 text-emerald-700" />
                </div>
                <p className="text-[11px] text-emerald-800">
                  Excelで文字化けしないUTF-8 BOM付きでダウンロードします
                </p>
              </button>

              <button
                type="button"
                onClick={handleJsonDownload}
                className="p-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-left transition-all flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-indigo-900 flex items-center gap-1.5">
                    <FileJson className="w-4 h-4 text-indigo-700" />
                    JSONバックアップ
                  </span>
                  <Download className="w-3.5 h-3.5 text-indigo-700" />
                </div>
                <p className="text-[11px] text-indigo-800">
                  すべての取引データ・属性・添付情報を完全保存します
                </p>
              </button>
            </div>
          </div>

          {/* Section 2: JSON Restore */}
          <div className="space-y-2.5 pt-2 border-t border-gray-100">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              2. データ復元（インポート）
            </h3>

            <label className="block p-4 border-2 border-dashed border-gray-300 hover:border-indigo-500 rounded-xl text-center cursor-pointer transition-colors bg-gray-50/50 hover:bg-indigo-50/30">
              <Upload className="w-6 h-6 mx-auto text-gray-400 mb-1" />
              <span className="text-xs font-bold text-indigo-600 block">
                JSONバックアップファイルを選択して復元
              </span>
              <span className="text-[10px] text-gray-400 block mt-0.5">
                （以前保存した .json ファイルを取り込みます）
              </span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleJsonUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Section 3: Reset / Clear */}
          <div className="space-y-2.5 pt-2 border-t border-gray-100">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              3. サンプルデータ・初期化
            </h3>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  if (confirm('仕様通りのデモサンプルデータ（2025年8月売上100万・経費16.5万）を再読み込みしますか？')) {
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
