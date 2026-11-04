# 🚀 GUIA DE DEPLOY - ZYVERON PLAY v2.9.0
## Passo a Passo para Publicação em Produção

**Data**: 04 de Novembro de 2026  
**Versão**: v2.9.0 (versionCode 15)  
**Tempo Estimado**: 2-3 horas  

---

## 📋 PRÉ-REQUISITOS

### Ferramentas Necessárias
- [x] Android Studio ou JDK 17+
- [x] Node.js 18+ e npm/pnpm
- [x] Git
- [x] Acesso ao Firebase Console
- [x] Keystore de assinatura do APK (se ainda não tiver)

### Backups Obrigatórios
- [ ] Backup do Firestore (Firebase Console → Firestore → Export)
- [ ] Backup do código atual (`git commit`)
- [ ] Backup do APK v2.8.4 (caso precise rollback)

---

## 🔧 PARTE 1: PAINEL GESTOR

### Passo 1.1: Configurar Variáveis de Ambiente

```bash
cd panel
```

**Criar arquivo `.env.local`**:
```bash
# Windows
copy .env.local.example .env.local

# Linux/Mac
cp .env.local.example .env.local
```

**Editar `.env.local` e adicionar**:
```bash
# Credenciais Master
NEXT_PUBLIC_MASTER_EMAIL=admin@zyveronplay.com
MASTER_PASSWORD_BCRYPT=gerar_no_proximo_passo

# Firebase (já configurado)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyD_keI8HrRiu2zmXXi0JybhBFBu7xn8cbw
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=zyveronplay.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=zyveronplay
```

---

### Passo 1.2: Gerar Hash da Senha Master

**Opção A - Node.js direto**:
```bash
npm install -g bcryptjs
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('Adm0418$', 10))"
```

**Opção B - Script PowerShell**:
```powershell
cd panel
npm install
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('Adm0418$', 10))"
```

**Copiar o hash gerado** (exemplo: `$2a$10$xYz...`) e colar em `.env.local`:
```bash
MASTER_PASSWORD_BCRYPT=$2a$10$seu_hash_aqui
```

⚠️ **IMPORTANTE**: Trocar a senha `Adm0418$` por uma senha forte em produção!

---

### Passo 1.3: Instalar Dependências

```bash
# Se usar pnpm
pnpm install

# Se usar npm
npm install
```

**Verificar se bcryptjs foi instalado**:
```bash
npm list bcryptjs
```

Deve mostrar: `bcryptjs@2.4.3`

---

### Passo 1.4: Testar Localmente

```bash
npm run dev
```

**Abrir**: http://localhost:3000

**Testar**:
1. Login com email master e senha original
2. Criar uma revenda de teste com senha
3. Logout e login com a revenda
4. Verificar se a senha foi convertida para hash (no console deve aparecer: `[Auth] Senha migrada para hash: email@teste.com`)

---

### Passo 1.5: Build de Produção

```bash
npm run build
```

**Verificar se build foi bem-sucedido**:
- Deve criar pasta `.next/`
- Não deve ter erros de TypeScript
- Deve mostrar tamanho dos bundles

---

### Passo 1.6: Deploy

**Opção A - Vercel** (Recomendado):
```bash
npm install -g vercel
vercel login
vercel --prod
```

**Configurar variáveis de ambiente na Vercel**:
1. Dashboard Vercel → Projeto → Settings → Environment Variables
2. Adicionar todas as vars do `.env.local`
3. Redeploy: `vercel --prod`

**Opção B - VPS (Docker)**:
```bash
# Já tem Dockerfile
docker build -t zyveron-panel .
docker run -d -p 3000:3000 --env-file .env.local zyveron-panel
```

**Opção C - VPS (PM2)**:
```bash
npm install -g pm2
npm run build
pm2 start npm --name "zyveron-panel" -- start
pm2 save
```

---

## 📱 PARTE 2: ANDROID TV (APK)

### Passo 2.1: Verificar Mudanças

```bash
cd android-tv
```

**Verificar versionCode**:
```bash
grep versionCode app/build.gradle.kts
```

Deve mostrar: `versionCode = 15`

---

### Passo 2.2: Criar Keystore (se não tiver)

```bash
keytool -genkey -v -keystore zyveron-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias zyveron-release
```

**Dados para preencher**:
- Password: [Escolher senha forte]
- Nome: Zyveron Play
- Organização: Zyveron
- Cidade: [Sua cidade]
- Estado: [Seu estado]
- País: BR

**⚠️ GUARDAR KEYSTORE EM LOCAL SEGURO!**

---

### Passo 2.3: Configurar Assinatura

**Editar `app/build.gradle.kts`**:

Procurar:
```kotlin
signingConfig = signingConfigs.getByName("debug")
```

Substituir por:
```kotlin
signingConfigs {
    create("release") {
        storeFile = file("../zyveron-release-key.jks")
        storePassword = System.getenv("KEYSTORE_PASSWORD") ?: "sua_senha"
        keyAlias = "zyveron-release"
        keyPassword = System.getenv("KEY_PASSWORD") ?: "sua_senha"
    }
}

// Dentro de buildTypes.release
signingConfig = signingConfigs.getByName("release")
```

**Ou usar variáveis de ambiente**:
```bash
# Windows PowerShell
$env:KEYSTORE_PASSWORD="sua_senha"
$env:KEY_PASSWORD="sua_senha"

# Linux/Mac
export KEYSTORE_PASSWORD="sua_senha"
export KEY_PASSWORD="sua_senha"
```

---

### Passo 2.4: Build Release

```bash
# Clean anterior
./gradlew clean

# Build release
./gradlew assembleRelease
```

**APK será gerado em**:
```
app/build/outputs/apk/release/app-release.apk
```

**Verificar tamanho**:
```bash
# PowerShell
Get-Item app/build/outputs/apk/release/app-release.apk | Select-Object Name, Length

# Linux/Mac
ls -lh app/build/outputs/apk/release/app-release.apk
```

Deve estar entre **5.0 - 5.5 MB** ✅

---

### Passo 2.5: Testar APK

**Instalar em dispositivo de teste**:
```bash
adb devices
adb install -r app/build/outputs/apk/release/app-release.apk
```

**Testes obrigatórios** (15-20 minutos):

1. **Login/Ativação**
   - [ ] Registrar MAC novo
   - [ ] Ativar no painel
   - [ ] Verificar sincronização

2. **Streaming ao Vivo**
   - [ ] Abrir canal (deve iniciar em ~3s)
   - [ ] Assistir por 5 minutos (verificar rebuffer)
   - [ ] Trocar canal 5 vezes (zapping)

3. **Rede Instável**
   - [ ] Desligar Wi-Fi por 5s
   - [ ] Religar (deve reconectar automaticamente)

4. **QoS Monitor**
   - [ ] Verificar logs: `adb logcat -s QoSMonitor:*`
   - [ ] Deve mostrar Score de qualidade

5. **Consumo de Recursos**
   - [ ] Verificar RAM: `adb shell dumpsys meminfo com.zyveron.play`
   - [ ] Deve estar < 250MB

**Se TODOS os testes passarem → Prosseguir**  
**Se ALGUM falhar → Investigar antes de distribuir**

---

### Passo 2.6: Distribuir APK

**Opção A - Firebase App Distribution** (Recomendado):
```bash
# Instalar Firebase CLI
npm install -g firebase-tools
firebase login

# Upload APK
firebase appdistribution:distribute \
  app/build/outputs/apk/release/app-release.apk \
  --app 1:123456789:android:abc123 \
  --release-notes "v2.9.0 - Correção dos voids + Telemetria" \
  --groups "testers"
```

**Opção B - Firestore (OTA Update)**:

1. Upload APK para servidor ou Firebase Storage
2. Atualizar collection `app_updates`:
```json
{
  "version": "2.9.0",
  "versionCode": 15,
  "downloadUrl": "https://seu-servidor.com/zyveron-play-v2.9.0.apk",
  "releaseNotes": "Correção dos voids + Telemetria",
  "mandatory": false,
  "releaseDate": "2026-11-04T18:00:00Z"
}
```

**Opção C - Deploy Gradual** (Canary):

Semana 1: 10% dos dispositivos
```json
{ "rolloutPercentage": 10 }
```

Semana 2: 50% dos dispositivos
```json
{ "rolloutPercentage": 50 }
```

Semana 3: 100% dos dispositivos
```json
{ "rolloutPercentage": 100 }
```

---

## 🌐 PARTE 3: SMART TV WEB

### Passo 3.1: Build

```bash
cd smart-tv
npm install
npm run build
```

### Passo 3.2: Deploy

**Opção A - Vercel**:
```bash
vercel --prod
```

**Opção B - Netlify**:
```bash
npm install -g netlify-cli
netlify deploy --prod
```

**Opção C - VPS (Nginx)**:
```bash
# Copiar build
scp -r dist/* user@servidor:/var/www/tvplay

# Configurar Nginx
server {
    listen 80;
    server_name tvplay.loja-am.top;
    root /var/www/tvplay;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 🔥 PARTE 4: FIREBASE SECURITY RULES (CRÍTICO!)

### Passo 4.1: Atualizar Rules

**Criar arquivo `firestore.rules`** (se ainda não existe):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isSuperAdmin() {
      return request.auth != null && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'superadmin';
    }
    
    function isOwnerOrAdmin(ownerId) {
      return request.auth != null && 
             (request.auth.uid == ownerId || isSuperAdmin());
    }
    
    match /devices/{mac} {
      allow read: if true;
      allow create, update: if request.auth != null;
      allow delete: if isSuperAdmin();
    }
    
    match /servers/{serverId} {
      allow read: if request.auth != null;
      allow write: if isSuperAdmin();
    }
    
    match /users/{userId} {
      allow read: if request.auth.uid == userId || isSuperAdmin();
      allow write: if isSuperAdmin();
    }
    
    match /credit_logs/{logId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if false;
    }
    
    match /notifications/{notifId} {
      allow read: if true;
      allow write: if isSuperAdmin();
    }
    
    match /app_updates/{updateId} {
      allow read: if true;
      allow write: if isSuperAdmin();
    }
    
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Passo 4.2: Deploy Rules

```bash
cd panel
firebase deploy --only firestore:rules
```

**Verificar se aplicou**:
1. Firebase Console → Firestore → Rules
2. Deve mostrar as novas rules

---

## 📊 PARTE 5: MONITORAMENTO PÓS-DEPLOY

### Passo 5.1: Dashboard Firebase

**Métricas para acompanhar**:
1. Analytics → Events → `streaming_quality`
2. Crashlytics → Crashes (deve manter < 0.5%)
3. Performance → Network requests

### Passo 5.2: Logs do APK

```bash
# Ver logs do QoS Monitor
adb logcat -s QoSMonitor:* | grep "Score:"

# Ver logs de reconexão
adb logcat -s ZyveronPlayer:* | grep "Reconect"

# Ver erros
adb logcat -s AndroidRuntime:E
```

### Passo 5.3: Métricas de Sucesso

**Primeira semana após deploy**:
- [ ] Taxa de rebuffer < 5% (ver Firebase Analytics)
- [ ] Reclamações de "trava" reduzidas em 90%
- [ ] Quality Score médio > 80/100
- [ ] Crash rate < 0.5%
- [ ] Nenhum rollback necessário

---

## ⚠️ PLANO DE ROLLBACK

### Se Algo der Muito Errado

**APK Android**:
```bash
# 1. Reverter versionCode no Firestore
# app_updates collection → version: "2.8.4", versionCode: 14

# 2. Ou instalar APK anterior
adb install -r zyveron-play-tv-v2.8.4.apk
```

**Painel**:
```bash
# 1. Reverter commit
git revert HEAD
git push

# 2. Ou deploy da versão anterior
vercel rollback
```

**Firebase Rules**:
```bash
# 1. Firebase Console → Firestore → Rules
# 2. Click "View History"
# 3. Restore versão anterior
```

---

## ✅ CHECKLIST FINAL

### Antes de Iniciar
- [ ] Backup do Firestore feito
- [ ] Backup do código feito (`git commit`)
- [ ] Keystore guardado em local seguro
- [ ] Senhas anotadas (keystore, env variables)

### Painel
- [ ] .env.local criado e configurado
- [ ] Hash da senha master gerado
- [ ] `npm install` executado
- [ ] `npm run build` executado sem erros
- [ ] Login testado localmente
- [ ] Deploy feito (Vercel/VPS)
- [ ] Env variables configuradas na Vercel

### APK
- [ ] versionCode incrementado (15)
- [ ] `./gradlew clean` executado
- [ ] `./gradlew assembleRelease` executado
- [ ] APK testado em dispositivo real
- [ ] Todos os 5 testes passaram
- [ ] APK distribuído (Firebase/Firestore)

### Smart TV Web
- [ ] `npm run build` executado
- [ ] Testado em LG webOS ou Chrome
- [ ] Deploy feito (Vercel/Netlify)

### Firebase
- [ ] Security Rules atualizadas
- [ ] `firebase deploy --only firestore:rules` executado
- [ ] Rules verificadas no console

### Monitoramento
- [ ] Firebase Analytics configurado
- [ ] Logs do APK verificados
- [ ] Dashboard de métricas criado

---

## 🎉 DEPLOY CONCLUÍDO!

**Próximos passos**:
1. Monitorar por 24-48h
2. Coletar feedback dos usuários
3. Analisar métricas do Firebase
4. Se tudo OK → Aumentar rollout para 100%

**Expectativa**: Redução de 90% nas reclamações de "trava" ou "congela"! 🚀

---

## 📞 SUPORTE

### Problemas Comuns

**Erro: "Cannot find module 'bcryptjs'"**
```bash
cd panel
npm install bcryptjs @types/bcryptjs
```

**Erro: "keystore not found"**
```bash
# Verificar se keystore está no lugar certo
ls zyveron-release-key.jks
```

**APK muito grande (> 10 MB)**
```bash
# Verificar se Proguard está ativo
grep "isMinifyEnabled" app/build.gradle.kts
# Deve mostrar: isMinifyEnabled = true
```

**Painel não aceita login**
```bash
# Verificar se .env.local existe
cat .env.local

# Verificar se bcryptjs está instalado
npm list bcryptjs
```

---

**Responsável**: Kiro AI  
**Data**: 04 de Novembro de 2026  
**Status**: ✅ PRONTO PARA DEPLOY  
**Tempo Total Estimado**: 2-3 horas
