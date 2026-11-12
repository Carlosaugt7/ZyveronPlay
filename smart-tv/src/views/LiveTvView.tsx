import React, { useState, useEffect, useRef } from 'react';
import { XtreamClient } from '../lib/xtream';
import { XtreamCategory, XtreamStream } from '../types';
import { VirtualList } from '../components/VirtualList';
import { Player } from '../components/Player';
import { useSpatialNav } from '../hooks/useSpatialNav';
import { Star, Tv, Maximize2, Loader2, AlertCircle, ArrowLeft, Heart } from 'lucide-react';
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
  const [isQuickGuideOpen, setIsQuickGuideOpen] = useState<boolean>(false);
  const [quickGuideIdx, setQuickGuideIdx] = useState<number>(0);
  const [isLoadingChannels, setIsLoadingChannels] = useState<boolean>(true);
  const [favorites, setFavorites] = useState<number[]>(() => getFavorites('live'));
  const [activeFocusColumn, setActiveFocusColumn] = useState<'categories' | 'channels'>('channels');

  const categoriesContainerRef = useRef<HTMLDivElement>(null);
  const activeCategoryBtnRef = useRef<HTMLButtonElement>(null);
  const activeChannelBtnRef = useRef<HTMLButtonElement>(null);

  // Notifica o App sobre mudanças em tela cheia para sumir com barras de topo
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
              setSelectedCategoryIdx(sportsCatIdx + 2);
            }
          } else {
            const targetIdx = cats.findIndex((c) => c.category_id === initialCategoryId);
            if (targetIdx !== -1) {
              setSelectedCategory(cats[targetIdx].category_id);
              setSelectedCategoryIdx(targetIdx + 2);
            }
          }
        }
      })
      .catch((err) => console.error("Erro ao carregar categorias:", err));
  }, [client, reloadKey, initialCategoryId]);

  // Carrega canais da categoria selecionada ou filtra por favoritos
  useEffect(() => {
    setIsLoadingChannels(true);

    if (selectedCategory === 'favorites') {
      client.getLiveStreams()
        .then((streams) => {
          const all = streams || [];
          setChannels(all);
          const favStreams = all.filter((s) => favorites.includes(s.stream_id));
          setFilteredChannels(favStreams);
          setSelectedChannelIdx(0);
          if (favStreams.length > 0 && !currentPlayingChannel) {
            setCurrentPlayingChannel(favStreams[0]);
          }
        })
        .catch((err) => console.error("Erro ao carregar favoritos:", err))
        .finally(() => setIsLoadingChannels(false));
    } else {
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
    }
  }, [client, selectedCategory, reloadKey, favorites.length]);

  // Força foco real do DOM no botão selecionado
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

  // Tecla de atalho para favoritar com controle remoto ('F' ou Tecla Amarela)
  useEffect(() => {
    const handleFavKey = (e: KeyboardEvent) => {
      if (isFullScreen) return;
      if (e.key === 'f' || e.key === 'F' || e.key === 'Yellow' || e.key === 'y' || e.key === 'Y') {
        const targetChannel = filteredChannels[selectedChannelIdx] || currentPlayingChannel;
        if (targetChannel) {
          toggleFavorite(targetChannel.stream_id, 'live');
          setFavorites(getFavorites('live'));
        }
      }
    };
    window.addEventListener('keydown', handleFavKey);
    return () => window.removeEventListener('keydown', handleFavKey);
  }, [filteredChannels, selectedChannelIdx, currentPlayingChannel, isFullScreen]);

  // 1º Clique / Enter: Carrega na prévia lateral
  // 2º Clique / Enter no mesmo canal ativo: Confirma e expande para tela cheia
  const handleChannelSelectOrPlay = (channel: XtreamStream, index: number) => {
    setSelectedChannelIdx(index);
    if (currentPlayingChannel?.stream_id === channel.stream_id) {
      // 2º clique: confirma tela cheia!
      setFullScreenMode(true);
    } else {
      // 1º clique: carrega no mini player de prévia
      setCurrentPlayingChannel(channel);
    }
  };

  // Teclas do Controle Remoto (D-Pad para Smart TV)
  useSpatialNav({
    onUp: () => {
      if (isFullScreen) {
        if (isQuickGuideOpen) {
          setQuickGuideIdx((prev) => Math.max(0, prev - 1));
        } else if (filteredChannels.length > 0) {
          // Zapping em tela cheia (Canal Anterior)
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
        if (isQuickGuideOpen) {
          setQuickGuideIdx((prev) => Math.min(filteredChannels.length - 1, prev + 1));
        } else if (filteredChannels.length > 0) {
          // Zapping em tela cheia (Próximo Canal)
          const nextIdx = (selectedChannelIdx + 1) % filteredChannels.length;
          setSelectedChannelIdx(nextIdx);
          setCurrentPlayingChannel(filteredChannels[nextIdx]);
        }
      } else if (activeFocusColumn === 'channels') {
        setSelectedChannelIdx((prev) => Math.min(filteredChannels.length - 1, prev + 1));
      } else if (activeFocusColumn === 'categories') {
        // total = 2 (Todos + Favoritos) + categories.length
        setSelectedCategoryIdx((prev) => Math.min(categories.length + 1, prev + 1));
      }
    },
    onLeft: () => {
      if (isFullScreen) {
        if (!isQuickGuideOpen) {
          setQuickGuideIdx(selectedChannelIdx);
          setIsQuickGuideOpen(true);
        }
        return;
      }
      if (activeFocusColumn === 'channels') {
        setActiveFocusColumn('categories');
      }
    },
    onRight: () => {
      if (isFullScreen) {
        if (isQuickGuideOpen) {
          setIsQuickGuideOpen(false);
        } else {
          setQuickGuideIdx(selectedChannelIdx);
          setIsQuickGuideOpen(true);
        }
        return;
      }
      if (activeFocusColumn === 'categories') {
        setActiveFocusColumn('channels');
      } else if (activeFocusColumn === 'channels' && filteredChannels[selectedChannelIdx]) {
        // Seta para direita no canal confirma tela cheia
        handleChannelSelectOrPlay(filteredChannels[selectedChannelIdx], selectedChannelIdx);
      }
    },
    onSelect: () => {
      if (isFullScreen) {
        if (isQuickGuideOpen && filteredChannels[quickGuideIdx]) {
          setSelectedChannelIdx(quickGuideIdx);
          setCurrentPlayingChannel(filteredChannels[quickGuideIdx]);
          setIsQuickGuideOpen(false);
        }
        return;
      }
      if (activeFocusColumn === 'categories') {
        if (selectedCategoryIdx === 0) {
          setSelectedCategory('all');
        } else if (selectedCategoryIdx === 1) {
          setSelectedCategory('favorites');
        } else if (categories[selectedCategoryIdx - 2]) {
          setSelectedCategory(categories[selectedCategoryIdx - 2].category_id);
        }
        setActiveFocusColumn('channels');
      } else if (activeFocusColumn === 'channels' && filteredChannels[selectedChannelIdx]) {
        handleChannelSelectOrPlay(filteredChannels[selectedChannelIdx], selectedChannelIdx);
      }
    },
    onBack: () => {
      if (isFullScreen) {
        if (isQuickGuideOpen) {
          setIsQuickGuideOpen(false);
        } else {
          setFullScreenMode(false);
        }
        return;
      }
      if (activeFocusColumn === 'channels') {
        setActiveFocusColumn('categories');
      } else if (activeFocusColumn === 'categories') {
        onBackToHome?.();
      }
    },
    disabled: !isFocusedContent
  }, [
    isFullScreen,
    isQuickGuideOpen,
    quickGuideIdx,
    activeFocusColumn,
    filteredChannels,
    selectedChannelIdx,
    selectedCategoryIdx,
    categories,
    currentPlayingChannel,
    isFocusedContent
  ]);

  const handleToggleFav = (channelId: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    toggleFavorite(channelId, 'live');
    setFavorites(getFavorites('live'));
  };

  const isCurrentPlayingFav = currentPlayingChannel ? favorites.includes(currentPlayingChannel.stream_id) : false;

  return (
    <div className="w-full h-full flex bg-[#0a0d14] relative overflow-hidden select-none">
      {/* TELA CHEIA FIXADA (Cobre 100% da tela) */}
      {isFullScreen && currentPlayingChannel && (
        <div className="fixed inset-0 z-[9999] w-screen h-screen bg-black">
          <Player
            streamUrl={client.buildLiveHlsUrl(currentPlayingChannel.stream_id)}
            fallbackUrl={client.buildLiveTsUrl(currentPlayingChannel.stream_id)}
            title={currentPlayingChannel.name}
            channelNum={currentPlayingChannel.num || selectedChannelIdx + 1}
            logoUrl={currentPlayingChannel.stream_icon}
            isLive={true}
            onChannelUp={() => {
              if (filteredChannels.length > 0) {
                const nextIdx = (selectedChannelIdx - 1 + filteredChannels.length) % filteredChannels.length;
                setSelectedChannelIdx(nextIdx);
                setCurrentPlayingChannel(filteredChannels[nextIdx]);
              }
            }}
            onChannelDown={() => {
              if (filteredChannels.length > 0) {
                const nextIdx = (selectedChannelIdx + 1) % filteredChannels.length;
                setSelectedChannelIdx(nextIdx);
                setCurrentPlayingChannel(filteredChannels[nextIdx]);
              }
            }}
            onOpenChannelList={() => {
              setQuickGuideIdx(selectedChannelIdx);
              setIsQuickGuideOpen(true);
            }}
            onBack={() => setFullScreenMode(false)}
            isFullScreen={true}
          />

          {/* GUIA RÁPIDO DE CANAIS EM OVERLAY (Aberto via Seta Esquerda ou Seta Direita no controle) */}
          {isQuickGuideOpen && (
            <div className="absolute inset-y-0 left-0 w-80 md:w-96 bg-black/90 backdrop-blur-md border-r border-[#2a3449] z-[10000] flex flex-col p-4 animate-in slide-in-from-left duration-200 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <div className="flex items-center gap-2 text-white">
                  <Tv className="w-5 h-5 text-emerald-400" />
                  <span className="font-extrabold text-sm uppercase tracking-wider">Guia Rápido de Canais</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsQuickGuideOpen(false)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded text-slate-300"
                >
                  Fechar [◀]
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                {filteredChannels.map((channel, qIdx) => {
                  const isQuickFocused = quickGuideIdx === qIdx;
                  const isNowPlaying = currentPlayingChannel.stream_id === channel.stream_id;
                  const isFav = favorites.includes(channel.stream_id);

                  return (
                    <button
                      key={channel.stream_id}
                      type="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedChannelIdx(qIdx);
                        setCurrentPlayingChannel(channel);
                        setIsQuickGuideOpen(false);
                      }}
                      className={`w-full text-left p-3 rounded-xl flex items-center justify-between cursor-pointer transition select-none ${
                        isQuickFocused
                          ? 'bg-emerald-400 text-black font-extrabold shadow-xl scale-[1.02] ring-2 ring-emerald-300'
                          : isNowPlaying
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                          : 'bg-[#121722]/80 hover:bg-[#1b2234] text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <span className={`font-mono text-xs font-bold w-7 ${isQuickFocused ? 'text-black' : 'text-slate-400'}`}>
                          {channel.num || qIdx + 1}
                        </span>
                        {channel.stream_icon ? (
                          <img
                            src={channel.stream_icon}
                            alt=""
                            className="w-8 h-8 object-contain rounded bg-black/40 p-0.5"
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center">
                            <Tv className="w-4 h-4" />
                          </div>
                        )}
                        <span className="font-semibold text-xs truncate max-w-[150px]">{channel.name}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isFav && <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />}
                        {isNowPlaying && (
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                            isQuickFocused ? 'bg-black text-emerald-400' : 'bg-emerald-400 text-black'
                          }`}>
                            Ao Vivo
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>[▲/▼] Navegar • [OK] Trocar</span>
                <span>[◀/▶] Sair do Guia</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Coluna 1: Categorias de Canais (com Favoritos no topo) */}
      <div className={`w-72 h-full bg-[#121722]/80 border-r border-[#2a3449] p-4 flex flex-col transition-all duration-200 shrink-0 ${
        isFocusedContent && activeFocusColumn === 'categories' ? 'ring-2 ring-emerald-500/60 bg-[#161d2b]' : ''
      }`}>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <span>Categorias TV</span>
            <span className="text-sky-400 font-mono">({categories.length + 2})</span>
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

        <div ref={categoriesContainerRef} className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
          {/* 1. Todos os Canais */}
          <button
            ref={selectedCategoryIdx === 0 ? activeCategoryBtnRef : null}
            onClick={() => {
              setSelectedCategory('all');
              setSelectedCategoryIdx(0);
              setActiveFocusColumn('channels');
            }}
            tabIndex={0}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-emerald-500 text-black shadow font-bold'
                : 'text-slate-300 hover:bg-[#1b2234] hover:text-white'
            } ${
              isFocusedContent && activeFocusColumn === 'categories' && selectedCategoryIdx === 0
                ? 'ring-4 ring-emerald-300 shadow-xl scale-102 font-extrabold outline-none bg-emerald-400 text-black'
                : ''
            }`}
          >
            ★ Todos os Canais
          </button>

          {/* 2. Meus Favoritos */}
          <button
            ref={selectedCategoryIdx === 1 ? activeCategoryBtnRef : null}
            onClick={() => {
              setSelectedCategory('favorites');
              setSelectedCategoryIdx(1);
              setActiveFocusColumn('channels');
            }}
            tabIndex={0}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer flex items-center justify-between ${
              selectedCategory === 'favorites'
                ? 'bg-amber-400 text-black shadow font-bold'
                : 'text-amber-300/90 hover:bg-[#1b2234] hover:text-amber-300'
            } ${
              isFocusedContent && activeFocusColumn === 'categories' && selectedCategoryIdx === 1
                ? 'ring-4 ring-amber-300 shadow-xl scale-102 font-extrabold outline-none bg-amber-400 text-black'
                : ''
            }`}
          >
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 fill-current text-amber-400" />
              <span>Meus Favoritos</span>
            </div>
            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-black/30 font-bold">
              {favorites.length}
            </span>
          </button>

          {/* 3. Categorias da API Xtream */}
          {categories.map((cat, catIdx) => {
            const thisIdx = catIdx + 2;
            const isCatFocused = isFocusedContent && activeFocusColumn === 'categories' && selectedCategoryIdx === thisIdx;
            const isSelected = selectedCategory === cat.category_id;

            return (
              <button
                key={cat.category_id}
                ref={isCatFocused ? activeCategoryBtnRef : null}
                onClick={() => {
                  setSelectedCategory(cat.category_id);
                  setSelectedCategoryIdx(thisIdx);
                  setActiveFocusColumn('channels');
                }}
                tabIndex={0}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition truncate cursor-pointer ${
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

      {/* Coluna 2: Lista Virtualizada de Canais */}
      <div className={`w-96 h-full bg-[#0a0d14] border-r border-[#2a3449] flex flex-col p-4 select-none transition-all shrink-0 ${
        isFocusedContent && activeFocusColumn === 'channels' ? 'ring-2 ring-emerald-500/50' : ''
      }`}>
        <div className="flex items-center justify-between mb-3 px-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <span>Canais</span>
            <span className="text-sky-400 font-mono">({filteredChannels.length})</span>
          </h2>
          <span className="text-[11px] text-slate-400 font-mono">
            [OK] Prévia • [2x OK] Tela Cheia
          </span>
        </div>

        {isLoadingChannels ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-2" />
            <span className="text-sm">Carregando canais...</span>
          </div>
        ) : filteredChannels.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-6 text-center">
            {selectedCategory === 'favorites' ? (
              <>
                <Star className="w-12 h-12 mb-2 text-amber-500/50" />
                <span className="text-sm font-bold text-slate-300">Nenhum canal favoritado ainda.</span>
                <span className="text-xs text-slate-500 mt-1">Clique na estrela ao lado de um canal ou pressione a tecla 'F' no controle para adicionar.</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-8 h-8 mb-2" />
                <span className="text-sm">Nenhum canal nesta categoria.</span>
              </>
            )}
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
                const isNowPlayingInPreview = currentPlayingChannel?.stream_id === channel.stream_id;

                return (
                  <button
                    type="button"
                    tabIndex={0}
                    ref={isItemFocused ? activeChannelBtnRef : null}
                    onClick={() => handleChannelSelectOrPlay(channel, index)}
                    className={`w-full h-[58px] px-3 rounded-xl flex items-center justify-between cursor-pointer transition select-none text-left ${
                      isItemFocused
                        ? 'bg-emerald-400 text-black font-extrabold shadow-2xl scale-[1.02] ring-4 ring-emerald-300'
                        : isNowPlayingInPreview
                        ? 'bg-emerald-500/15 border border-emerald-500/50 text-white'
                        : isSelected
                        ? 'bg-[#1b2234] border border-slate-700 text-white'
                        : 'bg-[#121722]/80 hover:bg-[#1b2234] text-slate-200 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span className={`font-mono text-xs font-bold w-7 ${isItemFocused ? 'text-black' : 'text-slate-400'}`}>
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
                      <div className="truncate">
                        <span className="font-semibold text-sm block truncate max-w-[170px]">{channel.name}</span>
                        {isNowPlayingInPreview && (
                          <span className={`text-[10px] font-black uppercase tracking-wider block ${
                            isItemFocused ? 'text-black/80' : 'text-emerald-400'
                          }`}>
                            ▶ No Ar {isItemFocused ? '• OK p/ Tela Cheia' : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      onClick={(e) => handleToggleFav(channel.stream_id, e)}
                      className={`p-2 rounded-lg transition ${
                        isItemFocused ? 'text-black hover:bg-black/10' : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'
                      }`}
                      title={isFav ? "Remover dos Favoritos" : "Favoritar"}
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
      <div className="flex-1 h-full p-6 flex flex-col justify-between select-none overflow-y-auto custom-scrollbar">
        <div>
          {currentPlayingChannel ? (
            <div className="space-y-4">
              {/* Mini Player de Prévia Lateral */}
              {!isFullScreen && (
                <div 
                  onClick={() => setFullScreenMode(true)}
                  className="w-full aspect-video bg-black rounded-2xl overflow-hidden border border-[#2a3449] shadow-2xl relative group cursor-pointer"
                  title="Clique para assistir em tela cheia"
                >
                  <Player
                    streamUrl={client.buildLiveHlsUrl(currentPlayingChannel.stream_id)}
                    fallbackUrl={client.buildLiveTsUrl(currentPlayingChannel.stream_id)}
                    title={currentPlayingChannel.name}
                    channelNum={currentPlayingChannel.num || selectedChannelIdx + 1}
                    logoUrl={currentPlayingChannel.stream_icon}
                    isFullScreen={false}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFullScreenMode(true);
                    }}
                    className="absolute bottom-4 right-4 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl font-black text-xs shadow-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Maximize2 className="w-4 h-4" />
                    <span>Expandir Tela Cheia [OK]</span>
                  </button>
                </div>
              )}

              {/* Informações e Ações do Canal Ativo */}
              <div className="bg-[#121722] border border-[#2a3449] p-5 rounded-2xl shadow-xl">
                <div className="flex items-center gap-4">
                  {currentPlayingChannel.stream_icon && (
                    <img
                      src={currentPlayingChannel.stream_icon}
                      alt=""
                      className="w-16 h-16 object-contain rounded-xl bg-black/40 p-1 border border-slate-700"
                    />
                  )}
                  <div className="flex-1">
                    <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded">
                      HLS TRANSMISSÃO ATIVA
                    </span>
                    <h3 className="text-xl font-bold text-white mt-1 leading-snug">
                      {currentPlayingChannel.name}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      Canal #{currentPlayingChannel.num || selectedChannelIdx + 1} • ID: {currentPlayingChannel.stream_id}
                    </p>
                  </div>
                </div>

                {/* Botões de Ação na Prévia */}
                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setFullScreenMode(true)}
                    className="flex-1 py-3 px-4 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-black flex items-center justify-center gap-2 cursor-pointer transition shadow-lg text-sm"
                  >
                    <Maximize2 className="w-4 h-4" />
                    <span>Confirmar Tela Cheia [OK]</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleToggleFav(currentPlayingChannel.stream_id, e)}
                    className={`py-3 px-4 rounded-xl font-bold flex items-center gap-2 cursor-pointer transition border text-sm ${
                      isCurrentPlayingFav
                        ? 'bg-amber-400/20 text-amber-300 border-amber-400/50 hover:bg-amber-400/30'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <Star className={`w-4 h-4 ${isCurrentPlayingFav ? 'fill-amber-400 text-amber-400' : ''}`} />
                    <span>{isCurrentPlayingFav ? 'Favoritado' : 'Favoritar'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full aspect-video bg-[#121722] rounded-2xl flex flex-col items-center justify-center text-slate-500 border border-[#2a3449]">
              <Tv className="w-16 h-16 mb-2 text-slate-600" />
              <p>Selecione um canal para carregar a prévia</p>
            </div>
          )}
        </div>

        {/* Dicas de Controle Remoto */}
        <div className="bg-[#121722]/60 border border-[#2a3449]/40 p-4 rounded-xl text-xs text-slate-400 flex items-center justify-between mt-4">
          <span>• <b>1º OK</b>: Carrega prévia • <b>2º OK</b>: Tela cheia • Tecla <b>F</b>: Favoritar</span>
          <span className="text-emerald-400 font-semibold">Zyveron Live Engine</span>
        </div>
      </div>
    </div>
  );
};
