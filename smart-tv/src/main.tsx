import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { triggerGlobalBack, isBackKeyEvent } from './hooks/useSpatialNav';

// Detecção IMEDIATA de Smart TV
const isSmartTv = /(web0s|webos|tizen|smarttv|smart-tv|viera|bravia|netcast|crkey)/i.test(navigator.userAgent);
const isLgWebOs = /(web0s|webos)/i.test(navigator.userAgent);

console.log('[Zyveron Init] User Agent:', navigator.userAgent);
console.log('[Zyveron Init] É Smart TV?', isSmartTv);
console.log('[Zyveron Init] É LG webOS?', isLgWebOs);

// Escuta evento customizado de voltar caso algum módulo o dispare
window.addEventListener('smartTvBack', () => {
  console.log('[Zyveron] smartTvBack recebido -> acionando triggerGlobalBack');
  triggerGlobalBack();
});

if (isSmartTv) {
  console.log('[Zyveron] ========== MODO SMART TV ATIVADO ==========');
  
  // Esconde cursor de mouse na LG webOS
  if (isLgWebOs) {
    const tryHideCursor = () => {
      try {
        if ((window as any).webOSSystem?.cursor) {
          (window as any).webOSSystem.cursor('hidden');
        }
      } catch {}
    };
    
    tryHideCursor();
    setTimeout(tryHideCursor, 500);
  }
  
  // Classes globais
  document.documentElement.classList.add('smart-tv');
  document.body.classList.add('smart-tv');
  
  // Intercepta teclas de navegação física e Voltar no nível de janela
  window.addEventListener('keydown', (e) => {
    // Se o usuário estiver digitando em um campo de busca/input, deixa as setas funcionarem no texto
    const target = e.target as HTMLElement;
    const isInputFocused = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

    if (isBackKeyEvent(e)) {
      console.log('[Zyveron] 🛑 Tecla Voltar interceptada em main.tsx');
      e.preventDefault();
      e.stopPropagation();
      triggerGlobalBack();
      return;
    }
    
    // Previne rolagem padrão do navegador nas setas se não for campo de input
    const code = e.keyCode || e.which;
    if (!isInputFocused && ([37, 38, 39, 40].includes(code) || (e.key && e.key.startsWith('Arrow')))) {
      e.preventDefault();
    }
  }, { capture: true });

  window.addEventListener('keyup', (e) => {
    if (isBackKeyEvent(e)) {
      e.preventDefault();
      e.stopPropagation();
      triggerGlobalBack();
    }
  }, { capture: true });

  // Força foco após tudo carregar
  const forceFocus = () => {
    setTimeout(() => {
      if (document.activeElement === document.body || document.activeElement === null) {
        const focusable = document.querySelector('button, [tabindex="0"], a[href]') as HTMLElement;
        if (focusable) {
          focusable.focus();
        }
      }
    }, 300);
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', forceFocus);
  } else {
    forceFocus();
  }
} else {
  console.log('[Zyveron] Modo Desktop / Navegador ativado');
  
  window.addEventListener('keydown', (e) => {
    if (isBackKeyEvent(e)) {
      triggerGlobalBack();
    }
  }, { capture: true });
}

console.log('[Zyveron] ========== INICIALIZANDO APP ==========');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
