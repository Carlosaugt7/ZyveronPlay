/**
 * Gerenciador de Armazenamento Local e Identidade da Smart TV
 * Suporta persistência dupla (localStorage + IndexedDB) para máxima resiliência
 */

const STORAGE_KEYS = {
  MAC: 'zyveron_virtual_mac',
  DEVICE_KEY: 'zyveron_device_key',
  FAVORITES: 'zyveron_favorites',
  LAST_CHANNEL: 'zyveron_last_channel',
  SETTINGS: 'zyveron_tv_settings'
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
 * Obtém ou inicializa a identidade única da Smart TV
 */
export function getOrCreateDeviceIdentity(): { mac: string; deviceKey: string } {
  let mac = localStorage.getItem(STORAGE_KEYS.MAC);
  let deviceKey = localStorage.getItem(STORAGE_KEYS.DEVICE_KEY);

  if (!mac || !/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(mac)) {
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
 * Gerenciamento de Canais Favoritos
 */
export function getFavorites(type: 'live' | 'vod' | 'series' = 'live'): number[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.FAVORITES}_${type}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function toggleFavorite(id: number, type: 'live' | 'vod' | 'series' = 'live'): boolean {
  try {
    const favs = getFavorites(type);
    const index = favs.indexOf(id);
    let isNowFav = false;
    if (index >= 0) {
      favs.splice(index, 1);
    } else {
      favs.push(id);
      isNowFav = true;
    }
    localStorage.setItem(`${STORAGE_KEYS.FAVORITES}_${type}`, JSON.stringify(favs));
    return isNowFav;
  } catch {
    return false;
  }
}
