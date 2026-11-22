import React, { useState } from 'react';
import { DeviceActivation } from '../types';
import { useSpatialNav } from '../hooks/useSpatialNav';
import { Settings, Tv, Key, Globe, Shield, RefreshCw, Trash2, CheckCircle, ArrowLeft, History, Layers, Check } from 'lucide-react';
import { clearRecent } from '../lib/storage';

interface SettingsViewProps {
  device: DeviceActivation;
  isFocusedContent?: boolean;
  onRequestFocusSidebar?: () => void;
  onSyncContent: () => void;
  onResetDevice: () => void;
  onBackToHome?: () => void;
  onSwitchPlaylist?: (index: number) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  device,
  isFocusedContent = true,
  onRequestFocusSidebar,
  onSyncContent,
  onResetDevice,
  onBackToHome,
  onSwitchPlaylist
}) => {
  const [clearedSuccess, setClearedSuccess] = useState(false);
  const [recentClearedSuccess, setRecentClearedSuccess] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  // Foco: 0 (Voltar), 10 (Lista 1), 11 (Lista 2 se existir), 1 (Sincronizar), 2 (Limpar Recentes), 3 (Limpar Cache), 4 (Desconectar)
  const [focusedBtnIdx, setFocusedBtnIdx] = useState<number>(0);

  const playlists = device.playlists || [];
  const hasSecondPlaylist = playlists.length > 1;

  const handleSync = () => {
    setIsSyncing(true);
    setSyncSuccess(false);
    onSyncContent();
    setTimeout(() => {
      setIsSyncing(false);
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3500);
    }, 1500);
  };

  const handleClearRecent = () => {
    try {
      clearRecent();
      setRecentClearedSuccess(true);
      setTimeout(() => setRecentClearedSuccess(false), 3000);
    } catch {}
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
      setFocusedBtnIdx((prev) => {
        if (prev === 4) return 3;
        if (prev === 3) return 2;
        if (prev === 2) return 1;
        if (prev === 1) return hasSecondPlaylist ? 11 : 10;
        if (prev === 11) return 10;
        if (prev === 10) return 0;
        return 0;
      });
    },
    onDown: () => {
      setFocusedBtnIdx((prev) => {
        if (prev === 0) return 10;
        if (prev === 10) return hasSecondPlaylist ? 11 : 1;
        if (prev === 11) return 1;
        if (prev === 1) return 2;
        if (prev === 2) return 3;
        if (prev === 3) return 4;
        return 4;
      });
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
      } else if (focusedBtnIdx === 10) {
        onSwitchPlaylist?.(0);
      } else if (focusedBtnIdx === 11 && hasSecondPlaylist) {
        onSwitchPlaylist?.(1);
      } else if (focusedBtnIdx === 1) {
        handleSync();
      } else if (focusedBtnIdx === 2) {
        handleClearRecent();
      } else if (focusedBtnIdx === 3) {
        handleClearCache();
      } else if (focusedBtnIdx === 4) {
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
  }, [focusedBtnIdx, isFocusedContent, onSyncContent, onResetDevice, onBackToHome, onSwitchPlaylist, hasSecondPlaylist]);

  return (
    <div className={`w-full h-full p-6 sm:p-8 bg-[#0a0d14] overflow-y-auto select-none transition-all ${
      isFocusedContent ? 'ring-2 ring-emerald-500/20' : ''
    }`}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Topo / Voltar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center">
              <Settings className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Ajustes & Informações do Sistema</h1>
              <p className="text-sm text-slate-400">Configurações técnicas da Smart TV, servidores e gerenciamento de listas</p>
            </div>
          </div>

          {onBackToHome && (
            <button
              type="button"
              onClick={onBackToHome}
              onMouseEnter={() => setFocusedBtnIdx(0)}
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

        {/* 1. SEÇÃO: LISTAS DE CONTEÚDO & SERVIDORES IPTV */}
        <div className="bg-[#121722] border border-[#2a3449] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <Layers className="w-4 h-4" /> Listas de Canais & Servidores Conectados
            </h2>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
              {playlists.length > 1 ? '2 Listas Disponíveis' : '1 Lista Disponível'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CARD: LISTA 1 */}
            {playlists[0] ? (
              <div
                onClick={() => onSwitchPlaylist?.(0)}
                onMouseEnter={() => setFocusedBtnIdx(10)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  device.activePlaylistIndex === 0
                    ? 'bg-emerald-950/20 border-emerald-500/50 ring-1 ring-emerald-500/40'
                    : 'bg-[#1b2234]/60 border-slate-800 hover:border-slate-700'
                } ${isFocusedContent && focusedBtnIdx === 10 ? 'ring-4 ring-emerald-400 scale-[1.02] shadow-xl' : ''}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Lista 1 (Principal)</span>
                    {device.activePlaylistIndex === 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle className="w-3 h-3" /> Ativa
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">Alternativa</span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-white truncate">{playlists[0].serverName || 'Servidor 1'}</h3>
                  <p className="text-xs text-slate-400 font-mono mt-1">Usuário: <span className="text-slate-200">{playlists[0].username}</span></p>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">DNS: <span className="text-slate-300">{playlists[0].serverDns}</span></p>
                  {playlists[0].expirationDate && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Validade: <strong className="text-slate-200">{new Date(playlists[0].expirationDate).toLocaleDateString('pt-BR')}</strong>
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {device.activePlaylistIndex === 0 ? 'Conectada no momento' : 'Clique para alternar'}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSwitchPlaylist?.(0);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                      device.activePlaylistIndex === 0
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-sky-500 hover:bg-sky-400 text-black'
                    }`}
                  >
                    {device.activePlaylistIndex === 0 ? <Check className="w-3.5 h-3.5" /> : null}
                    {device.activePlaylistIndex === 0 ? 'Conectada' : 'Ativar Lista 1'}
                  </button>
                </div>
              </div>
            ) : null}

            {/* CARD: LISTA 2 */}
            {hasSecondPlaylist ? (
              <div
                onClick={() => onSwitchPlaylist?.(1)}
                onMouseEnter={() => setFocusedBtnIdx(11)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  device.activePlaylistIndex === 1
                    ? 'bg-emerald-950/20 border-emerald-500/50 ring-1 ring-emerald-500/40'
                    : 'bg-[#1b2234]/60 border-slate-800 hover:border-slate-700'
                } ${isFocusedContent && focusedBtnIdx === 11 ? 'ring-4 ring-emerald-400 scale-[1.02] shadow-xl' : ''}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Lista 2 (Contingência)</span>
                    {device.activePlaylistIndex === 1 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle className="w-3 h-3" /> Ativa
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">Alternativa</span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-white truncate">{playlists[1].serverName || 'Servidor 2'}</h3>
                  <p className="text-xs text-slate-400 font-mono mt-1">Usuário: <span className="text-slate-200">{playlists[1].username}</span></p>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">DNS: <span className="text-slate-300">{playlists[1].serverDns}</span></p>
                  {playlists[1].expirationDate && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Validade: <strong className="text-slate-200">{new Date(playlists[1].expirationDate).toLocaleDateString('pt-BR')}</strong>
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {device.activePlaylistIndex === 1 ? 'Conectada no momento' : 'Clique para alternar'}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSwitchPlaylist?.(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                      device.activePlaylistIndex === 1
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-sky-500 hover:bg-sky-400 text-black'
                    }`}
                  >
                    {device.activePlaylistIndex === 1 ? <Check className="w-3.5 h-3.5" /> : null}
                    {device.activePlaylistIndex === 1 ? 'Conectada' : 'Ativar Lista 2'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-slate-800 bg-[#1b2234]/30 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Lista 2 (Não Configurada)</span>
                    <span className="text-[11px] text-slate-500">Indisponível</span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-400">Nenhuma 2ª lista atribuída</h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    Para cadastrar uma segunda lista de contingência, adicione as credenciais no painel gestor (aba Aparelhos) e clique no botão <strong>Sincronizar Lista e Canais</strong> abaixo.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/50 text-[11px] text-slate-400">
                  Sincronização automática via Firestore
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. INFORMAÇÕES DA CONTA & HARDWARE */}
        <div className="bg-[#121722] border border-[#2a3449] rounded-2xl p-6">
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
                <Globe className="w-4 h-4 text-emerald-400" /> Servidor Ativo
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

        {/* 3. FERRAMENTAS E MANUTENÇÃO */}
        <div className="bg-[#121722] border border-[#2a3449] rounded-2xl p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400 mb-4">
            Manutenção do Aplicativo
          </h2>

          <div className="space-y-4">
            {/* Sincronizar Lista e Canais */}
            <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
              isFocusedContent && focusedBtnIdx === 1
                ? 'bg-emerald-500/20 border-emerald-400 ring-4 ring-emerald-400/40'
                : 'bg-[#1b2234]/50 border-slate-800'
            }`}>
              <div>
                <h3 className="font-semibold text-white">Sincronizar Lista e Canais</h3>
                <p className="text-xs text-slate-400 mt-0.5">Recarrega o painel gestor (buscando 2ª lista) e atualiza a grade de canais</p>
              </div>
              <button
                type="button"
                onClick={handleSync}
                onMouseEnter={() => setFocusedBtnIdx(1)}
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

            {/* Limpar Últimos Assistidos */}
            <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
              isFocusedContent && focusedBtnIdx === 2
                ? 'bg-emerald-500/20 border-emerald-400 ring-4 ring-emerald-400/40'
                : 'bg-[#1b2234]/50 border-slate-800'
            }`}>
              <div>
                <h3 className="font-semibold text-white">Limpar Últimos Assistidos</h3>
                <p className="text-xs text-slate-400 mt-0.5">Remove o histórico de filmes e séries assistidos recentemente</p>
              </div>
              <button
                type="button"
                onClick={handleClearRecent}
                onMouseEnter={() => setFocusedBtnIdx(2)}
                className={`px-4 py-2 font-semibold rounded-lg flex items-center gap-2 text-sm transition cursor-pointer ${
                  isFocusedContent && focusedBtnIdx === 2
                    ? 'bg-emerald-400 text-black shadow-lg shadow-emerald-400/40 ring-2 ring-emerald-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-white'
                }`}
              >
                {recentClearedSuccess ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <History className="w-4 h-4" />}
                {recentClearedSuccess ? 'Histórico Limpo!' : 'Limpar Histórico'}
              </button>
            </div>

            {/* Limpar Cache e Histórico */}
            <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
              isFocusedContent && focusedBtnIdx === 3
                ? 'bg-emerald-500/20 border-emerald-400 ring-4 ring-emerald-400/40'
                : 'bg-[#1b2234]/50 border-slate-800'
            }`}>
              <div>
                <h3 className="font-semibold text-white">Limpar Cache e Histórico</h3>
                <p className="text-xs text-slate-400 mt-0.5">Limpa lista de favoritos e memória temporária da TV</p>
              </div>
              <button
                type="button"
                onClick={handleClearCache}
                onMouseEnter={() => setFocusedBtnIdx(3)}
                className={`px-4 py-2 font-semibold rounded-lg flex items-center gap-2 text-sm transition cursor-pointer ${
                  isFocusedContent && focusedBtnIdx === 3
                    ? 'bg-emerald-400 text-black shadow-lg shadow-emerald-400/40 ring-2 ring-emerald-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-white'
                }`}
              >
                {clearedSuccess ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Trash2 className="w-4 h-4" />}
                {clearedSuccess ? 'Limpo com Sucesso!' : 'Limpar Cache'}
              </button>
            </div>

            {/* Desconectar Aparelho */}
            <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
              isFocusedContent && focusedBtnIdx === 4
                ? 'bg-red-500/20 border-red-400 ring-4 ring-red-400/40'
                : 'bg-[#1b2234]/50 border-red-900/30'
            }`}>
              <div>
                <h3 className="font-semibold text-red-400">Desconectar Aparelho</h3>
                <p className="text-xs text-slate-400 mt-0.5">Gera uma nova identidade ou permite restaurar outro MAC</p>
              </div>
              <button
                type="button"
                onClick={onResetDevice}
                onMouseEnter={() => setFocusedBtnIdx(4)}
                className={`px-4 py-2 font-semibold rounded-lg text-sm transition cursor-pointer ${
                  isFocusedContent && focusedBtnIdx === 4
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
