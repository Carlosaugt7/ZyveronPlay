import React, { useState, useEffect, useRef, useMemo } from 'react';
import { XtreamClient } from '../lib/xtream';
import { XtreamCategory, XtreamSeries, XtreamSeason, XtreamEpisode } from '../types';
import { Player } from '../components/Player';
import { useSpatialNav } from '../hooks/useSpatialNav';
import { Clapperboard, Play, Star, Loader2, X, ArrowLeft, Calendar, Info, Heart } from 'lucide-react';
import { getFavorites, toggleFavorite } from '../lib/storage';

interface SeriesViewProps {
  client: XtreamClient;
  isFocusedContent?: boolean;
  onRequestFocusSidebar?: () => void;
  onFullScreenChange?: (full: boolean) => void;
  onBackToHome?: () => void;
  initialStreamId?: number;
}

const BATCH_SIZE = 30; // Proteção de memória para Smart TVs

export const SeriesView: React.FC<SeriesViewProps> = ({
  client,
  isFocusedContent = true,
  onRequestFocusSidebar,
  onFullScreenChange,
  onBackToHome,
  initialStreamId
}) => {
  const [categories, setCategories] = useState<XtreamCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('favorites');
  const [selectedCategoryIdx, setSelectedCategoryIdx] = useState<number>(0);
  const [allSeries, setAllSeries] = useState<XtreamSeries[]>([]);
  const [displayedCount, setDisplayedCount] = useState<number>(BATCH_SIZE);
  const [selectedSeriesIdx, setSelectedSeriesIdx] = useState<number>(0);
  const [isLoadingCats, setIsLoadingCats] = useState<boolean>(true);
  const [isLoadingSeries, setIsLoadingSeries] = useState<boolean>(false);
  const [favorites, setFavorites] = useState<number[]>(() => getFavorites('series'));

  // Detalhes da Série
  const [selectedSeries, setSelectedSeries] = useState<XtreamSeries | null>(null);
  const [seriesDetails, setSeriesDetails] = useState<{
    seasons: XtreamSeason[];
    episodes: Record<string, XtreamEpisode[]>;
    info?: any;
  } | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [selectedSeason, setSelectedSeason] = useState<string>('1');
  const [selectedSeasonIdx, setSelectedSeasonIdx] = useState<number>(0);
  const [selectedEpisodeIdx, setSelectedEpisodeIdx] = useState<number>(0);

  // Player de Episódio
  const [playingEpisode, setPlayingEpisode] = useState<{
    id: string;
    title: string;
    ext: string;
  } | null>(null);

  // Foco espacial: 'categories' | 'grid' | 'seasons' | 'episodes'
  const [activeFocusColumn, setActiveFocusColumn] = useState<'categories' | 'grid' | 'seasons' | 'episodes'>('categories');

  const activeCategoryBtnRef = useRef<HTMLButtonElement>(null);
  const activeSeriesBtnRef = useRef<HTMLButtonElement>(null);
  const activeSeasonBtnRef = useRef<HTMLButtonElement>(null);
  const activeEpBtnRef = useRef<HTMLButtonElement>(null);

  const displayedSeries = useMemo(() => {
    return allSeries.slice(0, displayedCount);
  }, [allSeries, displayedCount]);

  const seasonKeys = useMemo(() => {
    return Object.keys(seriesDetails?.episodes || {});
  }, [seriesDetails]);

  // Carrega categorias ao iniciar
  useEffect(() => {
    setIsLoadingCats(true);
    setFavorites(getFavorites('series'));
    client.getSeriesCategories()
      .then((cats) => {
        if (cats && cats.length > 0) {
          setCategories(cats);
          const currentFavs = getFavorites('series');
          if (currentFavs.length > 0) {
            setSelectedCategory('favorites');
            setSelectedCategoryIdx(0);
          } else {
            setSelectedCategory(cats[0].category_id);
            setSelectedCategoryIdx(1);
          }
        } else {
          setCategories([]);
        }
      })
      .catch((err) => {
        console.error("[Series] Erro ao carregar categorias de séries:", err);
        setCategories([]);
      })
      .finally(() => setIsLoadingCats(false));
  }, [client]);

  // Carrega séries da categoria selecionada ou filtra por favoritos
  useEffect(() => {
    if (!selectedCategory) return;
    
    setIsLoadingSeries(true);
    setDisplayedCount(BATCH_SIZE);
    setSelectedSeriesIdx(0);

    if (selectedCategory === 'favorites') {
      client.getSeries()
        .then((data) => {
          const all = data || [];
          const favs = all.filter((s) => favorites.includes(s.series_id));
          setAllSeries(favs);
        })
        .catch((err) => {
          console.error("[Series] Erro ao carregar séries favoritas:", err);
          setAllSeries([]);
        })
        .finally(() => setIsLoadingSeries(false));
    } else {
      client.getSeries(selectedCategory)
        .then((data) => {
          setAllSeries(data || []);
        })
        .catch((err) => {
          console.error("[Series] Erro ao carregar séries da categoria:", err);
          setAllSeries([]);
        })
        .finally(() => setIsLoadingSeries(false));
    }
  }, [client, selectedCategory, favorites.length]);

  // Se receber initialStreamId (vindo da Home), abre direto a série
  useEffect(() => {
    if (!initialStreamId) return;

    client.getSeriesInfo(initialStreamId)
      .then((details) => {
        if (details) {
          const fakeSeries: XtreamSeries = {
            num: 0,
            name: details.info?.name || 'Série em Destaque',
            series_id: initialStreamId,
            cover: details.info?.cover || '',
            plot: details.info?.plot || '',
            cast: details.info?.cast || '',
            director: details.info?.director || '',
            genre: details.info?.genre || '',
            releaseDate: details.info?.releaseDate || '',
            last_modified: '',
            rating: details.info?.rating || '',
            rating_5based: details.info?.rating_5based || 0,
            backdrop_path: details.info?.backdrop_path || [],
            category_id: ''
          };
          setSelectedSeries(fakeSeries);
          setSeriesDetails(details);
          const firstSeason = Object.keys(details.episodes || {})[0] || '1';
          setSelectedSeason(firstSeason);
          setSelectedSeasonIdx(0);
          setActiveFocusColumn('episodes');
          setSelectedEpisodeIdx(0);
        }
      })
      .catch((err) => console.warn('[Series] Erro ao carregar série inicial:', err));
  }, [initialStreamId, client]);

  // Força foco real no DOM
  useEffect(() => {
    if (!playingEpisode && isFocusedContent) {
      if (activeFocusColumn === 'categories' && activeCategoryBtnRef.current) {
        activeCategoryBtnRef.current.focus();
        activeCategoryBtnRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else if (activeFocusColumn === 'grid' && activeSeriesBtnRef.current) {
        activeSeriesBtnRef.current.focus();
        activeSeriesBtnRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else if (activeFocusColumn === 'seasons' && activeSeasonBtnRef.current) {
        activeSeasonBtnRef.current.focus();
        activeSeasonBtnRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else if (activeFocusColumn === 'episodes' && activeEpBtnRef.current) {
        activeEpBtnRef.current.focus();
        activeEpBtnRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedCategoryIdx, selectedSeriesIdx, selectedSeasonIdx, selectedEpisodeIdx, activeFocusColumn, isFocusedContent, playingEpisode, displayedSeries.length]);

  // Tecla 'F' para favoritar no controle remoto
  useEffect(() => {
    const handleFavKey = (e: KeyboardEvent) => {
      if (playingEpisode) return;
      if (e.key === 'f' || e.key === 'F' || e.key === 'Yellow' || e.key === 'y' || e.key === 'Y') {
        const target = selectedSeries || displayedSeries[selectedSeriesIdx];
        if (target) {
          handleToggleFav(target.series_id);
        }
      }
    };
    window.addEventListener('keydown', handleFavKey);
    return () => window.removeEventListener('keydown', handleFavKey);
  }, [selectedSeries, displayedSeries, selectedSeriesIdx, playingEpisode]);

  const handleToggleFav = (seriesId: number) => {
    toggleFavorite(seriesId, 'series');
    setFavorites(getFavorites('series'));
  };

  const handleOpenSeries = async (series: XtreamSeries) => {
    setSelectedSeries(series);
    setIsLoadingDetails(true);
    setSeriesDetails(null);
    setActiveFocusColumn('episodes');
    setSelectedEpisodeIdx(0);
    setSelectedSeasonIdx(0);

    try {
      const details = await client.getSeriesInfo(series.series_id);
      setSeriesDetails(details);
      const firstSeasonKey = Object.keys(details.episodes || {})[0] || '1';
      setSelectedSeason(firstSeasonKey);
    } catch (err) {
      console.error("[Series] Erro ao carregar temporadas da série:", err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const closeSeriesDetails = () => {
    setSelectedSeries(null);
    setSeriesDetails(null);
    setActiveFocusColumn('grid');
  };

  const startPlayingEpisode = (epData: { id: string; title: string; ext: string }) => {
    setPlayingEpisode(epData);
    onFullScreenChange?.(true);
  };

  const stopPlayingEpisode = () => {
    setPlayingEpisode(null);
    onFullScreenChange?.(false);
  };

  // Navegação D-Pad para Smart TV
  useSpatialNav({
    onUp: () => {
      if (playingEpisode) return;
      if (activeFocusColumn === 'categories') {
        setSelectedCategoryIdx((prev) => Math.max(0, prev - 1));
      } else if (activeFocusColumn === 'grid') {
        setSelectedSeriesIdx((prev) => Math.max(0, prev - 5));
      } else if (activeFocusColumn === 'seasons') {
        setSelectedSeasonIdx((prev) => {
          const next = Math.max(0, prev - 1);
          if (seasonKeys[next]) setSelectedSeason(seasonKeys[next]);
          return next;
        });
      } else if (activeFocusColumn === 'episodes') {
        setSelectedEpisodeIdx((prev) => Math.max(0, prev - 1));
      }
    },
    onDown: () => {
      if (playingEpisode) return;
      if (activeFocusColumn === 'categories') {
        // total = 1 (Favoritos) + categories.length
        setSelectedCategoryIdx((prev) => Math.min(categories.length, prev + 1));
      } else if (activeFocusColumn === 'grid') {
        setSelectedSeriesIdx((prev) => {
          const nextIdx = Math.min(allSeries.length - 1, prev + 5);
          if (nextIdx >= displayedCount - 5 && displayedCount < allSeries.length) {
            setDisplayedCount((c) => Math.min(allSeries.length, c + BATCH_SIZE));
          }
          return nextIdx;
        });
      } else if (activeFocusColumn === 'seasons') {
        setSelectedSeasonIdx((prev) => {
          const next = Math.min(seasonKeys.length - 1, prev + 1);
          if (seasonKeys[next]) setSelectedSeason(seasonKeys[next]);
          return next;
        });
      } else if (activeFocusColumn === 'episodes') {
        const totalEps = (seriesDetails?.episodes?.[selectedSeason] || []).length;
        setSelectedEpisodeIdx((prev) => Math.min(totalEps - 1, prev + 1));
      }
    },
    onLeft: () => {
      if (playingEpisode) return;
      if (activeFocusColumn === 'grid') {
        if (selectedSeriesIdx % 5 === 0 || displayedSeries.length === 0) {
          setActiveFocusColumn('categories');
        } else {
          setSelectedSeriesIdx((prev) => Math.max(0, prev - 1));
        }
      } else if (activeFocusColumn === 'episodes') {
        setActiveFocusColumn('seasons');
      }
    },
    onRight: () => {
      if (playingEpisode) return;
      if (activeFocusColumn === 'categories') {
        if (displayedSeries.length > 0) {
          setActiveFocusColumn('grid');
          setSelectedSeriesIdx(0);
        }
      } else if (activeFocusColumn === 'grid') {
        setSelectedSeriesIdx((prev) => {
          const nextIdx = Math.min(allSeries.length - 1, prev + 1);
          if (nextIdx >= displayedCount - 2 && displayedCount < allSeries.length) {
            setDisplayedCount((c) => Math.min(allSeries.length, c + BATCH_SIZE));
          }
          return nextIdx;
        });
      } else if (activeFocusColumn === 'seasons') {
        setActiveFocusColumn('episodes');
      }
    },
    onSelect: () => {
      if (playingEpisode) return;
      if (activeFocusColumn === 'categories') {
        if (selectedCategoryIdx === 0) {
          setSelectedCategory('favorites');
        } else if (categories[selectedCategoryIdx - 1]) {
          setSelectedCategory(categories[selectedCategoryIdx - 1].category_id);
        }
        setActiveFocusColumn('grid');
      } else if (activeFocusColumn === 'grid' && displayedSeries[selectedSeriesIdx]) {
        handleOpenSeries(displayedSeries[selectedSeriesIdx]);
      } else if (activeFocusColumn === 'seasons') {
        setActiveFocusColumn('episodes');
      } else if (activeFocusColumn === 'episodes') {
        const eps = seriesDetails?.episodes?.[selectedSeason] || [];
        const ep = eps[selectedEpisodeIdx];
        if (ep) {
          startPlayingEpisode({
            id: ep.id,
            title: `T${selectedSeason}:E${ep.episode_num} - ${ep.title}`,
            ext: ep.container_extension || 'mp4'
          });
        }
      }
    },
    onBack: () => {
      if (playingEpisode) {
        stopPlayingEpisode();
        return;
      }
      if (activeFocusColumn === 'episodes' || activeFocusColumn === 'seasons') {
        closeSeriesDetails();
      } else if (activeFocusColumn === 'grid') {
        setActiveFocusColumn('categories');
      } else if (activeFocusColumn === 'categories') {
        if (onBackToHome) {
          onBackToHome();
        }
      }
    },
    disabled: !isFocusedContent
  }, [
    playingEpisode,
    activeFocusColumn,
    selectedCategoryIdx,
    selectedSeriesIdx,
    selectedSeasonIdx,
    selectedEpisodeIdx,
    displayedSeries,
    allSeries.length,
    displayedCount,
    categories,
    seriesDetails,
    seasonKeys,
    selectedSeason,
    isFocusedContent
  ]);

  // Player de Episódio (VOD com Seekbar)
  if (playingEpisode) {
    return (
      <div className="fixed inset-0 z-[9999] w-screen h-screen bg-black">
        <Player
          streamUrl={client.buildEpisodeUrl(playingEpisode.id, playingEpisode.ext)}
          title={playingEpisode.title}
          subtitle={selectedSeries?.name}
          isLive={false}
          onBack={stopPlayingEpisode}
          isFullScreen={true}
        />
      </div>
    );
  }

  const isCurrentSeriesFav = selectedSeries ? favorites.includes(selectedSeries.series_id) : false;

  return (
    <div className="w-full h-full flex bg-[#0a0d14] overflow-hidden select-none relative">
      {/* Coluna de Categorias */}
      <div className={`w-72 h-full bg-[#121722]/80 border-r border-[#2a3449] p-4 flex flex-col transition-all duration-200 shrink-0 ${
        isFocusedContent && activeFocusColumn === 'categories' ? 'ring-2 ring-emerald-500/60 bg-[#161d2b]' : ''
      }`}>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <span>Gêneros Séries</span>
            <span className="text-sky-400 font-mono">({categories.length + 1})</span>
          </h2>
          {onBackToHome && (
            <button
              type="button"
              onClick={onBackToHome}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-sky-600 text-[11px] font-semibold text-slate-300 hover:text-white transition cursor-pointer"
              title="Voltar para a Home"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Início</span>
            </button>
          )}
        </div>

        {isLoadingCats ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-400 mb-2" />
            <span className="text-xs">Carregando gêneros...</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
            {/* Categoria 1: Meus Favoritos */}
            <button
              ref={selectedCategoryIdx === 0 ? activeCategoryBtnRef : null}
              tabIndex={0}
              onClick={() => {
                setSelectedCategory('favorites');
                setSelectedCategoryIdx(0);
                setActiveFocusColumn('grid');
              }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer flex items-center justify-between ${
                selectedCategory === 'favorites'
                  ? 'bg-amber-400 text-black shadow font-bold'
                  : 'text-amber-300/90 hover:bg-[#1b2234] hover:text-amber-300'
              } ${
                isFocusedContent && activeFocusColumn === 'categories' && selectedCategoryIdx === 0
                  ? 'ring-4 ring-amber-300 shadow-xl scale-102 font-extrabold outline-none bg-amber-400 text-black'
                  : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 fill-current text-amber-400" />
                <span>Meus Favoritos</span>
              </div>
              <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-black/30 font-bold">
                {favorites.length}
              </span>
            </button>

            {/* Categorias da API Xtream */}
            {categories.map((cat, catIdx) => {
              const thisIdx = catIdx + 1;
              const isCatFocused = isFocusedContent && activeFocusColumn === 'categories' && selectedCategoryIdx === thisIdx;
              const isSelected = selectedCategory === cat.category_id;

              return (
                <button
                  type="button"
                  key={cat.category_id}
                  ref={isCatFocused ? activeCategoryBtnRef : null}
                  tabIndex={0}
                  onClick={() => {
                    setSelectedCategory(cat.category_id);
                    setSelectedCategoryIdx(thisIdx);
                    setActiveFocusColumn('grid');
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition truncate cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500 text-black font-bold shadow'
                      : 'text-slate-300 hover:bg-[#1b2234] hover:text-white'
                  } ${
                    isCatFocused
                      ? 'ring-4 ring-emerald-300 shadow-xl scale-102 font-extrabold outline-none bg-emerald-400 text-black'
                      : ''
                  }`}
                >
                  {cat.category_name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Grade de Séries */}
      <div 
        className={`flex-1 h-full p-6 overflow-y-auto custom-scrollbar transition-all ${
          isFocusedContent && activeFocusColumn === 'grid' ? 'ring-2 ring-emerald-500/30' : ''
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Clapperboard className="w-6 h-6 text-emerald-400" />
            <span>Catálogo de Séries</span>
            {allSeries.length > 0 && (
              <span className="text-sm font-normal text-slate-400 ml-1">
                ({displayedSeries.length} de {allSeries.length})
              </span>
            )}
          </h2>
          <div className="text-xs text-slate-400 flex items-center gap-3">
            <span className="font-mono bg-[#1a2233] px-2.5 py-1 rounded-md text-emerald-400">
              [OK] Abrir Série
            </span>
            <span className="font-mono bg-[#1a2233] px-2.5 py-1 rounded-md text-slate-300">
              [◀] Voltar para Gêneros
            </span>
          </div>
        </div>

        {isLoadingSeries ? (
          <div className="w-full h-80 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-12 h-12 animate-spin text-emerald-400 mb-3" />
            <span className="text-sm">Carregando catálogo de séries...</span>
          </div>
        ) : allSeries.length === 0 ? (
          <div className="w-full h-80 flex flex-col items-center justify-center text-slate-500 p-6 text-center">
            {selectedCategory === 'favorites' ? (
              <>
                <Star className="w-16 h-16 mb-3 text-amber-500/40" />
                <p className="text-base font-semibold text-slate-300">Nenhuma série favoritada ainda.</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">Abra qualquer série e clique no botão [Favoritar] ou aperte a tecla 'F' no controle.</p>
              </>
            ) : (
              <>
                <Clapperboard className="w-16 h-16 mb-3 text-slate-600" />
                <p className="text-base font-semibold text-slate-400">Nenhuma série disponível nesta categoria.</p>
                <p className="text-xs text-slate-500 mt-1">Selecione outro gênero no menu à esquerda.</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {displayedSeries.map((series, seriesIdx) => {
              const isSeriesFocused = isFocusedContent && activeFocusColumn === 'grid' && selectedSeriesIdx === seriesIdx;
              const isFav = favorites.includes(series.series_id);

              return (
                <button
                  type="button"
                  tabIndex={0}
                  key={`${series.series_id}-${seriesIdx}`}
                  ref={isSeriesFocused ? activeSeriesBtnRef : null}
                  onClick={() => {
                    setSelectedSeriesIdx(seriesIdx);
                    handleOpenSeries(series);
                  }}
                  className={`group relative bg-[#121722] border rounded-xl overflow-hidden cursor-pointer transition-all duration-150 shadow-lg text-left ${
                    isSeriesFocused
                      ? 'border-emerald-400 ring-4 ring-emerald-400/80 scale-104 shadow-2xl z-10 bg-[#161d2b]'
                      : 'border-[#2a3449] hover:border-emerald-500/50'
                  }`}
                >
                  <div className="aspect-[2/3] w-full bg-slate-900 overflow-hidden relative">
                    {series.cover ? (
                      <img
                        src={series.cover}
                        alt={series.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:opacity-80 transition"
                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <Clapperboard className="w-12 h-12" />
                      </div>
                    )}

                    {isFav && (
                      <div className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-amber-400 z-10">
                        <Star className="w-3.5 h-3.5 fill-current" />
                      </div>
                    )}

                    <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition ${
                      isSeriesFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}>
                      <div className="w-12 h-12 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-lg">
                        <Info className="w-6 h-6 ml-0.5" />
                      </div>
                    </div>
                  </div>

                  <div className={`p-3 ${isSeriesFocused ? 'bg-emerald-500/20' : ''}`}>
                    <h3 className="text-sm font-semibold text-white truncate">{series.name}</h3>
                    {series.rating && (
                      <div className="flex items-center gap-1 text-xs text-amber-400 mt-1">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>{series.rating}</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DE DETALHES DA SÉRIE (CAPA, SINOPSE, TEMPORADAS E EPISÓDIOS) */}
      {selectedSeries && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-6 md:p-10 animate-in fade-in duration-200">
          <div className="w-full max-w-5xl max-h-[90vh] bg-[#121722] border border-[#2a3449] rounded-3xl flex flex-col overflow-hidden shadow-2xl">
            
            {/* Header da Série: Capa + Sinopse + Botão Favoritar + Botão Fechar */}
            <div className="p-6 border-b border-[#2a3449] flex items-start gap-6 bg-gradient-to-r from-[#161f30] to-[#121722]">
              {selectedSeries.cover && (
                <div className="w-20 md:w-24 aspect-[2/3] rounded-xl overflow-hidden shrink-0 border border-slate-700 shadow-lg">
                  <img src={seriesDetails?.info?.cover || selectedSeries.cover} alt={selectedSeries.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl md:text-3xl font-black text-white">{selectedSeries.name}</h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      tabIndex={0}
                      onClick={() => handleToggleFav(selectedSeries.series_id)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition cursor-pointer ${
                        isCurrentSeriesFav
                          ? 'bg-amber-400/20 text-amber-300 border-amber-400/50 hover:bg-amber-400/30'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${isCurrentSeriesFav ? 'fill-amber-400 text-amber-400' : ''}`} />
                      <span>{isCurrentSeriesFav ? 'Favoritada' : 'Favoritar'}</span>
                    </button>
                    <button
                      type="button"
                      tabIndex={0}
                      onClick={closeSeriesDetails}
                      className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-300">
                  {selectedSeries.rating && (
                    <div className="flex items-center gap-1 text-amber-400 font-bold">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{selectedSeries.rating}</span>
                    </div>
                  )}
                  {selectedSeries.genre && (
                    <span className="text-sky-300 bg-sky-950/60 px-2 py-0.5 rounded font-medium">
                      {selectedSeries.genre}
                    </span>
                  )}
                  {seasonKeys.length > 0 && (
                    <span className="text-slate-400">
                      {seasonKeys.length} Temporada(s)
                    </span>
                  )}
                </div>

                <p className="text-xs md:text-sm text-slate-300 mt-2 line-clamp-3 leading-relaxed">
                  {seriesDetails?.info?.plot || selectedSeries.plot || 'Sinopse não disponível para esta série.'}
                </p>
              </div>
            </div>

            {/* Conteúdo: Abas de Temporadas e Lista de Episódios */}
            <div className="flex-1 flex overflow-hidden">
              {isLoadingDetails ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-16">
                  <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mb-3" />
                  <span className="text-sm">Carregando episódios e temporadas...</span>
                </div>
              ) : (
                <>
                  {/* Coluna de Temporadas */}
                  <div className={`w-56 bg-[#161d2b]/80 border-r border-[#2a3449] p-3 overflow-y-auto space-y-1.5 transition ${
                    isFocusedContent && activeFocusColumn === 'seasons' ? 'ring-2 ring-emerald-500/50' : ''
                  }`}>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-2">
                      Temporadas
                    </h4>
                    {seasonKeys.map((seasonKey, sIdx) => {
                      const isSeasonFocused = isFocusedContent && activeFocusColumn === 'seasons' && selectedSeasonIdx === sIdx;
                      const isSeasonSelected = selectedSeason === seasonKey;

                      return (
                        <button
                          key={seasonKey}
                          type="button"
                          tabIndex={0}
                          ref={isSeasonFocused ? activeSeasonBtnRef : null}
                          onClick={() => {
                            setSelectedSeason(seasonKey);
                            setSelectedSeasonIdx(sIdx);
                            setActiveFocusColumn('episodes');
                            setSelectedEpisodeIdx(0);
                          }}
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer ${
                            isSeasonFocused
                              ? 'bg-emerald-400 text-black shadow-xl ring-2 ring-emerald-300 scale-102 font-black'
                              : isSeasonSelected
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'text-slate-300 hover:bg-[#1b2234]'
                          }`}
                        >
                          Temporada {seasonKey}
                        </button>
                      );
                    })}
                  </div>

                  {/* Lista de Episódios com Botão Play e Foco */}
                  <div className={`flex-1 p-5 overflow-y-auto space-y-2.5 custom-scrollbar transition ${
                    isFocusedContent && activeFocusColumn === 'episodes' ? 'ring-2 ring-emerald-500/50' : ''
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Episódios da Temporada {selectedSeason} ({ (seriesDetails?.episodes?.[selectedSeason] || []).length })
                      </h4>
                      <span className="text-xs text-slate-400 font-mono">
                        [◀] Temporadas • [OK] Assistir
                      </span>
                    </div>

                    {(seriesDetails?.episodes?.[selectedSeason] || []).map((ep, epIdx) => {
                      const isEpFocused = isFocusedContent && activeFocusColumn === 'episodes' && selectedEpisodeIdx === epIdx;
                      return (
                        <button
                          key={ep.id}
                          type="button"
                          tabIndex={0}
                          ref={isEpFocused ? activeEpBtnRef : null}
                          onClick={() => {
                            setSelectedEpisodeIdx(epIdx);
                            startPlayingEpisode({
                              id: ep.id,
                              title: `T${selectedSeason}:E${ep.episode_num} - ${ep.title}`,
                              ext: ep.container_extension || 'mp4'
                            });
                          }}
                          className={`w-full flex items-center justify-between p-4 rounded-2xl cursor-pointer transition select-none text-left ${
                            isEpFocused
                              ? 'bg-emerald-400 text-black font-extrabold shadow-2xl scale-[1.02] ring-4 ring-emerald-300'
                              : 'bg-[#1b2234]/70 hover:bg-[#1b2234] border border-[#2a3449] text-white'
                          }`}
                        >
                          <div className="flex items-center gap-3.5">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
                              isEpFocused ? 'bg-black text-emerald-400' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            }`}>
                              E{ep.episode_num}
                            </div>
                            <div>
                              <span className="font-bold text-sm block truncate max-w-lg">{ep.title}</span>
                              {ep.info?.duration && (
                                <span className={`text-[11px] ${isEpFocused ? 'text-black/80 font-medium' : 'text-slate-400'}`}>
                                  Duração: {ep.info.duration}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                            isEpFocused ? 'bg-black text-emerald-400' : 'bg-emerald-500 text-black'
                          }`}>
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
