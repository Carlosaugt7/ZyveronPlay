import React, { useState, useEffect, useMemo } from 'react';
import { getOrCreateDeviceIdentity, getCachedDevice, saveCachedDevice } from './lib/storage';
import { listenDeviceActivation } from './lib/firebase';
import { DeviceActivation } from './types';
import { XtreamClient } from './lib/xtream';
import { ActivationScreen } from './components/ActivationScreen';
import { NavigationBar, MainSection } from './components/NavigationBar';
import { LiveTvView } from './views/LiveTvView';
import { MoviesView } from './views/MoviesView';
import { SeriesView } from './views/SeriesView';
import { SettingsView } from './views/SettingsView';
import { useSpatialNav } from './hooks/useSpatialNav';
import { Loader2 } from 'lucide-react';

const SECTIONS: MainSection[] = ['live', 'vod', 'series', 'settings'];

export default function App() {
  const [identity, setIdentity] = useState(() => getOrCreateDeviceIdentity());
  const initialCached = useMemo(() => getCachedDevice(), []);
  const [activeDevice, setActiveDevice] = useState<DeviceActivation | null>(() => initialCached);
  const [activationStatus, setActivationStatus] = useState<'loading' | 'unregistered' | 'active' | 'expired' | 'blocked'>(
    () => (initialCached && initialCached.mac === identity.mac ? 'active' : 'loading')
  );
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [currentSection, setCurrentSection] = useState<MainSection>('live');
  const [focusZone, setFocusZone] = useState<'sidebar' | 'content'>('content');
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  // Chaves de controle para revalidação reativa sem travamento
  const [authReloadKey, setAuthReloadKey] = useState<number>(0);
  const [contentReloadKey, setContentReloadKey] = useState<number>(0);

  // Inicializa e escuta em tempo real no Firestore para este MAC
  useEffect(() => {
    // Se não tiver cache para este MAC, exibe loading
    const cached = getCachedDevice();
    if (!cached || cached.mac !== identity.mac) {
      setActivationStatus('loading');
    }

    // Timeout de segurança para conexões lentas de Smart TV (6s)
    const safetyTimeout = setTimeout(() => {
      setActivationStatus((prev) => (prev === 'loading' ? 'unregistered' : prev));
    }, 6000);

    const unsubscribe = listenDeviceActivation(identity.mac, (state) => {
      clearTimeout(safetyTimeout);
      setActivationStatus(state.status);
      setStatusMessage(state.message || '');
      if (state.status === 'active' && state.device) {
        setActiveDevice(state.device);
        saveCachedDevice(state.device);
      } else if (state.status !== 'active') {
        saveCachedDevice(null);
        setActiveDevice(null);
      }
    });

    return () => {
      clearTimeout(safetyTimeout);
      unsubscribe();
    };
  }, [identity.mac, authReloadKey]);

  // Instância do Cliente Xtream conectada ao DNS e credenciais ativas
  const xtreamClient = useMemo(() => {
    if (!activeDevice || !activeDevice.activeDns || !activeDevice.username || !activeDevice.password) {
      return null;
    }
    return new XtreamClient(activeDevice.activeDns, activeDevice.username, activeDevice.password);
  }, [activeDevice?.activeDns, activeDevice?.username, activeDevice?.password]);

  // Navegação D-Pad na Sidebar quando a barra lateral estiver em foco
  useSpatialNav({
    onUp: () => {
      const idx = SECTIONS.indexOf(currentSection);
      const nextIdx = (idx - 1 + SECTIONS.length) % SECTIONS.length;
      setCurrentSection(SECTIONS[nextIdx]);
    },
    onDown: () => {
      const idx = SECTIONS.indexOf(currentSection);
      const nextIdx = (idx + 1) % SECTIONS.length;
      setCurrentSection(SECTIONS[nextIdx]);
    },
    onRight: () => {
      setFocusZone('content');
    },
    onSelect: () => {
      setFocusZone('content');
    },
    disabled: focusZone !== 'sidebar' || activationStatus !== 'active' || isFullScreen
  }, [focusZone, currentSection, activationStatus, isFullScreen]);

  // Força revalidação no Firestore caso o usuário clique em "Verificar Agora"
  const handleRefreshActivation = () => {
    setActivationStatus('loading');
    setAuthReloadKey((prev) => prev + 1);
  };

  // Sincroniza a lista de canais sem deslogar ou travar a tela
  const handleSyncContent = () => {
    setContentReloadKey((prev) => prev + 1);
  };

  const handleResetDevice = () => {
    localStorage.clear();
    setIdentity(getOrCreateDeviceIdentity());
    setAuthReloadKey((prev) => prev + 1);
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
        onIdentityChanged={() => {
          saveCachedDevice(null);
          setActiveDevice(null);
          setIdentity(getOrCreateDeviceIdentity());
          setActivationStatus('loading');
          setAuthReloadKey((k) => k + 1);
        }}
      />
    );
  }

  // 3. Aplicação Principal Ativa (TV Ao Vivo, Filmes, Séries, Ajustes)
  return (
    <div className="w-screen h-screen flex bg-[#0a0d14] overflow-hidden relative">
      {/* Barra de Menu Lateral - Ocultada completamente quando o vídeo estiver em tela cheia */}
      {!isFullScreen && (
        <NavigationBar
          currentSection={currentSection}
          onSelectSection={(sec) => {
            setCurrentSection(sec);
            setFocusZone('content');
          }}
          isFocused={focusZone === 'sidebar'}
        />
      )}

      <main className="flex-1 h-full overflow-hidden">
        {currentSection === 'live' && (
          <LiveTvView
            client={xtreamClient}
            isFocusedContent={focusZone === 'content'}
            onRequestFocusSidebar={() => setFocusZone('sidebar')}
            reloadKey={contentReloadKey}
            onFullScreenChange={setIsFullScreen}
          />
        )}
        {currentSection === 'vod' && (
          <MoviesView
            client={xtreamClient}
            isFocusedContent={focusZone === 'content'}
            onRequestFocusSidebar={() => setFocusZone('sidebar')}
            onFullScreenChange={setIsFullScreen}
          />
        )}
        {currentSection === 'series' && (
          <SeriesView
            client={xtreamClient}
            isFocusedContent={focusZone === 'content'}
            onRequestFocusSidebar={() => setFocusZone('sidebar')}
            onFullScreenChange={setIsFullScreen}
          />
        )}
        {currentSection === 'settings' && (
          <SettingsView
            device={activeDevice}
            isFocusedContent={focusZone === 'content'}
            onRequestFocusSidebar={() => setFocusZone('sidebar')}
            onSyncContent={handleSyncContent}
            onResetDevice={handleResetDevice}
          />
        )}
      </main>
    </div>
  );
}
