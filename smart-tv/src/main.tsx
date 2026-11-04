import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Proteção de histórico: previne que a tecla Voltar (Return/461) feche a página web da Smart TV
try {
  window.history.pushState({ app: 'zyveron' }, '', window.location.href);
  window.addEventListener('popstate', () => {
    window.history.pushState({ app: 'zyveron' }, '', window.location.href);
  });
} catch {}

// Detecção avançada de Smart TV (LG webOS, Samsung Tizen, Android TV, etc.)
const isSmartTv = /(web0s|webos|tizen|smarttv|smart-tv|viera|bravia|netcast|crkey)/i.test(navigator.userAgent);

if (isSmartTv) {
  console.log('[Zyveron] Smart TV detectada - ativando modo D-Pad');
  
  // Adiciona classe para esconder cursor globalmente
  document.documentElement.classList.add('smart-tv');
  document.body.classList.add('smart-tv');
  
  // webOS Magic Remote API (desativa o cursor do mouse e força modo D-Pad)
  if ((window as any).webOSSystem) {
    try {
      (window as any).webOSSystem.cursor?.('hidden');
      console.log('[Zyveron] Cursor do Magic Remote desativado');
    } catch (err) {
      console.warn('[Zyveron] Falha ao desativar cursor do Magic Remote:', err);
    }
  }

  // Esconde cursor CSS globalmente em Smart TVs
  const style = document.createElement('style');
  style.textContent = `
    * {
      cursor: none !important;
    }
    button, a, [role="button"] {
      cursor: none !important;
    }
  `;
  document.head.appendChild(style);
  
  // Previne que o cursor apareça ao mover o mouse
  document.addEventListener('mousemove', (e) => {
    e.preventDefault();
    if (e.target instanceof HTMLElement) {
      e.target.style.cursor = 'none';
    }
  }, true);

  // Foco inicial automático para que o webOS reconheça o D-Pad na hora
  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      const firstBtn = document.querySelector('button, [tabindex="0"]') as HTMLElement;
      if (firstBtn) {
        firstBtn.focus();
        console.log('[Zyveron] Foco inicial aplicado');
      }
    }, 400);
  });
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
