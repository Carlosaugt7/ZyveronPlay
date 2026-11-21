# Plano de Implementação: Módulo Samsung Smart TV (Tizen OS) - Zyveron Play

## 1. Visão Geral
Criação do módulo dedicado e independente `samsung-tv/` para empacotar o Zyveron Play como um aplicativo nativo Tizen Web Widget (`.wgt`), homologado para submissão na loja oficial de aplicativos da Samsung (**Samsung Smart TV Seller Office**), cobrindo modelos de TV Samsung com Tizen 4.0 até Tizen 9.0+ (2018 a 2026+), sem depender de aplicativos de terceiros como o Media Station X.

---

## 2. Metas Técnicas e Arquitetura

### 2.1 Identificação do Pacote Tizen
- **Package ID:** `zyveronply` (10 caracteres alfanuméricos)
- **Application ID:** `zyveronply.ZyveronPlay`
- **Nome Oficial:** `Zyveron Play`
- **Versão:** `2.0.0`
- **Target OS:** Tizen 4.0+ (Chromium 56+)
- **Resolução Alvo:** 1920x1080 (Full HD com auto-escala nativa Tizen para 4K UHD e 8K)

### 2.2 Estrutura do Módulo `samsung-tv/`
```text
samsung-tv/
├── config.xml              # Manifesto W3C / Tizen TV obrigatório
├── icon.png                # Ícone do app (512x512)
├── package.json            # Dependências e scripts de build
├── vite.config.ts          # Configuração Vite com target ES2015/ES2018 e base relative (./)
├── index.html              # Entrypoint com scripts do Tizen Web API
├── src/                    # Código-fonte React otimizado para Tizen
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/         # Player com AVPlay fallback, TitleBar, etc.
│   ├── views/              # HomeView, LiveTvView, MoviesView, SeriesView, SettingsView
│   ├── hooks/              # useSpatialNav (registro de teclas Tizen)
│   ├── lib/                # firebase, xtream, storage, exitApp (tizen exit)
│   └── types/
├── scripts/
│   ├── build-wgt.bat       # Script Windows para compilar e gerar .wgt
│   └── build-wgt.ps1       # Script PowerShell
├── GUIA_SUBMISSAO_SAMSUNG.md # Guia completo passo a passo para o Seller Office
└── README.md
```

### 2.3 Recursos Específicos do Tizen
1. **Registro de Teclas Físicas do Controle Remoto Samsung:**
   - Tecla Return / Voltar (`10009` / `tizenhwkey`)
   - Teclas de Mídia (`MediaPlay`, `MediaPause`, `MediaPlayPause`, `MediaStop`, `MediaFastForward`, `MediaRewind`)
   - Teclas Coloridas (`ColorF0Red`, `ColorF1Green`, `ColorF2Yellow`, `ColorF3Blue`)
2. **Permissões no `config.xml`:**
   - `http://tizen.org/privilege/internet`
   - `http://tizen.org/privilege/tv.audio`
   - `http://tizen.org/privilege/application.launch`
   - `http://developer.samsung.com/privilege/network.public`
   - `<tizen:metadata key="http://samsung.com/tv/metadata/use.avplay" value="true"/>`
   - `<access origin="*" subdomains="true"/>`
3. **Encerramento Nativo:**
   - Invocação de `window.tizen.application.getCurrentApplication().exit()` no fechamento.

---

## 3. Fases de Execução

### Fase 1: Análise e Estruturação
- Criação do diretório `samsung-tv/` e cópia dos componentes essenciais do `smart-tv`.
- Criação do `config.xml` em conformidade com as diretrizes do Samsung Smart TV Seller Office.

### Fase 2: Adaptação e Otimização para Tizen 4.0+
- Configuração do `vite.config.ts` com compatibilidade ampla para motores Chromium mais antigos (Tizen 4.0 = Chromium 56).
- Integração de polyfills e registro de teclas na inicialização do Tizen.

### Fase 3: Script de Empacotamento `.wgt`
- Automação da compilação e empacotamento do widget `.wgt`.

### Fase 4: Documentação e Guia do Samsung Seller Office
- Criação do manual passo a passo para abertura de conta, geração do certificado de autor e submissão na loja da Samsung.

---

## 4. Critérios de Sucesso
- [x] Módulo `samsung-tv/` isolado e funcional.
- [x] Build de produção compilando sem erros.
- [x] `config.xml` validado conforme as regras do Samsung Seller Office.
- [x] Pacote `.wgt` gerado e pronto para envio.
- [x] Guia de submissão documentado com clareza em pt-br.
