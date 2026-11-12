import React, { useState, useEffect, useRef, useMemo } from 'react';
import { XtreamClient } from '../lib/xtream';
import { XtreamCategory, XtreamVod } from '../types';
import { Player } from '../components/Player';
import { useSpatialNav } from '../hooks/useSpatialNav';
import { Film, Play, Star, Loader2, ArrowLeft, Heart, Clock, Calendar, Info } from 'lucide-react';
import { getFavorites, toggleFavorite } from '../lib/storage';

interface MoviesViewProps {
  client: XtreamClient;
  isFocusedContent?: boolean;
  onRequestFocusSidebar?: () => void;
  onFullScreenChange?: (full: boolean) => void;
  onBackToHome?: () => void;
  initialStreamId?: number;
}

const BATCH_SIZE = 30; // Proteção de memória RAM para Smart TVs

export const MoviesView: React.FC<MoviesViewProps> = ({
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
  const [allMovies, setAllMovies] = useState<XtreamVod[]>([]);
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

  // Coluna em foco: 'categories' | 'grid' | 'details'
  const [activeFocusColumn, setActiveFocusColumn] = useState<'categories' | 'grid' | 'details'>('categories');

  const activeCategoryBtnRef = useRef<HTMLButtonElement>(null);
  const activeMovieBtnRef = useRef<HTMLButtonElement>(null);
  const activeDetailBtnRef = useRef<HTMLButtonElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Filmes atualmente renderizados no DOM (paginação progressiva leve)
  const displayedMovies = useMemo(() => {
    return allMovies.slice(0, displayedCount);
  }, [allMovies, displayedCount]);

  // Carrega categorias ao iniciar
  useEffect(() => {
    setIsLoadingCats(true);
    setFavorites(getFavorites('vod'));
    client.getVodCategories()
      .then((cats) => {
        if (cats && cats.length > 0) {
          setCategories(cats);
          const currentFavs = getFavorites('vod');
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
        console.error("[Movies] Erro ao carregar categorias VOD:", err);
        setCategories([]);
      })
      .finally(() => setIsLoadingCats(false));
  }, [client]);

  // Carrega filmes da categoria selecionada ou filtra favoritos
  useEffect(() => {
    if (!selectedCategory) return;
    
    setIsLoadingMovies(true);
    setDisplayedCount(BATCH_SIZE);
    setSelectedMovieIdx(0);

    if (selectedCategory === 'favorites') {
      client.getVodStreams()
        .then((data) => {
          const all = data || [];
          const favs = all.filter((m) => favorites.includes(m.stream_id));
          setAllMovies(favs);
        })
        .catch((err) => {
          console.error("[Movies] Erro ao carregar filmes favoritos:", err);
          setAllMovies([]);
        })
        .finally(() => setIsLoadingMovies(false));
    } else {
      client.getVodStreams(selectedCategory)
        .then((data) => {
          setAllMovies(data || []);
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
    if (!isPlaying && isFocusedContent) {
      if (activeFocusColumn === 'categories' && activeCategoryBtnRef.current) {
        activeCategoryBtnRef.current.focus();
        activeCategoryBtnRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else if (activeFocusColumn === 'grid' && activeMovieBtnRef.current) {
        activeMovieBtnRef.current.focus();
        activeMovieBtnRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else if (activeFocusColumn === 'details' && activeDetailBtnRef.current) {
        activeDetailBtnRef.current.focus();
      }
    }
  }, [selectedCategoryIdx, selectedMovieIdx, detailsButtonIdx, activeFocusColumn, isFocusedContent, isPlaying, displayedMovies.length]);

  // Tecla de atalho 'F' para favoritar no controle remoto
  useEffect(() => {
    const handleFavKey = (e: KeyboardEvent) => {
      if (isPlaying) return;
      if (e.key === 'f' || e.key === 'F' || e.key === 'Yellow' || e.key === 'y' || e.key === 'Y') {
        const targetMovie = selectedMovieForDetails || displayedMovies[selectedMovieIdx];
        if (targetMovie) {
          handleToggleFav(targetMovie.stream_id);
        }
      }
    };
    window.addEventListener('keydown', handleFavKey);
    return () => window.removeEventListener('keydown', handleFavKey);
  }, [selectedMovieForDetails, displayedMovies, selectedMovieIdx, isPlaying]);

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

  const handleToggleFav = (streamId: number) => {
    toggleFavorite(streamId, 'vod');
    setFavorites(getFavorites('vod'));
  };

  const startPlaying = (movie: XtreamVod) => {
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
        setSelectedCategoryIdx((prev) => Math.max(0, prev - 1));
      } else if (activeFocusColumn === 'grid') {
        setSelectedMovieIdx((prev) => Math.max(0, prev - 5));
      }
    },
    onDown: () => {
      if (isPlaying) return;
      if (activeFocusColumn === 'categories') {
        // total = 1 (Favoritos) + categories.length
        setSelectedCategoryIdx((prev) => Math.min(categories.length, prev + 1));
      } else if (activeFocusColumn === 'grid') {
        setSelectedMovieIdx((prev) => {
          const nextIdx = Math.min(allMovies.length - 1, prev + 5);
          if (nextIdx >= displayedCount - 5 && displayedCount < allMovies.length) {
            setDisplayedCount((c) => Math.min(allMovies.length, c + BATCH_SIZE));
          }
          return nextIdx;
        });
      }
    },
    onLeft: () => {
      if (isPlaying) return;
      if (activeFocusColumn === 'details') {
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
        if (displayedMovies.length > 0) {
          setActiveFocusColumn('grid');
          setSelectedMovieIdx(0);
        }
      } else if (activeFocusColumn === 'grid') {
        setSelectedMovieIdx((prev) => {
          const nextIdx = Math.min(allMovies.length - 1, prev + 1);
          if (nextIdx >= displayedCount - 2 && displayedCount < allMovies.length) {
            setDisplayedCount((c) => Math.min(allMovies.length, c + BATCH_SIZE));
          }
          return nextIdx;
        });
      }
    },
    onSelect: () => {
      if (isPlaying) return;
      if (activeFocusColumn === 'details') {
        if (detailsButtonIdx === 0 && selectedMovieForDetails) {
          startPlaying(selectedMovieForDetails);
        } else if (detailsButtonIdx === 1 && selectedMovieForDetails) {
          handleToggleFav(selectedMovieForDetails.stream_id);
        } else if (detailsButtonIdx === 2) {
          closeMovieDetails();
        }
      } else if (activeFocusColumn === 'categories') {
        if (selectedCategoryIdx === 0) {
          setSelectedCategory('favorites');
        } else if (categories[selectedCategoryIdx - 1]) {
          setSelectedCategory(categories[selectedCategoryIdx - 1].category_id);
        }
        setActiveFocusColumn('grid');
      } else if (activeFocusColumn === 'grid' && displayedMovies[selectedMovieIdx]) {
        openMovieDetails(displayedMovies[selectedMovieIdx]);
      }
    },
    onBack: () => {
      if (isPlaying) {
        stopPlaying();
        return;
      }
      if (activeFocusColumn === 'details' || selectedMovieForDetails) {
        closeMovieDetails();
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
    disabled: !isFocusedContent,
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
      {/* Coluna de Gêneros/Categorias (Fonte Grande para Idosos e TVs) */}
      <div className={`w-84 lg:w-96 h-full bg-[#121722]/90 border-r border-[#2a3449] p-4 flex flex-col transition-all duration-200 shrink-0 ${
        isFocusedContent && activeFocusColumn === 'categories' ? 'ring-2 ring-emerald-500/60 bg-[#161d2b]' : ''
      }`}>
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-base font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <span>GÊNEROS VOD</span>
            <span className="text-sky-400 font-mono text-sm">({categories.length + 1})</span>
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
                  className={`w-full text-left px-5 py-4 rounded-2xl text-lg md:text-xl font-black transition truncate cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500 text-black font-black shadow'
                      : 'text-slate-200 hover:bg-[#1b2234] hover:text-white'
                  } ${
                    isCatFocused
                      ? 'ring-4 ring-emerald-300 shadow-2xl scale-102 font-black outline-none bg-emerald-400 text-black'
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

      {/* Grade de Filmes */}
      <div 
        ref={gridContainerRef}
        className={`flex-1 h-full p-6 overflow-y-auto custom-scrollbar transition-all ${
          isFocusedContent && activeFocusColumn === 'grid' ? 'ring-2 ring-emerald-500/30' : ''
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Film className="w-7 h-7 text-emerald-400" />
            <span>Catálogo de Filmes</span>
            {allMovies.length > 0 && (
              <span className="text-base font-normal text-slate-400 ml-1">
                ({displayedMovies.length} de {allMovies.length})
              </span>
            )}
          </h2>
          <div className="text-xs text-slate-400 flex items-center gap-3">
            <span className="font-mono bg-[#1a2233] px-3 py-1.5 rounded-lg text-emerald-400 font-bold">
              [OK] Detalhes
            </span>
            <span className="font-mono bg-[#1a2233] px-3 py-1.5 rounded-lg text-slate-300">
              [◀] Voltar para Gêneros
            </span>
          </div>
        </div>

        {isLoadingMovies ? (
          <div className="w-full h-80 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-12 h-12 animate-spin text-emerald-400 mb-3" />
            <span className="text-base font-semibold">Carregando catálogo de filmes...</span>
          </div>
        ) : allMovies.length === 0 ? (
          <div className="w-full h-80 flex flex-col items-center justify-center text-slate-500 p-6 text-center">
            {selectedCategory === 'favorites' ? (
              <>
                <Heart className="w-16 h-16 mb-3 text-red-500/40" />
                <p className="text-lg font-bold text-slate-200">Nenhum filme favoritado ainda.</p>
                <p className="text-sm text-slate-400 mt-1 max-w-sm">Abra qualquer filme no catálogo e selecione o botão [Favorito] para salvá-lo nesta lista.</p>
              </>
            ) : (
              <>
                <Film className="w-16 h-16 mb-3 text-slate-600" />
                <p className="text-base font-semibold text-slate-400">Nenhum filme disponível nesta categoria.</p>
                <p className="text-xs text-slate-500 mt-1">Selecione outro gênero no menu à esquerda.</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
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

                  <div className={`p-3.5 ${isMovieFocused ? 'bg-emerald-500/20' : ''}`}>
                    <h3 className="text-base font-bold text-white truncate leading-snug">{movie.name}</h3>
                    {movie.rating && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-400 mt-1 font-semibold">
                        <Star className="w-4 h-4 fill-current" />
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
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 md:p-12 animate-in fade-in duration-200">
          {movieDetails?.info?.backdrop_path?.[0] && (
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-20 filter blur-xl"
              style={{ backgroundImage: `url(${movieDetails.info.backdrop_path[0]})` }}
            />
          )}

          <div className="relative w-full max-w-5xl bg-[#121722]/95 border border-[#2a3449] rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden flex flex-col md:flex-row gap-8 items-start">
            
            {/* Pôster Grande */}
            <div className="w-56 md:w-72 shrink-0 aspect-[2/3] rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-700/80 shadow-2xl relative">
              {selectedMovieForDetails.stream_icon ? (
                <img
                  src={movieDetails?.info?.movie_image || selectedMovieForDetails.stream_icon}
                  alt={selectedMovieForDetails.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600">
                  <Film className="w-16 h-16" />
                </div>
              )}
            </div>

            {/* Informações & Sinopse */}
            <div className="flex-1 flex flex-col justify-between h-full space-y-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-wide leading-tight">
                  {movieDetails?.info?.name || selectedMovieForDetails.name}
                </h1>

                {/* Metadados: Ano, Duração, Classificação, Gênero */}
                <div className="flex flex-wrap items-center gap-3 mt-3 text-xs md:text-sm text-slate-300 font-medium">
                  {movieDetails?.info?.release_date && (
                    <div className="flex items-center gap-1 bg-[#1a2233] px-2.5 py-1 rounded-lg border border-slate-700">
                      <Calendar className="w-3.5 h-3.5 text-sky-400" />
                      <span>{movieDetails.info.release_date.substring(0, 4)}</span>
                    </div>
                  )}

                  {movieDetails?.info?.duration && (
                    <div className="flex items-center gap-1 bg-[#1a2233] px-2.5 py-1 rounded-lg border border-slate-700">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{movieDetails.info.duration}</span>
                    </div>
                  )}

                  {(movieDetails?.info?.rating || selectedMovieForDetails.rating) && (
                    <div className="flex items-center gap-1 bg-[#1a2233] px-2.5 py-1 rounded-lg border border-slate-700 text-amber-400">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{movieDetails?.info?.rating || selectedMovieForDetails.rating}</span>
                    </div>
                  )}

                  {movieDetails?.info?.genre && (
                    <span className="text-sky-300 bg-sky-950/60 border border-sky-800/60 px-2.5 py-1 rounded-lg font-semibold">
                      {movieDetails.info.genre}
                    </span>
                  )}
                </div>

                {/* Sinopse */}
                <div className="mt-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Sinopse
                  </h3>
                  {isLoadingDetails ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                      <span>Buscando sinopse do filme...</span>
                    </div>
                  ) : (
                    <p className="text-sm md:text-base text-slate-200 leading-relaxed max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                      {movieDetails?.info?.plot || movieDetails?.info?.description || 'Nenhuma sinopse disponível para este título no servidor.'}
                    </p>
                  )}
                </div>

                {/* Diretor / Elenco */}
                {movieDetails?.info?.cast && (
                  <div className="mt-2 text-xs text-slate-400">
                    <span className="font-semibold text-slate-300">Elenco: </span>
                    <span className="line-clamp-1">{movieDetails.info.cast}</span>
                  </div>
                )}
              </div>

              {/* Botões de Ação com Foco D-Pad */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
                {/* 0. Botão Assistir */}
                <button
                  type="button"
                  tabIndex={0}
                  ref={detailsButtonIdx === 0 ? activeDetailBtnRef : null}
                  onClick={() => startPlaying(selectedMovieForDetails)}
                  className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl font-black text-sm md:text-base cursor-pointer transition-all duration-200 ${
                    detailsButtonIdx === 0
                      ? 'bg-emerald-400 text-black scale-105 shadow-2xl ring-4 ring-emerald-300'
                      : 'bg-emerald-600/90 text-white hover:bg-emerald-500'
                  }`}
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>Assistir Filme</span>
                </button>

                {/* 1. Botão Favorito */}
                <button
                  type="button"
                  tabIndex={0}
                  ref={detailsButtonIdx === 1 ? activeDetailBtnRef : null}
                  onClick={() => handleToggleFav(selectedMovieForDetails.stream_id)}
                  className={`flex items-center gap-2 px-5 py-3.5 rounded-2xl font-bold text-sm cursor-pointer transition-all duration-200 border ${
                    detailsButtonIdx === 1
                      ? 'bg-white text-black scale-105 shadow-xl ring-4 ring-sky-400 border-white'
                      : isCurrentFav
                      ? 'bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isCurrentFav ? 'fill-current text-red-500' : ''}`} />
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
    </div>
  );
};
