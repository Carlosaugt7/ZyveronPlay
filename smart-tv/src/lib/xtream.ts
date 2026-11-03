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

  constructor(dns: string, user: string, pass: string) {
    let cleanDns = dns.trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(cleanDns)) {
      cleanDns = `http://${cleanDns}`;
    }
    this.baseDns = cleanDns;
    this.user = user.trim();
    this.pass = pass.trim();
  }

  private get apiUrl(): string {
    return `${this.baseDns}/player_api.php?username=${encodeURIComponent(this.user)}&password=${encodeURIComponent(this.pass)}`;
  }

  /**
   * Encaminha URLs através do proxy local caso a TV esteja acessando via HTTPS
   * e o servidor IPTV seja HTTP, eliminando bloqueios de Mixed Content e CORS.
   */
  private wrapUrl(url: string): string {
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http://')) {
      return `/api/proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
  }

  private async fetchJson<T>(action: string, extraParams: Record<string, string | number> = {}): Promise<T> {
    let targetUrl = `${this.apiUrl}&action=${action}`;
    for (const [key, value] of Object.entries(extraParams)) {
      targetUrl += `&${key}=${encodeURIComponent(value)}`;
    }

    const url = this.wrapUrl(targetUrl);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ao consultar ${action}`);
      }

      return await response.json();
    } catch (err: any) {
      console.warn(`Aviso ao consultar ${action}:`, err.message);
      throw err;
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

  // URLs de reprodução HLS primária e TS de contingência
  buildLiveHlsUrl(streamId: number): string {
    const rawUrl = `${this.baseDns}/live/${this.user}/${this.pass}/${streamId}.m3u8`;
    return this.wrapUrl(rawUrl);
  }

  buildLiveTsUrl(streamId: number): string {
    const rawUrl = `${this.baseDns}/live/${this.user}/${this.pass}/${streamId}.ts`;
    return this.wrapUrl(rawUrl);
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

  buildVodUrl(streamId: number, extension: string = 'mp4'): string {
    const ext = extension.replace(/^\./, '') || 'mp4';
    const rawUrl = `${this.baseDns}/movie/${this.user}/${this.pass}/${streamId}.${ext}`;
    return this.wrapUrl(rawUrl);
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
    return this.wrapUrl(rawUrl);
  }
}

