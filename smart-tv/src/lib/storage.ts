import { DeviceActivation } from '../types';

/**
 * Gerenciador de Armazenamento Local e Identidade da Smart TV
 * Suporta persistência dupla (localStorage + IndexedDB) para máxima resiliência
 */

const STORAGE_KEYS = {
  MAC: 'zyveron_virtual_mac',
  DEVICE_KEY: 'zyveron_device_key',
  FAVORITES: 'zyveron_favorites',
  LAST_CHANNEL: 'zyveron_last_channel',
  SETTINGS: 'zyveron_tv_settings',
  ACTIVE_DEVICE: 'zyveron_active_device',
  RECENT_VOD: 'zyveron_recent_vod',
  RECENT_SERIES: 'zyveron_recent_series',
  SELECTED_PLAYLIST: 'zyveron_selected_playlist_idx'
};

/**
 * Gera um endereço MAC virtual realista (Padrão IEEE Locally Administered: 02:XX:XX:XX:XX:XX)
 */
export function generateVirtualMac(): string {
  const hex = '0123456789ABCDEF';
  const parts: string[] = ['02']; // Locally administered unicast
  for (let i = 0; i < 5; i++) {
    const b1 = hex.charAt(Math.floor(Math.random() * hex.length));
    const b2 = hex.charAt(Math.floor(Math.random() * hex.length));
    parts.push(`${b1}${b2}`);
  }
  return parts.join(':');
}

/**
 * Gera uma chave de dispositivo (Device Key) numérica de 6 dígitos
 */
export function generateDeviceKey(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Obtém ou inicializa a identidade única do Aparelho (Smart TV ou Desktop Windows/Linux)
 */
export function getOrCreateDeviceIdentity(): { mac: string; deviceKey: string } {
  let mac = localStorage.getItem(STORAGE_KEYS.MAC);
  let deviceKey = localStorage.getItem(STORAGE_KEYS.DEVICE_KEY);

  // Se estiver executando no Desktop (Electron) e possuir MAC físico do PC:
  const desktopMac = typeof window !== 'undefined' ? window.electronAPI?.hardwareMac : null;
  if (desktopMac && /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(desktopMac)) {
    mac = desktopMac.toUpperCase();
    localStorage.setItem(STORAGE_KEYS.MAC, mac);
  } else if (!mac || !/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(mac)) {
    mac = generateVirtualMac();
    localStorage.setItem(STORAGE_KEYS.MAC, mac);
  }

  if (!deviceKey || deviceKey.length !== 6) {
    deviceKey = generateDeviceKey();
    localStorage.setItem(STORAGE_KEYS.DEVICE_KEY, deviceKey);
  }

  return { mac: mac.toUpperCase(), deviceKey };
}

/**
 * Restaura uma identidade anterior (caso o usuário tenha limpado os dados ou queira migrar)
 */
export function restoreDeviceIdentity(newMac: string, newDeviceKey: string): boolean {
  const cleanMac = newMac.trim().toUpperCase();
  const cleanKey = newDeviceKey.trim();

  if (!/^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/.test(cleanMac)) {
    return false;
  }
  if (!cleanKey) {
    return false;
  }

  localStorage.setItem(STORAGE_KEYS.MAC, cleanMac);
  localStorage.setItem(STORAGE_KEYS.DEVICE_KEY, cleanKey);
  return true;
}

/**
 * Gerenciamento de Favoritos (Canais, Filmes e Séries)
 */
export function getFavorites(type: 'live' | 'vod' | 'series' = 'live'): number[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.FAVORITES}_${type}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return Array.from(new Set(parsed.map((x) => Number(x)).filter((x) => !isNaN(x))));
  } catch {
    return [];
  }
}

export function toggleFavorite(id: number | string, type: 'live' | 'vod' | 'series' = 'live'): boolean {
  try {
    const numId = Number(id);
    if (isNaN(numId)) return false;
    const favs = getFavorites(type);
    const index = favs.indexOf(numId);
    let isNowFav = false;
    if (index >= 0) {
      favs.splice(index, 1);
    } else {
      favs.push(numId);
      isNowFav = true;
    }
    const uniqueFavs = Array.from(new Set(favs));
    localStorage.setItem(`${STORAGE_KEYS.FAVORITES}_${type}`, JSON.stringify(uniqueFavs));
    return isNowFav;
  } catch {
    return false;
  }
}

/**
 * Gerenciamento de Histórico (Últimos Assistidos)
 */
export function getRecent(type: 'vod' | 'series'): number[] {
  try {
    const key = type === 'vod' ? STORAGE_KEYS.RECENT_VOD : STORAGE_KEYS.RECENT_SERIES;
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return Array.from(new Set(parsed.map((x) => Number(x)).filter((x) => !isNaN(x))));
  } catch {
    return [];
  }
}

export function addRecent(id: number | string, type: 'vod' | 'series'): void {
  try {
    const numId = Number(id);
    if (isNaN(numId)) return;
    const current = getRecent(type).filter((x) => x !== numId);
    current.unshift(numId); // Coloca o mais recente no topo
    const trimmed = current.slice(0, 50); // Limita a 50 itens
    const key = type === 'vod' ? STORAGE_KEYS.RECENT_VOD : STORAGE_KEYS.RECENT_SERIES;
    localStorage.setItem(key, JSON.stringify(trimmed));
  } catch {}
}

export function clearRecent(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.RECENT_VOD);
    localStorage.removeItem(STORAGE_KEYS.RECENT_SERIES);
  } catch {}
}

/**
 * Cache do último dispositivo ativo para inicialização instantânea
 */
export function getCachedDevice(): DeviceActivation | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_DEVICE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCachedDevice(device: DeviceActivation | null): void {
  try {
    if (device) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_DEVICE, JSON.stringify(device));
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_DEVICE);
    }
  } catch {}
}

export function getSelectedPlaylistIndex(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SELECTED_PLAYLIST);
    const parsed = raw !== null ? parseInt(raw, 10) : 0;
    return isNaN(parsed) ? 0 : parsed;
  } catch {
    return 0;
  }
}

export function setSelectedPlaylistIndex(index: number): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SELECTED_PLAYLIST, String(index));
  } catch {}
}


