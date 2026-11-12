import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { useSpatialNav } from '../hooks/useSpatialNav';

interface PlayerProps {
  streamUrl: string;
  fallbackUrl?: string;
  title: string;
  channelNum?: number;
  logoUrl?: string;
  onBack?: () => void;
  isFullScreen?: boolean;
}

export const Player: React.FC<PlayerProps> = ({
  streamUrl,
  fallbackUrl,
  title,
  channelNum,
  logoUrl,
  onBack,
  isFullScreen = true
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showOsd, setShowOsd] = useState(true);
  const [activeUrl, setActiveUrl] = useState(streamUrl);

  // Hook de navegação D-Pad para capturar tecla VOLTAR ou SETA ESQUERDA em tela cheia
  useSpatialNav({
    onBack: () => {
      if (onBack) {
        console.log('[Player] Tecla VOLTAR pressionada - saindo de tela cheia');
        onBack();
      }
    },
    onLeft: () => {
      if (onBack) {
        console.log('[Player] Seta para a ESQUERDA pressionada em tela cheia - exibindo lista/menu');
        onBack();
      }
    },
    disabled: !isFullScreen || hasError
  }, [onBack, isFullScreen, hasError]);

  // Registra histórico para garantir que a tecla física VOLTAR do controle da TV volte da tela cheia
  useEffect(() => {
    if (!isFullScreen || !onBack) return;

    window.history.pushState({ modal: 'fullscreen-player' }, '');

    const handlePopState = () => {
      console.log('[Player] Popstate capturado - saindo de tela cheia');
      onBack();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isFullScreen, onBack]);

  // Escuta evento customizado de VOLTAR da Smart TV
  useEffect(() => {
    const handleSmartTvBack = () => {
      if (isFullScreen && onBack && !hasError) {
        console.log('[Player] Evento smartTvBack capturado - voltando');
        onBack();
      }
    };

    window.addEventListener('smartTvBack', handleSmartTvBack);
    
    return () => {
      window.removeEventListener('smartTvBack', handleSmartTvBack);
    };
  }, [isFullScreen, onBack, hasError]);

  // Auto-hide do OSD após 4.5 segundos
  useEffect(() => {
    setShowOsd(true);
    const timer = setTimeout(() => {
      setShowOsd(false);
    }, 4500);
    return () => clearTimeout(timer);
  }, [title, streamUrl]);

  // Atualiza a URL ativa quando streamUrl mudar e para o vídeo anterior
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      // Para o vídeo atual imediatamente para evitar áudio sobreposto
      video.pause();
      video.src = '';
      video.load();
    }
    
    // Destrói instância Hls anterior se existir
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    
    setActiveUrl(streamUrl);
  }, [streamUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeUrl) return;

    console.log('[Player] Iniciando carregamento:', activeUrl);
    setIsLoading(true);
    setHasError(false);

    const isHls = activeUrl.includes('.m3u8');
    const isNativeHlsSupported = video.canPlayType('application/vnd.apple.mpegurl') === 'probably' || video.canPlayType('application/vnd.apple.mpegurl') === 'maybe';

    // 1. Sempre que Hls.js for suportado (MSE disponível no Media Station X, Tizen, webOS e PCs):
    // Utiliza Hls.js para demuxar H.264 de vídeo e AAC de áudio, garantindo que o vídeo apareça na tela
    if (isHls && Hls.isSupported()) {
      console.log('[Player] Usando Hls.js Engine (MSE Video+Audio Demuxer)');
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
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
                const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
                if (isHttps) {
                  setErrorMessage('O stream deste canal é transmitido em HTTP. Acesse via http://tvplay.loja-am.top ou utilize o proxy seguro.');
                } else {
                  setErrorMessage('Sinal temporariamente indisponível no servidor.');
                }
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn("[Player] Recuperando decodificação de mídia...");
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              setIsLoading(false);
              setHasError(true);
              setErrorMessage('Falha ao reproduzir o sinal deste canal.');
              break;
          }
        }
      });
    } 
    // 2. Fallback para reprodução nativa direta (Safari Apple HLS ou arquivos diretos MP4 / TS)
    else if (isNativeHlsSupported || !isHls) {
      console.log('[Player] Usando pipeline nativo HTML5 Video');
      video.pause();
      video.removeAttribute('src');
      video.load();

      requestAnimationFrame(() => {
        video.src = activeUrl;
        video.load();
        video.play().catch((err) => {
          console.warn('[Player] Erro ao iniciar reprodução nativa:', err);
        });
      });
    }

    const handleLoadStart = () => {
      console.log('[Player] Iniciando carregamento do stream');
      setIsLoading(true);
    };
    
    const handleLoadedData = () => {
      console.log('[Player] Stream carregado e pronto');
      setIsLoading(false);
    };
    
    const handlePlaying = () => {
      console.log('[Player] Reprodução iniciada');
      setIsLoading(false);
    };
    
    const handleWaiting = () => {
      console.log('[Player] Buffering...');
      setIsLoading(true);
    };
    
    const handleError = () => {
      console.error('[Player] Erro no player');
      if (fallbackUrl && activeUrl !== fallbackUrl) {
        console.warn("[Player] Tentando stream alternativo...");
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
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('error', handleError);

      // Para o vídeo ao desmontar
      video.pause();
      
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeUrl, fallbackUrl]);

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

      {/* Error Overlay */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 z-20 p-8 text-center">
          <AlertCircle className="w-20 h-20 text-red-500 mb-4" />
          <h3 className="text-2xl font-bold text-white mb-2">Canal Indisponível</h3>
          <p className="text-slate-300 max-w-lg mb-6 text-sm leading-relaxed">{errorMessage}</p>
          {onBack && (
            <button
              onClick={onBack}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <ArrowLeft className="w-5 h-5" /> Voltar para a Lista
            </button>
          )}
        </div>
      )}

      {/* OSD (On-Screen Display de TV) */}
      {showOsd && !hasError && (
        <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-15 flex items-end justify-between transition-opacity duration-300">
          <div className="flex items-center gap-5">
            {logoUrl && (
              <img
                src={logoUrl}
                alt={title}
                className="w-20 h-20 object-contain rounded-lg bg-slate-900/80 p-1 border border-slate-700/50"
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
            )}
            <div>
              <div className="flex items-center gap-3 mb-1">
                {channelNum !== undefined && (
                  <span className="px-3 py-1 bg-emerald-500 text-black font-extrabold text-lg rounded-md">
                    CH {channelNum}
                  </span>
                )}
                <span className="px-2.5 py-0.5 bg-slate-800 text-emerald-400 text-xs font-semibold uppercase tracking-wider rounded border border-emerald-500/30">
                  AO VIVO • HLS
                </span>
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-md">
                {title}
              </h1>
            </div>
          </div>

          <div className="text-right text-slate-400 text-sm">
            <span>Pressione <b>VOLTAR</b> para ver a lista de canais</span>
          </div>
        </div>
      )}
    </div>
  );
};
