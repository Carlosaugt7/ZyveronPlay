import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Loader2, AlertCircle, Play, Pause, Volume2, VolumeX, ArrowLeft } from 'lucide-react';

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
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [activeUrl, setActiveUrl] = useState(streamUrl);

  // Auto-hide do OSD após 4 segundos
  useEffect(() => {
    setShowOsd(true);
    const timer = setTimeout(() => {
      setShowOsd(false);
    }, 4500);
    return () => clearTimeout(timer);
  }, [title, streamUrl]);

  // Inicializa o Player (Hls.js ou Nativo)
  useEffect(() => {
    setActiveUrl(streamUrl);
  }, [streamUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeUrl) return;

    setIsLoading(true);
    setHasError(false);

    // Destrói instância Hls anterior se existir
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHls = activeUrl.includes('.m3u8');

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 15,
        maxBufferLength: 10,
        maxMaxBufferLength: 20,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 6,
        manifestLoadingTimeOut: 10000,
        levelLoadingTimeOut: 10000,
        fragLoadingTimeOut: 15000,
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
              // Tenta fallback para TS se falhar na rede
              if (fallbackUrl && activeUrl !== fallbackUrl) {
                console.warn("HLS com falha de rede. Tentando stream TS alternativo...");
                setActiveUrl(fallbackUrl);
              } else {
                hls.startLoad();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              setHasError(true);
              setErrorMessage('Falha ao reproduzir o stream.');
              break;
          }
        }
      });
    } else {
      // Reprodução nativa direta (HTML5) para MP4 / TS
      video.src = activeUrl;
      video.load();
      video.play().catch(() => {});
    }

    const handlePlaying = () => setIsLoading(false);
    const handleWaiting = () => setIsLoading(true);
    const handleError = () => {
      if (fallbackUrl && activeUrl !== fallbackUrl) {
        console.warn("Player nativo com erro. Tentando stream alternativo...");
        setActiveUrl(fallbackUrl);
      } else {
        setIsLoading(false);
        setHasError(true);
        setErrorMessage('Sinal temporariamente indisponível no servidor.');
      }
    };

    video.addEventListener('playing', handlePlaying);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('error', handleError);

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
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 p-6 text-center">
          <AlertCircle className="w-20 h-20 text-red-500 mb-4" />
          <h3 className="text-2xl font-bold text-white mb-2">Canal Fora do Ar</h3>
          <p className="text-slate-300 max-w-md mb-6">{errorMessage}</p>
          {onBack && (
            <button
              onClick={onBack}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold flex items-center gap-2"
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
