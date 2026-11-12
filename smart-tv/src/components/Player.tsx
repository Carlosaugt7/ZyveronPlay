import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { Loader2, AlertCircle, ArrowLeft, Play, Pause, FastForward, Rewind } from 'lucide-react';
import { useSpatialNav } from '../hooks/useSpatialNav';

interface PlayerProps {
  streamUrl: string;
  fallbackUrl?: string;
  title: string;
  subtitle?: string;
  channelNum?: number;
  logoUrl?: string;
  isLive?: boolean;
  onBack?: () => void;
  onChannelUp?: () => void;
  onChannelDown?: () => void;
  onOpenChannelList?: () => void;
  isFullScreen?: boolean;
}

function formatSeconds(sec: number): string {
  if (isNaN(sec) || sec < 0) return '00:00';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const Player: React.FC<PlayerProps> = ({
  streamUrl,
  fallbackUrl,
  title,
  subtitle,
  channelNum,
  logoUrl,
  isLive,
  onBack,
  onChannelUp,
  onChannelDown,
  onOpenChannelList,
  isFullScreen = true
}) => {
  const isActuallyLive = isLive !== undefined ? isLive : (channelNum !== undefined);

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showOsd, setShowOsd] = useState(true);
  const [activeUrl, setActiveUrl] = useState(streamUrl);

  // VOD / Timeline State
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [seekFeedback, setSeekFeedback] = useState<string | null>(null);
  const seekFeedbackTimerRef = useRef<any>(null);
  const osdTimerRef = useRef<any>(null);

  const showOsdTemporarily = useCallback(() => {
    setShowOsd(true);
    if (osdTimerRef.current) clearTimeout(osdTimerRef.current);
    osdTimerRef.current = setTimeout(() => {
      setShowOsd(false);
    }, 4500);
  }, []);

  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      setIsPaused(false);
    } else {
      video.pause();
      setIsPaused(true);
    }
    showOsdTemporarily();
  }, [showOsdTemporarily]);

  const handleSeek = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;

    const newTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
    video.currentTime = newTime;
    setCurrentTime(newTime);

    // Feedback visual (-15s / +15s)
    const label = seconds > 0 ? `+${seconds}s` : `${seconds}s`;
    setSeekFeedback(label);
    if (seekFeedbackTimerRef.current) clearTimeout(seekFeedbackTimerRef.current);
    seekFeedbackTimerRef.current = setTimeout(() => {
      setSeekFeedback(null);
    }, 1200);

    showOsdTemporarily();
  }, [showOsdTemporarily]);

  // Hook D-Pad para Smart TV
  useSpatialNav({
    onUp: () => {
      if (isActuallyLive && onChannelUp) {
        onChannelUp();
      } else {
        showOsdTemporarily();
      }
    },
    onDown: () => {
      if (isActuallyLive && onChannelDown) {
        onChannelDown();
      } else {
        showOsdTemporarily();
      }
    },
    onLeft: () => {
      if (isActuallyLive) {
        // Na TV ao vivo: Abre o Guia Rápido de Canais
        onOpenChannelList?.();
      } else {
        // Em filmes e séries: RETROCEDE 15s (NUNCA SAI DO FILME)
        handleSeek(-15);
      }
    },
    onRight: () => {
      if (isActuallyLive) {
        // Na TV ao vivo: Também abre o Guia Rápido
        onOpenChannelList?.();
      } else {
        // Em filmes e séries: AVANÇA 15s
        handleSeek(15);
      }
    },
    onSelect: () => {
      if (!isActuallyLive) {
        togglePlayPause();
      } else {
        showOsdTemporarily();
      }
    },
    onPlayPause: () => {
      togglePlayPause();
    },
    onBack: () => {
      if (onBack) {
        console.log('[Player] Tecla física VOLTAR pressionada');
        onBack();
      }
    },
    disabled: !isFullScreen || hasError
  }, [isActuallyLive, onChannelUp, onChannelDown, onOpenChannelList, onBack, isFullScreen, hasError, isPaused, handleSeek, togglePlayPause, showOsdTemporarily]);

  // Histórico popstate para capturar botão VOLTAR nativo do controle remoto
  useEffect(() => {
    if (!isFullScreen || !onBack) return;

    window.history.pushState({ modal: 'fullscreen-player' }, '');

    const handlePopState = () => {
      console.log('[Player] Popstate capturado - saindo da reprodução');
      onBack();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isFullScreen, onBack]);

  // OSD inicial ao carregar
  useEffect(() => {
    showOsdTemporarily();
  }, [title, streamUrl, showOsdTemporarily]);

  // Troca de stream
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.removeAttribute('src');
    }
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    setActiveUrl(streamUrl);
  }, [streamUrl]);

  // Ciclo de carregamento do HLS / Vídeo
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeUrl) return;

    setIsLoading(true);
    setHasError(false);

    const isHls = activeUrl.includes('.m3u8');
    const isNativeHlsSupported = video.canPlayType('application/vnd.apple.mpegurl') === 'probably' || video.canPlayType('application/vnd.apple.mpegurl') === 'maybe';

    // 1. Prioridade para Hls.js com MSE em Smart TVs e Navegadores modernos
    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: isActuallyLive,
        backBufferLength: 15,
        maxBufferLength: 25,
        maxMaxBufferLength: 45,
        liveSyncDurationCount: 4,
        liveMaxLatencyDurationCount: 8,
        manifestLoadingTimeOut: 15000,
        levelLoadingTimeOut: 15000,
        fragLoadingTimeOut: 20000,
        manifestLoadingMaxRetry: 4,
        levelLoadingMaxRetry: 4,
        fragLoadingMaxRetry: 6,
        xhrSetup: (xhr) => {
          xhr.withCredentials = false;
          xhr.timeout = 25000;
        }
      });

      hlsRef.current = hls;
      hls.loadSource(activeUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (fallbackUrl && activeUrl !== fallbackUrl) {
                console.warn("[Player] HLS com falha de rede. Tentando stream TS alternativo...");
                setActiveUrl(fallbackUrl);
              } else {
                hls.destroy();
                setIsLoading(false);
                setHasError(true);
                setErrorMessage('Sinal temporariamente indisponível no servidor.');
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              setIsLoading(false);
              setHasError(true);
              setErrorMessage('Falha ao reproduzir o sinal deste canal/filme.');
              break;
          }
        }
      });
    } 
    // 2. Fallback nativo (Safari Apple HLS ou MP4 / TS direto)
    else if (isNativeHlsSupported || !isHls) {
      video.pause();
      video.removeAttribute('src');
      video.load();

      requestAnimationFrame(() => {
        video.src = activeUrl;
        video.load();
        video.play().catch((err) => {
          console.warn('[Player] Erro no autoplay nativo:', err);
        });
      });
    }

    const handleLoadStart = () => setIsLoading(true);
    const handleLoadedData = () => setIsLoading(false);
    const handlePlaying = () => {
      setIsLoading(false);
      setIsPaused(false);
    };
    const handlePause = () => setIsPaused(true);
    const handleWaiting = () => setIsLoading(true);
    const handleTimeUpdate = () => {
      if (video) {
        setCurrentTime(video.currentTime);
        if (video.duration && !isNaN(video.duration)) {
          setDuration(video.duration);
        }
      }
    };
    const handleDurationChange = () => {
      if (video && video.duration && !isNaN(video.duration)) {
        setDuration(video.duration);
      }
    };
    const handleError = () => {
      if (fallbackUrl && activeUrl !== fallbackUrl) {
        setActiveUrl(fallbackUrl);
      } else {
        setIsLoading(false);
        setHasError(true);
        setErrorMessage('Sinal temporariamente indisponível no servidor.');
      }
    };

    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('error', handleError);

      video.pause();
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeUrl, fallbackUrl, isActuallyLive]);

  return (
    <div className={`relative bg-black overflow-hidden flex items-center justify-center ${isFullScreen ? 'w-full h-full' : 'w-full h-full rounded-xl'}`}>
      <video
        ref={videoRef}
        className="w-full h-full object-contain bg-black"
        autoPlay
        playsInline
        preload="auto"
        style={{
          transform: 'translate3d(0, 0, 0)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden'
        }}
      />

      {/* Loading Overlay */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xs z-10">
          <Loader2 className="w-16 h-16 text-emerald-400 animate-spin mb-3" />
          <span className="text-white text-lg font-medium drop-shadow">Carregando transmissão...</span>
        </div>
      )}

      {/* Feedback de Avanço / Retrocesso (+15s / -15s) */}
      {seekFeedback && (
        <div className="absolute inset-0 flex items-center justify-center z-25 pointer-events-none">
          <div className="px-6 py-4 rounded-2xl bg-black/80 border border-sky-400/50 backdrop-blur-md flex items-center gap-3 text-sky-400 shadow-2xl animate-pulse">
            {seekFeedback.startsWith('+') ? <FastForward className="w-8 h-8" /> : <Rewind className="w-8 h-8" />}
            <span className="text-2xl font-black font-mono tracking-wider">{seekFeedback}</span>
          </div>
        </div>
      )}

      {/* Feedback de Pausado */}
      {isPaused && !isLoading && !seekFeedback && (
        <div className="absolute inset-0 flex items-center justify-center z-25 pointer-events-none">
          <div className="w-20 h-20 rounded-full bg-black/75 border border-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-2xl">
            <Pause className="w-10 h-10" />
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 z-20 p-8 text-center">
          <AlertCircle className="w-20 h-20 text-red-500 mb-4" />
          <h3 className="text-2xl font-bold text-white mb-2">Canal ou Mídia Indisponível</h3>
          <p className="text-slate-300 max-w-lg mb-6 text-sm leading-relaxed">{errorMessage}</p>
          {onBack && (
            <button
              onClick={onBack}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <ArrowLeft className="w-5 h-5" /> Voltar
            </button>
          )}
        </div>
      )}

      {/* OSD (On-Screen Display de TV) */}
      {showOsd && !hasError && (
        <div className="absolute inset-x-0 bottom-0 p-6 md:p-8 bg-gradient-to-t from-black/95 via-black/70 to-transparent z-15 flex flex-col gap-3 transition-opacity duration-300">
          
          {/* Informações Superiores do OSD */}
          <div className="flex items-end justify-between">
            <div className="flex items-center gap-4">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt={title}
                  className="w-16 h-16 md:w-20 md:h-20 object-contain rounded-xl bg-slate-900/80 p-1 border border-slate-700/50 shrink-0"
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
              )}
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  {channelNum !== undefined && (
                    <span className="px-3 py-1 bg-emerald-500 text-black font-extrabold text-base md:text-lg rounded-md">
                      CH {channelNum}
                    </span>
                  )}
                  <span className={`px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded border ${
                    isActuallyLive 
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                      : 'bg-sky-500/20 text-sky-400 border-sky-500/30'
                  }`}>
                    {isActuallyLive ? 'AO VIVO • HLS' : 'FILME / VOD'}
                  </span>
                  {subtitle && (
                    <span className="text-xs text-slate-400 font-medium">
                      {subtitle}
                    </span>
                  )}
                </div>
                <h2 className="text-xl md:text-2xl font-black text-white tracking-wide drop-shadow">
                  {title}
                </h2>
              </div>
            </div>

            {/* Dicas de Controle Remoto no canto inferior direito */}
            <div className="hidden md:flex flex-col items-end text-xs text-slate-400 font-medium">
              {isActuallyLive ? (
                <span>[▲▼] Trocar Canal • [◀▶] Lista de Canais • [VOLTAR] Sair</span>
              ) : (
                <span>[◀▶] -15s / +15s • [OK] Pausar • [VOLTAR] Sair</span>
              )}
              <span className="text-emerald-400 font-bold mt-0.5">Zyveron Play Engine</span>
            </div>
          </div>

          {/* Barra de Progresso / Timeline (Exibida para Filmes e Séries - VOD) */}
          {!isActuallyLive && duration > 0 && (
            <div className="w-full space-y-1.5 pt-2">
              <div className="w-full bg-slate-800/80 h-2.5 rounded-full overflow-hidden border border-slate-700/60 relative">
                <div
                  className="bg-gradient-to-r from-sky-500 to-emerald-400 h-full rounded-full transition-all duration-150 relative"
                  style={{ width: `${Math.min(100, (currentTime / duration) * 100)}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-lg border-2 border-emerald-500" />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-300 px-0.5">
                <span className="text-emerald-400">{formatSeconds(currentTime)}</span>
                <span className="text-slate-400">{formatSeconds(duration)}</span>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
