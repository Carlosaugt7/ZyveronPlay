import { 
  XtreamCategory, 
  XtreamStream, 
  XtreamVod, 
  XtreamSeries, 
  XtreamEpisode, 
  XtreamSeason 
} from '../types';

export class XtreamClient {
  private baseDns: string;
  private user: string;
  private pass: string;
  private cache = new Map<string, { data: any; timestamp: number }>();

  constructor(dns: string, user: string, pass: string) {
    let cleanDns = dns.trim().replace(/\/+$/, '').replace(/:80$/, '');
    
    // Se a aplicação está rodando via HTTPS (ex: https://tvplay.loja-am.top),
    // promovemos automaticamente para HTTPS para permitir chamadas diretas do cliente (IP residencial)
    // sem bloqueio de Mixed Content do navegador e sem acionar o WAF de Datacenter da VPS.
    const isHttpsOrigin = typeof window !== 'undefined' && window.location.protocol === 'https:';

    if (!/^https?:\/\//i.test(cleanDns)) {
      cleanDns = isHttpsOrigin ? `https://${cleanDns}` : `http://${cleanDns}`;
    } else if (isHttpsOrigin && cleanDns.startsWith('http://') && !cleanDns.slice(7).includes(':')) {
      // Se não há porta customizada especificada (como :8080), tenta https direto
      cleanDns = cleanDns.replace(/^http:\/\//i, 'https://');
    }

    this.baseDns = cleanDns;
    this.user = user.trim();
    this.pass = pass.trim();
  }

  private get apiUrl(): string {
    return `${this.baseDns}/player_api.php?username=${encodeURIComponent(this.user)}&password=${encodeURIComponent(this.pass)}`;
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

    // 1. Prioridade Máxima: Conexão direta do dispositivo cliente (Smart TV / PC)
    // Os clientes têm IP residencial e não são bloqueados por Cloudflare WAF, além de terem CORS livre (*)
    try {
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*'
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.cache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      }
      console.warn(`[Xtream] Resposta HTTP ${response.status} na conexão direta para ${action}. Tentando fallback...`);
    } catch (directErr: any) {
      console.warn(`[Xtream] Conexão direta falhou para ${action} (${directErr.message}). Tentando contingência...`);
    }

    // 2. Se a conexão direta falhou e a página é HTTPS, tenta via proxy da VPS
    const fallbackTarget = targetUrl.replace(/^https:\/\//i, 'http://');
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(fallbackTarget)}`;

    try {
      const proxyResponse = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*'
        }
      });

      if (!proxyResponse.ok) {
        throw new Error(`HTTP ${proxyResponse.status} ao consultar ${action}`);
      }

      const data = await proxyResponse.json();
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (proxyErr: any) {
      console.error(`[Xtream] Falha total ao consultar ${action}:`, proxyErr.message);
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
