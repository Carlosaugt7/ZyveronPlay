import { useEffect, useCallback, useRef } from 'react';

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

// Registra teclas de TV em ambientes Samsung Tizen e webOS se presentes
if (typeof window !== 'undefined') {
  try {
    const tizenObj = (window as any).tizen;
    if (tizenObj?.tvinputdevice) {
      tizenObj.tvinputdevice.registerKey('Return');
      tizenObj.tvinputdevice.registerKey('Exit');
      tizenObj.tvinputdevice.registerKey('ColorF0Red');
      tizenObj.tvinputdevice.registerKey('ColorF1Green');
      tizenObj.tvinputdevice.registerKey('ColorF2Yellow');
      tizenObj.tvinputdevice.registerKey('ColorF3Blue');
    }
  } catch {}
}

/**
 * Hook de altíssimo desempenho para interceptar controles remotos de Smart TVs
 * Suporta Media Station X (MSX), LG webOS, Samsung Tizen, Android TV, Fire TV, Roku e PC.
 */
export function useSpatialNav(handlers: SpatialNavHandler, deps: any[] = []) {
  const lastBackRef = useRef<number>(0);

  const triggerBack = useCallback(() => {
    const now = Date.now();
    if (now - lastBackRef.current < 250) return;
    lastBackRef.current = now;
    handlers.onBack?.();
  }, [handlers.onBack]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (handlers.disabled) return;

    const code = e.keyCode || e.which;
    const key = e.key;

    let handled = false;

    // Seta para Cima (38) ou Canal + (33)
    if (key === 'ArrowUp' || code === 38) {
      handled = true;
      handlers.onUp?.();
    }
    // Seta para Baixo (40) ou Canal - (34)
    else if (key === 'ArrowDown' || code === 40) {
      handled = true;
      handlers.onDown?.();
    }
    // Seta para Esquerda (37)
    else if (key === 'ArrowLeft' || code === 37) {
      handled = true;
      handlers.onLeft?.();
    }
    // Seta para Direita (39)
    else if (key === 'ArrowRight' || code === 39) {
      handled = true;
      handlers.onRight?.();
    }
    // Seleção / OK / Enter (13)
    else if (key === 'Enter' || code === 13) {
      handled = true;
      handlers.onSelect?.();
    }
    // Voltar / Return / Back
    // Samsung Tizen: 10009
    // LG webOS: 461, 283
    // Android TV / Box / Fire TV: 4
    // Windows / Chrome: 166 (BrowserBack)
    // PC Keyboard: 27 (Escape), 8 (Backspace)
    // Philips / Sony / Outros: 65385, 10182
    // MSX / Roku: 'BrowserBack', 'GoBack', 'Back', 'Cancel', 'Exit'
    else if (
      key === 'Escape' || 
      key === 'Backspace' || 
      key === 'BrowserBack' || 
      key === 'GoBack' || 
      key === 'Back' || 
      key === 'Exit' || 
      key === 'Cancel' || 
      key === 'UIReturn' || 
      key === 'XF86Back' || 
      code === 27 || 
      code === 8 || 
      code === 4 || 
      code === 166 || 
      code === 10009 || 
      code === 461 || 
      code === 283 || 
      code === 10182 || 
      code === 65385
    ) {
      handled = true;
      triggerBack();
    }
    // Play / Pause (LG: 415, 19 | Tizen: 415, 19, 10252)
    else if (code === 415 || code === 19 || code === 10252 || key === 'MediaPlayPause') {
      handled = true;
      handlers.onPlayPause?.();
    }
    // Canal + (33)
    else if (code === 33 || key === 'ChannelUp') {
      handled = true;
      if (handlers.onChannelUp) {
        handlers.onChannelUp();
      } else {
        handlers.onUp?.();
      }
    }
    // Canal - (34)
    else if (code === 34 || key === 'ChannelDown') {
      handled = true;
      if (handlers.onChannelDown) {
        handlers.onChannelDown();
      } else {
        handlers.onDown?.();
      }
    }

    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, [handlers, triggerBack, ...deps]);

  // Captura eventos via keydown com alta prioridade
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [handleKeyDown]);

  // Captura eventos de popstate (disparados nativamente pelo Media Station X ao apertar VOLTAR no controle)
  useEffect(() => {
    if (handlers.disabled || !handlers.onBack) return;

    window.history.pushState({ nav: 'smart-tv-layer' }, '');

    const handlePopState = () => {
      triggerBack();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [handlers.onBack, handlers.disabled, triggerBack, ...deps]);
}
