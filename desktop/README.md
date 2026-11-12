# 🖥️ Zyveron Play Desktop (Windows & Linux)

Aplicativo Desktop oficial do ecossistema **Zyveron Play**, desenvolvido em **Electron** e **React** para sistemas **Windows (10/11 x64)** e **Linux (x64)**.

---

## 🚀 Características Principais

1. **Identidade de Hardware Real**:
   - Detecta automaticamente o endereço MAC físico da placa de rede ativa (Ethernet ou Wi-Fi), ignorando adaptadores virtuais (WSL, Docker, Hyper-V, VMware).
   - Gera e persiste a chave de dispositivo de 6 dígitos (*Device Key*).
   - Integração direta em tempo real com o **Firebase Firestore** e o **Painel Zyveron Play**.
2. **Reprodução IPTV sem Bloqueios (CORS & Mixed Content Bypass)**:
   - Suporte nativo a streams HTTP/HTTPS e portas personalizadas de servidores Xtream Codes sem restrições de CORS ou Mixed Content do navegador.
   - Decodificação de vídeo e aceleração por hardware GPU ativadas (`--enable-gpu-rasterization`, `--enable-zero-copy`).
3. **Interface Frameless com TitleBar Customizada**:
   - Barra de título estilizada e escura com botões de controle: Minimizar, Maximizar/Restaurar, Fechar e Tela Cheia.
   - Área superior arrastável com suporte a clique duplo para maximizar/restaurar.
   - Quando um canal ou filme entra em tela cheia, a TitleBar é ocultada automaticamente para imersão total.
4. **Atalhos e Navegação**:
   - `F11`: Alternar Tela Cheia (Fullscreen).
   - `Esc`: Sair da Tela Cheia / Voltar para a tela anterior.
   - `Setas Direcionais` (Cima, Baixo, Esquerda, Direita): Navegação D-Pad / Teclado.
   - `Enter` / `Barra de Espaço`: Selecionar / Play / Pause.
   - Mouse: Cliques e rolagem 100% suportados.

---

## 📦 Como Compilar

### 1. Pré-requisitos
- Node.js v20+ ou v24+
- `pnpm` ou `npm`

### 2. Instalação das Dependências
```bash
cd desktop
pnpm install
```

### 3. Execução em Modo de Desenvolvimento
```bash
pnpm start
```

### 4. Gerar Binários para Windows
```bash
# Gera o Instalador Setup (.exe) e o Executável Portátil (.exe)
pnpm run dist:win
```
Os arquivos gerados são salvos em `desktop/release/`:
- `Zyveron Play-Setup-1.0.0.exe`: Instalador completo NSIS (Cria atalho na Área de Trabalho e Menu Iniciar).
- `Zyveron Play-Portable-1.0.0.exe`: Versão portátil direta (não requer instalação).
- `win-unpacked/Zyveron Play.exe`: Executável desembalado para testes imediatos.

### 5. Gerar Binários para Linux
```bash
pnpm run dist:linux
```
Gera o pacote autônomo Linux em `desktop/release/`:
- `Zyveron Play-1.0.0-linux-x64.zip` / `linux-unpacked/zyveron-play-desktop`

---

## 🔗 Estrutura dos Arquivos

```
desktop/
├── build/
│   ├── icon.ico           # Ícone do aplicativo para Windows
│   └── icon.png           # Ícone de alta resolução (256x256)
├── scripts/
│   ├── copy-ui.cjs        # Copia o bundle compilado do smart-tv para desktop/ui
│   └── generate-ico.cjs   # Gerador automático do arquivo .ico a partir do PNG
├── src/
│   ├── main.cjs           # Processo Principal do Electron (Janela, GPU, MAC físico, IPC)
│   └── preload.cjs        # Context Bridge seguro expondo window.electronAPI
├── electron-builder.json  # Configuração de empacotamento para Windows e Linux
└── package.json           # Scripts de build e dependências
```

