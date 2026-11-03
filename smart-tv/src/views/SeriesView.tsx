import React, { useState, useEffect } from 'react';
import { XtreamClient } from '../lib/xtream';
import { XtreamCategory, XtreamSeries, XtreamSeason, XtreamEpisode } from '../types';
import { Player } from '../components/Player';
import { Clapperboard, Play, Star, Loader2, X } from 'lucide-react';

interface SeriesViewProps {
  client: XtreamClient;
}

export const SeriesView: React.FC<SeriesViewProps> = ({ client }) => {
  const [categories, setCategories] = useState<XtreamCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [seriesList, setSeriesList] = useState<XtreamSeries[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Detalhes da Série
  const [selectedSeries, setSelectedSeries] = useState<XtreamSeries | null>(null);
  const [seriesDetails, setSeriesDetails] = useState<{
    seasons: XtreamSeason[];
    episodes: Record<string, XtreamEpisode[]>;
  } | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [selectedSeason, setSelectedSeason] = useState<string>('1');

  // Player de Episódio
  const [playingEpisode, setPlayingEpisode] = useState<{
    id: string;
    title: string;
    ext: string;
  } | null>(null);

  useEffect(() => {
    client.getSeriesCategories()
      .then((cats) => setCategories(cats || []))
      .catch((err) => console.error("Erro ao carregar categorias de séries:", err));
  }, [client]);

  useEffect(() => {
    setIsLoading(true);
    client.getSeries(selectedCategory === 'all' ? undefined : selectedCategory)
      .then((data) => setSeriesList(data || []))
      .catch((err) => console.error("Erro ao carregar séries:", err))
      .finally(() => setIsLoading(false));
  }, [client, selectedCategory]);

  const handleOpenSeries = async (series: XtreamSeries) => {
    setSelectedSeries(series);
    setIsLoadingDetails(true);
    try {
      const details = await client.getSeriesInfo(series.series_id);
      setSeriesDetails(details);
      // Seleciona a primeira temporada disponível
      const firstSeasonKey = Object.keys(details.episodes || {})[0] || '1';
      setSelectedSeason(firstSeasonKey);
    } catch (err) {
      console.error("Erro ao carregar temporadas da série:", err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  if (playingEpisode && selectedSeries) {
    return (
      <div className="w-full h-full bg-black relative">
        <Player
          streamUrl={client.buildEpisodeUrl(playingEpisode.id, playingEpisode.ext)}
          title={`${selectedSeries.name} - ${playingEpisode.title}`}
          logoUrl={selectedSeries.cover}
          onBack={() => setPlayingEpisode(null)}
          isFullScreen={true}
        />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex bg-[#0a0d14] overflow-hidden select-none relative">
      {/* Categorias Séries */}
      <div className="w-64 h-full bg-[#121722]/60 border-r border-[#2a3449] p-4 flex flex-col">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3 px-2">
          Categorias de Séries
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
            ★ Todas as Séries
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

      {/* Grid de Séries */}
      <div className="flex-1 h-full p-6 overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Clapperboard className="w-6 h-6 text-emerald-400" />
            Catálogo de Séries ({seriesList.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="w-full h-64 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mb-2" />
            <span>Carregando séries...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {seriesList.map((series) => (
              <div
                key={series.series_id}
                onClick={() => handleOpenSeries(series)}
                className="group relative bg-[#121722] border border-[#2a3449] rounded-xl overflow-hidden cursor-pointer hover:border-emerald-500 transition duration-200 hover:scale-105 shadow-lg"
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
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                    <div className="w-12 h-12 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-lg">
                      <Play className="w-6 h-6 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>

                <div className="p-3">
                  <h3 className="text-sm font-semibold text-white truncate">{series.name}</h3>
                  {series.rating && (
                    <div className="flex items-center gap-1 text-xs text-amber-400 mt-1">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{series.rating}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Temporadas e Episódios */}
      {selectedSeries && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-40 flex items-center justify-center p-8">
          <div className="w-full max-w-4xl max-h-[85vh] bg-[#121722] border border-[#2a3449] rounded-2xl flex flex-col overflow-hidden shadow-2xl">
            {/* Header Modal */}
            <div className="p-6 border-b border-[#2a3449] flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white">{selectedSeries.name}</h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{selectedSeries.plot}</p>
              </div>
              <button
                onClick={() => setSelectedSeries(null)}
                className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white"
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
                        onClick={() => setSelectedSeason(seasonKey)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition ${
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
                  <div className="flex-1 p-4 overflow-y-auto space-y-2">
                    {(seriesDetails?.episodes?.[selectedSeason] || []).map((ep) => (
                      <div
                        key={ep.id}
                        onClick={() => {
                          setPlayingEpisode({
                            id: ep.id,
                            title: `T${selectedSeason}:E${ep.episode_num} - ${ep.title}`,
                            ext: ep.container_extension || 'mp4'
                          });
                        }}
                        className="flex items-center justify-between p-3.5 bg-[#1b2234]/60 hover:bg-[#1b2234] border border-[#2a3449] hover:border-emerald-500/50 rounded-xl cursor-pointer transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
                            {ep.episode_num}
                          </div>
                          <span className="font-semibold text-sm text-white">{ep.title}</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-emerald-500 text-black flex items-center justify-center">
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        </div>
                      </div>
                    ))}
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
