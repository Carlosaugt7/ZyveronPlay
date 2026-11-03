import React, { useState } from 'react';
import { DeviceActivation } from '../types';
import { Settings, Tv, Key, Globe, Shield, RefreshCw, Trash2, CheckCircle } from 'lucide-react';

interface SettingsViewProps {
  device: DeviceActivation;
  onRefreshData: () => void;
  onResetDevice: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  device,
  onRefreshData,
  onResetDevice
}) => {
  const [clearedSuccess, setClearedSuccess] = useState(false);

  const handleClearCache = () => {
    try {
      localStorage.removeItem('zyveron_favorites_live');
      localStorage.removeItem('zyveron_favorites_vod');
      localStorage.removeItem('zyveron_favorites_series');
      setClearedSuccess(true);
      setTimeout(() => setClearedSuccess(false), 3000);
    } catch {}
  };

  return (
    <div className="w-full h-full p-8 bg-[#0a0d14] overflow-y-auto select-none">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center">
            <Settings className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Ajustes & Informações do Sistema</h1>
            <p className="text-sm text-slate-400">Configurações técnicas da Smart TV e credenciais ativas</p>
          </div>
        </div>

        {/* Informações da Conta */}
        <div className="bg-[#121722] border border-[#2a3449] rounded-2xl p-6 mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400 mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4" /> Dados de Acesso & Identificação
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-[#1b2234]/70 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
                <Tv className="w-4 h-4 text-emerald-400" /> MAC Virtual
              </span>
              <span className="text-lg font-mono font-bold text-white">{device.mac}</span>
            </div>

            <div className="p-4 bg-[#1b2234]/70 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
                <Key className="w-4 h-4 text-emerald-400" /> Chave do Aparelho (Device Key)
              </span>
              <span className="text-lg font-mono font-bold text-emerald-400">{device.deviceKey}</span>
            </div>

            <div className="p-4 bg-[#1b2234]/70 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
                <Globe className="w-4 h-4 text-emerald-400" /> Servidor / DNS Ativo
              </span>
              <span className="text-sm font-mono text-white truncate block">{device.activeDns}</span>
            </div>

            <div className="p-4 bg-[#1b2234]/70 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
                <Shield className="w-4 h-4 text-emerald-400" /> Vencimento da Mensalidade
              </span>
              <span className="text-sm font-bold text-white">
                {device.expirationDate ? new Date(device.expirationDate).toLocaleDateString('pt-BR') : 'Ilimitado'}
              </span>
            </div>
          </div>
        </div>

        {/* Ferramentas e Manutenção */}
        <div className="bg-[#121722] border border-[#2a3449] rounded-2xl p-6 mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400 mb-4">
            Manutenção do Aplicativo
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[#1b2234]/50 rounded-xl border border-slate-800">
              <div>
                <h3 className="font-semibold text-white">Sincronizar Lista e Canais</h3>
                <p className="text-xs text-slate-400 mt-0.5">Recarrega canais e categorias do servidor IPTV agora</p>
              </div>
              <button
                onClick={onRefreshData}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg flex items-center gap-2 text-sm transition"
              >
                <RefreshCw className="w-4 h-4" /> Recarregar
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-[#1b2234]/50 rounded-xl border border-slate-800">
              <div>
                <h3 className="font-semibold text-white">Limpar Cache e Histórico</h3>
                <p className="text-xs text-slate-400 mt-0.5">Limpa lista de favoritos e memória temporária da TV</p>
              </div>
              <button
                onClick={handleClearCache}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg flex items-center gap-2 text-sm transition"
              >
                {clearedSuccess ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Trash2 className="w-4 h-4" />}
                {clearedSuccess ? 'Limpo com Sucesso!' : 'Limpar Cache'}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-[#1b2234]/50 rounded-xl border border-red-900/30">
              <div>
                <h3 className="font-semibold text-red-400">Desconectar Aparelho</h3>
                <p className="text-xs text-slate-400 mt-0.5">Gera uma nova identidade ou permite restaurar outro MAC</p>
              </div>
              <button
                onClick={onResetDevice}
                className="px-4 py-2 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 font-semibold rounded-lg text-sm transition"
              >
                Desconectar
              </button>
            </div>
          </div>
        </div>

        {/* Versão */}
        <div className="text-center text-xs text-slate-500 font-mono">
          Zyveron Play Smart TV • Versão 1.0.0 (Build 2026.11) • Engine HLS Otimizada
        </div>
      </div>
    </div>
  );
};

