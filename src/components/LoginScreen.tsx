import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  KeyRound, 
  ShieldCheck, 
  LogOut, 
  Check, 
  UserCheck, 
  Store,
  Sparkles,
  Eye,
  EyeOff
} from 'lucide-react';

export interface AuthState {
  isLocked: boolean;
  passcode: string | null;
  currentUser: string;
  hasPasscodeConfigured: boolean;
}

const STORAGE_KEY_AUTH_PASSCODE = 'scratch_keiri_auth_passcode';
const STORAGE_KEY_AUTH_SESSION = 'scratch_keiri_auth_session_unlocked';
const STORAGE_KEY_AUTH_USER = 'scratch_keiri_auth_user_name';

export const loadAuthState = (): {
  hasPasscode: boolean;
  isUnlocked: boolean;
  user: string;
} => {
  try {
    const passcode = localStorage.getItem(STORAGE_KEY_AUTH_PASSCODE);
    const session = sessionStorage.getItem(STORAGE_KEY_AUTH_SESSION);
    const user = localStorage.getItem(STORAGE_KEY_AUTH_USER) || 'オーナー（管理者）';
    return {
      hasPasscode: !!passcode,
      isUnlocked: session === 'true' || !passcode, // If no passcode configured, default open until user sets PIN or locks
      user,
    };
  } catch (e) {
    return { hasPasscode: false, isUnlocked: true, user: '管理者' };
  }
};

export const setAuthPasscode = (pin: string, user: string) => {
  try {
    localStorage.setItem(STORAGE_KEY_AUTH_PASSCODE, pin);
    localStorage.setItem(STORAGE_KEY_AUTH_USER, user);
    sessionStorage.setItem(STORAGE_KEY_AUTH_SESSION, 'true');
  } catch (e) {}
};

export const verifyAuthPasscode = (inputPin: string): boolean => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_AUTH_PASSCODE);
    if (!saved) return true;
    if (saved === inputPin) {
      sessionStorage.setItem(STORAGE_KEY_AUTH_SESSION, 'true');
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
};

export const clearAuthSession = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEY_AUTH_SESSION);
  } catch (e) {}
};

export const removePasscodeLock = () => {
  try {
    localStorage.removeItem(STORAGE_KEY_AUTH_PASSCODE);
    sessionStorage.setItem(STORAGE_KEY_AUTH_SESSION, 'true');
  } catch (e) {}
};

interface LoginScreenProps {
  onUnlock: (user: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onUnlock }) => {
  const [hasPasscode, setHasPasscode] = useState<boolean>(() => {
    return !!localStorage.getItem(STORAGE_KEY_AUTH_PASSCODE);
  });
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_AUTH_USER) || 'オーナー（管理者）';
  });

  const [pin, setPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [isSettingMode, setIsSettingMode] = useState<boolean>(!hasPasscode);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (isSettingMode) {
      if (pin.length < 4) {
        setErrorMsg('暗証番号（PIN）は4桁以上で設定してください');
        return;
      }
      if (pin !== confirmPin) {
        setErrorMsg('確認用暗証番号が一致しません');
        return;
      }
      setAuthPasscode(pin, userName.trim() || 'オーナー');
      onUnlock(userName.trim() || 'オーナー');
    } else {
      if (verifyAuthPasscode(pin)) {
        onUnlock(userName);
      } else {
        setErrorMsg('暗証番号（PIN）が正しくありません');
        setPin('');
      }
    }
  };

  const handleQuickSkip = () => {
    // Guest or quick open without PIN
    sessionStorage.setItem(STORAGE_KEY_AUTH_SESSION, 'true');
    onUnlock(userName);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 selection:bg-indigo-500 selection:text-white">
      <div className="max-w-md w-full bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top App Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center -space-x-1 mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 shadow-md flex items-center justify-center text-white font-black text-lg">
              S
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500 shadow-md flex items-center justify-center text-white font-black text-lg">
              A
            </div>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            scracc 経理管理
          </h1>
          <p className="text-xs text-gray-500 font-medium">
            店舗売上・経費・決算を安全に管理するための認証ロック
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {isSettingMode ? (
            <>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>セキュリティ暗証番号（PIN）の設定</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  店舗や外部から開いた際に数字を見られないよう、4桁のPINコードを設定できます。
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  ログイン名 / 担当者
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="例: オーナー、太宰府店長"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  新しい暗証番号 (4桁以上の数字)
                </label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    pattern="[0-9]*"
                    inputMode="numeric"
                    maxLength={8}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="例: 1234"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-black tracking-widest focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  暗証番号の再入力（確認）
                </label>
                <input
                  type={showPin ? 'text' : 'password'}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength={8}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder="もう一度入力"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-black tracking-widest focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
                  required
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                    {userName.slice(0, 1) || '管'}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-indigo-950 block">{userName}</span>
                    <span className="text-[10px] text-indigo-600 font-medium">セキュリティロック中</span>
                  </div>
                </div>
                <KeyRound className="w-4 h-4 text-indigo-500" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  暗証番号（PIN）を入力してロック解除
                </label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    pattern="[0-9]*"
                    inputMode="numeric"
                    maxLength={8}
                    autoFocus
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="4桁のPIN"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-2xl text-center text-lg font-black tracking-widest focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          )}

          {errorMsg && (
            <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl text-center">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-black text-sm rounded-2xl shadow-lg shadow-indigo-200 hover:shadow-none transition-all flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" />
            <span>{isSettingMode ? '暗証番号を保存して開始' : 'ロックを解除してログイン'}</span>
          </button>
        </form>

        {/* Footer actions */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-medium">
          {hasPasscode && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('暗証番号をリセットして再設定しますか？')) {
                  removePasscodeLock();
                  setHasPasscode(false);
                  setIsSettingMode(true);
                  setPin('');
                }
              }}
              className="text-gray-400 hover:text-gray-700 underline"
            >
              暗証番号を忘れた・再設定
            </button>
          )}
          
          <button
            type="button"
            onClick={handleQuickSkip}
            className="ml-auto text-indigo-600 hover:text-indigo-800 font-bold"
          >
            スキップして開く →
          </button>
        </div>

      </div>
    </div>
  );
};
