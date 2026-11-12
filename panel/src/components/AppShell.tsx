"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Sidebar } from "@/components/Sidebar";
import { LoginView } from "@/components/LoginView";
import { Menu, Tv, Sun, Moon } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleToggle = () => setIsMobileMenuOpen((prev) => !prev);
    window.addEventListener("toggle-mobile-sidebar", handleToggle);
    return () => window.removeEventListener("toggle-mobile-sidebar", handleToggle);
  }, []);

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
    <div className="flex min-h-screen bg-[#090d12] overflow-x-hidden">
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#0c121a]/95 backdrop-blur-md border-b border-zinc-800/80 px-4 flex items-center justify-between z-30">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition"
          aria-label="Abrir Menu de Navegação"
        >
          <Menu className="w-5 h-5 text-emerald-400" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Tv className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm text-white">
            Zyveron <span className="text-emerald-400">Play</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 text-zinc-400 hover:text-amber-400 rounded-lg transition"
            title="Alternar tema"
            aria-label="Alternar tema"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-sky-500" />
            )}
          </button>
          <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[10px] font-bold text-emerald-300">
            {user?.name?.substring(0, 2).toUpperCase() ?? "AD"}
          </div>
        </div>
      </div>

      <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

      <div className="flex-1 md:ml-64 flex flex-col min-h-screen bg-[#090d12] w-full min-w-0 pt-14 md:pt-0">
        {children}
      </div>
    </div>
  );
}

