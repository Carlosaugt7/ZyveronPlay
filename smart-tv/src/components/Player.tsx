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

  // Hook de navegação D-Pad para capturar tecla VOLTAR em tela cheia
  useSpatialNav({
    onBack: () => {
      if (onBack) {
        console.log('[Player] Tecla VOLTAR pressionada - voltando para lista');
        onBack();
      }
    },
    disabled: !isFullScreen || hasError
  }, [onBack, isFullScreen, hasError]);

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
    const isSmartTv = /(web0s|webos|tizen|smarttv|smart-tv)/i.test(navigator.userAgent);
    const isNativeHlsSupported = video.canPlayType('application/vnd.apple.mpegurl');

    // 1. Em Smart TVs (LG webOS e Samsung Tizen): utiliza o pipeline de decodificação de hardware nativo da TV
    // O player nativo da Smart TV toca streams diretamente pelo chip de vídeo sem as restrições de XHR do navegador
    if (isSmartTv || (isNativeHlsSupported && !navigator.userAgent.includes('Windows') && !navigator.userAgent.includes('Macintosh'))) {
      console.log('[Player] Usando player nativo da Smart TV');
      
      // Limpa o vídeo anterior completamente
      video.pause();
      video.removeAttribute('src');
      video.load();
      
      // Aguarda um frame antes de carregar o novo stream (evita sobreposição de áudio)
      requestAnimationFrame(() => {
        video.src = activeUrl;
        video.load();
        
        // Aguarda o vídeo estar pronto antes de reproduzir
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn('[Player] Erro ao iniciar reprodução:', err);
          });
        }
      });
    } 
    // 2. Em computadores Desktop / Notebooks: utiliza Hls.js com buffer adaptativo
    else if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,              // Desabilitado para maior estabilidade
        backBufferLength: 20,               // Aumentado para 20s
        maxBufferLength: 30,                // Aumentado para 30s
        maxMaxBufferLength: 60,             // Aumentado para 60s
        liveSyncDurationCount: 5,           // Mais tolerante (5 chunks)
        liveMaxLatencyDurationCount: 10,    // Maior latência permitida
        manifestLoadingTimeOut: 20000,      // 20s timeout
        levelLoadingTimeOut: 20000,         // 20s timeout
        fragLoadingTimeOut: 30000,          // 30s timeout
        manifestLoadingMaxRetry: 4,         // 4 tentativas de retry
        levelLoadingMaxRetry: 4,            // 4 tentativas de retry
        fragLoadingMaxRetry: 6,             // 6 tentativas de retry
        xhrSetup: (xhr) => {
          xhr.withCredentials = false;
          xhr.timeout = 30000;              // Timeout explícito de 30s
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
              // Se falhar na rede no PC e houver fallback TS
              if (fallbackUrl && activeUrl !== fallbackUrl) {
                console.warn("[Player] HLS com falha de rede. Tentando stream TS alternativo...");
                setActiveUrl(fallbackUrl);
              } else {
                hls.destroy();
                setIsLoading(false);
                setHasError(true);
                const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
                if (isHttps) {
                  setErrorMessage('O stream deste canal é transmitido em HTTP. No computador, acesse via http://tvplay.loja-am.top ou libere "Conteúdo não seguro" no ícone ao lado da barra de endereços.');
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
    } else {
      // Reprodução nativa direta para MP4 / TS
      video.src = activeUrl;
      video.load();
      video.play().catch(() => {});
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
        className="w-full h-full object-contain"
        autoPlay
        playsInline
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
