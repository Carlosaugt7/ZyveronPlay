"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { store } from "@/lib/store";
import { CreditLogDocument } from "@/types";
import { History, Coins, ArrowUpRight, ArrowDownLeft, ShieldCheck, Tv } from "lucide-react";

export default function LogsPage() {
  const [logs, setLogs] = useState<CreditLogDocument[]>([]);

  const loadData = () => {
    const l = store.getCreditLogs();
    setLogs(l);
  };

  useEffect(() => {
    loadData();
  }, []);

  const actionLabels: Record<string, { label: string; color: string }> = {
    deposit: { label: "Recarga / Depósito", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    transfer: { label: "Transferência", color: "text-sky-400 bg-sky-500/10 border-sky-500/20" },
    activation: { label: "Ativação de Aparelho", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
    renewal: { label: "Renovação Mensal", color: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20" },
  };

  return (
    <>
      <Navbar
        title="Auditoria de Créditos"
        subtitle="Registro imutável de todas as recargas, repasses e ativações no sistema"
        onRefresh={loadData}
      />

      <main className="p-8 space-y-6 flex-1">
        <div className="p-6 rounded-2xl bg-[#0c121a] border border-zinc-800/80 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <History className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Histórico de Transações</h3>
                <p className="text-[11px] text-zinc-300">
                  Todas as operações são auditadas para garantir a segurança contábil
                </p>
              </div>
            </div>
            <span className="text-xs text-zinc-400 font-mono">{logs.length} registros</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-300 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Data / Hora</th>
                  <th className="py-3 px-3">Tipo de Ação</th>
                  <th className="py-3 px-3">Origem</th>
                  <th className="py-3 px-3">Destino</th>
                  <th className="py-3 px-3">MAC / Alvo</th>
                  <th className="py-3 px-3">Quantidade</th>
                  <th className="py-3 px-3">Nota / Detalhe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {logs.map((log) => {
                  const isPositive = log.amount > 0;
                  return (
                    <tr key={log.id} className="hover:bg-zinc-900/50 transition">
                      <td className="py-3 px-3 font-mono text-zinc-400">
                        {new Date(log.timestamp).toLocaleString("pt-BR")}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            actionLabels[log.action]?.color || "text-zinc-400 bg-zinc-800"
                          }`}
                        >
                          {actionLabels[log.action]?.label || log.action}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium text-zinc-300">
                        {log.fromUserName || "Sistema"}
                      </td>
                      <td className="py-3 px-3 font-medium text-zinc-300">
                        {log.toUserName || log.toUserId}
                      </td>
                      <td className="py-3 px-3 font-mono text-zinc-400">
                        {log.targetDeviceMac ? (
                          <span className="flex items-center gap-1 text-sky-400">
                            <Tv className="w-3 h-3" /> {log.targetDeviceMac}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold">
                        <span className={isPositive ? "text-emerald-400" : "text-amber-400"}>
                          {isPositive ? `+${log.amount}` : log.amount} un.
                        </span>
                      </td>
                      <td className="py-3 px-3 text-zinc-400">{log.note}</td>
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

