"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { store } from "@/lib/store";
import { ServerDocument, DeviceDocument, NotificationDocument } from "@/types";
import {
  Tv,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Server,
  Coins,
  Users,
  Zap,
  ArrowRight,
  Radio,
  Clock,
  Send
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { user } = useAuth();
  const [servers, setServers] = useState<ServerDocument[]>([]);
  const [devices, setDevices] = useState<DeviceDocument[]>([]);
  const [notifications, setNotifications] = useState<NotificationDocument[]>([]);

  // Estado para modal rápido de troca de DNS no card de emergência
  const [quickDnsServerId, setQuickDnsServerId] = useState("");
  const [newDnsInput, setNewDnsInput] = useState("");
  const [quickDnsSuccess, setQuickDnsSuccess] = useState(false);

  const loadData = () => {
    if (!user) return;
    const s = store.getServers();
    const d = store.getDevices(user.role, user.uid);
    const n = store.getNotifications();
    setServers(s);
    setDevices(d);
    setNotifications(n);
    if (s.length > 0 && !quickDnsServerId) {
      setQuickDnsServerId(s[0].id);
      setNewDnsInput(s[0].activeDns);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const activeDevices = devices.filter((d) => d.status === "active").length;
  const expiredDevices = devices.filter((d) => d.status === "expired").length;
  const blockedDevices = devices.filter((d) => d.status === "blocked").length;

  const handleQuickDnsChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickDnsServerId || !newDnsInput.trim()) return;
    try {
      store.updateServerDns(quickDnsServerId, newDnsInput.trim());
      setQuickDnsSuccess(true);
      setTimeout(() => setQuickDnsSuccess(false), 3500);
      loadData();
    } catch (err: any) {
      alert(err.message || "Erro ao atualizar DNS");
    }
  };

  return (
    <>
      <Navbar
        title="Painel de Controle"
        subtitle="Visão geral e monitoramento do Zyveron Play"
        onRefresh={loadData}
      />

      <main className="p-8 space-y-8 flex-1">
        {/* Banner de Boas-Vindas */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0d1829] via-[#0e1f36] to-[#0a1524] border border-sky-900/40 p-6 shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                Sistema Operacional Ativo
              </span>
              <h2 className="text-2xl font-bold text-white mt-2">
                Olá, {user?.name || "Administrador"}!
              </h2>
              <p className="text-sm text-zinc-300 mt-1 max-w-xl">
                Você tem{" "}
                <span className="text-emerald-400 font-semibold">{activeDevices} aparelhos ativos</span>{" "}
                reproduzindo listas em tempo real. A rede de streaming está 100% online.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/devices"
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs tracking-tight transition flex items-center gap-2 shadow-lg shadow-emerald-950/50"
              >
                <Tv className="w-4 h-4" /> Ativar Aparelho (MAC)
              </Link>
              {user?.role === "superadmin" && (
                <Link
                  href="/servers"
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs border border-zinc-700/60 transition flex items-center gap-2"
                >
                  <Server className="w-4 h-4 text-sky-400" /> Servidores
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Grade de Métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total de Aparelhos */}
          <div className="p-5 rounded-2xl bg-[#0d141e] border border-zinc-800/80 hover:border-zinc-700/80 transition shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-300">Total de Aparelhos</span>
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Tv className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white mt-3">{devices.length}</p>
            <div className="flex items-center gap-2 mt-3 text-[11px]">
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> {activeDevices} Ativos
              </span>
              <span className="text-zinc-400">•</span>
              <span className="text-amber-400 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" /> {expiredDevices} Vencidos
              </span>
            </div>
          </div>

          {/* Saldo de Créditos */}
          <div className="p-5 rounded-2xl bg-[#0d141e] border border-zinc-800/80 hover:border-zinc-700/80 transition shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-300">Saldo Disponível</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Coins className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-amber-400 mt-3">
              {user?.role === "superadmin" ? "Ilimitado" : `${user?.credits ?? 0} un.`}
            </p>
            <p className="text-[11px] text-zinc-300 mt-3">
              1 crédito = 30 dias de acesso por tela
            </p>
          </div>

          {/* Servidores Conectados */}
          <div className="p-5 rounded-2xl bg-[#0d141e] border border-zinc-800/80 hover:border-zinc-700/80 transition shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-300">Servidores & DNS</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Server className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white mt-3">{servers.length}</p>
            <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 mt-3">
              <Radio className="w-3 h-3" /> Todos os endpoints saudáveis
            </p>
          </div>

          {/* Bloqueados / Inadimplentes */}
          <div className="p-5 rounded-2xl bg-[#0d141e] border border-zinc-800/80 hover:border-zinc-700/80 transition shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-300">Aparelhos Bloqueados</span>
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-rose-400 mt-3">{blockedDevices}</p>
            <p className="text-[11px] text-zinc-300 mt-3">
              Sem sinal de streaming até regularização
            </p>
          </div>
        </div>

        {/* Sessão Especial: Troca de DNS em Massa em 1 Clique (Card Rápido) */}
        {user?.role === "superadmin" && (
          <div className="p-6 rounded-2xl bg-[#0f1824] border border-sky-800/40 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Ação Imediata: Troca de DNS em Massa
                    <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-full font-medium">
                      Atualização Instantânea na TV
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-300">
                    O DNS foi bloqueado pela operadora? Altere o endereço aqui para migrar todos os clientes instantaneamente.
                  </p>
                </div>
              </div>
              <Link
                href="/servers"
                className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 self-start sm:self-auto"
              >
                Gerenciar Todos os Servidores <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <form onSubmit={handleQuickDnsChange} className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
              <div className="md:col-span-4">
                <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                  Selecione o Servidor Alvo
                </label>
                <select
                  value={quickDnsServerId}
                  onChange={(e) => {
                    setQuickDnsServerId(e.target.value);
                    const s = servers.find((item) => item.id === e.target.value);
                    if (s) setNewDnsInput(s.activeDns);
                  }}
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                >
                  {servers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.deviceCount} telas)
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-6">
                <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                  Novo Endereço de DNS / URL Xtream
                </label>
                <input
                  type="text"
                  value={newDnsInput}
                  onChange={(e) => setNewDnsInput(e.target.value)}
                  placeholder="http://novo-dns-ativo.xyz:8080"
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div className="md:col-span-2 flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs tracking-tight transition flex items-center justify-center gap-1.5 shadow-md shadow-sky-950"
                >
                  <Zap className="w-3.5 h-3.5" /> Aplicar na Rede
                </button>
              </div>
            </form>

            {quickDnsSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> DNS atualizado com sucesso! Todos os aparelhos vinculados já receberam o novo endereço.
              </div>
            )}
          </div>
        )}

        {/* Tabela de Aparelhos Recentes */}
        <div className="p-6 rounded-2xl bg-[#0c121a] border border-zinc-800/80 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Últimos Aparelhos Cadastrados</h3>
              <p className="text-xs text-zinc-300">
                Acompanhe o status e a data de validade dos clientes ativos no sistema.
              </p>
            </div>
            <Link
              href="/devices"
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              Ver Todos os Aparelhos <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-300 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">MAC do Aparelho</th>
                  <th className="py-3 px-3">Device Key</th>
                  <th className="py-3 px-3">Servidor</th>
                  <th className="py-3 px-3">Revenda</th>
                  <th className="py-3 px-3">Vencimento</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {devices.slice(0, 5).map((device) => {
                  const isExpired = new Date(device.expirationDate) < new Date();
                  return (
                    <tr key={device.id} className="hover:bg-zinc-900/50 transition">
                      <td className="py-3 px-3 font-mono font-bold text-white flex items-center gap-2">
                        <Tv className="w-3.5 h-3.5 text-zinc-300" />
                        {device.mac}
                      </td>
                      <td className="py-3 px-3 font-mono text-zinc-300">{device.deviceKey}</td>
                      <td className="py-3 px-3 text-zinc-300">{device.serverName || "Padrão"}</td>
                      <td className="py-3 px-3 text-zinc-400">{device.resellerName}</td>
                      <td className="py-3 px-3 text-zinc-300">
                        {new Date(device.expirationDate).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-3 px-3">
                        {device.status === "blocked" ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            Bloqueado
                          </span>
                        ) : isExpired ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Vencido
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Ativo
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          href="/devices"
                          className="text-[11px] text-sky-400 hover:text-sky-300 font-medium"
                        >
                          Gerenciar
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}

