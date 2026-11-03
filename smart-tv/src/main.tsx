import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Detecção de Smart TV (LG webOS, Samsung Tizen, Android/Google TV, etc.)
const isSmartTv = /(web0s|webos|tizen|smarttv|smart-tv|viera|bravia|netcast|crkey)/i.test(navigator.userAgent);

if (isSmartTv) {
  // Em Smart TVs, fixa permanentemente o modo controle remoto e oculta o cursor do mouse
  document.body.classList.add('tv-remote-mode');
  
  // webOS Magic Remote API (oculta o ponteiro flutuante da LG)
  if ((window as any).webOSSystem) {
    try {
      (window as any).webOSSystem.cursor?.('hidden');
    } catch {}
  }
} else {
  // Em computadores Desktop / Notebook: permite alternar entre D-Pad/Teclado e Mouse
  window.addEventListener('keydown', (e) => {
    const code = e.keyCode || e.which;
    if ([37, 38, 39, 40, 13, 10009, 461].includes(code) || e.key.startsWith('Arrow') || e.key === 'Enter') {
      document.body.classList.add('tv-remote-mode');
    }
  });

  let lastMouseX = 0;
  let lastMouseY = 0;
  window.addEventListener('mousemove', (e) => {
    if (Math.abs(e.clientX - lastMouseX) > 40 || Math.abs(e.clientY - lastMouseY) > 40) {
      document.body.classList.remove('tv-remote-mode');
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
