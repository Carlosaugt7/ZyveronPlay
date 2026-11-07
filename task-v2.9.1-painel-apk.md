# Plano de Implementação: v2.9.1 - Painel Gestor & Android TV

## 📋 Contexto e Decisões Aprovadas
- **P0. A**: Troca de DNS no Card substitui a Primária e atualiza apenas os aparelhos que utilizavam a Primária (mantém quem foi fixado em Contingência).
- **P1. A**: "Continue Assistindo" entra se assistido > 1 min e < 95%. Sai ao atingir >= 95%. Limite de 20 títulos recentes.
- **P1 - SEGURANÇA. A**: Categorias adultas no final da lista. PIN padrão 0000 com desbloqueio válido por sessão e opção de alterar senha nos Ajustes.
- **Frame Slow-Motion**: Remoção de `FLAG_ALLOW_NON_IDR_KEYFRAMES` e sincronia direta de frames I/IDR.
- **OTA Update**: Correção de caminho de armazenamento e permissões de URI para o instalador do sistema no Android TV.

---

## 🛠️ Fase 1: Painel Gestor (Web)
- [ ] **Task 1.1**: Atualizar `panel/src/lib/store.ts`:
  - Adicionar suporte a `updateServer(id, data)` para edição completa de servidores.
  - Ajustar `updateServerDns(serverId, newDns, fallbacks)` para atualizar apenas aparelhos com a DNS primária antiga (Opção A).
  - Aprimorar `getResellerStats(uid)` para incluir breakdown de aparelhos de sub-revendas.
- [ ] **Task 1.2**: Atualizar `panel/src/app/servers/page.tsx`:
  - Permitir cadastrar até 2 DNS de contingência no modal de cadastro.
  - Adicionar botão "Editar" em cada Card de Servidor com modal completo.
  - No modal "Trocar DNS", permitir escolher uma DNS de contingência do dropdown ou digitar manualmente.
- [ ] **Task 1.3**: Atualizar `panel/src/app/devices/page.tsx`:
  - No modal de cadastro/edição de aparelho, ao selecionar o servidor, exibir seletor de DNS com o DNS Primário e as contingências disponíveis.
- [ ] **Task 1.4**: Atualizar `panel/src/app/resellers/page.tsx`:
  - Exibir total combinado de aparelhos ativos: `Total: X (Diretos: Y | Sub-revendas: Z)`.
- [ ] **Task 1.5**: Validação TypeScript do Painel (`npx tsc --noEmit`).

---

## 📱 Fase 2: Android TV (APK)
- [ ] **Task 2.1**: Estabilização de Frames em `ZyveronPlayerManager.kt`:
  - Remover `FLAG_ALLOW_NON_IDR_KEYFRAMES`.
  - Fixar `SeekParameters.CLOSEST_SYNC` e parâmetros de decodificação estável.
- [ ] **Task 2.2**: Sistema "Continue Assistindo":
  - Criar `PlaybackProgressManager.kt` para persistir progresso (SharedPreferences em formato JSON leve).
  - Integrar salvamento de progresso no `VodPlayerScreen.kt`.
  - Adicionar pasta "▶ Continue Assistindo" em `MoviesScreen.kt` e `SeriesScreen.kt` logo após "★ Favoritos".
  - Retomar reprodução do ponto exato onde o usuário parou.
- [ ] **Task 2.3**: Conteúdo Adulto (+18) com Bloqueio PIN:
  - Criar `AdultContentHelper.kt` com detecção de tags/nomes adultos e gerenciamento de PIN de sessão.
  - Posicionar categorias adultas sempre no final da lista em `LiveTvGuideScreen.kt`, `MoviesScreen.kt` e `SeriesScreen.kt`.
  - Exibir diálogo de PIN `0000` antes de abrir a categoria/conteúdo.
- [ ] **Task 2.4**: Ajustes e Opções em `SettingsScreen.kt`:
  - Adicionar opção para "Limpar Continuar Assistindo".
  - Adicionar opção para alterar PIN de Conteúdo Adulto.
- [ ] **Task 2.5**: Correção de Atualização OTA In-App em `AppUpdateManager.kt`:
  - Salvar APK em diretório compartilhado acessível (`getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS)`).
  - Conceder permissão explícita de URI (`grantUriPermission`) para o PackageInstaller do sistema.

---

## 🚀 Fase 3: Build, Compilação e Deploy
- [ ] **Task 3.1**: Atualizar versão em `build.gradle.kts` para v2.9.1 (`versionCode: 16`).
- [ ] **Task 3.2**: Compilar APK Release (`gradlew assembleRelease`).
- [ ] **Task 3.3**: Copiar APK para `zyveron-play-tv.apk` na raiz e verificar status de commit.

