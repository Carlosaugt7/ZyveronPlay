import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Detecção IMEDIATA de Smart TV
const isSmartTv = /(web0s|webos|tizen|smarttv|smart-tv|viera|bravia|netcast|crkey)/i.test(navigator.userAgent);
const isLgWebOs = /(web0s|webos)/i.test(navigator.userAgent);

console.log('[Zyveron Init] User Agent:', navigator.userAgent);
console.log('[Zyveron Init] É Smart TV?', isSmartTv);
console.log('[Zyveron Init] É LG webOS?', isLgWebOs);

// Proteção de histórico ANTES de tudo
try {
  // Cria múltiplos estados no histórico para dificultar saída
  for (let i = 0; i < 10; i++) {
    window.history.pushState({ app: 'zyveron', index: i }, '', window.location.href);
  }
  
  window.addEventListener('popstate', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    window.history.pushState({ app: 'zyveron' }, '', window.location.href);
    console.log('[Zyveron] Bloqueou popstate');
    return false;
  }, true);
} catch (err) {
  console.error('[Zyveron] Erro na proteção de histórico:', err);
}

if (isSmartTv) {
  console.log('[Zyveron] ========== MODO SMART TV ATIVADO ==========');
  
  // FORÇA modo D-Pad na LG webOS
  if (isLgWebOs) {
    console.log('[Zyveron] LG webOS detectado - aplicando correções específicas');
    
    // API webOS - tentar múltiplas vezes
    const tryHideCursor = () => {
      try {
        if ((window as any).webOSSystem?.cursor) {
          (window as any).webOSSystem.cursor('hidden');
          console.log('[Zyveron] ✅ Cursor webOS escondido');
        }
      } catch (err) {
        console.warn('[Zyveron] ⚠️ Falha ao esconder cursor webOS:', err);
      }
    };
    
    tryHideCursor();
    setTimeout(tryHideCursor, 100);
    setTimeout(tryHideCursor, 500);
    setTimeout(tryHideCursor, 1000);
  }
  
  // CSS ULTRA AGRESSIVO - injeta MÚLTIPLAS vezes
  const injectCursorCSS = () => {
    const style = document.createElement('style');
    style.id = `smart-tv-fix-${Date.now()}`;
    style.textContent = `
      * { cursor: none !important; }
      html, html *, body, body * { cursor: none !important; }
      video { cursor: none !important; }
    `;
    document.head.appendChild(style);
  };
  
  injectCursorCSS();
  setTimeout(injectCursorCSS, 100);
  setTimeout(injectCursorCSS, 500);
  
  // Força classes
  document.documentElement.classList.add('smart-tv');
  document.body.classList.add('smart-tv');
  document.documentElement.style.cursor = 'none';
  document.body.style.cursor = 'none';
  
  // Bloqueia TODOS os eventos de mouse
  const blockAllMouse = (e: Event) => {
    const target = e.target as HTMLElement;
    if (target) {
      target.style.cursor = 'none';
      target.style.pointerEvents = 'auto';
    }
  };
  
  ['mousemove', 'mouseenter', 'mouseover', 'mouseout', 'mouseleave'].forEach(event => {
    document.addEventListener(event, blockAllMouse, { capture: true, passive: true });
  });
  
  // Captura TODAS as teclas em modo capture
  window.addEventListener('keydown', (e) => {
    const code = e.keyCode || e.which;
    const key = e.key;
    
    console.log('[Zyveron] 🎮 Tecla:', { code, key, which: e.which });
    
    // VOLTAR - PREVINE tudo
    if (code === 461 || code === 10009 || key === 'Back' || key === 'Backspace' || code === 8 || code === 27) {
      console.log('[Zyveron] 🛑 VOLTAR detectado - BLOQUEANDO');
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      // Dispara evento customizado para o app reagir
      window.dispatchEvent(new CustomEvent('smartTvBack'));
      return false;
    }
    
    // Setas - deixa passar MAS previne default
    if ([37, 38, 39, 40].includes(code) || key.startsWith('Arrow')) {
      e.preventDefault();
      console.log('[Zyveron] ➡️ Seta detectada');
    }
  }, { capture: true });
  
  // Força foco após tudo carregar
  const forceFocus = () => {
    setTimeout(() => {
      const focusable = document.querySelector('button, [tabindex="0"], a[href]') as HTMLElement;
      if (focusable) {
        focusable.focus();
        console.log('[Zyveron] ✅ Foco forçado em:', focusable.tagName, focusable.className);
      } else {
        console.warn('[Zyveron] ⚠️ Nenhum elemento focável encontrado');
      }
    }, 300);
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', forceFocus);
  } else {
    forceFocus();
  }
  
  // Re-aplica foco periodicamente
  setInterval(() => {
    if (document.activeElement === document.body || document.activeElement === null) {
      console.log('[Zyveron] ⚠️ Foco perdido - reforçando');
      forceFocus();
    }
  }, 2000);
  
} else {
  console.log('[Zyveron] Modo Desktop ativado');
  
  let lastMouseX = 0;
  let lastMouseY = 0;
  
  window.addEventListener('mousemove', (e) => {
    if (Math.abs(e.clientX - lastMouseX) > 30 || Math.abs(e.clientY - lastMouseY) > 30) {
      document.body.classList.add('mouse-enabled');
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    }
  });

  window.addEventListener('keydown', (e) => {
    const code = e.keyCode || e.which;
    if ([37, 38, 39, 40, 13, 27, 8].includes(code) || e.key.startsWith('Arrow')) {
      document.body.classList.remove('mouse-enabled');
    }
  });
}

console.log('[Zyveron] ========== INICIALIZANDO APP ==========');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
