import { firestore } from "./firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
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
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log(`[Firestore] Servidor sincronizado: ${server.id}`);
    } catch (e) {
      console.error("[Firestore] Erro ao sincronizar servidor:", e);
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
  }
};
