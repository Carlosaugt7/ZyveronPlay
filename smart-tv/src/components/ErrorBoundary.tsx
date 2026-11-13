import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Zyveron ErrorBoundary] Erro crítico capturado:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[100dvh] bg-[#0a0d14] flex flex-col items-center justify-center p-6 text-center select-none text-white">
          <div className="max-w-md w-full bg-[#121722] border-2 border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
              <AlertCircle className="w-10 h-10" />
            </div>

            <h2 className="text-2xl font-black text-white mb-2">
              {this.props.fallbackTitle || 'Ops! Algo deu errado'}
            </h2>

            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              O aplicativo encontrou um comportamento inesperado ao carregar esta tela. Pressione o botão abaixo para retornar à tela inicial em segurança.
            </p>

            {this.state.error && (
              <div className="w-full bg-[#0a0d14] border border-slate-800 rounded-xl p-3 mb-6 text-left">
                <p className="text-[11px] font-mono text-red-400 truncate">
                  {this.state.error.name}: {this.state.error.message}
                </p>
              </div>
            )}

            <button
              type="button"
              autoFocus
              onClick={this.handleReset}
              className="w-full py-4 px-6 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-base rounded-2xl shadow-xl transition flex items-center justify-center gap-2 cursor-pointer ring-4 ring-emerald-300"
            >
              <Home className="w-5 h-5" />
              <span>[OK] Voltar ao Início</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
