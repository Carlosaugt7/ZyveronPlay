"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/types";
import {
  Tv,
  LayoutDashboard,
  Server,
  Users,
  MessageSquare,
  History,
  Shield,
  Coins,
  ChevronRight,
  ArrowRightLeft,
  LogOut
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { user, switchRole, logout } = useAuth();

  const isSuperAdmin = user?.role === "superadmin";

  const navigation = [
    { name: "Visão Geral", href: "/", icon: LayoutDashboard, show: true },
    { name: "Aparelhos (MACs)", href: "/devices", icon: Tv, show: true },
    { name: "Servidores & DNS", href: "/servers", icon: Server, show: isSuperAdmin },
    { name: "Revendas & Saldo", href: "/resellers", icon: Users, show: true },
    { name: "Mensagens na TV", href: "/messages", icon: MessageSquare, show: true },
    { name: "Auditoria de Créditos", href: "/logs", icon: History, show: true },
  ];

  const roleLabels: Record<UserRole, { label: string; color: string }> = {
    superadmin: { label: "Super Admin", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    reseller: { label: "Revenda Master", color: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
    sub_reseller: { label: "Sub-Revenda", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  };

  return (
    <aside className="w-64 bg-[#0c121a] border-r border-zinc-800/80 flex flex-col h-screen fixed left-0 top-0 z-40 select-none">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-zinc-800/80">
        <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm shadow-emerald-950">
          <Tv className="w-5 h-5" />
        </div>
        <div>
          <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
            Zyveron <span className="text-emerald-400 font-semibold">Play</span>
          </span>
          <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Painel de Controle</p>
        </div>
      </div>

      {/* Credit Balance Badge */}
      <div className="mx-4 my-3 p-3 rounded-xl bg-zinc-900/90 border border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Coins className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] text-zinc-400 font-medium">Saldo de Créditos</p>
            <p className="text-sm font-bold text-white tracking-tight">
              {isSuperAdmin ? "∞ Ilimitado" : `${user?.credits ?? 0} créditos`}
            </p>
          </div>
        </div>
        {!isSuperAdmin && (
          <span className="text-[10px] bg-amber-500/20 text-amber-300 font-medium px-2 py-0.5 rounded-full border border-amber-500/30">
            Ativo
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-300">
          Módulos do Sistema
        </p>
        {navigation
          .filter((item) => item.show)
          .map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? "text-emerald-400" : "text-zinc-400"}`} />
                  <span>{item.name}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />}
              </Link>
            );
          })}
      </nav>

      {/* Role Switcher (Simulação de Multi-Tenant) */}
      <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/60">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[10px] text-zinc-300 font-semibold uppercase flex items-center gap-1">
            <ArrowRightLeft className="w-3 h-3" /> Simular Visão
          </span>
          <span className="text-[9px] text-zinc-300">Testar Permissões</span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          <button
            onClick={() => switchRole("superadmin")}
            className={`px-1.5 py-1 text-[10px] rounded font-medium transition ${
              user?.role === "superadmin"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => switchRole("reseller")}
            className={`px-1.5 py-1 text-[10px] rounded font-medium transition ${
              user?.role === "reseller"
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            Revenda
          </button>
          <button
            onClick={() => switchRole("sub_reseller")}
            className={`px-1.5 py-1 text-[10px] rounded font-medium transition ${
              user?.role === "sub_reseller"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            Sub-Rev.
          </button>
        </div>
      </div>

      {/* User Footer Profile & Logout */}
      <div className="p-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xs font-bold text-emerald-300 shrink-0">
            {user?.name?.substring(0, 2).toUpperCase() ?? "AD"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-zinc-200 truncate">{user?.name}</p>
            <p className="text-[10px] text-zinc-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          title="Sair da conta"
          className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition shrink-0"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}

