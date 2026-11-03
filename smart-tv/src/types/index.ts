export interface DeviceActivation {
  mac: string;
  deviceKey: string;
  status: 'active' | 'expired' | 'blocked' | 'pending';
  expirationDate: string;
  note?: string;
  resellerId?: string;
  serverId?: string;
  activeDns?: string;
  username?: string;
  password?: string;
  serverName?: string;
}

export interface XtreamCategory {
  category_id: string;
  category_name: string;
  parent_id?: number;
}

export interface XtreamStream {
  num?: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  epg_channel_id?: string;
  added?: string;
  category_id: string;
  custom_sid?: string;
  tv_archive?: number;
  direct_source?: string;
}

export interface XtreamVod {
  num?: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  rating?: string;
  rating_5based?: number;
  added?: string;
  category_id: string;
  container_extension: string;
}

export interface XtreamSeries {
  num?: number;
  name: string;
  series_id: number;
  cover: string;
  plot?: string;
  cast?: string;
  director?: string;
  genre?: string;
  releaseDate?: string;
  last_modified?: string;
  rating?: string;
  rating_5based?: number;
  backdrop_path?: string[];
  youtube_trailer?: string;
  episode_run_time?: string;
  category_id: string;
}

export interface XtreamEpisode {
  id: string;
  episode_num: number;
  title: string;
  container_extension: string;
  info?: {
    plot?: string;
    duration?: string;
    movie_image?: string;
  };
}

export interface XtreamSeason {
  season_number: number;
  name: string;
  episode_count: number;
  air_date?: string;
  overview?: string;
}

