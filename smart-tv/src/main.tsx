import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Detecção avançada de Smart TV (LG webOS, Samsung Tizen, Android TV, etc.)
const isSmartTv = /(web0s|webos|tizen|smarttv|smart-tv|viera|bravia|netcast|crkey)/i.test(navigator.userAgent);

if (isSmartTv) {
  // webOS Magic Remote API (desliga o cursor do mouse e força modo D-Pad)
  if ((window as any).webOSSystem) {
    try {
      (window as any).webOSSystem.cursor?.('hidden');
    } catch {}
  }

  // Foco inicial automático para que o webOS reconheça o D-Pad na hora
  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      const firstBtn = document.querySelector('button, [tabindex="0"]') as HTMLElement;
      firstBtn?.focus();
    }, 400);
  });
} else {
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
