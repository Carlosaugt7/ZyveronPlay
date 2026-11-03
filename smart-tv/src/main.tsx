import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Ativa o modo controle remoto e esconde o cursor de mouse nas Smart TVs LG / Samsung
window.addEventListener('keydown', (e) => {
  const code = e.keyCode || e.which;
  if ([37, 38, 39, 40, 13, 10009, 461].includes(code) || e.key.startsWith('Arrow') || e.key === 'Enter') {
    document.body.classList.add('tv-remote-mode');
  }
});

let lastMouseX = 0;
let lastMouseY = 0;
window.addEventListener('mousemove', (e) => {
  if (Math.abs(e.clientX - lastMouseX) > 25 || Math.abs(e.clientY - lastMouseY) > 25) {
    document.body.classList.remove('tv-remote-mode');
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

