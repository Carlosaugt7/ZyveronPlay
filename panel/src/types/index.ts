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
  createdAt: string;
  updatedAt: string;
}

export interface UserDocument {
  uid: string;
  name: string;
  email: string;
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
  username: string;
  password: string; // Criptografado ou protegido
  resellerId: string;
  resellerName?: string;
  expirationDate: string; // ISO string ou data formatada
  status: DeviceStatus;
  customNote?: string;
  lastSeen?: string | null;
  createdAt: string;
  updatedAt: string;
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
  targetType: "all" | "reseller" | "device";
  targetId: string; // "all", UID da revenda ou MAC
  title: string;
  message: string;
  active: boolean;
  createdAt: string;
  expiresAt: string;
}

