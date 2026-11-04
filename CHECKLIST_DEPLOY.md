# ✅ CHECKLIST DE DEPLOY - ZYVERON PLAY v2.9.0

**Data**: 04 de Novembro de 2026  
**Tempo Estimado Total**: 2-3 horas  
**Status**: Pendente

---

## 🎯 VISÃO GERAL

```
┌─────────────────────────────────────────────────────────────┐
│  FASE 1: Preparação (30 min)                                │
│  ├── Backups                                                 │
│  ├── Verificar requisitos                                    │
│  └── Preparar ambiente                                       │
├─────────────────────────────────────────────────────────────┤
│  FASE 2: Painel Gestor (1h)                                 │
│  ├── Configurar .env.local                                   │
│  ├── Instalar dependências                                   │
│  ├── Testar localmente                                       │
│  └── Deploy produção                                         │
├─────────────────────────────────────────────────────────────┤
│  FASE 3: Android TV APK (45 min)                            │
│  ├── Build release                                           │
│  ├── Testar em dispositivo                                   │
│  └── Distribuir OTA                                          │
├─────────────────────────────────────────────────────────────┤
│  FASE 4: Smart TV Web (20 min)                              │
│  ├── Build produção                                          │
│  └── Deploy                                                  │
├─────────────────────────────────────────────────────────────┤
│  FASE 5: Firebase (10 min)                                  │
│  └── Atualizar Security Rules                                │
├─────────────────────────────────────────────────────────────┤
│  FASE 6: Monitoramento (15 min)                             │
│  └── Configurar dashboards                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 FASE 1: PREPARAÇÃO (30 min)

### 1.1 Backups Críticos
- [ ] **Backup Firestore**
  ```bash
  # Firebase Console → Firestore → Exportar dados
  # Ou via CLI:
  gcloud firestore export gs://zyveron-backup/$(date +%Y%m%d)
  ```

- [ ] **Backup Código**
  ```bash
  git add .
  git commit -m "backup: antes do deploy v2.9.0"
  git push
  git tag v2.8.4-backup
  git push --tags
  ```

- [ ] **Backup APK v2.8.4**
  ```bash
  cp zyveron-play-tv.apk zyveron-play-tv-v2.8.4-backup.apk
  ```

### 1.2 Verificar Requisitos
- [ ] Node.js 18+ instalado: `node --version`
- [ ] JDK 17+ instalado: `java --version`
- [ ] Gradle funcionando: `./gradlew --version`
- [ ] Firebase CLI instalado: `firebase --version`
- [ ] Git configurado: `git config --list`

### 1.3 Preparar Ambiente
- [ ] Limpar builds anteriores
  ```bash
  # Painel
  cd panel
  rm -rf .next node_modules
  
  # Android TV
  cd ../android-tv
  ./gradlew clean
  
  # Smart TV
  cd ../smart-tv
  rm -rf dist node_modules
  ```

---

## 🔒 FASE 2: PAINEL GESTOR (1h)

### 2.1 Configurar Variáveis de Ambiente (15 min)

- [ ] **Criar .env.local**
  ```bash
  cd panel
  cp .env.local.example .env.local
  ```

- [ ] **Gerar hash da senha master**
  ```bash
  npm install
  node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('Adm0418$', 10))"
  ```
  **Copiar output**: `$2a$10$...`

- [ ] **Editar .env.local**
  ```bash
  # Abrir em editor de texto
  code .env.local
  
  # Adicionar:
  NEXT_PUBLIC_MASTER_EMAIL=admin@zyveronplay.com
  MASTER_PASSWORD_BCRYPT=$2a$10$seu_hash_aqui
  ```

- [ ] **Verificar .env.local**
  ```bash
  cat .env.local | grep MASTER_PASSWORD_BCRYPT
  # Deve mostrar o hash (não a senha em texto)
  ```

### 2.2 Instalar Dependências (10 min)

- [ ] **Instalar pacotes**
  ```bash
  npm install
  # Ou: pnpm install
  ```

- [ ] **Verificar bcryptjs**
  ```bash
  npm list bcryptjs
  # Deve mostrar: bcryptjs@2.4.3
  ```

### 2.3 Testar Localmente (20 min)

- [ ] **Iniciar servidor dev**
  ```bash
  npm run dev
  ```

- [ ] **Abrir navegador**: http://localhost:3000

- [ ] **Teste 1: Login Master**
  - Email: `admin@zyveronplay.com`
  - Senha: `Adm0418$`
  - Deve entrar normalmente

- [ ] **Teste 2: Criar Revenda**
  - Criar revenda com email e senha
  - Nome: "Teste Deploy"
  - Email: "teste@deploy.com"
  - Senha: "teste123"
  - Deve criar com sucesso

- [ ] **Teste 3: Login Revenda**
  - Logout
  - Login com email `teste@deploy.com` / `teste123`
  - Deve entrar normalmente
  - Console deve mostrar: `[Auth] Senha migrada para hash: teste@deploy.com`

- [ ] **Teste 4: Verificar Hash**
  - Verificar localStorage ou Firestore
  - Senha deve começar com `$2a$10$`

### 2.4 Build de Produção (5 min)

- [ ] **Build**
  ```bash
  npm run build
  ```

- [ ] **Verificar build**
  - Não deve ter erros TypeScript
  - Deve criar pasta `.next/`
  - Deve mostrar tamanho dos bundles

### 2.5 Deploy (10 min)

**Escolher uma opção:**

- [ ] **Opção A: Vercel**
  ```bash
  vercel login
  vercel --prod
  
  # Configurar env variables na Vercel Dashboard
  # Settings → Environment Variables
  # Adicionar MASTER_PASSWORD_BCRYPT e outras
  ```

- [ ] **Opção B: Docker VPS**
  ```bash
  docker build -t zyveron-panel .
  docker run -d -p 3000:3000 --env-file .env.local zyveron-panel
  ```

- [ ] **Opção C: PM2**
  ```bash
  pm2 start npm --name "zyveron-panel" -- start
  pm2 save
  pm2 startup
  ```

- [ ] **Testar URL de produção**
  - Abrir URL: https://seu-dominio.com
  - Fazer login
  - Verificar se tudo funciona

---

## 📱 FASE 3: ANDROID TV APK (45 min)

### 3.1 Build Release (10 min)

- [ ] **Ir para pasta android-tv**
  ```bash
  cd android-tv
  ```

- [ ] **Clean**
  ```bash
  ./gradlew clean
  ```

- [ ] **Build release**
  ```bash
  ./gradlew assembleRelease
  ```

- [ ] **Verificar APK gerado**
  ```bash
  ls -lh app/build/outputs/apk/release/app-release.apk
  ```
  Deve mostrar ~5 MB

### 3.2 Testar em Dispositivo (30 min)

- [ ] **Conectar dispositivo**
  ```bash
  adb devices
  # Deve mostrar seu dispositivo
  ```

- [ ] **Instalar APK**
  ```bash
  adb install -r app/build/outputs/apk/release/app-release.apk
  ```

- [ ] **✅ Teste 1: Ativação (5 min)**
  - Abrir app na TV
  - Anotar MAC e Device Key
  - Ativar no painel web
  - Verificar se sincronizou (deve aparecer canais)

- [ ] **✅ Teste 2: Streaming ao Vivo (5 min)**
  - Abrir um canal
  - Tempo de início deve ser ~3s
  - Assistir por 5 minutos
  - Não deve travar ou congelar

- [ ] **✅ Teste 3: Zapping (3 min)**
  - Trocar canal 5 vezes seguidas
  - Cada troca deve ser < 3s
  - Não deve crashar

- [ ] **✅ Teste 4: Rede Instável (5 min)**
  - Durante reprodução, desligar Wi-Fi
  - Aguardar 5 segundos
  - Religar Wi-Fi
  - Deve reconectar automaticamente

- [ ] **✅ Teste 5: QoS Monitor (5 min)**
  ```bash
  adb logcat -s QoSMonitor:* | grep "Score:"
  ```
  - Deve mostrar Quality Score (ex: 85/100)
  - Rebuffer count deve ser baixo (< 3)

- [ ] **✅ Teste 6: Consumo de RAM (2 min)**
  ```bash
  adb shell dumpsys meminfo com.zyveron.play | grep "TOTAL"
  ```
  - Deve estar < 250 MB

### 3.3 Distribuir (5 min)

**Escolher uma opção:**

- [ ] **Opção A: Firebase App Distribution**
  ```bash
  firebase appdistribution:distribute \
    app/build/outputs/apk/release/app-release.apk \
    --app SEU_APP_ID \
    --release-notes "v2.9.0 - Correção dos voids" \
    --groups "testers"
  ```

- [ ] **Opção B: Firestore OTA**
  - Upload APK para servidor/Firebase Storage
  - Atualizar collection `app_updates`:
  ```json
  {
    "version": "2.9.0",
    "versionCode": 15,
    "downloadUrl": "https://...",
    "mandatory": false
  }
  ```

- [ ] **Opção C: Deploy Gradual**
  - Dia 1: 10% dos dispositivos
  - Dia 3: 50% dos dispositivos
  - Dia 7: 100% dos dispositivos

---

## 🌐 FASE 4: SMART TV WEB (20 min)

### 4.1 Build (10 min)

- [ ] **Ir para pasta smart-tv**
  ```bash
  cd smart-tv
  ```

- [ ] **Instalar dependências**
  ```bash
  npm install
  ```

- [ ] **Build**
  ```bash
  npm run build
  ```

- [ ] **Verificar build**
  - Deve criar pasta `dist/`
  - Não deve ter erros

### 4.2 Deploy (10 min)

**Escolher uma opção:**

- [ ] **Opção A: Vercel**
  ```bash
  vercel --prod
  ```

- [ ] **Opção B: Netlify**
  ```bash
  netlify deploy --prod --dir=dist
  ```

- [ ] **Opção C: VPS**
  ```bash
  scp -r dist/* user@servidor:/var/www/tvplay
  ```

- [ ] **Testar URL**
  - Abrir em LG webOS ou Chrome
  - Fazer ativação
  - Reproduzir canal
  - Verificar se funciona

---

## 🔥 FASE 5: FIREBASE (10 min)

### 5.1 Atualizar Security Rules

- [ ] **Verificar arquivo firestore.rules**
  ```bash
  cd panel
  cat firestore.rules
  ```

- [ ] **Deploy rules**
  ```bash
  firebase deploy --only firestore:rules
  ```

- [ ] **Verificar no console**
  - Firebase Console → Firestore → Rules
  - Deve mostrar as novas rules

- [ ] **Testar acesso**
  - Tentar acessar devices sem auth (deve funcionar - read público)
  - Tentar criar device sem auth (deve falhar)
  - Login e criar device (deve funcionar)

---

## 📊 FASE 6: MONITORAMENTO (15 min)

### 6.1 Firebase Analytics

- [ ] **Verificar eventos**
  ```bash
  # Firebase Console → Analytics → Events
  # Procurar por: streaming_quality
  ```

### 6.2 Logs do APK

- [ ] **Monitorar QoS**
  ```bash
  adb logcat -s QoSMonitor:* | grep "Score:"
  ```
  - Deve mostrar score > 70/100 na maioria das sessões

- [ ] **Monitorar erros**
  ```bash
  adb logcat -s AndroidRuntime:E
  ```
  - Não deve ter crashes

### 6.3 Métricas de Sucesso

- [ ] **Criar planilha de acompanhamento**
  | Data | Rebuffer % | Reclamações | Score Médio | Crashes |
  |------|-----------|-------------|-------------|---------|
  | Antes | 15-25% | Muitas | 60/100 | ? |
  | Dia 1 | ? | ? | ? | ? |
  | Dia 3 | ? | ? | ? | ? |
  | Dia 7 | ? | ? | ? | ? |

- [ ] **Meta da primeira semana**
  - Taxa de rebuffer < 5%
  - Reclamações reduzidas em 90%
  - Score médio > 80/100
  - Crash rate < 0.5%

---

## ⚠️ TROUBLESHOOTING

### Problema: Painel não aceita login
```bash
# Verificar .env.local
cat panel/.env.local

# Verificar bcryptjs
cd panel
npm list bcryptjs

# Verificar hash da senha
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.compareSync('Adm0418$', 'HASH_DO_ENV'))"
# Deve retornar: true
```

### Problema: APK não instala
```bash
# Verificar assinatura
jarsigner -verify -verbose app-release.apk

# Verificar versionCode
grep versionCode app/build.gradle.kts
```

### Problema: Streaming congela
```bash
# Ver logs do QoS
adb logcat -s QoSMonitor:*

# Ver score de qualidade
# Se score < 50 → problema de rede ou servidor
```

### Problema: Build falha
```bash
# Clean completo
./gradlew clean
rm -rf .gradle build app/build

# Build novamente
./gradlew assembleRelease
```

---

## 🎉 DEPLOY CONCLUÍDO!

### Próximos Passos

- [ ] **Dia 1**: Monitorar logs e métricas
- [ ] **Dia 2**: Coletar feedback de usuários
- [ ] **Dia 3**: Analisar Firebase Analytics
- [ ] **Dia 7**: Validar metas de sucesso
- [ ] **Dia 14**: Considerar rollout 100%

### Se Tudo OK

- [ ] Incrementar rollout gradualmente (10% → 50% → 100%)
- [ ] Documentar lições aprendidas
- [ ] Planejar próximas otimizações (Fase 4)

### Se Houver Problemas

- [ ] Executar plano de rollback (ver `GUIA_DEPLOY_v2.9.0.md`)
- [ ] Analisar logs e identificar causa raiz
- [ ] Aplicar correções
- [ ] Testar novamente

---

## ✅ ASSINATURAS

**Preparação**  
Responsável: ________________  
Data: ____/____/______  
Status: [ ] Concluído

**Deploy Painel**  
Responsável: ________________  
Data: ____/____/______  
Status: [ ] Concluído

**Deploy APK**  
Responsável: ________________  
Data: ____/____/______  
Status: [ ] Concluído

**Deploy Smart TV**  
Responsável: ________________  
Data: ____/____/______  
Status: [ ] Concluído

**Firebase Rules**  
Responsável: ________________  
Data: ____/____/______  
Status: [ ] Concluído

**Validação Final**  
Responsável: ________________  
Data: ____/____/______  
Status: [ ] Aprovado [ ] Rollback

---

**🎯 CHECKLIST COMPLETO!**  
**Tempo Total**: _____ horas  
**Issues Encontrados**: _____  
**Status Final**: [ ] Sucesso [ ] Rollback Necessário

**Próxima Revisão**: ____/____/______ (7 dias após deploy)
