"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { store } from "@/lib/store";
import { ServerDocument, ServerStatus } from "@/types";
import {
  Server,
  Plus,
  Zap,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Tv,
  Globe,
  Trash2,
  ExternalLink,
  Pencil,
  ShieldCheck
} from "lucide-react";

// Paleta de cores suaves e distintas para os cards de Servidores & DNS (Sem roxo/violeta)
const SERVER_CARD_THEMES = [
  {
    name: "sky",
    cardBg: "bg-gradient-to-br from-[#0c1929] via-[#0d1f33] to-[#080d14]",
    border: "border-sky-500/25 hover:border-sky-400/50",
    shadow: "shadow-lg shadow-sky-950/30 hover:shadow-sky-900/40",
    iconBg: "bg-sky-500/15 border-sky-500/30 text-sky-400 shadow-sm shadow-sky-500/20",
    dnsBox: "bg-[#071320]/80 border-sky-500/20 text-sky-300",
    dnsLabel: "text-sky-300/70",
    contingencyBadge: "bg-sky-500/10 text-sky-300 border-sky-500/20",
    badge: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    glow: "from-sky-500/10 to-transparent",
    accentBtn: "bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border-sky-500/35 hover:shadow-sky-950/50",
  },
  {
    name: "emerald",
    cardBg: "bg-gradient-to-br from-[#0a1e1b] via-[#0d2723] to-[#080d14]",
    border: "border-emerald-500/25 hover:border-emerald-400/50",
    shadow: "shadow-lg shadow-emerald-950/30 hover:shadow-emerald-900/40",
    iconBg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-sm shadow-emerald-500/20",
    dnsBox: "bg-[#071714]/80 border-emerald-500/20 text-emerald-300",
    dnsLabel: "text-emerald-300/70",
    contingencyBadge: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    glow: "from-emerald-500/10 to-transparent",
    accentBtn: "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/35 hover:shadow-emerald-950/50",
  },
  {
    name: "amber",
    cardBg: "bg-gradient-to-br from-[#1c160a] via-[#241d0e] to-[#080d14]",
    border: "border-amber-500/25 hover:border-amber-400/50",
    shadow: "shadow-lg shadow-amber-950/30 hover:shadow-amber-900/40",
    iconBg: "bg-amber-500/15 border-amber-500/30 text-amber-400 shadow-sm shadow-amber-500/20",
    dnsBox: "bg-[#181308]/80 border-amber-500/20 text-amber-300",
    dnsLabel: "text-amber-300/70",
    contingencyBadge: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    glow: "from-amber-500/10 to-transparent",
    accentBtn: "bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/35 hover:shadow-amber-950/50",
  },
  {
    name: "cyan",
    cardBg: "bg-gradient-to-br from-[#091b22] via-[#0c242e] to-[#080d14]",
    border: "border-cyan-500/25 hover:border-cyan-400/50",
    shadow: "shadow-lg shadow-cyan-950/30 hover:shadow-cyan-900/40",
    iconBg: "bg-cyan-500/15 border-cyan-500/30 text-cyan-400 shadow-sm shadow-cyan-500/20",
    dnsBox: "bg-[#07161c]/80 border-cyan-500/20 text-cyan-300",
    dnsLabel: "text-cyan-300/70",
    contingencyBadge: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
    badge: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    glow: "from-cyan-500/10 to-transparent",
    accentBtn: "bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border-cyan-500/35 hover:shadow-cyan-950/50",
  },
  {
    name: "indigo",
    cardBg: "bg-gradient-to-br from-[#0d162d] via-[#101d3c] to-[#080d14]",
    border: "border-indigo-500/25 hover:border-indigo-400/50",
    shadow: "shadow-lg shadow-indigo-950/30 hover:shadow-indigo-900/40",
    iconBg: "bg-indigo-500/15 border-indigo-500/30 text-indigo-400 shadow-sm shadow-indigo-500/20",
    dnsBox: "bg-[#0a1124]/80 border-indigo-500/20 text-indigo-300",
    dnsLabel: "text-indigo-300/70",
    contingencyBadge: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20",
    badge: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
    glow: "from-indigo-500/10 to-transparent",
    accentBtn: "bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border-indigo-500/35 hover:shadow-indigo-950/50",
  },
  {
    name: "teal",
    cardBg: "bg-gradient-to-br from-[#091b19] via-[#0c2623] to-[#080d14]",
    border: "border-teal-500/25 hover:border-teal-400/50",
    shadow: "shadow-lg shadow-teal-950/30 hover:shadow-teal-900/40",
    iconBg: "bg-teal-500/15 border-teal-500/30 text-teal-400 shadow-sm shadow-teal-500/20",
    dnsBox: "bg-[#071614]/80 border-teal-500/20 text-teal-300",
    dnsLabel: "text-teal-300/70",
    contingencyBadge: "bg-teal-500/10 text-teal-300 border-teal-500/20",
    badge: "bg-teal-500/15 text-teal-300 border-teal-500/30",
    glow: "from-teal-500/10 to-transparent",
    accentBtn: "bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border-teal-500/35 hover:shadow-teal-950/50",
  },
  {
    name: "rose",
    cardBg: "bg-gradient-to-br from-[#1c0c14] via-[#26101c] to-[#080d14]",
    border: "border-rose-500/25 hover:border-rose-400/50",
    shadow: "shadow-lg shadow-rose-950/30 hover:shadow-rose-900/40",
    iconBg: "bg-rose-500/15 border-rose-500/30 text-rose-400 shadow-sm shadow-rose-500/20",
    dnsBox: "bg-[#180911]/80 border-rose-500/20 text-rose-300",
    dnsLabel: "text-rose-300/70",
    contingencyBadge: "bg-rose-500/10 text-rose-300 border-rose-500/20",
    badge: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    glow: "from-rose-500/10 to-transparent",
    accentBtn: "bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border-rose-500/35 hover:shadow-rose-950/50",
  }
];

export default function ServersPage() {
  const { user } = useAuth();
  const [servers, setServers] = useState<ServerDocument[]>([]);

  // Modal Novo Servidor
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [activeDnsInput, setActiveDnsInput] = useState("");
  const [fallback1Input, setFallback1Input] = useState("");
  const [fallback2Input, setFallback2Input] = useState("");
  const [notesInput, setNotesInput] = useState("");

  // Modal Editar Servidor
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<ServerDocument | null>(null);
  const [editNameInput, setEditNameInput] = useState("");
  const [editActiveDnsInput, setEditActiveDnsInput] = useState("");
  const [editFallback1Input, setEditFallback1Input] = useState("");
  const [editFallback2Input, setEditFallback2Input] = useState("");
  const [editNotesInput, setEditNotesInput] = useState("");
  const [editStatusInput, setEditStatusInput] = useState<ServerStatus>("active");

  // Modal Troca em Massa de DNS
  const [isDnsModalOpen, setIsDnsModalOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<ServerDocument | null>(null);
  const [newDnsInput, setNewDnsInput] = useState("");
  const [dnsSuccessMsg, setDnsSuccessMsg] = useState("");

  // Modal Migração em Lote entre Servidores
  const [isMigrateModalOpen, setIsMigrateModalOpen] = useState(false);
  const [sourceServerId, setSourceServerId] = useState("");
  const [targetServerId, setTargetServerId] = useState("");

  const loadData = () => {
    if (!user) return;
    const s = store.getServers(user.role, user.uid);
    setServers(s);
  };

  useEffect(() => {
    loadData();
    const unsubscribe = store.subscribe(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [user]);

  const handleAddServer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim() || !activeDnsInput.trim() || !user) return;
    const fallbacks = [fallback1Input.trim(), fallback2Input.trim()].filter((f) => f.length > 0);

    store.addServer(
      nameInput.trim(),
      activeDnsInput.trim(),
      fallbacks,
      notesInput.trim(),
      { uid: user.uid, name: user.name, role: user.role }
    );
    setIsAddModalOpen(false);
    setNameInput("");
    setActiveDnsInput("");
    setFallback1Input("");
    setFallback2Input("");
    setNotesInput("");
    loadData();
  };

  const handleOpenEditModal = (srv: ServerDocument) => {
    setEditingServer(srv);
    setEditNameInput(srv.name);
    setEditActiveDnsInput(srv.activeDns);
    setEditFallback1Input(srv.fallbackDns[0] || "");
    setEditFallback2Input(srv.fallbackDns[1] || "");
    setEditNotesInput(srv.notes || "");
    setEditStatusInput(srv.status || "active");
    setIsEditModalOpen(true);
  };

  const handleSaveEditServer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingServer || !editNameInput.trim() || !editActiveDnsInput.trim()) return;
    const fallbacks = [editFallback1Input.trim(), editFallback2Input.trim()].filter((f) => f.length > 0);
    store.updateServer(editingServer.id, {
      name: editNameInput.trim(),
      activeDns: editActiveDnsInput.trim(),
      fallbackDns: fallbacks,
      notes: editNotesInput.trim(),
      status: editStatusInput
    });
    setIsEditModalOpen(false);
    setEditingServer(null);
    loadData();
  };

  const handleDeleteServer = (srv: ServerDocument) => {
    if (confirm(`Deseja realmente excluir o servidor "${srv.name}"?`)) {
      try {
        store.deleteServer(srv.id);
        loadData();
      } catch (err: any) {
        alert(err.message || "Erro ao excluir servidor.");
      }
    }
  };

  const handleOpenDnsModal = (srv: ServerDocument) => {
    setSelectedServer(srv);
    setNewDnsInput(srv.activeDns);
    setDnsSuccessMsg("");
    setIsDnsModalOpen(true);
  };

  const handleUpdateDns = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServer || !newDnsInput.trim()) return;
    try {
      const result = store.updateServerDns(selectedServer.id, newDnsInput.trim());
      setDnsSuccessMsg(`DNS do servidor "${selectedServer.name}" atualizado com sucesso! ${result.updatedDevicesCount} aparelho(s) atualizado(s) e sincronizado(s) com o novo DNS.`);
      loadData();
      setTimeout(() => {
        setIsDnsModalOpen(false);
      }, 2000);
    } catch (err: any) {
      alert(err.message || "Erro ao atualizar DNS");
    }
  };

  const handleMigrate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceServerId || !targetServerId || sourceServerId === targetServerId) {
      alert("Selecione dois servidores diferentes para a migração.");
      return;
    }
    const count = store.migrateDevicesServer(sourceServerId, targetServerId);
    alert(`${count} telas migradas com sucesso para o novo servidor!`);
    setIsMigrateModalOpen(false);
    loadData();
  };

  const totalScreens = servers.reduce((acc, s) => acc + (s.deviceCount || 0), 0);
  const activeServersCount = servers.filter((s) => (s.status || "active") === "active").length;
  const totalContingencies = servers.reduce((acc, s) => acc + (s.fallbackDns?.length || 0), 0);

  return (
    <>
      <Navbar
        title="Servidores & Troca de DNS em Massa"
        subtitle="Gerenciamento da infraestrutura de transmissão e contingência de bloqueios"
        onRefresh={loadData}
      />

      <main className="p-8 space-y-6 flex-1">
        {/* Banner Explicativo de Engenharia */}
        <div className="p-5 rounded-2xl bg-[#0f1724] border border-sky-800/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Como Funciona a Troca em Massa (Server Pointer)
              </h3>
              <p className="text-xs text-zinc-300 max-w-2xl mt-0.5">
                Os clientes na TV não salvam o DNS fixo, mas sim o código do servidor. Se um DNS for bloqueado por uma operadora, basta alterar o endereço abaixo para que 100% dos aparelhos migrem automaticamente no mesmo segundo.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (servers.length >= 2) {
                  setSourceServerId(servers[0].id);
                  setTargetServerId(servers[1].id);
                  setIsMigrateModalOpen(true);
                } else {
                  alert("Cadastre ao menos 2 servidores para usar a migração em lote.");
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-medium text-xs transition flex items-center gap-1.5"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-sky-400" /> Migrar Telas em Lote
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs tracking-tight transition flex items-center gap-1.5 shadow-lg shadow-emerald-950"
            >
              <Plus className="w-4 h-4" /> Novo Servidor
            </button>
          </div>
        </div>

        {/* Métricas Resumidas com Cores Suaves Distintas e Sombreamento */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0c1826] to-[#0a1017] border border-sky-500/20 hover:border-sky-500/40 transition-all duration-300 shadow-lg shadow-sky-950/20 hover:shadow-sky-950/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-sky-200/80">Total de Servidores</span>
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Server className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white mt-3">{servers.length}</p>
            <p className="text-[11px] text-zinc-400 mt-1">Servidores cadastrados no painel</p>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0a1e1b] to-[#0a1017] border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 shadow-lg shadow-emerald-950/20 hover:shadow-emerald-950/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-200/80">Servidores Ativos</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Radio className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-400 mt-3">{activeServersCount}</p>
            <p className="text-[11px] text-zinc-400 mt-1">100% operacionais na rede</p>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1c160a] to-[#0a1017] border border-amber-500/20 hover:border-amber-500/40 transition-all duration-300 shadow-lg shadow-amber-950/20 hover:shadow-amber-950/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-200/80">Telas Conectadas</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Tv className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white mt-3">{totalScreens}</p>
            <p className="text-[11px] text-zinc-400 mt-1">Aparelhos ativos distribuídos</p>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-[#091b22] to-[#0a1017] border border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-300 shadow-lg shadow-cyan-950/20 hover:shadow-cyan-950/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-cyan-200/80">Rotas de Contingência</span>
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-cyan-400 mt-3">{totalContingencies}</p>
            <p className="text-[11px] text-zinc-400 mt-1">Rotas reservas prontas para uso</p>
          </div>
        </div>

        {/* Lista de Servidores */}
        {servers.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#0c121a] border border-zinc-800/80 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-zinc-400 mx-auto">
              <Server className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white">Nenhum Servidor Cadastrado</h4>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Você ainda não possui servidores e DNS configurados em sua conta. Cadastre seu servidor para poder ativar aparelhos e gerenciar seus clientes de forma isolada.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs tracking-tight transition inline-flex items-center gap-1.5 shadow-lg shadow-emerald-950"
            >
              <Plus className="w-4 h-4" /> Cadastrar Meu Primeiro Servidor
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {servers.map((srv, idx) => {
              const theme = SERVER_CARD_THEMES[idx % SERVER_CARD_THEMES.length];
              return (
                <div
                  key={srv.id}
                  className={`group relative overflow-hidden p-5 rounded-2xl ${theme.cardBg} border ${theme.border} ${theme.shadow} transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between space-y-4`}
                >
                  {/* Efeito Glow Suave no Canto */}
                  <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${theme.glow} blur-2xl pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity duration-300`} />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-xl ${theme.iconBg} flex items-center justify-center transition-transform duration-300 group-hover:scale-105`}>
                          <Server className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white group-hover:text-white flex items-center gap-2">
                            {srv.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[10px] text-zinc-400 font-mono">{srv.id}</p>
                            {user?.role === "superadmin" && (
                              <span className="text-[9px] bg-zinc-900/90 text-sky-400 border border-zinc-700/80 px-1.5 py-0.2 rounded font-medium">
                                {srv.ownerRole === "superadmin" ? "Admin Master" : `Revenda: ${srv.ownerName || srv.ownerId}`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className={`flex items-center gap-1 text-[10px] ${theme.badge} px-2.5 py-0.5 rounded-full font-semibold shadow-sm`}>
                        <Radio className="w-2.5 h-2.5 animate-pulse" /> Ativo
                      </span>
                    </div>

                    {srv.notes && (
                      <p className="text-xs text-zinc-300 mt-3 line-clamp-2">{srv.notes}</p>
                    )}

                    {/* DNS Primário Atual */}
                    <div className={`mt-4 p-3.5 rounded-xl ${theme.dnsBox} border space-y-1.5 shadow-inner`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold uppercase tracking-wider block ${theme.dnsLabel}`}>
                          DNS Primário (Principal)
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400">Ativo na Rede</span>
                      </div>
                      <p className="text-xs font-mono break-all select-all font-bold">
                        {srv.activeDns}
                      </p>
                    </div>

                    {/* Contingência */}
                    {srv.fallbackDns && srv.fallbackDns.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                          Rotas de Contingência:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {srv.fallbackDns.map((fb, fbIdx) => (
                            <span
                              key={fbIdx}
                              className={`text-[11px] font-mono px-2 py-0.5 rounded-lg border ${theme.contingencyBadge} flex items-center gap-1 shadow-sm`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                              {fb}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="relative z-10 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-300 font-medium">
                      <Tv className="w-3.5 h-3.5 text-zinc-400" />
                      <span><strong className="text-white">{srv.deviceCount ?? 0}</strong> telas ativas</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditModal(srv)}
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 text-xs font-medium transition flex items-center gap-1 shadow-sm"
                        title="Editar servidor"
                      >
                        <Pencil className="w-3.5 h-3.5 text-zinc-400" /> Editar
                      </button>
                      <button
                        onClick={() => handleOpenDnsModal(srv)}
                        className={`px-3 py-1.5 rounded-lg ${theme.accentBtn} border text-xs font-bold transition flex items-center gap-1.5 shadow-sm`}
                      >
                        <Zap className="w-3.5 h-3.5" /> Trocar DNS
                      </button>
                      <button
                        onClick={() => handleDeleteServer(srv)}
                        title="Excluir servidor"
                        className="p-1.5 rounded-lg bg-zinc-800/90 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 border border-zinc-700/80 text-xs transition shadow-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Troca de DNS em Massa */}
        {isDnsModalOpen && selectedServer && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="w-full max-w-lg bg-[#0f1722] border border-zinc-800 rounded-2xl shadow-2xl my-auto max-h-[92vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4 shrink-0 bg-[#0f1722]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Trocar DNS em Massa: {selectedServer.name}
                    </h3>
                    <p className="text-[11px] text-zinc-300">
                      Afetará {selectedServer.deviceCount ?? 0} telas em tempo real
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDnsModalOpen(false)}
                  className="text-zinc-400 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              {dnsSuccessMsg ? (
                <div className="p-5">
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    <span>{dnsSuccessMsg}</span>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleUpdateDns} className="overflow-y-auto flex-1 p-5 space-y-4 text-xs">
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">
                      DNS Atual
                    </label>
                    <input
                      type="text"
                      value={selectedServer.activeDns}
                      disabled
                      className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-400 font-mono"
                    />
                  </div>

                  {selectedServer.fallbackDns.length > 0 && (
                    <div>
                      <label className="block text-zinc-300 font-medium mb-1">
                        Escolher de uma Contingência já Cadastrada:
                      </label>
                      <select
                        onChange={(e) => {
                          if (e.target.value) setNewDnsInput(e.target.value);
                        }}
                        defaultValue=""
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                      >
                        <option value="">-- Selecione uma contingência para preencher --</option>
                        {selectedServer.fallbackDns.map((fb, idx) => (
                          <option key={idx} value={fb}>
                            Contingência {idx + 1}: {fb}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-zinc-400 mt-1">
                        Ao selecionar, o campo abaixo será preenchido para substituir o DNS Primário.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">
                      Novo Endereço de DNS Principal * (ou digite manualmente)
                    </label>
                    <input
                      type="text"
                      placeholder="http://novo-dns-02.zyveronplay.com:8080"
                      value={newDnsInput}
                      onChange={(e) => setNewDnsInput(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                      required
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px]">
                    <span className="font-bold">Aviso importante:</span> A alteração atualiza a DNS Primária deste servidor e migra os aparelhos que utilizavam a DNS Primária anterior. Aparelhos configurados em contingência específica são preservados.
                  </div>

                  <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2 shrink-0 bg-[#0f1722]">
                    <button
                      type="button"
                      onClick={() => setIsDnsModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold tracking-tight transition flex items-center gap-1.5 shadow-lg shadow-sky-950"
                    >
                      <Zap className="w-3.5 h-3.5" /> Atualizar DNS Imediatamente
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Modal: Novo Servidor */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="w-full max-w-lg bg-[#0f1722] border border-zinc-800 rounded-2xl shadow-2xl my-auto max-h-[92vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4 shrink-0 bg-[#0f1722]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Cadastrar Novo Servidor</h3>
                    <p className="text-[11px] text-zinc-300">Adicione um novo cluster de streaming à rede</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-zinc-400 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddServer} className="overflow-y-auto flex-1 p-5 space-y-4 text-xs">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    Nome do Servidor *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Servidor Turbo BR 03"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    DNS Ativo Principal *
                  </label>
                  <input
                    type="text"
                    placeholder="http://stream03.zyveronplay.com:8080"
                    value={activeDnsInput}
                    onChange={(e) => setActiveDnsInput(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">
                      DNS Contingência 1 (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="http://backup01.zyveronplay.com:8080"
                      value={fallback1Input}
                      onChange={(e) => setFallback1Input(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">
                      DNS Contingência 2 (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="http://backup02.zyveronplay.com:8080"
                      value={fallback2Input}
                      onChange={(e) => setFallback2Input(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    Observações Internas
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Dedicado a clientes fibra ótica"
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2 shrink-0 bg-[#0f1722]">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold tracking-tight transition shadow-lg shadow-emerald-950"
                  >
                    Salvar Servidor
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Editar Servidor */}
        {isEditModalOpen && editingServer && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="w-full max-w-lg bg-[#0f1722] border border-zinc-800 rounded-2xl shadow-2xl my-auto max-h-[92vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4 shrink-0 bg-[#0f1722]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                    <Pencil className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Editar Servidor: {editingServer.name}</h3>
                    <p className="text-[11px] text-zinc-300">Atualize as configurações e rotas deste cluster</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-zinc-400 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveEditServer} className="overflow-y-auto flex-1 p-5 space-y-4 text-xs">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    Nome do Servidor *
                  </label>
                  <input
                    type="text"
                    value={editNameInput}
                    onChange={(e) => setEditNameInput(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    DNS Ativo Principal *
                  </label>
                  <input
                    type="text"
                    value={editActiveDnsInput}
                    onChange={(e) => setEditActiveDnsInput(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">
                      DNS Contingência 1 (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="http://backup01.zyveronplay.com:8080"
                      value={editFallback1Input}
                      onChange={(e) => setEditFallback1Input(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">
                      DNS Contingência 2 (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="http://backup02.zyveronplay.com:8080"
                      value={editFallback2Input}
                      onChange={(e) => setEditFallback2Input(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">
                      Status Operacional
                    </label>
                    <select
                      value={editStatusInput}
                      onChange={(e) => setEditStatusInput(e.target.value as ServerStatus)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="active">Ativo</option>
                      <option value="maintenance">Manutenção</option>
                      <option value="offline">Offline</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">
                      Observações Internas
                    </label>
                    <input
                      type="text"
                      value={editNotesInput}
                      onChange={(e) => setEditNotesInput(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2 shrink-0 bg-[#0f1722]">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold tracking-tight transition shadow-lg shadow-sky-950"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Migrar Telas em Lote */}
        {isMigrateModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="w-full max-w-md bg-[#0f1722] border border-zinc-800 rounded-2xl shadow-2xl my-auto max-h-[92vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4 shrink-0 bg-[#0f1722]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                    <ArrowRightLeft className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Migração de Telas em Lote</h3>
                    <p className="text-[11px] text-zinc-300">Transfira clientes de um servidor para outro</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMigrateModalOpen(false)}
                  className="text-zinc-400 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleMigrate} className="overflow-y-auto flex-1 p-5 space-y-4 text-xs">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    Servidor de Origem (Mover de)
                  </label>
                  <select
                    value={sourceServerId}
                    onChange={(e) => setSourceServerId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  >
                    {servers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.deviceCount} telas)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    Servidor de Destino (Mover para)
                  </label>
                  <select
                    value={targetServerId}
                    onChange={(e) => setTargetServerId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  >
                    {servers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.deviceCount} telas)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2 shrink-0 bg-[#0f1722]">
                  <button
                    type="button"
                    onClick={() => setIsMigrateModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold tracking-tight transition"
                  >
                    Confirmar Migração
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

