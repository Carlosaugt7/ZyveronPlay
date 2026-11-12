import React, { useState, useEffect, useRef } from 'react';
import { XtreamClient } from '../lib/xtream';
import { XtreamCategory, XtreamStream } from '../types';
import { VirtualList } from '../components/VirtualList';
import { Player } from '../components/Player';
import { useSpatialNav } from '../hooks/useSpatialNav';
import { Star, Tv, Maximize2, Loader2, AlertCircle, ArrowLeft, ChevronLeft, ChevronRight, X, List, Layers } from 'lucide-react';
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

  // Gavetas laterais em Tela Cheia (Estilo APK Android TV)
  const [isChannelDrawerOpen, setIsChannelDrawerOpen] = useState<boolean>(false);
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState<boolean>(false);
  const [channelDrawerIdx, setChannelDrawerIdx] = useState<number>(0);
  const [categoryDrawerIdx, setCategoryDrawerIdx] = useState<number>(0);

  const [isLoadingChannels, setIsLoadingChannels] = useState<boolean>(true);
  const [favorites, setFavorites] = useState<number[]>(() => getFavorites('live'));
  const [activeFocusColumn, setActiveFocusColumn] = useState<'categories' | 'channels'>('channels');

  const categoriesContainerRef = useRef<HTMLDivElement>(null);
  const activeCategoryBtnRef = useRef<HTMLButtonElement>(null);
  const activeChannelBtnRef = useRef<HTMLButtonElement>(null);

  // Notifica o App sobre tela cheia para gerenciar barras do sistema
  const setFullScreenMode = (full: boolean) => {
    setIsFullScreen(full);
    onFullScreenChange?.(full);
    if (!full) {
      setIsChannelDrawerOpen(false);
      setIsCategoryDrawerOpen(false);
    }
  };

  // Carrega categorias ao iniciar
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
        if (isChannelDrawerOpen) {
          setChannelDrawerIdx((prev) => Math.max(0, prev - 1));
        } else if (isCategoryDrawerOpen) {
          setCategoryDrawerIdx((prev) => Math.max(0, prev - 1));
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
        if (isChannelDrawerOpen) {
          setChannelDrawerIdx((prev) => Math.min(filteredChannels.length - 1, prev + 1));
        } else if (isCategoryDrawerOpen) {
          setCategoryDrawerIdx((prev) => Math.min(categories.length + 1, prev + 1));
        } else if (filteredChannels.length > 0) {
          // Zapping em tela cheia (Próximo Canal)
          const nextIdx = (selectedChannelIdx + 1) % filteredChannels.length;
          setSelectedChannelIdx(nextIdx);
          setCurrentPlayingChannel(filteredChannels[nextIdx]);
        }
      } else if (activeFocusColumn === 'channels') {
        setSelectedChannelIdx((prev) => Math.min(filteredChannels.length - 1, prev + 1));
      } else if (activeFocusColumn === 'categories') {
        setSelectedCategoryIdx((prev) => Math.min(categories.length + 1, prev + 1));
      }
    },
    onLeft: () => {
      if (isFullScreen) {
        if (isCategoryDrawerOpen) {
          // Se o menu de categorias estiver aberto, fecha e abre os canais
          setIsCategoryDrawerOpen(false);
          setIsChannelDrawerOpen(true);
          setChannelDrawerIdx(selectedChannelIdx);
        } else if (!isChannelDrawerOpen) {
          // Abre a barra lateral esquerda (Lista de Canais da Categoria)
          setIsChannelDrawerOpen(true);
          setChannelDrawerIdx(selectedChannelIdx);
        }
        return;
      }
      if (activeFocusColumn === 'channels') {
        setActiveFocusColumn('categories');
      }
    },
    onRight: () => {
      if (isFullScreen) {
        if (isChannelDrawerOpen) {
          // Se o menu de canais estiver aberto, fecha e abre as categorias
          setIsChannelDrawerOpen(false);
          setIsCategoryDrawerOpen(true);
        } else if (!isCategoryDrawerOpen) {
          // Abre a barra lateral direita (Menu de Categorias)
          setIsCategoryDrawerOpen(true);
        }
        return;
      }
      if (activeFocusColumn === 'categories') {
        setActiveFocusColumn('channels');
      } else if (activeFocusColumn === 'channels' && filteredChannels[selectedChannelIdx]) {
        handleChannelSelectOrPlay(filteredChannels[selectedChannelIdx], selectedChannelIdx);
      }
    },
    onSelect: () => {
      if (isFullScreen) {
        if (isChannelDrawerOpen && filteredChannels[channelDrawerIdx]) {
          setSelectedChannelIdx(channelDrawerIdx);
          setCurrentPlayingChannel(filteredChannels[channelDrawerIdx]);
          setIsChannelDrawerOpen(false);
        } else if (isCategoryDrawerOpen) {
          if (categoryDrawerIdx === 0) {
            setSelectedCategory('all');
          } else if (categoryDrawerIdx === 1) {
            setSelectedCategory('favorites');
          } else if (categories[categoryDrawerIdx - 2]) {
            setSelectedCategory(categories[categoryDrawerIdx - 2].category_id);
          }
          setIsCategoryDrawerOpen(false);
          setIsChannelDrawerOpen(true);
          setChannelDrawerIdx(0);
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
        if (isChannelDrawerOpen) {
          setIsChannelDrawerOpen(false);
        } else if (isCategoryDrawerOpen) {
          setIsCategoryDrawerOpen(false);
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
    isChannelDrawerOpen,
    isCategoryDrawerOpen,
    channelDrawerIdx,
    categoryDrawerIdx,
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

  const currentCategoryName = selectedCategory === 'all'
    ? 'Todos os Canais'
    : selectedCategory === 'favorites'
    ? 'Meus Favoritos'
    : categories.find((c) => c.category_id === selectedCategory)?.category_name || 'Canais ao Vivo';

  return (
    <div className="w-full h-full flex bg-[#0a0d14] relative overflow-hidden select-none">
      
      {/* TELA CHEIA FIXADA (100% da tela) */}
      {isFullScreen && currentPlayingChannel && (
        <div className="fixed inset-0 z-[9999] w-screen h-screen bg-black">
          <Player
            streamUrl={client.buildLiveHlsUrl(currentPlayingChannel.stream_id)}
            fallbackUrl={client.buildLiveTsUrl(currentPlayingChannel.stream_id)}
            title={currentPlayingChannel.name}
            channelNum={currentPlayingChannel.num || selectedChannelIdx + 1}
            logoUrl={currentPlayingChannel.stream_icon}
            isLive={true}
            onBack={() => setFullScreenMode(false)}
            isFullScreen={true}
            disableSpatialNav={true}
          />

          {/* BARRA LATERAL ESQUERDA CLICÁVEL (Trigger flutuante para abrir Lista de Canais) */}
          {!isChannelDrawerOpen && (
            <div
              onClick={() => {
                setIsCategoryDrawerOpen(false);
                setIsChannelDrawerOpen(true);
                setChannelDrawerIdx(selectedChannelIdx);
              }}
              className="absolute left-0 inset-y-0 w-16 md:w-24 z-[10001] flex items-center justify-start cursor-pointer group"
              title="Abrir Lista de Canais desta Categoria"
            >
              <button
                type="button"
                className="py-10 px-3 bg-black/75 group-hover:bg-emerald-500 group-hover:text-black text-white rounded-r-2xl border-y border-r border-emerald-500/50 backdrop-blur-md flex flex-col items-center gap-2 transition-all duration-200 shadow-2xl group-hover:scale-105"
              >
                <ChevronLeft className="w-6 h-6 text-emerald-400 group-hover:text-black" />
                <span className="[writing-mode:vertical-lr] text-xs font-black tracking-widest uppercase">
                  Canais
                </span>
              </button>
            </div>
          )}

          {/* BARRA LATERAL DIREITA CLICÁVEL (Trigger flutuante para abrir Menu de Categorias) */}
          {!isCategoryDrawerOpen && (
            <div
              onClick={() => {
                setIsChannelDrawerOpen(false);
                setIsCategoryDrawerOpen(true);
              }}
              className="absolute right-0 inset-y-0 w-16 md:w-24 z-[10001] flex items-center justify-end cursor-pointer group"
              title="Abrir Menu de Categorias"
            >
              <button
                type="button"
                className="py-10 px-3 bg-black/75 group-hover:bg-sky-500 group-hover:text-black text-white rounded-l-2xl border-y border-l border-sky-500/50 backdrop-blur-md flex flex-col items-center gap-2 transition-all duration-200 shadow-2xl group-hover:scale-105"
              >
                <ChevronRight className="w-6 h-6 text-sky-400 group-hover:text-black" />
                <span className="[writing-mode:vertical-lr] text-xs font-black tracking-widest uppercase">
                  Categorias
                </span>
              </button>
            </div>
          )}

          {/* DRAWER LATERAL ESQUERDO: LISTA DE CANAIS DA CATEGORIA */}
          {isChannelDrawerOpen && (
            <div className="absolute inset-y-0 left-0 w-96 md:w-[440px] bg-black/95 backdrop-blur-xl border-r border-[#2a3449] z-[10002] flex flex-col p-5 animate-in slide-in-from-left duration-200 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <div className="flex items-center gap-2.5 text-white">
                  <List className="w-6 h-6 text-emerald-400" />
                  <div>
                    <h3 className="font-extrabold text-base md:text-lg text-white leading-tight">
                      {currentCategoryName}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      {filteredChannels.length} canais disponíveis
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsChannelDrawerOpen(false)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                {filteredChannels.map((channel, qIdx) => {
                  const isQuickFocused = channelDrawerIdx === qIdx;
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
                        setIsChannelDrawerOpen(false);
                      }}
                      className={`w-full text-left p-3.5 rounded-2xl flex items-center justify-between cursor-pointer transition select-none ${
                        isQuickFocused
                          ? 'bg-emerald-400 text-black font-black shadow-2xl scale-[1.02] ring-4 ring-emerald-300'
                          : isNowPlaying
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                          : 'bg-[#121722]/90 hover:bg-[#1b2234] text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <span className={`font-mono text-sm font-black w-8 ${isQuickFocused ? 'text-black' : 'text-slate-400'}`}>
                          {channel.num || qIdx + 1}
                        </span>
                        {channel.stream_icon ? (
                          <img
                            src={channel.stream_icon}
                            alt=""
                            className="w-10 h-10 object-contain rounded-lg bg-black/40 p-0.5"
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                            <Tv className="w-5 h-5" />
                          </div>
                        )}
                        <span className="font-bold text-base md:text-lg truncate max-w-[200px]">{channel.name}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isFav && <Star className="w-4 h-4 fill-amber-400 text-amber-400" />}
                        {isNowPlaying && (
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
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

              <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                <span>[▲/▼] Navegar • [OK] Trocar</span>
                <span>[▶] Ver Categorias</span>
              </div>
            </div>
          )}

          {/* DRAWER LATERAL DIREITO: MENU DE CATEGORIAS DE CANAIS */}
          {isCategoryDrawerOpen && (
            <div className="absolute inset-y-0 right-0 w-96 md:w-[440px] bg-black/95 backdrop-blur-xl border-l border-[#2a3449] z-[10002] flex flex-col p-5 animate-in slide-in-from-right duration-200 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <div className="flex items-center gap-2.5 text-white">
                  <Layers className="w-6 h-6 text-sky-400" />
                  <div>
                    <h3 className="font-extrabold text-base md:text-lg text-white leading-tight">
                      Categorias de Canais
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      Selecione para ver os canais
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCategoryDrawerOpen(false)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                {/* 1. Todos os Canais */}
                <button
                  type="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedCategory('all');
                    setSelectedCategoryIdx(0);
                    setIsCategoryDrawerOpen(false);
                    setIsChannelDrawerOpen(true);
                  }}
                  className={`w-full text-left p-4 rounded-2xl text-base md:text-lg font-bold transition cursor-pointer flex items-center justify-between ${
                    categoryDrawerIdx === 0
                      ? 'bg-sky-400 text-black font-black scale-[1.02] shadow-2xl ring-4 ring-sky-300'
                      : selectedCategory === 'all'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50'
                      : 'bg-[#121722]/90 hover:bg-[#1b2234] text-slate-200'
                  }`}
                >
                  <span>★ Todos os Canais</span>
                  <ChevronLeft className="w-5 h-5 opacity-60" />
                </button>

                {/* 2. Meus Favoritos */}
                <button
                  type="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedCategory('favorites');
                    setSelectedCategoryIdx(1);
                    setIsCategoryDrawerOpen(false);
                    setIsChannelDrawerOpen(true);
                  }}
                  className={`w-full text-left p-4 rounded-2xl text-base md:text-lg font-bold transition cursor-pointer flex items-center justify-between ${
                    categoryDrawerIdx === 1
                      ? 'bg-amber-400 text-black font-black scale-[1.02] shadow-2xl ring-4 ring-amber-300'
                      : selectedCategory === 'favorites'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                      : 'bg-[#121722]/90 hover:bg-[#1b2234] text-amber-300/90'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 fill-current text-amber-400" />
                    <span>Meus Favoritos</span>
                  </div>
                  <span className="font-mono text-sm px-2.5 py-0.5 rounded-lg bg-black/40 font-black">
                    {favorites.length}
                  </span>
                </button>

                {/* 3. Categorias da API */}
                {categories.map((cat, cIdx) => {
                  const targetIdx = cIdx + 2;
                  const isCatFocused = categoryDrawerIdx === targetIdx;
                  const isCatActive = selectedCategory === cat.category_id;

                  return (
                    <button
                      key={cat.category_id}
                      type="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedCategory(cat.category_id);
                        setSelectedCategoryIdx(targetIdx);
                        setIsCategoryDrawerOpen(false);
                        setIsChannelDrawerOpen(true);
                      }}
                      className={`w-full text-left p-4 rounded-2xl text-base md:text-lg font-bold transition cursor-pointer flex items-center justify-between ${
                        isCatFocused
                          ? 'bg-sky-400 text-black font-black scale-[1.02] shadow-2xl ring-4 ring-sky-300'
                          : isCatActive
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50'
                          : 'bg-[#121722]/90 hover:bg-[#1b2234] text-slate-200'
                      }`}
                    >
                      <span className="truncate max-w-[280px]">{cat.category_name}</span>
                      <ChevronLeft className="w-5 h-5 opacity-60" />
                    </button>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                <span>[▲/▼] Navegar • [OK] Selecionar</span>
                <span>[◀] Ver Canais</span>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Coluna 1: Categorias de Canais (Fonte Aumentada para Idosos e TVs) */}
      <div className={`w-80 lg:w-88 h-full bg-[#121722]/90 border-r border-[#2a3449] p-4 flex flex-col transition-all duration-200 shrink-0 ${
        isFocusedContent && activeFocusColumn === 'categories' ? 'ring-2 ring-emerald-500/60 bg-[#161d2b]' : ''
      }`}>
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <span>CATEGORIAS TV</span>
            <span className="text-sky-400 font-mono text-xs">({categories.length + 2})</span>
          </h2>
          {onBackToHome && (
            <button
              type="button"
              onClick={onBackToHome}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-sky-600 text-xs font-bold text-slate-200 hover:text-white transition cursor-pointer border border-slate-700"
              title="Voltar para a Home"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Início</span>
            </button>
          )}
        </div>

        <div ref={categoriesContainerRef} className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {/* 1. Todos os Canais */}
          <button
            ref={selectedCategoryIdx === 0 ? activeCategoryBtnRef : null}
            onClick={() => {
              setSelectedCategory('all');
              setSelectedCategoryIdx(0);
              setActiveFocusColumn('channels');
            }}
            tabIndex={0}
            className={`w-full text-left px-4 py-3.5 rounded-2xl text-base md:text-lg font-bold transition cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-emerald-500 text-black shadow font-black'
                : 'text-slate-200 hover:bg-[#1b2234] hover:text-white'
            } ${
              isFocusedContent && activeFocusColumn === 'categories' && selectedCategoryIdx === 0
                ? 'ring-4 ring-emerald-300 shadow-2xl scale-102 font-black outline-none bg-emerald-400 text-black'
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
            className={`w-full text-left px-4 py-3.5 rounded-2xl text-base md:text-lg font-bold transition cursor-pointer flex items-center justify-between ${
              selectedCategory === 'favorites'
                ? 'bg-amber-400 text-black shadow font-black'
                : 'text-amber-300 hover:bg-[#1b2234]'
            } ${
              isFocusedContent && activeFocusColumn === 'categories' && selectedCategoryIdx === 1
                ? 'ring-4 ring-amber-300 shadow-2xl scale-102 font-black outline-none bg-amber-400 text-black'
                : ''
            }`}
          >
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 fill-current text-amber-400" />
              <span>Meus Favoritos</span>
            </div>
            <span className="font-mono text-sm px-2.5 py-0.5 rounded-lg bg-black/40 font-black">
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
                className={`w-full text-left px-4 py-3.5 rounded-2xl text-base md:text-lg font-bold transition truncate cursor-pointer ${
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
      </div>

      {/* Coluna 2: Lista Virtualizada de Canais (Fonte Aumentada e Legível) */}
      <div className={`w-[400px] lg:w-[450px] h-full bg-[#0a0d14] border-r border-[#2a3449] flex flex-col p-4 select-none transition-all shrink-0 ${
        isFocusedContent && activeFocusColumn === 'channels' ? 'ring-2 ring-emerald-500/50' : ''
      }`}>
        <div className="flex items-center justify-between mb-3 px-2">
          <h2 className="text-base font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <span>CANAIS</span>
            <span className="text-sky-400 font-mono text-xs">({filteredChannels.length})</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono font-bold">
            [1º OK] Prévia • [2º OK] Tela Cheia
          </span>
        </div>

        {isLoadingChannels ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mb-3" />
            <span className="text-base font-semibold">Carregando canais...</span>
          </div>
        ) : filteredChannels.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-6 text-center">
            {selectedCategory === 'favorites' ? (
              <>
                <Star className="w-14 h-14 mb-3 text-amber-500/50" />
                <span className="text-base font-bold text-slate-200">Nenhum canal favoritado ainda.</span>
                <span className="text-xs text-slate-400 mt-1.5">Clique na estrela ao lado de um canal ou pressione a tecla 'F' no controle remoto.</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-10 h-10 mb-2" />
                <span className="text-sm">Nenhum canal nesta categoria.</span>
              </>
            )}
          </div>
        ) : (
          <div className="flex-1">
            <VirtualList
              items={filteredChannels}
              itemHeight={72}
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
                    className={`w-full h-[64px] px-3.5 rounded-2xl flex items-center justify-between cursor-pointer transition select-none text-left ${
                      isItemFocused
                        ? 'bg-emerald-400 text-black font-black shadow-2xl scale-[1.02] ring-4 ring-emerald-300'
                        : isNowPlayingInPreview
                        ? 'bg-emerald-500/20 border-2 border-emerald-500/60 text-white'
                        : isSelected
                        ? 'bg-[#1b2234] border border-slate-700 text-white'
                        : 'bg-[#121722]/90 hover:bg-[#1b2234] text-slate-200 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className={`font-mono text-sm font-black w-8 ${isItemFocused ? 'text-black' : 'text-slate-400'}`}>
                        {channel.num || index + 1}
                      </span>
                      {channel.stream_icon ? (
                        <img
                          src={channel.stream_icon}
                          alt=""
                          className="w-10 h-10 object-contain rounded-xl bg-black/40 p-0.5"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isItemFocused ? 'bg-black/20 text-black' : 'bg-[#1b2234] text-slate-500'}`}>
                          <Tv className="w-5 h-5" />
                        </div>
                      )}
                      <div className="truncate">
                        <span className="font-bold text-base md:text-lg block truncate max-w-[210px] leading-tight">{channel.name}</span>
                        {isNowPlayingInPreview && (
                          <span className={`text-[11px] font-black uppercase tracking-wider block mt-0.5 ${
                            isItemFocused ? 'text-black' : 'text-emerald-400'
                          }`}>
                            ▶ No Ar {isItemFocused ? '• [OK Novamente: Tela Cheia]' : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      onClick={(e) => handleToggleFav(channel.stream_id, e)}
                      className={`p-2.5 rounded-xl transition ${
                        isItemFocused ? 'text-black hover:bg-black/10' : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'
                      }`}
                      title={isFav ? "Remover dos Favoritos" : "Favoritar"}
                    >
                      <Star className={`w-5 h-5 ${isFav ? 'fill-amber-400 text-amber-400' : ''}`} />
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
                  className="w-full aspect-video bg-black rounded-3xl overflow-hidden border-2 border-[#2a3449] shadow-2xl relative group cursor-pointer"
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
                    className="absolute bottom-4 right-4 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-2xl font-black text-sm shadow-2xl transition flex items-center gap-2 cursor-pointer"
                  >
                    <Maximize2 className="w-4 h-4" />
                    <span>Expandir Tela Cheia [OK]</span>
                  </button>
                </div>
              )}

              {/* Informações e Ações do Canal Ativo */}
              <div className="bg-[#121722] border border-[#2a3449] p-6 rounded-3xl shadow-xl">
                <div className="flex items-center gap-5">
                  {currentPlayingChannel.stream_icon && (
                    <img
                      src={currentPlayingChannel.stream_icon}
                      alt=""
                      className="w-20 h-20 object-contain rounded-2xl bg-black/40 p-1.5 border border-slate-700"
                    />
                  )}
                  <div className="flex-1">
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-black tracking-wider uppercase rounded-lg">
                      HLS TRANSMISSÃO ATIVA
                    </span>
                    <h3 className="text-2xl font-black text-white mt-1.5 leading-snug">
                      {currentPlayingChannel.name}
                    </h3>
                    <p className="text-sm text-slate-400 font-mono mt-1">
                      Canal #{currentPlayingChannel.num || selectedChannelIdx + 1} • ID: {currentPlayingChannel.stream_id}
                    </p>
                  </div>
                </div>

                {/* Botões de Ação na Prévia */}
                <div className="flex items-center gap-3 mt-5 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setFullScreenMode(true)}
                    className="flex-1 py-4 px-5 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-black font-black flex items-center justify-center gap-2.5 cursor-pointer transition shadow-xl text-base"
                  >
                    <Maximize2 className="w-5 h-5" />
                    <span>Confirmar Tela Cheia [OK]</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleToggleFav(currentPlayingChannel.stream_id, e)}
                    className={`py-4 px-5 rounded-2xl font-bold flex items-center gap-2.5 cursor-pointer transition border text-base ${
                      isCurrentPlayingFav
                        ? 'bg-amber-400/20 text-amber-300 border-amber-400/50 hover:bg-amber-400/30'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <Star className={`w-5 h-5 ${isCurrentPlayingFav ? 'fill-amber-400 text-amber-400' : ''}`} />
                    <span>{isCurrentPlayingFav ? 'Favoritado' : 'Favoritar'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full aspect-video bg-[#121722] rounded-3xl flex flex-col items-center justify-center text-slate-500 border border-[#2a3449]">
              <Tv className="w-20 h-20 mb-3 text-slate-600" />
              <p className="text-base font-semibold">Selecione um canal para carregar a prévia</p>
            </div>
          )}
        </div>

        {/* Dicas de Controle Remoto */}
        <div className="bg-[#121722]/60 border border-[#2a3449]/40 p-4 rounded-2xl text-xs text-slate-400 flex items-center justify-between mt-4">
          <span>• <b>1º OK</b>: Prévia • <b>2º OK</b>: Tela cheia • Tecla <b>F</b>: Favoritar</span>
          <span className="text-emerald-400 font-bold">Zyveron Live Engine</span>
        </div>
      </div>
    </div>
  );
};
