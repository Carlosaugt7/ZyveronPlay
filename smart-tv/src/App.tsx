import React, { useState, useEffect, useMemo } from 'react';
import { getOrCreateDeviceIdentity, restoreDeviceIdentity } from './lib/storage';
import { listenDeviceActivation } from './lib/firebase';
import { DeviceActivation } from './types';
import { XtreamClient } from './lib/xtream';
import { ActivationScreen } from './components/ActivationScreen';
import { NavigationBar, MainSection } from './components/NavigationBar';
import { LiveTvView } from './views/LiveTvView';
import { MoviesView } from './views/MoviesView';
import { SeriesView } from './views/SeriesView';
import { SettingsView } from './views/SettingsView';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [identity, setIdentity] = useState(() => getOrCreateDeviceIdentity());
  const [activationStatus, setActivationStatus] = useState<'loading' | 'unregistered' | 'active' | 'expired' | 'blocked'>('loading');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [activeDevice, setActiveDevice] = useState<DeviceActivation | null>(null);
  const [currentSection, setCurrentSection] = useState<MainSection>('live');

  // Inicializa a escuta em tempo real no Firestore para este MAC
  useEffect(() => {
    setActivationStatus('loading');
    const unsubscribe = listenDeviceActivation(identity.mac, (state) => {
      setActivationStatus(state.status);
      setStatusMessage(state.message || '');
      if (state.device) {
        setActiveDevice(state.device);
      }
    });

    return () => unsubscribe();
  }, [identity.mac]);

  // Instância do Cliente Xtream conectada ao DNS e credenciais ativas
  const xtreamClient = useMemo(() => {
    if (!activeDevice || !activeDevice.activeDns || !activeDevice.username || !activeDevice.password) {
      return null;
    }
    return new XtreamClient(activeDevice.activeDns, activeDevice.username, activeDevice.password);
  }, [activeDevice]);

  const handleRefreshActivation = () => {
    setActivationStatus('loading');
    setIdentity({ ...getOrCreateDeviceIdentity() });
  };

  const handleResetDevice = () => {
    localStorage.clear();
    setIdentity(getOrCreateDeviceIdentity());
  };

  // 1. Tela de Carregamento Inicial
  if (activationStatus === 'loading') {
    return (
      <div className="w-screen h-screen bg-[#0a0d14] flex flex-col items-center justify-center text-white select-none">
        <Loader2 className="w-16 h-16 text-emerald-400 animate-spin mb-4" />
        <h2 className="text-xl font-bold tracking-wide">Iniciando Zyveron Smart TV...</h2>
        <p className="text-sm text-slate-400 mt-1">Conectando ao serviço de validação segura</p>
      </div>
    );
  }

  // 2. Tela de Ativação / Mensalidade Vencida / Bloqueio
  if (activationStatus !== 'active' || !activeDevice || !xtreamClient) {
    return (
      <ActivationScreen
        mac={identity.mac}
        deviceKey={identity.deviceKey}
        status={activationStatus}
        message={statusMessage}
        onRefresh={handleRefreshActivation}
        onIdentityChanged={() => setIdentity(getOrCreateDeviceIdentity())}
      />
    );
  }

  // 3. Aplicação Principal Ativa (TV Ao Vivo, Filmes, Séries, Ajustes)
  return (
    <div className="w-screen h-screen flex bg-[#0a0d14] overflow-hidden">
      <NavigationBar
        currentSection={currentSection}
        onSelectSection={setCurrentSection}
      />

      <main className="flex-1 h-full overflow-hidden">
        {currentSection === 'live' && <LiveTvView client={xtreamClient} />}
        {currentSection === 'vod' && <MoviesView client={xtreamClient} />}
        {currentSection === 'series' && <SeriesView client={xtreamClient} />}
        {currentSection === 'settings' && (
          <SettingsView
            device={activeDevice}
            onRefreshData={handleRefreshActivation}
            onResetDevice={handleResetDevice}
          />
        )}
      </main>
    </div>
  );
}
