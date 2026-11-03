import React, { useState, useEffect } from 'react';
import { XtreamClient } from '../lib/xtream';
import { XtreamCategory, XtreamVod } from '../types';
import { Player } from '../components/Player';
import { Film, Play, Star, Loader2, ArrowLeft } from 'lucide-react';

interface MoviesViewProps {
  client: XtreamClient;
}

export const MoviesView: React.FC<MoviesViewProps> = ({ client }) => {
  const [categories, setCategories] = useState<XtreamCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [movies, setMovies] = useState<XtreamVod[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedMovie, setSelectedMovie] = useState<XtreamVod | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  useEffect(() => {
    client.getVodCategories()
      .then((cats) => setCategories(cats || []))
      .catch((err) => console.error("Erro ao carregar categorias VOD:", err));
  }, [client]);

  useEffect(() => {
    setIsLoading(true);
    client.getVodStreams(selectedCategory === 'all' ? undefined : selectedCategory)
      .then((data) => setMovies(data || []))
      .catch((err) => console.error("Erro ao carregar filmes:", err))
      .finally(() => setIsLoading(false));
  }, [client, selectedCategory]);

  if (isPlaying && selectedMovie) {
    return (
      <div className="w-full h-full bg-black relative">
        <Player
          streamUrl={client.buildVodUrl(selectedMovie.stream_id, selectedMovie.container_extension)}
          title={selectedMovie.name}
          logoUrl={selectedMovie.stream_icon}
          onBack={() => setIsPlaying(false)}
          isFullScreen={true}
        />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex bg-[#0a0d14] overflow-hidden select-none">
      {/* Categorias VOD */}
      <div className="w-64 h-full bg-[#121722]/60 border-r border-[#2a3449] p-4 flex flex-col">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3 px-2">
          Gêneros / Categorias
        </h2>
        <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-semibold transition ${
              selectedCategory === 'all'
                ? 'bg-emerald-500 text-black shadow'
                : 'text-slate-300 hover:bg-[#1b2234] hover:text-white'
            }`}
          >
            ★ Todos os Filmes
          </button>
          {categories.map((cat) => (
            <button
              key={cat.category_id}
              onClick={() => setSelectedCategory(cat.category_id)}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-medium transition truncate ${
                selectedCategory === cat.category_id
                  ? 'bg-emerald-500 text-black font-bold shadow'
                  : 'text-slate-300 hover:bg-[#1b2234] hover:text-white'
              }`}
            >
              {cat.category_name}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Filmes */}
      <div className="flex-1 h-full p-6 overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Film className="w-6 h-6 text-emerald-400" />
            Catálogo de Filmes ({movies.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="w-full h-64 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mb-2" />
            <span>Carregando filmes...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {movies.map((movie) => (
              <div
                key={movie.stream_id}
                onClick={() => {
                  setSelectedMovie(movie);
                  setIsPlaying(true);
                }}
                className="group relative bg-[#121722] border border-[#2a3449] rounded-xl overflow-hidden cursor-pointer hover:border-emerald-500 transition duration-200 hover:scale-105 shadow-lg"
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
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                    <div className="w-12 h-12 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-lg">
                      <Play className="w-6 h-6 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>

                <div className="p-3">
                  <h3 className="text-sm font-semibold text-white truncate">{movie.name}</h3>
                  {movie.rating && (
                    <div className="flex items-center gap-1 text-xs text-amber-400 mt-1">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{movie.rating}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
