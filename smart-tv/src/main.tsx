import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Proteção de histórico: previne que a tecla Voltar (Return/461) feche a página web da Smart TV
try {
  window.history.pushState({ app: 'zyveron' }, '', window.location.href);
  window.addEventListener('popstate', (e) => {
    e.preventDefault();
    window.history.pushState({ app: 'zyveron' }, '', window.location.href);
  });
} catch {}

// Detecção avançada de Smart TV (LG webOS, Samsung Tizen, Android TV, etc.)
const isSmartTv = /(web0s|webos|tizen|smarttv|smart-tv|viera|bravia|netcast|crkey)/i.test(navigator.userAgent);

if (isSmartTv) {
  console.log('[Zyveron] Smart TV detectada - User Agent:', navigator.userAgent);
  console.log('[Zyveron] Ativando modo D-Pad com bloqueio de cursor');
  
  // Adiciona classe para esconder cursor globalmente
  document.documentElement.classList.add('smart-tv');
  document.body.classList.add('smart-tv');
  
  // webOS Magic Remote API (desativa o cursor do mouse e força modo D-Pad)
  if ((window as any).webOSSystem) {
    try {
      (window as any).webOSSystem.cursor('hidden');
      console.log('[Zyveron] Cursor do Magic Remote desativado com sucesso');
    } catch (err) {
      console.warn('[Zyveron] Falha ao desativar cursor do Magic Remote:', err);
    }
  }

  // Esconde cursor CSS globalmente em Smart TVs - FORÇADO
  const style = document.createElement('style');
  style.id = 'smart-tv-cursor-fix';
  style.textContent = `
    html, body, div, button, a, span, input, select, textarea, video, img, * {
      cursor: none !important;
      pointer-events: auto !important;
    }
    button:focus, a:focus, [tabindex]:focus {
      outline: 4px solid #10b981 !important;
      outline-offset: 2px !important;
    }
  `;
  document.head.appendChild(style);
  
  // Bloqueia completamente eventos de mouse
  const blockMouseEvents = (e: Event) => {
    const target = e.target as HTMLElement;
    if (target) {
      target.style.cursor = 'none';
    }
  };
  
  document.addEventListener('mousemove', blockMouseEvents, { capture: true, passive: true });
  document.addEventListener('mouseenter', blockMouseEvents, { capture: true, passive: true });
  document.addEventListener('mouseover', blockMouseEvents, { capture: true, passive: true });

  // Força foco no primeiro botão após carregar
  const initFocus = () => {
    setTimeout(() => {
      const firstFocusable = document.querySelector('button:not([disabled]), [tabindex="0"]') as HTMLElement;
      if (firstFocusable) {
        firstFocusable.focus();
        console.log('[Zyveron] Foco inicial aplicado em:', firstFocusable.tagName);
      }
    }, 500);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFocus);
  } else {
    initFocus();
  }

  // Log de teclas pressionadas para debug
  window.addEventListener('keydown', (e) => {
    console.log('[Zyveron] Tecla pressionada - Code:', e.keyCode, 'Key:', e.key, 'Which:', e.which);
  }, { capture: true });

} else {
  console.log('[Zyveron] Dispositivo Desktop detectado - modo mouse ativo');
  
  // Em computadores normais: permite mouse ao mover, e desativa ao usar teclas direcionais
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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
