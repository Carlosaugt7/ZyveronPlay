import React, { useState, useEffect } from 'react';
import { Minus, Square, Copy, X, Maximize2, Tv } from 'lucide-react';

interface TitleBarProps {
  isFullScreen?: boolean;
}

export const TitleBar: React.FC<TitleBarProps> = ({ isFullScreen = false }) => {
  const electron = typeof window !== 'undefined' ? window.electronAPI : undefined;
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!electron) return;
    try {
      setIsMaximized(electron.isMaximized?.() ?? false);
    } catch {
      // Ignora erro de acesso ao IPC inicial
    }

    const unsub = electron.onMaximizeChange?.((max) => {
      setIsMaximized(max);
    });

    return () => {
      unsub?.();
    };
  }, [electron]);

  // Se não estiver no Electron ou estiver em tela cheia de reprodução, oculta a barra
  if (!electron || isFullScreen) {
    return null;
  }

  const handleMinimize = () => electron.minimize?.();
  const handleMaximize = () => electron.maximize?.();
  const handleClose = () => electron.close?.();
  const handleToggleFullScreen = () => electron.toggleFullScreen?.();

  return (
    <header 
      className="h-8 w-full bg-[#07090e] border-b border-white/5 flex items-center justify-between px-3 select-none z-50 text-slate-300 text-xs shrink-0"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      onDoubleClick={handleMaximize}
    >
      {/* Lado Esquerdo: Logo + Título + Badge */}
      <div 
        className="flex items-center gap-2"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <div className="w-4 h-4 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
          <Tv className="w-2.5 h-2.5" />
        </div>
        <span className="font-semibold text-slate-200 tracking-wide text-xs">Zyveron Play</span>
        <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/40 text-[9px] font-mono font-medium uppercase tracking-wider">
          Desktop
        </span>
      </div>

      {/* Centro: Área de Arraste da Janela */}
      <div className="flex-1 h-full" />

      {/* Lado Direito: Botões de Controle da Janela */}
      <div 
        className="flex items-center h-full -mr-3"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* Alternar Tela Cheia */}
        <button
          type="button"
          onClick={handleToggleFullScreen}
          title="Tela Cheia (F11)"
          className="h-full px-2.5 flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:bg-white/5 transition-colors focus:outline-none"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        {/* Minimizar */}
        <button
          type="button"
          onClick={handleMinimize}
          title="Minimizar"
          className="h-full px-2.5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors focus:outline-none"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        {/* Maximizar / Restaurar */}
        <button
          type="button"
          onClick={handleMaximize}
          title={isMaximized ? "Restaurar" : "Maximizar"}
          className="h-full px-2.5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors focus:outline-none"
        >
          {isMaximized ? (
            <Copy className="w-3 h-3 rotate-180" />
          ) : (
            <Square className="w-3 h-3" />
          )}
        </button>

        {/* Fechar */}
        <button
          type="button"
          onClick={handleClose}
          title="Fechar"
          className="h-full px-3 flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-600 transition-colors focus:outline-none"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};

