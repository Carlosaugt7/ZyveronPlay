import { 
  XtreamCategory, 
  XtreamStream, 
  XtreamVod, 
  XtreamSeries, 
  XtreamEpisode, 
  XtreamSeason 
} from '../types';

export function normalizeBaseDns(rawDns: string): string {
  let clean = (rawDns || '').trim();
  if (!clean) return '';
  if (!/^https?:\/\//i.test(clean)) {
    clean = `http://${clean}`;
  }
  try {
    const u = new URL(clean);
    let port = u.port ? `:${u.port}` : '';
    if (port === ':80' && u.protocol === 'http:') port = '';
    if (port === ':443' && u.protocol === 'https:') port = '';
    return `${u.protocol}//${u.hostname}${port}`;
  } catch {
    return clean.replace(/\/+$/, '').replace(/:80$/, '');
  }
}

/**
 * Helper de timeout universal compatível com Tizen 4/5/6, webOS antigo e browsers modernos
 * (Evita quebras com AbortSignal.timeout que só existe a partir do Chrome 103)
 */
function createAbortTimeout(ms: number): { signal?: AbortSignal; cleanup: () => void } {
  try {
    if (typeof AbortController !== 'undefined') {
      const controller = new AbortController();
      const timer = setTimeout(() => {
        try {
          controller.abort();
        } catch {}
      }, ms);
      return {
        signal: controller.signal,
        cleanup: () => clearTimeout(timer)
      };
    }
  } catch {}
  return { cleanup: () => {} };
}

export class XtreamClient {
  private baseDns: string;
  private rawOriginalDns: string;
  private user: string;
  private pass: string;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private pendingRequests = new Map<string, Promise<any>>();
  private static httpsFailedHosts = new Set<string>();

  constructor(dns: string, user: string, pass: string) {
    this.rawOriginalDns = normalizeBaseDns(dns);
    let cleanDns = this.rawOriginalDns;

    // Se a aplicação está rodando via HTTPS (ex: https://tvplay.loja-am.top),
    // promovemos automaticamente para HTTPS quando não houver porta customizada (como :8080).
    // Isso permite chamadas diretas do cliente (IP residencial) sem bloqueio de Mixed Content
    // e sem acionar o WAF de Datacenter do Cloudflare na VPS!
    const isHttpsOrigin = typeof window !== 'undefined' && window.location.protocol === 'https:';

    if (!/^https?:\/\//i.test(cleanDns)) {
      cleanDns = isHttpsOrigin ? `https://${cleanDns}` : `http://${cleanDns}`;
    }

    this.baseDns = cleanDns;
    this.user = user.trim();
    this.pass = pass.trim();
  }

  /**
   * Limpa o cache em memória de requisições Xtream
   */
  public clearCache(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  private get apiUrl(): string {
    return `${this.baseDns}/player_api.php?username=${encodeURIComponent(this.user)}&password=${encodeURIComponent(this.pass)}`;
  }

  private getProxyBase(): string {
    if (typeof window !== 'undefined') {
      const h = window.location.hostname;
      if (h === 'localhost' || h === '127.0.0.1') {
        return '/api/proxy';
      }
      if (window.location.host.includes('tvplay.loja-am.top')) {
        return '/api/proxy';
      }
    }
    return 'https://tvplay.loja-am.top/api/proxy';
  }

  /**
   * Transforma URLs de vídeo HTTP em seguras quando a aplicação está em HTTPS,
   * evitando bloqueio de Mixed Content pelo navegador ou WebView da Smart TV.
   */
  public ensurePlayableUrl(directUrl: string): string {
    if (typeof window === 'undefined') return directUrl;
    const isHttpsOrigin = window.location.protocol === 'https:';
    if (isHttpsOrigin && directUrl.startsWith('http://')) {
      const proxyBase = this.getProxyBase();
      return `${proxyBase}?url=${encodeURIComponent(directUrl)}`;
    }
    return directUrl;
  }

  private async fetchJson<T>(action: string, extraParams: Record<string, string | number> = {}): Promise<T> {
    const cacheKey = `${action}_${JSON.stringify(extraParams)}`;
    const cached = this.cache.get(cacheKey);
    // Cache de 5 minutos na memória da TV para transição instantânea (0ms)
    if (cached && Date.now() - cached.timestamp < 300000) {
      return cached.data as T;
    }

    // Se já houver uma requisição idêntica em andamento, compartilha a mesma Promise
    // evitando que múltiplas chamadas concorrentes travem a conexão da TV
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey) as Promise<T>;
    }

    const requestPromise = (async (): Promise<T> => {
      let targetUrl = `${this.apiUrl}&action=${action}`;
      for (const [key, value] of Object.entries(extraParams)) {
        targetUrl += `&${key}=${encodeURIComponent(value)}`;
      }

      const isHttpsOrigin = typeof window !== 'undefined' && window.location.protocol === 'https:';
      // Se a aplicação está em HTTPS e o DNS do provedor é HTTP, navegadores (Safari, Chrome) bloqueiam Mixed Content
      const isDirectMixedContent = isHttpsOrigin && this.rawOriginalDns.startsWith('http://');

      let targetHost = '';
      try {
        targetHost = new URL(targetUrl).hostname;
      } catch {}

      const isKnownHttpsFailure = targetHost ? XtreamClient.httpsFailedHosts.has(targetHost) : false;

      // 1. Conexão direta do dispositivo cliente (Smart TV / PC)
      // Se a aplicação é HTTPS e o alvo é HTTP, chamadas diretas são bloqueadas pelo navegador (Mixed Content).
      // Se for Mixed Content ou se o host já falhou anteriormente, pula direto para o proxy em 0ms.
      if (!isDirectMixedContent && !isKnownHttpsFailure) {
        const directTimeout = createAbortTimeout(2500);
        try {
          const directOpts: RequestInit = {
            method: 'GET',
            headers: {
              'Accept': 'application/json, text/plain, */*'
            }
          };
          if (directTimeout.signal) directOpts.signal = directTimeout.signal;

          const response = await fetch(targetUrl, directOpts);

          if (response.ok) {
            const rawText = await response.text();
            try {
              const data = JSON.parse(rawText);
              this.cache.set(cacheKey, { data, timestamp: Date.now() });
              return data as T;
            } catch {
              console.warn(`[Xtream] Resposta direta não-JSON para ${action}. Tentando fallback...`);
            }
          } else {
            console.warn(`[Xtream] Resposta HTTP ${response.status} na conexão direta para ${action}. Tentando fallback...`);
            if (targetHost) XtreamClient.httpsFailedHosts.add(targetHost);
          }
        } catch (directErr: any) {
          console.warn(`[Xtream] Conexão direta falhou para ${action} (${directErr?.message || 'erro de rede'}). Tentando contingência...`);
          if (targetHost) XtreamClient.httpsFailedHosts.add(targetHost);
        } finally {
          directTimeout.cleanup();
        }
      }

      // 2. Fallback via proxy resiliente da VPS
      // Usa o DNS original cadastrado (mantendo :80 ou http:// se for o caso)
      let queryParams = `username=${encodeURIComponent(this.user)}&password=${encodeURIComponent(this.pass)}&action=${action}`;
      for (const [key, value] of Object.entries(extraParams)) {
        queryParams += `&${key}=${encodeURIComponent(value)}`;
      }
      const fallbackTarget = `${this.rawOriginalDns}/player_api.php?${queryParams}`;
      const proxyBase = this.getProxyBase();
      const proxyUrl = `${proxyBase}?url=${encodeURIComponent(fallbackTarget)}`;

      const proxyTimeout = createAbortTimeout(25000);
      try {
        const proxyOpts: RequestInit = {
          method: 'GET',
          headers: {
            'Accept': 'application/json, text/plain, */*'
          }
        };
        if (proxyTimeout.signal) proxyOpts.signal = proxyTimeout.signal;

        const proxyResponse = await fetch(proxyUrl, proxyOpts);

        if (!proxyResponse.ok) {
          throw new Error(`HTTP ${proxyResponse.status} ao consultar ${action}`);
        }

        const rawText = await proxyResponse.text();
        let data: any;
        try {
          data = JSON.parse(rawText);
        } catch (parseErr) {
          console.warn(`[Xtream] Resposta proxy não-JSON para ${action}:`, rawText.slice(0, 120));
          // Se for lista, retorna array vazio para não quebrar a interface
          data = (action.includes('categories') || action.includes('streams') || action === 'get_series') ? [] : {};
        }

        this.cache.set(cacheKey, { data, timestamp: Date.now() });
        return data as T;
      } catch (proxyErr: any) {
        console.error(`[Xtream] Falha total ao consultar ${action}:`, proxyErr?.message || proxyErr);
        // Retorna array vazio em caso de listagens para permitir exibição graciosa na UI
        if (action.includes('categories') || action.includes('streams') || action === 'get_series') {
          return [] as unknown as T;
        }
        throw proxyErr;
      } finally {
        proxyTimeout.cleanup();
      }
    })();

    this.pendingRequests.set(cacheKey, requestPromise);
    try {
      return await requestPromise;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  // --- CANAIS AO VIVO (LIVE) ---
  async getLiveCategories(): Promise<XtreamCategory[]> {
    return this.fetchJson<XtreamCategory[]>('get_live_categories');
  }

  async getLiveStreams(categoryId?: string): Promise<XtreamStream[]> {
    const params: Record<string, string> = {};
    if (categoryId && categoryId !== 'all') {
      params.category_id = categoryId;
    }
    return this.fetchJson<XtreamStream[]>('get_live_streams', params);
  }

  // URLs de reprodução HLS primária e TS de contingência diretas da CDN do servidor IPTV
  buildLiveHlsUrl(streamId: number): string {
    return `${this.baseDns}/live/${this.user}/${this.pass}/${streamId}.m3u8`;
  }

  buildLiveTsUrl(streamId: number): string {
    return `${this.baseDns}/live/${this.user}/${this.pass}/${streamId}.ts`;
  }

  // --- FILMES (VOD) ---
  async getVodCategories(): Promise<XtreamCategory[]> {
    return this.fetchJson<XtreamCategory[]>('get_vod_categories');
  }

  async getVodStreams(categoryId?: string): Promise<XtreamVod[]> {
    const params: Record<string, string> = {};
    if (categoryId && categoryId !== 'all') {
      params.category_id = categoryId;
    }
    return this.fetchJson<XtreamVod[]>('get_vod_streams', params);
  }

  async getVodInfo(vodId: number): Promise<{
    info?: {
      name?: string;
      description?: string;
      plot?: string;
      cast?: string;
      director?: string;
      genre?: string;
      release_date?: string;
      duration?: string;
      duration_secs?: number;
      rating?: string;
      rating_5based?: number;
      movie_image?: string;
      backdrop_path?: string[];
      cover_big?: string;
    };
    movie_data?: any;
  }> {
    return this.fetchJson('get_vod_info', { vod_id: String(vodId) });
  }

  buildVodUrl(streamId: number, extension: string = 'mp4'): string {
    const ext = extension.replace(/^\./, '') || 'mp4';
    return `${this.baseDns}/movie/${this.user}/${this.pass}/${streamId}.${ext}`;
  }

  // --- SÉRIES ---
  async getSeriesCategories(): Promise<XtreamCategory[]> {
    return this.fetchJson<XtreamCategory[]>('get_series_categories');
  }

  async getSeries(categoryId?: string): Promise<XtreamSeries[]> {
    const params: Record<string, string> = {};
    if (categoryId && categoryId !== 'all') {
      params.category_id = categoryId;
    }
    return this.fetchJson<XtreamSeries[]>('get_series', params);
  }

  async getSeriesInfo(seriesId: number): Promise<{
    seasons: XtreamSeason[];
    episodes: Record<string, XtreamEpisode[]>;
    info?: any;
  }> {
    return this.fetchJson('get_series_info', { series_id: seriesId });
  }

  buildEpisodeUrl(streamId: string | number, extension: string = 'mp4'): string {
    const ext = extension.replace(/^\./, '') || 'mp4';
    return `${this.baseDns}/series/${this.user}/${this.pass}/${streamId}.${ext}`;
  }
}
