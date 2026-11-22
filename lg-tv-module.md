# Plano de Implementação: Módulo LG Smart TV (webOS) - Zyveron Play

## 1. Visão Geral
Criação do módulo dedicado e independente `lg-tv/` para empacotar o Zyveron Play como um aplicativo nativo webOS (`.ipk`), homologado para submissão na loja oficial de aplicativos da LG (**LG Content Store / LG Seller Lounge**), cobrindo modelos de TV LG com webOS 4.0 até webOS 24+ (2018 a 2026+), sem depender de aplicativos de terceiros como o Media Station X.

---

## 2. Metas Técnicas e Arquitetura

### 2.1 Identificação do Pacote LG webOS
- **App ID:** `com.zyveron.play` (notação de domínio reverso em minúsculas)
- **Title:** `Zyveron Play`
- **Versão:** `2.0.0`
- **Vendor:** `Zyveron Play Team`
- **Target OS:** webOS 4.0+ (Chromium 53+ até Chromium 108+)
- **Resolução Alvo:** 1920x1080 (Full HD com auto-escala nativa do webOS para 4K UHD e OLED)

### 2.2 Estrutura do Módulo `lg-tv/`
```text
lg-tv/
├── appinfo.json            # Manifesto oficial webOS obrigatório
├── icon.png                # Ícone do app (80x80)
├── largeIcon.png           # Ícone launcher (130x130)
├── bgImage.png             # Imagem de fundo da tile no webOS (1920x1080)
├── package.json            # Dependências e scripts de build
├── vite.config.ts          # Configuração Vite com target ES2018 e base relative (./)
├── index.html              # Entrypoint com suporte ao webOS.js
├── src/                    # Código-fonte React otimizado para webOS
│   ├── main.tsx            # Inicialização com ocultação de cursor Magic Remote
│   ├── App.tsx             # Interface unificada e tratamento de encerramento
│   ├── components/         # Player HLS/TS, TitleBar, etc.
│   ├── views/              # HomeView, LiveTvView, MoviesView, SeriesView, SettingsView
│   ├── hooks/              # useSpatialNav (código 461 Back / D-pad)
│   ├── lib/                # firebase, xtream, storage, exitApp (webOS.platformBack)
│   └── types/
├── scripts/
│   ├── package-ipk.cjs     # Empacotador oficial .ipk
│   ├── build-ipk.bat       # Script Windows para compilar e gerar .ipk
│   └── build-ipk.ps1       # Script PowerShell
├── GUIA_SUBMISSAO_LG.md    # Guia completo passo a passo para o LG Seller Lounge
└── README.md
```

### 2.3 Recursos Específicos do LG webOS
1. **Controle Remoto LG Magic Remote & Teclas Físicas:**
   - Tecla Voltar (`keyCode 461` / `webOS.platformBack()`)
   - Ocultação inteligente do cursor do Magic Remote durante navegação por setas D-pad (`webOSSystem.cursor('hidden')`).
2. **Permissões no `appinfo.json`:**
   - `"network"`
   - `"media.audio"`
   - `"media.video"`
3. **Encerramento Nativo:**
   - Invocação de `window.webOS.platformBack()` e `window.close()` no encerramento.

---

## 3. Fases de Execução
- **Fase 1:** Criação da estrutura de pastas `lg-tv/`, manifesto `appinfo.json` e assets gráficos.
- **Fase 2:** Adaptação do `vite.config.ts`, `index.html` e scripts de controle do LG webOS.
- **Fase 3:** Criação do script de empacotamento `.ipk` (`scripts/package-ipk.cjs` e `build-ipk.bat`).
- **Fase 4:** Teste de compilação, geração do pacote `com.zyveron.play_2.0.0_all.ipk` e documentação `GUIA_SUBMISSAO_LG.md`.

---

## 4. Critérios de Sucesso
- [x] Módulo `lg-tv/` isolado e funcional.
- [x] Build de produção compilando sem erros.
- [x] `appinfo.json` validado conforme as regras da LG Content Store.
- [x] Pacote `.ipk` gerado e pronto para envio.
- [x] Guia de submissão documentado com clareza em pt-br.
