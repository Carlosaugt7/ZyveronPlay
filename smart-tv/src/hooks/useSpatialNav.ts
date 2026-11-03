import { useEffect, useCallback } from 'react';

export interface SpatialNavHandler {
  onUp?: () => void;
  onDown?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
  onSelect?: () => void;
  onBack?: () => void;
  onPlayPause?: () => void;
  onChannelUp?: () => void;
  onChannelDown?: () => void;
  disabled?: boolean;
}

/**
 * Hook de alto desempenho para interceptar controles remotos de Smart TVs (LG webOS, Samsung Tizen e PC)
 */
export function useSpatialNav(handlers: SpatialNavHandler, deps: any[] = []) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (handlers.disabled) return;

    const code = e.keyCode || e.which;
    const key = e.key;

    // Seta para Cima (38) ou Canal + (33)
    if (key === 'ArrowUp' || code === 38) {
      if (handlers.onUp) {
        e.preventDefault();
        e.stopPropagation();
        handlers.onUp();
      }
    }
    // Seta para Baixo (40) ou Canal - (34)
    else if (key === 'ArrowDown' || code === 40) {
      if (handlers.onDown) {
        e.preventDefault();
        e.stopPropagation();
        handlers.onDown();
      }
    }
    // Seta para Esquerda (37)
    else if (key === 'ArrowLeft' || code === 37) {
      if (handlers.onLeft) {
        e.preventDefault();
        e.stopPropagation();
        handlers.onLeft();
      }
    }
    // Seta para Direita (39)
    else if (key === 'ArrowRight' || code === 39) {
      if (handlers.onRight) {
        e.preventDefault();
        e.stopPropagation();
        handlers.onRight();
      }
    }
    // Seleção / OK / Enter (13)
    else if (key === 'Enter' || code === 13) {
      if (handlers.onSelect) {
        e.preventDefault();
        e.stopPropagation();
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
        e.stopPropagation();
        handlers.onBack();
      }
    }
    // Play / Pause (LG: 415, 19 | Tizen: 415, 19, 10252)
    else if (code === 415 || code === 19 || code === 10252 || key === 'MediaPlayPause') {
      if (handlers.onPlayPause) {
        e.preventDefault();
        e.stopPropagation();
        handlers.onPlayPause();
      }
    }
    // Canal + (33)
    else if (code === 33 || key === 'ChannelUp') {
      if (handlers.onChannelUp) {
        e.preventDefault();
        e.stopPropagation();
        handlers.onChannelUp();
      } else if (handlers.onUp) {
        e.preventDefault();
        e.stopPropagation();
        handlers.onUp();
      }
    }
    // Canal - (34)
    else if (code === 34 || key === 'ChannelDown') {
      if (handlers.onChannelDown) {
        e.preventDefault();
        e.stopPropagation();
        handlers.onChannelDown();
      } else if (handlers.onDown) {
        e.preventDefault();
        e.stopPropagation();
        handlers.onDown();
      }
    }
  }, [handlers, ...deps]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [handleKeyDown]);
}
