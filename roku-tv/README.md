# Zyveron Play — Módulo Nativo Roku TV (Roku OS)

Módulo nativo oficial do **Zyveron Play** desenvolvido para dispositivos e Smart TVs **Roku** (TCL Roku TV, Philco Roku TV, AOC Roku TV, Roku Express, Roku Streaming Stick e Streambar).

---

## 🛠️ Tecnologias Utilizadas
- **Linguagem:** BrightScript (.brs)
- **Framework de Interface:** Roku SceneGraph (RSG) com nós XML acelerados por hardware
- **Player de Mídia:** Nó nativo `Video` com suporte a fluxos HLS (.m3u8), TS e MP4
- **Autenticação:** Integração direta com a API REST do Firebase Firestore
- **Provedores de Mídia:** Conexão nativa com a API Xtream Codes (Ao Vivo, Filmes e Séries)
- **Pacote de Distribuição:** Arquivo `ZyveronPlay_Roku_2.0.0.zip`

---

## 📁 Estrutura do Módulo

```
roku-tv/
├── manifest                     # Manifesto oficial do canal Roku
├── source/                      # Códigos de inicialização, APIs e utilitários
│   ├── main.brs                 # Ponto de entrada (RunUserInterface)
│   ├── device.brs               # Identificação exclusiva do aparelho Roku (formato MAC)
│   ├── api.brs                  # Cliente HTTP para Firestore REST e Xtream Codes
│   ├── storage.brs              # Gerenciador de persistência local (roRegistrySection)
│   └── utils.brs                # Formatadores e utilitários
├── components/                  # Telas e componentes SceneGraph (XML + BRS)
│   ├── MainScene.xml/.brs       # Cena principal, roteamento de telas e atalhos
│   ├── ActivationScreen.xml/.brs# Tela de ativação com Device ID e Código
│   ├── HomeView.xml/.brs        # Painel inicial com categorias e dados dinâmicos
│   ├── LiveTvView.xml/.brs      # Lista de canais ao vivo por categorias
│   ├── VodView.xml/.brs         # Catálogo de filmes e séries com pôsteres
│   ├── PlayerView.xml/.brs      # Player em tela cheia com buffer e controles
│   └── ExitDialog.xml/.brs      # Modal nativo de confirmação de saída
├── images/                      # Ícones e telas de carregamento para a Roku Store
├── scripts/                     # Scripts de automação e empacotamento
│   ├── package-roku.cjs         # Empacotador autônomo Node.js
│   ├── build-roku.bat           # Executável de 1 clique para Windows
│   └── build-roku.ps1           # Script PowerShell
├── GUIA_SUBMISSAO_ROKU.md       # Manual completo de criação de conta e publicação
└── ZyveronPlay_Roku_2.0.0.zip   # Pacote pronto para submissão e sideload
```

---

## 🚀 Como Empacotar

Para gerar uma nova versão do pacote `.zip`, execute:
```bash
node scripts/package-roku.cjs
```
Ou dê duplo clique em `scripts/build-roku.bat`.
