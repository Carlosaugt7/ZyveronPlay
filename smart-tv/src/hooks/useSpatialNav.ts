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
 * Hook de altíssimo desempenho para interceptar controles remotos de Smart TVs (LG webOS, Samsung Tizen e PC)
 */
export function useSpatialNav(handlers: SpatialNavHandler, deps: any[] = []) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (handlers.disabled) return;

    const code = e.keyCode || e.which;
    const key = e.key;

    let handled = false;

    // Seta para Cima (38) ou Canal + (33)
    if (key === 'ArrowUp' || code === 38) {
      handled = true;
      if (handlers.onUp) {
        handlers.onUp();
      }
    }
    // Seta para Baixo (40) ou Canal - (34)
    else if (key === 'ArrowDown' || code === 40) {
      handled = true;
      if (handlers.onDown) {
        handlers.onDown();
      }
    }
    // Seta para Esquerda (37)
    else if (key === 'ArrowLeft' || code === 37) {
      handled = true;
      if (handlers.onLeft) {
        handlers.onLeft();
      }
    }
    // Seta para Direita (39)
    else if (key === 'ArrowRight' || code === 39) {
      handled = true;
      if (handlers.onRight) {
        handlers.onRight();
      }
    }
    // Seleção / OK / Enter (13)
    else if (key === 'Enter' || code === 13) {
      handled = true;
      if (handlers.onSelect) {
        handlers.onSelect();
      }
    }
    // Voltar / Return / Back
    // Samsung Tizen: 10009
    // LG webOS: 461
    // Android TV / Box / Fire TV: 4
    // Windows / Chrome: 166 (BrowserBack)
    // PC Keyboard: 27 (Escape), 8 (Backspace)
    // MSX / Roku / Outros: 'BrowserBack', 'GoBack', 'Back'
    else if (
      key === 'Escape' || 
      key === 'Backspace' || 
      key === 'BrowserBack' || 
      key === 'GoBack' || 
      key === 'Back' || 
      code === 27 || 
      code === 8 || 
      code === 4 || 
      code === 166 || 
      code === 10009 || 
      code === 461
    ) {
      handled = true;
      if (handlers.onBack) {
        handlers.onBack();
      }
    }
    // Play / Pause (LG: 415, 19 | Tizen: 415, 19, 10252)
    else if (code === 415 || code === 19 || code === 10252 || key === 'MediaPlayPause') {
      handled = true;
      if (handlers.onPlayPause) {
        handlers.onPlayPause();
      }
    }
    // Canal + (33)
    else if (code === 33 || key === 'ChannelUp') {
      handled = true;
      if (handlers.onChannelUp) {
        handlers.onChannelUp();
      } else if (handlers.onUp) {
        handlers.onUp();
      }
    }
    // Canal - (34)
    else if (code === 34 || key === 'ChannelDown') {
      handled = true;
      if (handlers.onChannelDown) {
        handlers.onChannelDown();
      } else if (handlers.onDown) {
        handlers.onDown();
      }
    }

    // Previne comportamento padrão apenas se a tecla foi tratada
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, [handlers, ...deps]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [handleKeyDown]);
}
