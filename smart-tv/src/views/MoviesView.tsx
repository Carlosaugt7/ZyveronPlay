import React, { useState, useEffect, useRef } from 'react';
import { XtreamClient } from '../lib/xtream';
import { XtreamCategory, XtreamVod } from '../types';
import { Player } from '../components/Player';
import { useSpatialNav } from '../hooks/useSpatialNav';
import { Film, Play, Star, Loader2 } from 'lucide-react';

interface MoviesViewProps {
  client: XtreamClient;
  isFocusedContent?: boolean;
  onRequestFocusSidebar?: () => void;
  onFullScreenChange?: (full: boolean) => void;
}

export const MoviesView: React.FC<MoviesViewProps> = ({
  client,
  isFocusedContent = true,
  onRequestFocusSidebar,
  onFullScreenChange
}) => {
  const [categories, setCategories] = useState<XtreamCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedCategoryIdx, setSelectedCategoryIdx] = useState<number>(0);
  const [movies, setMovies] = useState<XtreamVod[]>([]);
  const [selectedMovieIdx, setSelectedMovieIdx] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedMovie, setSelectedMovie] = useState<XtreamVod | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeFocusColumn, setActiveFocusColumn] = useState<'categories' | 'grid'>('grid');

  const activeCategoryBtnRef = useRef<HTMLButtonElement>(null);
  const activeMovieBtnRef = useRef<HTMLButtonElement>(null);

  // Carrega categorias ao iniciar e seleciona a primeira categoria disponível
  useEffect(() => {
    client.getVodCategories()
      .then((cats) => {
        if (cats && cats.length > 0) {
          setCategories(cats);
          setSelectedCategory(cats[0].category_id);
          setSelectedCategoryIdx(0);
        }
      })
      .catch((err) => console.error("Erro ao carregar categorias VOD:", err));
  }, [client]);

  // Carrega filmes apenas da categoria selecionada (máxima performance, ~200KB em vez de 50MB)
  useEffect(() => {
    if (!selectedCategory) return;
    setIsLoading(true);
    client.getVodStreams(selectedCategory)
      .then((data) => {
        setMovies(data || []);
        setSelectedMovieIdx(0);
      })
      .catch((err) => console.error("Erro ao carregar filmes:", err))
      .finally(() => setIsLoading(false));
  }, [client, selectedCategory]);

  // Força foco real do DOM no elemento ativo (desativa cursor na TV LG)
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
  }, [selectedCategoryIdx, selectedMovieIdx, activeFocusColumn, isFocusedContent, isPlaying]);

  const startPlaying = (movie: XtreamVod) => {
    setSelectedMovie(movie);
    setIsPlaying(true);
    onFullScreenChange?.(true);
  };

  const stopPlaying = () => {
    setIsPlaying(false);
    onFullScreenChange?.(false);
  };

  // D-Pad Navigation
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
        setSelectedMovieIdx((prev) => Math.min(movies.length - 1, prev + 5));
      }
    },
    onLeft: () => {
      if (isPlaying) return;
      if (activeFocusColumn === 'categories') {
        onRequestFocusSidebar?.();
      } else if (activeFocusColumn === 'grid') {
        if (selectedMovieIdx % 5 === 0) {
          setActiveFocusColumn('categories');
        } else {
          setSelectedMovieIdx((prev) => Math.max(0, prev - 1));
        }
      }
    },
    onRight: () => {
      if (isPlaying) return;
      if (activeFocusColumn === 'categories') {
        setActiveFocusColumn('grid');
      } else if (activeFocusColumn === 'grid') {
        setSelectedMovieIdx((prev) => Math.min(movies.length - 1, prev + 1));
      }
    },
    onSelect: () => {
      if (isPlaying) return;
      if (activeFocusColumn === 'categories') {
        if (categories[selectedCategoryIdx]) {
          setSelectedCategory(categories[selectedCategoryIdx].category_id);
        }
        setActiveFocusColumn('grid');
      } else if (activeFocusColumn === 'grid' && movies[selectedMovieIdx]) {
        startPlaying(movies[selectedMovieIdx]);
      }
    },
    onBack: () => {
      if (isPlaying) {
        stopPlaying();
      } else if (activeFocusColumn === 'grid') {
        setActiveFocusColumn('categories');
      } else if (activeFocusColumn === 'categories') {
        onRequestFocusSidebar?.();
      }
    },
    disabled: !isFocusedContent
  }, [
    isPlaying,
    activeFocusColumn,
    selectedCategoryIdx,
    selectedMovieIdx,
    movies,
    categories,
    isFocusedContent
  ]);

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
      {/* Categorias VOD */}
      <div className={`w-64 h-full bg-[#121722]/60 border-r border-[#2a3449] p-4 flex flex-col transition-all ${
        isFocusedContent && activeFocusColumn === 'categories' ? 'ring-2 ring-emerald-500/50 bg-[#161d2b]' : ''
      }`}>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3 px-2">
          Gêneros ({categories.length})
        </h2>
        <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
          {categories.map((cat, catIdx) => {
            const isCatFocused = isFocusedContent && activeFocusColumn === 'categories' && selectedCategoryIdx === catIdx;
            const isSelected = selectedCategory === cat.category_id;

            return (
              <button
                key={cat.category_id}
                ref={isCatFocused ? activeCategoryBtnRef : null}
                tabIndex={0}
                onClick={() => {
                  setSelectedCategory(cat.category_id);
                  setSelectedCategoryIdx(catIdx);
                  setActiveFocusColumn('grid');
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-medium transition truncate cursor-pointer ${
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
      </div>

      {/* Grid de Filmes */}
      <div className={`flex-1 h-full p-6 overflow-y-auto custom-scrollbar transition-all ${
        isFocusedContent && activeFocusColumn === 'grid' ? 'ring-2 ring-emerald-500/30' : ''
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Film className="w-6 h-6 text-emerald-400" />
            Catálogo de Filmes ({movies.length})
          </h2>
          <span className="text-xs text-slate-500 font-mono">[OK] Assistir Filme</span>
        </div>

        {isLoading ? (
          <div className="w-full h-64 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mb-2" />
            <span>Carregando filmes da categoria...</span>
          </div>
        ) : movies.length === 0 ? (
          <div className="w-full h-64 flex flex-col items-center justify-center text-slate-500">
            <Film className="w-12 h-12 mb-2 text-slate-600" />
            <p>Nenhum filme disponível nesta categoria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {movies.map((movie, movieIdx) => {
              const isMovieFocused = isFocusedContent && activeFocusColumn === 'grid' && selectedMovieIdx === movieIdx;
              return (
                <button
                  type="button"
                  tabIndex={0}
                  key={movie.stream_id}
                  ref={isMovieFocused ? activeMovieBtnRef : null}
                  onClick={() => {
                    setSelectedMovieIdx(movieIdx);
                    startPlaying(movie);
                  }}
                  className={`group relative bg-[#121722] border rounded-xl overflow-hidden cursor-pointer transition-all duration-200 shadow-lg text-left ${
                    isMovieFocused
                      ? 'border-emerald-400 ring-4 ring-emerald-400/60 scale-105 shadow-2xl z-10 bg-[#161d2b]'
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
