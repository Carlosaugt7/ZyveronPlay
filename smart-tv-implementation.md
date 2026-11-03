# Plano de Implementação: Zyveron Smart TV (Samsung Tizen & LG webOS)

## 🎯 Objetivo
Criar uma aplicação Web TV moderna, ultraleve e responsiva em `smart-tv/` (Vite + React + TypeScript + Tailwind CSS), operável 100% via controle remoto (D-Pad), com aceleração de hardware de vídeo (Hls.js / HTML5), consumo mínimo de memória RAM (< 50MB) via virtualização de listas, e compatível tanto com navegadores de Smart TVs quanto para empacotamento em `.wgt` (Tizen) e `.ipk` (webOS).

---

## 📋 Fases e Tarefas

### Fase 1: Setup do Projeto e Arquitetura Base
- [x] Inicializar o workspace `smart-tv/` com Vite, React, TypeScript e Tailwind CSS.
- [x] Configurar viewport fixo 1080p/4K para TV (`1920x1080` base scale) e tema visual escuro idêntico ao Zyveron Play.
- [x] Criar manifestos de empacotamento: `config.xml` (Samsung Tizen) e `appinfo.json` (LG webOS).

### Fase 2: Ativação por MAC Virtual e Integração Firebase
- [x] Implementar gerador de MAC virtual (`XX:XX:XX:XX:XX:XX`) e Device Key de 6 dígitos persistido em `localStorage`/`IndexedDB`.
- [x] Criar tela de ativação idêntica à do Android (exibindo MAC, Device Key, status de expiração e opção de restaurar MAC).
- [x] Integrar leitura do Firestore para consultar `devices/{mac}` (status, validade e servidor Xtream atribuído).

### Fase 3: Motor de Navegação Espacial (D-Pad para Controle Remoto)
- [x] Implementar hook de navegação por controle remoto (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `Enter`, `Back`).
- [x] Adicionar indicadores de foco visual de alto contraste para botões, cards de canais e categorias.

### Fase 4: Listas Otimizadas e Xtream Codes API
- [x] Integrar cliente da API Xtream Codes (`get_live_categories`, `get_live_streams`, `get_vod_categories`, `get_series`).
- [x] Implementar virtualização de lista (renderizando apenas 8 a 10 itens visíveis na tela) com consumo de RAM < 40MB.
- [x] Armazenar cache de categorias no `IndexedDB` para inicialização instantânea.

### Fase 5: Player de Vídeo para TV com Hls.js
- [x] Implementar componente de vídeo com `Hls.js` e suporte a fallback de streams MPEG-TS / MP4.
- [x] Calibrar buffer leve (1-2s para início imediato, teto de 15s para não sobrecarregar a TV).
- [x] Criar OSD (On-Screen Display) de reprodução: número do canal, nome, logo, barra de tempo e controle de áudio/legenda.

### Fase 6: Verificação e Build de Produção
- [x] Executar build de produção (`pnpm run build` ou `npm run build`) validando bundle estático em `smart-tv/dist/`.
- [x] Testar navegação por teclado e simulação de controle de Smart TV.
- [x] Documentar guia de publicação (URL Web e empacotamento Tizen/webOS).

