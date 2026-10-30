import { 
  ServerDocument, 
  UserDocument, 
  DeviceDocument, 
  CreditLogDocument, 
  NotificationDocument,
  UserRole
} from "@/types";
import { FirestoreSync } from "./firestoreSync";

// Dados Iniciais Limpos para Produção
const INITIAL_SERVERS: ServerDocument[] = [];

const INITIAL_USERS: UserDocument[] = [
  {
    uid: "usr-admin-master",
    name: "Super Admin",
    email: "admin@zyveron.com",
    role: "superadmin",
    parentId: null,
    credits: 9999,
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

const INITIAL_DEVICES: DeviceDocument[] = [];
const INITIAL_LOGS: CreditLogDocument[] = [];
const INITIAL_NOTIFICATIONS: NotificationDocument[] = [];

function normalizeDnsUrl(url: string): string {
  let clean = (url || "").trim().replace(/\/+$/, "");
  if (!clean) return "";
  if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
    clean = "http://" + clean;
  }
  return clean;
}

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
      // Purga dados mockados da versão anterior
      const storeVersion = localStorage.getItem("zyveron_store_version");
      if (storeVersion !== "prod_v2_clean") {
        localStorage.removeItem("zyveron_servers");
        localStorage.removeItem("zyveron_users");
        localStorage.removeItem("zyveron_devices");
        localStorage.removeItem("zyveron_logs");
        localStorage.removeItem("zyveron_notifications");
        localStorage.setItem("zyveron_store_version", "prod_v2_clean");
      }

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
    srv.activeDns = normalizeDnsUrl(newDns);
    if (fallbacks) srv.fallbackDns = fallbacks.map(normalizeDnsUrl);
    srv.updatedAt = new Date().toISOString();
    this.save();
    FirestoreSync.syncServerToFirestore(srv);
    return srv;
  }

  addServer(name: string, activeDns: string, fallbackDns: string[], notes: string = ""): ServerDocument {
    this.init();
    const cleanDns = normalizeDnsUrl(activeDns);
    const newServer: ServerDocument = {
      id: "srv-" + Math.random().toString(36).substring(2, 9),
      name,
      activeDns: cleanDns,
      fallbackDns: fallbackDns.map(normalizeDnsUrl),
      status: "active",
      notes,
      deviceCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.servers.unshift(newServer);
    this.save();
    FirestoreSync.syncServerToFirestore(newServer);
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
    const serverDns = server ? normalizeDnsUrl(server.activeDns) : "http://localhost:8080";

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
      serverDns,
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
    FirestoreSync.syncDeviceToFirestore(deviceData);
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
    FirestoreSync.syncDeviceToFirestore(dev);
    return dev;
  }

  toggleDeviceStatus(mac: string): DeviceDocument {
    this.init();
    const dev = this.devices.find(d => d.mac === mac);
    if (!dev) throw new Error("Aparelho não encontrado.");
    dev.status = dev.status === "active" ? "blocked" : "active";
    dev.updatedAt = new Date().toISOString();
    this.save();
    FirestoreSync.updateDeviceStatus(dev.mac, dev.status);
    return dev;
  }

  deleteDevice(mac: string) {
    this.init();
    this.devices = this.devices.filter(d => d.mac !== mac);
    this.save();
    FirestoreSync.removeDeviceFromFirestore(mac);
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
    FirestoreSync.syncNotificationToFirestore(newNotif);
    return newNotif;
  }

  deleteNotification(id: string) {
    this.init();
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.save();
    FirestoreSync.deleteNotificationFromFirestore(id);
  }
}

export const store = new LocalStore();

