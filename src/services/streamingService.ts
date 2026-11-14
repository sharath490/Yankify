import type { Album, CatalogResult, MusicLanguage, Track } from '../types/music';

const SAAVN_MIRRORS = [
  'https://saavn.dev/api',
  'https://saavn.sumit.co/api',
  'https://jiosaavn-api-privatecvc2.vercel.app',
] as const;
const ITUNES_API = 'https://itunes.apple.com';
const REQUEST_TIMEOUT_MS = 9_000;

interface SaavnResponse<T> {
  success?: boolean;
  data?: T | { results?: T[]; songs?: { results?: T[] }; albums?: { results?: T[] } };
  results?: T[];
}

interface SaavnSong {
  id?: string;
  title?: string;
  name?: string;
  subtitle?: string;
  description?: string;
  primaryArtists?: string;
  singers?: string;
  artists?: { primary?: Array<{ name?: string }>; all?: Array<{ name?: string }> };
  album?: { id?: string; name?: string; title?: string; url?: string };
  image?: Array<{ quality?: string; url?: string }> | string;
  artwork?: string;
  duration?: number | string;
  language?: string;
  downloadUrl?: Array<{ quality?: string; url?: string }> | string;
  url?: string;
}

interface SaavnAlbum {
  id?: string;
  name?: string;
  title?: string;
  primaryArtists?: string;
  artists?: { primary?: Array<{ name?: string }> };
  image?: Array<{ quality?: string; url?: string }> | string;
  year?: number | string;
  language?: string;
  songs?: SaavnSong[];
  songCount?: number;
}

interface ITunesResult {
  trackId?: number;
  collectionId?: number;
  trackName?: string;
  collectionName?: string;
  artistName?: string;
  artworkUrl100?: string;
  artworkUrl60?: string;
  previewUrl?: string;
  trackTimeMillis?: number;
  releaseDate?: string;
  primaryGenreName?: string;
  kind?: string;
}

const languageNames: Record<MusicLanguage, string[]> = {
  Telugu: ['telugu'],
  Tamil: ['tamil'],
  Hindi: ['hindi'],
  English: ['english'],
  Malayalam: ['malayalam'],
  Punjabi: ['punjabi'],
};

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function resultsFrom<T>(payload: SaavnResponse<T>): T[] {
  const data = payload?.data;
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const nested = data as { results?: T[]; songs?: { results?: T[] }; albums?: { results?: T[] } };
    return nested.results ?? nested.songs?.results ?? nested.albums?.results ?? payload.results ?? [];
  }
  return payload.results ?? [];
}

function imageUrl(image: SaavnSong['image'] | SaavnAlbum['image']): string {
  if (typeof image === 'string') return image.replace(/\d+x\d+/g, '500x500');
  const images = asArray<{ quality?: string; url?: string }>(image);
  const preferred = images.find((item) => /500|high|large/i.test(item.quality ?? '')) ?? images.at(-1);
  return (preferred?.url ?? '').replace(/\d+x\d+/g, '500x500');
}

function bestAudioUrl(value: SaavnSong['downloadUrl']): string {
  if (typeof value === 'string') return value;
  const urls = asArray<{ quality?: string; url?: string }>(value);
  // Prefer the highest advertised bitrate when the API returns quality options.
  const preferred = [...urls].sort((a, b) => {
    const bitrate = (quality?: string) => Number(quality?.match(/\d+/)?.[0] ?? 0);
    return bitrate(b.quality) - bitrate(a.quality);
  }).find((item) => item.url);
  return preferred?.url ?? '';
}

function cleanText(value: string | undefined, fallback: string): string {
  return (value ?? '').replace(/<[^>]*>/g, '').trim() || fallback;
}

function normalizeSaavnSong(song: SaavnSong): Track | null {
  const id = song.id;
  const audioUrl = bestAudioUrl(song.downloadUrl) || song.url || '';
  if (!id || !audioUrl) return null;
  const artist = song.artists?.primary?.map((item) => item.name).filter(Boolean).join(', ')
    || song.primaryArtists || song.singers || 'Unknown artist';
  return {
    id: `saavn:${id}`,
    title: cleanText(song.title ?? song.name, 'Untitled'),
    artist,
    album: cleanText(song.album?.name ?? song.album?.title, 'Unknown album'),
    albumId: song.album?.id ?? '',
    artworkUrl: imageUrl(song.image) || song.artwork || '',
    durationSec: Number(song.duration) || 0,
    language: normalizeLanguage(song.language),
    audioUrl,
    source: 'saavn',
  };
}

function normalizeLanguage(value?: string): MusicLanguage {
  const text = (value ?? '').toLowerCase();
  return (Object.entries(languageNames).find(([, names]) => names.some((name) => text.includes(name)))?.[0]
    ?? 'English') as MusicLanguage;
}

function matchesLanguage(track: Track, language?: MusicLanguage): boolean {
  return !language || track.language === language;
}

function normalizeSaavnAlbum(album: SaavnAlbum): Album | null {
  if (!album.id) return null;
  const tracks = (album.songs ?? []).map(normalizeSaavnSong).filter((track): track is Track => track !== null);
  return {
    id: `saavn:${album.id}`,
    title: cleanText(album.name ?? album.title, 'Untitled album'),
    artist: album.artists?.primary?.map((item) => item.name).filter(Boolean).join(', ') || album.primaryArtists || 'Various artists',
    artworkUrl: imageUrl(album.image),
    year: Number(album.year) || 0,
    language: normalizeLanguage(album.language),
    tracks,
    source: 'saavn',
  };
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Request failed (${response.status})`);
    return await response.json() as T;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}

function encodeQuery(value: string): string {
  return encodeURIComponent(value.trim());
}

async function saavnRequest<T>(path: string, signal?: AbortSignal): Promise<T> {
  let lastError: unknown;
  for (const base of SAAVN_MIRRORS) {
    if (signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError');
    try {
      return await fetchJson<T>(`${base}${path}`, signal);
    } catch (error) {
      if (signal?.aborted) throw error;
      lastError = error;
    }
  }
  throw lastError ?? new Error('All Saavn mirrors are unavailable.');
}

async function searchITunesSongs(query: string, language?: MusicLanguage, signal?: AbortSignal): Promise<Track[]> {
  const term = [query, language].filter(Boolean).join(' ');
  const params = new URLSearchParams({ media: 'music', entity: 'song', country: 'IN', limit: '50', term });
  const payload = await fetchJson<{ results?: ITunesResult[] }>(`${ITUNES_API}/search?${params}`, signal);
  return (payload.results ?? []).filter((item) => item.trackId && item.previewUrl).map((item) => ({
    id: `itunes:${item.trackId}`,
    title: item.trackName ?? 'Untitled',
    artist: item.artistName ?? 'Unknown artist',
    album: item.collectionName ?? 'Unknown album',
    albumId: item.collectionId ? `itunes:${item.collectionId}` : '',
    artworkUrl: (item.artworkUrl100 ?? item.artworkUrl60 ?? '').replace('100x100bb', '600x600bb').replace('60x60bb', '600x600bb'),
    durationSec: Math.round((item.trackTimeMillis ?? 0) / 1000),
    language: language ?? normalizeLanguage(item.primaryGenreName),
    // Apple's public Search API exposes previews, not full-length streams.
    audioUrl: item.previewUrl!,
    source: 'itunes' as const,
  }));
}

/** Search Saavn's full-song catalog, failing over across mirrors and then to iTunes previews. */
export async function searchSongs(query: string, language?: MusicLanguage, signal?: AbortSignal): Promise<CatalogResult<Track>> {
  const params = new URLSearchParams({ query: [query, language].filter(Boolean).join(' ') });
  try {
    const payload = await saavnRequest<SaavnResponse<SaavnSong>>(`/search/songs?${params}`, signal);
    const tracks = resultsFrom(payload).map(normalizeSaavnSong).filter((track): track is Track => track !== null)
      .filter((track) => matchesLanguage(track, language));
    if (tracks.length) return { items: tracks, source: 'saavn' };
  } catch (error) {
    if (signal?.aborted) throw error;
  }
  return { items: await searchITunesSongs(query, language, signal), source: 'itunes' };
}

/** Language-based discovery uses the same mirror and iTunes fallback chain as search. */
export async function getTrendingByLanguage(language: MusicLanguage, signal?: AbortSignal): Promise<CatalogResult<Track>> {
  return searchSongs(`${language} latest hits`, language, signal);
}

async function searchITunesAlbums(query: string, signal?: AbortSignal): Promise<Album[]> {
  const params = new URLSearchParams({ media: 'music', entity: 'album', country: 'IN', limit: '30', term: query });
  const payload = await fetchJson<{ results?: ITunesResult[] }>(`${ITUNES_API}/search?${params}`, signal);
  return (payload.results ?? []).filter((item) => item.collectionId).map((item) => ({
    id: `itunes:${item.collectionId}`,
    title: item.collectionName ?? 'Untitled album',
    artist: item.artistName ?? 'Unknown artist',
    artworkUrl: (item.artworkUrl100 ?? '').replace('100x100bb', '600x600bb'),
    year: Number(item.releaseDate?.slice(0, 4)) || 0,
    language: normalizeLanguage(item.primaryGenreName),
    tracks: [],
    source: 'itunes' as const,
  }));
}

/** Find albums (including film soundtracks) with automatic mirror failover. */
export async function searchMovieAlbums(query: string, signal?: AbortSignal): Promise<CatalogResult<Album>> {
  const params = new URLSearchParams({ query });
  try {
    const payload = await saavnRequest<SaavnResponse<SaavnAlbum>>(`/search/albums?${params}`, signal);
    const albums = resultsFrom(payload).map(normalizeSaavnAlbum).filter((album): album is Album => album !== null);
    if (albums.length) return { items: albums, source: 'saavn' };
  } catch (error) {
    if (signal?.aborted) throw error;
  }
  return { items: await searchITunesAlbums(query, signal), source: 'itunes' };
}

async function getITunesAlbumDetails(albumId: string, signal?: AbortSignal): Promise<Album | null> {
  const numericId = albumId.replace(/^itunes:/, '');
  if (!/^\d+$/.test(numericId)) return null;
  const params = new URLSearchParams({ id: numericId, entity: 'song', country: 'IN' });
  const payload = await fetchJson<{ results?: ITunesResult[] }>(`${ITUNES_API}/lookup?${params}`, signal);
  const [collection, ...songs] = payload.results ?? [];
  if (!collection?.collectionId) return null;
  const tracks: Track[] = songs.filter((song) => song.trackId).map((song) => ({
    id: `itunes:${song.trackId}`,
    title: song.trackName ?? 'Untitled',
    artist: song.artistName ?? collection.artistName ?? 'Unknown artist',
    album: song.collectionName ?? collection.collectionName ?? 'Unknown album',
    albumId: `itunes:${collection.collectionId}`,
    artworkUrl: (song.artworkUrl100 ?? collection.artworkUrl100 ?? '').replace('100x100bb', '600x600bb'),
    durationSec: Math.round((song.trackTimeMillis ?? 0) / 1000),
    language: normalizeLanguage(song.primaryGenreName),
    audioUrl: song.previewUrl ?? '',
    source: 'itunes',
  }));
  return {
    id: `itunes:${collection.collectionId}`,
    title: collection.collectionName ?? 'Untitled album',
    artist: collection.artistName ?? 'Unknown artist',
    artworkUrl: (collection.artworkUrl100 ?? '').replace('100x100bb', '600x600bb'),
    year: Number(collection.releaseDate?.slice(0, 4)) || 0,
    language: normalizeLanguage(collection.primaryGenreName),
    tracks,
    source: 'itunes',
  };
}

/** Load a complete ordered album tracklist. Saavn album IDs may be raw or prefixed with `saavn:`. */
export async function getAlbumDetails(albumId: string, signal?: AbortSignal): Promise<Album | null> {
  if (albumId.startsWith('itunes:')) return getITunesAlbumDetails(albumId, signal);
  const id = albumId.replace(/^saavn:/, '');
  const params = new URLSearchParams({ id });
  try {
    const payload = await saavnRequest<SaavnResponse<SaavnAlbum>>(`/albums?${params}`, signal);
    const raw = Array.isArray(payload.data) ? payload.data[0] : payload.data;
    if (raw && !Array.isArray(raw) && typeof raw === 'object') {
      const album = normalizeSaavnAlbum(raw as SaavnAlbum);
      if (album) return album;
    }
  } catch (error) {
    if (signal?.aborted) throw error;
  }
  // If a Saavn album ID cannot be resolved by iTunes, use it as a search term as a best-effort fallback.
  const fallback = await searchITunesAlbums(id, signal);
  return fallback[0] ? getITunesAlbumDetails(fallback[0].id, signal) : null;
}
