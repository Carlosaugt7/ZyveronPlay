import { 
  ServerDocument, 
  UserDocument, 
  DeviceDocument, 
  CreditLogDocument, 
  NotificationDocument,
  UserRole
} from "@/types";

// Seed Inicial de Demonstração
const INITIAL_SERVERS: ServerDocument[] = [
  {
    id: "srv-turbo-01",
    name: "Servidor Turbo BR 01",
    activeDns: "http://stream01.zyveronplay.com:8080",
    fallbackDns: [
      "http://backup01.zyveronplay.com:8080",
      "http://backup02.zyveronplay.com:8080"
    ],
    status: "active",
    notes: "Servidor principal para canais Full HD e 4K no Brasil",
    deviceCount: 1420,
    createdAt: "2026-01-10T12:00:00Z",
    updatedAt: "2026-10-29T18:30:00Z",
  },
  {
    id: "srv-fast-02",
    name: "Servidor Fast Latino 02",
    activeDns: "http://cdn-latam.zyveronplay.com:8080",
    fallbackDns: ["http://cdn-latam2.zyveronplay.com:8080"],
    status: "active",
    notes: "Servidor dedicado para streaming América Latina",
    deviceCount: 580,
    createdAt: "2026-02-15T10:00:00Z",
    updatedAt: "2026-10-28T14:15:00Z",
  },
  {
    id: "srv-vod-03",
    name: "Servidor Filmes & Séries VOD",
    activeDns: "http://vod.zyveronplay.com:8080",
    fallbackDns: [],
    status: "active",
    notes: "Cluster de armazenamento de filmes e séries",
    deviceCount: 2000,
    createdAt: "2026-03-01T08:00:00Z",
    updatedAt: "2026-10-25T11:00:00Z",
  }
];

const INITIAL_USERS: UserDocument[] = [
  {
    uid: "usr-admin-master",
    name: "Super Admin (Você)",
    email: "admin@zyveron.com",
    role: "superadmin",
    parentId: null,
    credits: 9999,
    status: "active",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-10-29T20:00:00Z",
  },
  {
    uid: "usr-revenda-sp",
    name: "Carlos Revenda Master SP",
    email: "carlos.sp@zyveron.com",
    role: "reseller",
    parentId: "usr-admin-master",
    credits: 85,
    status: "active",
    createdAt: "2026-02-01T10:00:00Z",
    updatedAt: "2026-10-29T18:00:00Z",
  },
  {
    uid: "usr-sub-campinas",
    name: "Marcos Sub-Revenda Campinas",
    email: "marcos.cps@zyveron.com",
    role: "sub_reseller",
    parentId: "usr-revenda-sp",
    credits: 22,
    status: "active",
    createdAt: "2026-03-10T14:00:00Z",
    updatedAt: "2026-10-28T09:30:00Z",
  },
  {
    uid: "usr-revenda-rj",
    name: "Rodrigo Revenda RJ",
    email: "rodrigo.rj@zyveron.com",
    role: "reseller",
    parentId: "usr-admin-master",
    credits: 40,
    status: "active",
    createdAt: "2026-04-05T16:00:00Z",
    updatedAt: "2026-10-27T17:45:00Z",
  }
];

const INITIAL_DEVICES: DeviceDocument[] = [
  {
    id: "00:1A:79:A4:8B:20",
    mac: "00:1A:79:A4:8B:20",
    deviceKey: "482910",
    serverId: "srv-turbo-01",
    serverName: "Servidor Turbo BR 01",
    username: "cliente_silva",
    password: "••••••••",
    resellerId: "usr-revenda-sp",
    resellerName: "Carlos Revenda Master SP",
    expirationDate: "2026-11-28T23:59:59Z",
    status: "active",
    customNote: "Smart TV Sala - Plano Mensal",
    lastSeen: "2026-10-29T21:40:00Z",
    createdAt: "2026-09-28T10:00:00Z",
    updatedAt: "2026-10-29T21:40:00Z",
  },
  {
    id: "A4:C2:59:E1:8B:20",
    mac: "A4:C2:59:E1:8B:20",
    deviceKey: "749210",
    serverId: "srv-turbo-01",
    serverName: "Servidor Turbo BR 01",
    username: "cliente_roberto",
    password: "••••••••",
    resellerId: "usr-sub-campinas",
    resellerName: "Marcos Sub-Revenda Campinas",
    expirationDate: "2026-11-15T23:59:59Z",
    status: "active",
    customNote: "Fire Stick 4K - Quarto",
    lastSeen: "2026-10-29T22:15:00Z",
    createdAt: "2026-10-15T15:30:00Z",
    updatedAt: "2026-10-29T22:15:00Z",
  },
  {
    id: "D8:07:B6:33:41:9C",
    mac: "D8:07:B6:33:41:9C",
    deviceKey: "194820",
    serverId: "srv-fast-02",
    serverName: "Servidor Fast Latino 02",
    username: "fernanda_tv",
    password: "••••••••",
    resellerId: "usr-revenda-sp",
    resellerName: "Carlos Revenda Master SP",
    expirationDate: "2026-10-25T23:59:59Z",
    status: "expired",
    customNote: "TV Box Xiaomi Mi Box - Vencido",
    lastSeen: "2026-10-25T19:00:00Z",
    createdAt: "2026-09-25T11:00:00Z",
    updatedAt: "2026-10-26T00:00:00Z",
  },
  {
    id: "2C:F4:32:89:E2:10",
    mac: "2C:F4:32:89:E2:10",
    deviceKey: "951347",
    serverId: "srv-turbo-01",
    serverName: "Servidor Turbo BR 01",
    username: "lucas_gamer",
    password: "••••••••",
    resellerId: "usr-revenda-rj",
    resellerName: "Rodrigo Revenda RJ",
    expirationDate: "2026-12-30T23:59:59Z",
    status: "blocked",
    customNote: "Bloqueado por inadimplência prévia",
    lastSeen: "2026-10-28T12:00:00Z",
    createdAt: "2026-08-30T10:00:00Z",
    updatedAt: "2026-10-29T10:00:00Z",
  }
];

const INITIAL_LOGS: CreditLogDocument[] = [
  {
    id: "log-001",
    fromUserId: "usr-admin-master",
    fromUserName: "Super Admin",
    toUserId: "usr-revenda-sp",
    toUserName: "Carlos Revenda Master SP",
    amount: 100,
    action: "deposit",
    note: "Recarga de pacote 100 créditos",
    timestamp: "2026-10-20T10:00:00Z",
  },
  {
    id: "log-002",
    fromUserId: "usr-revenda-sp",
    fromUserName: "Carlos Revenda Master SP",
    toUserId: "usr-sub-campinas",
    toUserName: "Marcos Sub-Revenda Campinas",
    amount: 25,
    action: "transfer",
    note: "Repasse de créditos para sub-revenda",
    timestamp: "2026-10-22T14:30:00Z",
  },
  {
    id: "log-003",
    fromUserId: "usr-revenda-sp",
    fromUserName: "Carlos Revenda Master SP",
    toUserId: "usr-revenda-sp",
    toUserName: "Carlos Revenda Master SP",
    amount: -1,
    action: "activation",
    targetDeviceMac: "00:1A:79:A4:8B:20",
    note: "Ativação de 30 dias para MAC 00:1A:79:A4:8B:20",
    timestamp: "2026-10-28T10:00:00Z",
  }
];

const INITIAL_NOTIFICATIONS: NotificationDocument[] = [
  {
    id: "notif-001",
    targetType: "all",
    targetId: "all",
    title: "Aviso de Manutenção",
    message: "Manutenção programada no Servidor Turbo BR 01 hoje às 23:30 (duração prevista: 10 min).",
    active: true,
    createdAt: "2026-10-29T18:00:00Z",
    expiresAt: "2026-10-30T04:00:00Z",
  },
  {
    id: "notif-002",
    targetType: "device",
    targetId: "00:1A:79:A4:8B:20",
    title: "Vencimento Próximo",
    message: "Sua assinatura vence em 30 dias. Aproveite para renovar antecipadamente!",
    active: true,
    createdAt: "2026-10-29T19:00:00Z",
    expiresAt: "2026-11-28T23:59:59Z",
  }
];

// Gerenciador em memória persistido no localStorage (Client-Side)
class LocalStore {
  private servers: ServerDocument[] = INITIAL_SERVERS;
  private users: UserDocument[] = INITIAL_USERS;
  private devices: DeviceDocument[] = INITIAL_DEVICES;
  private logs: CreditLogDocument[] = INITIAL_LOGS;
  private notifications: NotificationDocument[] = INITIAL_NOTIFICATIONS;
  private initialized = false;

  private init() {
    if (typeof window === "undefined" || this.initialized) return;
    try {
      const s = localStorage.getItem("zyveron_servers");
      if (s) this.servers = JSON.parse(s);
      const u = localStorage.getItem("zyveron_users");
      if (u) this.users = JSON.parse(u);
      const d = localStorage.getItem("zyveron_devices");
      if (d) this.devices = JSON.parse(d);
      const l = localStorage.getItem("zyveron_logs");
      if (l) this.logs = JSON.parse(l);
      const n = localStorage.getItem("zyveron_notifications");
      if (n) this.notifications = JSON.parse(n);
      this.initialized = true;
    } catch {
      // Ignora erro e mantém defaults
    }
  }

  private save() {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("zyveron_servers", JSON.stringify(this.servers));
      localStorage.setItem("zyveron_users", JSON.stringify(this.users));
      localStorage.setItem("zyveron_devices", JSON.stringify(this.devices));
      localStorage.setItem("zyveron_logs", JSON.stringify(this.logs));
      localStorage.setItem("zyveron_notifications", JSON.stringify(this.notifications));
    } catch {
      // Ignora erro
    }
  }

  // --- SERVIDORES & DNS EM MASSA ---
  getServers(): ServerDocument[] {
    this.init();
    return [...this.servers];
  }

  updateServerDns(serverId: string, newDns: string, fallbacks?: string[]) {
    this.init();
    const srv = this.servers.find(s => s.id === serverId);
    if (!srv) throw new Error("Servidor não encontrado.");
    srv.activeDns = newDns;
    if (fallbacks) srv.fallbackDns = fallbacks;
    srv.updatedAt = new Date().toISOString();
    this.save();
    return srv;
  }

  addServer(name: string, activeDns: string, fallbackDns: string[], notes: string = ""): ServerDocument {
    this.init();
    const newServer: ServerDocument = {
      id: "srv-" + Math.random().toString(36).substring(2, 9),
      name,
      activeDns,
      fallbackDns,
      status: "active",
      notes,
      deviceCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.servers.unshift(newServer);
    this.save();
    return newServer;
  }

  migrateDevicesServer(fromServerId: string, toServerId: string): number {
    this.init();
    const targetServer = this.servers.find(s => s.id === toServerId);
    if (!targetServer) throw new Error("Servidor destino não existe.");
    let count = 0;
    this.devices.forEach(dev => {
      if (dev.serverId === fromServerId) {
        dev.serverId = toServerId;
        dev.serverName = targetServer.name;
        dev.updatedAt = new Date().toISOString();
        count++;
      }
    });
    this.save();
    return count;
  }

  // --- APARELHOS (MACS) & ATIVAÇÃO COM CRÉDITOS ---
  getDevices(userRole: UserRole, userId: string): DeviceDocument[] {
    this.init();
    if (userRole === "superadmin") {
      return [...this.devices];
    }
    // Revenda vê seus dispositivos e os dispositivos de suas sub-revendas
    const mySubUsers = this.users.filter(u => u.parentId === userId).map(u => u.uid);
    const allowedUserIds = [userId, ...mySubUsers];
    return this.devices.filter(d => allowedUserIds.includes(d.resellerId));
  }

  activateDevice(
    mac: string,
    deviceKey: string,
    serverId: string,
    username: string,
    password: string,
    months: number,
    resellerId: string,
    customNote: string = ""
  ): DeviceDocument {
    this.init();
    const cleanMac = mac.trim().toUpperCase();
    const reseller = this.users.find(u => u.uid === resellerId);
    if (!reseller) throw new Error("Revendedor não encontrado.");

    // Checa se o revendedor tem créditos suficientes
    if (reseller.role !== "superadmin" && reseller.credits < months) {
      throw new Error(`Saldo insuficiente! Você tem ${reseller.credits} créditos e precisa de ${months}.`);
    }

    const server = this.servers.find(s => s.id === serverId);
    const serverName = server ? server.name : "Servidor Padrão";

    // Calcula data de expiração (hoje + 30 dias * meses)
    const exp = new Date();
    exp.setDate(exp.getDate() + (30 * months));

    // Deduz créditos
    if (reseller.role !== "superadmin") {
      reseller.credits -= months;
      reseller.updatedAt = new Date().toISOString();
    }

    // Registra log de crédito
    this.logs.unshift({
      id: "log-" + Math.random().toString(36).substring(2, 9),
      fromUserId: reseller.uid,
      fromUserName: reseller.name,
      toUserId: reseller.uid,
      toUserName: reseller.name,
      amount: -months,
      action: "activation",
      targetDeviceMac: cleanMac,
      note: `Ativação de ${months * 30} dias para o MAC ${cleanMac}`,
      timestamp: new Date().toISOString(),
    });

    // Cria ou atualiza o aparelho
    const existingIndex = this.devices.findIndex(d => d.mac === cleanMac);
    const deviceData: DeviceDocument = {
      id: cleanMac,
      mac: cleanMac,
      deviceKey: deviceKey.trim(),
      serverId,
      serverName,
      username,
      password,
      resellerId,
      resellerName: reseller.name,
      expirationDate: exp.toISOString(),
      status: "active",
      customNote,
      lastSeen: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      this.devices[existingIndex] = deviceData;
    } else {
      this.devices.unshift(deviceData);
    }

    this.save();
    return deviceData;
  }

  renewDevice(mac: string, months: number, actingUserId: string): DeviceDocument {
    this.init();
    const cleanMac = mac.trim().toUpperCase();
    const dev = this.devices.find(d => d.mac === cleanMac);
    if (!dev) throw new Error("Dispositivo não encontrado.");

    const actingUser = this.users.find(u => u.uid === actingUserId);
    if (!actingUser) throw new Error("Usuário não autorizado.");

    if (actingUser.role !== "superadmin" && actingUser.credits < months) {
      throw new Error(`Saldo insuficiente! Você tem ${actingUser.credits} créditos e precisa de ${months}.`);
    }

    // Deduz créditos
    if (actingUser.role !== "superadmin") {
      actingUser.credits -= months;
      actingUser.updatedAt = new Date().toISOString();
    }

    // Calcula nova data: se já estiver vencido, começa de hoje; se ainda ativo, adiciona aos dias restantes
    const currentExp = new Date(dev.expirationDate);
    const now = new Date();
    const baseDate = currentExp > now ? currentExp : now;
    baseDate.setDate(baseDate.getDate() + (30 * months));

    dev.expirationDate = baseDate.toISOString();
    dev.status = "active";
    dev.updatedAt = new Date().toISOString();

    // Log de auditoria
    this.logs.unshift({
      id: "log-" + Math.random().toString(36).substring(2, 9),
      fromUserId: actingUser.uid,
      fromUserName: actingUser.name,
      toUserId: actingUser.uid,
      toUserName: actingUser.name,
      amount: -months,
      action: "renewal",
      targetDeviceMac: cleanMac,
      note: `Renovação de +${months * 30} dias para o MAC ${cleanMac}`,
      timestamp: new Date().toISOString(),
    });

    this.save();
    return dev;
  }

  toggleDeviceStatus(mac: string): DeviceDocument {
    this.init();
    const dev = this.devices.find(d => d.mac === mac);
    if (!dev) throw new Error("Aparelho não encontrado.");
    dev.status = dev.status === "active" ? "blocked" : "active";
    dev.updatedAt = new Date().toISOString();
    this.save();
    return dev;
  }

  deleteDevice(mac: string) {
    this.init();
    this.devices = this.devices.filter(d => d.mac !== mac);
    this.save();
  }

  // --- REVENDAS & CRÉDITOS ---
  getUsers(userRole: UserRole, userId: string): UserDocument[] {
    this.init();
    if (userRole === "superadmin") {
      return [...this.users];
    }
    // Revenda vê apenas suas sub-revendas
    return this.users.filter(u => u.parentId === userId);
  }

  transferCredits(fromUserId: string, toUserId: string, amount: number, note: string) {
    this.init();
    if (amount <= 0) throw new Error("Quantidade deve ser maior que zero.");
    const fromUser = this.users.find(u => u.uid === fromUserId);
    const toUser = this.users.find(u => u.uid === toUserId);
    if (!fromUser || !toUser) throw new Error("Usuários não encontrados.");

    if (fromUser.role !== "superadmin" && fromUser.credits < amount) {
      throw new Error(`Saldo insuficiente! Saldo atual: ${fromUser.credits}.`);
    }

    if (fromUser.role !== "superadmin") {
      fromUser.credits -= amount;
      fromUser.updatedAt = new Date().toISOString();
    }
    toUser.credits += amount;
    toUser.updatedAt = new Date().toISOString();

    this.logs.unshift({
      id: "log-" + Math.random().toString(36).substring(2, 9),
      fromUserId: fromUser.uid,
      fromUserName: fromUser.name,
      toUserId: toUser.uid,
      toUserName: toUser.name,
      amount,
      action: "transfer",
      note: note || `Transferência de ${amount} créditos`,
      timestamp: new Date().toISOString(),
    });

    this.save();
  }

  createReseller(
    name: string,
    email: string,
    role: "reseller" | "sub_reseller",
    parentId: string,
    initialCredits: number
  ): UserDocument {
    this.init();
    const parent = this.users.find(u => u.uid === parentId);
    if (!parent) throw new Error("Usuário pai não encontrado.");

    if (parent.role !== "superadmin" && parent.credits < initialCredits) {
      throw new Error(`Saldo insuficiente para transferir ${initialCredits} créditos.`);
    }

    if (parent.role !== "superadmin" && initialCredits > 0) {
      parent.credits -= initialCredits;
    }

    const newUser: UserDocument = {
      uid: "usr-" + Math.random().toString(36).substring(2, 9),
      name,
      email,
      role,
      parentId,
      credits: initialCredits,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.users.push(newUser);

    if (initialCredits > 0) {
      this.logs.unshift({
        id: "log-" + Math.random().toString(36).substring(2, 9),
        fromUserId: parent.uid,
        fromUserName: parent.name,
        toUserId: newUser.uid,
        toUserName: newUser.name,
        amount: initialCredits,
        action: "transfer",
        note: `Carga inicial de ${initialCredits} créditos ao criar revenda`,
        timestamp: new Date().toISOString(),
      });
    }

    this.save();
    return newUser;
  }

  getCreditLogs(): CreditLogDocument[] {
    this.init();
    return [...this.logs];
  }

  // --- MENSAGENS PARA A TV ---
  getNotifications(): NotificationDocument[] {
    this.init();
    return [...this.notifications];
  }

  sendNotification(
    targetType: "all" | "reseller" | "device",
    targetId: string,
    title: string,
    message: string,
    hoursDuration: number = 24
  ): NotificationDocument {
    this.init();
    const exp = new Date();
    exp.setHours(exp.getHours() + hoursDuration);

    const newNotif: NotificationDocument = {
      id: "notif-" + Math.random().toString(36).substring(2, 9),
      targetType,
      targetId,
      title,
      message,
      active: true,
      createdAt: new Date().toISOString(),
      expiresAt: exp.toISOString(),
    };

    this.notifications.unshift(newNotif);
    this.save();
    return newNotif;
  }

  deleteNotification(id: string) {
    this.init();
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.save();
  }
}

export const store = new LocalStore();

