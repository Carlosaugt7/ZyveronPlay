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
  Shield,
  CheckCircle2,
  Mail,
  UserCheck,
  Building2
} from "lucide-react";

export default function ResellersPage() {
  const { user, refreshUser } = useAuth();
  const [users, setUsers] = useState<UserDocument[]>([]);

  // Modal Criar Revenda
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [roleInput, setRoleInput] = useState<"reseller" | "sub_reseller">("reseller");
  const [initialCreditsInput, setInitialCreditsInput] = useState(10);
  const [errorMsg, setErrorMsg] = useState("");

  // Modal Transferir Créditos
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
  }, [user]);

  const handleCreateReseller = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!user) return;
    try {
      store.createReseller(
        nameInput.trim(),
        emailInput.trim(),
        roleInput,
        user.uid,
        initialCreditsInput
      );
      setIsCreateModalOpen(false);
      setNameInput("");
      setEmailInput("");
      setInitialCreditsInput(10);
      loadData();
      refreshUser();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao cadastrar revenda.");
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

      <main className="p-8 space-y-6 flex-1">
        {/* Banner de Créditos */}
        <div className="p-5 rounded-2xl bg-[#0f1724] border border-amber-900/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
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

          <div className="flex items-center gap-2">
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
        <div className="p-6 rounded-2xl bg-[#0c121a] border border-zinc-800/80 shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-300 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Nome / Usuário</th>
                  <th className="py-3 px-3">E-mail</th>
                  <th className="py-3 px-3">Nível Hierárquico</th>
                  <th className="py-3 px-3">Saldo de Créditos</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {users.map((u) => (
                  <tr key={u.uid} className="hover:bg-zinc-900/50 transition">
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-300 text-xs">
                          {u.name.substring(0, 1)}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{u.name}</p>
                          <p className="text-[10px] text-zinc-400 font-mono">{u.uid}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-zinc-300 font-mono flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-zinc-400" />
                      {u.email}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleBadges[u.role].color}`}
                      >
                        {roleBadges[u.role].label}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="font-bold text-amber-400 text-sm">
                        {u.role === "superadmin" ? "Ilimitado" : `${u.credits} un.`}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                        Ativo
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      {u.uid !== user?.uid && (
                        <button
                          onClick={() => {
                            setTargetUserId(u.uid);
                            setIsTransferModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-xs font-semibold transition"
                        >
                          Recarregar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Nova Revenda */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#0f1722] border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Criar Nova Conta de Revenda</h3>
                    <p className="text-[11px] text-zinc-300">Cadastre um parceiro ou sub-revendedor</p>
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
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleCreateReseller} className="space-y-4 text-xs">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Nome Completo *</label>
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
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Nível Hierárquico</label>
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

                <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
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
                    Salvar e Ativar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Transferir Créditos */}
        {isTransferModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#0f1722] border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Transferência de Créditos</h3>
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

              <form onSubmit={handleTransferCredits} className="space-y-4 text-xs">
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

                <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
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

