import React, { useState } from 'react';
import { DeviceActivation } from '../types';
import { useSpatialNav } from '../hooks/useSpatialNav';
import { Settings, Tv, Key, Globe, Shield, RefreshCw, Trash2, CheckCircle, ArrowLeft } from 'lucide-react';

interface SettingsViewProps {
  device: DeviceActivation;
  isFocusedContent?: boolean;
  onRequestFocusSidebar?: () => void;
  onSyncContent: () => void;
  onResetDevice: () => void;
  onBackToHome?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  device,
  isFocusedContent = true,
  onRequestFocusSidebar,
  onSyncContent,
  onResetDevice,
  onBackToHome
}) => {
  const [clearedSuccess, setClearedSuccess] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [focusedBtnIdx, setFocusedBtnIdx] = useState<number>(0);

  const handleSync = () => {
    setIsSyncing(true);
    onSyncContent();
    setTimeout(() => {
      setIsSyncing(false);
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
    }, 1200);
  };

  const handleClearCache = () => {
    try {
      localStorage.removeItem('zyveron_favorites_live');
      localStorage.removeItem('zyveron_favorites_vod');
      localStorage.removeItem('zyveron_favorites_series');
      setClearedSuccess(true);
      setTimeout(() => setClearedSuccess(false), 3000);
    } catch {}
  };

  // D-Pad Navigation
  useSpatialNav({
    onUp: () => {
      setFocusedBtnIdx((prev) => Math.max(0, prev - 1));
    },
    onDown: () => {
      setFocusedBtnIdx((prev) => Math.min(3, prev + 1));
    },
    onLeft: () => {
      if (onBackToHome) {
        onBackToHome();
      } else {
        onRequestFocusSidebar?.();
      }
    },
    onSelect: () => {
      if (focusedBtnIdx === 0) {
        onBackToHome?.();
      } else if (focusedBtnIdx === 1) {
        handleSync();
      } else if (focusedBtnIdx === 2) {
        handleClearCache();
      } else if (focusedBtnIdx === 3) {
        onResetDevice();
      }
    },
    onBack: () => {
      if (onBackToHome) {
        onBackToHome();
      } else {
        onRequestFocusSidebar?.();
      }
    },
    disabled: !isFocusedContent,
    priority: 15
  }, [focusedBtnIdx, isFocusedContent, onSyncContent, onResetDevice, onBackToHome]);

  return (
    <div className={`w-full h-full p-8 bg-[#0a0d14] overflow-y-auto select-none transition-all ${
      isFocusedContent ? 'ring-2 ring-emerald-500/20' : ''
    }`}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center">
              <Settings className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Ajustes & Informações do Sistema</h1>
              <p className="text-sm text-slate-400">Configurações técnicas da Smart TV e identificadores de acesso</p>
            </div>
          </div>

          {onBackToHome && (
            <button
              type="button"
              onClick={onBackToHome}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-black transition cursor-pointer shadow-lg ${
                isFocusedContent && focusedBtnIdx === 0
                  ? 'bg-emerald-400 text-black ring-4 ring-emerald-300 scale-105 shadow-2xl shadow-emerald-500/40'
                  : 'bg-slate-800 hover:bg-sky-600 text-slate-200 hover:text-white border border-slate-700'
              }`}
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar ao Início [OK]</span>
            </button>
          )}
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
                <Globe className="w-4 h-4 text-emerald-400" /> Servidor Conectado
              </span>
              <span className="text-base font-bold text-white truncate block">{device.serverName || 'Servidor 1'}</span>
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
            <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
              isFocusedContent && focusedBtnIdx === 1
                ? 'bg-emerald-500/20 border-emerald-400 ring-4 ring-emerald-400/40'
                : 'bg-[#1b2234]/50 border-slate-800'
            }`}>
              <div>
                <h3 className="font-semibold text-white">Sincronizar Lista e Canais</h3>
                <p className="text-xs text-slate-400 mt-0.5">Recarrega canais e categorias do servidor IPTV agora</p>
              </div>
              <button
                onClick={handleSync}
                className={`px-4 py-2 font-semibold rounded-lg flex items-center gap-2 text-sm transition cursor-pointer ${
                  isFocusedContent && focusedBtnIdx === 1
                    ? 'bg-emerald-400 text-black shadow-lg shadow-emerald-400/40 ring-2 ring-emerald-300'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Sincronizando...' : syncSuccess ? 'Sincronizado!' : 'Recarregar'}
              </button>
            </div>

            <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
              isFocusedContent && focusedBtnIdx === 2
                ? 'bg-emerald-500/20 border-emerald-400 ring-4 ring-emerald-400/40'
                : 'bg-[#1b2234]/50 border-slate-800'
            }`}>
              <div>
                <h3 className="font-semibold text-white">Limpar Cache e Histórico</h3>
                <p className="text-xs text-slate-400 mt-0.5">Limpa lista de favoritos e memória temporária da TV</p>
              </div>
              <button
                onClick={handleClearCache}
                className={`px-4 py-2 font-semibold rounded-lg flex items-center gap-2 text-sm transition cursor-pointer ${
                  isFocusedContent && focusedBtnIdx === 2
                    ? 'bg-emerald-400 text-black shadow-lg shadow-emerald-400/40 ring-2 ring-emerald-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-white'
                }`}
              >
                {clearedSuccess ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Trash2 className="w-4 h-4" />}
                {clearedSuccess ? 'Limpo com Sucesso!' : 'Limpar Cache'}
              </button>
            </div>

            <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
              isFocusedContent && focusedBtnIdx === 3
                ? 'bg-red-500/20 border-red-400 ring-4 ring-red-400/40'
                : 'bg-[#1b2234]/50 border-red-900/30'
            }`}>
              <div>
                <h3 className="font-semibold text-red-400">Desconectar Aparelho</h3>
                <p className="text-xs text-slate-400 mt-0.5">Gera uma nova identidade ou permite restaurar outro MAC</p>
              </div>
              <button
                onClick={onResetDevice}
                className={`px-4 py-2 font-semibold rounded-lg text-sm transition cursor-pointer ${
                  isFocusedContent && focusedBtnIdx === 3
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/40 ring-2 ring-red-300'
                    : 'bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30'
                }`}
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
