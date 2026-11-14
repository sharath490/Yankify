import type { MusicLanguage, Track } from '../types/music';

const YOUTUBE_API = 'https://www.googleapis.com/youtube/v3';
const PIPED_SEARCH = 'https://pipedapi.kavin.rocks/search?filter=music_videos&q=';
const GOOGLE_IDENTITY_SCRIPT = 'https://accounts.google.com/gsi/client';
const YOUTUBE_READONLY_SCOPE = 'https://www.googleapis.com/auth/youtube.readonly';

interface YouTubeSearchResponse {
  items?: Array<{ id?: { videoId?: string }; snippet?: { title?: string; channelTitle?: string } }>;
}
interface PipedResponse {
  items?: Array<{ url?: string; id?: string; title?: string; uploaderName?: string; uploader?: string }>;
}
interface GISAccessTokenResponse { access_token?: string; error?: string; expires_in?: number; }
interface GISCodeClient {
  requestAccessToken: (options?: { prompt?: string }) => void;
}
interface GIS {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (response: GISAccessTokenResponse) => void;
        error_callback?: (error: unknown) => void;
      }) => GISCodeClient;
      revoke: (token: string, callback?: () => void) => void;
    };
  };
}

declare global {
  interface Window { google?: { accounts?: GIS['accounts'] }; }
}

export interface YouTubePlaylist {
  id: string;
  title: string;
  description: string;
  artworkUrl: string;
  tracks: Track[];
}

let scriptPromise: Promise<void> | undefined;
let activeTokenClient: GISCodeClient | undefined;

function loadGoogleIdentity(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_IDENTITY_SCRIPT}"]`);
    const script = existing ?? document.createElement('script');
    script.src = GOOGLE_IDENTITY_SCRIPT;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = undefined;
      reject(new Error('Google Identity Services could not be loaded.'));
    };
    if (!existing) document.head.appendChild(script);
  });
  return scriptPromise;
}

function imageFromYouTube(thumbnails?: Record<string, { url?: string }>): string {
  return thumbnails?.maxres?.url ?? thumbnails?.standard?.url ?? thumbnails?.high?.url ?? thumbnails?.medium?.url ?? thumbnails?.default?.url ?? '';
}

/** Find a likely music video. YouTube Data API is preferred; Piped is a best-effort public fallback. */
export async function findMusicVideoId(title: string, artist: string, apiKey?: string, signal?: AbortSignal): Promise<string | null> {
  if (apiKey?.trim()) {
    try {
      const params = new URLSearchParams({
        part: 'snippet',
        q: `${artist} ${title} official music video`,
        type: 'video',
        videoCategoryId: '10',
        videoEmbeddable: 'true',
        maxResults: '5',
        key: apiKey.trim(),
      });
      const response = await fetch(`${YOUTUBE_API}/search?${params}`, { signal });
      if (response.ok) {
        const payload = await response.json() as YouTubeSearchResponse;
        const id = payload.items?.find((item) => item.id?.videoId)?.id?.videoId;
        if (id) return id;
      }
    } catch (error) {
      if (signal?.aborted) throw error;
    }
  }

  try {
    const response = await fetch(`${PIPED_SEARCH}${encodeURIComponent(`${artist} ${title}`)}`, { signal });
    if (!response.ok) return null;
    const payload = await response.json() as PipedResponse;
    for (const item of payload.items ?? []) {
      const candidate = item.url ?? item.id ?? '';
      const match = candidate.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)?([\w-]{11})/);
      if (match?.[1]) return match[1];
    }
  } catch (error) {
    if (signal?.aborted) throw error;
  }
  return null;
}

function authorizedFetch(url: string, accessToken: string): Promise<Response> {
  return fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
}

async function fetchAllPages<T>(url: string, accessToken: string): Promise<T[]> {
  const items: T[] = [];
  let nextPageToken: string | undefined;
  do {
    const pageUrl = new URL(url);
    if (nextPageToken) pageUrl.searchParams.set('pageToken', nextPageToken);
    const response = await authorizedFetch(pageUrl.toString(), accessToken);
    if (!response.ok) throw new Error(`YouTube API request failed (${response.status}).`);
    const payload = await response.json() as { items?: T[]; nextPageToken?: string };
    items.push(...(payload.items ?? []));
    nextPageToken = payload.nextPageToken;
  } while (nextPageToken);
  return items;
}

interface PlaylistItem {
  id?: string;
  snippet?: {
    title?: string;
    description?: string;
    channelTitle?: string;
    thumbnails?: Record<string, { url?: string }>;
    resourceId?: { videoId?: string };
  };
}

function playlistItemToTrack(item: PlaylistItem): Track | null {
  const snippet = item.snippet;
  const videoId = snippet?.resourceId?.videoId;
  if (!videoId) return null;
  return {
    id: `youtube:${videoId}`,
    title: snippet?.title ?? 'Untitled video',
    artist: snippet?.channelTitle ?? 'YouTube creator',
    album: 'YouTube Music',
    albumId: item.id ?? '',
    artworkUrl: imageFromYouTube(snippet?.thumbnails),
    durationSec: 0,
    language: 'English' as MusicLanguage,
    // YouTube videos are played through the YouTube player, not as direct audio streams.
    audioUrl: '',
    youtubeVideoId: videoId,
    source: 'youtube',
  };
}

async function fetchPlaylistItems(playlistId: string, accessToken: string): Promise<Track[]> {
  const params = new URLSearchParams({ part: 'snippet,contentDetails', playlistId, maxResults: '50' });
  const items = await fetchAllPages<PlaylistItem>(`${YOUTUBE_API}/playlistItems?${params}`, accessToken);
  return items.map(playlistItemToTrack).filter((track): track is Track => track !== null);
}

/** Request an OAuth access token after the user configures their own Google OAuth client ID. */
export async function connectYouTubeAccount(clientId: string): Promise<string> {
  if (!clientId.trim()) throw new Error('Enter a Google OAuth client ID first.');
  await loadGoogleIdentity();
  const gis = window.google?.accounts?.oauth2;
  if (!gis) throw new Error('Google Identity Services is unavailable.');
  return new Promise((resolve, reject) => {
    activeTokenClient = gis.initTokenClient({
      client_id: clientId.trim(),
      scope: YOUTUBE_READONLY_SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) reject(new Error(response.error ?? 'Google did not return an access token.'));
        else resolve(response.access_token);
      },
      error_callback: () => reject(new Error('Google sign-in was cancelled or failed.')),
    });
    activeTokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

/** Import the user's playlists and YouTube's Liked videos playlist using a user-authorized OAuth token. */
export async function importYouTubeLibrary(accessToken: string): Promise<YouTubePlaylist[]> {
  if (!accessToken) throw new Error('Connect a YouTube account before importing its library.');
  const playlistParams = new URLSearchParams({ part: 'snippet,contentDetails', mine: 'true', maxResults: '50' });
  const entries = await fetchAllPages<{ id?: string; snippet?: { title?: string; description?: string; thumbnails?: Record<string, { url?: string }> } }>(
    `${YOUTUBE_API}/playlists?${playlistParams}`,
    accessToken,
  );
  const playlists = await Promise.all(entries.filter((entry) => entry.id).map(async (entry) => ({
    id: entry.id!,
    title: entry.snippet?.title ?? 'Untitled playlist',
    description: entry.snippet?.description ?? '',
    artworkUrl: imageFromYouTube(entry.snippet?.thumbnails),
    tracks: await fetchPlaylistItems(entry.id!, accessToken),
  })));

  // YouTube exposes the current user's liked videos as the special playlist ID `LL`.
  try {
    const liked = await fetchPlaylistItems('LL', accessToken);
    playlists.unshift({ id: 'LL', title: 'Liked Music', description: 'Videos you have liked on YouTube.', artworkUrl: liked[0]?.artworkUrl ?? '', tracks: liked });
  } catch {
    // Some accounts or API configurations do not expose this special playlist; keep imported playlists.
  }
  return playlists;
}

export function disconnectYouTubeAccount(accessToken: string): void {
  if (window.google?.accounts?.oauth2 && accessToken) window.google.accounts.oauth2.revoke(accessToken);
  activeTokenClient = undefined;
}
