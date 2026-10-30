# Especificação Técnica e Plano de Execução - Fase 2
## Projeto: Zyveron Play - Aplicativo Android TV Nativo

---

### 1. Visão Geral da Fase 2
Desenvolver o aplicativo nativo para Android TV, Fire TV Stick e TV Boxes com foco em **máxima fluidez a 60fps no controle remoto (D-Pad)**, **inicialização rápida**, **reprodução ultra-resiliente via Media3 (ExoPlayer)** e **ativação por Virtual MAC + Device Key**.

* **Plataforma Alvo:** Android TV 7.0+ (API 24+) até Android TV 14+.
* **Linguagem & Framework:** Kotlin, AndroidX Media3 (ExoPlayer), Jetpack Compose for TV / Leanback, Room Database (SQLite + FTS5).
* **Comunicação em Nuvem:** Firebase Firestore SDK (Realtime Listeners para ativação instantânea, corte de sinal e mensagens).
* **Diretriz Visual:** *Cinematic Stealth Dark* (`#090D12` e `#0C121A`), acentos de foco em esmeralda/azul e alto contraste no cursor. **Banimento estrito de cores roxas/violetas.**

---

### 2. Módulos de Engenharia do Aplicativo

#### A. Identificação e Ativação do Dispositivo
* **Virtual MAC Address:**
  * Coleta de identificador imutável de hardware via `MediaDrm.PROPERTY_DEVICE_UNIQUE_ID` (com fallback seguro para `Settings.Secure.ANDROID_ID`).
  * Formatação em padrão MAC: `XX:XX:XX:XX:XX:XX`.
* **Device Key (PIN):**
  * Geração e persistência segura (Android Keystore / EncryptedSharedPreferences) de um PIN aleatório de 6 dígitos.
* **Tela de Boas-Vindas & Ativação:**
  * Exibição clara e legível à distância do MAC e Device Key.
  * *Realtime Listener* no Firestore: no momento em que o painel web ativar o aparelho, a tela avança automaticamente para o catálogo sem necessidade de reiniciar o app.

#### B. Motor de Reprodução (Media3 / ExoPlayer Otimizado)
* **Tolerância a Descontinuidade MPEG-TS:**
  * Configuração de `DefaultExtractorsFactory` com flags de tolerância a saltos de pacotes (`FLAG_ALLOW_NON_IDR_KEYFRAMES`, `FLAG_DETECT_ACCESS_UNITS`).
* **Buffer Adaptativo Inteligente:**
  * Início rápido de reprodução (Buffer inicial de ~1.5s a 2.5s para zapping veloz).
  * Buffer elástico para absorver instabilidades de rede sem congelamentos súbitos.
* **Headers Customizáveis & User-Agent:**
  * Suporte a emulação de headers HTTP (evitando bloqueios `HTTP 403 Forbidden` de provedores Xtream).
* **Reconexão com Exponential Backoff:**
  * Recuperação de conexão sem congelar a UI quando a operadora ou o Wi-Fi oscilar.

#### C. Interface TV (D-Pad First & 60fps)
* **OSD (On-Screen Display) de Zapping Veloz:**
  * Troca rápida de canal cima/baixo sem fechar a reprodução.
  * Barra de informações transparente exibindo nome do canal, número, programa atual/próximo e indicador de qualidade.
* **Navegação em Grade (EPG & Categorias):**
  * Lista vertical de categorias com carrossel horizontal de canais/VODs.
  * Indicador de foco evidente com elevação sutil e borda de alto contraste.
* **Recepção de Mensagens / Notificações em Tempo Real:**
  * Diálogo não-bloqueante no topo da tela quando o painel web disparar um aviso.

---

### 3. Estrutura de Arquitetura do Código Android
```
android-tv/
├── app/
│   ├── src/main/java/com/zyveron/play/
│   │   ├── data/
│   │   │   ├── local/ (Room DB, DAOs, Entidades)
│   │   │   ├── remote/ (Xtream API Client, Firebase Firestore Service)
│   │   │   └── repository/ (DeviceRepository, StreamRepository, ConfigRepository)
│   │   ├── player/
│   │   │   ├── ZyveronPlayerManager.kt (Engine Media3 / ExoPlayer)
│   │   │   ├── BufferConfig.kt
│   │   │   └── StreamErrorRecovery.kt
│   │   ├── ui/
│   │   │   ├── activation/ (Tela de MAC + PIN)
│   │   │   ├── live/ (Player Live TV + Mini-EPG + Zapping)
│   │   │   ├── vod/ (Filmes e Séries)
│   │   │   ├── components/ (Foco D-Pad, Cards, Diálogos de Notificação)
│   │   │   └── theme/ (Cores, Tipografia, Foco)
│   │   └── util/
│   │       ├── DeviceIdentityHelper.kt (Virtual MAC & Device Key)
│   │       └── NetworkObserver.kt
```

