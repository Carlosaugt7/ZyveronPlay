import { firestore } from "./firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc,
  getDocs, 
  onSnapshot 
} from "firebase/firestore";
import { 
  DeviceDocument, 
  ServerDocument, 
  UserDocument, 
  NotificationDocument, 
  CreditLogDocument 
} from "@/types";

/**
 * Serviço de sincronização bidirecional em tempo real com o Cloud Firestore.
 * Garante que qualquer alteração no painel seja refletida na TV no mesmo milissegundo.
 */
export const FirestoreSync = {

  // --- SERVIDORES ---
  async syncServerToFirestore(server: ServerDocument) {
    try {
      const ref = doc(firestore, "servers", server.id);
      await setDoc(ref, {
        id: server.id,
        name: server.name,
        activeDns: server.activeDns,
        fallbackDns: server.fallbackDns || [],
        status: server.status || "active",
        notes: server.notes || "",
        deviceCount: server.deviceCount || 0,
        ownerId: server.ownerId || "usr-admin-master",
        ownerName: server.ownerName || "",
        ownerRole: server.ownerRole || "superadmin",
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log(`[Firestore] Servidor sincronizado: ${server.id}`);
    } catch (e) {
      console.error("[Firestore] Erro ao sincronizar servidor:", e);
    }
  },

  async removeServerFromFirestore(serverId: string) {
    try {
      const ref = doc(firestore, "servers", serverId);
      await deleteDoc(ref);
      console.log(`[Firestore] Servidor removido: ${serverId}`);
    } catch (e) {
      console.error("[Firestore] Erro ao remover servidor:", e);
    }
  },

  // --- APARELHOS (MACS) ---
  async syncDeviceToFirestore(device: DeviceDocument) {
    try {
      const cleanMac = device.mac.trim().toUpperCase();
      const ref = doc(firestore, "devices", cleanMac);
      await setDoc(ref, {
        id: cleanMac,
        mac: cleanMac,
        deviceKey: device.deviceKey,
        serverId: device.serverId,
        serverName: device.serverName || "",
        serverDns: device.serverDns || "",
        username: device.username,
        password: device.password,
        resellerId: device.resellerId,
        resellerName: device.resellerName || "",
        expirationDate: device.expirationDate,
        status: device.status,
        customNote: device.customNote || "",
        ...(device.isOnline !== undefined ? { isOnline: device.isOnline } : {}),
        ...(device.lastSeen !== undefined && device.lastSeen !== null ? { lastSeen: device.lastSeen } : {}),
        ...(device.lastSeenIso ? { lastSeenIso: device.lastSeenIso } : {}),
        ...(device.appVersion ? { appVersion: device.appVersion } : {}),
        // Lista 2 (Opcional)
        serverId2: device.serverId2 || "",
        serverName2: device.serverName2 || "",
        serverDns2: device.serverDns2 || "",
        username2: device.username2 || "",
        password2: device.password2 || "",
        expirationDate2: device.expirationDate2 || "",
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log(`[Firestore] Aparelho ativado/atualizado com sucesso: ${cleanMac}`);
    } catch (e) {
      console.error("[Firestore] Erro ao sincronizar aparelho:", e);
    }
  },

  async updateDeviceStatus(mac: string, newStatus: "active" | "blocked" | "expired") {
    try {
      const cleanMac = mac.trim().toUpperCase();
      const ref = doc(firestore, "devices", cleanMac);
      await updateDoc(ref, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      console.log(`[Firestore] Status do aparelho atualizado para ${newStatus}: ${cleanMac}`);
    } catch (e) {
      console.error("[Firestore] Erro ao atualizar status:", e);
    }
  },

  async removeDeviceFromFirestore(mac: string) {
    try {
      const cleanMac = mac.trim().toUpperCase();
      const ref = doc(firestore, "devices", cleanMac);
      await deleteDoc(ref);
      console.log(`[Firestore] Aparelho removido do Firestore: ${cleanMac}`);
    } catch (e) {
      console.error("[Firestore] Erro ao deletar aparelho:", e);
    }
  },

  // --- NOTIFICAÇÕES NA TV ---
  async syncNotificationToFirestore(notif: NotificationDocument) {
    try {
      const ref = doc(firestore, "notifications", notif.id);
      await setDoc(ref, {
        id: notif.id,
        targetType: notif.targetType,
        targetId: notif.targetId,
        targetName: notif.targetName || "",
        title: notif.title,
        message: notif.message,
        active: notif.active,
        createdAt: notif.createdAt,
        expiresAt: notif.expiresAt
      });
      console.log(`[Firestore] Notificação enviada para a TV: ${notif.title}`);
    } catch (e) {
      console.error("[Firestore] Erro ao enviar notificação:", e);
    }
  },

  async deleteNotificationFromFirestore(notifId: string) {
    try {
      const ref = doc(firestore, "notifications", notifId);
      await deleteDoc(ref);
    } catch (e) {
      console.error("[Firestore] Erro ao apagar notificação:", e);
    }
  },

  // --- ATUALIZAÇÕES DO APLICATIVO (OTA) ---
  async syncAppUpdate(info: { versionCode: number; versionName: string; apkUrl: string; releaseNotes: string; isMandatory?: boolean }) {
    try {
      const ref = doc(firestore, "system_config", "app_update");
      await setDoc(ref, {
        versionCode: Number(info.versionCode),
        versionName: info.versionName,
        apkUrl: info.apkUrl,
        releaseNotes: info.releaseNotes,
        isMandatory: info.isMandatory || false,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log(`[Firestore] Configuração de atualização OTA salva: v${info.versionName} (${info.versionCode})`);
    } catch (e) {
      console.error("[Firestore] Erro ao sincronizar app_update:", e);
    }
  },

  async fetchAppUpdate(): Promise<{ versionCode: number; versionName: string; apkUrl: string; releaseNotes: string; isMandatory?: boolean } | null> {
    try {
      const ref = doc(firestore, "system_config", "app_update");
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return snap.data() as any;
      }
      return null;
    } catch (e) {
      console.error("[Firestore] Erro ao buscar app_update:", e);
      return null;
    }
  },

  subscribeToAppUpdate(callback: (info: { versionCode: number; versionName: string; apkUrl: string; releaseNotes: string; isMandatory?: boolean } | null) => void): () => void {
    try {
      const ref = doc(firestore, "system_config", "app_update");
      return onSnapshot(ref, (snap) => {
        if (snap.exists()) {
          callback(snap.data() as any);
        } else {
          callback(null);
        }
      }, (err) => {
        console.warn("[Firestore] Erro na escuta de app_update:", err);
      });
    } catch (e) {
      console.warn("[Firestore] Falha ao registrar listener de app_update:", e);
      return () => {};
    }
  },

  // --- USUÁRIOS / ADMIN ---
  async syncUserToFirestore(user: UserDocument) {
    try {
      const ref = doc(firestore, "users", user.uid);
      await setDoc(ref, {
        uid: user.uid,
        name: user.name,
        email: user.email,
        password: user.password || "",
        role: user.role,
        parentId: user.parentId || null,
        credits: user.credits,
        status: user.status || "active",
        createdAt: user.createdAt,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log(`[Firestore] Usuário sincronizado: ${user.email} (${user.uid})`);
    } catch (e) {
      console.error("[Firestore] Erro ao sincronizar usuário:", e);
    }
  },

  async deleteUserFromFirestore(uid: string) {
    try {
      const ref = doc(firestore, "users", uid);
      await deleteDoc(ref);
      console.log(`[Firestore] Usuário removido do Firestore: ${uid}`);
    } catch (e) {
      console.error("[Firestore] Erro ao deletar usuário:", e);
    }
  },

  // --- CONSULTAS E LISTENERS EM TEMPO REAL ---
  async fetchAllDevices(): Promise<DeviceDocument[]> {
    try {
      const col = collection(firestore, "devices");
      const snap = await getDocs(col);
      const list: DeviceDocument[] = [];
      snap.forEach((d) => {
        const data = d.data() as DeviceDocument;
        if (data.mac) list.push(data);
      });
      return list;
    } catch (e) {
      console.error("[Firestore] Erro ao buscar aparelhos:", e);
      return [];
    }
  },

  async fetchAllServers(): Promise<ServerDocument[]> {
    try {
      const col = collection(firestore, "servers");
      const snap = await getDocs(col);
      const list: ServerDocument[] = [];
      snap.forEach((d) => {
        const data = d.data() as ServerDocument;
        if (data.id) list.push(data);
      });
      return list;
    } catch (e) {
      console.error("[Firestore] Erro ao buscar servidores:", e);
      return [];
    }
  },

  subscribeToDevices(callback: (devices: DeviceDocument[]) => void): () => void {
    try {
      const col = collection(firestore, "devices");
      return onSnapshot(col, (snap) => {
        const list: DeviceDocument[] = [];
        snap.forEach((d) => {
          const data = d.data() as DeviceDocument;
          if (data.mac) list.push(data);
        });
        callback(list);
      }, (err) => {
        console.warn("[Firestore] Erro na escuta em tempo real de aparelhos:", err);
      });
    } catch (e) {
      console.warn("[Firestore] Falha ao registrar listener de devices:", e);
      return () => {};
    }
  },

  subscribeToServers(callback: (servers: ServerDocument[]) => void): () => void {
    try {
      const col = collection(firestore, "servers");
      return onSnapshot(col, (snap) => {
        const list: ServerDocument[] = [];
        snap.forEach((d) => {
          const data = d.data() as ServerDocument;
          if (data.id) list.push(data);
        });
        callback(list);
      }, (err) => {
        console.warn("[Firestore] Erro na escuta em tempo real de servidores:", err);
      });
    } catch (e) {
      console.warn("[Firestore] Falha ao registrar listener de servers:", e);
      return () => {};
    }
  },

  async fetchAllUsers(): Promise<UserDocument[]> {
    try {
      const col = collection(firestore, "users");
      const snap = await getDocs(col);
      const list: UserDocument[] = [];
      snap.forEach((d) => {
        const data = d.data() as UserDocument;
        if (data.uid) list.push(data);
      });
      return list;
    } catch (e) {
      console.error("[Firestore] Erro ao buscar usuários:", e);
      return [];
    }
  },

  subscribeToUsers(callback: (users: UserDocument[]) => void): () => void {
    try {
      const col = collection(firestore, "users");
      return onSnapshot(col, (snap) => {
        const list: UserDocument[] = [];
        snap.forEach((d) => {
          const data = d.data() as UserDocument;
          if (data.uid) list.push(data);
        });
        callback(list);
      }, (err) => {
        console.warn("[Firestore] Erro na escuta em tempo real de usuários:", err);
      });
    } catch (e) {
      console.warn("[Firestore] Falha ao registrar listener de users:", e);
      return () => {};
    }
  }
};
