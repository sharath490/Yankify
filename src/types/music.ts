export type MusicLanguage = 'Telugu' | 'Tamil' | 'Hindi' | 'English' | 'Malayalam' | 'Punjabi';
export type MusicSource = 'saavn' | 'youtube' | 'itunes';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumId: string;
  artworkUrl: string;
  durationSec: number;
  language: MusicLanguage;
  /** Full song URL for Saavn tracks; iTunes provides preview-only URLs. */
  audioUrl: string;
  youtubeVideoId?: string;
  source: MusicSource;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  artworkUrl: string;
  year: number;
  language: MusicLanguage;
  tracks: Track[];
  source: 'saavn' | 'itunes';
}

export interface CatalogResult<T> {
  items: T[];
  source: 'saavn' | 'itunes';
}
