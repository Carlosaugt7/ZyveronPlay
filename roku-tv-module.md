# Plano de Implementação — Módulo Nativo Roku TV (Roku OS)

## 1. Visão Geral
Criação do módulo nativo oficial **Zyveron Play** para televisores e dispositivos de streaming **Roku** (Roku TV, Roku Express, Roku Streaming Stick, Roku Streambar).

Diferente de Samsung (Tizen) e LG (webOS), o sistema operacional Roku OS não utiliza navegador web/HTML5, e sim sua própria linguagem e framework de renderização nativa de alta performance:
- **Linguagem:** BrightScript (.brs)
- **UI Framework:** Roku SceneGraph (RSG - nós XML)
- **Engine de Mídia:** Roku Video Node com suporte acelerado por hardware para HLS (.m3u8), TS e MP4
- **Formato Oficial de Entrega:** Arquivo compactado com manifest na raiz (`ZyveronPlay_Roku_2.0.0.zip`) pronto para submissão na Roku Channel Store e para Sideload direto em TVs em Modo Desenvolvedor.

---

## 2. Estrutura de Arquivos

```
roku-tv/
├── manifest
├── source/
│   ├── main.brs
│   ├── device.brs
│   ├── api.brs
│   ├── storage.brs
│   └── utils.brs
├── components/
│   ├── MainScene.xml
│   ├── MainScene.brs
│   ├── ActivationScreen.xml
│   ├── ActivationScreen.brs
│   ├── HomeView.xml
│   ├── HomeView.brs
│   ├── LiveTvView.xml
│   ├── LiveTvView.brs
│   ├── VodView.xml
│   ├── VodView.brs
│   ├── PlayerView.xml
│   ├── PlayerView.brs
│   ├── ExitDialog.xml
│   └── ExitDialog.brs
├── images/
│   ├── mm_icon_focus_hd.png
│   ├── mm_icon_focus_fhd.png
│   ├── splash_screen_hd.png
│   ├── splash_screen_fhd.png
│   └── icon.png
├── scripts/
│   ├── package-roku.cjs
│   ├── build-roku.bat
│   └── build-roku.ps1
├── GUIA_SUBMISSAO_ROKU.md
└── README.md
```

---

## 3. Diretrizes de Projeto
- **Purple Ban:** Interface em tema escuro (`#0b0f19`, `#121826`, `#1e293b`), destaques em Cyan (`#06b6d4`, `#0891b2`) e texto em branco/cinza claro. Proibido tons de roxo/violeta.
- **Identificador de Dispositivo:** Gerado via `roDeviceInfo.GetChannelClientId()` formatado em pares hexadecimais (ex: `ROKU:A1:B2:C3:D4:E5:F6`) para ativação no painel Firestore de forma idêntica ao MAC.
- **Nome do Servidor Dinâmico:** Sempre obtido do Firestore ou da API Xtream, sem fixar nomes hardcoded no código.
