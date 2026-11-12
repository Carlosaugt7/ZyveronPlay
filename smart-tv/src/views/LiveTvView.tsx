import React, { useState, useEffect, useRef } from 'react';
import { XtreamClient } from '../lib/xtream';
import { XtreamCategory, XtreamStream } from '../types';
import { VirtualList } from '../components/VirtualList';
import { Player } from '../components/Player';
import { useSpatialNav } from '../hooks/useSpatialNav';
import { Star, Tv, Maximize2, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { getFavorites, toggleFavorite } from '../lib/storage';

interface LiveTvViewProps {
  client: XtreamClient;
  isFocusedContent?: boolean;
  onRequestFocusSidebar?: () => void;
  reloadKey?: number;
  onFullScreenChange?: (full: boolean) => void;
  initialCategoryId?: string;
  onBackToHome?: () => void;
}

export const LiveTvView: React.FC<LiveTvViewProps> = ({
  client,
  isFocusedContent = true,
  onRequestFocusSidebar,
  reloadKey = 0,
  onFullScreenChange,
  initialCategoryId,
  onBackToHome
}) => {
  const [categories, setCategories] = useState<XtreamCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCategoryIdx, setSelectedCategoryIdx] = useState<number>(0);
  const [channels, setChannels] = useState<XtreamStream[]>([]);
  const [filteredChannels, setFilteredChannels] = useState<XtreamStream[]>([]);
  const [selectedChannelIdx, setSelectedChannelIdx] = useState<number>(0);
  const [currentPlayingChannel, setCurrentPlayingChannel] = useState<XtreamStream | null>(null);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [isLoadingChannels, setIsLoadingChannels] = useState<boolean>(true);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [activeFocusColumn, setActiveFocusColumn] = useState<'categories' | 'channels'>('channels');

  const categoriesContainerRef = useRef<HTMLDivElement>(null);
  const activeCategoryBtnRef = useRef<HTMLButtonElement>(null);
  const activeChannelBtnRef = useRef<HTMLButtonElement>(null);

  // Notifica o App sobre mudanças em tela cheia para sumir com a NavigationBar
  const setFullScreenMode = (full: boolean) => {
    setIsFullScreen(full);
    onFullScreenChange?.(full);
  };

  // Carrega categorias ao iniciar ou quando recarregar lista
  useEffect(() => {
    setFavorites(getFavorites('live'));
    client.getLiveCategories()
      .then((cats) => {
        setCategories(cats || []);
        if (initialCategoryId && cats && cats.length > 0) {
          if (initialCategoryId === 'sports') {
            const sportsCatIdx = cats.findIndex((c) => {
              const name = c.category_name.toLowerCase();
              return name.includes('esporte') || name.includes('sport') || name.includes('futebol') || name.includes('combate');
            });
            if (sportsCatIdx !== -1) {
              setSelectedCategory(cats[sportsCatIdx].category_id);
              setSelectedCategoryIdx(sportsCatIdx + 1);
            }
          } else {
            const targetIdx = cats.findIndex((c) => c.category_id === initialCategoryId);
            if (targetIdx !== -1) {
              setSelectedCategory(cats[targetIdx].category_id);
              setSelectedCategoryIdx(targetIdx + 1);
            }
          }
        }
      })
      .catch((err) => console.error("Erro ao carregar categorias:", err));
  }, [client, reloadKey, initialCategoryId]);

  // Carrega canais da categoria selecionada ou quando recarregar lista
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
  }, [client, selectedCategory, reloadKey]);

  // Força foco real do DOM no botão selecionado (elimina o cursor do Magic Remote da TV LG)
  useEffect(() => {
    if (!isFullScreen && isFocusedContent) {
      if (activeFocusColumn === 'categories' && activeCategoryBtnRef.current) {
        activeCategoryBtnRef.current.focus();
        activeCategoryBtnRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else if (activeFocusColumn === 'channels' && activeChannelBtnRef.current) {
        activeChannelBtnRef.current.focus();
      }
    }
  }, [selectedCategoryIdx, selectedChannelIdx, activeFocusColumn, isFocusedContent, isFullScreen]);

  // Teclas do Controle Remoto (D-Pad para Smart TV)
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
      } else if (activeFocusColumn === 'categories') {
        setSelectedCategoryIdx((prev) => Math.max(0, prev - 1));
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
      } else if (activeFocusColumn === 'categories') {
        setSelectedCategoryIdx((prev) => Math.min(categories.length, prev + 1));
      }
    },
    onLeft: () => {
      if (isFullScreen) return;
      if (activeFocusColumn === 'channels') {
        setActiveFocusColumn('categories');
      } else if (activeFocusColumn === 'categories') {
        if (onBackToHome) {
          onBackToHome();
        } else {
          onRequestFocusSidebar?.();
        }
      }
    },
    onRight: () => {
      if (isFullScreen) return;
      if (activeFocusColumn === 'categories') {
        setActiveFocusColumn('channels');
      } else if (activeFocusColumn === 'channels' && filteredChannels[selectedChannelIdx]) {
        setCurrentPlayingChannel(filteredChannels[selectedChannelIdx]);
        setFullScreenMode(true);
      }
    },
    onSelect: () => {
      if (isFullScreen) return;
      if (activeFocusColumn === 'categories') {
        if (selectedCategoryIdx === 0) {
          setSelectedCategory('all');
        } else if (categories[selectedCategoryIdx - 1]) {
          setSelectedCategory(categories[selectedCategoryIdx - 1].category_id);
        }
        setActiveFocusColumn('channels');
      } else if (activeFocusColumn === 'channels' && filteredChannels[selectedChannelIdx]) {
        setCurrentPlayingChannel(filteredChannels[selectedChannelIdx]);
        setFullScreenMode(true);
      }
    },
    onBack: () => {
      if (isFullScreen) {
        setFullScreenMode(false);
        return;
      }
      if (activeFocusColumn === 'channels') {
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
    isFullScreen,
    activeFocusColumn,
    filteredChannels,
    selectedChannelIdx,
    selectedCategoryIdx,
    categories,
    isFocusedContent
  ]);

  const handleToggleFav = (channelId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(channelId, 'live');
    setFavorites(getFavorites('live'));
  };

  return (
    <div className="w-full h-full flex bg-[#0a0d14] relative overflow-hidden select-none">
      {/* TELA CHEIA FIXADA (Cobre 100% da tela, sobrepondo a NavigationBar e tudo mais) */}
      {isFullScreen && currentPlayingChannel && (
        <div className="fixed inset-0 z-[9999] w-screen h-screen bg-black">
          <Player
            streamUrl={client.buildLiveHlsUrl(currentPlayingChannel.stream_id)}
            fallbackUrl={client.buildLiveTsUrl(currentPlayingChannel.stream_id)}
            title={currentPlayingChannel.name}
            channelNum={currentPlayingChannel.num || selectedChannelIdx + 1}
            logoUrl={currentPlayingChannel.stream_icon}
            onBack={() => setFullScreenMode(false)}
            isFullScreen={true}
          />
        </div>
      )}

      {/* Coluna 1: Categorias */}
      <div className={`w-72 h-full bg-[#121722]/60 border-r border-[#2a3449] flex flex-col p-4 select-none transition-all ${
        isFocusedContent && activeFocusColumn === 'categories' ? 'ring-2 ring-emerald-500/50 bg-[#161d2b]' : ''
      }`}>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Categorias ({categories.length})
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
        <div ref={categoriesContainerRef} className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
          <button
            ref={selectedCategoryIdx === 0 ? activeCategoryBtnRef : null}
            onClick={() => {
              setSelectedCategory('all');
              setSelectedCategoryIdx(0);
              setActiveFocusColumn('channels');
            }}
            tabIndex={0}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-semibold transition cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-emerald-500 text-black shadow'
                : 'text-slate-300 hover:bg-[#1b2234] hover:text-white'
            } ${
              isFocusedContent && activeFocusColumn === 'categories' && selectedCategoryIdx === 0
                ? 'ring-4 ring-emerald-300 shadow-xl scale-102 font-extrabold outline-none bg-emerald-400 text-black'
                : ''
            }`}
          >
            ★ Todos os Canais
          </button>
          {categories.map((cat, catIdx) => {
            const isCatFocused = isFocusedContent && activeFocusColumn === 'categories' && selectedCategoryIdx === (catIdx + 1);
            return (
              <button
                key={cat.category_id}
                ref={isCatFocused ? activeCategoryBtnRef : null}
                onClick={() => {
                  setSelectedCategory(cat.category_id);
                  setSelectedCategoryIdx(catIdx + 1);
                  setActiveFocusColumn('channels');
                }}
                tabIndex={0}
                className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-medium transition truncate cursor-pointer ${
                  selectedCategory === cat.category_id
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

      {/* Coluna 2: Lista Virtualizada de Canais */}
      <div className={`w-96 h-full bg-[#0a0d14] border-r border-[#2a3449] flex flex-col p-4 select-none transition-all ${
        isFocusedContent && activeFocusColumn === 'channels' ? 'ring-2 ring-emerald-500/50' : ''
      }`}>
        <div className="flex items-center justify-between mb-3 px-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Canais ({filteredChannels.length})
          </h2>
          <span className="text-xs text-slate-500 font-mono">[OK] Assistir</span>
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
                const isItemFocused = isSelected && isFocusedContent && activeFocusColumn === 'channels';

                return (
                  <button
                    type="button"
                    tabIndex={0}
                    ref={isItemFocused ? activeChannelBtnRef : null}
                    onClick={() => {
                      setSelectedChannelIdx(index);
                      setCurrentPlayingChannel(channel);
                      setFullScreenMode(true);
                    }}
                    className={`w-full h-[58px] px-3 rounded-xl flex items-center justify-between cursor-pointer transition select-none text-left ${
                      isItemFocused
                        ? 'bg-emerald-500 text-black font-extrabold shadow-2xl scale-102 ring-4 ring-emerald-300'
                        : isSelected
                        ? 'bg-[#1b2234] border border-emerald-500/50 text-white'
                        : 'bg-[#121722]/80 hover:bg-[#1b2234] text-slate-200 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className={`font-mono text-xs font-bold w-8 ${isItemFocused ? 'text-black' : 'text-slate-400'}`}>
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
                        <div className={`w-9 h-9 rounded flex items-center justify-center ${isItemFocused ? 'bg-black/20 text-black' : 'bg-[#1b2234] text-slate-500'}`}>
                          <Tv className="w-4 h-4" />
                        </div>
                      )}
                      <span className="font-semibold text-sm truncate">{channel.name}</span>
                    </div>

                    <div
                      onClick={(e) => handleToggleFav(channel.stream_id, e)}
                      className={`p-1.5 transition ${isItemFocused ? 'text-black hover:text-slate-900' : 'text-slate-400 hover:text-amber-400'}`}
                    >
                      <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </div>
                  </button>
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
                  onClick={() => setFullScreenMode(true)}
                  className="absolute bottom-4 right-4 p-3 bg-black/70 hover:bg-emerald-500 hover:text-black text-white rounded-xl backdrop-blur-md transition flex items-center gap-2 text-sm font-bold shadow-lg cursor-pointer"
                >
                  <Maximize2 className="w-5 h-5" /> Expandir Tela Cheia [OK]
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
                      Canal #{currentPlayingChannel.num || selectedChannelIdx + 1} • {currentPlayingChannel.stream_id}
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
