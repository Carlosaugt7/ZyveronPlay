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

export class XtreamClient {
  private baseDns: string;
  private user: string;
  private pass: string;
  private cache = new Map<string, { data: any; timestamp: number }>();

  constructor(dns: string, user: string, pass: string) {
    this.baseDns = normalizeBaseDns(dns);
    this.user = user.trim();
    this.pass = pass.trim();
  }

  /**
   * Limpa o cache em memória de requisições Xtream
   */
  public clearCache(): void {
    this.cache.clear();
  }

  private get apiUrl(): string {
    return `${this.baseDns}/player_api.php?username=${encodeURIComponent(this.user)}&password=${encodeURIComponent(this.pass)}`;
  }

  private getProxyBase(): string {
    if (typeof window === 'undefined') return '/api/proxy';
    // Se estiver rodando como pacote local (ex: Samsung Tizen ou LG webOS via file://)
    const isFileOrigin = window.location.protocol === 'file:' || !window.location.host;
    if (isFileOrigin) {
      return 'https://tvplay.loja-am.top/api/proxy';
    }
    return '/api/proxy';
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

    let targetUrl = `${this.apiUrl}&action=${action}`;
    for (const [key, value] of Object.entries(extraParams)) {
      targetUrl += `&${key}=${encodeURIComponent(value)}`;
    }

    const isHttpsOrigin = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const isDirectMixedContent = isHttpsOrigin && targetUrl.startsWith('http://');

    // 1. Conexão direta do dispositivo cliente (Smart TV / PC)
    // Se a aplicação é HTTPS e o alvo é HTTP, chamadas diretas são bloqueadas pelo navegador (Mixed Content).
    // Nesse caso, pula direto para o proxy seguro sem esperar timeout.
    if (!isDirectMixedContent) {
      try {
        const response = await fetch(targetUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json, text/plain, */*'
          },
          signal: AbortSignal.timeout(3500)
        });

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
        }
      } catch (directErr: any) {
        console.warn(`[Xtream] Conexão direta falhou para ${action} (${directErr.message}). Tentando contingência...`);
      }
    }

    // 2. Fallback via proxy resiliente da VPS
    // Se o alvo for HTTPS mas falhou na porta 443, tenta http:// no proxy
    const fallbackTarget = targetUrl.replace(/^https:\/\//i, 'http://');
    const proxyBase = this.getProxyBase();
    const proxyUrl = `${proxyBase}?url=${encodeURIComponent(fallbackTarget)}`;

    try {
      const proxyResponse = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*'
        },
        signal: AbortSignal.timeout(25000)
      });

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
      console.error(`[Xtream] Falha total ao consultar ${action}:`, proxyErr.message);
      // Retorna array vazio em caso de listagens para permitir exibição graciosa na UI
      if (action.includes('categories') || action.includes('streams') || action === 'get_series') {
        return [] as unknown as T;
      }
      throw proxyErr;
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
    const rawUrl = `${this.baseDns}/live/${this.user}/${this.pass}/${streamId}.m3u8`;
    return this.ensurePlayableUrl(rawUrl);
  }

  buildLiveTsUrl(streamId: number): string {
    const rawUrl = `${this.baseDns}/live/${this.user}/${this.pass}/${streamId}.ts`;
    return this.ensurePlayableUrl(rawUrl);
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
    const rawUrl = `${this.baseDns}/movie/${this.user}/${this.pass}/${streamId}.${ext}`;
    return this.ensurePlayableUrl(rawUrl);
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
    const rawUrl = `${this.baseDns}/series/${this.user}/${this.pass}/${streamId}.${ext}`;
    return this.ensurePlayableUrl(rawUrl);
  }
}
