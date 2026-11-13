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
import { DeviceActivation, PlaylistAccount } from "../types";
import { getSelectedPlaylistIndex } from "./storage";

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

function normalizeDns(url: string): string {
  if (!url) return '';
  let clean = url.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(clean)) {
    clean = `http://${clean}`;
  }
  return clean;
}

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
      let username = (data.username || '').trim();
      let password = (data.password || '').trim();
      let serverName = (data.serverName || 'Lista 1').trim();
      let rawServerDns = (data.serverDns || data.activeDns || data.dns || data.serverUrl || '').trim();

      // Lista 2
      const serverId2 = data.serverId2 || '';
      let username2 = (data.username2 || '').trim();
      let password2 = (data.password2 || '').trim();
      let serverName2 = (data.serverName2 || 'Lista 2').trim();
      let rawServerDns2 = (data.serverDns2 || data.activeDns2 || data.dns2 || data.url2 || '').trim();
      const expirationDate2 = data.expirationDate2 || '';

      // Busca dados do servidor 1 na coleção servers se tiver serverId
      if (serverId) {
        try {
          const serverDocRef = doc(firestore, "servers", serverId);
          const serverSnap = await getDoc(serverDocRef);
          if (serverSnap.exists()) {
            const sData = serverSnap.data();
            if (sData.name) serverName = sData.name;
            if (!rawServerDns) {
              rawServerDns = sData.activeDns || sData.serverDns || sData.dns || sData.serverUrl || '';
            }
          }
        } catch (err) {
          console.error("Erro ao carregar dados do servidor 1:", err);
        }
      }

      // Busca dados do servidor 2 na coleção servers se tiver serverId2
      if (serverId2) {
        try {
          const server2DocRef = doc(firestore, "servers", serverId2);
          const server2Snap = await getDoc(server2DocRef);
          if (server2Snap.exists()) {
            const s2Data = server2Snap.data();
            if (s2Data.name) serverName2 = s2Data.name;
            if (!rawServerDns2) {
              rawServerDns2 = s2Data.activeDns || s2Data.serverDns || s2Data.dns || s2Data.serverUrl || '';
            }
          }
        } catch (err) {
          console.error("Erro ao carregar dados do servidor 2:", err);
        }
      }

      // Validação de bloqueio
      if (status === 'blocked') {
        listenerSignature = "blocked";
        callback({ status: 'blocked', message: 'Aparelho bloqueado pela administração.' });
        return;
      }

      // Fallback cruzado de DNS resiliente (idêntico ao Android TV)
      const effectiveDns1 = normalizeDns(rawServerDns || rawServerDns2);
      const effectiveDns2 = normalizeDns(rawServerDns2 || rawServerDns);

      // Constrói lista de playlists disponíveis
      const playlists: PlaylistAccount[] = [];
      if (username && effectiveDns1) {
        playlists.push({
          listIndex: 1,
          serverName: serverName || 'Lista 1',
          serverDns: effectiveDns1,
          username,
          password,
          expirationDate
        });
      }

      if (username2 && effectiveDns2) {
        playlists.push({
          listIndex: 2,
          serverName: serverName2 || 'Lista 2',
          serverDns: effectiveDns2,
          username: username2,
          password: password2,
          expirationDate: expirationDate2 || expirationDate
        });
      }

      if (playlists.length === 0) {
        listenerSignature = "unregistered_no_creds";
        callback({ 
          status: 'unregistered', 
          message: 'Aparelho cadastrado, mas nenhuma lista ou DNS configurado no painel.' 
        });
        return;
      }

      // Recupera o índice de lista salvo
      const savedIdx = getSelectedPlaylistIndex();
      const safeIdx = savedIdx >= 0 && savedIdx < playlists.length ? savedIdx : 0;
      const activeAccount = playlists[safeIdx];

      // Validação de validade da mensalidade da conta ativa
      if (activeAccount.expirationDate) {
        const expDate = new Date(activeAccount.expirationDate);
        if (!isNaN(expDate.getTime()) && expDate < new Date()) {
          listenerSignature = `expired_${safeIdx}`;
          callback({ 
            status: 'expired', 
            message: `Mensalidade (${activeAccount.serverName}) vencida em ${expDate.toLocaleDateString('pt-BR')}` 
          });
          return;
        }
      }

      // Assinatura única incluindo ambas as listas e o índice ativo
      const playlistsSig = playlists
        .map((p) => `${p.listIndex}:${p.serverDns}:${p.username}:${p.password}:${p.expirationDate}:${p.serverName}`)
        .join(';');
      const currentSignature = `${cleanMac}|${status}|${safeIdx}|${playlistsSig}`;
      if (currentSignature === listenerSignature) {
        // Nada de relevante mudou; ignora alterações de heartbeat/lastSeen
        return;
      }
      listenerSignature = currentSignature;

      const activeDevice: DeviceActivation = {
        mac: cleanMac,
        deviceKey: data.deviceKey || '',
        status: 'active',
        expirationDate: activeAccount.expirationDate || expirationDate,
        serverId: safeIdx === 0 ? serverId : (serverId2 || serverId),
        serverName: activeAccount.serverName,
        activeDns: activeAccount.serverDns,
        username: activeAccount.username,
        password: activeAccount.password,
        serverId2,
        serverName2,
        serverDns2: effectiveDns2,
        username2,
        password2,
        expirationDate2,
        playlists,
        activePlaylistIndex: safeIdx
      };

      callback({ status: 'active', device: activeDevice });
    },
    (error) => {
      console.error("Erro no listener do dispositivo:", error);
      callback({ status: 'unregistered', message: 'Erro ao conectar ao serviço de autenticação.' });
    }
  );
}

