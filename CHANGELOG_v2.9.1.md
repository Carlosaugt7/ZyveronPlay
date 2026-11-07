# Changelog da Versão 2.9.1 — Zyveron Play (Painel & APK Android TV)

**Data da Versão:** 07/11/2026  
**Status do Build:** Sucesso Total (Painel TS: 0 erros | APK Release: 5.01 MB gerado e validado)

---

## 🖥️ Módulo 1: Painel Gestor Web (`panel`)

### 1. Servidores / DNS
- **Botão Editar no Card**: Adicionado o botão "Editar" diretamente em cada Card de servidor, abrindo modal com todos os campos (Nome, DNS Primário, DNS de Contingência 1 e 2, Limite de Conexões, Status).
- **Até 2 DNS de Contingência**: Formulários de criação e edição agora possuem campos dedicados para cadastrar até 2 rotas alternativas de contingência (`contingencyDns1` e `contingencyDns2`).
- **Troca Rápida de DNS no Card**: Modal "Trocar DNS" agora permite selecionar uma das DNS de contingência já cadastradas via dropdown ou digitar manualmente uma nova DNS para substituir a Primária. Ao executar a troca, apenas os aparelhos que utilizavam a primária antiga são migrados, preservando os aparelhos propositalmente fixados em contingência.

### 2. Aparelhos
- **Seleção de Rota DNS Principal / Contingência**: Ao cadastrar um novo aparelho ou editar um existente, o usuário pode selecionar se o dispositivo se conectará via DNS Primário ou via Contingência 1/2 tanto para a Lista 1 quanto para a Lista 2. A lista de seleção posiciona o DNS Principal como a primeira opção.

### 3. Revendedores
- **Total de Aparelhos Ativos Combinados**: No cadastro e listagem de revendedores, a visualização agora exibe detalhadamente os aparelhos ativos diretos da revenda, os aparelhos ativos das suas sub-revendas e a soma total combinada (`Total = Diretos + Sub-revendas`).

---

## 📺 Módulo 2: APK Android TV (`android-tv` v2.9.1)

### 1. Correção de Frame Lento / Slow-motion no Início dos Vídeos
- **Causa Raiz Identificada**: A flag `FLAG_ALLOW_NON_IDR_KEYFRAMES` no `DefaultTsPayloadReaderFactory` do ExoPlayer permitia ao decodificador iniciar a renderização em quadros que dependiam de frames anteriores ausentes, gerando efeito de câmera lenta/travamento até atingir o próximo IDR.
- **Solução Implementada**: Remoção da flag e configuração de sincronização via `SeekParameters.CLOSEST_SYNC`, proporcionando início de reprodução limpo e imediato tanto no Ao Vivo quanto nos filmes e séries.

### 2. Pasta "Continue Assistindo" (Filmes e Séries)
- **Posicionamento**: Inserida logo após a pasta de "Favoritos" tanto em Filmes quanto em Séries.
- **Regra de Elegibilidade**: Registra o progresso apenas se assistido > 1 minuto e < 95% da duração total. Ao atingir 95%, o conteúdo é considerado concluído e removido automaticamente.
- **Histórico**: Armazena em ordem cronológica os 20 conteúdos mais recentes.

### 3. Conteúdo Adulto (+18) com Proteção por PIN (0000)
- **Categorização Automática**: Detecção por palavras-chave (`ADULTO`, `XXX`, `+18`, `ERÓTICO`, `PRIVE`, etc.) em Canais Ao Vivo, Filmes e Séries.
- **Posicionamento**: Pastas adultas são sempre reordenadas para o final da lista em todas as telas.
- **Segurança de Acesso**: Bloqueio com senha de 4 dígitos (padrão de fábrica: `0000`). Ao digitar o PIN correto na sessão, o conteúdo permanece desbloqueado até o fechamento do app.

### 4. Menu Configurações / Ajustes
- **Limpar Continue Assistindo**: Botão dedicado para limpar todo o histórico de progresso de filmes e séries salvos localmente.
- **Alterar Senha Parental**: Modal interativo que permite ao usuário verificar a senha atual e definir um novo PIN de 4 dígitos usando o controle remoto.
- **Otimização e Tamanho**: Nenhuma dependência externa pesada foi adicionada. O APK final de release possui apenas **5.01 MB** (5.256.712 bytes), com minificação R8 e Proguard ativos.

### 5. Atualização OTA In-App
- **Correção do Erro de Permissão**: O download do APK de atualização foi redirecionado para `getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS)` e o FileProvider foi configurado com `<external-path>`, com concessão explícita de `grantUriPermission` para todos os pacotes de instalação do sistema.

