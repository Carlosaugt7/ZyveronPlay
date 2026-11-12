import React, { useState, useEffect, useRef, useMemo } from 'react';
import { XtreamClient } from '../lib/xtream';
import { XtreamCategory, XtreamSeries, XtreamSeason, XtreamEpisode } from '../types';
import { Player } from '../components/Player';
import { useSpatialNav } from '../hooks/useSpatialNav';
import { Clapperboard, Play, Star, Loader2, X, ArrowLeft, Calendar, Info, Heart, Search, Lock, History, Sparkles } from 'lucide-react';
import { getFavorites, toggleFavorite, getRecent, addRecent } from '../lib/storage';
import { AdultContentHelper } from '../lib/adultContent';
import { AdultPinModal } from '../components/AdultPinModal';

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
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [totalSeriesCount, setTotalSeriesCount] = useState<number>(0);
  const [recentSeriesIds, setRecentSeriesIds] = useState<number[]>(() => getRecent('series'));
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
    season: string;
    episodeIdx: number;
  } | null>(null);

  // Reprodução Automática do Próximo Episódio (Persistente no localStorage)
  const [autoPlayNextEpisode, setAutoPlayNextEpisode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('zyveron_autoplay_next_episode');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const toggleAutoPlayNext = () => {
    setAutoPlayNextEpisode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('zyveron_autoplay_next_episode', String(next));
      } catch {}
      return next;
    });
  };

  // Foco espacial: 'categories' | 'grid' | 'details-header' | 'seasons' | 'episodes' | 'search'
  const [activeFocusColumn, setActiveFocusColumn] = useState<'categories' | 'grid' | 'details-header' | 'seasons' | 'episodes' | 'search'>('categories');
  const [headerBtnIdx, setHeaderBtnIdx] = useState<number>(0);

  // Proteção Parental (+18)
  const [showAdultPinModal, setShowAdultPinModal] = useState<boolean>(false);
  const [pendingAdultCategory, setPendingAdultCategory] = useState<{ id: string; idx: number } | null>(null);

  const activeCategoryBtnRef = useRef<HTMLButtonElement>(null);
  const activeSeriesBtnRef = useRef<HTMLButtonElement>(null);
  const activeSeasonBtnRef = useRef<HTMLButtonElement>(null);
  const activeEpBtnRef = useRef<HTMLButtonElement>(null);
  const activeHeaderBtnRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');

  const displayedSeries = useMemo(() => {
    if (!searchQuery.trim()) {
      return allSeries.slice(0, displayedCount);
    }
    const q = searchQuery.toLowerCase().trim();
    return allSeries.filter((s) => s.name.toLowerCase().includes(q)).slice(0, displayedCount);
  }, [allSeries, displayedCount, searchQuery]);

  const seasonKeys = useMemo(() => {
    return Object.keys(seriesDetails?.episodes || {});
  }, [seriesDetails]);

  // Carrega categorias e contagens ao iniciar
  useEffect(() => {
    setIsLoadingCats(true);
    setFavorites(getFavorites('series'));
    setRecentSeriesIds(getRecent('series'));
    client.getSeriesCategories()
      .then((rawCats) => {
        if (rawCats && rawCats.length > 0) {
          const sortedCats = AdultContentHelper.partitionAdultCategories(rawCats, (c) => c.category_name);
          setCategories(sortedCats);
          const currentFavs = getFavorites('series');
          if (currentFavs.length > 0) {
            setSelectedCategory('favorites');
            setSelectedCategoryIdx(0);
          } else {
            setSelectedCategory('recently_watched');
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

    // Carrega estatísticas de séries por categoria
    client.getSeries()
      .then((allSeriesData) => {
        if (allSeriesData && Array.isArray(allSeriesData)) {
          const counts: Record<string, number> = {};
          allSeriesData.forEach((s) => {
            const cid = String(s.category_id);
            counts[cid] = (counts[cid] || 0) + 1;
          });
          setCategoryCounts(counts);
          setTotalSeriesCount(allSeriesData.length);
        }
      })
      .catch((err) => console.warn("[Series] Erro ao carregar contagens:", err));
  }, [client]);

  // Carrega séries da categoria selecionada ou filtra por favoritos/recentes/lançamentos
  useEffect(() => {
    if (!selectedCategory) return;
    
    setIsLoadingSeries(true);
    setDisplayedCount(BATCH_SIZE);
    setSelectedSeriesIdx(0);

    if (selectedCategory === 'favorites') {
      client.getSeries()
        .then((data) => {
          const all = data || [];
          const seen = new Set<number>();
          const favs: XtreamSeries[] = [];
          all.forEach((s) => {
            const sid = Number(s.series_id);
            if (favorites.includes(sid) && !seen.has(sid)) {
              seen.add(sid);
              favs.push(s);
            }
          });
          setAllSeries(favs);
        })
        .catch((err) => {
          console.error("[Series] Erro ao carregar séries favoritas:", err);
          setAllSeries([]);
        })
        .finally(() => setIsLoadingSeries(false));
    } else if (selectedCategory === 'recently_watched') {
      const recents = getRecent('series');
      setRecentSeriesIds(recents);
      client.getSeries()
        .then((data) => {
          const all = data || [];
          const seriesMap = new Map<number, XtreamSeries>();
          all.forEach((s) => seriesMap.set(Number(s.series_id), s));
          const list: XtreamSeries[] = [];
          const seen = new Set<number>();
          recents.forEach((id) => {
            const s = seriesMap.get(id);
            if (s && !seen.has(id)) {
              seen.add(id);
              list.push(s);
            }
          });
          setAllSeries(list);
        })
        .catch((err) => {
          console.error("[Series] Erro ao carregar séries recentes:", err);
          setAllSeries([]);
        })
        .finally(() => setIsLoadingSeries(false));
    } else if (selectedCategory === 'recently_added') {
      client.getSeries()
        .then((data) => {
          const all = [...(data || [])];
          all.sort((a, b) => {
            const tA = a.last_modified ? new Date(a.last_modified).getTime() : 0;
            const tB = b.last_modified ? new Date(b.last_modified).getTime() : 0;
            if (tB !== tA) return tB - tA;
            return Number(b.series_id) - Number(a.series_id);
          });
          setAllSeries(all.slice(0, 100));
        })
        .catch((err) => {
          console.error("[Series] Erro ao carregar séries recém adicionadas:", err);
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
      } else if (activeFocusColumn === 'details-header' && activeHeaderBtnRef.current) {
        activeHeaderBtnRef.current.focus();
      } else if (activeFocusColumn === 'seasons' && activeSeasonBtnRef.current) {
        activeSeasonBtnRef.current.focus();
        activeSeasonBtnRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else if (activeFocusColumn === 'episodes' && activeEpBtnRef.current) {
        activeEpBtnRef.current.focus();
        activeEpBtnRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else if (activeFocusColumn === 'search' && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }
  }, [selectedCategoryIdx, selectedSeriesIdx, selectedSeasonIdx, selectedEpisodeIdx, headerBtnIdx, activeFocusColumn, isFocusedContent, playingEpisode, displayedSeries.length]);

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

  const handleCategoryClick = (catId: string, catIndex: number, catName?: string) => {
    const isAdult = AdultContentHelper.isAdultCategory(catName);
    if (isAdult && !AdultContentHelper.isSessionUnlocked()) {
      setPendingAdultCategory({ id: catId, idx: catIndex });
      setShowAdultPinModal(true);
      return;
    }
    setSelectedCategory(catId);
    setSelectedCategoryIdx(catIndex);
    setActiveFocusColumn('grid');
  };

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

  const startPlayingEpisode = (epData: { id: string; title: string; ext: string; season: string; episodeIdx: number }) => {
    if (selectedSeries) {
      addRecent(selectedSeries.series_id, 'series');
      setRecentSeriesIds(getRecent('series'));
    }
    setPlayingEpisode(epData);
    onFullScreenChange?.(true);
  };

  const stopPlayingEpisode = () => {
    setPlayingEpisode(null);
    onFullScreenChange?.(false);
  };

  // Navegação Sequencial de Episódios para Séries (Auto-Play e Botões Próximo/Anterior)
  const currentSeasonIndex = playingEpisode ? seasonKeys.indexOf(playingEpisode.season) : -1;
  const currentSeasonEpisodes = playingEpisode ? seriesDetails?.episodes?.[playingEpisode.season] || [] : [];

  let hasPrevEpisode = false;
  let prevSeason = '';
  let prevEpIdx = -1;

  if (playingEpisode) {
    if (playingEpisode.episodeIdx > 0) {
      hasPrevEpisode = true;
      prevSeason = playingEpisode.season;
      prevEpIdx = playingEpisode.episodeIdx - 1;
    } else if (currentSeasonIndex > 0) {
      const prevSeasonKey = seasonKeys[currentSeasonIndex - 1];
      const prevSeasonEps = seriesDetails?.episodes?.[prevSeasonKey] || [];
      if (prevSeasonEps.length > 0) {
        hasPrevEpisode = true;
        prevSeason = prevSeasonKey;
        prevEpIdx = prevSeasonEps.length - 1;
      }
    }
  }

  let hasNextEpisode = false;
  let nextSeason = '';
  let nextEpIdx = -1;
  let nextEpisodeTitle = '';

  if (playingEpisode) {
    if (playingEpisode.episodeIdx < currentSeasonEpisodes.length - 1) {
      hasNextEpisode = true;
      nextSeason = playingEpisode.season;
      nextEpIdx = playingEpisode.episodeIdx + 1;
      const nextEp = currentSeasonEpisodes[nextEpIdx];
      if (nextEp) {
        nextEpisodeTitle = `T${nextSeason}:E${nextEp.episode_num} - ${nextEp.title}`;
      }
    } else if (currentSeasonIndex !== -1 && currentSeasonIndex < seasonKeys.length - 1) {
      const nextSeasonKey = seasonKeys[currentSeasonIndex + 1];
      const nextSeasonEps = seriesDetails?.episodes?.[nextSeasonKey] || [];
      if (nextSeasonEps.length > 0) {
        hasNextEpisode = true;
        nextSeason = nextSeasonKey;
        nextEpIdx = 0;
        const nextEp = nextSeasonEps[0];
        if (nextEp) {
          nextEpisodeTitle = `T${nextSeason}:E${nextEp.episode_num} - ${nextEp.title}`;
        }
      }
    }
  }

  const handleGoToNextEpisode = () => {
    if (!hasNextEpisode) return;
    const targetEps = seriesDetails?.episodes?.[nextSeason] || [];
    const ep = targetEps[nextEpIdx];
    if (ep) {
      setSelectedSeason(nextSeason);
      setSelectedEpisodeIdx(nextEpIdx);
      setPlayingEpisode({
        id: ep.id,
        title: `T${nextSeason}:E${ep.episode_num} - ${ep.title}`,
        ext: ep.container_extension || 'mp4',
        season: nextSeason,
        episodeIdx: nextEpIdx
      });
    }
  };

  const handleGoToPrevEpisode = () => {
    if (!hasPrevEpisode) return;
    const targetEps = seriesDetails?.episodes?.[prevSeason] || [];
    const ep = targetEps[prevEpIdx];
    if (ep) {
      setSelectedSeason(prevSeason);
      setSelectedEpisodeIdx(prevEpIdx);
      setPlayingEpisode({
        id: ep.id,
        title: `T${prevSeason}:E${ep.episode_num} - ${ep.title}`,
        ext: ep.container_extension || 'mp4',
        season: prevSeason,
        episodeIdx: prevEpIdx
      });
    }
  };

  // Navegação D-Pad para Smart TV
  useSpatialNav({
    onUp: () => {
      if (playingEpisode) return;
      if (activeFocusColumn === 'categories') {
        setSelectedCategoryIdx((prev) => Math.max(0, prev - 1));
      } else if (activeFocusColumn === 'grid') {
        if (selectedSeriesIdx < 5) {
          setActiveFocusColumn('search');
          searchInputRef.current?.focus();
        } else {
          setSelectedSeriesIdx((prev) => Math.max(0, prev - 5));
        }
      } else if (activeFocusColumn === 'seasons') {
        if (selectedSeasonIdx === 0) {
          setActiveFocusColumn('details-header');
          setHeaderBtnIdx(0);
        } else {
          setSelectedSeasonIdx((prev) => {
            const next = Math.max(0, prev - 1);
            if (seasonKeys[next]) setSelectedSeason(seasonKeys[next]);
            return next;
          });
        }
      } else if (activeFocusColumn === 'episodes') {
        if (selectedEpisodeIdx === 0) {
          setActiveFocusColumn('details-header');
          setHeaderBtnIdx(0);
        } else {
          setSelectedEpisodeIdx((prev) => Math.max(0, prev - 1));
        }
      }
    },
    onDown: () => {
      if (playingEpisode) return;
      if (activeFocusColumn === 'search') {
        setActiveFocusColumn('grid');
        searchInputRef.current?.blur();
      } else if (activeFocusColumn === 'details-header') {
        setActiveFocusColumn('seasons');
      } else if (activeFocusColumn === 'categories') {
        // total = 3 especiais (Favoritos, Últimos Assistidos, Recém Adicionados) + categories.length
        setSelectedCategoryIdx((prev) => Math.min(categories.length + 2, prev + 1));
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
      if (activeFocusColumn === 'search') {
        setActiveFocusColumn('categories');
        searchInputRef.current?.blur();
      } else if (activeFocusColumn === 'details-header') {
        setHeaderBtnIdx(0); // Favoritar
      } else if (activeFocusColumn === 'grid') {
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
      if (activeFocusColumn === 'details-header') {
        setHeaderBtnIdx(1); // Fechar
      } else if (activeFocusColumn === 'categories') {
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
      if (activeFocusColumn === 'search') {
        searchInputRef.current?.focus();
        return;
      }
      if (activeFocusColumn === 'details-header') {
        if (headerBtnIdx === 0 && selectedSeries) {
          handleToggleFav(selectedSeries.series_id);
        } else if (headerBtnIdx === 1) {
          closeSeriesDetails();
        }
      } else if (activeFocusColumn === 'categories') {
        if (selectedCategoryIdx === 0) {
          setSelectedCategory('favorites');
          setActiveFocusColumn('grid');
        } else if (selectedCategoryIdx === 1) {
          setSelectedCategory('recently_watched');
          setActiveFocusColumn('grid');
        } else if (selectedCategoryIdx === 2) {
          setSelectedCategory('recently_added');
          setActiveFocusColumn('grid');
        } else if (categories[selectedCategoryIdx - 3]) {
          const cat = categories[selectedCategoryIdx - 3];
          handleCategoryClick(cat.category_id, selectedCategoryIdx, cat.category_name);
        }
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
            ext: ep.container_extension || 'mp4',
            season: selectedSeason,
            episodeIdx: selectedEpisodeIdx
          });
        }
      }
    },
    onGreen: () => {
      if (selectedSeries) {
        handleToggleFav(selectedSeries.series_id);
      } else if (displayedSeries[selectedSeriesIdx]) {
        handleToggleFav(displayedSeries[selectedSeriesIdx].series_id);
      }
    },
    onYellow: () => {
      if (selectedSeries) {
        handleToggleFav(selectedSeries.series_id);
      } else if (displayedSeries[selectedSeriesIdx]) {
        handleToggleFav(displayedSeries[selectedSeriesIdx].series_id);
      }
    },
    onLongSelect: () => {
      if (selectedSeries) {
        handleToggleFav(selectedSeries.series_id);
      } else if (displayedSeries[selectedSeriesIdx]) {
        handleToggleFav(displayedSeries[selectedSeriesIdx].series_id);
      }
    },
    onBack: () => {
      if (showAdultPinModal) {
        setShowAdultPinModal(false);
        setPendingAdultCategory(null);
        return;
      }
      if (playingEpisode) {
        stopPlayingEpisode();
        return;
      }
      if (selectedSeries) {
        closeSeriesDetails();
        return;
      }
      if (activeFocusColumn === 'search') {
        if (searchQuery) {
          setSearchQuery('');
        } else {
          setActiveFocusColumn('grid');
        }
        return;
      }
      onBackToHome?.();
    },
    disabled: !isFocusedContent || showAdultPinModal,
    priority: 15
  }, [
    playingEpisode,
    activeFocusColumn,
    headerBtnIdx,
    selectedCategoryIdx,
    selectedSeriesIdx,
    selectedSeasonIdx,
    selectedEpisodeIdx,
    displayedSeries,
    allSeries.length,
    displayedCount,
    categories,
    selectedSeries,
    seriesDetails,
    selectedSeason,
    seasonKeys,
    isFocusedContent,
    showAdultPinModal,
    onBackToHome
  ]);

  // Player de Episódio (VOD com Seekbar & Próximo/Anterior Episódio)
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
          onNextEpisode={handleGoToNextEpisode}
          onPreviousEpisode={handleGoToPrevEpisode}
          hasNextEpisode={hasNextEpisode}
          hasPreviousEpisode={hasPrevEpisode}
          autoPlayNext={autoPlayNextEpisode}
          onToggleAutoPlayNext={toggleAutoPlayNext}
          nextEpisodeTitle={nextEpisodeTitle}
        />
      </div>
    );
  }

  const isCurrentSeriesFav = selectedSeries ? favorites.includes(selectedSeries.series_id) : false;

  return (
    <div className="w-full h-full flex bg-[#0a0d14] overflow-hidden select-none relative">
      {/* Coluna de Categorias (Fonte Aumentada para Idosos e TVs) */}
      <div className={`w-84 lg:w-96 h-full bg-[#121722]/90 border-r border-[#2a3449] p-4 flex flex-col transition-all duration-200 shrink-0 ${
        isFocusedContent && activeFocusColumn === 'categories' ? 'ring-2 ring-emerald-500/60 bg-[#161d2b]' : ''
      }`}>
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-base font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <span>GÊNEROS SÉRIES</span>
            <span className="text-sky-400 font-mono text-sm">({categories.length + 3})</span>
          </h2>
          {onBackToHome && (
            <button
              type="button"
              onClick={onBackToHome}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-sky-600 text-xs font-black text-slate-200 hover:text-white transition cursor-pointer border border-slate-700 shadow"
              title="Voltar para a Home"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Início</span>
            </button>
          )}
        </div>

        {isLoadingCats ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mb-3" />
            <span className="text-base font-semibold">Carregando gêneros...</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
            {/* Categoria 1: Meus Favoritos */}
            <button
              ref={selectedCategoryIdx === 0 ? activeCategoryBtnRef : null}
              tabIndex={0}
              onClick={() => {
                setSelectedCategory('favorites');
                setSelectedCategoryIdx(0);
                setActiveFocusColumn('grid');
              }}
              className={`w-full text-left px-5 py-4 rounded-2xl text-lg md:text-xl font-black transition cursor-pointer flex items-center justify-between ${
                selectedCategory === 'favorites'
                  ? 'bg-amber-400 text-black shadow font-black'
                  : 'text-amber-300 hover:bg-[#1b2234]'
              } ${
                isFocusedContent && activeFocusColumn === 'categories' && selectedCategoryIdx === 0
                  ? 'ring-4 ring-amber-300 shadow-2xl scale-102 font-black outline-none bg-amber-400 text-black'
                  : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <Star className="w-6 h-6 fill-current text-amber-400" />
                <span>Meus Favoritos</span>
              </div>
              <span className="font-mono text-sm px-3 py-1 rounded-lg bg-black/40 font-black">
                {favorites.length}
              </span>
            </button>

            {/* Categoria 2: Últimos Assistidos */}
            <button
              ref={selectedCategoryIdx === 1 ? activeCategoryBtnRef : null}
              tabIndex={0}
              onClick={() => {
                setSelectedCategory('recently_watched');
                setSelectedCategoryIdx(1);
                setActiveFocusColumn('grid');
              }}
              className={`w-full text-left px-5 py-4 rounded-2xl text-lg md:text-xl font-black transition cursor-pointer flex items-center justify-between ${
                selectedCategory === 'recently_watched'
                  ? 'bg-sky-400 text-black shadow font-black'
                  : 'text-sky-300 hover:bg-[#1b2234]'
              } ${
                isFocusedContent && activeFocusColumn === 'categories' && selectedCategoryIdx === 1
                  ? 'ring-4 ring-sky-300 shadow-2xl scale-102 font-black outline-none bg-sky-400 text-black'
                  : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <History className="w-6 h-6 text-sky-400" />
                <span>Últimos Assistidos</span>
              </div>
              <span className="font-mono text-sm px-3 py-1 rounded-lg bg-black/40 font-black">
                {recentSeriesIds.length}
              </span>
            </button>

            {/* Categoria 3: Recém Adicionados */}
            <button
              ref={selectedCategoryIdx === 2 ? activeCategoryBtnRef : null}
              tabIndex={0}
              onClick={() => {
                setSelectedCategory('recently_added');
                setSelectedCategoryIdx(2);
                setActiveFocusColumn('grid');
              }}
              className={`w-full text-left px-5 py-4 rounded-2xl text-lg md:text-xl font-black transition cursor-pointer flex items-center justify-between ${
                selectedCategory === 'recently_added'
                  ? 'bg-emerald-400 text-black shadow font-black'
                  : 'text-emerald-300 hover:bg-[#1b2234]'
              } ${
                isFocusedContent && activeFocusColumn === 'categories' && selectedCategoryIdx === 2
                  ? 'ring-4 ring-emerald-300 shadow-2xl scale-102 font-black outline-none bg-emerald-400 text-black'
                  : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-emerald-400" />
                <span>Recém Adicionados</span>
              </div>
              <span className="font-mono text-sm px-3 py-1 rounded-lg bg-black/40 font-black">
                {Math.min(100, totalSeriesCount)}
              </span>
            </button>

            {/* Categorias da API Xtream */}
            {categories.map((cat, catIdx) => {
              const thisIdx = catIdx + 3;
              const isCatFocused = isFocusedContent && activeFocusColumn === 'categories' && selectedCategoryIdx === thisIdx;
              const isSelected = selectedCategory === cat.category_id;
              const isAdult = AdultContentHelper.isAdultCategory(cat.category_name);

              return (
                <button
                  type="button"
                  key={cat.category_id}
                  ref={isCatFocused ? activeCategoryBtnRef : null}
                  tabIndex={0}
                  onClick={() => handleCategoryClick(cat.category_id, thisIdx, cat.category_name)}
                  className={`w-full text-left px-5 py-4 rounded-2xl text-lg md:text-xl font-black transition truncate cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? isAdult ? 'bg-rose-500 text-white font-black shadow' : 'bg-emerald-500 text-black font-black shadow'
                      : isAdult ? 'text-rose-400 hover:bg-rose-950/30' : 'text-slate-200 hover:bg-[#1b2234] hover:text-white'
                  } ${
                    isCatFocused
                      ? isAdult
                        ? 'ring-4 ring-rose-400 shadow-2xl scale-102 font-black outline-none bg-rose-500 text-white'
                        : 'ring-4 ring-emerald-300 shadow-2xl scale-102 font-black outline-none bg-emerald-400 text-black'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="truncate">{cat.category_name}</span>
                    {isAdult && <Lock className="w-4 h-4 ml-1 shrink-0 opacity-80" />}
                  </div>
                  <span className={`font-mono text-xs md:text-sm px-2.5 py-0.5 rounded-lg ml-2 shrink-0 ${
                    isCatFocused
                      ? 'bg-black/30 text-black'
                      : isSelected
                      ? 'bg-black/40 text-white'
                      : 'bg-slate-800/80 text-slate-400'
                  }`}>
                    {categoryCounts[cat.category_id] ?? 0}
                  </span>
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
              <Clapperboard className="w-7 h-7 text-emerald-400" />
              <span>Catálogo de Séries</span>
              {allSeries.length > 0 && (
                <span className="text-base font-normal text-slate-400 ml-1">
                  ({displayedSeries.length} de {allSeries.length})
                </span>
              )}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Campo de Busca Rápida de Séries */}
            <div className={`relative w-72 md:w-80 transition-all ${
              isFocusedContent && activeFocusColumn === 'search' ? 'ring-4 ring-emerald-400 rounded-xl' : ''
            }`}>
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar série por título..."
                value={searchQuery}
                onFocus={() => setActiveFocusColumn('search')}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-8 py-2 bg-[#121722] border rounded-xl text-xs md:text-sm text-white placeholder-slate-400 focus:outline-none transition ${
                  isFocusedContent && activeFocusColumn === 'search'
                    ? 'border-emerald-400 ring-2 ring-emerald-300'
                    : 'border-slate-700/80'
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="hidden sm:flex text-xs text-slate-400 items-center gap-2">
              <span className="font-mono bg-[#1a2233] px-3 py-1.5 rounded-lg text-emerald-400 font-bold">
                [OK] Abrir Série
              </span>
            </div>
          </div>
        </div>

        {isLoadingSeries ? (
          <div className="w-full h-80 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-12 h-12 animate-spin text-emerald-400 mb-3" />
            <span className="text-base font-semibold">Carregando catálogo de séries...</span>
          </div>
        ) : allSeries.length === 0 ? (
          <div className="w-full h-80 flex flex-col items-center justify-center text-slate-500 p-6 text-center">
            {selectedCategory === 'favorites' ? (
              <>
                <Star className="w-16 h-16 mb-3 text-amber-500/40" />
                <p className="text-lg font-bold text-slate-200">Nenhuma série favoritada ainda.</p>
                <p className="text-sm text-slate-400 mt-1 max-w-sm">Abra qualquer série e clique no botão [Favoritar] ou aperte a tecla 'F' no controle.</p>
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
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
                  className={`group relative bg-[#121722] border rounded-2xl overflow-hidden cursor-pointer transition-all duration-150 shadow-lg text-left ${
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
                      <div className="absolute top-2.5 right-2.5 p-2 rounded-full bg-black/75 text-amber-400 z-10 shadow">
                        <Star className="w-4 h-4 fill-current" />
                      </div>
                    )}

                    <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition ${
                      isSeriesFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}>
                      <div className="w-14 h-14 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-2xl">
                        <Info className="w-7 h-7 ml-0.5" />
                      </div>
                    </div>
                  </div>

                  <div className={`p-3.5 ${isSeriesFocused ? 'bg-emerald-500/20' : ''}`}>
                    <h3 className="text-base font-bold text-white truncate leading-snug">{series.name}</h3>
                    {series.rating && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-400 mt-1 font-semibold">
                        <Star className="w-4 h-4 fill-current" />
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
                <div className="w-24 md:w-28 aspect-[2/3] rounded-2xl overflow-hidden shrink-0 border border-slate-700 shadow-xl">
                  <img src={seriesDetails?.info?.cover || selectedSeries.cover} alt={selectedSeries.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl md:text-3xl font-black text-white">{selectedSeries.name}</h3>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      ref={activeFocusColumn === 'details-header' && headerBtnIdx === 0 ? activeHeaderBtnRef : null}
                      tabIndex={0}
                      onClick={() => handleToggleFav(selectedSeries.series_id)}
                      className={`px-5 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 border transition cursor-pointer ${
                        activeFocusColumn === 'details-header' && headerBtnIdx === 0
                          ? 'ring-4 ring-amber-300 scale-105 shadow-2xl bg-amber-400 text-black border-amber-300'
                          : isCurrentSeriesFav
                          ? 'bg-amber-400/20 text-amber-300 border-amber-400/50 hover:bg-amber-400/30'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      <Star className={`w-5 h-5 ${isCurrentSeriesFav || (activeFocusColumn === 'details-header' && headerBtnIdx === 0) ? 'fill-current' : 'text-amber-400'}`} />
                      <span>{isCurrentSeriesFav ? 'Favoritada' : 'Favoritar'}</span>
                    </button>
                    <button
                      type="button"
                      ref={activeFocusColumn === 'details-header' && headerBtnIdx === 1 ? activeHeaderBtnRef : null}
                      tabIndex={0}
                      onClick={closeSeriesDetails}
                      className={`p-2.5 rounded-full transition cursor-pointer ${
                        activeFocusColumn === 'details-header' && headerBtnIdx === 1
                          ? 'ring-4 ring-rose-400 scale-105 shadow-2xl bg-rose-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                      title="Fechar (Voltar)"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 mt-2 text-xs md:text-sm text-slate-300">
                  {selectedSeries.rating && (
                    <div className="flex items-center gap-1 text-amber-400 font-bold">
                      <Star className="w-4 h-4 fill-current" />
                      <span>{selectedSeries.rating}</span>
                    </div>
                  )}
                  {selectedSeries.genre && (
                    <span className="text-sky-300 bg-sky-950/60 px-2.5 py-0.5 rounded font-medium">
                      {selectedSeries.genre}
                    </span>
                  )}
                  {seasonKeys.length > 0 && (
                    <span className="text-slate-400">
                      {seasonKeys.length} Temporada(s)
                    </span>
                  )}
                </div>

                <p className="text-sm md:text-base text-slate-200 mt-2.5 line-clamp-3 leading-relaxed">
                  {seriesDetails?.info?.plot || selectedSeries.plot || 'Sinopse não disponível para esta série.'}
                </p>
              </div>
            </div>

            {/* Conteúdo: Abas de Temporadas e Lista de Episódios */}
            <div className="flex-1 flex overflow-hidden">
              {isLoadingDetails ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-16">
                  <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mb-3" />
                  <span className="text-base font-semibold">Carregando episódios e temporadas...</span>
                </div>
              ) : (
                <>
                  {/* Coluna de Temporadas */}
                  <div className={`w-64 bg-[#161d2b]/80 border-r border-[#2a3449] p-4 overflow-y-auto space-y-2 transition ${
                    isFocusedContent && activeFocusColumn === 'seasons' ? 'ring-2 ring-emerald-500/50' : ''
                  }`}>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 px-2 mb-2">
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
                          className={`w-full text-left px-4 py-3 rounded-2xl text-base md:text-lg font-bold transition cursor-pointer ${
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
                  <div className={`flex-1 p-5 overflow-y-auto space-y-3 custom-scrollbar transition ${
                    isFocusedContent && activeFocusColumn === 'episodes' ? 'ring-2 ring-emerald-500/50' : ''
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-black uppercase tracking-wider text-slate-300">
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
                              ext: ep.container_extension || 'mp4',
                              season: selectedSeason,
                              episodeIdx: epIdx
                            });
                          }}
                          className={`w-full flex items-center justify-between p-4 rounded-2xl cursor-pointer transition select-none text-left ${
                            isEpFocused
                              ? 'bg-emerald-400 text-black font-black shadow-2xl scale-[1.02] ring-4 ring-emerald-300'
                              : 'bg-[#1b2234]/70 hover:bg-[#1b2234] border border-[#2a3449] text-white'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                              isEpFocused ? 'bg-black text-emerald-400' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            }`}>
                              E{ep.episode_num}
                            </div>
                            <div>
                              <span className="font-bold text-base md:text-lg block truncate max-w-lg leading-tight">{ep.title}</span>
                              {ep.info?.duration && (
                                <span className={`text-xs ${isEpFocused ? 'text-black/80 font-medium' : 'text-slate-400'}`}>
                                  Duração: {ep.info.duration}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                            isEpFocused ? 'bg-black text-emerald-400' : 'bg-emerald-500 text-black'
                          }`}>
                            <Play className="w-5 h-5 fill-current ml-0.5" />
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

      {/* Modal de PIN Parental (+18) */}
      <AdultPinModal
        isOpen={showAdultPinModal}
        onDismiss={() => {
          setShowAdultPinModal(false);
          setPendingAdultCategory(null);
        }}
        onSuccess={() => {
          setShowAdultPinModal(false);
          if (pendingAdultCategory) {
            setSelectedCategory(pendingAdultCategory.id);
            setSelectedCategoryIdx(pendingAdultCategory.idx);
            setActiveFocusColumn('grid');
            setPendingAdultCategory(null);
          }
        }}
      />
    </div>
  );
};
