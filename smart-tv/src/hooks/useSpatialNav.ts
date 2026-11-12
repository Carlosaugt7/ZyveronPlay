import { useEffect, useCallback, useRef } from 'react';

export interface SpatialNavHandler {
  onUp?: () => void;
  onDown?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
  onSelect?: () => void;
  onLongSelect?: () => void;
  onBack?: () => void;
  onPlayPause?: () => void;
  onChannelUp?: () => void;
  onChannelDown?: () => void;
  onRed?: () => void;
  onGreen?: () => void;
  onYellow?: () => void;
  onBlue?: () => void;
  disabled?: boolean;
  priority?: number;
}

// Verifica se o evento de teclado corresponde a qualquer tecla de VOLTAR de Smart TVs
export function isBackKeyEvent(e: KeyboardEvent): boolean {
  const code = e.keyCode || e.which;
  const key = (e.key || '').toLowerCase();

  return (
    key === 'escape' ||
    key === 'backspace' ||
    key === 'browserback' ||
    key === 'goback' ||
    key === 'back' ||
    key === 'exit' ||
    key === 'cancel' ||
    key === 'uireturn' ||
    key === 'xf86back' ||
    (key === 'return' && code !== 13) ||
    code === 27 || // Escape
    code === 8 || // Backspace
    code === 4 || // Android TV / Fire TV KEYCODE_BACK
    code === 166 || // Windows / Chrome BrowserBack
    code === 10009 || // Samsung Tizen Return
    code === 461 || // LG webOS Back
    code === 283 || // LG NetCast / webOS legado
    code === 10182 || // Philips Back
    code === 65385 || // XF86Back
    code === 216 // Skyworth Back
  );
}

// Pilha Global de Handlers de Voltar
interface BackStackEntry {
  id: number;
  callback: () => void;
  priority: number;
}

let nextHandlerId = 1;
const globalBackStack: BackStackEntry[] = [];
let lastBackTriggerTime = 0;

export function triggerGlobalBack(): boolean {
  const now = Date.now();
  if (now - lastBackTriggerTime < 280) return true;
  lastBackTriggerTime = now;

  if (globalBackStack.length > 0) {
    const topEntry = globalBackStack[globalBackStack.length - 1];
    try {
      topEntry.callback();
      return true;
    } catch (err) {
      console.error('[SpatialNav] Erro ao executar handler de voltar:', err);
    }
  }
  return false;
}

// Inicialização Global Única para Hardware e Plataformas de TV
if (typeof window !== 'undefined') {
  try {
    // 1. Samsung Tizen Input Device
    const tizenObj = (window as any).tizen;
    if (tizenObj?.tvinputdevice) {
      try { tizenObj.tvinputdevice.registerKey('Return'); } catch {}
      try { tizenObj.tvinputdevice.registerKey('Exit'); } catch {}
      try { tizenObj.tvinputdevice.registerKey('ColorF0Red'); } catch {}
      try { tizenObj.tvinputdevice.registerKey('ColorF1Green'); } catch {}
      try { tizenObj.tvinputdevice.registerKey('ColorF2Yellow'); } catch {}
      try { tizenObj.tvinputdevice.registerKey('ColorF3Blue'); } catch {}
    }
  } catch {}

  // 2. Samsung Tizen Evento Nativo de Hardware (tizenhwkey)
  window.addEventListener('tizenhwkey', (e: any) => {
    if (e.keyName === 'back' || e.keyName === 'Back') {
      triggerGlobalBack();
    }
  });

  // 3. Android TV / Cordova / Capacitor / TV Box hardware back
  document.addEventListener('backbutton', (e: any) => {
    e?.preventDefault?.();
    triggerGlobalBack();
  });

  // 4. Injeções de WebView Android TV
  (window as any).onAndroidTVBackPress = () => triggerGlobalBack();
  (window as any).onBackPressed = () => triggerGlobalBack();

  // 5. Media Station X (MSX) postMessage
  window.addEventListener('message', (e: MessageEvent) => {
    if (
      e.data === 'msx:back' ||
      e.data === 'back' ||
      e.data?.action === 'back' ||
      e.data?.event === 'back'
    ) {
      triggerGlobalBack();
    }
  });

  // 6. Histórico PopState (para WebViews que disparam history.back())
  window.addEventListener('popstate', () => {
    triggerGlobalBack();
    try {
      window.history.pushState({ nav: 'smart-tv-layer' }, '');
    } catch {}
  });

  // 7. Interceptação Global das teclas físicas de Voltar (keydown e keyup com capture)
  const handleGlobalBackKeyEvent = (e: KeyboardEvent) => {
    if (isBackKeyEvent(e)) {
      e.preventDefault();
      e.stopPropagation();
      triggerGlobalBack();
    }
  };

  window.addEventListener('keydown', handleGlobalBackKeyEvent, { capture: true });
  window.addEventListener('keyup', handleGlobalBackKeyEvent, { capture: true });

  // 8. Garante camada de histórico para o WebView nunca fechar o app diretamente
  try {
    if (window.history.state?.nav !== 'smart-tv-layer') {
      window.history.pushState({ nav: 'smart-tv-layer' }, '');
    }
  } catch {}

  // 9. Registra escuta de volta no Media Station X
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage('msx:register:back', '*');
    }
  } catch {}
}

/**
 * Hook de altíssimo desempenho para navegação espacial e controles remotos de Smart TVs
 */
export function useSpatialNav(handlers: SpatialNavHandler, deps: any[] = []) {
  const longPressTimerRef = useRef<any>(null);
  const isLongPressTriggeredRef = useRef<boolean>(false);
  const onBackRef = useRef(handlers.onBack);
  onBackRef.current = handlers.onBack;
  const disabledRef = useRef(handlers.disabled);
  disabledRef.current = handlers.disabled;

  // Gerenciamento da Pilha Global de Voltar
  useEffect(() => {
    if (!handlers.onBack || handlers.disabled) return;

    const id = nextHandlerId++;
    const priority = handlers.priority ?? 10;

    const entry: BackStackEntry = {
      id,
      priority,
      callback: () => {
        if (!disabledRef.current) {
          onBackRef.current?.();
        }
      }
    };

    // Insere mantendo ordenação por prioridade
    globalBackStack.push(entry);
    globalBackStack.sort((a, b) => a.priority - b.priority);

    return () => {
      const idx = globalBackStack.findIndex((e) => e.id === id);
      if (idx !== -1) {
        globalBackStack.splice(idx, 1);
      }
    };
  }, [handlers.onBack, handlers.disabled, handlers.priority]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (handlers.disabled) return;

    // Se for tecla de voltar, o listener global cuida
    if (isBackKeyEvent(e)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    const code = e.keyCode || e.which;
    const key = e.key;
    let handled = false;

    // Seta para Cima (38)
    if (key === 'ArrowUp' || code === 38) {
      handled = true;
      handlers.onUp?.();
    }
    // Seta para Baixo (40)
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
      if (handlers.onLongSelect) {
        if (!e.repeat && !longPressTimerRef.current) {
          isLongPressTriggeredRef.current = false;
          longPressTimerRef.current = setTimeout(() => {
            isLongPressTriggeredRef.current = true;
            handlers.onLongSelect?.();
          }, 1500);
        }
      } else {
        handlers.onSelect?.();
      }
    }
    // Botão Verde (ColorF1Green / 404 / 'g')
    else if (
      key === 'ColorF1Green' || 
      key === 'Green' || 
      code === 404 || 
      code === 10072 || 
      (!e.ctrlKey && !e.altKey && (key === 'g' || key === 'G'))
    ) {
      handled = true;
      handlers.onGreen?.();
    }
    // Botão Amarelo (ColorF2Yellow / 405 / 'y' / 'f')
    else if (
      key === 'ColorF2Yellow' || 
      key === 'Yellow' || 
      code === 405 || 
      code === 10073 || 
      (!e.ctrlKey && !e.altKey && (key === 'y' || key === 'Y' || key === 'f' || key === 'F'))
    ) {
      handled = true;
      handlers.onYellow?.();
    }
    // Botão Vermelho (ColorF0Red / 403 / 'r')
    else if (
      key === 'ColorF0Red' || 
      key === 'Red' || 
      code === 403 || 
      code === 10071 || 
      (!e.ctrlKey && !e.altKey && (key === 'r' || key === 'R'))
    ) {
      handled = true;
      handlers.onRed?.();
    }
    // Botão Azul (ColorF3Blue / 406 / 'b')
    else if (
      key === 'ColorF3Blue' || 
      key === 'Blue' || 
      code === 406 || 
      code === 10074 || 
      (!e.ctrlKey && !e.altKey && (key === 'b' || key === 'B'))
    ) {
      handled = true;
      handlers.onBlue?.();
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
  }, [handlers, ...deps]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (handlers.disabled) return;

    const code = e.keyCode || e.which;
    const key = e.key;

    if (key === 'Enter' || code === 13) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      if (handlers.onLongSelect) {
        if (!isLongPressTriggeredRef.current) {
          handlers.onSelect?.();
        }
        isLongPressTriggeredRef.current = false;
      }
    }
  }, [handlers.disabled, handlers.onSelect, handlers.onLongSelect]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
    };
  }, [handleKeyDown, handleKeyUp]);
}
