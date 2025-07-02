export interface VideoDetail {
  code: number;
  episodes: string[];
  detailUrl: string;
  videoInfo: {
    title: string;
    cover?: string;
    desc?: string;
    type?: string;
    year?: string;
    area?: string;
    director?: string;
    actor?: string;
    remarks?: string;
    source_name: string;
    source: string;
    id: string;
  };
}

export interface SearchResult {
  id: string;
  title: string;
  poster: string;
  episodes: string[];
  source: string;
  source_name: string;
  class?: string;
  year: string;
  desc?: string;
  type_name?: string;
  douban_id?: number;
}

export interface DoubanItem {
  id: string;
  title: string;
  poster: string;
  rate: string;
}

export interface DoubanResult {
  code: number;
  message: string;
  list: DoubanItem[];
}
