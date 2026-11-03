import React, { useState } from 'react';
import { Tv, Key, ShieldCheck, RefreshCw, AlertTriangle, Lock, History } from 'lucide-react';
import { restoreDeviceIdentity } from '../lib/storage';

interface ActivationScreenProps {
  mac: string;
  deviceKey: string;
  status: 'unregistered' | 'expired' | 'blocked' | 'loading' | 'active';
  message?: string;
  onRefresh: () => void;
  onIdentityChanged: () => void;
}

export const ActivationScreen: React.FC<ActivationScreenProps> = ({
  mac,
  deviceKey,
  status,
  message,
  onRefresh,
  onIdentityChanged
}) => {
  const [isRestoring, setIsRestoring] = useState(false);
  const [inputMac, setInputMac] = useState('');
  const [inputKey, setInputKey] = useState('');
  const [restoreError, setRestoreError] = useState('');

  const handleRestore = (e: React.FormEvent) => {
    e.preventDefault();
    setRestoreError('');

    const success = restoreDeviceIdentity(inputMac, inputKey);
    if (success) {
      setIsRestoring(false);
      onIdentityChanged();
    } else {
      setRestoreError('Formato de MAC inválido. Use o padrão XX:XX:XX:XX:XX:XX');
    }
  };

  return (
    <div className="w-full h-full min-h-screen bg-[#0a0d14] text-white flex flex-col items-center justify-center p-8 select-none">
      {/* Top Branding */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-950/40">
          <Tv className="w-8 h-8 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-wide text-white">
            ZYVERON <span className="text-emerald-400">PLAY</span>
          </h1>
          <p className="text-xs tracking-widest text-emerald-500 uppercase font-semibold">
            SMART TV EDITION • SAMSUNG & LG
          </p>
        </div>
      </div>

      {/* Main Activation Card */}
      <div className="w-full max-w-2xl bg-[#121722] border border-[#2a3449] rounded-2xl p-8 shadow-2xl relative">
        {status === 'blocked' ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-red-400 mb-2">Acesso Bloqueado</h2>
            <p className="text-slate-300 mb-6">
              Este aparelho foi bloqueado administrativamente. Entre em contato com seu revendedor ou suporte.
            </p>
          </div>
        ) : status === 'expired' ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-amber-400 mb-2">Mensalidade Vencida</h2>
            <p className="text-slate-300 mb-6">{message || 'Renove seu plano para continuar assistindo.'}</p>
          </div>
        ) : (
          <div>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Ativação do Dispositivo</h2>
              <p className="text-slate-400 text-sm">
                Envie o <b className="text-white">MAC</b> e a <b className="text-white">Chave</b> abaixo para seu revendedor liberar o acesso.
              </p>
            </div>

            {/* Identifiers Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-[#1b2234] border border-[#2a3449] p-5 rounded-xl text-center">
                <div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase text-emerald-400 mb-1">
                  <Tv className="w-4 h-4" /> Endereço MAC
                </div>
                <div className="text-2xl font-mono font-extrabold tracking-wider text-white">
                  {mac}
                </div>
              </div>

              <div className="bg-[#1b2234] border border-[#2a3449] p-5 rounded-xl text-center">
                <div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase text-emerald-400 mb-1">
                  <Key className="w-4 h-4" /> Device Key
                </div>
                <div className="text-2xl font-mono font-extrabold tracking-wider text-emerald-300">
                  {deviceKey}
                </div>
              </div>
            </div>

            {/* Status indicator */}
            <div className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm font-medium mb-6">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Aguardando ativação no painel gestor (sincronização automática)...</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <button
            onClick={() => setIsRestoring(!isRestoring)}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition"
          >
            <History className="w-4 h-4 text-emerald-400" />
            {isRestoring ? 'Cancelar Restauração' : 'Restaurar MAC Anterior'}
          </button>

          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow transition"
          >
            <RefreshCw className="w-4 h-4" />
            Verificar Agora
          </button>
        </div>

        {/* Modal de Restauração */}
        {isRestoring && (
          <form onSubmit={handleRestore} className="mt-6 p-5 bg-[#1b2234] border border-emerald-500/30 rounded-xl">
            <h3 className="text-sm font-bold text-white mb-2">Restaurar MAC de Outra Sessão</h3>
            <p className="text-xs text-slate-400 mb-4">
              Caso você tenha trocado de TV ou limpado os cookies, informe o MAC e a Chave anteriores cadastrados no painel:
            </p>
            {restoreError && <div className="text-red-400 text-xs mb-3">{restoreError}</div>}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <input
                type="text"
                placeholder="Ex: 02:4A:BC:11:22:33"
                value={inputMac}
                onChange={(e) => setInputMac(e.target.value)}
                className="bg-[#121722] border border-[#2a3449] rounded-lg px-3 py-2 text-sm font-mono text-white focus:border-emerald-500"
                required
              />
              <input
                type="text"
                placeholder="Device Key (6 dígitos)"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                className="bg-[#121722] border border-[#2a3449] rounded-lg px-3 py-2 text-sm font-mono text-white focus:border-emerald-500"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg text-sm transition"
            >
              Confirmar e Conectar
            </button>
          </form>
        )}
      </div>

      <div className="mt-8 text-xs text-slate-500">
        Zyveron Smart TV Engine v1.0.0 • Compatível com Samsung Tizen, LG webOS e Navegadores Modernos
      </div>
    </div>
  );
};
