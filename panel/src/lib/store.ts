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
    name: "Administrador Zyveron",
    email: "admin@zyveronplay.com",
    role: "superadmin",
    parentId: null,
    credits: 99999,
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
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
  private listeners: Set<() => void> = new Set();
  private firestoreListening = false;

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try { fn(); } catch (_) {}
    });
  }

  initFirestoreSync() {
    this.init();
    if (typeof window === "undefined" || this.firestoreListening) return;
    this.firestoreListening = true;

    // 1. Escuta Aparelhos (devices) do Cloud Firestore em tempo real
    FirestoreSync.subscribeToDevices((firestoreDevices) => {
      const fsMap = new Map<string, DeviceDocument>();
      firestoreDevices.forEach(d => {
        if (d.mac) fsMap.set(d.mac.trim().toUpperCase(), d);
      });

      // Mescla com os dados locais preservando alterações mais recentes
      this.devices.forEach(localDev => {
        const cleanMac = localDev.mac.trim().toUpperCase();
        const remoteDev = fsMap.get(cleanMac);
        if (!remoteDev) {
          fsMap.set(cleanMac, localDev);
          FirestoreSync.syncDeviceToFirestore(localDev);
        } else {
          // Se a alteração local for mais recente que o snapshot remoto, mantém o local e atualiza o remoto
          const localTime = new Date(localDev.updatedAt || localDev.createdAt || 0).getTime();
          const remoteTime = new Date(remoteDev.updatedAt || remoteDev.createdAt || 0).getTime();
          if (localTime > remoteTime) {
            fsMap.set(cleanMac, { ...remoteDev, ...localDev });
            FirestoreSync.syncDeviceToFirestore(localDev);
          }
        }
      });

      const merged = Array.from(fsMap.values());
      merged.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());

      // Auto-heal: recupera e corrige aparelhos com Lista 2 ativa cujo serverDns2 esteja em branco
      merged.forEach(dev => {
        let changed = false;
        if (dev.username2 && (!dev.serverDns2 || dev.serverDns2.trim() === "")) {
          const s2 = this.servers.find(s => s.id === dev.serverId2);
          const recovered = s2?.activeDns ? normalizeDnsUrl(s2.activeDns) : (dev.serverDns ? normalizeDnsUrl(dev.serverDns) : "");
          if (recovered) {
            dev.serverDns2 = recovered;
            changed = true;
          }
        }
        if (!dev.serverDns && dev.serverId) {
          const s1 = this.servers.find(s => s.id === dev.serverId);
          if (s1?.activeDns) {
            dev.serverDns = normalizeDnsUrl(s1.activeDns);
            changed = true;
          }
        }
        if (changed) {
          FirestoreSync.syncDeviceToFirestore(dev);
        }
      });

      this.devices = merged;
      this.save();
      this.notify();
    });

    // 2. Escuta Servidores (servers) do Cloud Firestore em tempo real
    FirestoreSync.subscribeToServers((firestoreServers) => {
      const fsMap = new Map<string, ServerDocument>();
      firestoreServers.forEach(s => {
        if (s.id) fsMap.set(s.id, s);
      });

      this.servers.forEach(localSrv => {
        if (!fsMap.has(localSrv.id)) {
          fsMap.set(localSrv.id, localSrv);
          FirestoreSync.syncServerToFirestore(localSrv);
        }
      });

      this.servers = Array.from(fsMap.values());
      this.save();
      this.notify();
    });

    // 3. Escuta Usuários e Revendas (users) do Cloud Firestore em tempo real
    FirestoreSync.subscribeToUsers((firestoreUsers) => {
      const fsMap = new Map<string, UserDocument>();
      firestoreUsers.forEach(u => {
        if (u.uid) {
          const isSuper =
            u.name?.toLowerCase().includes("super admin") ||
            u.name?.toLowerCase().includes("administrador") ||
            u.email?.toLowerCase().includes("admin");
          if (isSuper && u.role !== "superadmin") {
            u.role = "superadmin";
            FirestoreSync.syncUserToFirestore(u);
          }
          fsMap.set(u.uid, u);
        }
      });

      this.users.forEach(localUser => {
        if (!fsMap.has(localUser.uid)) {
          fsMap.set(localUser.uid, localUser);
          FirestoreSync.syncUserToFirestore(localUser);
        } else {
          const remote = fsMap.get(localUser.uid)!;
          const localTime = new Date(localUser.updatedAt || localUser.createdAt || 0).getTime();
          const remoteTime = new Date(remote.updatedAt || remote.createdAt || 0).getTime();
          if (localTime > remoteTime) {
            fsMap.set(localUser.uid, { ...remote, ...localUser });
            FirestoreSync.syncUserToFirestore(localUser);
          }
        }
      });

      this.users = Array.from(fsMap.values());
      this.save();
      this.notify();
    });
  }

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
      if (u) {
        this.users = JSON.parse(u);
        this.users.forEach(usr => {
          if (
            usr.name?.toLowerCase().includes("super admin") ||
            usr.name?.toLowerCase().includes("administrador") ||
            usr.email?.toLowerCase().includes("admin")
          ) {
            usr.role = "superadmin";
          }
        });
      }
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
  getServers(userRole?: UserRole, userId?: string): ServerDocument[] {
    this.init();
    const currentUser = userId ? this.users.find(u => u.uid === userId) : null;
    const isSuper =
      !userRole ||
      userRole === "superadmin" ||
      currentUser?.role === "superadmin" ||
      currentUser?.name?.toLowerCase().includes("super admin") ||
      currentUser?.name?.toLowerCase().includes("administrador") ||
      currentUser?.email?.toLowerCase().includes("admin");

    if (isSuper) {
      return [...this.servers];
    }
    // Isolamento estrito: Revenda e Sub-revenda gerenciam apenas os servidores cadastrados por elas
    return this.servers.filter(s => (s.ownerId || "usr-admin-master") === userId);
  }

  updateServerDns(serverId: string, newDns: string, fallbacks?: string[]): { server: ServerDocument; updatedDevicesCount: number } {
    this.init();
    const srv = this.servers.find(s => s.id === serverId);
    if (!srv) throw new Error("Servidor não encontrado.");
    const cleanDns = normalizeDnsUrl(newDns);
    srv.activeDns = cleanDns;
    if (fallbacks) srv.fallbackDns = fallbacks.map(normalizeDnsUrl);
    srv.updatedAt = new Date().toISOString();
    this.save();
    FirestoreSync.syncServerToFirestore(srv);

    // Atualiza em massa a DNS em TODOS os aparelhos vinculados a este servidor
    let updatedDevicesCount = 0;
    this.devices.forEach(dev => {
      let changed = false;
      if (dev.serverId === serverId) {
        dev.serverDns = cleanDns;
        changed = true;
      }
      if (dev.serverId2 === serverId) {
        dev.serverDns2 = cleanDns;
        changed = true;
      }
      if (changed) {
        dev.updatedAt = new Date().toISOString();
        FirestoreSync.syncDeviceToFirestore(dev);
        updatedDevicesCount++;
      }
    });

    if (updatedDevicesCount > 0) {
      this.save();
      this.notify();
    }

    return { server: srv, updatedDevicesCount };
  }

  addServer(
    name: string,
    activeDns: string,
    fallbackDns: string[],
    notes: string = "",
    ownerUser?: { uid: string; name: string; role: UserRole }
  ): ServerDocument {
    this.init();
    const cleanDns = normalizeDnsUrl(activeDns);
    const newServer: ServerDocument = {
      id: "srv-" + Math.random().toString(36).substring(2, 9),
      name: name.trim(),
      activeDns: cleanDns,
      fallbackDns: fallbackDns.map(normalizeDnsUrl),
      status: "active",
      notes: notes.trim(),
      deviceCount: 0,
      ownerId: ownerUser?.uid || "usr-admin-master",
      ownerName: ownerUser?.name || "Administrador",
      ownerRole: ownerUser?.role || "superadmin",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.servers.unshift(newServer);
    this.save();
    FirestoreSync.syncServerToFirestore(newServer);
    this.notify();
    return newServer;
  }

  deleteServer(serverId: string): void {
    this.init();
    this.servers = this.servers.filter(s => s.id !== serverId);
    this.save();
    FirestoreSync.removeServerFromFirestore(serverId);
    this.notify();
  }

  migrateDevicesServer(fromServerId: string, toServerId: string): number {
    this.init();
    const targetServer = this.servers.find(s => s.id === toServerId);
    if (!targetServer) throw new Error("Servidor destino não existe.");
    let count = 0;
    this.devices.forEach(dev => {
      let changed = false;
      if (dev.serverId === fromServerId) {
        dev.serverId = toServerId;
        dev.serverName = targetServer.name;
        dev.serverDns = targetServer.activeDns;
        dev.updatedAt = new Date().toISOString();
        changed = true;
      }
      if (dev.serverId2 === fromServerId) {
        dev.serverId2 = toServerId;
        dev.serverName2 = targetServer.name;
        dev.serverDns2 = targetServer.activeDns;
        dev.updatedAt = new Date().toISOString();
        changed = true;
      }
      if (changed) {
        FirestoreSync.syncDeviceToFirestore(dev);
        count++;
      }
    });
    if (count > 0) {
      this.save();
      this.notify();
    }
    return count;
  }

  // --- APARELHOS (MACS) & ATIVAÇÃO COM CRÉDITOS ---
  getDevices(userRole: UserRole, userId: string): DeviceDocument[] {
    this.init();
    const currentUser = this.users.find(u => u.uid === userId);
    const isSuper =
      userRole === "superadmin" ||
      currentUser?.role === "superadmin" ||
      currentUser?.name?.toLowerCase().includes("super admin") ||
      currentUser?.name?.toLowerCase().includes("administrador") ||
      currentUser?.email?.toLowerCase().includes("admin");

    if (isSuper) {
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
    customNote: string = "",
    // Lista 2 (Opcional)
    serverId2?: string,
    username2?: string,
    password2?: string,
    months2?: number
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

    // Dados Lista 2 (se fornecida)
    let serverName2 = "";
    let serverDns2 = "";
    let exp2Str = "";
    if (serverId2 && username2) {
      const s2 = this.servers.find(s => s.id === serverId2);
      serverName2 = s2 ? s2.name : "Servidor 2";
      serverDns2 = s2 && s2.activeDns ? normalizeDnsUrl(s2.activeDns) : normalizeDnsUrl(serverDns);
      const exp2 = new Date();
      exp2.setDate(exp2.getDate() + (30 * (months2 || months)));
      exp2Str = exp2.toISOString();
    }

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
      // Lista 2
      serverId2: serverId2 || "",
      serverName2,
      serverDns2,
      username2: username2 || "",
      password2: password2 || "",
      expirationDate2: exp2Str,
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

  updateDevice(
    oldMac: string,
    newMac: string,
    newDeviceKey: string,
    newExpirationDate: string,
    newServerId?: string,
    newServerName?: string,
    newServerDns?: string,
    newUsername?: string,
    newPassword?: string,
    newServerId2?: string,
    newServerName2?: string,
    newServerDns2?: string,
    newUsername2?: string,
    newPassword2?: string,
    newExpirationDate2?: string,
    newCustomNote?: string
  ): DeviceDocument {
    this.init();
    const cleanOldMac = oldMac.trim().toUpperCase();
    const cleanNewMac = newMac.trim().toUpperCase();
    const devIndex = this.devices.findIndex(d => d.mac.trim().toUpperCase() === cleanOldMac);
    if (devIndex === -1) throw new Error(`Aparelho não encontrado para o MAC ${cleanOldMac}.`);

    const dev = { ...this.devices[devIndex] };

    // Se o endereço MAC foi alterado, remove o documento antigo do Firestore
    if (cleanNewMac !== cleanOldMac) {
      const exists = this.devices.some(d => d.mac.trim().toUpperCase() === cleanNewMac && d.mac.trim().toUpperCase() !== cleanOldMac);
      if (exists) throw new Error(`Já existe outro aparelho cadastrado com o MAC ${cleanNewMac}`);
      FirestoreSync.removeDeviceFromFirestore(cleanOldMac);
    }

    const isExpired = new Date(newExpirationDate) < new Date();
    const updatedStatus = dev.status === "blocked" ? "blocked" : (isExpired ? "expired" : "active");

    dev.id = cleanNewMac;
    dev.mac = cleanNewMac;
    dev.deviceKey = newDeviceKey.trim();
    dev.expirationDate = new Date(newExpirationDate).toISOString();
    dev.status = updatedStatus;
    dev.updatedAt = new Date().toISOString();

    if (newCustomNote !== undefined) {
      dev.customNote = newCustomNote.trim();
    }

    if (newServerId !== undefined && newServerId.trim() !== "") {
      dev.serverId = newServerId;
    }
    if (newServerName !== undefined && newServerName.trim() !== "") {
      dev.serverName = newServerName;
    }
    if (newServerDns !== undefined && newServerDns.trim() !== "") {
      dev.serverDns = normalizeDnsUrl(newServerDns);
    }
    if (newUsername !== undefined && newUsername.trim() !== "") {
      dev.username = newUsername.trim();
    }
    if (newPassword !== undefined && newPassword.trim() !== "") {
      dev.password = newPassword.trim();
    }

    // Lista 2
    if (newServerId2 !== undefined) {
      dev.serverId2 = newServerId2;
    }
    if (newServerName2 !== undefined) {
      dev.serverName2 = newServerName2;
    }
    if (newServerDns2 !== undefined) {
      const clean2 = newServerDns2 ? normalizeDnsUrl(newServerDns2) : "";
      dev.serverDns2 = clean2 || dev.serverDns2 || dev.serverDns || "";
    }
    if (newUsername2 !== undefined) {
      dev.username2 = newUsername2.trim();
    }
    if (newPassword2 !== undefined) {
      dev.password2 = newPassword2.trim();
    }
    if (newExpirationDate2 !== undefined) {
      dev.expirationDate2 = newExpirationDate2 ? new Date(newExpirationDate2).toISOString() : "";
    }

    this.devices[devIndex] = dev;
    this.save();
    FirestoreSync.syncDeviceToFirestore(dev);
    this.notify();
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
    const currentUser = this.users.find(u => u.uid === userId);
    const isSuper =
      userRole === "superadmin" ||
      currentUser?.role === "superadmin" ||
      currentUser?.name?.toLowerCase().includes("super admin") ||
      currentUser?.name?.toLowerCase().includes("administrador") ||
      currentUser?.email?.toLowerCase().includes("admin");

    if (isSuper) {
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
    initialCredits: number,
    password?: string
  ): UserDocument {
    this.init();
    const cleanEmail = email.trim().toLowerCase();
    const existing = this.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      throw new Error(`Já existe uma revenda cadastrada com o e-mail "${cleanEmail}".`);
    }

    const parent = this.users.find(u => u.uid === parentId);
    if (!parent) throw new Error("Usuário pai não encontrado.");

    if (parent.role !== "superadmin" && parent.credits < initialCredits) {
      throw new Error(`Saldo insuficiente para transferir ${initialCredits} créditos.`);
    }

    if (parent.role !== "superadmin" && initialCredits > 0) {
      parent.credits -= initialCredits;
      parent.updatedAt = new Date().toISOString();
      FirestoreSync.syncUserToFirestore(parent);
    }

    const newUser: UserDocument = {
      uid: "usr-" + Math.random().toString(36).substring(2, 9),
      name: name.trim(),
      email: cleanEmail,
      password: (password || "").trim(),
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
    FirestoreSync.syncUserToFirestore(newUser);
    this.notify();
    return newUser;
  }

  updateReseller(
    uid: string,
    data: {
      name?: string;
      email?: string;
      password?: string;
      role?: UserRole;
      credits?: number;
      status?: "active" | "blocked";
    }
  ): UserDocument {
    this.init();
    const userIndex = this.users.findIndex(u => u.uid === uid);
    if (userIndex === -1) throw new Error("Revenda não encontrada.");

    const existing = this.users[userIndex];

    if (data.email && data.email.trim().toLowerCase() !== existing.email.toLowerCase()) {
      const emailConflict = this.users.some(
        u => u.uid !== uid && u.email.toLowerCase() === data.email!.trim().toLowerCase()
      );
      if (emailConflict) {
        throw new Error(`Já existe outra conta com o e-mail "${data.email}".`);
      }
      existing.email = data.email.trim().toLowerCase();
    }

    if (data.name !== undefined && data.name.trim()) {
      existing.name = data.name.trim();
    }

    if (data.password !== undefined) {
      existing.password = data.password.trim();
    }

    if (data.role !== undefined) {
      existing.role = data.role;
    }

    if (data.credits !== undefined && !isNaN(data.credits)) {
      existing.credits = Math.max(0, data.credits);
    }

    if (data.status !== undefined) {
      existing.status = data.status;
    }

    existing.updatedAt = new Date().toISOString();
    this.users[userIndex] = existing;
    this.save();
    FirestoreSync.syncUserToFirestore(existing);
    this.notify();
    return existing;
  }

  toggleResellerStatus(uid: string): UserDocument {
    this.init();
    const user = this.users.find(u => u.uid === uid);
    if (!user) throw new Error("Revenda não encontrada.");
    user.status = user.status === "active" ? "blocked" : "active";
    user.updatedAt = new Date().toISOString();
    this.save();
    FirestoreSync.syncUserToFirestore(user);
    this.notify();
    return user;
  }

  deleteReseller(uid: string): void {
    this.init();
    this.users = this.users.filter(u => u.uid !== uid);
    this.save();
    FirestoreSync.deleteUserFromFirestore(uid);
    this.notify();
  }

  getResellerStats(uid: string): { activeDevices: number; totalDevices: number; expiredDevices: number; blockedDevices: number } {
    this.init();
    const now = new Date();
    // Identifica aparelhos vinculados a esta revenda diretamente
    const resellerDevices = this.devices.filter(d => d.resellerId === uid);

    let activeDevices = 0;
    let expiredDevices = 0;
    let blockedDevices = 0;

    resellerDevices.forEach(d => {
      if (d.status === "blocked") {
        blockedDevices++;
      } else {
        const isExpired = new Date(d.expirationDate) < now;
        if (isExpired || d.status === "expired") {
          expiredDevices++;
        } else {
          activeDevices++;
        }
      }
    });

    return {
      activeDevices,
      totalDevices: resellerDevices.length,
      expiredDevices,
      blockedDevices
    };
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
    targetType: "all" | "reseller" | "device" | "server",
    targetId: string,
    title: string,
    message: string,
    hoursDuration: number = 24,
    targetName?: string
  ): NotificationDocument {
    this.init();
    const exp = new Date();
    exp.setHours(exp.getHours() + hoursDuration);

    const newNotif: NotificationDocument = {
      id: "notif-" + Math.random().toString(36).substring(2, 9),
      targetType,
      targetId,
      targetName: targetName || "",
      title,
      message,
      active: true,
      createdAt: new Date().toISOString(),
      expiresAt: exp.toISOString(),
    };

    this.notifications.unshift(newNotif);
    this.save();
    FirestoreSync.syncNotificationToFirestore(newNotif);
    this.notify();
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

