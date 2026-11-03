import { useEffect, useCallback } from 'react';

export interface SpatialNavHandler {
  onUp?: () => void;
  onDown?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
  onSelect?: () => void;
  onBack?: () => void;
  onPlayPause?: () => void;
  disabled?: boolean;
}

/**
 * Hook para interceptar controles remotos de Smart TVs (Samsung Tizen, LG webOS e Teclado PC)
 */
export function useSpatialNav(handlers: SpatialNavHandler, deps: any[] = []) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (handlers.disabled) return;

    const code = e.keyCode || e.which;
    const key = e.key;

    // Seta para Cima
    if (key === 'ArrowUp' || code === 38) {
      if (handlers.onUp) {
        e.preventDefault();
        handlers.onUp();
      }
    }
    // Seta para Baixo
    else if (key === 'ArrowDown' || code === 40) {
      if (handlers.onDown) {
        e.preventDefault();
        handlers.onDown();
      }
    }
    // Seta para Esquerda
    else if (key === 'ArrowLeft' || code === 37) {
      if (handlers.onLeft) {
        e.preventDefault();
        handlers.onLeft();
      }
    }
    // Seta para Direita
    else if (key === 'ArrowRight' || code === 39) {
      if (handlers.onRight) {
        e.preventDefault();
        handlers.onRight();
      }
    }
    // Seleção / OK / Enter
    else if (key === 'Enter' || code === 13) {
      if (handlers.onSelect) {
        e.preventDefault();
        handlers.onSelect();
      }
    }
    // Voltar / Return (LG: 461, Tizen: 10009, Escape: 27, Backspace: 8)
    else if (
      key === 'Escape' || 
      key === 'Backspace' || 
      code === 27 || 
      code === 8 || 
      code === 10009 || 
      code === 461
    ) {
      if (handlers.onBack) {
        e.preventDefault();
        handlers.onBack();
      }
    }
    // Play / Pause (Tizen: 415, 19, 10252)
    else if (code === 415 || code === 19 || code === 10252 || key === 'MediaPlayPause') {
      if (handlers.onPlayPause) {
        e.preventDefault();
        handlers.onPlayPause();
      }
    }
  }, [handlers, ...deps]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

