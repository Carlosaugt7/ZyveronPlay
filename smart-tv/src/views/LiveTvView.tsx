import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { XtreamClient } from '../lib/xtream';
import { XtreamCategory, XtreamStream } from '../types';
import { VirtualList } from '../components/VirtualList';
import { Player } from '../components/Player';
import { useSpatialNav } from '../hooks/useSpatialNav';
import { Star, Tv, Maximize2, Loader2, AlertCircle, ArrowLeft, ChevronLeft, ChevronRight, X, List, Layers, Search, Lock, Clock, Trophy } from 'lucide-react';
import { getFavorites, toggleFavorite } from '../lib/storage';
import { AdultContentHelper } from '../lib/adultContent';
import { AdultPinModal } from '../components/AdultPinModal';
import { TvSearchModal } from '../components/TvSearchModal';
import { sortLiveCategories, groupLiveCategories, isSportsCategory } from '../lib/categorySorter';

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
  const [selectedCategory, setSelectedCategory] = useState<string>(() => (initialCategoryId === 'sports' ? 'sports' : 'all'));
  const [selectedCategoryIdx, setSelectedCategoryIdx] = useState<number>(() => (initialCategoryId === 'sports' ? 3 : 0));
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [totalLiveCount, setTotalLiveCount] = useState<number>(0);
  const [sportsCount, setSportsCount] = useState<number>(0);
  const [channels, setChannels] = useState<XtreamStream[]>([]);
  const [filteredChannels, setFilteredChannels] = useState<XtreamStream[]>([]);
  const [selectedChannelIdx, setSelectedChannelIdx] = useState<number>(0);
  const [currentPlayingChannel, setCurrentPlayingChannel] = useState<XtreamStream | null>(null);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  // Guia Unificado em Tela Cheia (Dual-Column: Categorias à Esquerda e Canais à Direita)
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [guideFocusColumn, setGuideFocusColumn] = useState<'categories' | 'channels' | 'search'>('channels');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);

  const [isLoadingChannels, setIsLoadingChannels] = useState<boolean>(true);
  const [favorites, setFavorites] = useState<number[]>(() => getFavorites('live'));
  const [activeFocusColumn, setActiveFocusColumn] = useState<'categories' | 'channels' | 'search'>('channels');
  const [previewConfirmedChannelId, setPreviewConfirmedChannelId] = useState<number | null>(null);

  // Controle Parental (PIN 0000 para Conteúdo Adulto)
  const [showAdultPinModal, setShowAdultPinModal] = useState<boolean>(false);
  const [pendingAdultCategory, setPendingAdultCategory] = useState<{ id: string; idx: number } | null>(null);

  // Canais filtrados por busca de texto (nome ou número com tratamento anti-crash)
  const displayedChannels = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) return filteredChannels;
    const q = searchQuery.toLowerCase().trim();
    return filteredChannels.filter((c) => {
      if (!c) return false;
      const name = (c.name || '').toLowerCase();
      const num = c.num != null ? String(c.num) : '';
      return name.includes(q) || num.includes(q);
    });
  }, [filteredChannels, searchQuery]);

  // Pastas Especiais Fixas e Categorias Agrupadas (Fiel à divisão do APK Android TV)
  const specialCats = useMemo(() => [
    { id: 'all', name: 'Todos os Canais', count: totalLiveCount, icon: Tv },
    { id: 'favorites', name: 'Meus Favoritos', count: favorites.length, icon: Star },
    { id: 'recent', name: 'Recém Adicionados', count: Math.min(50, totalLiveCount), icon: Clock },
    { id: 'sports', name: 'Guia de Jogos / Esportes', count: sportsCount, icon: Trophy },
  ], [totalLiveCount, favorites.length, sportsCount]);

  const groupedCats = useMemo(() => groupLiveCategories(categories), [categories]);

  const selectableCategories = useMemo(() => {
    const list: {
      id: string;
      name: string;
      count: number;
      isSpecial?: boolean;
      isAdult?: boolean;
      groupHeader?: string;
      icon?: any;
    }[] = [];

    specialCats.forEach((c) => {
      list.push({ ...c, isSpecial: true });
    });

    if (groupedCats.regional.length > 0) {
      groupedCats.regional.forEach((c, idx) => {
        list.push({
          id: c.category_id,
          name: c.category_name,
          count: categoryCounts[c.category_id] ?? 0,
          groupHeader: idx === 0 ? 'REGIONAIS & ABERTOS' : undefined
        });
      });
    }

    if (groupedCats.regular.length > 0) {
      groupedCats.regular.forEach((c, idx) => {
        list.push({
          id: c.category_id,
          name: c.category_name,
          count: categoryCounts[c.category_id] ?? 0,
          groupHeader: idx === 0 ? 'CANAIS TEMÁTICOS' : undefined
        });
      });
    }

    if (groupedCats.vinteQuatro.length > 0) {
      groupedCats.vinteQuatro.forEach((c, idx) => {
        list.push({
          id: c.category_id,
          name: c.category_name,
          count: categoryCounts[c.category_id] ?? 0,
          groupHeader: idx === 0 ? '── CANAIS 24 HORAS ──' : undefined
        });
      });
    }

    if (groupedCats.internacional.length > 0) {
      groupedCats.internacional.forEach((c, idx) => {
        list.push({
          id: c.category_id,
          name: c.category_name,
          count: categoryCounts[c.category_id] ?? 0,
          groupHeader: idx === 0 ? '── CANAIS INTERNACIONAIS ──' : undefined
        });
      });
    }

    if (groupedCats.adulto.length > 0) {
      groupedCats.adulto.forEach((c, idx) => {
        list.push({
          id: c.category_id,
          name: c.category_name,
          count: categoryCounts[c.category_id] ?? 0,
          isAdult: true,
          groupHeader: idx === 0 ? '── 🔒 CONTEÚDO ADULTO (+18) ──' : undefined
        });
      });
    }

    return list;
  }, [specialCats, groupedCats, categoryCounts]);

  // Sistema de Notificação Toast (Feedback visual de favoritos na TV)
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<any>(null);

  // Controle de visibilidade dos botões laterais em Tela Cheia (some em 2 segundos)
  const [showLateralTriggers, setShowLateralTriggers] = useState<boolean>(true);
  const lateralTriggersTimerRef = useRef<any>(null);

  const triggerLateralVisibility = useCallback(() => {
    setShowLateralTriggers(true);
    if (lateralTriggersTimerRef.current) clearTimeout(lateralTriggersTimerRef.current);
    lateralTriggersTimerRef.current = setTimeout(() => {
      setShowLateralTriggers(false);
    }, 2000);
  }, []);

  useEffect(() => {
    if (!isFullScreen) return;
    triggerLateralVisibility();

    const handleActivity = () => {
      triggerLateralVisibility();
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      if (lateralTriggersTimerRef.current) clearTimeout(lateralTriggersTimerRef.current);
    };
  }, [isFullScreen, triggerLateralVisibility]);

  // Controle de Long-Press para Mouse / Touch
  const longPressMouseTimer = useRef<any>(null);
  const isLongPressMouse = useRef<boolean>(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  }, []);

  const categoriesContainerRef = useRef<HTMLDivElement>(null);
  const backHomeBtnRef = useRef<HTMLButtonElement>(null);
  const activeCategoryBtnRef = useRef<HTMLButtonElement>(null);
  const activeChannelBtnRef = useRef<HTMLButtonElement>(null);
  const searchBtnRef = useRef<HTMLButtonElement>(null);
  const guideSearchBtnRef = useRef<HTMLButtonElement>(null);
  const activeGuideCategoryBtnRef = useRef<HTMLButtonElement>(null);

  // Notifica o App sobre tela cheia para gerenciar barras do sistema
  const setFullScreenMode = (full: boolean) => {
    setIsFullScreen(full);
    onFullScreenChange?.(full);
    if (!full) {
      setIsGuideOpen(false);
    }
  };

  // Alterna o estado de favorito de um canal
  const handleToggleFav = (streamId: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const isCurrentlyFav = favorites.includes(streamId);
    toggleFavorite(streamId, 'live');
    const newFavs = getFavorites('live');
    setFavorites(newFavs);

    const ch = channels.find((c) => c.stream_id === streamId) || filteredChannels.find((c) => c.stream_id === streamId) || currentPlayingChannel;
    const chName = ch ? ch.name : 'Canal';
    if (!isCurrentlyFav) {
      showToast(`⭐ ${chName} adicionado aos favoritos!`);
    } else {
      showToast(`☆ ${chName} removido dos favoritos!`);
    }
  };

  // Carrega categorias e contagens ao iniciar
  useEffect(() => {
    setFavorites(getFavorites('live'));
    client.getLiveCategories()
      .then((rawCats) => {
        const sortedCats = sortLiveCategories(rawCats || []);
        setCategories(sortedCats);
      })
      .catch((err) => console.error("Erro ao carregar categorias:", err));

    // Carrega contagens de canais por categoria e total de esportes
    client.getLiveStreams()
      .then((allStreams) => {
        if (allStreams && Array.isArray(allStreams)) {
          const counts: Record<string, number> = {};
          let spCount = 0;
          allStreams.forEach((s) => {
            const cid = String(s.category_id);
            counts[cid] = (counts[cid] || 0) + 1;
            const n = (s.name || '').toLowerCase();
            if (isSportsCategory(n)) spCount++;
          });
          setCategoryCounts(counts);
          setTotalLiveCount(allStreams.length);
          setSportsCount(spCount);
        }
      })
      .catch((err) => console.warn("Erro ao buscar contagens de canais:", err));
  }, [client, reloadKey]);

  // Se receber initialCategoryId vindo da Home
  useEffect(() => {
    if (!initialCategoryId) return;
    if (initialCategoryId === 'sports') {
      setSelectedCategory('sports');
      setSelectedCategoryIdx(3);
    } else {
      const idx = selectableCategories.findIndex((c) => c.id === initialCategoryId);
      if (idx !== -1) {
        setSelectedCategory(selectableCategories[idx].id);
        setSelectedCategoryIdx(idx);
      }
    }
  }, [initialCategoryId, selectableCategories.length]);

  // Carrega canais da categoria selecionada ou filtra por favoritos/recentes/esportes
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
          setPreviewConfirmedChannelId(null);
          if (favStreams.length > 0 && !currentPlayingChannel) {
            setCurrentPlayingChannel(favStreams[0]);
          }
        })
        .catch((err) => console.error("Erro ao carregar favoritos:", err))
        .finally(() => setIsLoadingChannels(false));
    } else if (selectedCategory === 'recent') {
      client.getLiveStreams()
        .then((streams) => {
          const all = streams || [];
          setChannels(all);
          const recentStreams = [...all].reverse().slice(0, 50);
          setFilteredChannels(recentStreams);
          setSelectedChannelIdx(0);
          setPreviewConfirmedChannelId(null);
          if (recentStreams.length > 0 && !currentPlayingChannel) {
            setCurrentPlayingChannel(recentStreams[0]);
          }
        })
        .catch((err) => console.error("Erro ao carregar recentes:", err))
        .finally(() => setIsLoadingChannels(false));
    } else if (selectedCategory === 'sports') {
      client.getLiveStreams()
        .then((streams) => {
          const all = streams || [];
          setChannels(all);
          const sportsStreams = all.filter((s) => isSportsCategory((s.name || '').toLowerCase()));
          setFilteredChannels(sportsStreams);
          setSelectedChannelIdx(0);
          setPreviewConfirmedChannelId(null);
          if (sportsStreams.length > 0 && !currentPlayingChannel) {
            setCurrentPlayingChannel(sportsStreams[0]);
          }
        })
        .catch((err) => console.error("Erro ao carregar esportes:", err))
        .finally(() => setIsLoadingChannels(false));
    } else {
      client.getLiveStreams(selectedCategory === 'all' ? undefined : selectedCategory)
        .then((streams) => {
          setChannels(streams || []);
          setFilteredChannels(streams || []);
          setSelectedChannelIdx(0);
          setPreviewConfirmedChannelId(null);
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
      if (activeFocusColumn === 'categories') {
        if (selectedCategoryIdx === -1 && backHomeBtnRef.current) {
          backHomeBtnRef.current.focus();
        } else if (activeCategoryBtnRef.current) {
          activeCategoryBtnRef.current.focus();
          activeCategoryBtnRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      } else if (activeFocusColumn === 'channels' && activeChannelBtnRef.current) {
        activeChannelBtnRef.current.focus();
      } else if (activeFocusColumn === 'search' && searchBtnRef.current) {
        searchBtnRef.current.focus();
      }
    }
  }, [selectedCategoryIdx, selectedChannelIdx, activeFocusColumn, isFocusedContent, isFullScreen]);

  // Força rolagem suave e foco no seletor de categorias do Guia em Tela Cheia
  useEffect(() => {
    if (isFullScreen && isGuideOpen) {
      if (guideFocusColumn === 'categories' && activeGuideCategoryBtnRef.current) {
        try {
          activeGuideCategoryBtnRef.current.focus({ preventScroll: true });
        } catch {
          activeGuideCategoryBtnRef.current.focus();
        }
        try {
          activeGuideCategoryBtnRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } catch {
          activeGuideCategoryBtnRef.current.scrollIntoView(false);
        }
      } else if (guideFocusColumn === 'search' && guideSearchBtnRef.current) {
        guideSearchBtnRef.current.focus();
      }
    }
  }, [isFullScreen, isGuideOpen, guideFocusColumn, selectedCategoryIdx]);

  // Ação de clique / seleção de categoria protegida
  const handleCategoryClick = (catId: string, catIndex: number, catName?: string) => {
    const isAdult = AdultContentHelper.isAdultCategory(catName);
    if (isAdult && !AdultContentHelper.isSessionUnlocked()) {
      setPendingAdultCategory({ id: catId, idx: catIndex });
      setShowAdultPinModal(true);
      return;
    }
    setSelectedCategory(catId);
    setSelectedCategoryIdx(catIndex);
    setActiveFocusColumn('channels');
  };

  // 1º Clique / Enter: Seleciona o canal e carrega na prévia lateral
  // 2º Clique / Enter no mesmo canal ativo: Confirma e expande para tela cheia
  const handleChannelSelectOrPlay = (channel: XtreamStream, index: number) => {
    setSelectedChannelIdx(index);
    if (previewConfirmedChannelId === channel.stream_id) {
      // 2º clique: confirma e expande para tela cheia!
      setFullScreenMode(true);
    } else {
      // 1º clique: seleciona o canal e carrega na prévia
      setPreviewConfirmedChannelId(channel.stream_id);
      setCurrentPlayingChannel(channel);
    }
  };

  // Teclas do Controle Remoto (D-Pad para Smart TV)
  useSpatialNav({
    onUp: () => {
      if (isFullScreen) {
        if (isGuideOpen) {
          if (guideFocusColumn === 'channels') {
            if (selectedChannelIdx === 0) {
              setGuideFocusColumn('search');
              guideSearchBtnRef.current?.focus();
            } else {
              setSelectedChannelIdx((prev) => Math.max(0, prev - 1));
            }
          } else if (guideFocusColumn === 'categories') {
            if (selectedCategoryIdx === 0) {
              setGuideFocusColumn('search');
              guideSearchBtnRef.current?.focus();
            } else {
              setSelectedCategoryIdx((prev) => {
                const next = Math.max(0, prev - 1);
                const item = selectableCategories[next];
                if (item) setSelectedCategory(item.id);
                return next;
              });
            }
          }
        } else if (displayedChannels.length > 0) {
          // Zapping em tela cheia (Canal Anterior)
          const nextIdx = (selectedChannelIdx - 1 + displayedChannels.length) % displayedChannels.length;
          setSelectedChannelIdx(nextIdx);
          setCurrentPlayingChannel(displayedChannels[nextIdx]);
        }
      } else if (activeFocusColumn === 'channels') {
        if (selectedChannelIdx === 0) {
          setActiveFocusColumn('search');
          searchBtnRef.current?.focus();
        } else {
          setSelectedChannelIdx((prev) => {
            const next = Math.max(0, prev - 1);
            setPreviewConfirmedChannelId(null);
            return next;
          });
        }
      } else if (activeFocusColumn === 'search') {
        // Já no topo do campo de busca
      } else if (activeFocusColumn === 'categories') {
        setSelectedCategoryIdx((prev) => {
          // Permite subir foco até o botão Voltar/Início (-1)
          if (prev <= 0) return -1;
          return prev - 1;
        });
      }
    },
    onDown: () => {
      if (isFullScreen) {
        if (isGuideOpen) {
          if (guideFocusColumn === 'search') {
            setGuideFocusColumn('channels');
          } else if (guideFocusColumn === 'categories') {
            setSelectedCategoryIdx((prev) => {
              const next = Math.min(selectableCategories.length - 1, prev + 1);
              const item = selectableCategories[next];
              if (item) setSelectedCategory(item.id);
              return next;
            });
          } else {
            setSelectedChannelIdx((prev) => Math.min(displayedChannels.length - 1, prev + 1));
          }
        } else if (displayedChannels.length > 0) {
          // Zapping em tela cheia (Próximo Canal)
          const nextIdx = (selectedChannelIdx + 1) % displayedChannels.length;
          setSelectedChannelIdx(nextIdx);
          setCurrentPlayingChannel(displayedChannels[nextIdx]);
        }
      } else if (activeFocusColumn === 'search') {
        setActiveFocusColumn('channels');
        setSelectedChannelIdx(0);
      } else if (activeFocusColumn === 'channels') {
        setSelectedChannelIdx((prev) => {
          const next = Math.min(displayedChannels.length - 1, prev + 1);
          setPreviewConfirmedChannelId(null);
          return next;
        });
      } else if (activeFocusColumn === 'categories') {
        setSelectedCategoryIdx((prev) => {
          if (prev === -1) return 0;
          return Math.min(selectableCategories.length - 1, prev + 1);
        });
      }
    },
    onLeft: () => {
      if (isFullScreen) {
        if (!isGuideOpen) {
          setIsGuideOpen(true);
          setGuideFocusColumn('categories');
        } else if (guideFocusColumn === 'channels' || guideFocusColumn === 'search') {
          setGuideFocusColumn('categories');
        }
        return;
      }
      if (activeFocusColumn === 'channels' || activeFocusColumn === 'search') {
        setActiveFocusColumn('categories');
        if (activeFocusColumn === 'search') {
          setSelectedCategoryIdx(-1);
        }
      }
    },
    onRight: () => {
      if (isFullScreen) {
        if (!isGuideOpen) {
          setIsGuideOpen(true);
          setGuideFocusColumn('channels');
        } else if (guideFocusColumn === 'categories') {
          setGuideFocusColumn('channels');
        }
        return;
      }
      if (activeFocusColumn === 'categories') {
        if (selectedCategoryIdx === -1) {
          setActiveFocusColumn('search');
          searchBtnRef.current?.focus();
          return;
        }
        setActiveFocusColumn('channels');
      } else if (activeFocusColumn === 'channels' && displayedChannels[selectedChannelIdx]) {
        handleChannelSelectOrPlay(displayedChannels[selectedChannelIdx], selectedChannelIdx);
      }
    },
    onSelect: () => {
      if (isFullScreen) {
        if (!isGuideOpen) {
          setIsGuideOpen(true);
          setGuideFocusColumn('channels');
          return;
        }
        if (guideFocusColumn === 'search') {
          setIsSearchModalOpen(true);
          return;
        }
        if (guideFocusColumn === 'categories') {
          const item = selectableCategories[selectedCategoryIdx];
          if (item) {
            setSelectedCategory(item.id);
          }
          setGuideFocusColumn('channels');
        } else if (guideFocusColumn === 'channels' && displayedChannels[selectedChannelIdx]) {
          setCurrentPlayingChannel(displayedChannels[selectedChannelIdx]);
          setIsGuideOpen(false);
        }
        return;
      }
      if (activeFocusColumn === 'search') {
        setIsSearchModalOpen(true);
        return;
      }
      if (activeFocusColumn === 'categories') {
        if (selectedCategoryIdx === -1) {
          onBackToHome?.();
          return;
        }
        const item = selectableCategories[selectedCategoryIdx];
        if (item) {
          if (item.isSpecial) {
            setSelectedCategory(item.id);
            setActiveFocusColumn('channels');
          } else {
            handleCategoryClick(item.id, selectedCategoryIdx, item.name);
          }
        }
      } else if (activeFocusColumn === 'channels' && displayedChannels[selectedChannelIdx]) {
        handleChannelSelectOrPlay(displayedChannels[selectedChannelIdx], selectedChannelIdx);
      }
    },
    // Segurar botão OK por até 2 segundos: Favoritar/Desfavoritar
    onLongSelect: () => {
      const target = isFullScreen
        ? (isGuideOpen ? displayedChannels[selectedChannelIdx] : currentPlayingChannel)
        : (displayedChannels[selectedChannelIdx] || currentPlayingChannel);
      if (target) {
        handleToggleFav(target.stream_id);
      }
    },
    // Botão Verde: Favoritar/Desfavoritar canal
    onGreen: () => {
      const target = isFullScreen
        ? (isGuideOpen ? displayedChannels[selectedChannelIdx] : currentPlayingChannel)
        : (displayedChannels[selectedChannelIdx] || currentPlayingChannel);
      if (target) {
        handleToggleFav(target.stream_id);
      }
    },
    // Botão Amarelo: Alternar filtro de Favoritos
    onYellow: () => {
      if (selectedCategory === 'favorites') {
        setSelectedCategory('all');
        setSelectedCategoryIdx(0);
      } else {
        setSelectedCategory('favorites');
        setSelectedCategoryIdx(1);
      }
      setActiveFocusColumn('channels');
    },
    // Botão Vermelho: Menu de Categorias / Guia
    onRed: () => {
      if (isFullScreen) {
        setIsGuideOpen((prev) => !prev);
        setGuideFocusColumn('categories');
      } else {
        setActiveFocusColumn((prev) => (prev === 'categories' ? 'channels' : 'categories'));
      }
    },
    // Botão Azul: Recarregar Lista
    onBlue: () => {
      showToast('Sincronizando grade de canais...');
    },
    onBack: () => {
      if (showAdultPinModal) {
        setShowAdultPinModal(false);
        setPendingAdultCategory(null);
        return;
      }
      if (isFullScreen) {
        if (isGuideOpen) {
          if (guideFocusColumn === 'search') {
            if (searchQuery) {
              setSearchQuery('');
            } else {
              setGuideFocusColumn('channels');
            }
            return;
          }
          if (guideFocusColumn === 'channels') {
            setGuideFocusColumn('categories');
          } else {
            setIsGuideOpen(false);
          }
          return;
        }
        setFullScreenMode(false);
        return;
      }
      if (activeFocusColumn === 'search') {
        if (searchQuery) {
          setSearchQuery('');
        } else {
          setActiveFocusColumn('channels');
        }
        return;
      }
      onBackToHome?.();
    },
    disabled: !isFocusedContent || showAdultPinModal || isSearchModalOpen,
    priority: 15
  }, [
    isFullScreen,
    isGuideOpen,
    guideFocusColumn,
    activeFocusColumn,
    selectedCategoryIdx,
    selectedChannelIdx,
    displayedChannels,
    categories,
    currentPlayingChannel,
    isFocusedContent,
    previewConfirmedChannelId,
    selectedCategory,
    showAdultPinModal,
    isSearchModalOpen,
    onBackToHome
  ]);

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

          {/* BARRA FLUTUANTE DE GATILHO (Some após 2 segundos de inatividade) */}
          {!isGuideOpen && (
            <div
              onClick={() => {
                setIsGuideOpen(true);
                setGuideFocusColumn('channels');
              }}
              className={`absolute left-0 inset-y-0 w-16 md:w-20 z-[10001] flex items-center justify-start cursor-pointer group transition-opacity duration-300 ${
                showLateralTriggers ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
              title="Abrir Guia de Canais e Categorias [◀ ou ▶]"
            >
              <button
                type="button"
                className="py-8 px-2.5 bg-black/80 group-hover:bg-emerald-500 group-hover:text-black text-white rounded-r-2xl border-y border-r border-emerald-500/50 backdrop-blur-md flex flex-col items-center gap-2 transition-all duration-200 shadow-2xl group-hover:scale-105"
              >
                <List className="w-5 h-5 text-emerald-400 group-hover:text-black" />
                <span className="[writing-mode:vertical-lr] text-[11px] font-black tracking-widest uppercase">
                  Guia
                </span>
              </button>
            </div>
          )}

          {/* GUIA DE PROGRAMAÇÃO DUAL-COLUMN EM TELA CHEIA (ESTILO RECEPTOR / APK ANDROID TV) */}
          {isGuideOpen && (
            <div className="absolute inset-y-0 left-0 w-[880px] lg:w-[980px] max-w-[96vw] bg-black/95 backdrop-blur-2xl border-r border-[#2a3449] z-[10002] flex flex-col p-4 animate-in slide-in-from-left duration-200 shadow-2xl">
              {/* Topo do Guia: Título + Campo de Busca Rápida + Fechar */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3 gap-4">
                <div className="flex items-center gap-2.5 text-white">
                  <Tv className="w-7 h-7 text-emerald-400" />
                  <div>
                    <h3 className="font-extrabold text-lg md:text-xl text-white leading-tight">
                      Guia de Canais • {currentCategoryName}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      {displayedChannels.length} canais disponíveis
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Busca Rápida no Guia */}
                  <button
                    type="button"
                    ref={guideSearchBtnRef}
                    tabIndex={0}
                    onClick={() => setIsSearchModalOpen(true)}
                    className={`relative w-64 md:w-72 px-3.5 py-2 bg-slate-900 border rounded-xl flex items-center justify-between transition cursor-pointer select-none text-left ${
                      guideFocusColumn === 'search'
                        ? 'border-emerald-400 ring-4 ring-emerald-400/80 bg-slate-800'
                        : 'border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                      <Search className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className={`text-xs truncate ${searchQuery ? 'text-emerald-300 font-bold' : 'text-slate-400'}`}>
                        {searchQuery ? `"${searchQuery}"` : 'Buscar canal...'}
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
                        <X className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-mono shrink-0">
                        [OK]
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsGuideOpen(false)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition cursor-pointer"
                    title="Fechar Guia [VOLTAR]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Corpo: Duas Colunas Lado a Lado (Categorias na Esquerda + Canais na Direita) */}
              <div className="flex-1 flex gap-3 overflow-hidden">
                {/* Coluna 1: Categorias (Esquerda, w-72 lg:w-80) */}
                <div className={`w-72 lg:w-80 bg-[#121722]/90 border border-slate-800 rounded-2xl p-2.5 overflow-y-auto space-y-2 custom-scrollbar ${
                  guideFocusColumn === 'categories' ? 'ring-2 ring-emerald-500/60' : ''
                }`}>
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400 px-2 block mb-1">
                    CATEGORIAS
                  </span>

                  {selectableCategories.map((item, idx) => {
                    const isFocused = guideFocusColumn === 'categories' && selectedCategoryIdx === idx;
                    const isSelected = selectedCategory === item.id;

                    return (
                      <React.Fragment key={`guide-${item.id}-${idx}`}>
                        {item.groupHeader && (
                          <div className="pt-2 pb-1 px-2 text-[11px] font-black tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                            <span className="h-px bg-slate-700/60 flex-1"></span>
                            <span className="truncate">{item.groupHeader}</span>
                            <span className="h-px bg-slate-700/60 flex-1"></span>
                          </div>
                        )}
                        <button
                          type="button"
                          ref={isFocused ? activeGuideCategoryBtnRef : null}
                          tabIndex={0}
                          onClick={() => {
                            if (item.isAdult && !AdultContentHelper.isSessionUnlocked()) {
                              setPendingAdultCategory({ id: item.id, idx });
                              setShowAdultPinModal(true);
                              return;
                            }
                            setSelectedCategory(item.id);
                            setSelectedCategoryIdx(idx);
                            setGuideFocusColumn('channels');
                          }}
                          className={`w-full text-left px-4 py-3 rounded-2xl text-base md:text-lg font-bold transition cursor-pointer flex items-center justify-between ${
                            isFocused
                              ? item.isAdult
                                ? 'bg-rose-500 text-white font-black ring-2 ring-rose-300 shadow'
                                : item.id === 'favorites'
                                ? 'bg-amber-400 text-black font-black ring-2 ring-amber-300 shadow'
                                : item.id === 'sports'
                                ? 'bg-sky-400 text-black font-black ring-2 ring-sky-300 shadow'
                                : 'bg-emerald-400 text-black font-black ring-2 ring-emerald-300 shadow'
                              : isSelected
                              ? item.isAdult
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : item.id === 'favorites'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : item.id === 'sports'
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : item.isAdult
                              ? 'text-rose-400 hover:bg-slate-800'
                              : item.id === 'favorites'
                              ? 'text-amber-300/90 hover:bg-slate-800'
                              : item.id === 'sports'
                              ? 'text-sky-300 hover:bg-slate-800'
                              : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <span className="truncate">{item.name}</span>
                          <span className="text-xs md:text-sm font-mono font-black shrink-0 ml-2 opacity-80">{item.count}</span>
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Coluna 2: Canais da Categoria (Direita, flex-1 com Virtualização Leve) */}
                <div className={`flex-1 bg-[#0a0d14] border border-slate-800 rounded-2xl p-2.5 flex flex-col overflow-hidden ${
                  guideFocusColumn === 'channels' ? 'ring-2 ring-emerald-500/60' : ''
                }`}>
                  {isLoadingChannels ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                      <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-2" />
                      <span className="text-base font-semibold">Carregando canais da categoria...</span>
                    </div>
                  ) : displayedChannels.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-4 text-center">
                      <AlertCircle className="w-8 h-8 mb-2" />
                      <span className="text-base font-semibold">Nenhum canal encontrado nesta categoria.</span>
                    </div>
                  ) : (
                    <div className="flex-1 min-h-0 w-full overflow-hidden">
                      <VirtualList
                        items={displayedChannels}
                        itemHeight={78}
                        selectedIndex={guideFocusColumn === 'channels' ? selectedChannelIdx : -1}
                        renderItem={(channel, index, isSelected) => {
                          const isItemFocused = isSelected && guideFocusColumn === 'channels';
                          const isNowPlaying = currentPlayingChannel?.stream_id === channel.stream_id;
                          const isFav = favorites.includes(channel.stream_id);

                          return (
                            <button
                              key={channel.stream_id}
                              type="button"
                              onClick={() => {
                                setSelectedChannelIdx(index);
                                setCurrentPlayingChannel(channel);
                                setIsGuideOpen(false);
                              }}
                              className={`w-full h-[70px] px-4 rounded-2xl flex items-center justify-between cursor-pointer transition select-none text-left ${
                                isItemFocused
                                  ? 'bg-emerald-400 text-black font-black shadow-xl ring-2 ring-emerald-300 scale-[1.01]'
                                  : isNowPlaying
                                  ? 'bg-emerald-500/20 border border-emerald-500/60 text-white'
                                  : 'bg-[#121722]/80 hover:bg-[#1b2234] text-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0 pr-2">
                                <span className={`font-mono text-sm md:text-base font-black w-9 shrink-0 ${isItemFocused ? 'text-black' : 'text-slate-400'}`}>
                                  {channel.num || index + 1}
                                </span>
                                {channel.stream_icon ? (
                                  <img
                                    src={channel.stream_icon}
                                    alt=""
                                    className="w-10 h-10 object-contain rounded-xl bg-black/40 p-0.5 shrink-0"
                                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                                    <Tv className="w-5 h-5 text-slate-400" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <span className="font-extrabold text-base md:text-lg block truncate leading-tight">{channel.name}</span>
                                  {isNowPlaying && (
                                    <span className={`text-xs font-black uppercase tracking-wider block mt-0.5 ${isItemFocused ? 'text-black' : 'text-emerald-400'}`}>
                                      ▶ No Ar
                                    </span>
                                  )}
                                </div>
                              </div>
                              {isFav && <Star className={`w-5 h-5 fill-amber-400 text-amber-400 shrink-0 ml-2 ${isItemFocused ? 'text-black fill-black' : ''}`} />}
                            </button>
                          );
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Rodapé: Dicas de Controle Remoto */}
              <div className="pt-2.5 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                <span>[◀/▶] Alternar Colunas • [▲/▼] Navegar • [OK] Trocar de Canal</span>
                <span>[VOLTAR] Fechar Guia</span>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Coluna 1: Categorias de Canais (Fonte Aumentada para Idosos e TVs) */}
      <div className={`w-84 lg:w-96 h-full bg-[#121722]/90 border-r border-[#2a3449] p-4 flex flex-col transition-all duration-200 shrink-0 ${
        isFocusedContent && activeFocusColumn === 'categories' ? 'ring-2 ring-emerald-500/60 bg-[#161d2b]' : ''
      }`}>
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-base font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <span>CATEGORIAS TV</span>
            <span className="text-sky-400 font-mono text-sm">({categories.length + 2})</span>
          </h2>
          {onBackToHome && (
            <button
              ref={backHomeBtnRef}
              type="button"
              onClick={onBackToHome}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition cursor-pointer border shadow ${
                isFocusedContent && activeFocusColumn === 'categories' && selectedCategoryIdx === -1
                  ? 'bg-rose-600 text-white font-black ring-4 ring-rose-400 scale-105 border-white shadow-xl'
                  : 'bg-slate-800 hover:bg-sky-600 text-xs font-black text-slate-200 hover:text-white border-slate-700'
              }`}
              title="Voltar para a Home"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Início</span>
            </button>
          )}
        </div>

        <div ref={categoriesContainerRef} className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
          {selectableCategories.map((item, idx) => {
            const isCatFocused = isFocusedContent && activeFocusColumn === 'categories' && selectedCategoryIdx === idx;
            const isSelected = selectedCategory === item.id;
            const Icon = item.icon;

            return (
              <React.Fragment key={`${item.id}-${idx}`}>
                {item.groupHeader && (
                  <div className="pt-4 pb-1.5 px-3 text-xs font-black tracking-wider text-slate-400 uppercase flex items-center gap-2">
                    <span className="h-px bg-slate-700/60 flex-1"></span>
                    <span>{item.groupHeader}</span>
                    <span className="h-px bg-slate-700/60 flex-1"></span>
                  </div>
                )}
                <button
                  type="button"
                  ref={isCatFocused ? activeCategoryBtnRef : null}
                  onClick={() => {
                    setSelectedCategoryIdx(idx);
                    if (item.isSpecial) {
                      setSelectedCategory(item.id);
                      setActiveFocusColumn('channels');
                    } else {
                      handleCategoryClick(item.id, idx, item.name);
                    }
                  }}
                  tabIndex={0}
                  className={`w-full text-left px-5 py-4 rounded-2xl text-lg md:text-xl font-black transition truncate cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? item.isAdult
                        ? 'bg-rose-500 text-white font-black shadow'
                        : item.id === 'favorites'
                        ? 'bg-amber-400 text-black shadow font-black'
                        : item.id === 'sports'
                        ? 'bg-sky-500 text-black font-black shadow'
                        : 'bg-emerald-500 text-black font-black shadow'
                      : item.isAdult
                      ? 'text-rose-400 hover:bg-rose-950/30'
                      : item.id === 'favorites'
                      ? 'text-amber-300 hover:bg-[#1b2234]'
                      : item.id === 'sports'
                      ? 'text-sky-300 hover:bg-[#1b2234]'
                      : 'text-slate-200 hover:bg-[#1b2234] hover:text-white'
                  } ${
                    isCatFocused
                      ? item.isAdult
                        ? 'ring-4 ring-rose-400 shadow-2xl scale-102 font-black outline-none bg-rose-500 text-white'
                        : item.id === 'favorites'
                        ? 'ring-4 ring-amber-300 shadow-2xl scale-102 font-black outline-none bg-amber-400 text-black'
                        : item.id === 'sports'
                        ? 'ring-4 ring-sky-300 shadow-2xl scale-102 font-black outline-none bg-sky-400 text-black'
                        : 'ring-4 ring-emerald-300 shadow-2xl scale-102 font-black outline-none bg-emerald-400 text-black'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {Icon && <Icon className="w-6 h-6 shrink-0" />}
                    <span className="truncate">{item.name}</span>
                    {item.isAdult && <Lock className="w-4 h-4 ml-1 shrink-0 opacity-80" />}
                  </div>
                  <span className={`font-mono text-xs md:text-sm px-2.5 py-0.5 rounded-lg ml-2 shrink-0 ${
                    isCatFocused
                      ? 'bg-black/30 text-black font-black'
                      : isSelected
                      ? 'bg-black/40 text-white font-black'
                      : 'bg-slate-800/80 text-slate-400'
                  }`}>
                    {item.count}
                  </span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Coluna 2: Lista Virtualizada de Canais (Fonte Aumentada e Legível) */}
      <div className={`w-[430px] lg:w-[490px] h-full bg-[#0a0d14] border-r border-[#2a3449] flex flex-col p-4 select-none transition-all shrink-0 ${
        isFocusedContent && activeFocusColumn === 'channels' ? 'ring-2 ring-emerald-500/50' : ''
      }`}>
        <div className="flex items-center justify-between mb-3 px-2">
          <h2 className="text-base font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <span>CANAIS</span>
            <span className="text-sky-400 font-mono text-sm">({displayedChannels.length})</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono font-bold">
            [1º OK] Prévia • [2º OK] Tela Cheia
          </span>
        </div>

        {/* Campo de Pesquisa em Canais */}
        <button
          type="button"
          ref={searchBtnRef}
          tabIndex={0}
          onClick={() => setIsSearchModalOpen(true)}
          className={`w-full mb-3 px-4 py-2.5 bg-slate-900 border rounded-xl flex items-center justify-between transition cursor-pointer select-none text-left ${
            isFocusedContent && activeFocusColumn === 'search'
              ? 'border-emerald-400 ring-4 ring-emerald-400/80 bg-slate-800'
              : 'border-slate-700 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center gap-3 overflow-hidden flex-1">
            <Search className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className={`text-sm truncate ${searchQuery ? 'text-emerald-300 font-bold' : 'text-slate-400'}`}>
              {searchQuery ? `Pesquisando: "${searchQuery}"` : 'Buscar canal por nome ou número...'}
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
            <span className="text-xs text-slate-500 font-mono shrink-0 hidden sm:inline">
              [OK: Buscar]
            </span>
          )}
        </button>

        {isLoadingChannels ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mb-3" />
            <span className="text-base font-semibold">Carregando canais...</span>
          </div>
        ) : displayedChannels.length === 0 ? (
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
                <span className="text-base font-semibold">Nenhum canal encontrado.</span>
              </>
            )}
          </div>
        ) : (
          <div className="flex-1 min-h-0 w-full overflow-hidden">
            <VirtualList
              items={displayedChannels}
              itemHeight={80}
              selectedIndex={selectedChannelIdx}
              renderItem={(channel, index, isSelected) => {
                const isFav = favorites.includes(channel.stream_id);
                const isItemFocused = isSelected && isFocusedContent && activeFocusColumn === 'channels';
                const isNowPlayingInPreview = currentPlayingChannel?.stream_id === channel.stream_id;
                const isConfirmed = previewConfirmedChannelId === channel.stream_id;

                return (
                  <button
                    type="button"
                    tabIndex={0}
                    ref={isItemFocused ? activeChannelBtnRef : null}
                    onClick={() => {
                      if (isLongPressMouse.current) {
                        isLongPressMouse.current = false;
                        return;
                      }
                      handleChannelSelectOrPlay(channel, index);
                    }}
                    onDoubleClick={() => {
                      setSelectedChannelIdx(index);
                      setCurrentPlayingChannel(channel);
                      setFullScreenMode(true);
                    }}
                    onMouseDown={() => {
                      isLongPressMouse.current = false;
                      longPressMouseTimer.current = setTimeout(() => {
                        isLongPressMouse.current = true;
                        handleToggleFav(channel.stream_id);
                      }, 1500);
                    }}
                    onMouseUp={() => {
                      if (longPressMouseTimer.current) {
                        clearTimeout(longPressMouseTimer.current);
                        longPressMouseTimer.current = null;
                      }
                    }}
                    onTouchStart={() => {
                      isLongPressMouse.current = false;
                      longPressMouseTimer.current = setTimeout(() => {
                        isLongPressMouse.current = true;
                        handleToggleFav(channel.stream_id);
                      }, 1500);
                    }}
                    onTouchEnd={() => {
                      if (longPressMouseTimer.current) {
                        clearTimeout(longPressMouseTimer.current);
                        longPressMouseTimer.current = null;
                      }
                    }}
                    className={`w-full h-[72px] px-4 rounded-2xl flex items-center justify-between cursor-pointer transition select-none text-left ${
                      isItemFocused
                        ? 'bg-emerald-400 text-black font-black shadow-2xl scale-[1.02] ring-4 ring-emerald-300'
                        : isNowPlayingInPreview
                        ? 'bg-emerald-500/20 border-2 border-emerald-500/60 text-white'
                        : isSelected
                        ? 'bg-[#1b2234] border border-slate-700 text-white'
                        : 'bg-[#121722]/90 hover:bg-[#1b2234] text-slate-200 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 overflow-hidden flex-1 min-w-0 pr-2">
                      <span className={`font-mono text-base md:text-lg font-black w-9 shrink-0 ${isItemFocused ? 'text-black' : 'text-slate-400'}`}>
                        {channel.num || index + 1}
                      </span>
                      {channel.stream_icon ? (
                        <img
                          src={channel.stream_icon}
                          alt=""
                          className="w-11 h-11 object-contain rounded-xl bg-black/40 p-0.5 shrink-0"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${isItemFocused ? 'bg-black/20 text-black' : 'bg-[#1b2234] text-slate-500'}`}>
                          <Tv className="w-6 h-6" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="font-black text-lg md:text-xl block truncate leading-tight">{channel.name}</span>
                        {isNowPlayingInPreview && (
                          <span className={`text-xs font-black uppercase tracking-wider block mt-1 ${
                            isItemFocused ? 'text-black' : 'text-emerald-400'
                          }`}>
                            ▶ No Ar {isConfirmed ? '• [OK: Tela Cheia]' : '• [Prévia Ativa]'}
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
                    disableSpatialNav={true}
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

        {/* Barra de Atalhos e Legenda dos Botões do Controle Remoto */}
        <div className="bg-[#121722]/95 border border-[#2a3449] p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 mt-4 text-xs select-none shadow-xl">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Botão Verde */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-extrabold shadow-sm">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-400 shadow-md shadow-emerald-500/50 inline-block animate-pulse" />
              <span>Botão Verde: Favorita/Desfavorita</span>
            </div>

            {/* Segurar OK 2s */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-200 font-bold">
              <span>[Segurar OK 2s] Favoritar</span>
            </div>

            {/* Botão Amarelo */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold">
              <span className="w-3.5 h-3.5 rounded-full bg-amber-400 inline-block" />
              <span>[Amarelo] Meus Favoritos</span>
            </div>

            {/* Botão Vermelho */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold">
              <span className="w-3.5 h-3.5 rounded-full bg-rose-400 inline-block" />
              <span>[Vermelho] Categorias</span>
            </div>
          </div>

          <div className="text-slate-300 font-semibold text-xs flex items-center gap-2">
            <span className="text-emerald-400 font-bold">• 1º OK: Seleciona canal</span>
            <span>• 2º OK: Tela cheia</span>
          </div>
        </div>
      </div>

      {/* Toast Flutuante de Notificação na TV */}
      {toastMessage && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[99999] px-6 py-3.5 bg-black/95 border-2 border-emerald-400 text-white rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <Star className="w-6 h-6 fill-amber-400 text-amber-400 animate-pulse" />
          <span className="text-base font-black tracking-wide">{toastMessage}</span>
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
            setActiveFocusColumn('channels');
            setPendingAdultCategory(null);
          }
        }}
      />

      {/* Modal de Teclado Virtual para Busca em Smart TV */}
      <TvSearchModal
        isOpen={isSearchModalOpen}
        title={isFullScreen ? "Buscar no Guia de Canais" : "Buscar Canal ao Vivo"}
        initialQuery={searchQuery}
        totalResultsCount={displayedChannels.length}
        onSearch={(q) => setSearchQuery(q)}
        onClose={() => {
          setIsSearchModalOpen(false);
          if (isFullScreen) {
            setGuideFocusColumn('channels');
          } else {
            setActiveFocusColumn('channels');
          }
        }}
      />
    </div>
  );
};
