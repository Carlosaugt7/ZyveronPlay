import React, { useState, useEffect } from 'react';
import { Smartphone } from 'lucide-react';

/**
 * Componente que detecta a orientação do dispositivo em aparelhos móveis (ex: iPhone via Media Station X)
 * e exibe um aviso elegante em tela cheia orientando a rotação para horizontal (Landscape).
 */
export const RotateDevicePrompt: React.FC = () => {
  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const isTouch = window.matchMedia('(pointer: coarse)').matches ||
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    return isTouch && window.innerHeight > window.innerWidth;
  });

  useEffect(() => {
    const checkOrientation = () => {
      const isTouch = window.matchMedia('(pointer: coarse)').matches ||
        /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      setIsPortrait(isTouch && window.innerHeight > window.innerWidth);
    };

    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    // Verificação de segurança após carregamento inicial
    const t = setTimeout(checkOrientation, 300);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      clearTimeout(t);
    };
  }, []);

  if (!isPortrait) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-[#0a0d14]/98 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-200 safe-area-padding">
      <div className="max-w-sm flex flex-col items-center gap-6">
        {/* Ícone animado indicando rotação */}
        <div className="relative w-28 h-28 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 animate-ping opacity-30" />
          <div className="w-24 h-24 rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center shadow-2xl shadow-emerald-500/20">
            <Smartphone className="w-12 h-12 text-emerald-400 rotate-90 transition-transform duration-700 animate-pulse" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white tracking-wide">
            Gire seu aparelho
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            O <span className="text-emerald-400 font-bold">Zyveron Play</span> foi projetado para a melhor experiência em tela cheia na posição horizontal.
          </p>
        </div>

        <div className="bg-[#121722] border border-slate-800 rounded-2xl px-4 py-3 flex items-center gap-3 text-xs text-slate-300 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <span>Vire o iPhone para a horizontal para navegar</span>
        </div>
      </div>
    </div>
  );
};

