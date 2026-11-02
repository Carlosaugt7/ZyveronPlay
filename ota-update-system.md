# Plano: Sistema de Atualização OTA (Over-The-Air) In-App no Zyveron Play

> **Objetivo:** Permitir que o cliente atualize o APK diretamente pela TV no menu **Ajustes**, com download em segundo plano e disparo do instalador nativo do Android, sem links externos ou Downloader.

---

## 1. Escopo e Decisões Aprovadas
* **Fonte de Versão:** Cloud Firestore (`system_config/app_update`) com fallback seguro para o link direto do APK no repositório GitHub.
* **Gatilho:** Apenas Manual (quando o cliente clica em *"Verificar Atualizações"* em Ajustes > Meu App).
* **Permissão no Android TV:** Detecção automática de `canRequestPackageInstalls()`. Se não concedida, orienta e redireciona direto para a tela de configurações do sistema.

---

## 2. Tarefas de Implementação

### Fase 1: Manifesto e Permissões Android
- [ ] Adicionar permissão `REQUEST_INSTALL_PACKAGES` no `AndroidManifest.xml`.
- [ ] Configurar `androidx.core.content.FileProvider` no `AndroidManifest.xml`.
- [ ] Criar `android-tv/app/src/main/res/xml/file_paths.xml` com mapeamento de cache e arquivos externos.

### Fase 2: Gerenciador de Atualização OTA (`AppUpdateManager.kt`)
- [ ] Criar classe `AppUpdateManager` em `com.zyveron.play.util`:
  - Consulta ao documento Firestore `system_config/app_update`.
  - Comparação de versão com `BuildConfig.VERSION_CODE`.
  - Download seguro do APK com stream de progresso (0% a 100%).
  - Verificação e solicitação de permissão de fontes desconhecidas no Android TV.
  - Criação da Intent com `FileProvider` e disparo de `ACTION_VIEW` (`application/vnd.android.package-archive`).

### Fase 3: Interface no Menu Ajustes (`SettingsScreen.kt`)
- [ ] Atualizar o card do Aplicativo na aba "Meu App":
  - Exibir versão instalada (`v${BuildConfig.VERSION_NAME}`).
  - Botão navegável por D-Pad: *"🔄 Verificar Atualizações"*.
  - Modal/Diálogo de Atualização com notas da versão e botão *"Baixar e Atualizar"*.
  - Barra de progresso visual de download na TV.
  - Alerta de permissão orientando ativar fontes desconhecidas caso necessário.

### Fase 4: Inicialização no Firestore / Painel Web
- [ ] Garantir que o Firestore possua o registro padrão em `system_config/app_update` com a versão atual, link do APK e notas de release.

### Fase 5: Compilação, Verificação e Deploy
- [ ] Compilar APK Release (`gradlew assembleRelease`).
- [ ] Copiar para `zyveron-play-tv.apk`.
- [ ] Testar comandos e sincronização.
- [ ] Commit e Push para `origin/main`.
