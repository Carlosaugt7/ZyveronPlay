import React, { useState, useEffect, useMemo, useRef } from 'react';
import { XtreamClient } from '../lib/xtream';
import { XtreamVod, XtreamSeries, DeviceActivation } from '../types';
import { Tv, Film, Clapperboard, Trophy, RefreshCw, Settings, Wifi, Clock, ArrowRight } from 'lucide-react';
import { useNetworkQuality } from '../hooks/useNetworkQuality';

interface HomeViewProps {
  client: XtreamClient;
  device: DeviceActivation | null;
  onNavigate: (section: 'live' | 'vod' | 'series' | 'settings', extra?: { categoryId?: string; streamId?: number }) => void;
  onSyncContent: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  client,
  device,
  onNavigate,
  onSyncContent
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

  // Destaques
  const [featuredVods, setFeaturedVods] = useState<XtreamVod[]>(() => {
    try {
      const cached = localStorage.getItem('zyveron_featured_vods');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [featuredSeries, setFeaturedSeries] = useState<XtreamSeries[]>(() => {
    try {
      const cached = localStorage.getItem('zyveron_featured_series');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(liveCount === 0 && vodCount === 0);
  const [currentTime, setCurrentTime] = useState<string>('');
  const network = useNetworkQuality();

  // Foco do Controle Remoto / Teclado
  // grid: 0 (Live), 1 (Vod), 2 (Series), 3 (Sports)
  // vodCarousel: 10 + index (0..7)
  // seriesCarousel: 20 + index (0..7)
  // bottom: 30 (Sync), 31 (Settings)
  const [focusedId, setFocusedId] = useState<number>(0);

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

        // 2. Filmes
        client.getVodStreams().then((vods) => {
          if (isMounted && vods) {
            setVodCount(vods.length);
            localStorage.setItem('zyveron_vod_count', String(vods.length));
            const topVods = vods.slice(0, 10);
            setFeaturedVods(topVods);
            try {
              localStorage.setItem('zyveron_featured_vods', JSON.stringify(topVods));
            } catch {}
          }
        }).catch((err) => console.warn('[HomeView] Erro ao carregar filmes:', err));

        // 3. Séries
        client.getSeries().then((seriesList) => {
          if (isMounted && seriesList) {
            setSeriesCount(seriesList.length);
            localStorage.setItem('zyveron_series_count', String(seriesList.length));
            const topSeries = seriesList.slice(0, 10);
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
  }, [client]);

  // Controle Remoto: Navegação Espacial (D-Pad)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setFocusedId((prev) => {
            if (prev === 2) return 0; // Séries -> TV ao Vivo
            if (prev === 3) return 1; // Esportes -> Filmes
            if (prev >= 20 && prev <= 27) return prev - 10; // Séries Carousel -> VOD Carousel
            if (prev >= 10 && prev <= 17) return 1; // VOD Carousel -> Filmes Card
            if (prev === 30 || prev === 31) return 2; // Bottom -> Séries Card
            return prev;
          });
          break;

        case 'ArrowDown':
          e.preventDefault();
          setFocusedId((prev) => {
            if (prev === 0) return 2; // TV ao Vivo -> Séries
            if (prev === 1) return 3; // Filmes -> Esportes
            if (prev === 2 || prev === 3) return 30; // Séries/Esportes -> Sincronizar
            if (prev >= 10 && prev <= 17) return prev + 10; // VOD Carousel -> Séries Carousel
            if (prev >= 20 && prev <= 27) return 31; // Séries Carousel -> Ajustes
            return prev;
          });
          break;

        case 'ArrowLeft':
          e.preventDefault();
          setFocusedId((prev) => {
            if (prev === 1) return 0; // Filmes -> TV ao Vivo
            if (prev === 3) return 2; // Esportes -> Séries
            if (prev === 31) return 30; // Ajustes -> Sincronizar
            if (prev >= 10 && prev <= 17) {
              if (prev === 10) return 1; // Primeiro do VOD -> Filmes Card
              return prev - 1;
            }
            if (prev >= 20 && prev <= 27) {
              if (prev === 20) return 3; // Primeiro das Séries -> Esportes Card
              return prev - 1;
            }
            return prev;
          });
          break;

        case 'ArrowRight':
          e.preventDefault();
          setFocusedId((prev) => {
            if (prev === 0) return 1; // TV ao Vivo -> Filmes
            if (prev === 2) return 3; // Séries -> Esportes
            if (prev === 1) return 10; // Filmes -> Primeiro VOD Carousel
            if (prev === 3) return 20; // Esportes -> Primeiro Séries Carousel
            if (prev === 30) return 31; // Sincronizar -> Ajustes
            if (prev >= 10 && prev < 17 && prev - 10 < featuredVods.length - 1) return prev + 1;
            if (prev >= 20 && prev < 27 && prev - 20 < featuredSeries.length - 1) return prev + 1;
            return prev;
          });
          break;

        case 'Enter':
          e.preventDefault();
          triggerAction(focusedId);
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedId, featuredVods, featuredSeries]);

  const triggerAction = (id: number) => {
    if (id === 0) onNavigate('live');
    else if (id === 1) onNavigate('vod');
    else if (id === 2) onNavigate('series');
    else if (id === 3) onNavigate('live', { categoryId: 'sports' });
    else if (id === 30) onSyncContent();
    else if (id === 31) onNavigate('settings');
    else if (id >= 10 && id <= 17) {
      const idx = id - 10;
      if (featuredVods[idx]) {
        onNavigate('vod', { streamId: featuredVods[idx].stream_id });
      }
    } else if (id >= 20 && id <= 27) {
      const idx = id - 20;
      if (featuredSeries[idx]) {
        onNavigate('series', { streamId: featuredSeries[idx].series_id });
      }
    }
  };

  return (
    <div className="w-full h-full bg-[#0a0d14] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/40 via-[#0a0d14] to-[#07090e] text-white flex flex-col justify-between p-4 md:p-6 select-none overflow-hidden">
      
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
          {/* Badge do Servidor Ativo */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
            <span>📋</span>
            <span>{device?.serverName || 'Servidor Oficial'}</span>
          </div>

          {/* Indicador de Sinal de Internet em Tempo Real */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700/80 shadow-inner">
            <Wifi className={`w-4 h-4 ${network.iconColor}`} />
            <span className={`text-xs font-bold ${network.textColor}`}>{network.label}</span>
          </div>
        </div>
      </section>

      {/* 3. CORPO PRINCIPAL (Esquerda: Grid 2x2 | Direita: Carrosséis de Destaque) */}
      <main className="w-full flex-1 min-h-0 grid grid-cols-12 gap-4 items-stretch mb-3">
        
        {/* --- COLUNA ESQUERDA: GRID 2x2 DE CARDS PRINCIPAIS (7 Colunas) --- */}
        <div className="col-span-12 lg:col-span-7 grid grid-cols-2 gap-3.5 h-full">
          
          {/* 1. CANAIS AO VIVO */}
          <button
            type="button"
            onClick={() => onNavigate('live')}
            onMouseEnter={() => setFocusedId(0)}
            className={`group h-full rounded-2xl p-4 md:p-6 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer focus:outline-none relative overflow-hidden ${
              focusedId === 0
                ? 'scale-[1.03] border-2 border-sky-400 shadow-2xl shadow-sky-500/30 bg-gradient-to-br from-[#182a45] via-[#121c2e] to-[#0e1724] ring-2 ring-sky-400/50'
                : 'border border-[#222d42] bg-[#121722]/90 hover:border-slate-600'
            }`}
          >
            {/* Badge no canto superior direito */}
            <span className={`absolute top-3.5 right-3.5 text-[10px] md:text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
              focusedId === 0 ? 'bg-sky-400 text-black font-extrabold shadow-sm' : 'bg-slate-800/90 text-slate-400 border border-slate-700'
            }`}>
              Ao Vivo
            </span>

            {/* Ícone Centralizado em Destaque */}
            <div className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center mb-3 transition-all duration-300 ${
              focusedId === 0
                ? 'bg-sky-500/20 border-2 border-sky-400/60 shadow-lg shadow-sky-500/30 scale-110'
                : 'bg-sky-500/10 border border-sky-500/20 group-hover:scale-105'
            }`}>
              <Tv className="w-8 h-8 md:w-10 md:h-10 text-sky-400" />
            </div>

            {/* Título e Contagem Centralizados */}
            <h3 className="text-xl md:text-2xl font-black text-white tracking-wide group-hover:text-sky-300 transition-colors leading-tight">
              Canais ao Vivo
            </h3>
            <p className="text-xs md:text-sm text-slate-400 font-medium mt-1">
              {liveCount > 0 ? `${liveCount.toLocaleString('pt-BR')} canais` : (isLoading ? 'Sincronizando...' : 'Grade completa')}
            </p>
          </button>

          {/* 2. FILMES */}
          <button
            type="button"
            onClick={() => onNavigate('vod')}
            onMouseEnter={() => setFocusedId(1)}
            className={`group h-full rounded-2xl p-4 md:p-6 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer focus:outline-none relative overflow-hidden ${
              focusedId === 1
                ? 'scale-[1.03] border-2 border-sky-400 shadow-2xl shadow-sky-500/30 bg-gradient-to-br from-[#182a45] via-[#121c2e] to-[#0e1724] ring-2 ring-sky-400/50'
                : 'border border-[#222d42] bg-[#121722]/90 hover:border-slate-600'
            }`}
          >
            {/* Badge no canto superior direito */}
            <span className={`absolute top-3.5 right-3.5 text-[10px] md:text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
              focusedId === 1 ? 'bg-sky-400 text-black font-extrabold shadow-sm' : 'bg-slate-800/90 text-slate-400 border border-slate-700'
            }`}>
              VOD
            </span>

            {/* Ícone Centralizado em Destaque */}
            <div className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center mb-3 transition-all duration-300 ${
              focusedId === 1
                ? 'bg-sky-500/20 border-2 border-sky-400/60 shadow-lg shadow-sky-500/30 scale-110'
                : 'bg-sky-500/10 border border-sky-500/20 group-hover:scale-105'
            }`}>
              <Film className="w-8 h-8 md:w-10 md:h-10 text-sky-400" />
            </div>

            {/* Título e Contagem Centralizados */}
            <h3 className="text-xl md:text-2xl font-black text-white tracking-wide group-hover:text-sky-300 transition-colors leading-tight">
              Filmes
            </h3>
            <p className="text-xs md:text-sm text-slate-400 font-medium mt-1">
              {vodCount > 0 ? `${vodCount.toLocaleString('pt-BR')} filmes • Cinema` : 'On Demand'}
            </p>
          </button>

          {/* 3. SÉRIES */}
          <button
            type="button"
            onClick={() => onNavigate('series')}
            onMouseEnter={() => setFocusedId(2)}
            className={`group h-full rounded-2xl p-4 md:p-6 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer focus:outline-none relative overflow-hidden ${
              focusedId === 2
                ? 'scale-[1.03] border-2 border-sky-400 shadow-2xl shadow-sky-500/30 bg-gradient-to-br from-[#182a45] via-[#121c2e] to-[#0e1724] ring-2 ring-sky-400/50'
                : 'border border-[#222d42] bg-[#121722]/90 hover:border-slate-600'
            }`}
          >
            {/* Badge no canto superior direito */}
            <span className={`absolute top-3.5 right-3.5 text-[10px] md:text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
              focusedId === 2 ? 'bg-sky-400 text-black font-extrabold shadow-sm' : 'bg-slate-800/90 text-slate-400 border border-slate-700'
            }`}>
              Séries
            </span>

            {/* Ícone Centralizado em Destaque */}
            <div className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center mb-3 transition-all duration-300 ${
              focusedId === 2
                ? 'bg-sky-500/20 border-2 border-sky-400/60 shadow-lg shadow-sky-500/30 scale-110'
                : 'bg-sky-500/10 border border-sky-500/20 group-hover:scale-105'
            }`}>
              <Clapperboard className="w-8 h-8 md:w-10 md:h-10 text-sky-400" />
            </div>

            {/* Título e Contagem Centralizados */}
            <h3 className="text-xl md:text-2xl font-black text-white tracking-wide group-hover:text-sky-300 transition-colors leading-tight">
              Séries
            </h3>
            <p className="text-xs md:text-sm text-slate-400 font-medium mt-1">
              {seriesCount > 0 ? `${seriesCount.toLocaleString('pt-BR')} séries • Temporadas` : 'Episódios'}
            </p>
          </button>

          {/* 4. ESPORTES */}
          <button
            type="button"
            onClick={() => onNavigate('live', { categoryId: 'sports' })}
            onMouseEnter={() => setFocusedId(3)}
            className={`group h-full rounded-2xl p-4 md:p-6 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer focus:outline-none relative overflow-hidden ${
              focusedId === 3
                ? 'scale-[1.03] border-2 border-emerald-400 shadow-2xl shadow-emerald-500/30 bg-gradient-to-br from-[#11271f] via-[#0f211a] to-[#0c1813] ring-2 ring-emerald-400/50'
                : 'border border-[#222d42] bg-[#121722]/90 hover:border-slate-600'
            }`}
          >
            {/* Badge no canto superior direito */}
            <span className={`absolute top-3.5 right-3.5 text-[10px] md:text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
              focusedId === 3 ? 'bg-emerald-400 text-black font-extrabold shadow-sm' : 'bg-slate-800/90 text-slate-400 border border-slate-700'
            }`}>
              Ao Vivo
            </span>

            {/* Ícone Centralizado em Destaque */}
            <div className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center mb-3 transition-all duration-300 ${
              focusedId === 3
                ? 'bg-emerald-500/20 border-2 border-emerald-400/60 shadow-lg shadow-emerald-500/30 scale-110'
                : 'bg-emerald-500/10 border border-emerald-500/20 group-hover:scale-105'
            }`}>
              <Trophy className="w-8 h-8 md:w-10 md:h-10 text-emerald-400" />
            </div>

            {/* Título e Contagem Centralizados */}
            <h3 className="text-xl md:text-2xl font-black text-white tracking-wide group-hover:text-emerald-300 transition-colors leading-tight">
              Esportes
            </h3>
            <p className="text-xs md:text-sm text-emerald-400 font-medium mt-1">
              Futebol • Lutas • Ao Vivo
            </p>
          </button>

        </div>

        {/* --- COLUNA DIREITA: CARROSSÉIS DE DESTAQUES (5 Colunas) --- */}
        <div className="col-span-12 lg:col-span-5 flex flex-col justify-between gap-3 h-full overflow-hidden">
          
          {/* Seção 1: Filmes em Destaque */}
          <div className="flex-1 flex flex-col justify-between bg-[#121722]/60 border border-[#222d42]/80 rounded-2xl p-3 overflow-hidden">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-sky-400 tracking-wider">
                  🎬 FILMES EM DESTAQUE
                </span>
                <span className="text-[10px] text-slate-400 hidden sm:inline">
                  • Lançamentos e Cinema
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('vod')}
                className="text-[11px] text-sky-400 hover:text-white flex items-center gap-0.5"
              >
                Ver todos <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="flex-1 flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1">
              {featuredVods.length > 0 ? (
                featuredVods.slice(0, 8).map((vod, idx) => {
                  const targetId = 10 + idx;
                  const isItemFocused = focusedId === targetId;
                  return (
                    <button
                      key={vod.stream_id}
                      type="button"
                      onClick={() => onNavigate('vod', { streamId: vod.stream_id })}
                      onMouseEnter={() => setFocusedId(targetId)}
                      className={`shrink-0 w-20 md:w-24 h-28 md:h-32 rounded-xl overflow-hidden relative transition-all duration-200 cursor-pointer focus:outline-none ${
                        isItemFocused
                          ? 'scale-105 border-2 border-white shadow-xl shadow-sky-500/40 ring-2 ring-sky-400'
                          : 'border border-slate-700/60 opacity-80 hover:opacity-100'
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
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center text-xl">
                          🎬
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-1.5 text-left">
                        <p className="text-[10px] font-bold text-white truncate">{vod.name}</p>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="w-full h-24 flex items-center justify-center text-slate-500 text-xs">
                  Carregando lançamentos...
                </div>
              )}
            </div>
          </div>

          {/* Seção 2: Séries em Destaque */}
          <div className="flex-1 flex flex-col justify-between bg-[#121722]/60 border border-[#222d42]/80 rounded-2xl p-3 overflow-hidden">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-sky-400 tracking-wider">
                  📺 SÉRIES EM DESTAQUE
                </span>
                <span className="text-[10px] text-slate-400 hidden sm:inline">
                  • Temporadas e Séries
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('series')}
                className="text-[11px] text-sky-400 hover:text-white flex items-center gap-0.5"
              >
                Ver todas <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="flex-1 flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1">
              {featuredSeries.length > 0 ? (
                featuredSeries.slice(0, 8).map((series, idx) => {
                  const targetId = 20 + idx;
                  const isItemFocused = focusedId === targetId;
                  return (
                    <button
                      key={series.series_id}
                      type="button"
                      onClick={() => onNavigate('series', { streamId: series.series_id })}
                      onMouseEnter={() => setFocusedId(targetId)}
                      className={`shrink-0 w-20 md:w-24 h-28 md:h-32 rounded-xl overflow-hidden relative transition-all duration-200 cursor-pointer focus:outline-none ${
                        isItemFocused
                          ? 'scale-105 border-2 border-white shadow-xl shadow-sky-500/40 ring-2 ring-sky-400'
                          : 'border border-slate-700/60 opacity-80 hover:opacity-100'
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
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center text-xl">
                          📺
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-1.5 text-left">
                        <p className="text-[10px] font-bold text-white truncate">{series.name}</p>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="w-full h-24 flex items-center justify-center text-slate-500 text-xs">
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
          {/* Botão Sincronizar */}
          <button
            type="button"
            onClick={onSyncContent}
            onMouseEnter={() => setFocusedId(30)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer focus:outline-none ${
              focusedId === 30 ? 'bg-sky-500 text-black font-bold ring-2 ring-white' : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sincronizar Catálogo</span>
          </button>

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
        </div>

        <div className="text-[11px] text-slate-500">
          MAC: <span className="font-mono text-slate-400 font-bold">{device?.mac || '--:--:--:--:--:--'}</span> • Zyveron Engine v2.0
        </div>
      </footer>

    </div>
  );
};

