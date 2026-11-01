"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "@/components/Sidebar";
import { LoginView } from "@/components/LoginView";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#070b10] text-white">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 animate-pulse">
          <span className="text-xl font-bold">▶</span>
        </div>
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-3 text-xs text-zinc-400 font-medium tracking-wide">
          Carregando painel Zyveron...
        </p>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="flex min-h-screen bg-[#090d12]">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-h-screen bg-[#090d12]">
        {children}
      </div>
    </div>
  );
}
