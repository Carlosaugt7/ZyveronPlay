export type UserRole = "superadmin" | "reseller" | "sub_reseller";

export type ResellerTier = 
  | "iniciante" 
  | "bronze" 
  | "prata" 
  | "ouro" 
  | "master_bronze" 
  | "master_prata" 
  | "master_ouro";

export interface ResellerTierConfig {
  id: ResellerTier;
  name: string;
  credits: number;
  badgeClass: string;
}

export const RESELLER_TIERS: Record<ResellerTier, ResellerTierConfig> = {
  iniciante: { id: "iniciante", name: "Iniciante", credits: 10, badgeClass: "border-slate-500/50 text-slate-300 bg-slate-800/60" },
  bronze: { id: "bronze", name: "Bronze", credits: 20, badgeClass: "border-amber-700/60 text-amber-300 bg-amber-950/40" },
  prata: { id: "prata", name: "Prata", credits: 50, badgeClass: "border-slate-300/60 text-slate-100 bg-slate-800/80" },
  ouro: { id: "ouro", name: "Ouro", credits: 100, badgeClass: "border-yellow-500/60 text-yellow-300 bg-yellow-950/40" },
  master_bronze: { id: "master_bronze", name: "Master Bronze", credits: 250, badgeClass: "border-orange-600/60 text-orange-300 bg-orange-950/40" },
  master_prata: { id: "master_prata", name: "Master Prata", credits: 500, badgeClass: "border-sky-400/60 text-sky-200 bg-sky-950/40" },
  master_ouro: { id: "master_ouro", name: "Master Ouro", credits: 1000, badgeClass: "border-emerald-400/60 text-emerald-300 bg-emerald-950/40" },
};

export const RESELLER_TIER_ORDER: ResellerTier[] = [
  "iniciante",
  "bronze",
  "prata",
  "ouro",
  "master_bronze",
  "master_prata",
  "master_ouro"
];

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
  tier?: ResellerTier;
  tierCredits?: number;
  cycleExpiresAt?: string | null; // Data de vencimento do ciclo (ex: 30 dias)
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
  action: "deposit" | "transfer" | "activation" | "renewal" | "cycle_renewal" | "tier_migration";
  targetDeviceMac?: string | null;
  tier?: ResellerTier;
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

