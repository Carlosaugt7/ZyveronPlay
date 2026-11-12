import { useState, useEffect, useCallback } from 'react';

export interface NetworkQuality {
  ping: number;
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
  label: string;
  textColor: string;
  iconColor: string;
  percentage: number;
}

export function useNetworkQuality(pingIntervalMs = 15000): NetworkQuality {
  const [quality, setQuality] = useState<NetworkQuality>({
    ping: 0,
    status: 'excellent',
    label: 'Medindo conexão...',
    textColor: 'text-slate-300',
    iconColor: 'text-slate-400',
    percentage: 100
  });

  const measurePing = useCallback(async () => {
    if (typeof window === 'undefined') return;

    if (!navigator.onLine) {
      setQuality({
        ping: 0,
        status: 'offline',
        label: 'Sem Conexão',
        textColor: 'text-rose-400',
        iconColor: 'text-rose-400',
        percentage: 0
      });
      return;
    }

    const startTime = performance.now();
    try {
      // Faz uma requisição leve com timestamp para evitar cache e medir o RTT real
      const cacheBust = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      // Testa primeiro o favicon da própria VPS ou da aplicação
      const response = await fetch(`/favicon.ico?_cb=${cacheBust}`, {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);

      // Classifica latência real
      if (durationMs < 90) {
        setQuality({
          ping: durationMs,
          status: 'excellent',
          label: `100% Excelente (${durationMs}ms)`,
          textColor: 'text-emerald-400',
          iconColor: 'text-emerald-400',
          percentage: 100
        });
      } else if (durationMs < 200) {
        setQuality({
          ping: durationMs,
          status: 'good',
          label: `85% Boa (${durationMs}ms)`,
          textColor: 'text-sky-400',
          iconColor: 'text-sky-400',
          percentage: 85
        });
      } else if (durationMs < 400) {
        setQuality({
          ping: durationMs,
          status: 'fair',
          label: `60% Oscilando (${durationMs}ms)`,
          textColor: 'text-amber-400',
          iconColor: 'text-amber-400',
          percentage: 60
        });
      } else {
        setQuality({
          ping: durationMs,
          status: 'poor',
          label: `40% Instável (${durationMs}ms)`,
          textColor: 'text-rose-400',
          iconColor: 'text-rose-400',
          percentage: 40
        });
      }
    } catch (err: any) {
      // Se falhar a medição direta mas o navegador disser que está online
      if (navigator.onLine) {
        const navConn = (navigator as any).connection;
        if (navConn?.effectiveType === '4g') {
          setQuality({
            ping: 60,
            status: 'good',
            label: '85% Conectado',
            textColor: 'text-emerald-400',
            iconColor: 'text-emerald-400',
            percentage: 85
          });
        } else {
          setQuality({
            ping: 250,
            status: 'fair',
            label: '60% Oscilando',
            textColor: 'text-amber-400',
            iconColor: 'text-amber-400',
            percentage: 60
          });
        }
      } else {
        setQuality({
          ping: 0,
          status: 'offline',
          label: 'Sem Conexão',
          textColor: 'text-rose-400',
          iconColor: 'text-rose-400',
          percentage: 0
        });
      }
    }
  }, []);

  useEffect(() => {
    measurePing();
    const interval = setInterval(measurePing, pingIntervalMs);

    const handleOnline = () => measurePing();
    const handleOffline = () => {
      setQuality({
        ping: 0,
        status: 'offline',
        label: 'Sem Conexão',
        textColor: 'text-rose-400',
        iconColor: 'text-rose-400',
        percentage: 0
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [measurePing, pingIntervalMs]);

  return quality;
}

