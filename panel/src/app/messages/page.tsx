"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { store } from "@/lib/store";
import { NotificationDocument, DeviceDocument, UserDocument } from "@/types";
import {
  MessageSquare,
  Send,
  Radio,
  Tv,
  Users,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

export default function MessagesPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationDocument[]>([]);
  const [devices, setDevices] = useState<DeviceDocument[]>([]);
  const [users, setUsers] = useState<UserDocument[]>([]);

  // Form states
  const [targetType, setTargetType] = useState<"all" | "reseller" | "device">("all");
  const [targetId, setTargetId] = useState("all");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [hoursDuration, setHoursDuration] = useState(24);
  const [successMsg, setSuccessMsg] = useState("");

  const loadData = () => {
    if (!user) return;
    const n = store.getNotifications();
    const d = store.getDevices(user.role, user.uid);
    const u = store.getUsers(user.role, user.uid);
    setNotifications(n);
    setDevices(d);
    setUsers(u);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    let finalTargetId = targetId;
    if (targetType === "all") finalTargetId = "all";

    store.sendNotification(
      targetType,
      finalTargetId,
      title.trim(),
      message.trim(),
      hoursDuration
    );

    setTitle("");
    setMessage("");
    setSuccessMsg("Mensagem disparada com sucesso! Ela aparecerá imediatamente na tela dos aparelhos conectados.");
    setTimeout(() => setSuccessMsg(""), 4000);
    loadData();
  };

  const handleDelete = (id: string) => {
    store.deleteNotification(id);
    loadData();
  };

  return (
    <>
      <Navbar
        title="Central de Mensagens para a TV"
        subtitle="Dispare avisos, alertas de manutenção e lembretes diretamente na tela dos clientes"
        onRefresh={loadData}
      />

      <main className="p-8 space-y-6 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Formulário de Envio */}
          <div className="lg:col-span-5 p-6 rounded-2xl bg-[#0c121a] border border-zinc-800/80 shadow-md space-y-4">
            <div className="flex items-center gap-2.5 border-b border-zinc-800 pb-3">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Nova Mensagem na Tela</h3>
                <p className="text-[11px] text-zinc-300">Entregue via Firestore em tempo real</p>
              </div>
            </div>

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> {successMsg}
              </div>
            )}

            <form onSubmit={handleSend} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Destinatário *</label>
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetType("all");
                      setTargetId("all");
                    }}
                    className={`py-2 px-1 text-center rounded-lg border font-medium transition ${
                      targetType === "all"
                        ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                    }`}
                  >
                    Global (Todos)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetType("reseller");
                      if (users.length > 0) setTargetId(users[0].uid);
                    }}
                    className={`py-2 px-1 text-center rounded-lg border font-medium transition ${
                      targetType === "reseller"
                        ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                    }`}
                  >
                    Por Revenda
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetType("device");
                      if (devices.length > 0) setTargetId(devices[0].mac);
                    }}
                    className={`py-2 px-1 text-center rounded-lg border font-medium transition ${
                      targetType === "device"
                        ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                    }`}
                  >
                    1 Aparelho (MAC)
                  </button>
                </div>

                {/* Seletores dinâmicos de alvo */}
                {targetType === "reseller" && (
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500 mt-2"
                  >
                    {users.map((u) => (
                      <option key={u.uid} value={u.uid}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                )}

                {targetType === "device" && (
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500 mt-2"
                  >
                    {devices.map((d) => (
                      <option key={d.mac} value={d.mac}>
                        {d.mac} - {d.customNote || d.username}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Título do Aviso *</label>
                <input
                  type="text"
                  placeholder="Ex: Manutenção no Servidor Hoje"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Conteúdo da Mensagem *</label>
                <textarea
                  rows={4}
                  placeholder="Digite o texto que será exibido na tela da TV..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Duração na Tela</label>
                <select
                  value={hoursDuration}
                  onChange={(e) => setHoursDuration(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                >
                  <option value={2}>2 Horas</option>
                  <option value={6}>6 Horas</option>
                  <option value={12}>12 Horas</option>
                  <option value={24}>24 Horas (1 dia)</option>
                  <option value={72}>72 Horas (3 dias)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold tracking-tight transition flex items-center justify-center gap-2 shadow-lg shadow-sky-950"
              >
                <Send className="w-4 h-4" /> Disparar para a TV
              </button>
            </form>
          </div>

          {/* Histórico de Mensagens Ativas */}
          <div className="lg:col-span-7 p-6 rounded-2xl bg-[#0c121a] border border-zinc-800/80 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Mensagens Ativas no Ar</h3>
                <p className="text-[11px] text-zinc-300">
                  Avisos sendo exibidos atualmente nos aplicativos de TV
                </p>
              </div>
              <span className="text-xs text-zinc-400 font-mono">
                {notifications.length} ativas
              </span>
            </div>

            <div className="space-y-3">
              {notifications.length === 0 ? (
                <p className="text-xs text-zinc-400 py-6 text-center">
                  Nenhuma mensagem ativa no momento.
                </p>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 transition flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          {notif.targetType === "all"
                            ? "Global"
                            : notif.targetType === "reseller"
                            ? "Revenda"
                            : "Aparelho"}
                        </span>
                        <h4 className="text-xs font-bold text-white">{notif.title}</h4>
                      </div>
                      <p className="text-xs text-zinc-300">{notif.message}</p>
                      <div className="flex items-center gap-3 pt-1 text-[10px] text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Expira em:{" "}
                          {new Date(notif.expiresAt).toLocaleString("pt-BR")}
                        </span>
                        {notif.targetType !== "all" && (
                          <span className="font-mono text-zinc-400">
                            Destino: {notif.targetId}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(notif.id)}
                      className="text-zinc-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-zinc-800 transition"
                      title="Excluir mensagem da tela"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

