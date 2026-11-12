import React, { useState, useEffect, useRef, useMemo } from 'react';
import { XtreamClient } from '../lib/xtream';
import { XtreamCategory, XtreamSeries, XtreamSeason, XtreamEpisode } from '../types';
import { Player } from '../components/Player';
import { useSpatialNav } from '../hooks/useSpatialNav';
import { Clapperboard, Play, Star, Loader2, X, ArrowLeft } from 'lucide-react';

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
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedCategoryIdx, setSelectedCategoryIdx] = useState<number>(0);
  const [allSeries, setAllSeries] = useState<XtreamSeries[]>([]);
  const [displayedCount, setDisplayedCount] = useState<number>(BATCH_SIZE);
  const [selectedSeriesIdx, setSelectedSeriesIdx] = useState<number>(0);
  const [isLoadingCats, setIsLoadingCats] = useState<boolean>(true);
  const [isLoadingSeries, setIsLoadingSeries] = useState<boolean>(false);

  // Detalhes da Série
  const [selectedSeries, setSelectedSeries] = useState<XtreamSeries | null>(null);
  const [seriesDetails, setSeriesDetails] = useState<{
    seasons: XtreamSeason[];
    episodes: Record<string, XtreamEpisode[]>;
  } | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [selectedSeason, setSelectedSeason] = useState<string>('1');
  const [selectedEpisodeIdx, setSelectedEpisodeIdx] = useState<number>(0);

  // Player de Episódio
  const [playingEpisode, setPlayingEpisode] = useState<{
    id: string;
    title: string;
    ext: string;
  } | null>(null);

  const [activeFocusColumn, setActiveFocusColumn] = useState<'categories' | 'grid' | 'episodes'>('categories');

  const activeCategoryBtnRef = useRef<HTMLButtonElement>(null);
  const activeSeriesBtnRef = useRef<HTMLButtonElement>(null);
  const activeEpBtnRef = useRef<HTMLButtonElement>(null);

  const displayedSeries = useMemo(() => {
    return allSeries.slice(0, displayedCount);
  }, [allSeries, displayedCount]);

  // Carrega categorias ao iniciar
  useEffect(() => {
    setIsLoadingCats(true);
    client.getSeriesCategories()
      .then((cats) => {
        console.log('[Series] Categorias de séries recebidas:', cats?.length || 0);
        if (cats && cats.length > 0) {
          setCategories(cats);
          setSelectedCategory(cats[0].category_id);
          setSelectedCategoryIdx(0);
        } else {
          console.warn('[Series] Nenhuma categoria de série retornada pela API');
          setCategories([]);
        }
      })
      .catch((err) => {
        console.error("[Series] Erro ao carregar categorias de séries:", err);
        setCategories([]);
      })
      .finally(() => setIsLoadingCats(false));
  }, [client]);

  // Carrega séries da categoria selecionada
  useEffect(() => {
    if (!selectedCategory) {
      console.log('[Series] Aguardando seleção de categoria...');
      return;
    }
    
    console.log('[Series] Carregando séries da categoria:', selectedCategory);
    setIsLoadingSeries(true);
    setDisplayedCount(BATCH_SIZE);
    setSelectedSeriesIdx(0);

    client.getSeries(selectedCategory)
      .then((data) => {
        console.log('[Series] Séries recebidas:', data?.length || 0);
        setAllSeries(data || []);
      })
      .catch((err) => {
        console.error("[Series] Erro ao carregar séries da categoria:", err);
        setAllSeries([]);
      })
      .finally(() => setIsLoadingSeries(false));
  }, [client, selectedCategory]);

  // Força foco real no DOM para desativar cursor na TV LG
  useEffect(() => {
    if (!playingEpisode && isFocusedContent) {
      if (activeFocusColumn === 'categories' && activeCategoryBtnRef.current) {
        activeCategoryBtnRef.current.focus();
        activeCategoryBtnRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else if (activeFocusColumn === 'grid' && activeSeriesBtnRef.current) {
        activeSeriesBtnRef.current.focus();
        activeSeriesBtnRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else if (activeFocusColumn === 'episodes' && activeEpBtnRef.current) {
        activeEpBtnRef.current.focus();
        activeEpBtnRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedCategoryIdx, selectedSeriesIdx, selectedEpisodeIdx, activeFocusColumn, isFocusedContent, playingEpisode, displayedSeries.length]);

  const handleOpenSeries = async (series: XtreamSeries) => {
    setSelectedSeries(series);
    setIsLoadingDetails(true);
    setActiveFocusColumn('episodes');
    setSelectedEpisodeIdx(0);
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
      } else if (activeFocusColumn === 'episodes') {
        setSelectedEpisodeIdx((prev) => Math.max(0, prev - 1));
      }
    },
    onDown: () => {
      if (playingEpisode) return;
      if (activeFocusColumn === 'categories') {
        setSelectedCategoryIdx((prev) => Math.min(categories.length - 1, prev + 1));
      } else if (activeFocusColumn === 'grid') {
        setSelectedSeriesIdx((prev) => {
          const nextIdx = Math.min(allSeries.length - 1, prev + 5);
          if (nextIdx >= displayedCount - 5 && displayedCount < allSeries.length) {
            setDisplayedCount((c) => Math.min(allSeries.length, c + BATCH_SIZE));
          }
          return nextIdx;
        });
      } else if (activeFocusColumn === 'episodes') {
        const totalEps = (seriesDetails?.episodes?.[selectedSeason] || []).length;
        setSelectedEpisodeIdx((prev) => Math.min(totalEps - 1, prev + 1));
      }
    },
    onLeft: () => {
      if (playingEpisode) return;
      if (activeFocusColumn === 'categories') {
        if (onBackToHome) {
          onBackToHome();
        } else {
          onRequestFocusSidebar?.();
        }
      } else if (activeFocusColumn === 'grid') {
        if (selectedSeriesIdx % 5 === 0 || displayedSeries.length === 0) {
          setActiveFocusColumn('categories');
        } else {
          setSelectedSeriesIdx((prev) => Math.max(0, prev - 1));
        }
      } else if (activeFocusColumn === 'episodes') {
        setActiveFocusColumn('grid');
        setSelectedSeries(null);
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
      }
    },
    onSelect: () => {
      if (playingEpisode) return;
      if (activeFocusColumn === 'categories') {
        if (categories[selectedCategoryIdx]) {
          setSelectedCategory(categories[selectedCategoryIdx].category_id);
          setActiveFocusColumn('grid');
        }
      } else if (activeFocusColumn === 'grid' && displayedSeries[selectedSeriesIdx]) {
        handleOpenSeries(displayedSeries[selectedSeriesIdx]);
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
      if (activeFocusColumn === 'episodes') {
        setSelectedSeries(null);
        setActiveFocusColumn('grid');
      } else if (activeFocusColumn === 'grid') {
        setActiveFocusColumn('categories');
      } else if (activeFocusColumn === 'categories') {
        if (onBackToHome) {
          onBackToHome();
        } else {
          onRequestFocusSidebar?.();
        }
      }
    },
    disabled: !isFocusedContent
  }, [
    playingEpisode,
    activeFocusColumn,
    selectedCategoryIdx,
    selectedSeriesIdx,
    selectedEpisodeIdx,
    displayedSeries,
    allSeries.length,
    displayedCount,
    categories,
    seriesDetails,
    selectedSeason,
    isFocusedContent
  ]);

  // Player de Vídeo do Episódio
  if (playingEpisode) {
    return (
      <div className="fixed inset-0 z-[9999] w-screen h-screen bg-black">
        <Player
          streamUrl={client.buildEpisodeUrl(playingEpisode.id, playingEpisode.ext)}
          title={playingEpisode.title}
          onBack={stopPlayingEpisode}
          isFullScreen={true}
        />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex bg-[#0a0d14] overflow-hidden select-none">
      {/* Coluna de Categorias */}
      <div className={`w-72 h-full bg-[#121722]/80 border-r border-[#2a3449] p-4 flex flex-col transition-all duration-200 ${
        isFocusedContent && activeFocusColumn === 'categories' ? 'ring-2 ring-emerald-500/60 bg-[#161d2b]' : ''
      }`}>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <span>Gêneros Séries</span>
            <span className="text-sky-400 font-mono">({categories.length})</span>
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
          <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {categories.map((cat, catIdx) => {
              const isCatFocused = isFocusedContent && activeFocusColumn === 'categories' && selectedCategoryIdx === catIdx;
              const isSelected = selectedCategory === cat.category_id;

              return (
                <button
                  type="button"
                  key={cat.category_id}
                  ref={isCatFocused ? activeCategoryBtnRef : null}
                  tabIndex={0}
                  onClick={() => {
                    setSelectedCategory(cat.category_id);
                    setSelectedCategoryIdx(catIdx);
                    setActiveFocusColumn('grid');
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition truncate cursor-pointer ${
                    isCatFocused
                      ? 'bg-emerald-400 text-black font-extrabold shadow-xl scale-102 ring-4 ring-emerald-300 outline-none'
                      : isSelected
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                      : 'text-slate-300 hover:bg-[#1b2234] hover:text-white'
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
      <div className={`flex-1 h-full p-6 overflow-y-auto custom-scrollbar transition-all ${
        isFocusedContent && activeFocusColumn === 'grid' ? 'ring-2 ring-emerald-500/30' : ''
      }`}>
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
          <div className="w-full h-80 flex flex-col items-center justify-center text-slate-500">
            <Clapperboard className="w-16 h-16 mb-3 text-slate-600" />
            <p className="text-base font-semibold text-slate-400">Nenhuma série disponível nesta categoria.</p>
            <p className="text-xs text-slate-500 mt-1">Selecione outro gênero no menu à esquerda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {displayedSeries.map((series, seriesIdx) => {
              const isSeriesFocused = isFocusedContent && activeFocusColumn === 'grid' && selectedSeriesIdx === seriesIdx;

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
                    <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition ${
                      isSeriesFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}>
                      <div className="w-12 h-12 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-lg">
                        <Play className="w-6 h-6 fill-current ml-0.5" />
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

      {/* Modal de Temporadas e Episódios */}
      {selectedSeries && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-8">
          <div className="w-full max-w-4xl max-h-[85vh] bg-[#121722] border border-[#2a3449] rounded-2xl flex flex-col overflow-hidden shadow-2xl">
            {/* Header Modal */}
            <div className="p-6 border-b border-[#2a3449] flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white">{selectedSeries.name}</h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{selectedSeries.plot}</p>
              </div>
              <button
                type="button"
                tabIndex={0}
                onClick={() => {
                  setSelectedSeries(null);
                  setActiveFocusColumn('grid');
                }}
                className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 flex overflow-hidden">
              {isLoadingDetails ? (
                <div className="flex-1 flex items-center justify-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mr-2" />
                  Carregando episódios...
                </div>
              ) : (
                <>
                  {/* Abas de Temporadas */}
                  <div className="w-48 bg-[#1b2234]/40 border-r border-[#2a3449] p-3 overflow-y-auto space-y-1">
                    {Object.keys(seriesDetails?.episodes || {}).map((seasonKey) => (
                      <button
                        key={seasonKey}
                        type="button"
                        tabIndex={0}
                        onClick={() => {
                          setSelectedSeason(seasonKey);
                          setSelectedEpisodeIdx(0);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition cursor-pointer ${
                          selectedSeason === seasonKey
                            ? 'bg-emerald-500 text-black shadow'
                            : 'text-slate-300 hover:bg-[#1b2234]'
                        }`}
                      >
                        Temporada {seasonKey}
                      </button>
                    ))}
                  </div>

                  {/* Lista de Episódios */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-2 custom-scrollbar">
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
                          className={`w-full flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition select-none text-left ${
                            isEpFocused
                              ? 'bg-emerald-500 text-black font-extrabold shadow-xl scale-102 ring-4 ring-emerald-300'
                              : 'bg-[#1b2234]/60 hover:bg-[#1b2234] border border-[#2a3449] text-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                              isEpFocused ? 'bg-black/20 text-black' : 'bg-emerald-500/10 text-emerald-400'
                            }`}>
                              {ep.episode_num}
                            </div>
                            <span className="font-semibold text-sm truncate">{ep.title}</span>
                          </div>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
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
