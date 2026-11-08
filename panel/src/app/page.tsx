"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { store } from "@/lib/store";
import { FirestoreSync } from "@/lib/firestoreSync";
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
  Send,
  Download
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { user } = useAuth();
  const [servers, setServers] = useState<ServerDocument[]>([]);
  const [devices, setDevices] = useState<DeviceDocument[]>([]);
  const [notifications, setNotifications] = useState<NotificationDocument[]>([]);
  const [resellerStats, setResellerStats] = useState({ active: 0, total: 0, count: 0 });

  // Estado para modal rápido de troca de DNS no card de emergência
  const [quickDnsServerId, setQuickDnsServerId] = useState("");
  const [newDnsInput, setNewDnsInput] = useState("");
  const [quickDnsSuccess, setQuickDnsSuccess] = useState(false);

  // Estado para Atualização OTA do APK da TV
  const [otaVersionCode, setOtaVersionCode] = useState(18);
  const [otaVersionName, setOtaVersionName] = useState("2.9.3");
  const [otaApkUrl, setOtaApkUrl] = useState("https://github.com/Carlosaugt7/ZyveronPlay/raw/main/zyveron-play-tv.apk");
  const [otaNotes, setOtaNotes] = useState("Versão 2.9.3: Correção do instalador nativo OTA com feedback em tempo real, Modo Soneca (Sleep Timer 30-120 min), Zapping veloz no player de TV (Cima/Baixo e CH+/CH-), cobrança WhatsApp em 1 clique e exportação de clientes em CSV.");
  const [otaSavedSuccess, setOtaSavedSuccess] = useState(false);
  const [publishedOta, setPublishedOta] = useState<{ versionCode: number; versionName: string } | null>(null);

  const loadData = () => {
    if (!user) return;
    const s = store.getServers(user.role, user.uid);
    const d = store.getDevices(user.role, user.uid);
    const n = store.getNotifications();
    const users = store.getUsers("superadmin", "usr-admin-master");

    setServers(s);
    setDevices(d);
    setNotifications(n);

    // Estatísticas de Revendas e Sub-revendas
    const resellersList = users.filter((u) => u.role === "reseller" || u.role === "sub_reseller");
    const resellerUids = new Set(resellersList.map((u) => u.uid));
    const allDevs = store.getDevices("superadmin", "usr-admin-master");
    const rDevs = allDevs.filter((dev) => resellerUids.has(dev.resellerId));
    const rActive = rDevs.filter(
      (dev) => dev.status === "active" && new Date(dev.expirationDate) > new Date()
    ).length;

    setResellerStats({
      active: rActive,
      total: rDevs.length,
      count: resellersList.length,
    });

    if (s.length > 0 && !quickDnsServerId) {
      setQuickDnsServerId(s[0].id);
      setNewDnsInput(s[0].activeDns);
    }
  };

  useEffect(() => {
    loadData();
    FirestoreSync.fetchAppUpdate().then((info) => {
      if (info) {
        setPublishedOta(info);
        // Se a versão cadastrada for menor que a atual compilada (18), preenche com a 2.9.3
        if (info.versionCode < 18) {
          setOtaVersionCode(18);
          setOtaVersionName("2.9.3");
          setOtaNotes("Versão 2.9.3: Correção do instalador nativo OTA com feedback em tempo real, Modo Soneca (Sleep Timer 30-120 min), Zapping veloz no player de TV (Cima/Baixo e CH+/CH-), cobrança WhatsApp em 1 clique e exportação de clientes em CSV.");
        } else {
          setOtaVersionCode(info.versionCode);
          setOtaVersionName(info.versionName);
          setOtaNotes(info.releaseNotes || "");
        }
        if (info.apkUrl) setOtaApkUrl(info.apkUrl);
      }
    });
    const unsubscribe = store.subscribe(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [user]);

  const handleSaveOtaUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    await FirestoreSync.syncAppUpdate({
      versionCode: Number(otaVersionCode),
      versionName: otaVersionName.trim(),
      apkUrl: otaApkUrl.trim(),
      releaseNotes: otaNotes.trim(),
      isMandatory: false,
    });
    setPublishedOta({
      versionCode: Number(otaVersionCode),
      versionName: otaVersionName.trim(),
    });
    setOtaSavedSuccess(true);
    setTimeout(() => setOtaSavedSuccess(false), 4000);
  };

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
              <Link
                href="/servers"
                className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs border border-zinc-700/60 transition flex items-center gap-2"
              >
                <Server className="w-4 h-4 text-sky-400" /> Servidores & DNS
              </Link>
            </div>
          </div>
        </div>

        {/* Grade de Métricas com Cores Suaves Distintas e Sombreamento */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-5">
          {/* Card 1: Total de Aparelhos (Sky Blue) */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0c1826] to-[#0a1017] border border-sky-500/20 hover:border-sky-500/40 transition-all duration-300 shadow-lg shadow-sky-950/20 hover:shadow-sky-950/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-sky-200/80">Total de Aparelhos</span>
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Tv className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white mt-3">{devices.length}</p>
            <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px]">
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> {activeDevices} Ativos
              </span>
              {expiredDevices > 0 && (
                <>
                  <span className="text-zinc-500">•</span>
                  <span className="text-amber-400 font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {expiredDevices} Vencidos
                  </span>
                </>
              )}
              {blockedDevices > 0 && (
                <>
                  <span className="text-zinc-500">•</span>
                  <span className="text-rose-400 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {blockedDevices} Bloqueados
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Card 2: Aparelhos de Revendedores (Cyan / Teal) */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-[#091f24] to-[#0a1017] border border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-300 shadow-lg shadow-cyan-950/20 hover:shadow-cyan-950/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-cyan-200/80">Aparelhos de Revendas</span>
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white mt-3">{resellerStats.active}</p>
            <div className="flex items-center justify-between mt-3 text-[11px]">
              <span className="text-cyan-300 font-medium">
                {resellerStats.total} aparelhos no total
              </span>
              <span className="text-zinc-400 bg-zinc-900/80 px-1.5 py-0.5 rounded border border-zinc-800 text-[10px]">
                {resellerStats.count} revenda(s)
              </span>
            </div>
          </div>

          {/* Card 3: Saldo de Créditos (Amber / Ouro) */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1c170a] to-[#0a1017] border border-amber-500/20 hover:border-amber-500/40 transition-all duration-300 shadow-lg shadow-amber-950/20 hover:shadow-amber-950/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-200/80">Saldo Disponível</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Coins className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-amber-400 mt-3">
              {user?.role === "superadmin" ? "Ilimitado" : `${user?.credits ?? 0} un.`}
            </p>
            <p className="text-[11px] text-amber-200/60 mt-3 truncate">
              1 crédito = 30 dias de tela
            </p>
          </div>

          {/* Card 4: Servidores & DNS (Emerald / Verde) */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0a1c15] to-[#0a1017] border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 shadow-lg shadow-emerald-950/20 hover:shadow-emerald-950/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-200/80">Servidores & DNS</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Server className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white mt-3">{servers.length}</p>
            <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 mt-3">
              <Radio className="w-3 h-3" /> Endpoints saudáveis
            </p>
          </div>

          {/* Card 5: Aparelhos Bloqueados (Rose / Vermelho Suave) */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-[#200d11] to-[#0a1017] border border-rose-500/20 hover:border-rose-500/40 transition-all duration-300 shadow-lg shadow-rose-950/20 hover:shadow-rose-950/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-rose-200/80">Aparelhos Bloqueados</span>
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-rose-400 mt-3">{blockedDevices}</p>
            <p className="text-[11px] text-rose-300/70 mt-3 truncate">
              {blockedDevices === 0 ? "Nenhum bloqueio" : "Sinal suspenso"}
            </p>
          </div>
        </div>

        {/* Sessão Especial: Troca de DNS em Massa em 1 Clique (Card Rápido) */}
        {servers.length > 0 && (
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

        {/* Gerenciamento de Atualização OTA In-App (Apenas Administrador Master) */}
        {user?.role === "superadmin" && (
          <div className="p-6 rounded-2xl bg-[#0c1420] border border-emerald-800/40 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Lançamento de Atualização OTA (Versão da TV)
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
                      Atualização Direta no App
                    </span>
                    {publishedOta && (
                      <span className="text-[10px] bg-sky-500/10 text-sky-300 border border-sky-500/20 px-2 py-0.5 rounded-full font-mono">
                        No Ar: v{publishedOta.versionName} (Build {publishedOta.versionCode})
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-zinc-300">
                    Defina a versão oficial mais recente. Quando os clientes clicarem em &quot;Verificar Atualização&quot; no menu Ajustes, este APK será baixado e instalado automaticamente.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveOtaUpdate} className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                  Código da Versão (Build)
                </label>
                <input
                  type="number"
                  value={otaVersionCode}
                  onChange={(e) => setOtaVersionCode(Number(e.target.value))}
                  placeholder="16"
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                  Nome da Versão
                </label>
                <input
                  type="text"
                  value={otaVersionName}
                  onChange={(e) => setOtaVersionName(e.target.value)}
                  placeholder="2.9.1"
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="md:col-span-5">
                <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                  Link Direto do APK (.apk)
                </label>
                <input
                  type="url"
                  value={otaApkUrl}
                  onChange={(e) => setOtaApkUrl(e.target.value)}
                  placeholder="https://.../zyveron-play-tv.apk"
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="md:col-span-3 flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs tracking-tight transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950"
                >
                  <Download className="w-3.5 h-3.5" /> Publicar Versão para TVs
                </button>
              </div>

              <div className="md:col-span-12">
                <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                  Notas de Atualização (Exibidas na tela da TV)
                </label>
                <input
                  type="text"
                  value={otaNotes}
                  onChange={(e) => setOtaNotes(e.target.value)}
                  placeholder="Ex: Novo player ultra rápido, suporte a lista 2 e melhorias no EPG."
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </form>

            {otaSavedSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Versão OTA publicada no Firestore! Aparelhos conectados receberão esta atualização ao checar no menu Ajustes.
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

