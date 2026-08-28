import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Laptop, CheckCircle2, Share, PlusSquare, X } from 'lucide-react';

interface PwaInstallPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PwaInstallPromptModal: React.FC<PwaInstallPromptModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if running as standalone PWA
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;
    
    setIsInstalled(isStandalone);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white p-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-xs">
              <Download className="w-6 h-6 text-indigo-200" />
            </div>
            <div>
              <h3 className="font-bold text-base">Scratch経理 PWAアプリ化</h3>
              <p className="text-xs text-indigo-200 mt-0.5">スマホ・PCにインストールして快適利用</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs text-gray-600">
          {isInstalled ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <p className="font-bold text-emerald-900 text-sm">PWAとしてインストール済みです！</p>
              <p className="text-emerald-700 text-xs">
                ホーム画面またはアプリアイコンから直接起動して、オフライン環境でもご利用いただけます。
              </p>
            </div>
          ) : (
            <>
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-2.5 text-indigo-900">
                <Smartphone className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-xs">アプリ化するメリット</p>
                  <ul className="list-disc list-inside text-[11px] text-indigo-800/90 mt-1 space-y-0.5">
                    <li>ブラウザのアドレスバーが消え、全画面で使いやすい</li>
                    <li>電波が届きにくい現場でも高速・オフライン起動可能</li>
                    <li>ワンタップでホーム画面やタスクバーからすぐ起動</li>
                  </ul>
                </div>
              </div>

              {/* Install Button if browser supports beforeinstallprompt */}
              {deferredPrompt && (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-98"
                >
                  <Download className="w-4 h-4" />
                  今すぐアプリをインストール
                </button>
              )}

              {/* iOS Safari Instructions */}
              {isIOS ? (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <p className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
                    <Laptop className="w-4 h-4 text-gray-600" />
                    iPhone / iPad (Safari) での追加手順
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-gray-700">
                    <li className="flex items-center gap-1.5">
                      <span>1. Safari下部の「共有」ボタン</span>
                      <Share className="w-3.5 h-3.5 text-indigo-600 inline" />
                      <span>をタップ</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span>2. メニューから「ホーム画面に追加」</span>
                      <PlusSquare className="w-3.5 h-3.5 text-indigo-600 inline" />
                      <span>を選択</span>
                    </li>
                    <li>3. 右上の「追加」をタップすれば完了です！</li>
                  </ol>
                </div>
              ) : !deferredPrompt ? (
                /* Desktop / Android generic instructions */
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <p className="font-bold text-gray-800 text-xs">PC / Chrome / Edge での追加手順</p>
                  <p className="text-[11px] text-gray-600">
                    ブラウザのアドレスバー右端に表示される「<Download className="w-3 h-3 inline text-indigo-600 mx-0.5" /> インストール」アイコン、またはメニュー(︙)から「アプリをインストール」を選択してください。
                  </p>
                </div>
              ) : null}
            </>
          )}

          {/* Quick Notice about local persistence */}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
            <span>データは端末のローカルに安全に保存されます</span>
            <button
              type="button"
              onClick={onClose}
              className="text-indigo-600 hover:text-indigo-800 font-bold"
            >
              閉じる
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
