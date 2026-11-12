import React, { useState, useEffect, useRef, useMemo } from 'react';
import { XtreamClient } from '../lib/xtream';
import { XtreamCategory, XtreamVod } from '../types';
import { Player } from '../components/Player';
import { useSpatialNav } from '../hooks/useSpatialNav';
import { Film, Play, Star, Loader2, ArrowLeft } from 'lucide-react';

interface MoviesViewProps {
  client: XtreamClient;
  isFocusedContent?: boolean;
  onRequestFocusSidebar?: () => void;
  onFullScreenChange?: (full: boolean) => void;
  onBackToHome?: () => void;
  initialStreamId?: number;
}

const BATCH_SIZE = 30; // Limita o DOM a 30 filmes por vez para não estourar a memória da Smart TV LG

export const MoviesView: React.FC<MoviesViewProps> = ({
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
  const [allMovies, setAllMovies] = useState<XtreamVod[]>([]);
  const [displayedCount, setDisplayedCount] = useState<number>(BATCH_SIZE);
  const [selectedMovieIdx, setSelectedMovieIdx] = useState<number>(0);
  const [isLoadingCats, setIsLoadingCats] = useState<boolean>(true);
  const [isLoadingMovies, setIsLoadingMovies] = useState<boolean>(false);
  const [selectedMovie, setSelectedMovie] = useState<XtreamVod | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeFocusColumn, setActiveFocusColumn] = useState<'categories' | 'grid'>('categories');

  const activeCategoryBtnRef = useRef<HTMLButtonElement>(null);
  const activeMovieBtnRef = useRef<HTMLButtonElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Filmes atualmente renderizados no DOM (paginação progressiva leve)
  const displayedMovies = useMemo(() => {
    return allMovies.slice(0, displayedCount);
  }, [allMovies, displayedCount]);

  // Carrega categorias ao iniciar e seleciona a primeira categoria disponível
  useEffect(() => {
    setIsLoadingCats(true);
    client.getVodCategories()
      .then((cats) => {
        console.log('[Movies] Categorias VOD recebidas:', cats?.length || 0);
        if (cats && cats.length > 0) {
          setCategories(cats);
          setSelectedCategory(cats[0].category_id);
          setSelectedCategoryIdx(0);
        } else {
          console.warn('[Movies] Nenhuma categoria VOD retornada pela API');
          setCategories([]);
        }
      })
      .catch((err) => {
        console.error("[Movies] Erro ao carregar categorias VOD:", err);
        setCategories([]);
      })
      .finally(() => setIsLoadingCats(false));
  }, [client]);

  // Carrega filmes da categoria selecionada
  useEffect(() => {
    if (!selectedCategory) {
      console.log('[Movies] Aguardando seleção de categoria...');
      return;
    }
    
    console.log('[Movies] Carregando filmes da categoria:', selectedCategory);
    setIsLoadingMovies(true);
    setDisplayedCount(BATCH_SIZE);
    setSelectedMovieIdx(0);

    client.getVodStreams(selectedCategory)
      .then((data) => {
        console.log('[Movies] Filmes recebidos:', data?.length || 0);
        setAllMovies(data || []);
      })
      .catch((err) => {
        console.error("[Movies] Erro ao carregar filmes da categoria:", err);
        setAllMovies([]);
      })
      .finally(() => setIsLoadingMovies(false));
  }, [client, selectedCategory]);

  // Sincroniza o foco real do DOM na TV LG para desativar ponteiro de mouse e guiar o D-Pad
  useEffect(() => {
    if (!isPlaying && isFocusedContent) {
      if (activeFocusColumn === 'categories' && activeCategoryBtnRef.current) {
        activeCategoryBtnRef.current.focus();
        activeCategoryBtnRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else if (activeFocusColumn === 'grid' && activeMovieBtnRef.current) {
        activeMovieBtnRef.current.focus();
        activeMovieBtnRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedCategoryIdx, selectedMovieIdx, activeFocusColumn, isFocusedContent, isPlaying, displayedMovies.length]);

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
        setSelectedCategoryIdx((prev) => Math.min(categories.length - 1, prev + 1));
      } else if (activeFocusColumn === 'grid') {
        setSelectedMovieIdx((prev) => {
          const nextIdx = Math.min(allMovies.length - 1, prev + 5);
          // Se estiver chegando ao final dos filmes exibidos, carrega o próximo lote
          if (nextIdx >= displayedCount - 5 && displayedCount < allMovies.length) {
            setDisplayedCount((c) => Math.min(allMovies.length, c + BATCH_SIZE));
          }
          return nextIdx;
        });
      }
    },
    onLeft: () => {
      if (isPlaying) return;
      if (activeFocusColumn === 'categories') {
        if (onBackToHome) {
          onBackToHome();
        } else {
          onRequestFocusSidebar?.();
        }
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
      if (activeFocusColumn === 'categories') {
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
      if (activeFocusColumn === 'categories') {
        if (categories[selectedCategoryIdx]) {
          setSelectedCategory(categories[selectedCategoryIdx].category_id);
          setActiveFocusColumn('grid');
        }
      } else if (activeFocusColumn === 'grid' && displayedMovies[selectedMovieIdx]) {
        startPlaying(displayedMovies[selectedMovieIdx]);
      }
    },
    onBack: () => {
      if (isPlaying) {
        stopPlaying();
        return;
      }
      if (activeFocusColumn === 'grid') {
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
    isPlaying,
    activeFocusColumn,
    selectedCategoryIdx,
    selectedMovieIdx,
    displayedMovies,
    allMovies.length,
    displayedCount,
    categories,
    isFocusedContent
  ]);

  // Player de Vídeo em Tela Cheia
  if (isPlaying && selectedMovie) {
    return (
      <div className="fixed inset-0 z-[9999] w-screen h-screen bg-black">
        <Player
          streamUrl={client.buildVodUrl(selectedMovie.stream_id, selectedMovie.container_extension)}
          title={selectedMovie.name}
          logoUrl={selectedMovie.stream_icon}
          onBack={stopPlaying}
          isFullScreen={true}
        />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex bg-[#0a0d14] overflow-hidden select-none">
      {/* Coluna de Gêneros/Categorias */}
      <div className={`w-72 h-full bg-[#121722]/80 border-r border-[#2a3449] p-4 flex flex-col transition-all duration-200 ${
        isFocusedContent && activeFocusColumn === 'categories' ? 'ring-2 ring-emerald-500/60 bg-[#161d2b]' : ''
      }`}>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <span>Gêneros VOD</span>
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

      {/* Grade de Filmes */}
      <div 
        ref={gridContainerRef}
        className={`flex-1 h-full p-6 overflow-y-auto custom-scrollbar transition-all ${
          isFocusedContent && activeFocusColumn === 'grid' ? 'ring-2 ring-emerald-500/30' : ''
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Film className="w-6 h-6 text-emerald-400" />
            <span>Catálogo de Filmes</span>
            {allMovies.length > 0 && (
              <span className="text-sm font-normal text-slate-400 ml-1">
                ({displayedMovies.length} de {allMovies.length})
              </span>
            )}
          </h2>
          <div className="text-xs text-slate-400 flex items-center gap-3">
            <span className="font-mono bg-[#1a2233] px-2.5 py-1 rounded-md text-emerald-400">
              [OK] Assistir
            </span>
            <span className="font-mono bg-[#1a2233] px-2.5 py-1 rounded-md text-slate-300">
              [◀] Voltar para Gêneros
            </span>
          </div>
        </div>

        {isLoadingMovies ? (
          <div className="w-full h-80 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-12 h-12 animate-spin text-emerald-400 mb-3" />
            <span className="text-sm">Carregando catálogo de filmes...</span>
          </div>
        ) : allMovies.length === 0 ? (
          <div className="w-full h-80 flex flex-col items-center justify-center text-slate-500">
            <Film className="w-16 h-16 mb-3 text-slate-600" />
            <p className="text-base font-semibold text-slate-400">Nenhum filme disponível nesta categoria.</p>
            <p className="text-xs text-slate-500 mt-1">Selecione outro gênero no menu à esquerda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {displayedMovies.map((movie, movieIdx) => {
              const isMovieFocused = isFocusedContent && activeFocusColumn === 'grid' && selectedMovieIdx === movieIdx;

              return (
                <button
                  type="button"
                  tabIndex={0}
                  key={`${movie.stream_id}-${movieIdx}`}
                  ref={isMovieFocused ? activeMovieBtnRef : null}
                  onClick={() => {
                    setSelectedMovieIdx(movieIdx);
                    startPlaying(movie);
                  }}
                  className={`group relative bg-[#121722] border rounded-xl overflow-hidden cursor-pointer transition-all duration-150 shadow-lg text-left ${
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
                    <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition ${
                      isMovieFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}>
                      <div className="w-12 h-12 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-lg">
                        <Play className="w-6 h-6 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>

                  <div className={`p-3 ${isMovieFocused ? 'bg-emerald-500/20' : ''}`}>
                    <h3 className="text-sm font-semibold text-white truncate">{movie.name}</h3>
                    {movie.rating && (
                      <div className="flex items-center gap-1 text-xs text-amber-400 mt-1">
                        <Star className="w-3.5 h-3.5 fill-current" />
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
    </div>
  );
};
