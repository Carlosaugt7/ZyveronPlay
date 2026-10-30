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

  // Modal de Edição de Aparelho
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<DeviceDocument | null>(null);
  const [editMacInput, setEditMacInput] = useState("");
  const [editDeviceKeyInput, setEditDeviceKeyInput] = useState("");
  const [editExpDateInput, setEditExpDateInput] = useState("");
  const [editServerIdInput, setEditServerIdInput] = useState("");
  const [editServerDnsInput, setEditServerDnsInput] = useState("");
  const [editErrorMsg, setEditErrorMsg] = useState("");

  const loadData = () => {
    if (!user) return;
    const d = store.getDevices(user.role, user.uid);
    const s = store.getServers();
    setDevices(d);
    setServers(s);

    // Sincroniza automaticamente todos os aparelhos ativos para o Cloud Firestore
    d.forEach((device) => {
      FirestoreSync.syncDeviceToFirestore(device);
    });

    if (s.length > 0 && !serverIdInput) {
      setServerIdInput(s[0].id);
    }
  };

  useEffect(() => {
    loadData();
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
        noteInput
      );
      setIsModalOpen(false);
      setMacInput("");
      setDeviceKeyInput("");
      setUsernameInput("");
      setPasswordInput("");
      setNoteInput("");
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
    try {
      const datePart = new Date(dev.expirationDate).toISOString().split("T")[0];
      setEditExpDateInput(datePart);
    } catch {
      setEditExpDateInput("");
    }
    setEditServerIdInput(dev.serverId || (servers[0]?.id || ""));
    setEditServerDnsInput(dev.serverDns || "");
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
    if (!editExpDateInput) {
      setEditErrorMsg("Selecione uma data de vencimento válida.");
      return;
    }
    if (!editServerDnsInput.trim()) {
      setEditErrorMsg("O DNS do servidor é obrigatório.");
      return;
    }

    try {
      const targetDate = new Date(`${editExpDateInput}T23:59:59.000Z`).toISOString();
      const selectedServer = servers.find((s) => s.id === editServerIdInput);
      const serverName = selectedServer ? selectedServer.name : (editingDevice.serverName || "Servidor Padrão");

      store.updateDevice(
        editingDevice.mac,
        editMacInput,
        editDeviceKeyInput,
        targetDate,
        editServerIdInput,
        serverName,
        editServerDnsInput.trim()
      );
      setIsEditModalOpen(false);
      setEditingDevice(null);
      loadData();
    } catch (err: any) {
      setEditErrorMsg(err.message || "Erro ao salvar alterações.");
    }
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
                          <div className="flex items-center gap-2">
                            <Tv className="w-3.5 h-3.5 text-zinc-300" />
                            <div>
                              <p className="font-mono font-bold text-white">{dev.mac}</p>
                              {dev.customNote && (
                                <p className="text-[10px] text-zinc-400 truncate max-w-[160px]">
                                  {dev.customNote}
                                </p>
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
                            <span className="font-medium text-white">{dev.serverName || "Padrão"}</span>
                          </div>
                          {dev.serverDns && (
                            <p className="text-[10px] text-zinc-400 font-mono truncate max-w-[180px] mt-0.5" title={dev.serverDns}>
                              {dev.serverDns}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-zinc-300">
                          {dev.username}
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
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-[#0f1722] border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
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
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleCreateDevice} className="space-y-4 text-xs">
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

                <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
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
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-[#0f1722] border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
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
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                  {editErrorMsg}
                </div>
              )}

              <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
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

                <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
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

