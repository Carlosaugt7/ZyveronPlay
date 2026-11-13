"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { store } from "@/lib/store";
import {
  UserDocument,
  UserRole,
  ResellerTier,
  RESELLER_TIERS,
  RESELLER_TIER_ORDER,
} from "@/types";
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
  RotateCw,
  ArrowUpCircle,
  Award,
  Calendar,
  Clock,
  Sparkles,
  Check,
  ShieldCheck,
  HelpCircle,
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
  const [roleInput, setRoleInput] = useState<UserRole>("reseller");
  const [selectedTier, setSelectedTier] = useState<ResellerTier>("iniciante");
  const [errorMsg, setErrorMsg] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Modal: Editar Revenda
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingReseller, setEditingReseller] = useState<UserDocument | null>(null);
  const [editNameInput, setEditNameInput] = useState("");
  const [editEmailInput, setEditEmailInput] = useState("");
  const [editPasswordInput, setEditPasswordInput] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editRoleInput, setEditRoleInput] = useState<UserRole>("reseller");
  const [editTierInput, setEditTierInput] = useState<ResellerTier>("iniciante");
  const [editCreditsInput, setEditCreditsInput] = useState(0);
  const [editStatusInput, setEditStatusInput] = useState<"active" | "blocked">("active");
  const [editCycleDaysAdd, setEditCycleDaysAdd] = useState(0);
  const [editErrorMsg, setEditErrorMsg] = useState("");

  // Modal: Renovar Modo (Franquia - Opção A)
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [renewTargetUser, setRenewTargetUser] = useState<UserDocument | null>(null);
  const [renewLoading, setRenewLoading] = useState(false);
  const [renewErrorMsg, setRenewErrorMsg] = useState("");

  // Modal: Migrar Modo
  const [isMigrateModalOpen, setIsMigrateModalOpen] = useState(false);
  const [migrateTargetUser, setMigrateTargetUser] = useState<UserDocument | null>(null);
  const [migrateSelectedTier, setMigrateSelectedTier] = useState<ResellerTier>("bronze");
  const [migrateLoading, setMigrateLoading] = useState(false);
  const [migrateErrorMsg, setMigrateErrorMsg] = useState("");

  // Modal: Transferir / Recarregar Créditos (Avulso)
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

  // Lista de Modos que o usuário logado tem permissão hierárquica para atribuir
  const allowedTiers = useMemo((): ResellerTier[] => {
    if (!user) return ["iniciante"];
    if (user.role === "superadmin") return RESELLER_TIER_ORDER;
    const myTier = user.tier || "iniciante";
    const myIdx = RESELLER_TIER_ORDER.indexOf(myTier);
    return RESELLER_TIER_ORDER.slice(0, myIdx + 1);
  }, [user]);

  // Informações de ciclo / validade formatadas
  const getCycleInfo = (cycleExpiresAt?: string | null) => {
    if (!cycleExpiresAt) {
      return {
        badge: "Sem ciclo",
        sub: "Indeterminado",
        colorClass: "bg-zinc-800/60 text-zinc-400 border-zinc-700/60",
        isExpired: false,
      };
    }
    const expDate = new Date(cycleExpiresAt);
    const now = new Date();
    const diffMs = expDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    const formattedDate = expDate.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    if (diffDays < 0) {
      return {
        badge: `Vencido (${Math.abs(diffDays)}d)`,
        sub: formattedDate,
        colorClass: "bg-rose-500/10 text-rose-400 border-rose-500/30",
        isExpired: true,
      };
    }
    if (diffDays <= 3) {
      return {
        badge: `${diffDays}d restantes`,
        sub: formattedDate,
        colorClass: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        isExpired: false,
      };
    }
    return {
      badge: `${diffDays}d restantes`,
      sub: formattedDate,
      colorClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      isExpired: false,
    };
  };

  // Renderizador do badge de modo
  const renderTierBadge = (tier?: ResellerTier) => {
    const config = RESELLER_TIERS[tier || "iniciante"] || RESELLER_TIERS.iniciante;
    return (
      <span
        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-sm ${config.badgeClass}`}
      >
        <Award className="w-3 h-3 shrink-0" />
        {config.name}
      </span>
    );
  };

  // --- HANDLER: Criar Revenda com Modo Selecionado ---
  const handleCreateReseller = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!user) return;

    const tierConfig = RESELLER_TIERS[selectedTier];
    if (user.role !== "superadmin" && user.credits < tierConfig.credits) {
      setErrorMsg(
        `Saldo insuficiente para ativar o modo ${tierConfig.name}. Necessário: ${tierConfig.credits} créditos, seu saldo: ${user.credits}.`
      );
      return;
    }

    try {
      setIsCreating(true);
      await store.createReseller(
        nameInput.trim(),
        emailInput.trim(),
        roleInput,
        user.uid,
        selectedTier,
        passwordInput.trim()
      );
      setIsCreateModalOpen(false);
      setNameInput("");
      setEmailInput("");
      setPasswordInput("");
      setShowPassword(false);
      setSelectedTier("iniciante");
      loadData();
      refreshUser();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao cadastrar revenda.");
    } finally {
      setIsCreating(false);
    }
  };

  // --- HANDLER: Abrir Modal de Edição ---
  const handleOpenEditModal = (targetUser: UserDocument) => {
    setEditingReseller(targetUser);
    setEditNameInput(targetUser.name);
    setEditEmailInput(targetUser.email);
    setEditPasswordInput(targetUser.password || "");
    setShowEditPassword(false);
    setEditRoleInput(targetUser.role || "reseller");
    setEditTierInput(targetUser.tier || "iniciante");
    setEditCreditsInput(targetUser.credits || 0);
    setEditStatusInput(targetUser.status || "active");
    setEditCycleDaysAdd(0);
    setEditErrorMsg("");
    setIsEditModalOpen(true);
  };

  // --- HANDLER: Salvar Edição ---
  const handleSaveEditReseller = (e: React.FormEvent) => {
    e.preventDefault();
    setEditErrorMsg("");
    if (!editingReseller) return;

    try {
      let updatedCycleExpiresAt = editingReseller.cycleExpiresAt;
      if (editCycleDaysAdd > 0) {
        const base = editingReseller.cycleExpiresAt ? new Date(editingReseller.cycleExpiresAt).getTime() : Date.now();
        const baseTime = base > Date.now() ? base : Date.now();
        updatedCycleExpiresAt = new Date(baseTime + editCycleDaysAdd * 24 * 60 * 60 * 1000).toISOString();
      }

      const tierConfig = RESELLER_TIERS[editTierInput] || RESELLER_TIERS.iniciante;

      store.updateReseller(editingReseller.uid, {
        name: editNameInput.trim(),
        email: editEmailInput.trim(),
        password: editPasswordInput.trim(),
        role: editRoleInput,
        tier: editTierInput,
        tierCredits: tierConfig.credits,
        credits: editCreditsInput,
        status: editStatusInput,
        cycleExpiresAt: updatedCycleExpiresAt,
      });

      setIsEditModalOpen(false);
      setEditingReseller(null);
      loadData();
      refreshUser();
    } catch (err: any) {
      setEditErrorMsg(err.message || "Erro ao salvar alterações da revenda.");
    }
  };

  // --- HANDLER: Renovar Modo (Franquia Opção A) ---
  const handleConfirmRenew = () => {
    if (!renewTargetUser || !user) return;
    setRenewErrorMsg("");
    try {
      setRenewLoading(true);
      store.renewResellerTier(renewTargetUser.uid, user.uid);
      setIsRenewModalOpen(false);
      setRenewTargetUser(null);
      loadData();
      refreshUser();
    } catch (err: any) {
      setRenewErrorMsg(err.message || "Erro ao renovar a franquia da revenda.");
    } finally {
      setRenewLoading(false);
    }
  };

  // --- HANDLER: Migrar Modo ---
  const handleConfirmMigrate = () => {
    if (!migrateTargetUser || !user) return;
    setMigrateErrorMsg("");
    try {
      setMigrateLoading(true);
      store.migrateResellerTier(migrateTargetUser.uid, migrateSelectedTier, user.uid);
      setIsMigrateModalOpen(false);
      setMigrateTargetUser(null);
      loadData();
      refreshUser();
    } catch (err: any) {
      setMigrateErrorMsg(err.message || "Erro ao migrar o modo da revenda.");
    } finally {
      setMigrateLoading(false);
    }
  };

  // --- HANDLER: Bloquear / Desbloquear ---
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

  // --- HANDLER: Excluir ---
  const handleDeleteReseller = (targetUser: UserDocument) => {
    if (
      confirm(
        `ATENÇÃO: Deseja realmente EXCLUIR a revenda "${targetUser.name}" (${targetUser.email})? Esta ação não pode ser desfeita.`
      )
    ) {
      try {
        store.deleteReseller(targetUser.uid);
        loadData();
        refreshUser();
      } catch (err: any) {
        alert(err.message || "Erro ao excluir revenda.");
      }
    }
  };

  // --- HANDLER: Transferência Avulsa de Créditos ---
  const handleTransferCredits = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !targetUserId || transferAmount <= 0) return;
    try {
      store.transferCredits(user.uid, targetUserId, transferAmount, transferNote.trim());
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
        title="Revendas & Sistema de Franquias"
        subtitle="Gerenciamento de revendas, modos de franquia (Iniciante ao Master Ouro) e renovação de ciclos"
        onRefresh={loadData}
      />

      <main className="p-4 sm:p-8 space-y-6 flex-1">
        {/* Banner de Créditos & Resumo do Plano */}
        <div className="p-5 rounded-2xl bg-[#0f1724] border border-amber-900/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  Seu Saldo:{" "}
                  <span className="text-amber-400 text-base">
                    {user?.role === "superadmin" ? "Ilimitado (Super Admin)" : `${user?.credits ?? 0} Créditos`}
                  </span>
                </h3>
                {user?.tier && (
                  <span className="hidden sm:inline-flex">{renderTierBadge(user.tier)}</span>
                )}
              </div>
              <p className="text-xs text-zinc-300 max-w-2xl mt-0.5 leading-relaxed">
                Controle franquias com cotas pré-definidas (de 10 a 1.000 créditos), renove ciclos de 30 dias com restauração automática de saldo e controle permissões hierárquicas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <button
              onClick={() => setIsTransferModalOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-medium text-xs transition flex items-center gap-1.5"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
              <span>Transferir Avulso</span>
            </button>
            <button
              onClick={() => {
                setErrorMsg("");
                setSelectedTier("iniciante");
                setIsCreateModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs tracking-tight transition flex items-center gap-1.5 shadow-lg shadow-emerald-950"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Revenda / Modo</span>
            </button>
          </div>
        </div>

        {/* Tabela de Revendedores com Modos e Ciclos */}
        <div className="p-4 sm:p-6 rounded-2xl bg-[#0c121a] border border-zinc-800/80 shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-300 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Nome / Identificador</th>
                  <th className="py-3 px-3">E-mail de Acesso</th>
                  <th className="py-3 px-3">Nível</th>
                  <th className="py-3 px-3">Modo (Franquia)</th>
                  <th className="py-3 px-3">Saldo / Cota</th>
                  <th className="py-3 px-3">Ciclo (30 dias)</th>
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
                  const currentTier = u.tier || "iniciante";
                  const tierConfig = RESELLER_TIERS[currentTier] || RESELLER_TIERS.iniciante;
                  const cycleInfo = getCycleInfo(u.cycleExpiresAt);
                  const maxQuota = u.tierCredits || tierConfig.credits;
                  const quotaPercent = Math.min(100, Math.max(0, Math.round(((u.credits || 0) / (maxQuota || 1)) * 100)));

                  return (
                    <tr key={u.uid} className="hover:bg-zinc-900/50 transition">
                      {/* Nome / Identificador */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-200 text-xs shrink-0">
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

                      {/* E-mail */}
                      <td className="py-3.5 px-3 text-zinc-300 font-mono">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-zinc-400 shrink-0" />
                          <span className="truncate max-w-[170px]">{u.email}</span>
                        </div>
                      </td>

                      {/* Nível Hierárquico */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleBadges[u.role].color}`}
                        >
                          {roleBadges[u.role].label}
                        </span>
                      </td>

                      {/* Modo da Franquia */}
                      <td className="py-3.5 px-3">
                        {u.role === "superadmin" ? (
                          <span className="text-[10px] text-zinc-400 font-medium">Acesso Total</span>
                        ) : (
                          renderTierBadge(u.tier)
                        )}
                      </td>

                      {/* Saldo / Cota */}
                      <td className="py-3.5 px-3">
                        {u.role === "superadmin" ? (
                          <span className="font-bold text-amber-400 text-xs">Ilimitado</span>
                        ) : (
                          <div>
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-amber-400 text-xs sm:text-sm">{u.credits}</span>
                              <span className="text-zinc-500 text-xs">/</span>
                              <span className="text-zinc-400 text-xs font-semibold">{maxQuota} un.</span>
                            </div>
                            <div className="w-20 h-1.5 bg-zinc-800 rounded-full mt-1 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  quotaPercent > 50
                                    ? "bg-emerald-500"
                                    : quotaPercent > 20
                                    ? "bg-amber-500"
                                    : "bg-rose-500"
                                }`}
                                style={{ width: `${quotaPercent}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Ciclo (Validade 30 dias) */}
                      <td className="py-3.5 px-3">
                        {u.role === "superadmin" ? (
                          <span className="text-[10px] text-zinc-500">Permanente</span>
                        ) : (
                          <div className="space-y-0.5">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cycleInfo.colorClass}`}
                            >
                              <Clock className="w-2.5 h-2.5 shrink-0" />
                              {cycleInfo.badge}
                            </span>
                            <p className="text-[10px] text-zinc-400">{cycleInfo.sub}</p>
                          </div>
                        )}
                      </td>

                      {/* Aparelhos Ativos */}
                      <td className="py-3.5 px-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <Tv className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="font-bold text-emerald-400 text-sm">{stats.activeDevices}</span>
                            <span className="text-zinc-400 text-xs">ativos</span>
                            <span className="text-zinc-600">/</span>
                            <span className="text-zinc-400 text-[11px]">{stats.totalDevices} tot.</span>
                          </div>
                          {stats.subResellersCount > 0 ? (
                            <div className="text-[10px] text-zinc-400">
                              <span>Diretos: <strong className="text-zinc-200">{stats.directActiveDevices}</strong></span>
                              <span className="mx-1">•</span>
                              <span>Sub-revendas ({stats.subResellersCount}): <strong className="text-sky-400">{stats.subActiveDevices}</strong></span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-zinc-500 block">Todos diretos</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
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

                      {/* Ações */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botão Renovar Modo (Franquia Opção A) */}
                          {!isCurrent && u.role !== "superadmin" && (
                            <button
                              onClick={() => {
                                setRenewTargetUser(u);
                                setRenewErrorMsg("");
                                setIsRenewModalOpen(true);
                              }}
                              title="Renovar Modo Franquia (Restaura cota & +30 dias)"
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold transition"
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Botão Migrar Modo */}
                          {!isCurrent && u.role !== "superadmin" && (
                            <button
                              onClick={() => {
                                setMigrateTargetUser(u);
                                setMigrateSelectedTier(u.tier || "iniciante");
                                setMigrateErrorMsg("");
                                setIsMigrateModalOpen(true);
                              }}
                              title="Migrar Modo / Upgrade de Cota"
                              className="p-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 text-xs font-semibold transition"
                            >
                              <ArrowUpCircle className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Botão Editar */}
                          <button
                            onClick={() => handleOpenEditModal(u)}
                            title="Editar dados da revenda"
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-xs font-semibold transition"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {/* Botão Transferir Créditos Avulsos */}
                          {!isCurrent && (
                            <button
                              onClick={() => {
                                setTargetUserId(u.uid);
                                setIsTransferModalOpen(true);
                              }}
                              title="Transferir créditos avulsos"
                              className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-xs font-semibold transition"
                            >
                              <Coins className="w-3.5 h-3.5" />
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

        {/* MODAL: Nova Revenda com Seleção de Modo de Franquia */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="w-full max-w-xl bg-[#0f1722] border border-zinc-800 rounded-2xl shadow-2xl my-auto max-h-[92vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4 shrink-0 bg-[#0f1722]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Cadastrar Nova Revenda</h3>
                    <p className="text-[11px] text-zinc-300">Escolha o modo de franquia com cota pré-definida e ciclo de 30 dias</p>
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
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Nível de Conta</label>
                  <select
                    value={roleInput}
                    onChange={(e) => setRoleInput(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    {user?.role === "superadmin" && (
                      <option value="reseller">Revenda Master</option>
                    )}
                    <option value="sub_reseller">Sub-Revenda</option>
                  </select>
                </div>

                {/* Seletor de Modo de Franquia */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-zinc-200 font-bold flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-400" />
                      Modo da Franquia & Cota de Créditos *
                    </label>
                    <span className="text-[11px] text-zinc-400">
                      Ciclo: <strong>30 dias</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {allowedTiers.map((tKey) => {
                      const t = RESELLER_TIERS[tKey];
                      const isSelected = selectedTier === tKey;
                      const hasEnough = user?.role === "superadmin" || (user?.credits ?? 0) >= t.credits;

                      return (
                        <button
                          key={tKey}
                          type="button"
                          onClick={() => setSelectedTier(tKey)}
                          className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                            isSelected
                              ? "bg-emerald-500/10 border-emerald-500 shadow-md ring-1 ring-emerald-500/40"
                              : "bg-zinc-900/80 border-zinc-800 hover:border-zinc-700"
                          } ${!hasEnough ? "opacity-60" : ""}`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-bold text-white text-xs">{t.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                          </div>
                          <div className="mt-2 flex items-baseline gap-1">
                            <span className="text-base font-extrabold text-amber-400">{t.credits}</span>
                            <span className="text-[10px] text-zinc-400">créditos</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Resumo do Débito / Balanço */}
                  <div className="mt-3 p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                    <div>
                      <p className="text-zinc-300 font-medium">
                        Cota Inicial: <strong className="text-amber-400">{RESELLER_TIERS[selectedTier]?.credits} créditos</strong>
                      </p>
                      <p className="text-[10px] text-zinc-400">
                        {user?.role === "superadmin"
                          ? "Como Super Admin, você tem créditos ilimitados."
                          : `Débito do seu saldo: ${RESELLER_TIERS[selectedTier]?.credits} un. (Saldo atual: ${user?.credits ?? 0})`}
                      </p>
                    </div>
                    <span className="text-[10px] px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                      +30 dias de ciclo
                    </span>
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
                    disabled={isCreating}
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold tracking-tight transition shadow-lg shadow-emerald-950 disabled:opacity-50"
                  >
                    {isCreating ? "Cadastrando..." : "Confirmar e Ativar Revenda"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Renovar Modo (Franquia - Opção A) */}
        {isRenewModalOpen && renewTargetUser && (() => {
          const currentTier = renewTargetUser.tier || "iniciante";
          const tierConfig = RESELLER_TIERS[currentTier] || RESELLER_TIERS.iniciante;
          const targetQuota = renewTargetUser.tierCredits || tierConfig.credits;
          const currentCredits = renewTargetUser.credits || 0;
          const creditsToInject = Math.max(0, targetQuota - currentCredits);
          const hasBalance = user?.role === "superadmin" || (user?.credits ?? 0) >= creditsToInject;

          return (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
              <div className="w-full max-w-lg bg-[#0f1722] border border-zinc-800 rounded-2xl shadow-2xl my-auto max-h-[92vh] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4 shrink-0 bg-[#0f1722]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                      <RotateCw className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Renovação de Modo (Padrão Franquia)</h3>
                      <p className="text-[11px] text-zinc-300">Restaura a cota integral e estende a validade por mais 30 dias</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsRenewModalOpen(false)}
                    className="text-zinc-400 hover:text-white text-sm"
                  >
                    ✕
                  </button>
                </div>

                {renewErrorMsg && (
                  <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                    {renewErrorMsg}
                  </div>
                )}

                <div className="overflow-y-auto flex-1 p-5 space-y-4 text-xs">
                  {/* Resumo da Revenda */}
                  <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Revenda Selecionada:</span>
                      <strong className="text-white text-sm">{renewTargetUser.name}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Modo Atual da Franquia:</span>
                      <span>{renderTierBadge(currentTier)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Saldo Atual da Revenda:</span>
                      <span className="text-amber-400 font-bold">{currentCredits} créditos</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Cota Teto do Modo:</span>
                      <span className="text-emerald-400 font-bold">{targetQuota} créditos</span>
                    </div>
                  </div>

                  {/* Detalhe do Cálculo Franquia (Opção A) */}
                  <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2.5">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold">
                      <Sparkles className="w-4 h-4 shrink-0" />
                      <span>Cálculo da Renovação (Opção A)</span>
                    </div>
                    <p className="text-zinc-300 leading-relaxed text-[11px]">
                      No padrão Franquia, o saldo da revenda é restaurado para a cota total de{" "}
                      <strong className="text-white">{targetQuota} créditos</strong>. Como a revenda possui{" "}
                      <strong className="text-amber-400">{currentCredits} créditos</strong> restantes, serão completados exatamente{" "}
                      <strong className="text-emerald-400">{creditsToInject} créditos</strong>.
                    </p>
                    <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between">
                      <span className="text-zinc-300 font-medium">Débito Necessário:</span>
                      <span className="font-extrabold text-amber-400 text-sm">{creditsToInject} créditos</span>
                    </div>
                  </div>

                  {/* Prorrogação de Ciclo */}
                  <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-sky-400 shrink-0" />
                      <div>
                        <p className="text-zinc-200 font-medium">Prorrogação de Validade</p>
                        <p className="text-[10px] text-zinc-400">Adiciona +30 dias ao ciclo da revenda</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-sky-400">+30 dias</span>
                  </div>

                  {/* Aviso de Saldo do Executor */}
                  {user?.role !== "superadmin" && (
                    <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">Seu Saldo Disponível:</span>
                      <strong className={hasBalance ? "text-white" : "text-rose-400"}>
                        {user?.credits ?? 0} créditos
                      </strong>
                    </div>
                  )}

                  {!hasBalance && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Você não possui créditos suficientes para renovar esta franquia.</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2 shrink-0 bg-[#0f1722] p-5">
                  <button
                    type="button"
                    onClick={() => setIsRenewModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRenew}
                    disabled={!hasBalance || renewLoading}
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold tracking-tight transition shadow-lg shadow-emerald-950 disabled:opacity-50"
                  >
                    {renewLoading ? "Renovando..." : `Confirmar Renovação (${creditsToInject} cr.)`}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* MODAL: Migrar Modo de Revenda */}
        {isMigrateModalOpen && migrateTargetUser && (() => {
          const currentTier = migrateTargetUser.tier || "iniciante";
          const newConfig = RESELLER_TIERS[migrateSelectedTier];
          const currentCredits = migrateTargetUser.credits || 0;
          const creditsToInject = Math.max(0, newConfig.credits - currentCredits);
          const hasBalance = user?.role === "superadmin" || (user?.credits ?? 0) >= creditsToInject;

          return (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
              <div className="w-full max-w-lg bg-[#0f1722] border border-zinc-800 rounded-2xl shadow-2xl my-auto max-h-[92vh] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4 shrink-0 bg-[#0f1722]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                      <ArrowUpCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Migração de Modo de Franquia</h3>
                      <p className="text-[11px] text-zinc-300">Faça upgrade ou ajuste a categoria e cota da revenda</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsMigrateModalOpen(false)}
                    className="text-zinc-400 hover:text-white text-sm"
                  >
                    ✕
                  </button>
                </div>

                {migrateErrorMsg && (
                  <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                    {migrateErrorMsg}
                  </div>
                )}

                <div className="overflow-y-auto flex-1 p-5 space-y-4 text-xs">
                  {/* Resumo atual */}
                  <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                    <div>
                      <p className="text-zinc-400">Revenda: <strong className="text-white">{migrateTargetUser.name}</strong></p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">Saldo Atual: <strong className="text-amber-400">{currentCredits} créditos</strong></p>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block mb-1">Modo Atual:</span>
                      {renderTierBadge(currentTier)}
                    </div>
                  </div>

                  {/* Seleção do Novo Modo */}
                  <div>
                    <label className="block text-zinc-200 font-bold mb-2">Selecione o Novo Modo:</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {allowedTiers.map((tKey) => {
                        const t = RESELLER_TIERS[tKey];
                        const isSelected = migrateSelectedTier === tKey;
                        const isCurrent = currentTier === tKey;

                        return (
                          <button
                            key={tKey}
                            type="button"
                            onClick={() => setMigrateSelectedTier(tKey)}
                            className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                              isSelected
                                ? "bg-sky-500/10 border-sky-500 shadow-md ring-1 ring-sky-500/40"
                                : "bg-zinc-900/80 border-zinc-800 hover:border-zinc-700"
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="font-bold text-white text-xs">{t.name}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-sky-400" />}
                            </div>
                            <div className="mt-2 flex items-baseline gap-1">
                              <span className="text-base font-extrabold text-amber-400">{t.credits}</span>
                              <span className="text-[10px] text-zinc-400">créditos</span>
                            </div>
                            {isCurrent && (
                              <span className="text-[9px] text-zinc-500 mt-1 font-semibold block">Atual</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Resumo da Migração */}
                  <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Nova Cota de Créditos:</span>
                      <strong className="text-emerald-400 text-xs">{newConfig.credits} créditos</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Créditos a Debitar do seu Saldo:</span>
                      <strong className="text-amber-400 text-xs">{creditsToInject} créditos</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Novo Ciclo de Validade:</span>
                      <strong className="text-sky-400 text-xs">Novo ciclo de 30 dias</strong>
                    </div>
                  </div>

                  {!hasBalance && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Saldo insuficiente para migração para este modo. Necessário: {creditsToInject} créditos.</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2 shrink-0 bg-[#0f1722] p-5">
                  <button
                    type="button"
                    onClick={() => setIsMigrateModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmMigrate}
                    disabled={!hasBalance || migrateLoading}
                    className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold tracking-tight transition shadow-lg shadow-sky-950 disabled:opacity-50"
                  >
                    {migrateLoading ? "Migrando..." : `Confirmar Migração`}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* MODAL: Editar Revenda */}
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
                    <p className="text-[11px] text-zinc-300">Atualize informações cadastrais, status ou saldo</p>
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
                      {user?.role === "superadmin" && (
                        <>
                          <option value="superadmin">Super Admin</option>
                          <option value="reseller">Revenda Master</option>
                        </>
                      )}
                      <option value="sub_reseller">Sub-Revenda</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Modo Atual</label>
                    <select
                      value={editTierInput}
                      onChange={(e) => setEditTierInput(e.target.value as any)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                    >
                      {allowedTiers.map((tKey) => (
                        <option key={tKey} value={tKey}>
                          {RESELLER_TIERS[tKey].name} ({RESELLER_TIERS[tKey].credits} cr.)
                        </option>
                      ))}
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
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Adicionar Dias ao Ciclo</label>
                    <select
                      value={editCycleDaysAdd}
                      onChange={(e) => setEditCycleDaysAdd(Number(e.target.value))}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value={0}>Manter ciclo atual</option>
                      <option value={30}>+30 dias (1 ciclo)</option>
                      <option value={60}>+60 dias (2 ciclos)</option>
                      <option value={90}>+90 dias (3 ciclos)</option>
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

        {/* MODAL: Transferir Créditos Avulsos */}
        {isTransferModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="w-full max-w-md bg-[#0f1722] border border-zinc-800 rounded-2xl shadow-2xl my-auto max-h-[92vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4 shrink-0 bg-[#0f1722]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Transferência Avulsa de Créditos</h3>
                    <p className="text-[11px] text-zinc-300">Envie saldo avulso direto para uma revenda ou sub-revenda</p>
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
                    placeholder="Ex: Pagamento PIX avulso confirmado"
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
