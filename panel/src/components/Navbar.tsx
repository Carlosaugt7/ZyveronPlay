"use client";

import React, { useEffect, useState } from "react";
import { Radio, RefreshCw, Bell, Search, ShieldCheck, LogOut, Menu } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface NavbarProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
}

export function Navbar({ title, subtitle, onRefresh }: NavbarProps) {
  const { user, logout } = useAuth();
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 bg-[#0c121a]/95 backdrop-blur-md border-b border-zinc-800/80 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("toggle-mobile-sidebar"));
            }
          }}
          className="md:hidden p-1.5 -ml-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
          aria-label="Abrir Menu Lateral"
        >
          <Menu className="w-5 h-5 text-emerald-400" />
        </button>
        <div>
          <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            {title}
          </h1>
          {subtitle && <p className="text-xs text-zinc-400 line-clamp-1">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Real-time sync badge */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Tempo Real (Firestore)</span>
        </div>

        {/* Clock */}
        <div className="hidden md:block text-xs font-mono text-zinc-400 bg-zinc-900/80 px-2.5 py-1 rounded-md border border-zinc-800">
          {time || "--:--:--"}
        </div>

        {/* Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800/80 rounded-lg transition"
            title="Atualizar dados"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}

        {/* Logout Button */}
        <button
          onClick={logout}
          className="p-2 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
          title="Sair do Painel"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

