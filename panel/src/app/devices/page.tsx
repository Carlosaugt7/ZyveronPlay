"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { store } from "@/lib/store";
import { DeviceDocument, ServerDocument, DeviceStatus } from "@/types";
import { FirestoreSync } from "@/lib/firestoreSync";
import {
  Tv,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  RotateCw,
  Trash2,
  Coins,
  Server,
  Filter,
  Pencil
} from "lucide-react";

export default function DevicesPage() {
  const { user, refreshUser } = useAuth();
  const [devices, setDevices] = useState<DeviceDocument[]>([]);
  const [servers, setServers] = useState<ServerDocument[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modal de Novo Aparelho
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [macInput, setMacInput] = useState("");
  const [deviceKeyInput, setDeviceKeyInput] = useState("");
  const [serverIdInput, setServerIdInput] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [monthsInput, setMonthsInput] = useState(1);
  const [noteInput, setNoteInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Lista 2 (Novo Aparelho)
  const [enableSecondList, setEnableSecondList] = useState(false);
  const [serverId2Input, setServerId2Input] = useState("");
  const [username2Input, setUsername2Input] = useState("");
  const [password2Input, setPassword2Input] = useState("");
  const [months2Input, setMonths2Input] = useState(1);

  // Modal de Edição de Aparelho
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<DeviceDocument | null>(null);
  const [editMacInput, setEditMacInput] = useState("");
  const [editDeviceKeyInput, setEditDeviceKeyInput] = useState("");
  const [editNoteInput, setEditNoteInput] = useState("");
  const [editUsernameInput, setEditUsernameInput] = useState("");
  const [editPasswordInput, setEditPasswordInput] = useState("");
  const [editExpDateInput, setEditExpDateInput] = useState("");
  const [editServerIdInput, setEditServerIdInput] = useState("");
  const [editServerDnsInput, setEditServerDnsInput] = useState("");
  const [editErrorMsg, setEditErrorMsg] = useState("");

  // Lista 2 (Edição)
  const [editEnableSecondList, setEditEnableSecondList] = useState(false);
  const [editServerId2Input, setEditServerId2Input] = useState("");
  const [editServerDns2Input, setEditServerDns2Input] = useState("");
  const [editUsername2Input, setEditUsername2Input] = useState("");
  const [editPassword2Input, setEditPassword2Input] = useState("");
  const [editExpDate2Input, setEditExpDate2Input] = useState("");

  const loadData = () => {
    if (!user) return;
    const d = store.getDevices(user.role, user.uid);
    const s = store.getServers(user.role, user.uid);
    setDevices(d);
    setServers(s);

    if (s.length > 0 && !serverIdInput) {
      setServerIdInput(s[0].id);
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = store.subscribe(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [user]);

  // Formata MAC automaticamente: 00:1A:79:...
  const handleMacChange = (val: string) => {
    let clean = val.replace(/[^a-fA-F0-9]/g, "").toUpperCase();
    if (clean.length > 12) clean = clean.substring(0, 12);
    const formatted = clean.match(/.{1,2}/g)?.join(":") || clean;
    setMacInput(formatted);
  };

  const handleCreateDevice = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!user) return;
    if (servers.length === 0) {
      setErrorMsg("Você ainda não possui nenhum Servidor cadastrado na sua conta. Acesse o menu 'Servidores & DNS' para cadastrar seu servidor antes de ativar aparelhos.");
      return;
    }
    if (macInput.length < 17) {
      setErrorMsg("O MAC deve ter o formato completo (ex: 00:1A:79:A4:8B:20).");
      return;
    }
    if (!deviceKeyInput.trim()) {
      setErrorMsg("Informe a Device Key (PIN de 6 dígitos) exibida na tela da TV.");
      return;
    }

    try {
      store.activateDevice(
        macInput,
        deviceKeyInput,
        serverIdInput,
        usernameInput,
        passwordInput,
        monthsInput,
        user.uid,
        noteInput,
        enableSecondList ? serverId2Input : undefined,
        enableSecondList ? username2Input : undefined,
        enableSecondList ? password2Input : undefined,
        enableSecondList ? months2Input : undefined
      );
      setIsModalOpen(false);
      setMacInput("");
      setDeviceKeyInput("");
      setUsernameInput("");
      setPasswordInput("");
      setNoteInput("");
      setEnableSecondList(false);
      setUsername2Input("");
      setPassword2Input("");
      loadData();
      refreshUser();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao ativar dispositivo.");
    }
  };

  const handleRenew = (mac: string) => {
    if (!user) return;
    const confirm = window.confirm(`Deseja renovar o aparelho ${mac} por mais 30 dias (-1 crédito)?`);
    if (!confirm) return;
    try {
      store.renewDevice(mac, 1, user.uid);
      loadData();
      refreshUser();
      alert("Aparelho renovado com sucesso por +30 dias!");
    } catch (err: any) {
      alert(err.message || "Erro ao renovar aparelho.");
    }
  };

  const handleToggleBlock = (mac: string) => {
    try {
      store.toggleDeviceStatus(mac);
      loadData();
    } catch (err: any) {
      alert(err.message || "Erro ao alterar status.");
    }
  };

  const handleDelete = (mac: string) => {
    const confirm = window.confirm(`Tem certeza que deseja remover o aparelho ${mac}?`);
    if (!confirm) return;
    store.deleteDevice(mac);
    loadData();
  };

  // Edição de Aparelho
  const handleOpenEditModal = (dev: DeviceDocument) => {
    setEditingDevice(dev);
    setEditMacInput(dev.mac);
    setEditDeviceKeyInput(dev.deviceKey);
    setEditNoteInput(dev.customNote || "");
    setEditUsernameInput(dev.username || "");
    setEditPasswordInput(dev.password || "");
    try {
      const datePart = new Date(dev.expirationDate).toISOString().split("T")[0];
      setEditExpDateInput(datePart);
    } catch {
      setEditExpDateInput("");
    }
    setEditServerIdInput(dev.serverId || (servers[0]?.id || ""));
    setEditServerDnsInput(dev.serverDns || "");

    // Lista 2
    const has2 = !!dev.username2;
    setEditEnableSecondList(has2);
    setEditServerId2Input(dev.serverId2 || (servers[1]?.id || servers[0]?.id || ""));
    setEditServerDns2Input(dev.serverDns2 || "");
    setEditUsername2Input(dev.username2 || "");
    setEditPassword2Input(dev.password2 || "");
    try {
      if (dev.expirationDate2) {
        setEditExpDate2Input(new Date(dev.expirationDate2).toISOString().split("T")[0]);
      } else {
        setEditExpDate2Input("");
      }
    } catch {
      setEditExpDate2Input("");
    }

    setEditErrorMsg("");
    setIsEditModalOpen(true);
  };

  const handleEditServerChange = (newServerId: string) => {
    setEditServerIdInput(newServerId);
    const selected = servers.find((s) => s.id === newServerId);
    if (selected && selected.activeDns) {
      setEditServerDnsInput(selected.activeDns);
    }
  };

  const handleEditServer2Change = (newServerId: string) => {
    setEditServerId2Input(newServerId);
    const selected = servers.find((s) => s.id === newServerId);
    if (selected && selected.activeDns) {
      setEditServerDns2Input(selected.activeDns);
    }
  };

  const handleEditMacChange = (val: string) => {
    let clean = val.replace(/[^a-fA-F0-9]/g, "").toUpperCase();
    if (clean.length > 12) clean = clean.substring(0, 12);
    const formatted = clean.match(/.{1,2}/g)?.join(":") || clean;
    setEditMacInput(formatted);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDevice) return;
    setEditErrorMsg("");

    if (editMacInput.length < 17) {
      setEditErrorMsg("O MAC deve ter o formato completo (ex: 00:1A:79:A4:8B:20).");
      return;
    }
    if (!editDeviceKeyInput.trim()) {
      setEditErrorMsg("Informe a Device Key (PIN de 6 dígitos).");
      return;
    }
    if (!editUsernameInput.trim()) {
      setEditErrorMsg("Informe o Usuário da Lista 1 (Xtream).");
      return;
    }
    if (!editPasswordInput.trim()) {
      setEditErrorMsg("Informe a Senha da Lista 1 (Xtream).");
      return;
    }
    if (!editExpDateInput) {
      setEditErrorMsg("Selecione uma data de vencimento válida para a Lista 1.");
      return;
    }
    if (!editServerDnsInput.trim()) {
      setEditErrorMsg("O DNS do servidor da Lista 1 é obrigatório.");
      return;
    }

    try {
      const targetDate = new Date(`${editExpDateInput}T23:59:59.000Z`).toISOString();
      const selectedServer = servers.find((s) => s.id === editServerIdInput);
      const serverName = selectedServer ? selectedServer.name : (editingDevice.serverName || "Servidor Padrão");

      let serverName2 = "";
      let targetDate2 = "";
      if (editEnableSecondList && editUsername2Input.trim()) {
        const s2 = servers.find((s) => s.id === editServerId2Input);
        serverName2 = s2 ? s2.name : (editingDevice.serverName2 || "Servidor 2");
        if (editExpDate2Input) {
          targetDate2 = new Date(`${editExpDate2Input}T23:59:59.000Z`).toISOString();
        }
      }

      store.updateDevice(
        editingDevice.mac,
        editMacInput,
        editDeviceKeyInput,
        targetDate,
        editServerIdInput,
        serverName,
        editServerDnsInput.trim(),
        editUsernameInput.trim(),
        editPasswordInput.trim(),
        editEnableSecondList ? editServerId2Input : "",
        editEnableSecondList ? serverName2 : "",
        editEnableSecondList ? editServerDns2Input.trim() : "",
        editEnableSecondList ? editUsername2Input.trim() : "",
        editEnableSecondList ? editPassword2Input.trim() : "",
        editEnableSecondList ? targetDate2 : "",
        editNoteInput.trim()
      );
      setIsEditModalOpen(false);
      setEditingDevice(null);
      loadData();
    } catch (err: any) {
      setEditErrorMsg(err.message || "Erro ao salvar alterações.");
    }
  };

  const isDeviceOnline = (dev: DeviceDocument): boolean => {
    if (dev.isOnline === false) return false;
    if (!dev.lastSeen && !dev.lastSeenIso) return false;
    const now = Date.now();
    let lastSeenTime = 0;
    if (typeof dev.lastSeen === "number") {
      lastSeenTime = dev.lastSeen;
    } else if (typeof dev.lastSeen === "string") {
      lastSeenTime = new Date(dev.lastSeen).getTime();
    } else if (dev.lastSeenIso) {
      lastSeenTime = new Date(dev.lastSeenIso).getTime();
    }
    if (isNaN(lastSeenTime) || lastSeenTime <= 0) return false;
    return now - lastSeenTime <= 120_000; // Online nos últimos 2 minutos
  };

  // Filtros
  const filteredDevices = devices.filter((dev) => {
    const matchesSearch =
      dev.mac.toLowerCase().includes(search.toLowerCase()) ||
      dev.username.toLowerCase().includes(search.toLowerCase()) ||
      (dev.customNote && dev.customNote.toLowerCase().includes(search.toLowerCase()));

    const isExpired = new Date(dev.expirationDate) < new Date();
    let currentStatus = dev.status;
    if (dev.status === "active" && isExpired) currentStatus = "expired";

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && currentStatus === "active") ||
      (statusFilter === "expired" && currentStatus === "expired") ||
      (statusFilter === "blocked" && currentStatus === "blocked");

    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <Navbar
        title="Gerenciamento de Aparelhos (MACs)"
        subtitle="Ativações, controle de mensalidades e bloqueio de clientes"
        onRefresh={loadData}
      />

      <main className="p-8 space-y-6 flex-1">
        {/* Top Actions Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por MAC, usuário ou nota..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#0c121a] border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-[#0c121a] border border-zinc-800 rounded-xl px-2 py-1.5">
              <Filter className="w-3.5 h-3.5 text-zinc-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs text-zinc-300 focus:outline-none"
              >
                <option value="all">Todos</option>
                <option value="active">Ativos</option>
                <option value="expired">Vencidos</option>
                <option value="blocked">Bloqueados</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs tracking-tight transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60"
          >
            <Plus className="w-4 h-4" /> Ativar Novo Aparelho
          </button>
        </div>

        {/* Tabela de Dispositivos */}
        <div className="p-6 rounded-2xl bg-[#0c121a] border border-zinc-800/80 shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-300 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">MAC / Identificador</th>
                  <th className="py-3 px-3">Device Key</th>
                  <th className="py-3 px-3">Servidor / DNS</th>
                  <th className="py-3 px-3">Usuário Xtream</th>
                  <th className="py-3 px-3">Revenda</th>
                  <th className="py-3 px-3">Vencimento</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredDevices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-zinc-400">
                      Nenhum aparelho encontrado com os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredDevices.map((dev) => {
                    const isExpired = new Date(dev.expirationDate) < new Date();
                    return (
                      <tr key={dev.id} className="hover:bg-zinc-900/50 transition">
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="relative">
                              <Tv className={`w-4 h-4 ${isDeviceOnline(dev) ? "text-emerald-400" : "text-zinc-500"}`} />
                              {isDeviceOnline(dev) && (
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#0c121a] animate-pulse"></span>
                              )}
                            </div>
                            <div>
                              <p className="font-mono font-bold text-white">{dev.mac}</p>
                              {dev.customNote ? (
                                <p className="text-[11px] text-sky-400 font-medium truncate max-w-[180px]">
                                  {dev.customNote}
                                </p>
                              ) : (
                                <p className="text-[10px] text-zinc-300 italic">Sem identificação</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 font-mono font-semibold text-zinc-300">
                          {dev.deviceKey}
                        </td>
                        <td className="py-3.5 px-3 text-zinc-300">
                          <div className="flex items-center gap-1.5">
                            <Server className="w-3 h-3 text-sky-400 shrink-0" />
                            <span className="font-medium text-white">{dev.serverName || "Lista 1"}</span>
                          </div>
                          {dev.username2 && (
                            <div className="flex items-center gap-1.5 mt-1 text-emerald-400">
                              <Server className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span className="font-medium text-[11px]">{dev.serverName2 || "Lista 2"}</span>
                            </div>
                          )}
                          {dev.serverDns && (
                            <p className="text-[10px] text-zinc-400 font-mono truncate max-w-[180px] mt-0.5" title={dev.serverDns}>
                              {dev.serverDns}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-zinc-300">
                          <div>{dev.username}</div>
                          {dev.username2 && (
                            <div className="text-[11px] text-emerald-400 mt-1 font-mono" title={`Lista 2: ${dev.username2}`}>
                              {dev.username2}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-zinc-400">{dev.resellerName}</td>
                        <td className="py-3.5 px-3">
                          <p className="text-zinc-200 font-medium">
                            {new Date(dev.expirationDate).toLocaleDateString("pt-BR")}
                          </p>
                          <p className="text-[10px] text-zinc-300">
                            {isExpired ? "Expirou" : "Vence em breve"}
                          </p>
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="flex flex-col gap-1 items-start">
                            {dev.status === "blocked" ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                Bloqueado
                              </span>
                            ) : isExpired ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                Vencido
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Ativo
                              </span>
                            )}

                            {isDeviceOnline(dev) ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" title="Aparelho ligado e transmitindo agora">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                                Online (Em uso)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-medium bg-zinc-900 text-zinc-500 border border-zinc-800" title="Aparelho em repouso ou desligado">
                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-600"></span>
                                Desligado
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Renovar */}
                            <button
                              onClick={() => handleRenew(dev.mac)}
                              className="px-2 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[11px] font-medium transition flex items-center gap-1"
                              title="Renovar por +30 dias (-1 crédito)"
                            >
                              <RotateCw className="w-3 h-3" /> +30d
                            </button>

                            {/* Editar */}
                            <button
                              onClick={() => handleOpenEditModal(dev)}
                              className="px-2 py-1 rounded-md bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 text-[11px] font-medium transition flex items-center gap-1"
                              title="Editar aparelho (MAC, Chave, Vencimento)"
                            >
                              <Pencil className="w-3 h-3" /> Editar
                            </button>

                            {/* Bloquear / Desbloquear */}
                            <button
                              onClick={() => handleToggleBlock(dev.mac)}
                              className={`p-1.5 rounded-md border text-[11px] transition ${
                                dev.status === "blocked"
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
                              }`}
                              title={dev.status === "blocked" ? "Desbloquear" : "Bloquear"}
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                            </button>

                            {/* Excluir */}
                            <button
                              onClick={() => handleDelete(dev.mac)}
                              className="p-1.5 rounded-md text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition"
                              title="Remover aparelho"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Ativar Novo Aparelho */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="w-full max-w-lg bg-[#0f1722] border border-zinc-800 rounded-2xl shadow-2xl my-auto max-h-[92vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4 shrink-0 bg-[#0f1722]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <Tv className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Ativar Aparelho na TV</h3>
                    <p className="text-[11px] text-zinc-400">Vincule a lista IPTV ao MAC do dispositivo</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-zinc-400 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              {errorMsg && (
                <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleCreateDevice} className="overflow-y-auto flex-1 p-5 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">
                      MAC Address (da tela da TV) *
                    </label>
                    <input
                      type="text"
                      placeholder="00:1A:79:A4:8B:20"
                      value={macInput}
                      onChange={(e) => handleMacChange(e.target.value)}
                      maxLength={17}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">
                      Device Key (PIN de 6 dígitos) *
                    </label>
                    <input
                      type="text"
                      placeholder="482910"
                      value={deviceKeyInput}
                      onChange={(e) => setDeviceKeyInput(e.target.value)}
                      maxLength={6}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                </div>

                {servers.length === 0 ? (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                    ⚠️ <strong>Nenhum Servidor/DNS cadastrado:</strong> Acesse o menu <strong>Servidores & DNS</strong> para adicionar sua URL Xtream antes de ativar novos aparelhos.
                  </div>
                ) : (
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">
                      Servidor / DNS Alvo *
                    </label>
                    <select
                      value={serverIdInput}
                      onChange={(e) => setServerIdInput(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    >
                      {servers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.activeDns})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">
                      Usuário da Lista (Xtream) *
                    </label>
                    <input
                      type="text"
                      placeholder="usuario_iptv"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">
                      Senha da Lista (Xtream) *
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">
                      Período de Ativação *
                    </label>
                    <select
                      value={monthsInput}
                      onChange={(e) => setMonthsInput(Number(e.target.value))}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value={1}>1 Mês (30 dias) - 1 Crédito</option>
                      <option value={3}>3 Meses (90 dias) - 3 Créditos</option>
                      <option value={6}>6 Meses (180 dias) - 6 Créditos</option>
                      <option value={12}>1 Ano (365 dias) - 12 Créditos</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">
                      Identificação / Nota
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: João - Quarto"
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Seção Opcional: Lista 2 de Servidor */}
                <div className="pt-2 border-t border-zinc-800">
                  <label className="flex items-center gap-2 cursor-pointer text-sky-400 font-semibold text-xs select-none">
                    <input
                      type="checkbox"
                      checked={enableSecondList}
                      onChange={(e) => {
                        setEnableSecondList(e.target.checked);
                        if (e.target.checked && !serverId2Input && servers.length > 0) {
                          setServerId2Input(servers[1]?.id || servers[0]?.id);
                        }
                      }}
                      className="rounded bg-zinc-900 border-zinc-700 text-sky-500 focus:ring-0"
                    />
                    <span>+ Adicionar 2ª Lista de Servidor no mesmo aparelho (Opcional)</span>
                  </label>

                  {enableSecondList && (
                    <div className="mt-3 p-3 bg-zinc-950/60 border border-sky-500/20 rounded-xl space-y-3">
                      <div>
                        <label className="block text-zinc-300 font-medium mb-1">
                          Servidor / DNS da Lista 2
                        </label>
                        <select
                          value={serverId2Input || servers[0]?.id || ""}
                          onChange={(e) => setServerId2Input(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                        >
                          {servers.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.activeDns})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-zinc-300 font-medium mb-1">
                            Usuário (Lista 2)
                          </label>
                          <input
                            type="text"
                            placeholder="usuario2"
                            value={username2Input}
                            onChange={(e) => setUsername2Input(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                          />
                        </div>
                        <div>
                          <label className="block text-zinc-300 font-medium mb-1">
                            Senha (Lista 2)
                          </label>
                          <input
                            type="password"
                            placeholder="••••••••"
                            value={password2Input}
                            onChange={(e) => setPassword2Input(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-zinc-800 flex items-center justify-between shrink-0 bg-[#0f1722]">
                  <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                    <Coins className="w-4 h-4" />
                    <span>Custo: {monthsInput} crédito(s)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold tracking-tight transition shadow-lg shadow-emerald-950"
                    >
                      Confirmar Ativação
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Editar Aparelho */}
        {isEditModalOpen && editingDevice && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="w-full max-w-lg bg-[#0f1722] border border-zinc-800 rounded-2xl shadow-2xl my-auto max-h-[92vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4 shrink-0 bg-[#0f1722]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                    <Pencil className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Editar Dados do Aparelho</h3>
                    <p className="text-[11px] text-zinc-400">Altere o MAC, a Chave PIN, o Servidor, o DNS ou a Data de Vencimento</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-zinc-400 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              {editErrorMsg && (
                <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                  {editErrorMsg}
                </div>
              )}

              <form onSubmit={handleSaveEdit} className="overflow-y-auto flex-1 p-5 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">
                      Virtual MAC *
                    </label>
                    <input
                      type="text"
                      placeholder="00:1A:79:XX:XX:XX"
                      value={editMacInput}
                      onChange={(e) => handleEditMacChange(e.target.value)}
                      maxLength={17}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-sky-500"
                      required
                    />
                    <p className="text-[10px] text-zinc-400 mt-1">Formato: 00:XX:XX:XX:XX:XX</p>
                  </div>
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">
                      Device Key (PIN) *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 601348"
                      value={editDeviceKeyInput}
                      onChange={(e) => setEditDeviceKeyInput(e.target.value)}
                      maxLength={10}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                      required
                    />
                    <p className="text-[10px] text-zinc-400 mt-1">Código de 6 dígitos da TV</p>
                  </div>
                </div>

                {/* Identificação / Nota */}
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    Identificação / Nome do Aparelho (Nota)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: TV Sala, Quarto Filhos, Celular João"
                    value={editNoteInput}
                    onChange={(e) => setEditNoteInput(e.target.value)}
                    maxLength={50}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Nome descritivo para você identificar o cliente ou o cômodo da casa
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">
                      Servidor Alvo
                    </label>
                    <select
                      value={editServerIdInput}
                      onChange={(e) => handleEditServerChange(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                    >
                      {servers.every((s) => s.id !== editServerIdInput) && editingDevice?.serverId && (
                        <option value={editingDevice.serverId}>
                          {editingDevice.serverName || "Servidor Atual"} (Atribuído)
                        </option>
                      )}
                      {servers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-zinc-400 mt-1">Troca a vinculação do servidor</p>
                  </div>
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">
                      DNS do Servidor *
                    </label>
                    <input
                      type="text"
                      placeholder="http://dns.exemplo.com:8080"
                      value={editServerDnsInput}
                      onChange={(e) => setEditServerDnsInput(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono text-[11px] focus:outline-none focus:border-sky-500"
                      required
                    />
                    <p className="text-[10px] text-zinc-400 mt-1">DNS ativo entregue à TV</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">
                      Usuário da Lista (Xtream) *
                    </label>
                    <input
                      type="text"
                      placeholder="usuario_iptv"
                      value={editUsernameInput}
                      onChange={(e) => setEditUsernameInput(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                      required
                    />
                    <p className="text-[10px] text-zinc-400 mt-1">Conta atribuída ao aparelho</p>
                  </div>
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">
                      Senha da Lista (Xtream) *
                    </label>
                    <input
                      type="text"
                      placeholder="••••••••"
                      value={editPasswordInput}
                      onChange={(e) => setEditPasswordInput(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                      required
                    />
                    <p className="text-[10px] text-zinc-400 mt-1">Senha de acesso Xtream</p>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    Data de Vencimento *
                  </label>
                  <input
                    type="date"
                    value={editExpDateInput}
                    onChange={(e) => setEditExpDateInput(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                    required
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">
                    O aparelho terá sinal ativo até as 23:59 desta data
                  </p>
                </div>

                {/* Seção Opcional: Lista 2 de Servidor (Edição) */}
                <div className="pt-2 border-t border-zinc-800">
                  <label className="flex items-center gap-2 cursor-pointer text-emerald-400 font-semibold text-xs select-none">
                    <input
                      type="checkbox"
                      checked={editEnableSecondList}
                      onChange={(e) => {
                        setEditEnableSecondList(e.target.checked);
                        if (e.target.checked && !editServerId2Input && servers.length > 0) {
                          setEditServerId2Input(servers[1]?.id || servers[0]?.id);
                        }
                      }}
                      className="rounded bg-zinc-900 border-zinc-700 text-emerald-500 focus:ring-0"
                    />
                    <span>Configurar 2ª Lista de Servidor (Opcional)</span>
                  </label>

                  {editEnableSecondList && (
                    <div className="mt-3 p-3 bg-zinc-950/60 border border-emerald-500/20 rounded-xl space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-zinc-300 font-medium mb-1">
                            Servidor (Lista 2)
                          </label>
                          <select
                            value={editServerId2Input || servers[0]?.id || ""}
                            onChange={(e) => handleEditServer2Change(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                          >
                            {servers.every((s) => s.id !== editServerId2Input) && editingDevice?.serverId2 && (
                              <option value={editingDevice.serverId2}>
                                {editingDevice.serverName2 || "Servidor Original"} (Atribuído)
                              </option>
                            )}
                            {servers.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-zinc-300 font-medium mb-1">
                            DNS da Lista 2
                          </label>
                          <input
                            type="text"
                            placeholder="http://dns2.exemplo.com:8080"
                            value={editServerDns2Input}
                            onChange={(e) => setEditServerDns2Input(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono text-[11px] focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-zinc-300 font-medium mb-1">
                            Usuário (Lista 2)
                          </label>
                          <input
                            type="text"
                            placeholder="usuario2_iptv"
                            value={editUsername2Input}
                            onChange={(e) => setEditUsername2Input(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-zinc-300 font-medium mb-1">
                            Senha (Lista 2)
                          </label>
                          <input
                            type="text"
                            placeholder="••••••••"
                            value={editPassword2Input}
                            onChange={(e) => setEditPassword2Input(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-zinc-300 font-medium mb-1">
                          Vencimento (Lista 2)
                        </label>
                        <input
                          type="date"
                          value={editExpDate2Input}
                          onChange={(e) => setEditExpDate2Input(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  )}
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
                    className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold tracking-tight transition shadow-lg shadow-sky-950"
                  >
                    Salvar Alterações
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

