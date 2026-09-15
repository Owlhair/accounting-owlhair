import React, { ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    (this as any).state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    (this as any).setState({ hasError: false, error: null });
  };

  private handleHardReload = () => {
    window.location.reload();
  };

  public render() {
    const { hasError, error } = (this as any).state;
    const { children, fallbackTitle, fallbackMessage } = (this as any).props;

    if (hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl p-6 border border-rose-200 shadow-sm text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">
              {fallbackTitle || '表示エラーが発生しました'}
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              {fallbackMessage || 'このページの表示中に予期せぬエラーが発生しました。初期設定で再試行するか、ページを再読み込みしてください。'}
            </p>
            {error && (
              <div className="bg-slate-50 p-2.5 rounded-lg text-left text-[11px] font-mono text-slate-500 mb-4 break-all max-h-24 overflow-y-auto">
                {error.message}
              </div>
            )}
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>再試行する</span>
              </button>
              <button
                type="button"
                onClick={this.handleHardReload}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                再読み込み
              </button>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}
