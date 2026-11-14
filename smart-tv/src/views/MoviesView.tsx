import React, { useState, useEffect, useRef, useMemo } from 'react';
import { XtreamClient } from '../lib/xtream';
import { XtreamCategory, XtreamVod } from '../types';
import { Player } from '../components/Player';
import { useSpatialNav } from '../hooks/useSpatialNav';
import { Film, Play, Star, Loader2, ArrowLeft, Heart, Clock, Calendar, Info, Search, X, Lock, History, Sparkles } from 'lucide-react';
import { getFavorites, toggleFavorite, getRecent, addRecent } from '../lib/storage';
import { AdultContentHelper } from '../lib/adultContent';
import { AdultPinModal } from '../components/AdultPinModal';
import { TvSearchModal } from '../components/TvSearchModal';

interface MoviesViewProps {
  client: XtreamClient;
  isFocusedContent?: boolean;
  onRequestFocusSidebar?: () => void;
  onFullScreenChange?: (full: boolean) => void;
  onBackToHome?: () => void;
  initialStreamId?: number;
  reloadKey?: number;
}

const BATCH_SIZE = 30; // Proteção de memória RAM para Smart TVs

export const MoviesView: React.FC<MoviesViewProps> = ({
  client,
  isFocusedContent = true,
  onRequestFocusSidebar,
  onFullScreenChange,
  onBackToHome,
  initialStreamId,
  reloadKey = 0
}) => {
  const [categories, setCategories] = useState<XtreamCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('favorites');
  const [selectedCategoryIdx, setSelectedCategoryIdx] = useState<number>(0);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [totalMoviesCount, setTotalMoviesCount] = useState<number>(0);
  const [recentMovieIds, setRecentMovieIds] = useState<number[]>(() => getRecent('vod'));
  const [allMovies, setAllMovies] = useState<XtreamVod[]>([]);
  const globalVodCatalogRef = useRef<XtreamVod[]>([]);
  const [displayedCount, setDisplayedCount] = useState<number>(BATCH_SIZE);
  const [selectedMovieIdx, setSelectedMovieIdx] = useState<number>(0);
  const [isLoadingCats, setIsLoadingCats] = useState<boolean>(true);
  const [isLoadingMovies, setIsLoadingMovies] = useState<boolean>(false);

  // Detalhes do Filme
  const [selectedMovieForDetails, setSelectedMovieForDetails] = useState<XtreamVod | null>(null);
  const [movieDetails, setMovieDetails] = useState<any | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [detailsButtonIdx, setDetailsButtonIdx] = useState<number>(0); // 0: Assistir, 1: Favorito, 2: Voltar
  const [favorites, setFavorites] = useState<number[]>(() => getFavorites('vod'));

  // Player de Vídeo
  const [selectedMovie, setSelectedMovie] = useState<XtreamVod | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Coluna em foco: 'categories' | 'grid' | 'details' | 'search'
  const [activeFocusColumn, setActiveFocusColumn] = useState<'categories' | 'grid' | 'details' | 'search'>('categories');

  // Proteção Parental (+18)
  const [showAdultPinModal, setShowAdultPinModal] = useState<boolean>(false);
  const [pendingAdultCategory, setPendingAdultCategory] = useState<{ id: string; idx: number } | null>(null);

  const activeCategoryBtnRef = useRef<HTMLButtonElement>(null);
  const backHomeBtnRef = useRef<HTMLButtonElement>(null);
  const activeMovieBtnRef = useRef<HTMLButtonElement>(null);
  const activeDetailBtnRef = useRef<HTMLButtonElement>(null);
  const searchBtnRef = useRef<HTMLButtonElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);

  // Pastas Especiais Fixas e Categorias (Fiel ao APK Android TV: Favoritos, Últimos Assistidos, Todos os Filmes, Recém Adicionados)
  const specialCats = useMemo(() => [
    { id: 'favorites', name: 'Meus Favoritos', count: favorites.length, icon: Star },
    { id: 'recently_watched', name: 'Últimos Assistidos', count: recentMovieIds.length, icon: History },
    { id: 'all', name: 'Todos os Filmes', count: totalMoviesCount, icon: Film },
    { id: 'recently_added', name: 'Recém Adicionados', count: Math.min(100, totalMoviesCount), icon: Sparkles },
  ], [favorites.length, recentMovieIds.length, totalMoviesCount]);

  const selectableCategories = useMemo(() => {
    const list: {
      id: string;
      name: string;
      count: number;
      isSpecial?: boolean;
      isAdult?: boolean;
      icon?: any;
    }[] = [];

    specialCats.forEach((c) => {
      list.push({ ...c, isSpecial: true });
    });

    categories.forEach((cat) => {
      list.push({
        id: cat.category_id,
        name: cat.category_name,
        count: categoryCounts[cat.category_id] ?? 0,
        isAdult: AdultContentHelper.isAdultCategory(cat.category_name)
      });
    });

    return list;
  }, [specialCats, categories, categoryCounts]);

  // Filmes atualmente renderizados no DOM (busca global em TODAS as categorias de filmes quando pesquisando)
  const displayedMovies = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) {
      return allMovies.slice(0, displayedCount);
    }
    const q = searchQuery.toLowerCase().trim();
    const sourceList = globalVodCatalogRef.current.length > 0 ? globalVodCatalogRef.current : allMovies;
    const isAdultUnlocked = AdultContentHelper.isSessionUnlocked();

    return sourceList.filter((m) => {
      if (!m) return false;
      // Não exibe conteúdo adulto na busca global se o PIN não estiver desbloqueado
      if (!isAdultUnlocked && AdultContentHelper.isAdultCategory(m.name || '')) {
        return false;
      }
      const name = (m.name || '').toLowerCase();
      return name.includes(q);
    }).slice(0, displayedCount);
  }, [allMovies, displayedCount, searchQuery]);

  // Reseta paginação e posição ao alterar termo de busca
  useEffect(() => {
    if (searchQuery) {
      setDisplayedCount(60);
      setSelectedMovieIdx(0);
    }
  }, [searchQuery]);

  // Carrega categorias e contagens ao iniciar
  useEffect(() => {
    setIsLoadingCats(true);
    setFavorites(getFavorites('vod'));
    setRecentMovieIds(getRecent('vod'));
    client.getVodCategories()
      .then((rawCats) => {
        if (rawCats && rawCats.length > 0) {
          const sortedCats = AdultContentHelper.partitionAdultCategories(rawCats, (c) => c.category_name);
          setCategories(sortedCats);
          const currentFavs = getFavorites('vod');
          if (currentFavs.length > 0) {
            setSelectedCategory('favorites');
            setSelectedCategoryIdx(0);
          } else {
            setSelectedCategory('all');
            setSelectedCategoryIdx(2);
          }
        } else {
          setCategories([]);
        }
      })
      .catch((err) => {
        console.error("[Movies] Erro ao carregar categorias VOD:", err);
        setCategories([]);
      })
      .finally(() => setIsLoadingCats(false));

    // Carrega estatísticas de filmes por categoria e armazena catálogo global para busca
    client.getVodStreams()
      .then((allVods) => {
        if (allVods && Array.isArray(allVods)) {
          globalVodCatalogRef.current = allVods;
          const counts: Record<string, number> = {};
          allVods.forEach((m) => {
            const cid = String(m.category_id);
            counts[cid] = (counts[cid] || 0) + 1;
          });
          setCategoryCounts(counts);
          setTotalMoviesCount(allVods.length);
        }
      })
      .catch((err) => console.warn("[Movies] Erro ao carregar contagens:", err));
  }, [client, reloadKey]);

  // Carrega filmes da categoria selecionada ou filtra favoritos/recentes/lançamentos
  useEffect(() => {
    if (!selectedCategory) return;
    
    setIsLoadingMovies(true);
    setDisplayedCount(BATCH_SIZE);
    setSelectedMovieIdx(0);

    if (selectedCategory === 'favorites') {
      client.getVodStreams()
        .then((data) => {
          const all = data || [];
          const seen = new Set<number>();
          const favs: XtreamVod[] = [];
          all.forEach((m) => {
            const sid = Number(m.stream_id);
            if (favorites.includes(sid) && !seen.has(sid)) {
              seen.add(sid);
              favs.push(m);
            }
          });
          setAllMovies(favs);
        })
        .catch((err) => {
          console.error("[Movies] Erro ao carregar filmes favoritos:", err);
          setAllMovies([]);
        })
        .finally(() => setIsLoadingMovies(false));
    } else if (selectedCategory === 'recently_watched') {
      const recents = getRecent('vod');
      setRecentMovieIds(recents);
      client.getVodStreams()
        .then((data) => {
          const all = data || [];
          const movieMap = new Map<number, XtreamVod>();
          all.forEach((m) => movieMap.set(Number(m.stream_id), m));
          const list: XtreamVod[] = [];
          const seen = new Set<number>();
          recents.forEach((id) => {
            const m = movieMap.get(id);
            if (m && !seen.has(id)) {
              seen.add(id);
              list.push(m);
            }
          });
          setAllMovies(list);
        })
        .catch((err) => {
          console.error("[Movies] Erro ao carregar filmes recentes:", err);
          setAllMovies([]);
        })
        .finally(() => setIsLoadingMovies(false));
    } else if (selectedCategory === 'recently_added') {
      client.getVodStreams()
        .then((data) => {
          const all = [...(data || [])];
          all.sort((a, b) => {
            const tA = a.added ? new Date(a.added).getTime() : 0;
            const tB = b.added ? new Date(b.added).getTime() : 0;
            if (tB !== tA) return tB - tA;
            return Number(b.stream_id) - Number(a.stream_id);
          });
          const seen = new Set<number>();
          const uniqueList: XtreamVod[] = [];
          all.forEach((m) => {
            const sid = Number(m.stream_id);
            if (!seen.has(sid)) {
              seen.add(sid);
              uniqueList.push(m);
            }
          });
          setAllMovies(uniqueList.slice(0, 100));
        })
        .catch((err) => {
          console.error("[Movies] Erro ao carregar recém adicionados:", err);
          setAllMovies([]);
        })
        .finally(() => setIsLoadingMovies(false));
    } else if (selectedCategory === 'all') {
      client.getVodStreams()
        .then((data) => {
          const all = data || [];
          const seen = new Set<number>();
          const uniqueList: XtreamVod[] = [];
          all.forEach((m) => {
            const sid = Number(m.stream_id);
            if (!seen.has(sid)) {
              seen.add(sid);
              uniqueList.push(m);
            }
          });
          setAllMovies(uniqueList);
        })
        .catch((err) => {
          console.error("[Movies] Erro ao carregar todos os filmes:", err);
          setAllMovies([]);
        })
        .finally(() => setIsLoadingMovies(false));
    } else {
      client.getVodStreams(selectedCategory)
        .then((data) => {
          const all = data || [];
          const seen = new Set<number>();
          const uniqueList: XtreamVod[] = [];
          all.forEach((m) => {
            const sid = Number(m.stream_id);
            if (!seen.has(sid)) {
              seen.add(sid);
              uniqueList.push(m);
            }
          });
          setAllMovies(uniqueList);
        })
        .catch((err) => {
          console.error("[Movies] Erro ao carregar filmes da categoria:", err);
          setAllMovies([]);
        })
        .finally(() => setIsLoadingMovies(false));
    }
  }, [client, selectedCategory, favorites.length]);

  // Se receber initialStreamId (vindo dos destaques da Home), abre direto os detalhes
  useEffect(() => {
    if (!initialStreamId) return;

    client.getVodInfo(initialStreamId)
      .then((infoData) => {
        if (infoData?.info) {
          const fakeVod: XtreamVod = {
            num: 0,
            name: infoData.info.name || 'Filme em Destaque',
            stream_type: 'movie',
            stream_id: initialStreamId,
            stream_icon: infoData.info.movie_image || infoData.info.cover_big || '',
            rating: infoData.info.rating || '',
            rating_5based: infoData.info.rating_5based || 0,
            added: infoData.info.release_date || '',
            category_id: '',
            container_extension: 'mp4'
          };
          setSelectedMovieForDetails(fakeVod);
          setMovieDetails(infoData);
          setActiveFocusColumn('details');
          setDetailsButtonIdx(0);
        }
      })
      .catch((err) => console.warn('[Movies] Erro ao carregar stream inicial:', err));
  }, [initialStreamId, client]);

  // Sincroniza o foco real do DOM na Smart TV para navegação com D-Pad
  useEffect(() => {
    if (!isPlaying && isFocusedContent && !isSearchModalOpen) {
      if (activeFocusColumn === 'categories') {
        if (selectedCategoryIdx === -1 && backHomeBtnRef.current) {
          backHomeBtnRef.current.focus();
        } else if (activeCategoryBtnRef.current) {
          activeCategoryBtnRef.current.focus();
          activeCategoryBtnRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      } else if (activeFocusColumn === 'grid' && activeMovieBtnRef.current) {
        activeMovieBtnRef.current.focus();
        activeMovieBtnRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else if (activeFocusColumn === 'details' && activeDetailBtnRef.current) {
        activeDetailBtnRef.current.focus();
      } else if (activeFocusColumn === 'search' && searchBtnRef.current) {
        searchBtnRef.current.focus();
      }
    }
  }, [selectedCategoryIdx, selectedMovieIdx, detailsButtonIdx, activeFocusColumn, isFocusedContent, isPlaying, displayedMovies.length, isSearchModalOpen]);

  // Tecla de atalho 'F' para favoritar no controle remoto (tecla física Yellow é tratada pelo useSpatialNav)
  useEffect(() => {
    const handleFavKey = (e: KeyboardEvent) => {
      if (isPlaying || isSearchModalOpen) return;
      if (e.key === 'f' || e.key === 'F') {
        const targetMovie = selectedMovieForDetails || displayedMovies[selectedMovieIdx];
        if (targetMovie) {
          handleToggleFav(targetMovie.stream_id);
        }
      }
    };
    window.addEventListener('keydown', handleFavKey);
    return () => window.removeEventListener('keydown', handleFavKey);
  }, [selectedMovieForDetails, displayedMovies, selectedMovieIdx, isPlaying, isSearchModalOpen]);

  const openMovieDetails = async (movie: XtreamVod) => {
    setSelectedMovieForDetails(movie);
    setActiveFocusColumn('details');
    setDetailsButtonIdx(0);
    setIsLoadingDetails(true);
    setMovieDetails(null);

    try {
      const data = await client.getVodInfo(movie.stream_id);
      setMovieDetails(data);
    } catch (err) {
      console.warn('[Movies] Erro ao buscar detalhes VOD:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const closeMovieDetails = () => {
    setSelectedMovieForDetails(null);
    setMovieDetails(null);
    setActiveFocusColumn('grid');
  };

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

  const handleToggleFav = (streamId: number) => {
    toggleFavorite(streamId, 'vod');
    setFavorites(getFavorites('vod'));
  };

  const startPlaying = (movie: XtreamVod) => {
    addRecent(movie.stream_id, 'vod');
    setRecentMovieIds(getRecent('vod'));
    setSelectedMovie(movie);
    setIsPlaying(true);
    onFullScreenChange?.(true);
  };

  const stopPlaying = () => {
    setIsPlaying(false);
    onFullScreenChange?.(false);
  };

  // Navegação D-Pad para Smart TV
  useSpatialNav({
    onUp: () => {
      if (isPlaying) return;
      if (activeFocusColumn === 'categories') {
        setSelectedCategoryIdx((prev) => {
          if (prev <= 0) return -1;
          return prev - 1;
        });
      } else if (activeFocusColumn === 'grid') {
        if (selectedMovieIdx < 5) {
          setActiveFocusColumn('search');
          searchBtnRef.current?.focus();
        } else {
          setSelectedMovieIdx((prev) => Math.max(0, prev - 5));
        }
      }
    },
    onDown: () => {
      if (isPlaying) return;
      if (activeFocusColumn === 'search') {
        setActiveFocusColumn('grid');
        setSelectedMovieIdx(0);
      } else if (activeFocusColumn === 'categories') {
        setSelectedCategoryIdx((prev) => {
          if (prev === -1) return 0;
          return Math.min(selectableCategories.length - 1, prev + 1);
        });
      } else if (activeFocusColumn === 'grid') {
        setSelectedMovieIdx((prev) => {
          const totalListLen = searchQuery ? (globalVodCatalogRef.current.length || allMovies.length) : allMovies.length;
          const nextIdx = Math.min(displayedMovies.length - 1, prev + 5);
          if (nextIdx >= displayedCount - 5 && displayedCount < totalListLen) {
            setDisplayedCount((c) => Math.min(totalListLen, c + BATCH_SIZE));
          }
          return nextIdx;
        });
      }
    },
    onLeft: () => {
      if (isPlaying) return;
      if (activeFocusColumn === 'search') {
        setActiveFocusColumn('categories');
        setSelectedCategoryIdx(-1);
      } else if (activeFocusColumn === 'details') {
        setDetailsButtonIdx((prev) => Math.max(0, prev - 1));
      } else if (activeFocusColumn === 'grid') {
        if (selectedMovieIdx % 5 === 0 || displayedMovies.length === 0) {
          setActiveFocusColumn('categories');
        } else {
          setSelectedMovieIdx((prev) => Math.max(0, prev - 1));
        }
      }
    },
    onRight: () => {
      if (isPlaying) return;
      if (activeFocusColumn === 'details') {
        setDetailsButtonIdx((prev) => Math.min(2, prev + 1));
      } else if (activeFocusColumn === 'categories') {
        if (selectedCategoryIdx === -1) {
          setActiveFocusColumn('search');
          searchBtnRef.current?.focus();
          return;
        }
        if (displayedMovies.length > 0) {
          setActiveFocusColumn('grid');
          setSelectedMovieIdx(0);
        }
      } else if (activeFocusColumn === 'grid') {
        setSelectedMovieIdx((prev) => {
          const totalListLen = searchQuery ? (globalVodCatalogRef.current.length || allMovies.length) : allMovies.length;
          const nextIdx = Math.min(displayedMovies.length - 1, prev + 1);
          if (nextIdx >= displayedCount - 2 && displayedCount < totalListLen) {
            setDisplayedCount((c) => Math.min(totalListLen, c + BATCH_SIZE));
          }
          return nextIdx;
        });
      }
    },
    onSelect: () => {
      if (isPlaying) return;
      if (activeFocusColumn === 'search') {
        setIsSearchModalOpen(true);
        return;
      }
      if (activeFocusColumn === 'details') {
        if (detailsButtonIdx === 0 && selectedMovieForDetails) {
          startPlaying(selectedMovieForDetails);
        } else if (detailsButtonIdx === 1 && selectedMovieForDetails) {
          handleToggleFav(selectedMovieForDetails.stream_id);
        } else if (detailsButtonIdx === 2) {
          closeMovieDetails();
        }
      } else if (activeFocusColumn === 'categories') {
        if (selectedCategoryIdx === -1) {
          onBackToHome?.();
          return;
        }
        const item = selectableCategories[selectedCategoryIdx];
        if (item) {
          if (item.isSpecial) {
            setSelectedCategory(item.id);
            setActiveFocusColumn('grid');
          } else {
            handleCategoryClick(item.id, selectedCategoryIdx, item.name);
          }
        }
      } else if (activeFocusColumn === 'grid' && displayedMovies[selectedMovieIdx]) {
        openMovieDetails(displayedMovies[selectedMovieIdx]);
      }
    },
    onBack: () => {
      if (showAdultPinModal) {
        setShowAdultPinModal(false);
        setPendingAdultCategory(null);
        return;
      }
      if (isPlaying) {
        stopPlaying();
        return;
      }
      if (activeFocusColumn === 'details' || selectedMovieForDetails) {
        closeMovieDetails();
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
    onGreen: () => {
      const targetMovie = selectedMovieForDetails || displayedMovies[selectedMovieIdx];
      if (targetMovie) {
        handleToggleFav(targetMovie.stream_id);
      }
    },
    onYellow: () => {
      const targetMovie = selectedMovieForDetails || displayedMovies[selectedMovieIdx];
      if (targetMovie) {
        handleToggleFav(targetMovie.stream_id);
      }
    },
    disabled: !isFocusedContent || showAdultPinModal || isSearchModalOpen,
    priority: 15
  }, [
    isPlaying,
    activeFocusColumn,
    detailsButtonIdx,
    selectedCategoryIdx,
    selectedMovieIdx,
    displayedMovies,
    allMovies.length,
    displayedCount,
    categories,
    selectedMovieForDetails,
    isFocusedContent,
    showAdultPinModal,
    isSearchModalOpen,
    onBackToHome
  ]);

  // Player de Vídeo em Tela Cheia (VOD com Seekbar)
  if (isPlaying && selectedMovie) {
    const vodInfo = movieDetails?.info;
    const movieGenre = vodInfo?.genre || 'Filme On Demand';
    return (
      <div className="fixed inset-0 z-[9999] w-screen h-screen bg-black">
        <Player
          streamUrl={client.buildVodUrl(selectedMovie.stream_id, selectedMovie.container_extension)}
          title={selectedMovie.name}
          subtitle={movieGenre}
          logoUrl={selectedMovie.stream_icon}
          isLive={false}
          onBack={stopPlaying}
          isFullScreen={true}
        />
      </div>
    );
  }

  const isCurrentFav = selectedMovieForDetails ? favorites.includes(selectedMovieForDetails.stream_id) : false;

  return (
    <div className="w-full h-full flex bg-[#0a0d14] overflow-hidden select-none relative">
      {/* Coluna de Gêneros/Categorias */}
      <div className={`w-44 sm:w-52 md:w-60 lg:w-80 xl:w-96 h-full bg-[#121722]/90 border-r border-[#2a3449] p-2.5 sm:p-3 md:p-4 flex flex-col transition-all duration-200 shrink-0 ${
        isFocusedContent && activeFocusColumn === 'categories' ? 'ring-2 ring-emerald-500/60 bg-[#161d2b]' : ''
      }`}>
        <div className="flex items-center justify-between mb-3 sm:mb-4 px-1">
          <h2 className="text-xs sm:text-sm md:text-base font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5 sm:gap-2">
            <span>GÊNEROS VOD</span>
            <span className="text-sky-400 font-mono text-xs sm:text-sm">({categories.length + 3})</span>
          </h2>
          {onBackToHome && (
            <button
              ref={backHomeBtnRef}
              type="button"
              onClick={onBackToHome}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl transition cursor-pointer border shadow ${
                isFocusedContent && activeFocusColumn === 'categories' && selectedCategoryIdx === -1
                  ? 'bg-rose-600 text-white font-black ring-4 ring-rose-400 scale-105 border-white shadow-xl'
                  : 'bg-slate-800 hover:bg-sky-600 text-[10px] sm:text-xs font-black text-slate-200 hover:text-white border-slate-700'
              }`}
              title="Voltar para a Home"
            >
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Início</span>
            </button>
          )}
        </div>

        {isLoadingCats ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin text-emerald-400 mb-2 sm:mb-3" />
            <span className="text-xs sm:text-base font-semibold">Carregando gêneros...</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-1.5 sm:space-y-2.5 pr-1 custom-scrollbar">
            {selectableCategories.map((item, idx) => {
              const isCatFocused = isFocusedContent && activeFocusColumn === 'categories' && selectedCategoryIdx === idx;
              const isSelected = selectedCategory === item.id;
              const Icon = item.icon;

              return (
                <button
                  type="button"
                  key={`${item.id}-${idx}`}
                  ref={isCatFocused ? activeCategoryBtnRef : null}
                  tabIndex={0}
                  onClick={() => {
                    setSelectedCategoryIdx(idx);
                    if (item.isSpecial) {
                      setSelectedCategory(item.id);
                      setActiveFocusColumn('grid');
                    } else {
                      handleCategoryClick(item.id, idx, item.name);
                    }
                  }}
                  className={`w-full text-left px-2.5 py-2 sm:px-3.5 sm:py-2.5 md:px-4 md:py-3 lg:px-5 lg:py-3.5 rounded-xl md:rounded-2xl text-xs sm:text-sm md:text-base lg:text-lg font-black transition truncate cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? item.isAdult
                        ? 'bg-rose-500 text-white font-black shadow'
                        : item.id === 'favorites'
                        ? 'bg-amber-400 text-black shadow font-black'
                        : item.id === 'recently_watched'
                        ? 'bg-sky-400 text-black shadow font-black'
                        : 'bg-emerald-500 text-black font-black shadow'
                      : item.isAdult
                      ? 'text-rose-400 hover:bg-rose-950/30'
                      : item.id === 'favorites'
                      ? 'text-amber-300 hover:bg-[#1b2234]'
                      : item.id === 'recently_watched'
                      ? 'text-sky-300 hover:bg-[#1b2234]'
                      : 'text-slate-200 hover:bg-[#1b2234] hover:text-white'
                  } ${
                    isCatFocused
                      ? item.isAdult
                        ? 'ring-4 ring-rose-400 shadow-2xl scale-102 font-black outline-none bg-rose-500 text-white'
                        : item.id === 'favorites'
                        ? 'ring-4 ring-amber-300 shadow-2xl scale-102 font-black outline-none bg-amber-400 text-black'
                        : item.id === 'recently_watched'
                        ? 'ring-4 ring-sky-300 shadow-2xl scale-102 font-black outline-none bg-sky-400 text-black'
                        : 'ring-4 ring-emerald-300 shadow-2xl scale-102 font-black outline-none bg-emerald-400 text-black'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2.5 truncate">
                    {Icon && <Icon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 shrink-0" />}
                    <span className="truncate">{item.name}</span>
                    {item.isAdult && <Lock className="w-3.5 h-3.5 ml-1 shrink-0 opacity-80" />}
                  </div>
                  <span className={`font-mono text-[10px] sm:text-xs md:text-sm px-1.5 sm:px-2 py-0.5 rounded-lg ml-1.5 shrink-0 ${
                    isCatFocused
                      ? 'bg-black/30 text-black font-black'
                      : isSelected
                      ? 'bg-black/40 text-white font-black'
                      : 'bg-slate-800/80 text-slate-400'
                  }`}>
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Grade de Filmes */}
      <div 
        ref={gridContainerRef}
        className={`flex-1 h-full p-2.5 sm:p-4 md:p-6 overflow-y-auto custom-scrollbar transition-all ${
          isFocusedContent && activeFocusColumn === 'grid' ? 'ring-2 ring-emerald-500/30' : ''
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-4 mb-3 sm:mb-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <h2 className="text-base sm:text-xl md:text-2xl font-black text-white flex items-center gap-2">
              <Film className="w-5 h-5 sm:w-7 sm:h-7 text-emerald-400" />
              <span>Catálogo de Filmes</span>
              {allMovies.length > 0 && (
                <span className="text-xs sm:text-base font-normal text-slate-400 ml-1">
                  ({displayedMovies.length} de {allMovies.length})
                </span>
              )}
            </h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Campo de Busca Rápida de Filmes */}
            <button
              type="button"
              ref={searchBtnRef}
              tabIndex={0}
              onClick={() => setIsSearchModalOpen(true)}
              className={`relative w-48 sm:w-64 md:w-80 px-2.5 py-1.5 sm:px-3.5 sm:py-2 bg-[#121722] border rounded-xl flex items-center justify-between text-left transition cursor-pointer select-none ${
                isFocusedContent && activeFocusColumn === 'search'
                  ? 'border-emerald-400 ring-4 ring-emerald-400/80 bg-[#161d2b]'
                  : 'border-slate-700/80 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-2 overflow-hidden flex-1">
                <Search className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className={`text-xs md:text-sm truncate ${searchQuery ? 'text-emerald-300 font-bold' : 'text-slate-400'}`}>
                  {searchQuery ? `"${searchQuery}"` : 'Buscar filme por título...'}
                </span>
              </div>
              {searchQuery ? (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchQuery('');
                  }}
                  className="p-1 text-slate-400 hover:text-white shrink-0 cursor-pointer"
                  title="Limpar pesquisa"
                >
                  <X className="w-4 h-4" />
                </span>
              ) : (
                <span className="text-[10px] sm:text-[11px] text-slate-500 font-mono shrink-0 hidden sm:inline">
                  [OK: Buscar]
                </span>
              )}
            </button>

            <div className="hidden sm:flex text-xs text-slate-400 items-center gap-2">
              <span className="font-mono bg-[#1a2233] px-3 py-1.5 rounded-lg text-emerald-400 font-bold">
                [OK] Detalhes
              </span>
            </div>
          </div>
        </div>

        {isLoadingMovies ? (
          <div className="w-full h-80 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-emerald-400 mb-3" />
            <span className="text-sm sm:text-base font-semibold">Carregando catálogo de filmes...</span>
          </div>
        ) : allMovies.length === 0 ? (
          <div className="w-full h-80 flex flex-col items-center justify-center text-slate-500 p-6 text-center">
            {selectedCategory === 'favorites' ? (
              <>
                <Heart className="w-12 h-12 sm:w-16 sm:h-16 mb-2 sm:mb-3 text-red-500/40" />
                <p className="text-base sm:text-lg font-bold text-slate-200">Nenhum filme favoritado ainda.</p>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-sm">Abra qualquer filme no catálogo e selecione o botão [Favorito] para salvá-lo nesta lista.</p>
              </>
            ) : (
              <>
                <Film className="w-12 h-12 sm:w-16 sm:h-16 mb-2 sm:mb-3 text-slate-600" />
                <p className="text-sm sm:text-base font-semibold text-slate-400">Nenhum filme disponível nesta categoria.</p>
                <p className="text-xs text-slate-500 mt-1">Selecione outro gênero no menu à esquerda.</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3.5 md:gap-5">
            {displayedMovies.map((movie, movieIdx) => {
              const isMovieFocused = isFocusedContent && activeFocusColumn === 'grid' && selectedMovieIdx === movieIdx;
              const isFav = favorites.includes(movie.stream_id);

              return (
                <button
                  type="button"
                  tabIndex={0}
                  key={`${movie.stream_id}-${movieIdx}`}
                  ref={isMovieFocused ? activeMovieBtnRef : null}
                  onClick={() => {
                    setSelectedMovieIdx(movieIdx);
                    openMovieDetails(movie);
                  }}
                  className={`group relative bg-[#121722] border rounded-2xl overflow-hidden cursor-pointer transition-all duration-150 shadow-lg text-left ${
                    isMovieFocused
                      ? 'border-emerald-400 ring-4 ring-emerald-400/80 scale-104 shadow-2xl z-10 bg-[#161d2b]'
                      : 'border-[#2a3449] hover:border-emerald-500/50'
                  }`}
                >
                  <div className="aspect-[2/3] w-full bg-slate-900 overflow-hidden relative">
                    {movie.stream_icon ? (
                      <img
                        src={movie.stream_icon}
                        alt={movie.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:opacity-80 transition"
                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <Film className="w-12 h-12" />
                      </div>
                    )}

                    {isFav && (
                      <div className="absolute top-2.5 right-2.5 p-2 rounded-full bg-black/75 text-red-500 z-10 shadow">
                        <Heart className="w-4 h-4 fill-current" />
                      </div>
                    )}

                    <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition ${
                      isMovieFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}>
                      <div className="w-14 h-14 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-2xl">
                        <Info className="w-7 h-7 ml-0.5" />
                      </div>
                    </div>
                  </div>

                  <div className={`p-2 sm:p-3 md:p-3.5 ${isMovieFocused ? 'bg-emerald-500/20' : ''}`}>
                    <h3 className="text-xs sm:text-sm md:text-base font-bold text-white truncate leading-snug">{movie.name}</h3>
                    {movie.rating && (
                      <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-amber-400 mt-1 font-semibold">
                        <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                        <span>{movie.rating}</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL / TELA DE DETALHES DO FILME */}
      {selectedMovieForDetails && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-8 animate-in fade-in duration-200">
          {movieDetails?.info?.backdrop_path?.[0] && (
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-20 filter blur-xl"
              style={{ backgroundImage: `url(${movieDetails.info.backdrop_path[0]})` }}
            />
          )}

          <div className="relative w-full max-w-5xl max-h-[92vh] bg-[#121722]/95 border border-[#2a3449] rounded-2xl md:rounded-3xl p-3 sm:p-5 md:p-8 shadow-2xl overflow-y-auto flex flex-col md:flex-row gap-4 sm:gap-6 md:gap-8 items-start custom-scrollbar">
            
            {/* Pôster Grande */}
            <div className="w-24 sm:w-36 md:w-56 lg:w-72 shrink-0 aspect-[2/3] rounded-xl md:rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-700/80 shadow-2xl relative">
              {selectedMovieForDetails.stream_icon ? (
                <img
                  src={movieDetails?.info?.movie_image || selectedMovieForDetails.stream_icon}
                  alt={selectedMovieForDetails.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600">
                  <Film className="w-12 h-12 sm:w-16 sm:h-16" />
                </div>
              )}
            </div>

            {/* Informações & Sinopse */}
            <div className="flex-1 flex flex-col justify-between h-full space-y-2.5 sm:space-y-4 min-w-0">
              <div>
                <h1 className="text-lg sm:text-2xl md:text-3xl font-extrabold text-white tracking-wide leading-tight">
                  {movieDetails?.info?.name || selectedMovieForDetails.name}
                </h1>

                {/* Metadados: Ano, Duração, Classificação, Gênero */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 sm:mt-3 text-[11px] sm:text-xs md:text-sm text-slate-300 font-medium">
                  {movieDetails?.info?.release_date && (
                    <div className="flex items-center gap-1 bg-[#1a2233] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border border-slate-700">
                      <Calendar className="w-3.5 h-3.5 text-sky-400" />
                      <span>{movieDetails.info.release_date.substring(0, 4)}</span>
                    </div>
                  )}

                  {movieDetails?.info?.duration && (
                    <div className="flex items-center gap-1 bg-[#1a2233] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border border-slate-700">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{movieDetails.info.duration}</span>
                    </div>
                  )}

                  {(movieDetails?.info?.rating || selectedMovieForDetails.rating) && (
                    <div className="flex items-center gap-1 bg-[#1a2233] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border border-slate-700 text-amber-400">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{movieDetails?.info?.rating || selectedMovieForDetails.rating}</span>
                    </div>
                  )}

                  {movieDetails?.info?.genre && (
                    <span className="text-sky-300 bg-sky-950/60 border border-sky-800/60 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg font-semibold">
                      {movieDetails.info.genre}
                    </span>
                  )}
                </div>

                {/* Sinopse */}
                <div className="mt-2.5 sm:mt-4">
                  <h3 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Sinopse
                  </h3>
                  {isLoadingDetails ? (
                    <div className="flex items-center gap-2 text-slate-400 text-xs sm:text-sm py-2 sm:py-4">
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-emerald-400" />
                      <span>Buscando sinopse do filme...</span>
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm md:text-base text-slate-200 leading-relaxed max-h-24 sm:max-h-32 md:max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                      {movieDetails?.info?.plot || movieDetails?.info?.description || 'Nenhuma sinopse disponível para este título no servidor.'}
                    </p>
                  )}
                </div>

                {/* Diretor / Elenco */}
                {movieDetails?.info?.cast && (
                  <div className="mt-2 text-[11px] sm:text-xs text-slate-400">
                    <span className="font-semibold text-slate-300">Elenco: </span>
                    <span className="line-clamp-1">{movieDetails.info.cast}</span>
                  </div>
                )}
              </div>

              {/* Botões de Ação com Foco D-Pad */}
              <div className="flex items-center gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-slate-800">
                {/* 0. Botão Assistir */}
                <button
                  type="button"
                  tabIndex={0}
                  ref={detailsButtonIdx === 0 ? activeDetailBtnRef : null}
                  onClick={() => startPlaying(selectedMovieForDetails)}
                  className={`flex items-center gap-1.5 sm:gap-2.5 px-3.5 py-2 sm:px-5 sm:py-3 md:px-6 md:py-3.5 rounded-xl md:rounded-2xl font-black text-xs sm:text-sm md:text-base cursor-pointer transition-all duration-200 ${
                    detailsButtonIdx === 0
                      ? 'bg-emerald-400 text-black scale-105 shadow-2xl ring-4 ring-emerald-300'
                      : 'bg-emerald-600/90 text-white hover:bg-emerald-500'
                  }`}
                >
                  <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                  <span>Assistir Filme</span>
                </button>

                {/* 1. Botão Favorito */}
                <button
                  type="button"
                  tabIndex={0}
                  ref={detailsButtonIdx === 1 ? activeDetailBtnRef : null}
                  onClick={() => handleToggleFav(selectedMovieForDetails.stream_id)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-3 md:px-5 md:py-3.5 rounded-xl md:rounded-2xl font-bold text-xs sm:text-sm cursor-pointer transition-all duration-200 border ${
                    detailsButtonIdx === 1
                      ? 'bg-white text-black scale-105 shadow-xl ring-4 ring-sky-400 border-white'
                      : isCurrentFav
                      ? 'bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isCurrentFav ? 'fill-current text-red-500' : ''}`} />
                  <span>{isCurrentFav ? 'Favoritado' : 'Favorito'}</span>
                </button>

                {/* 2. Botão Voltar */}
                <button
                  type="button"
                  tabIndex={0}
                  ref={detailsButtonIdx === 2 ? activeDetailBtnRef : null}
                  onClick={closeMovieDetails}
                  className={`flex items-center gap-2 px-5 py-3.5 rounded-2xl font-bold text-sm cursor-pointer transition-all duration-200 border ${
                    detailsButtonIdx === 2
                      ? 'bg-slate-200 text-black scale-105 shadow-xl ring-4 ring-slate-300 border-white'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar</span>
                </button>
              </div>

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

      {/* Modal de Teclado Virtual para Busca de Filmes em Smart TV */}
      <TvSearchModal
        isOpen={isSearchModalOpen}
        title="Buscar Filmes"
        initialQuery={searchQuery}
        totalResultsCount={displayedMovies.length}
        onSearch={(q) => setSearchQuery(q)}
        onClose={() => {
          setIsSearchModalOpen(false);
          if (displayedMovies.length > 0) {
            setActiveFocusColumn('grid');
            setSelectedMovieIdx(0);
          } else {
            setActiveFocusColumn('search');
          }
        }}
      />
    </div>
  );
};
