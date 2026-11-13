import React, { useState, useEffect, useMemo } from 'react';
import { getOrCreateDeviceIdentity, getCachedDevice, saveCachedDevice } from './lib/storage';
import { listenDeviceActivation } from './lib/firebase';
import { DeviceActivation } from './types';
import { XtreamClient } from './lib/xtream';
import { ActivationScreen } from './components/ActivationScreen';
import { MainSection } from './components/NavigationBar';
import { HomeView } from './views/HomeView';
import { LiveTvView } from './views/LiveTvView';
import { MoviesView } from './views/MoviesView';
import { SeriesView } from './views/SeriesView';
import { SettingsView } from './views/SettingsView';
import { TitleBar } from './components/TitleBar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RotateDevicePrompt } from './components/RotateDevicePrompt';
import { Loader2 } from 'lucide-react';

const SECTIONS: MainSection[] = ['home', 'live', 'vod', 'series', 'settings'];

export default function App() {
  const [identity, setIdentity] = useState(() => getOrCreateDeviceIdentity());
  const initialCached = useMemo(() => getCachedDevice(), []);
  const [activeDevice, setActiveDevice] = useState<DeviceActivation | null>(() => initialCached);
  const [activationStatus, setActivationStatus] = useState<'loading' | 'unregistered' | 'active' | 'expired' | 'blocked'>(
    () => (initialCached && initialCached.mac === identity.mac ? 'active' : 'loading')
  );
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [currentSection, setCurrentSection] = useState<MainSection>('home');
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  // Filtros dinâmicos passados pela Home
  const [selectedLiveCategory, setSelectedLiveCategory] = useState<string | undefined>(undefined);
  const [selectedVodId, setSelectedVodId] = useState<number | undefined>(undefined);
  const [selectedSeriesId, setSelectedSeriesId] = useState<number | undefined>(undefined);

  // Chaves de controle para revalidação reativa sem travamento
  const [authReloadKey, setAuthReloadKey] = useState<number>(0);
  const [contentReloadKey, setContentReloadKey] = useState<number>(0);

  // Escuta alteração de tela cheia disparada pelo Electron (F11 ou botão da TitleBar)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI?.onFullScreenChange) {
      const unsub = window.electronAPI.onFullScreenChange((full) => {
        setIsFullScreen(full);
      });
      return () => {
        unsub?.();
      };
    }
  }, []);

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

  // Cada seção do app (Live TV, Filmes, Séries) ocupa 100% da tela cheia sem sidebar,
  // exatamente como no aplicativo oficial para Android TV / TV Box.
  // Pressionar o botão VOLTAR no controle remoto a partir de qualquer seção retorna para a Home.
  const handleBackToHome = () => {
    setSelectedLiveCategory(undefined);
    setSelectedVodId(undefined);
    setSelectedSeriesId(undefined);
    setCurrentSection('home');
  };

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
      <div className="w-screen h-screen bg-[#0a0d14] flex flex-col text-white select-none overflow-hidden safe-area-padding">
        <RotateDevicePrompt />
        <TitleBar isFullScreen={isFullScreen} />
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="w-16 h-16 text-emerald-400 animate-spin mb-4" />
          <h2 className="text-xl font-bold tracking-wide">
            Iniciando Zyveron {typeof window !== 'undefined' && window.electronAPI?.isElectron ? 'Desktop' : 'Smart TV'}...
          </h2>
          <p className="text-sm text-slate-400 mt-1">Conectando ao serviço de validação segura</p>
        </div>
      </div>
    );
  }

  // 2. Tela de Ativação / Mensalidade Vencida / Bloqueio
  if (activationStatus !== 'active' || !activeDevice || !xtreamClient) {
    return (
      <div className="w-screen h-screen bg-[#0a0d14] flex flex-col overflow-hidden select-none safe-area-padding">
        <RotateDevicePrompt />
        <TitleBar isFullScreen={isFullScreen} />
        <div className="flex-1 overflow-hidden relative">
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
        </div>
      </div>
    );
  }

  // 3. Aplicação Principal Ativa (Home Dashboard, TV Ao Vivo, Filmes, Séries, Ajustes)
  return (
    <div className="w-full h-full min-h-[100dvh] flex flex-col bg-[#0a0d14] overflow-hidden select-none safe-area-padding">
      <RotateDevicePrompt />
      <TitleBar isFullScreen={isFullScreen} />
      <div className="flex-1 flex bg-[#0a0d14] overflow-hidden relative w-full h-full">
        {/* Conteúdo da Seção em 100% da tela (sem sidebar persistente para reproduzir fielmente o APK Android TV) */}
        <main className="w-full h-full overflow-hidden">
          <ErrorBoundary onReset={handleBackToHome}>
            {currentSection === 'home' && (
              <HomeView
                client={xtreamClient}
                device={activeDevice}
                onNavigate={(section, extra) => {
                  setSelectedLiveCategory(extra?.categoryId);
                  setSelectedVodId(section === 'vod' ? extra?.streamId : undefined);
                  setSelectedSeriesId(section === 'series' ? extra?.streamId : undefined);
                  setCurrentSection(section);
                }}
                onSyncContent={handleSyncContent}
              />
            )}
            {currentSection === 'live' && (
              <LiveTvView
                client={xtreamClient}
                isFocusedContent={true}
                onBackToHome={handleBackToHome}
                initialCategoryId={selectedLiveCategory}
                reloadKey={contentReloadKey}
                onFullScreenChange={setIsFullScreen}
              />
            )}
            {currentSection === 'vod' && (
              <MoviesView
                client={xtreamClient}
                isFocusedContent={true}
                onBackToHome={handleBackToHome}
                initialStreamId={selectedVodId}
                onFullScreenChange={setIsFullScreen}
              />
            )}
            {currentSection === 'series' && (
              <SeriesView
                client={xtreamClient}
                isFocusedContent={true}
                onBackToHome={handleBackToHome}
                initialStreamId={selectedSeriesId}
                onFullScreenChange={setIsFullScreen}
              />
            )}
            {currentSection === 'settings' && (
              <SettingsView
                device={activeDevice}
                isFocusedContent={true}
                onBackToHome={handleBackToHome}
                onSyncContent={handleSyncContent}
                onResetDevice={handleResetDevice}
              />
            )}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
