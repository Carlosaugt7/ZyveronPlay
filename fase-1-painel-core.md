# Especificação Técnica e Plano de Execução - Fase 1
## Projeto: Zyveron Play - Painel de Controle & Núcleo Firebase

---

### 1. Visão Geral da Fase 1
Construir o ecossistema central de gerenciamento e infraestrutura de dados em nuvem para ativação, controle e comunicação com o aplicativo de TV.

* **Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Firebase (Firestore, Auth, Admin SDK).
* **Diretriz de Design:** Tema *Cinematic Dark* (Grafite/Zinc/Slate, toques em esmeralda/âmbar/azul elétrico). **Proibição estrita de tons roxos/violetas.**

---

### 2. Modelagem do Banco de Dados (Firestore)

#### Coleção: `servers` (Catálogo de Servidores e DNS)
```typescript
interface ServerDocument {
  id: string; // Auto-ID ou slug
  name: string; // Ex: "Servidor BR 01 - Turbo"
  activeDns: string; // Ex: "http://dns-ativo.xyz:8080"
  fallbackDns: string[]; // DNSs de reserva/contingência
  status: "active" | "maintenance" | "inactive";
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}
```

#### Coleção: `users` (Admins, Revendas e Sub-revendas)
```typescript
interface UserDocument {
  uid: string; // Firebase Auth UID
  name: string;
  email: string;
  role: "superadmin" | "reseller" | "sub_reseller";
  parentId: string | null; // UID do superior hierárquico
  credits: number; // Saldo de créditos disponível
  status: "active" | "blocked";
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}
```

#### Coleção: `devices` (Aparelhos / MACs)
```typescript
interface DeviceDocument {
  id: string; // MAC formatado: "XX:XX:XX:XX:XX:XX"
  mac: string;
  deviceKey: string; // PIN de 6 dígitos
  serverId: string; // Referência a `servers`
  username: string; // Linha Xtream / IPTV
  password: string; // Senha criptografada ou protegida
  resellerId: string; // UID da revenda responsável
  expirationDate: FirebaseFirestore.Timestamp;
  status: "active" | "blocked" | "expired";
  customNote?: string; // Ex: "Cliente Marcos - Sala"
  lastSeen?: FirebaseFirestore.Timestamp;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}
```

#### Coleção: `credit_logs` (Histórico e Auditoria de Créditos)
```typescript
interface CreditLogDocument {
  id: string;
  fromUserId: string | null; // "SYSTEM" para recargas do admin
  toUserId: string;
  amount: number;
  action: "deposit" | "transfer" | "activation" | "renewal";
  targetDeviceMac?: string | null;
  note: string;
  timestamp: FirebaseFirestore.Timestamp;
}
```

#### Coleção: `notifications` (Mensagens e Avisos na Tela da TV)
```typescript
interface NotificationDocument {
  id: string;
  targetType: "all" | "reseller" | "device";
  targetId: string; // "all", UID da revenda ou MAC do dispositivo
  title: string;
  message: string;
  active: boolean;
  createdAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp;
}
```

---

### 3. Funcionalidades do Painel Web

1. **Autenticação & Controle de Acesso (RBAC):**
   - Login por e-mail e senha.
   - Proteção de rotas com base no `role`:
     - `superadmin`: Acesso total a servidores, DNS, todas as revendas, métricas globais e injeção de créditos.
     - `reseller`: Acesso apenas aos seus próprios clientes e sub-revendas.
     - `sub_reseller`: Acesso apenas aos seus clientes diretos.
2. **Troca em Massa de DNS (Server Pointer):**
   - Alteração do `activeDns` no documento do servidor afeta instantaneamente todos os clientes vinculados.
   - Migração em lote: Transferência de dispositivos do Servidor A para o Servidor B com 1 clique.
3. **Gestão de Aparelhos (MACs):**
   - Cadastro com validação de formato MAC (`XX:XX:XX:XX:XX:XX`) e Device Key.
   - Ações: Nova Ativação (-1 crédito, +30 dias), Renovação (+30 dias), Bloquear/Desbloquear, Trocar Servidor.
4. **Gestão de Revendas & Saldo de Créditos:**
   - Criação de revendas e sub-revendas.
   - Transferência de créditos com dedução atômica e registro de log de auditoria.
5. **Central de Mensagens para a TV:**
   - Disparo de aviso em tempo real (individual por MAC, por grupo de revenda ou global).

---

### 4. Ordem de Implementação Técnica
- [x] Especificação e Planejamento da Fase 1 (`fase-1-painel-core.md`).
- [ ] Configuração do ambiente em `panel/` (`package.json`, `tsconfig.json`, `next.config.ts`, Tailwind v4).
- [ ] Configuração do Firebase Client e Firebase Admin SDK com tipagens TypeScript.
- [ ] Utilitários de Criptografia e Regras de Segurança do Firestore.
- [ ] Criação dos Componentes de UI (Sidebar, Navbar, Cards de Métricas, Tabelas, Modais).
- [ ] Módulo de Autenticação e Contexto de Usuário (AuthContext).
- [ ] Módulo de Servidores & Troca de DNS em Massa.
- [ ] Módulo de Aparelhos (MACs), Ativação e Dedução de Créditos.
- [ ] Módulo de Revendas & Transferência de Créditos.
- [ ] Módulo de Mensagens em Tempo Real para TV.

