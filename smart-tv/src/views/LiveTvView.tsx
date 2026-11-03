import React, { useState, useEffect } from 'react';
import { XtreamClient } from '../lib/xtream';
import { XtreamCategory, XtreamStream } from '../types';
import { VirtualList } from '../components/VirtualList';
import { Player } from '../components/Player';
import { useSpatialNav } from '../hooks/useSpatialNav';
import { Star, Tv, Search, Maximize2, Loader2, AlertCircle } from 'lucide-react';
import { getFavorites, toggleFavorite } from '../lib/storage';

interface LiveTvViewProps {
  client: XtreamClient;
}

export const LiveTvView: React.FC<LiveTvViewProps> = ({ client }) => {
  const [categories, setCategories] = useState<XtreamCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [channels, setChannels] = useState<XtreamStream[]>([]);
  const [filteredChannels, setFilteredChannels] = useState<XtreamStream[]>([]);
  const [selectedChannelIdx, setSelectedChannelIdx] = useState<number>(0);
  const [currentPlayingChannel, setCurrentPlayingChannel] = useState<XtreamStream | null>(null);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [isLoadingChannels, setIsLoadingChannels] = useState<boolean>(true);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [activeFocusColumn, setActiveFocusColumn] = useState<'categories' | 'channels'>('channels');

  // Carrega categorias ao iniciar
  useEffect(() => {
    setFavorites(getFavorites('live'));
    client.getLiveCategories()
      .then((cats) => {
        setCategories(cats || []);
      })
      .catch((err) => console.error("Erro ao carregar categorias:", err));
  }, [client]);

  // Carrega canais da categoria selecionada
  useEffect(() => {
    setIsLoadingChannels(true);
    client.getLiveStreams(selectedCategory === 'all' ? undefined : selectedCategory)
      .then((streams) => {
        setChannels(streams || []);
        setFilteredChannels(streams || []);
        setSelectedChannelIdx(0);
        if (streams && streams.length > 0 && !currentPlayingChannel) {
          setCurrentPlayingChannel(streams[0]);
        }
      })
      .catch((err) => console.error("Erro ao carregar canais:", err))
      .finally(() => setIsLoadingChannels(false));
  }, [client, selectedCategory]);

  // Teclas do Controle Remoto (D-Pad)
  useSpatialNav({
    onUp: () => {
      if (isFullScreen) {
        // Zapping em tela cheia (Canal Anterior)
        if (filteredChannels.length > 0) {
          const nextIdx = (selectedChannelIdx - 1 + filteredChannels.length) % filteredChannels.length;
          setSelectedChannelIdx(nextIdx);
          setCurrentPlayingChannel(filteredChannels[nextIdx]);
        }
      } else if (activeFocusColumn === 'channels') {
        setSelectedChannelIdx((prev) => Math.max(0, prev - 1));
      }
    },
    onDown: () => {
      if (isFullScreen) {
        // Zapping em tela cheia (Próximo Canal)
        if (filteredChannels.length > 0) {
          const nextIdx = (selectedChannelIdx + 1) % filteredChannels.length;
          setSelectedChannelIdx(nextIdx);
          setCurrentPlayingChannel(filteredChannels[nextIdx]);
        }
      } else if (activeFocusColumn === 'channels') {
        setSelectedChannelIdx((prev) => Math.min(filteredChannels.length - 1, prev + 1));
      }
    },
    onLeft: () => {
      if (!isFullScreen) {
        setActiveFocusColumn('categories');
      }
    },
    onRight: () => {
      if (!isFullScreen) {
        setActiveFocusColumn('channels');
      }
    },
    onSelect: () => {
      if (!isFullScreen && filteredChannels[selectedChannelIdx]) {
        setCurrentPlayingChannel(filteredChannels[selectedChannelIdx]);
        setIsFullScreen(true);
      }
    },
    onBack: () => {
      if (isFullScreen) {
        setIsFullScreen(false);
      }
    }
  }, [isFullScreen, activeFocusColumn, filteredChannels, selectedChannelIdx]);

  const handleToggleFav = (channelId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(channelId, 'live');
    setFavorites(getFavorites('live'));
  };

  return (
    <div className="w-full h-full flex bg-[#0a0d14] relative overflow-hidden">
      {/* Tela Cheia do Player */}
      {isFullScreen && currentPlayingChannel && (
        <div className="absolute inset-0 z-50 bg-black">
          <Player
            streamUrl={client.buildLiveHlsUrl(currentPlayingChannel.stream_id)}
            fallbackUrl={client.buildLiveTsUrl(currentPlayingChannel.stream_id)}
            title={currentPlayingChannel.name}
            channelNum={currentPlayingChannel.num || selectedChannelIdx + 1}
            logoUrl={currentPlayingChannel.stream_icon}
            onBack={() => setIsFullScreen(false)}
            isFullScreen={true}
          />
        </div>
      )}

      {/* Coluna 1: Categorias */}
      <div className={`w-72 h-full bg-[#121722]/60 border-r border-[#2a3449] flex flex-col p-4 select-none ${activeFocusColumn === 'categories' ? 'ring-2 ring-emerald-500/40' : ''}`}>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3 px-2">
          Categorias ({categories.length})
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
            ★ Todos os Canais
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

      {/* Coluna 2: Lista Virtualizada de Canais */}
      <div className={`w-96 h-full bg-[#0a0d14] border-r border-[#2a3449] flex flex-col p-4 select-none ${activeFocusColumn === 'channels' ? 'ring-2 ring-emerald-500/40' : ''}`}>
        <div className="flex items-center justify-between mb-3 px-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Canais ({filteredChannels.length})
          </h2>
          <span className="text-xs text-slate-500 font-mono">[OK] Abrir</span>
        </div>

        {isLoadingChannels ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-2" />
            <span className="text-sm">Carregando canais...</span>
          </div>
        ) : filteredChannels.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <AlertCircle className="w-8 h-8 mb-2" />
            <span className="text-sm">Nenhum canal nesta categoria.</span>
          </div>
        ) : (
          <div className="flex-1">
            <VirtualList
              items={filteredChannels}
              itemHeight={64}
              containerHeight={window.innerHeight - 80}
              selectedIndex={selectedChannelIdx}
              renderItem={(channel, index, isSelected) => {
                const isFav = favorites.includes(channel.stream_id);
                return (
                  <div
                    onClick={() => {
                      setSelectedChannelIdx(index);
                      setCurrentPlayingChannel(channel);
                      setIsFullScreen(true);
                    }}
                    className={`w-full h-[58px] px-3 rounded-xl flex items-center justify-between cursor-pointer transition select-none ${
                      isSelected
                        ? 'bg-emerald-500/20 border-2 border-emerald-400 text-white shadow-lg'
                        : 'bg-[#121722]/80 hover:bg-[#1b2234] text-slate-200 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className="font-mono text-xs font-bold text-slate-400 w-8">
                        {channel.num || index + 1}
                      </span>
                      {channel.stream_icon ? (
                        <img
                          src={channel.stream_icon}
                          alt=""
                          className="w-9 h-9 object-contain rounded bg-black/40 p-0.5"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-9 h-9 rounded bg-[#1b2234] flex items-center justify-center text-slate-500">
                          <Tv className="w-4 h-4" />
                        </div>
                      )}
                      <span className="font-semibold text-sm truncate">{channel.name}</span>
                    </div>

                    <button
                      onClick={(e) => handleToggleFav(channel.stream_id, e)}
                      className="p-1.5 text-slate-400 hover:text-amber-400 transition"
                    >
                      <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>
                  </div>
                );
              }}
            />
          </div>
        )}
      </div>

      {/* Coluna 3: Mini Preview Player & Detalhes */}
      <div className="flex-1 h-full p-6 flex flex-col justify-between select-none">
        <div>
          {currentPlayingChannel ? (
            <div className="space-y-4">
              {/* Mini Player */}
              <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden border border-[#2a3449] shadow-2xl relative group">
                <Player
                  streamUrl={client.buildLiveHlsUrl(currentPlayingChannel.stream_id)}
                  fallbackUrl={client.buildLiveTsUrl(currentPlayingChannel.stream_id)}
                  title={currentPlayingChannel.name}
                  channelNum={currentPlayingChannel.num || selectedChannelIdx + 1}
                  logoUrl={currentPlayingChannel.stream_icon}
                  isFullScreen={false}
                />
                <button
                  onClick={() => setIsFullScreen(true)}
                  className="absolute bottom-4 right-4 p-3 bg-black/70 hover:bg-emerald-500 hover:text-black text-white rounded-xl backdrop-blur-md transition flex items-center gap-2 text-sm font-bold shadow-lg"
                >
                  <Maximize2 className="w-5 h-5" /> Expandir Tela Cheia
                </button>
              </div>

              {/* Informações do Canal */}
              <div className="bg-[#121722] border border-[#2a3449] p-5 rounded-2xl">
                <div className="flex items-center gap-4">
                  {currentPlayingChannel.stream_icon && (
                    <img
                      src={currentPlayingChannel.stream_icon}
                      alt=""
                      className="w-16 h-16 object-contain rounded-xl bg-black/40 p-1 border border-slate-700"
                    />
                  )}
                  <div>
                    <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded">
                      HLS TRANSMISSÃO ATIVA
                    </span>
                    <h3 className="text-xl font-bold text-white mt-1">
                      {currentPlayingChannel.name}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      Stream ID: {currentPlayingChannel.stream_id}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full aspect-video bg-[#121722] rounded-2xl flex flex-col items-center justify-center text-slate-500 border border-[#2a3449]">
              <Tv className="w-16 h-16 mb-2 text-slate-600" />
              <p>Selecione um canal para assistir</p>
            </div>
          )}
        </div>

        {/* Dica para controle */}
        <div className="bg-[#121722]/50 border border-[#2a3449]/40 p-4 rounded-xl text-xs text-slate-400 flex items-center justify-between">
          <span>Pressione <b>OK</b> para tela cheia • Use <b>CIMA/BAIXO</b> para zapping</span>
          <span className="text-emerald-400 font-semibold">Zyveron HLS Engine</span>
        </div>
      </div>
    </div>
  );
};
