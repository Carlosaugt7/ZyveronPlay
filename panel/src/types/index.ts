export type UserRole = "superadmin" | "reseller" | "sub_reseller";

export type DeviceStatus = "active" | "blocked" | "expired";

export type ServerStatus = "active" | "maintenance" | "inactive";

export interface ServerDocument {
  id: string;
  name: string;
  activeDns: string;
  fallbackDns: string[];
  status: ServerStatus;
  notes?: string;
  deviceCount?: number;
  ownerId?: string; // UID do usuário que cadastrou (admin ou revenda)
  ownerName?: string;
  ownerRole?: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface UserDocument {
  uid: string;
  name: string;
  email: string;
  password?: string;
  passwordVersion?: number; // 2 = bcrypt hash, undefined/1 = texto plano (legado)
  role: UserRole;
  parentId: string | null;
  credits: number;
  status: "active" | "blocked";
  createdAt: string;
  updatedAt: string;
}

export interface DeviceDocument {
  id: string; // MAC Address
  mac: string;
  deviceKey: string;
  serverId: string;
  serverName?: string;
  serverDns?: string;
  username: string;
  password: string; // Criptografado ou protegido
  resellerId: string;
  resellerName?: string;
  expirationDate: string; // ISO string ou data formatada
  status: DeviceStatus;
  customNote?: string;
  isOnline?: boolean;
  lastSeen?: string | number | null;
  lastSeenIso?: string | null;
  appVersion?: string;
  createdAt: string;
  updatedAt: string;

  // Lista 2 (Opcional - suporte a até duas listas de servidores no mesmo aparelho)
  serverId2?: string;
  serverName2?: string;
  serverDns2?: string;
  username2?: string;
  password2?: string;
  expirationDate2?: string;
}

export interface CreditLogDocument {
  id: string;
  fromUserId: string | null;
  fromUserName?: string;
  toUserId: string;
  toUserName?: string;
  amount: number;
  action: "deposit" | "transfer" | "activation" | "renewal";
  targetDeviceMac?: string | null;
  note: string;
  timestamp: string;
}

export interface NotificationDocument {
  id: string;
  targetType: "all" | "reseller" | "device" | "server";
  targetId: string; // "all", UID da revenda, MAC ou ID do Servidor
  targetName?: string;
  title: string;
  message: string;
  active: boolean;
  createdAt: string;
  expiresAt: string;
}

