import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  initializeFirestore,
  doc, 
  getDoc, 
  onSnapshot, 
  updateDoc, 
  serverTimestamp,
  Unsubscribe 
} from "firebase/firestore";
import { DeviceActivation } from "../types";

const firebaseConfig = {
  apiKey: "AIzaSyD_keI8HrRiu2zmXXi0JybhBFBu7xn8cbw",
  authDomain: "zyveronplay.firebaseapp.com",
  projectId: "zyveronplay",
  storageBucket: "zyveronplay.firebasestorage.app",
  messagingSenderId: "37945698653",
  appId: "1:37945698653:web:4cf82d2f42f8c9644520b4",
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Configuração otimizada para Smart TVs (LG webOS / Samsung Tizen):
// Força HTTP Long Polling para evitar que WebSockets travem ou expirem no navegador da TV
export const firestore = (() => {
  try {
    return initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
  } catch {
    return getFirestore(app);
  }
})();

export type DeviceStatusCallback = (state: {
  status: 'loading' | 'unregistered' | 'active' | 'expired' | 'blocked';
  message?: string;
  device?: DeviceActivation;
}) => void;

/**
 * Escuta o estado do dispositivo em tempo real
 */
export function listenDeviceActivation(mac: string, callback: DeviceStatusCallback): Unsubscribe {
  const cleanMac = mac.toUpperCase().trim();
  const deviceDocRef = doc(firestore, "devices", cleanMac);
  let listenerSignature = "";

  return onSnapshot(
    deviceDocRef,
    async (snapshot) => {
      if (!snapshot.exists()) {
        listenerSignature = "unregistered";
        callback({ status: 'unregistered', message: 'Aparelho ainda não ativado no painel.' });
        return;
      }

      const data = snapshot.data();
      const status = data.status || 'active';
      const expirationDate = data.expirationDate || '';
      const serverId = data.serverId || '';
      let username = data.username || '';
      let password = data.password || '';
      let serverName = data.serverName || 'Servidor 1';
      let activeDns = data.serverDns || data.activeDns || data.dns || data.serverUrl || '';

      // Se a conta 1 estiver vazia, tenta conta 2
      if (!username && data.username2) {
        username = data.username2;
        password = data.password2 || '';
        serverName = data.serverName2 || 'Servidor 2';
        activeDns = data.serverDns2 || data.activeDns2 || activeDns;
      }

      // Busca o nome do servidor na coleção servers se tiver serverId
      if (serverId) {
        try {
          const serverDocRef = doc(firestore, "servers", serverId);
          const serverSnap = await getDoc(serverDocRef);
          if (serverSnap.exists()) {
            const sData = serverSnap.data();
            if (sData.name) serverName = sData.name;
            if (!activeDns || activeDns.trim() === '') {
              activeDns = sData.activeDns || sData.serverDns || sData.dns || sData.serverUrl || '';
            }
          }
        } catch (err) {
          console.error("Erro ao carregar dados do servidor:", err);
        }
      }

      // Validação de bloqueio
      if (status === 'blocked') {
        listenerSignature = "blocked";
        callback({ status: 'blocked', message: 'Aparelho bloqueado pela administração.' });
        return;
      }

      // Validação de validade
      if (expirationDate) {
        const expDate = new Date(expirationDate);
        if (!isNaN(expDate.getTime()) && expDate < new Date()) {
          listenerSignature = "expired";
          callback({ status: 'expired', message: `Mensalidade vencida em ${expDate.toLocaleDateString('pt-BR')}` });
          return;
        }
      }

      if (!activeDns || !username || !password) {
        listenerSignature = "unregistered_no_creds";
        callback({ 
          status: 'unregistered', 
          message: 'Aparelho cadastrado, mas lista ou DNS ainda não atribuídos no painel.' 
        });
        return;
      }

      // Limpa protocolo duplo se existir
      activeDns = activeDns.trim().replace(/\/+$/, '');
      if (!/^https?:\/\//i.test(activeDns)) {
        activeDns = `http://${activeDns}`;
      }

      // Assinatura de autenticação única para evitar loops infinitos de renderização
      const currentSignature = `${cleanMac}|${status}|${expirationDate}|${serverId}|${username}|${password}|${activeDns}|${serverName}`;
      if (currentSignature === listenerSignature) {
        // Nada de relevante mudou; ignora alterações de heartbeat/lastSeen
        return;
      }
      listenerSignature = currentSignature;

      const activeDevice: DeviceActivation = {
        mac: cleanMac,
        deviceKey: data.deviceKey || '',
        status: 'active',
        expirationDate,
        serverId,
        serverName,
        activeDns,
        username,
        password
      };

      callback({ status: 'active', device: activeDevice });
    },
    (error) => {
      console.error("Erro no listener do dispositivo:", error);
      callback({ status: 'unregistered', message: 'Erro ao conectar ao serviço de autenticação.' });
    }
  );
}

