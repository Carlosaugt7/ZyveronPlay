import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { XtreamClient } from '../lib/xtream';
import { XtreamVod, XtreamSeries, DeviceActivation } from '../types';
import { Tv, Film, Clapperboard, Trophy, RefreshCw, Settings, Wifi, Clock, ArrowRight, LogOut, X } from 'lucide-react';
import { useNetworkQuality } from '../hooks/useNetworkQuality';
import { useSpatialNav } from '../hooks/useSpatialNav';
import { executeExitApp } from '../lib/exitApp';

interface HomeViewProps {
  client: XtreamClient;
  device: DeviceActivation | null;
  onNavigate: (section: 'live' | 'vod' | 'series' | 'settings', extra?: { categoryId?: string; streamId?: number }) => void;
  onSyncContent: () => void;
  reloadKey?: number;
  onSwitchPlaylist?: (index: number) => void;
}

function cleanTitle(rawName: string): string {
  if (!rawName) return '';
  return rawName
    .toLowerCase()
    .replace(/[\[\(][^\]\)]*[\]\)]/g, ' ') // Remove conteúdo entre colchetes/parênteses (tags, anos, resoluções)
    .replace(/\b(4k|fhd|hd|sd|1080p|720p|2160p|hevc|x264|x265|dublado|legendado|dual|leg|dub|nacional|web-?dl|bluray)\b/gi, ' ')
    .replace(/[^a-z0-9]/gi, '') // Remove caracteres especiais e pontuações
    .trim();
}

export function deduplicateVods(vods: XtreamVod[], limit = 10): XtreamVod[] {
  if (!vods || !Array.isArray(vods)) return [];
  const result: XtreamVod[] = [];
  const seenIds = new Set<number>();
  const seenTitles = new Set<string>();

  for (const item of vods) {
    if (!item || !item.stream_id || seenIds.has(item.stream_id)) continue;

    const clean = cleanTitle(item.name || '');
    const titleKey = clean.length >= 2 ? clean : (item.name || '').toLowerCase().trim();

    if (titleKey && seenTitles.has(titleKey)) continue;

    seenIds.add(item.stream_id);
    if (titleKey) seenTitles.add(titleKey);
    result.push(item);

    if (result.length >= limit) break;
  }

  return result;
}

export function deduplicateSeries(seriesList: XtreamSeries[], limit = 10): XtreamSeries[] {
  if (!seriesList || !Array.isArray(seriesList)) return [];
  const result: XtreamSeries[] = [];
  const seenIds = new Set<number>();
  const seenTitles = new Set<string>();

  for (const item of seriesList) {
    if (!item || !item.series_id || seenIds.has(item.series_id)) continue;

    const clean = cleanTitle(item.name || '');
    const titleKey = clean.length >= 2 ? clean : (item.name || '').toLowerCase().trim();

    if (titleKey && seenTitles.has(titleKey)) continue;

    seenIds.add(item.series_id);
    if (titleKey) seenTitles.add(titleKey);
    result.push(item);

    if (result.length >= limit) break;
  }

  return result;
}

export const HomeView: React.FC<HomeViewProps> = ({
  client,
  device,
  onNavigate,
  onSyncContent,
  reloadKey = 0,
  onSwitchPlaylist
}) => {
  // Contagens
  const [liveCount, setLiveCount] = useState<number>(() => {
    const cached = localStorage.getItem('zyveron_live_count');
    return cached ? parseInt(cached, 10) : 0;
  });
  const [vodCount, setVodCount] = useState<number>(() => {
    const cached = localStorage.getItem('zyveron_vod_count');
    return cached ? parseInt(cached, 10) : 0;
  });
  const [seriesCount, setSeriesCount] = useState<number>(() => {
    const cached = localStorage.getItem('zyveron_series_count');
    return cached ? parseInt(cached, 10) : 0;
  });

  // Destaques (Deduplicados)
  const [featuredVods, setFeaturedVods] = useState<XtreamVod[]>(() => {
    try {
      const cached = localStorage.getItem('zyveron_featured_vods');
      return cached ? deduplicateVods(JSON.parse(cached), 10) : [];
    } catch {
      return [];
    }
  });
  const [featuredSeries, setFeaturedSeries] = useState<XtreamSeries[]>(() => {
    try {
      const cached = localStorage.getItem('zyveron_featured_series');
      return cached ? deduplicateSeries(JSON.parse(cached), 10) : [];
    } catch {
      return [];
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(liveCount === 0 && vodCount === 0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');
  const network = useNetworkQuality();

  const hasMultiplePlaylists = Boolean(device?.playlists && device.playlists.length > 1);

  // Foco do Controle Remoto / Teclado
  // grid: 0 (Live), 1 (Vod), 2 (Series), 3 (Sports)
  // vodCarousel: 10 + index (0..9)
  // seriesCarousel: 20 + index (0..9)
  // bottom: 30 (Sync), 33 (Switch Playlist), 31 (Settings), 32 (Exit)
  const [focusedId, setFocusedId] = useState<number>(0);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState<boolean>(false);
  const [exitModalBtnIdx, setExitModalBtnIdx] = useState<number>(0); // 0: Cancelar, 1: Sair
  const activeCarouselRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll para manter o item do carrossel visível no centro da Smart TV
  useEffect(() => {
    if (activeCarouselRef.current && ((focusedId >= 10 && focusedId <= 19) || (focusedId >= 20 && focusedId <= 29))) {
      activeCarouselRef.current.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    }
  }, [focusedId]);

  // Relógio e Saudação Dinâmica
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  // Carrega contagens e destaques da API Xtream
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        // 1. Canais
        client.getLiveStreams().then((streams) => {
          if (isMounted && streams) {
            setLiveCount(streams.length);
            localStorage.setItem('zyveron_live_count', String(streams.length));
          }
        }).catch((err) => console.warn('[HomeView] Erro ao carregar canais:', err));

        // 2. Filmes (Deduplicados)
        client.getVodStreams().then((vods) => {
          if (isMounted && vods) {
            setVodCount(vods.length);
            localStorage.setItem('zyveron_vod_count', String(vods.length));
            const topVods = deduplicateVods(vods, 10);
            setFeaturedVods(topVods);
            try {
              localStorage.setItem('zyveron_featured_vods', JSON.stringify(topVods));
            } catch {}
          }
        }).catch((err) => console.warn('[HomeView] Erro ao carregar filmes:', err));

        // 3. Séries (Deduplicadas)
        client.getSeries().then((seriesList) => {
          if (isMounted && seriesList) {
            setSeriesCount(seriesList.length);
            localStorage.setItem('zyveron_series_count', String(seriesList.length));
            const topSeries = deduplicateSeries(seriesList, 10);
            setFeaturedSeries(topSeries);
            try {
              localStorage.setItem('zyveron_featured_series', JSON.stringify(topSeries));
            } catch {}
          }
        }).catch((err) => console.warn('[HomeView] Erro ao carregar séries:', err));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [client, reloadKey]);

  // Handler de sincronização com feedback visual em tempo real
  const handleSyncCatalog = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    onSyncContent();

    try {
      const [streams, vods, seriesList] = await Promise.all([
        client.getLiveStreams().catch(() => null),
        client.getVodStreams().catch(() => null),
        client.getSeries().catch(() => null),
      ]);

      if (streams) {
        setLiveCount(streams.length);
        localStorage.setItem('zyveron_live_count', String(streams.length));
      }
      if (vods) {
        setVodCount(vods.length);
        localStorage.setItem('zyveron_vod_count', String(vods.length));
        const topVods = deduplicateVods(vods, 10);
        setFeaturedVods(topVods);
        try {
          localStorage.setItem('zyveron_featured_vods', JSON.stringify(topVods));
        } catch {}
      }
      if (seriesList) {
        setSeriesCount(seriesList.length);
        localStorage.setItem('zyveron_series_count', String(seriesList.length));
        const topSeries = deduplicateSeries(seriesList, 10);
        setFeaturedSeries(topSeries);
        try {
          localStorage.setItem('zyveron_featured_series', JSON.stringify(topSeries));
        } catch {}
      }

      setSyncFeedback('Catálogo Atualizado!');
    } catch {
      setSyncFeedback('Sincronizado!');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 3500);
    }
  };

  // Ações de cada item selecionado na Home
  const triggerAction = useCallback((id: number) => {
    if (id === 0) onNavigate('live');
    else if (id === 1) onNavigate('vod');
    else if (id === 2) onNavigate('series');
    else if (id === 3) onNavigate('live', { categoryId: 'sports' });
    else if (id === 30) handleSyncCatalog();
    else if (id === 33 && device?.playlists && device.playlists.length > 1) {
      onSwitchPlaylist?.(device.activePlaylistIndex === 0 ? 1 : 0);
    }
    else if (id === 31) onNavigate('settings');
    else if (id >= 10 && id <= 19) {
      const idx = id - 10;
      if (featuredVods[idx]) {
        onNavigate('vod', { streamId: featuredVods[idx].stream_id });
      }
    } else if (id >= 20 && id <= 29) {
      const idx = id - 20;
      if (featuredSeries[idx]) {
        onNavigate('series', { streamId: featuredSeries[idx].series_id });
      }
    }
  }, [onNavigate, onSyncContent, client, featuredVods, featuredSeries, device, onSwitchPlaylist]);

  // Controle Remoto: Navegação Espacial completa integrada ao useSpatialNav
  useSpatialNav({
    onUp: () => {
      if (showExitConfirmModal) return;
      setFocusedId((prev) => {
        if (prev === 2) return 0; // Séries -> TV ao Vivo
        if (prev === 3) return 1; // Esportes -> Filmes
        if (prev >= 20 && prev <= 29) return prev - 10; // Séries Carousel -> VOD Carousel
        if (prev >= 10 && prev <= 19) return 1; // VOD Carousel -> Filmes Card
        if (prev === 30 || prev === 31 || prev === 32 || prev === 33) return 2; // Bottom -> Séries Card
        return prev;
      });
    },
    onDown: () => {
      if (showExitConfirmModal) return;
      setFocusedId((prev) => {
        if (prev === 0) return 2; // TV ao Vivo -> Séries
        if (prev === 1) return 3; // Filmes -> Esportes
        if (prev === 2 || prev === 3) return 30; // Séries/Esportes -> Sincronizar
        if (prev >= 10 && prev <= 19) return Math.min(20 + featuredSeries.length - 1, prev + 10); // VOD Carousel -> Séries Carousel
        if (prev >= 20 && prev <= 29) return 31; // Séries Carousel -> Ajustes
        return prev;
      });
    },
    onLeft: () => {
      if (showExitConfirmModal) {
        setExitModalBtnIdx(0); // Foca em Cancelar
        return;
      }
      setFocusedId((prev) => {
        if (prev === 1) return 0; // Filmes -> TV ao Vivo
        if (prev === 3) return 2; // Esportes -> Séries
        if (prev === 32) return 31; // Sair -> Ajustes
        if (prev === 31) return hasMultiplePlaylists ? 33 : 30; // Ajustes -> Alternar Lista (ou Sincronizar)
        if (prev === 33) return 30; // Alternar Lista -> Sincronizar
        if (prev >= 10 && prev <= 19) {
          if (prev === 10) return 1; // Primeiro do VOD -> Filmes Card
          return prev - 1;
        }
        if (prev >= 20 && prev <= 29) {
          if (prev === 20) return 3; // Primeiro das Séries -> Esportes Card
          return prev - 1;
        }
        return prev;
      });
    },
    onRight: () => {
      if (showExitConfirmModal) {
        setExitModalBtnIdx(1); // Foca em Sair
        return;
      }
      setFocusedId((prev) => {
        if (prev === 0) return 1; // TV ao Vivo -> Filmes
        if (prev === 2) return 3; // Séries -> Esportes
        if (prev === 1) return 10; // Filmes -> Primeiro VOD Carousel
        if (prev === 3) return 20; // Esportes -> Primeiro Séries Carousel
        if (prev === 30) return hasMultiplePlaylists ? 33 : 31; // Sincronizar -> Alternar Lista (ou Ajustes)
        if (prev === 33) return 31; // Alternar Lista -> Ajustes
        if (prev === 31) return 32; // Ajustes -> Sair
        if (prev >= 10 && prev < 19 && prev - 10 < featuredVods.length - 1) return prev + 1;
        if (prev >= 20 && prev < 29 && prev - 20 < featuredSeries.length - 1) return prev + 1;
        return prev;
      });
    },
    onSelect: () => {
      if (showExitConfirmModal) {
        if (exitModalBtnIdx === 1) {
          executeExitApp();
        } else {
          setShowExitConfirmModal(false);
        }
        return;
      }
      if (focusedId === 32) {
        setShowExitConfirmModal(true);
        setExitModalBtnIdx(1);
        return;
      }
      triggerAction(focusedId);
    },
    onBack: () => {
      console.log('[HomeView] Voltar acionado na Home');
      if (showExitConfirmModal) {
        // Segundo toque em Voltar com o modal aberto confirma a saída imediata
        executeExitApp();
        return;
      }
      // Primeiro toque em Voltar abre o modal de confirmação de saída
      setShowExitConfirmModal(true);
      setExitModalBtnIdx(0);
    },
    priority: 0
  }, [focusedId, featuredVods, featuredSeries, triggerAction, showExitConfirmModal, exitModalBtnIdx, hasMultiplePlaylists]);

  return (
    <div className="w-full h-full min-h-[100dvh] bg-[#0a0d14] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/40 via-[#0a0d14] to-[#07090e] text-white flex flex-col justify-between p-3 sm:p-4 md:p-6 select-none overflow-y-auto lg:overflow-hidden custom-scrollbar">
      
      {/* 1. CABEÇALHO SUPERIOR (Logo Central Oficial + Relógio/Status) */}
      <header className="w-full flex items-center justify-between shrink-0 mb-3">
        {/* Espaço Esquerdo de Equilíbrio */}
        <div className="w-32 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-[11px] font-semibold text-emerald-400 tracking-wider uppercase">Online</span>
        </div>

        {/* Logo Central Oficial Zyveron Play */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500/20 to-emerald-500/10 border border-sky-500/30 flex items-center justify-center shadow-lg shadow-sky-950/40">
            <Tv className="w-5 h-5 text-sky-400" />
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xl font-extrabold tracking-widest text-white leading-none">
              ZYVERON
            </span>
            <span className="text-[10px] font-bold tracking-[0.25em] text-sky-400 leading-tight">
              — P L A Y —
            </span>
          </div>
        </div>

        {/* Relógio e Clima à Direita */}
        <div className="w-32 flex items-center justify-end gap-2 text-right">
          <span className="font-mono font-bold text-base text-slate-100">{currentTime || '--:--'}</span>
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">⛅ 26°C</span>
        </div>
      </header>

      {/* 2. BANNER DE SAUDAÇÃO ESTILO PÍLULA NEON */}
      <section className="w-full shrink-0 mb-4 rounded-2xl bg-gradient-to-r from-[#121722]/95 via-[#161f30]/85 to-[#121722]/95 border border-sky-500/30 px-5 py-2.5 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">👋</span>
          <div>
            <h2 className="text-sm md:text-base font-bold text-white tracking-wide">
              {greeting}!
            </h2>
            <p className="text-xs text-slate-400">
              Escolha uma seção abaixo para começar a assistir Zyveron Play
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Badge / Seletor do Servidor e Lista Ativa */}
          {hasMultiplePlaylists ? (
            <button
              type="button"
              onClick={() => onSwitchPlaylist?.(device?.activePlaylistIndex === 0 ? 1 : 0)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition cursor-pointer shadow-md"
              title="Clique para alternar para a outra lista"
            >
              <span>📋</span>
              <span>Lista {(device?.activePlaylistIndex ?? 0) + 1}/2: {device?.serverName || `Lista ${(device?.activePlaylistIndex ?? 0) + 1}`}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/30 text-sky-200 border border-sky-400/30 font-semibold ml-1">
                Trocar [OK]
              </span>
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              <span>📋</span>
              <span>{device?.serverName || 'Servidor Oficial'}</span>
            </div>
          )}

          {/* Indicador de Sinal de Internet em Tempo Real */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700/80 shadow-inner">
            <Wifi className={`w-4 h-4 ${network.iconColor}`} />
            <span className={`text-xs font-bold ${network.textColor}`}>{network.label}</span>
          </div>
        </div>
      </section>

      {/* 3. CORPO PRINCIPAL (Esquerda: Grid 2x2 | Direita: Carrosséis de Destaque) */}
      <main className="w-full flex-1 min-h-0 grid grid-cols-12 gap-3 sm:gap-4 items-stretch mb-2 sm:mb-3">
        
        {/* --- COLUNA ESQUERDA: GRID 2x2 DE CARDS PRINCIPAIS (6 Colunas) --- */}
        <div className="col-span-12 lg:col-span-6 grid grid-cols-2 gap-3 sm:gap-4 min-h-[220px] sm:min-h-[280px] h-full">
          
          {/* 1. CANAIS AO VIVO */}
          <button
            type="button"
            onClick={() => onNavigate('live')}
            onMouseEnter={() => setFocusedId(0)}
            className={`group h-full rounded-2xl sm:rounded-3xl p-3 sm:p-5 md:p-8 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer focus:outline-none relative overflow-hidden ${
              focusedId === 0
                ? 'scale-[1.02] sm:scale-[1.03] border-3 border-sky-400 shadow-2xl shadow-sky-500/35 bg-gradient-to-br from-[#182a45] via-[#121c2e] to-[#0e1724] ring-4 ring-sky-400/50'
                : 'border-2 border-[#222d42] bg-[#121722]/95 hover:border-slate-500'
            }`}
          >
            {/* Badge no canto superior direito */}
            <span className={`absolute top-2.5 right-2.5 sm:top-4 sm:right-4 text-[10px] sm:text-xs md:text-sm px-2.5 sm:px-3.5 py-0.5 sm:py-1 rounded-lg sm:rounded-xl font-black uppercase tracking-wider ${
              focusedId === 0 ? 'bg-sky-400 text-black font-black shadow-md' : 'bg-slate-800/90 text-slate-300 border border-slate-700'
            }`}>
              Ao Vivo
            </span>

            {/* Ícone Centralizado em Destaque */}
            <div className={`w-12 h-12 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-2 sm:mb-4 transition-all duration-300 ${
              focusedId === 0
                ? 'bg-sky-500/25 border-2 border-sky-400/80 shadow-xl shadow-sky-500/40 scale-105 sm:scale-110'
                : 'bg-sky-500/10 border border-sky-500/25 group-hover:scale-105'
            }`}>
              <Tv className="w-6 h-6 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 text-sky-400" />
            </div>

            {/* Título e Contagem Centralizados */}
            <h3 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-black text-white tracking-wide group-hover:text-sky-300 transition-colors leading-tight">
              Canais ao Vivo
            </h3>
            <p className="text-xs sm:text-sm md:text-base lg:text-lg text-slate-300 font-semibold mt-1">
              {liveCount > 0 ? `${liveCount.toLocaleString('pt-BR')} canais` : (isLoading ? 'Sincronizando...' : 'Grade completa')}
            </p>
          </button>

          {/* 2. FILMES */}
          <button
            type="button"
            onClick={() => onNavigate('vod')}
            onMouseEnter={() => setFocusedId(1)}
            className={`group h-full rounded-2xl sm:rounded-3xl p-3 sm:p-5 md:p-8 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer focus:outline-none relative overflow-hidden ${
              focusedId === 1
                ? 'scale-[1.02] sm:scale-[1.03] border-3 border-sky-400 shadow-2xl shadow-sky-500/35 bg-gradient-to-br from-[#182a45] via-[#121c2e] to-[#0e1724] ring-4 ring-sky-400/50'
                : 'border-2 border-[#222d42] bg-[#121722]/95 hover:border-slate-500'
            }`}
          >
            {/* Badge no canto superior direito */}
            <span className={`absolute top-2.5 right-2.5 sm:top-4 sm:right-4 text-[10px] sm:text-xs md:text-sm px-2.5 sm:px-3.5 py-0.5 sm:py-1 rounded-lg sm:rounded-xl font-black uppercase tracking-wider ${
              focusedId === 1 ? 'bg-sky-400 text-black font-black shadow-md' : 'bg-slate-800/90 text-slate-300 border border-slate-700'
            }`}>
              VOD
            </span>

            {/* Ícone Centralizado em Destaque */}
            <div className={`w-12 h-12 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-2 sm:mb-4 transition-all duration-300 ${
              focusedId === 1
                ? 'bg-sky-500/25 border-2 border-sky-400/80 shadow-xl shadow-sky-500/40 scale-105 sm:scale-110'
                : 'bg-sky-500/10 border border-sky-500/25 group-hover:scale-105'
            }`}>
              <Film className="w-6 h-6 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 text-sky-400" />
            </div>

            {/* Título e Contagem Centralizados */}
            <h3 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-black text-white tracking-wide group-hover:text-sky-300 transition-colors leading-tight">
              Filmes
            </h3>
            <p className="text-xs sm:text-sm md:text-base lg:text-lg text-slate-300 font-semibold mt-1">
              {vodCount > 0 ? `${vodCount.toLocaleString('pt-BR')} filmes • Cinema` : 'On Demand'}
            </p>
          </button>

          {/* 3. SÉRIES */}
          <button
            type="button"
            onClick={() => onNavigate('series')}
            onMouseEnter={() => setFocusedId(2)}
            className={`group h-full rounded-2xl sm:rounded-3xl p-3 sm:p-5 md:p-8 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer focus:outline-none relative overflow-hidden ${
              focusedId === 2
                ? 'scale-[1.02] sm:scale-[1.03] border-3 border-sky-400 shadow-2xl shadow-sky-500/35 bg-gradient-to-br from-[#182a45] via-[#121c2e] to-[#0e1724] ring-4 ring-sky-400/50'
                : 'border-2 border-[#222d42] bg-[#121722]/95 hover:border-slate-500'
            }`}
          >
            {/* Badge no canto superior direito */}
            <span className={`absolute top-2.5 right-2.5 sm:top-4 sm:right-4 text-[10px] sm:text-xs md:text-sm px-2.5 sm:px-3.5 py-0.5 sm:py-1 rounded-lg sm:rounded-xl font-black uppercase tracking-wider ${
              focusedId === 2 ? 'bg-sky-400 text-black font-black shadow-md' : 'bg-slate-800/90 text-slate-300 border border-slate-700'
            }`}>
              Séries
            </span>

            {/* Ícone Centralizado em Destaque */}
            <div className={`w-12 h-12 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-2 sm:mb-4 transition-all duration-300 ${
              focusedId === 2
                ? 'bg-sky-500/25 border-2 border-sky-400/80 shadow-xl shadow-sky-500/40 scale-105 sm:scale-110'
                : 'bg-sky-500/10 border border-sky-500/25 group-hover:scale-105'
            }`}>
              <Clapperboard className="w-6 h-6 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 text-sky-400" />
            </div>

            {/* Título e Contagem Centralizados */}
            <h3 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-black text-white tracking-wide group-hover:text-sky-300 transition-colors leading-tight">
              Séries
            </h3>
            <p className="text-xs sm:text-sm md:text-base lg:text-lg text-slate-300 font-semibold mt-1">
              {seriesCount > 0 ? `${seriesCount.toLocaleString('pt-BR')} séries • Temporadas` : 'Episódios'}
            </p>
          </button>

          {/* 4. ESPORTES */}
          <button
            type="button"
            onClick={() => onNavigate('live', { categoryId: 'sports' })}
            onMouseEnter={() => setFocusedId(3)}
            className={`group h-full rounded-2xl sm:rounded-3xl p-3 sm:p-5 md:p-8 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer focus:outline-none relative overflow-hidden ${
              focusedId === 3
                ? 'scale-[1.02] sm:scale-[1.03] border-3 border-emerald-400 shadow-2xl shadow-emerald-500/35 bg-gradient-to-br from-[#11271f] via-[#0f211a] to-[#0c1813] ring-4 ring-emerald-400/50'
                : 'border-2 border-[#222d42] bg-[#121722]/95 hover:border-slate-500'
            }`}
          >
            {/* Badge no canto superior direito */}
            <span className={`absolute top-2.5 right-2.5 sm:top-4 sm:right-4 text-[10px] sm:text-xs md:text-sm px-2.5 sm:px-3.5 py-0.5 sm:py-1 rounded-lg sm:rounded-xl font-black uppercase tracking-wider ${
              focusedId === 3 ? 'bg-emerald-400 text-black font-black shadow-md' : 'bg-slate-800/90 text-slate-300 border border-slate-700'
            }`}>
              Ao Vivo
            </span>

            {/* Ícone Centralizado em Destaque */}
            <div className={`w-12 h-12 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-2 sm:mb-4 transition-all duration-300 ${
              focusedId === 3
                ? 'bg-emerald-500/25 border-2 border-emerald-400/80 shadow-xl shadow-emerald-500/40 scale-105 sm:scale-110'
                : 'bg-emerald-500/10 border border-emerald-500/25 group-hover:scale-105'
            }`}>
              <Trophy className="w-6 h-6 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 text-emerald-400" />
            </div>

            {/* Título e Contagem Centralizados */}
            <h3 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-black text-white tracking-wide group-hover:text-emerald-300 transition-colors leading-tight">
              Esportes
            </h3>
            <p className="text-xs sm:text-sm md:text-base lg:text-lg text-emerald-300 font-semibold mt-1">
              Futebol • Lutas • Ao Vivo
            </p>
          </button>

        </div>

        {/* --- COLUNA DIREITA: CARROSSÉIS DE DESTAQUES (6 Colunas Otimizadas para Preencher a Tela) --- */}
        <div className="col-span-12 lg:col-span-6 flex flex-col justify-between gap-4 h-full overflow-hidden">
          
          {/* Seção 1: Filmes em Destaque */}
          <div className="flex-1 flex flex-col justify-between bg-[#121722]/90 border border-[#222d42] rounded-3xl p-4 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between mb-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-sm md:text-base font-black text-sky-400 tracking-wider">
                  🎬 FILMES EM DESTAQUE
                </span>
                <span className="text-xs md:text-sm text-slate-400 hidden sm:inline">
                  • Cinema e Lançamentos
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('vod')}
                className="text-xs md:text-sm text-sky-400 hover:text-white flex items-center gap-1.5 font-bold cursor-pointer"
              >
                Ver todos <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 flex items-center gap-3.5 overflow-x-auto no-scrollbar py-1">
              {featuredVods.length > 0 ? (
                featuredVods.slice(0, 10).map((vod, idx) => {
                  const targetId = 10 + idx;
                  const isItemFocused = focusedId === targetId;
                  return (
                    <button
                      key={`vod-${vod.stream_id}-${idx}`}
                      type="button"
                      ref={isItemFocused ? activeCarouselRef : null}
                      onClick={() => onNavigate('vod', { streamId: vod.stream_id })}
                      onMouseEnter={() => setFocusedId(targetId)}
                      className={`shrink-0 w-36 md:w-44 lg:w-48 h-[96%] max-h-[240px] rounded-2xl overflow-hidden relative transition-all duration-200 cursor-pointer focus:outline-none ${
                        isItemFocused
                          ? 'scale-105 border-2 border-white shadow-2xl shadow-sky-500/50 ring-4 ring-sky-400 z-10'
                          : 'border border-slate-700/60 opacity-85 hover:opacity-100 hover:border-slate-500'
                      }`}
                    >
                      {vod.stream_icon ? (
                        <img
                          src={vod.stream_icon}
                          alt={vod.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center text-3xl">
                          🎬
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-2.5 text-left">
                        <p className="text-xs md:text-sm font-bold text-white truncate">{vod.name}</p>
                        {vod.rating && (
                          <p className="text-[11px] md:text-xs text-amber-400 font-bold flex items-center gap-1 mt-0.5">
                            ★ {vod.rating}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="w-full h-28 flex items-center justify-center text-slate-500 text-sm">
                  Carregando lançamentos...
                </div>
              )}
            </div>
          </div>

          {/* Seção 2: Séries em Destaque */}
          <div className="flex-1 flex flex-col justify-between bg-[#121722]/90 border border-[#222d42] rounded-3xl p-4 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between mb-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-sm md:text-base font-black text-sky-400 tracking-wider">
                  📺 SÉRIES EM DESTAQUE
                </span>
                <span className="text-xs md:text-sm text-slate-400 hidden sm:inline">
                  • Temporadas Completas
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('series')}
                className="text-xs md:text-sm text-sky-400 hover:text-white flex items-center gap-1.5 font-bold cursor-pointer"
              >
                Ver todas <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 flex items-center gap-3.5 overflow-x-auto no-scrollbar py-1">
              {featuredSeries.length > 0 ? (
                featuredSeries.slice(0, 10).map((series, idx) => {
                  const targetId = 20 + idx;
                  const isItemFocused = focusedId === targetId;
                  return (
                    <button
                      key={`series-${series.series_id}-${idx}`}
                      type="button"
                      ref={isItemFocused ? activeCarouselRef : null}
                      onClick={() => onNavigate('series', { streamId: series.series_id })}
                      onMouseEnter={() => setFocusedId(targetId)}
                      className={`shrink-0 w-36 md:w-44 lg:w-48 h-[96%] max-h-[240px] rounded-2xl overflow-hidden relative transition-all duration-200 cursor-pointer focus:outline-none ${
                        isItemFocused
                          ? 'scale-105 border-2 border-white shadow-2xl shadow-sky-500/50 ring-4 ring-sky-400 z-10'
                          : 'border border-slate-700/60 opacity-85 hover:opacity-100 hover:border-slate-500'
                      }`}
                    >
                      {series.cover ? (
                        <img
                          src={series.cover}
                          alt={series.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center text-3xl">
                          📺
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-2.5 text-left">
                        <p className="text-xs md:text-sm font-bold text-white truncate">{series.name}</p>
                        {series.rating && (
                          <p className="text-[11px] md:text-xs text-amber-400 font-bold flex items-center gap-1 mt-0.5">
                            ★ {series.rating}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="w-full h-28 flex items-center justify-center text-slate-500 text-sm">
                  Carregando séries...
                </div>
              )}
            </div>
          </div>

        </div>

      </main>

      {/* 4. BARRA INFERIOR DE ATALHOS RÁPIDOS */}
      <footer className="w-full shrink-0 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
        <div className="flex items-center gap-3">
          {/* Botão Sincronizar com Feedback */}
          <button
            type="button"
            onClick={handleSyncCatalog}
            onMouseEnter={() => setFocusedId(30)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer focus:outline-none ${
              focusedId === 30 ? 'bg-sky-500 text-black font-bold ring-2 ring-white' : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-sky-400' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : syncFeedback || 'Sincronizar Catálogo'}</span>
          </button>

          {/* Botão Alternar Lista (quando há 2 listas configuradas) */}
          {hasMultiplePlaylists && (
            <button
              type="button"
              onClick={() => onSwitchPlaylist?.(device?.activePlaylistIndex === 0 ? 1 : 0)}
              onMouseEnter={() => setFocusedId(33)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer focus:outline-none ${
                focusedId === 33
                  ? 'bg-emerald-400 text-black font-bold ring-2 ring-white'
                  : 'bg-emerald-950/40 text-emerald-300 hover:text-white border border-emerald-500/30'
              }`}
            >
              <span>📋</span>
              <span>Usar {device?.activePlaylistIndex === 0 ? (device?.playlists[1]?.serverName || 'Lista 2') : (device?.playlists[0]?.serverName || 'Lista 1')}</span>
            </button>
          )}

          {/* Botão Ajustes */}
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            onMouseEnter={() => setFocusedId(31)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer focus:outline-none ${
              focusedId === 31 ? 'bg-sky-500 text-black font-bold ring-2 ring-white' : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Ajustes & Conta</span>
          </button>

          {/* Botão Sair do App */}
          <button
            type="button"
            onClick={() => {
              setShowExitConfirmModal(true);
              setExitModalBtnIdx(1);
            }}
            onMouseEnter={() => setFocusedId(32)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer focus:outline-none ${
              focusedId === 32 ? 'bg-rose-600 text-white font-bold ring-2 ring-white' : 'bg-slate-800/80 text-rose-300 hover:text-white hover:bg-rose-950/60'
            }`}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair do App</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-500">
          MAC: <span className="font-mono text-slate-400 font-bold">{device?.mac || '--:--:--:--:--:--'}</span> • Zyveron Engine v2.0
        </div>
      </footer>

      {/* MODAL DE CONFIRMAÇÃO DE SAÍDA (PADRÃO SMART TV / MEDIA STATION X) */}
      {showExitConfirmModal && (
        <div 
          className="fixed inset-0 z-[10005] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
          onClick={() => setShowExitConfirmModal(false)}
        >
          <div 
            className="bg-[#121722] border-2 border-slate-700/80 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl flex flex-col items-center relative animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botão Fechar no canto */}
            <button
              type="button"
              onClick={() => setShowExitConfirmModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              title="Cancelar e Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Ícone de Saída */}
            <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-4 shadow-lg shadow-rose-950/40">
              <LogOut className="w-8 h-8" />
            </div>

            {/* Título e Mensagem */}
            <h3 className="text-xl sm:text-2xl font-black text-white text-center mb-2 tracking-wide">
              Sair do Aplicativo?
            </h3>
            <p className="text-sm text-slate-300 text-center mb-4 max-w-xs leading-relaxed">
              Deseja realmente fechar o Zyveron Play e retornar ao Media Station X?
            </p>

            {/* Dica de Duplo Clique no Voltar */}
            <div className="mb-6 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-[11px] text-slate-400 text-center font-mono">
              Dica: aperte <span className="text-rose-400 font-bold">[VOLTAR]</span> novamente para sair direto
            </div>

            {/* Botões de Ação */}
            <div className="grid grid-cols-2 gap-3 w-full">
              {/* Botão 1: Cancelar (Continuar no App) */}
              <button
                type="button"
                onClick={() => setShowExitConfirmModal(false)}
                onMouseEnter={() => setExitModalBtnIdx(0)}
                className={`py-3.5 px-4 rounded-xl font-black text-sm sm:text-base transition cursor-pointer flex items-center justify-center gap-2 ${
                  exitModalBtnIdx === 0
                    ? 'bg-slate-200 text-black scale-105 shadow-xl ring-4 ring-slate-400'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
              >
                <span>Continuar</span>
              </button>

              {/* Botão 2: Confirmar Saída */}
              <button
                type="button"
                onClick={executeExitApp}
                onMouseEnter={() => setExitModalBtnIdx(1)}
                className={`py-3.5 px-4 rounded-xl font-black text-sm sm:text-base transition cursor-pointer flex items-center justify-center gap-2 ${
                  exitModalBtnIdx === 1
                    ? 'bg-rose-500 text-white scale-105 shadow-xl shadow-rose-500/40 ring-4 ring-rose-300'
                    : 'bg-rose-950/40 text-rose-300 border border-rose-500/40 hover:bg-rose-900/60'
                }`}
              >
                <LogOut className="w-4 h-4" />
                <span>Sim, Sair</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

