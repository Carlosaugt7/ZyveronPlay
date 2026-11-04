"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { store } from "@/lib/store";
import { UserDocument, UserRole } from "@/types";
import {
  Users,
  Plus,
  Coins,
  ArrowRightLeft,
  Mail,
  Tv,
  Pencil,
  Trash2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  KeyRound
} from "lucide-react";

export default function ResellersPage() {
  const { user, refreshUser } = useAuth();
  const [users, setUsers] = useState<UserDocument[]>([]);

  // Modal: Criar Revenda
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [roleInput, setRoleInput] = useState<"reseller" | "sub_reseller">("reseller");
  const [initialCreditsInput, setInitialCreditsInput] = useState(10);
  const [errorMsg, setErrorMsg] = useState("");

  // Modal: Editar Revenda
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingReseller, setEditingReseller] = useState<UserDocument | null>(null);
  const [editNameInput, setEditNameInput] = useState("");
  const [editEmailInput, setEditEmailInput] = useState("");
  const [editPasswordInput, setEditPasswordInput] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editRoleInput, setEditRoleInput] = useState<UserRole>("reseller");
  const [editCreditsInput, setEditCreditsInput] = useState(0);
  const [editStatusInput, setEditStatusInput] = useState<"active" | "blocked">("active");
  const [editErrorMsg, setEditErrorMsg] = useState("");

  // Modal: Transferir / Recarregar Créditos
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState("");
  const [transferAmount, setTransferAmount] = useState(10);
  const [transferNote, setTransferNote] = useState("");

  const loadData = () => {
    if (!user) return;
    const u = store.getUsers(user.role, user.uid);
    setUsers(u);
    if (u.length > 0 && !targetUserId) {
      const firstOther = u.find((item) => item.uid !== user.uid);
      if (firstOther) setTargetUserId(firstOther.uid);
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = store.subscribe(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [user]);

  const handleCreateReseller = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!user) return;
    try {
      await store.createReseller(
        nameInput.trim(),
        emailInput.trim(),
        roleInput,
        user.uid,
        initialCreditsInput,
        passwordInput.trim()
      );
      setIsCreateModalOpen(false);
      setNameInput("");
      setEmailInput("");
      setPasswordInput("");
      setShowPassword(false);
      setInitialCreditsInput(10);
      loadData();
      refreshUser();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao cadastrar revenda.");
    }
  };

  const handleOpenEditModal = (targetUser: UserDocument) => {
    setEditingReseller(targetUser);
    setEditNameInput(targetUser.name);
    setEditEmailInput(targetUser.email);
    setEditPasswordInput(targetUser.password || "");
    setShowEditPassword(false);
    setEditRoleInput(targetUser.role || "reseller");
    setEditCreditsInput(targetUser.credits || 0);
    setEditStatusInput(targetUser.status || "active");
    setEditErrorMsg("");
    setIsEditModalOpen(true);
  };

  const handleSaveEditReseller = (e: React.FormEvent) => {
    e.preventDefault();
    setEditErrorMsg("");
    if (!editingReseller) return;
    try {
      store.updateReseller(editingReseller.uid, {
        name: editNameInput.trim(),
        email: editEmailInput.trim(),
        password: editPasswordInput.trim(),
        role: editRoleInput,
        credits: editCreditsInput,
        status: editStatusInput,
      });
      setIsEditModalOpen(false);
      setEditingReseller(null);
      loadData();
      refreshUser();
    } catch (err: any) {
      setEditErrorMsg(err.message || "Erro ao salvar alterações da revenda.");
    }
  };

  const handleToggleStatus = (targetUser: UserDocument) => {
    const actionWord = targetUser.status === "active" ? "bloquear" : "desbloquear";
    if (confirm(`Tem certeza que deseja ${actionWord} a revenda "${targetUser.name}"?`)) {
      try {
        store.toggleResellerStatus(targetUser.uid);
        loadData();
        refreshUser();
      } catch (err: any) {
        alert(err.message || "Erro ao alterar status da revenda.");
      }
    }
  };

  const handleDeleteReseller = (targetUser: UserDocument) => {
    if (confirm(`ATENÇÃO: Deseja realmente EXCLUIR a revenda "${targetUser.name}" (${targetUser.email})? Esta ação não pode ser desfeita.`)) {
      try {
        store.deleteReseller(targetUser.uid);
        loadData();
        refreshUser();
      } catch (err: any) {
        alert(err.message || "Erro ao excluir revenda.");
      }
    }
  };

  const handleTransferCredits = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !targetUserId || transferAmount <= 0) return;
    try {
      store.transferCredits(
        user.uid,
        targetUserId,
        transferAmount,
        transferNote.trim()
      );
      setIsTransferModalOpen(false);
      setTransferAmount(10);
      setTransferNote("");
      loadData();
      refreshUser();
      alert("Créditos transferidos com sucesso!");
    } catch (err: any) {
      alert(err.message || "Erro na transferência.");
    }
  };

  const roleBadges: Record<UserRole, { label: string; color: string }> = {
    superadmin: { label: "Super Admin", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    reseller: { label: "Revenda Master", color: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
    sub_reseller: { label: "Sub-Revenda", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  };

  return (
    <>
      <Navbar
        title="Revendas & Sistema de Créditos"
        subtitle="Gerenciamento da estrutura multi-nível e distribuição de cotas de ativação"
        onRefresh={loadData}
      />

      <main className="p-4 sm:p-8 space-y-6 flex-1">
        {/* Banner de Créditos */}
        <div className="p-5 rounded-2xl bg-[#0f1724] border border-amber-900/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Seu Saldo Atual:{" "}
                <span className="text-amber-400">
                  {user?.role === "superadmin" ? "Ilimitado (Admin)" : `${user?.credits ?? 0} Créditos`}
                </span>
              </h3>
              <p className="text-xs text-zinc-300 max-w-xl mt-0.5">
                Distribua créditos para suas revendas ou sub-revendas. Cada crédito debitado permite ativar ou renovar 30 dias de tela para um cliente na TV.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <button
              onClick={() => setIsTransferModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-medium text-xs transition flex items-center gap-1.5"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" /> Transferir Créditos
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs tracking-tight transition flex items-center gap-1.5 shadow-lg shadow-emerald-950"
            >
              <Plus className="w-4 h-4" /> Nova Revenda
            </button>
          </div>
        </div>

        {/* Tabela de Revendedores */}
        <div className="p-4 sm:p-6 rounded-2xl bg-[#0c121a] border border-zinc-800/80 shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-300 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Nome / Identificador</th>
                  <th className="py-3 px-3">E-mail de Acesso</th>
                  <th className="py-3 px-3">Nível</th>
                  <th className="py-3 px-3">Saldo Créditos</th>
                  <th className="py-3 px-3">Aparelhos Ativos</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {users.map((u) => {
                  const stats = store.getResellerStats(u.uid);
                  const isCurrent = u.uid === user?.uid;
                  const isBlocked = u.status === "blocked";

                  return (
                    <tr key={u.uid} className="hover:bg-zinc-900/50 transition">
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-300 text-xs shrink-0">
                            {u.name.substring(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-white flex items-center gap-1.5">
                              {u.name}
                              {isCurrent && (
                                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-normal">
                                  Você
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-zinc-400 font-mono">{u.uid}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-zinc-300 font-mono">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-zinc-400 shrink-0" />
                          <span className="truncate max-w-[180px]">{u.email}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleBadges[u.role].color}`}
                        >
                          {roleBadges[u.role].label}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="font-bold text-amber-400 text-xs sm:text-sm">
                          {u.role === "superadmin" ? "Ilimitado" : `${u.credits} un.`}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <Tv className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="font-semibold text-emerald-400">{stats.activeDevices}</span>
                          <span className="text-zinc-500">/</span>
                          <span className="text-zinc-400 text-[11px]">{stats.totalDevices} tot.</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        {isBlocked ? (
                          <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full font-semibold">
                            Bloqueado
                          </span>
                        ) : (
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                            Ativo
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botão Editar */}
                          <button
                            onClick={() => handleOpenEditModal(u)}
                            title="Editar dados da revenda"
                            className="p-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 text-xs font-semibold transition"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {/* Botão Recarregar / Renovar */}
                          {!isCurrent && (
                            <button
                              onClick={() => {
                                setTargetUserId(u.uid);
                                setIsTransferModalOpen(true);
                              }}
                              title="Transferir créditos / Renovar cota"
                              className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-xs font-semibold transition flex items-center gap-1"
                            >
                              <Coins className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Recarregar</span>
                            </button>
                          )}

                          {/* Botão Bloquear / Desbloquear */}
                          {!isCurrent && (
                            <button
                              onClick={() => handleToggleStatus(u)}
                              title={isBlocked ? "Desbloquear Revenda" : "Bloquear Revenda"}
                              className={`p-1.5 rounded-lg border text-xs font-semibold transition ${
                                isBlocked
                                  ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                                  : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20"
                              }`}
                            >
                              {isBlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                            </button>
                          )}

                          {/* Botão Excluir */}
                          {!isCurrent && (
                            <button
                              onClick={() => handleDeleteReseller(u)}
                              title="Excluir revenda"
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-900/40 text-zinc-400 hover:text-rose-400 border border-zinc-700 text-xs transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Nova Revenda */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="w-full max-w-lg bg-[#0f1722] border border-zinc-800 rounded-2xl shadow-2xl my-auto max-h-[92vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4 shrink-0 bg-[#0f1722]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Criar Nova Conta de Revenda</h3>
                    <p className="text-[11px] text-zinc-300">Cadastre um parceiro ou sub-revendedor com acesso ao painel</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
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

              <form onSubmit={handleCreateReseller} className="overflow-y-auto flex-1 p-5 space-y-4 text-xs">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Nome Completo do Revendedor *</label>
                  <input
                    type="text"
                    placeholder="Ex: Carlos Oliveira"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">E-mail de Acesso *</label>
                  <input
                    type="email"
                    placeholder="carlos@email.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                    required
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">Utilizado para login no painel administrativo</p>
                </div>

                {/* Campo Senha com botão de visualização */}
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Senha de Acesso *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Defina uma senha segura"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-3 pr-10 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition"
                      title={showPassword ? "Ocultar senha" : "Ver senha"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1">Clique no ícone de olho para conferir a senha antes de salvar</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Nível Hierárquico</label>
                    <select
                      value={roleInput}
                      onChange={(e) => setRoleInput(e.target.value as any)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    >
                      {user?.role === "superadmin" && (
                        <>
                          <option value="superadmin">Super Admin (Acesso Total)</option>
                          <option value="reseller">Revenda Master</option>
                        </>
                      )}
                      <option value="sub_reseller">Sub-Revenda</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Carga Inicial de Créditos</label>
                    <input
                      type="number"
                      min={0}
                      value={initialCreditsInput}
                      onChange={(e) => setInitialCreditsInput(Number(e.target.value))}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2 shrink-0 bg-[#0f1722]">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold tracking-tight transition shadow-lg shadow-emerald-950"
                  >
                    Salvar e Ativar Revenda
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Editar Revenda */}
        {isEditModalOpen && editingReseller && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="w-full max-w-lg bg-[#0f1722] border border-zinc-800 rounded-2xl shadow-2xl my-auto max-h-[92vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4 shrink-0 bg-[#0f1722]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                    <Pencil className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Editar Dados da Revenda</h3>
                    <p className="text-[11px] text-zinc-300">Atualize informações, credenciais de acesso ou saldo</p>
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

              <form onSubmit={handleSaveEditReseller} className="overflow-y-auto flex-1 p-5 space-y-4 text-xs">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    value={editNameInput}
                    onChange={(e) => setEditNameInput(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">E-mail de Acesso *</label>
                  <input
                    type="email"
                    value={editEmailInput}
                    onChange={(e) => setEditEmailInput(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>

                {/* Senha na Edição com visualização */}
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Senha de Acesso</label>
                  <div className="relative">
                    <input
                      type={showEditPassword ? "text" : "password"}
                      placeholder="Deixe em branco para manter a atual"
                      value={editPasswordInput}
                      onChange={(e) => setEditPasswordInput(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-3 pr-10 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition"
                      title={showEditPassword ? "Ocultar senha" : "Ver senha"}
                    >
                      {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1">Altere a senha de login do revendedor se necessário</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Nível</label>
                    <select
                      value={editRoleInput}
                      onChange={(e) => setEditRoleInput(e.target.value as any)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="superadmin">Super Admin (Acesso Total)</option>
                      <option value="reseller">Revenda Master</option>
                      <option value="sub_reseller">Sub-Revenda</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Saldo de Créditos</label>
                    <input
                      type="number"
                      min={0}
                      value={editCreditsInput}
                      onChange={(e) => setEditCreditsInput(Number(e.target.value))}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Status da Conta</label>
                    <select
                      value={editStatusInput}
                      onChange={(e) => setEditStatusInput(e.target.value as any)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="active">Ativo</option>
                      <option value="blocked">Bloqueado</option>
                    </select>
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
                    className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold tracking-tight transition shadow-lg shadow-sky-950"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Transferir Créditos */}
        {isTransferModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="w-full max-w-md bg-[#0f1722] border border-zinc-800 rounded-2xl shadow-2xl my-auto max-h-[92vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4 shrink-0 bg-[#0f1722]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Transferência / Recarga de Créditos</h3>
                    <p className="text-[11px] text-zinc-300">Envie saldo para ativação de telas</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsTransferModalOpen(false)}
                  className="text-zinc-400 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleTransferCredits} className="overflow-y-auto flex-1 p-5 space-y-4 text-xs">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    Revenda Destinatária *
                  </label>
                  <select
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    {users
                      .filter((item) => item.uid !== user?.uid)
                      .map((u) => (
                        <option key={u.uid} value={u.uid}>
                          {u.name} ({u.email}) - Saldo atual: {u.credits}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    Quantidade de Créditos *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    Observação / Motivo
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Pagamento PIX confirmado"
                    value={transferNote}
                    onChange={(e) => setTransferNote(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2 shrink-0 bg-[#0f1722]">
                  <button
                    type="button"
                    onClick={() => setIsTransferModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold tracking-tight transition shadow-lg shadow-amber-950"
                  >
                    Confirmar Envio
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
