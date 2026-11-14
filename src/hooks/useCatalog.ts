import type { Album, CatalogResult, MusicLanguage, Track } from '../types/music';
import { getAlbumDetails, getTrendingByLanguage, searchMovieAlbums, searchSongs } from '../services/streamingService';

interface CatalogState<T> {
  items: T[];
  source: CatalogResult<T>['source'] | null;
  loading: boolean;
  error: string | null;
}

const emptyState = <T,>(): CatalogState<T> => ({ items: [], source: null, loading: false, error: null });

/** React catalog helpers with request cancellation and stale-response protection. */
export function useCatalog() {
  const [songs, setSongs] = useState<CatalogState<Track>>(emptyState);
  const [albums, setAlbums] = useState<CatalogState<Album>>(emptyState);
  const [album, setAlbum] = useState<Album | null>(null);
  const [albumLoading, setAlbumLoading] = useState(false);
  const [albumError, setAlbumError] = useState<string | null>(null);
  const activeRequests = useRef<{ songs?: AbortController; albums?: AbortController; details?: AbortController }>({});
  const requestId = useRef({ songs: 0, albums: 0, details: 0 });

  const runSongSearch = useCallback(async (query: string, language?: MusicLanguage) => {
    activeRequests.current.songs?.abort();
    const controller = new AbortController();
    activeRequests.current.songs = controller;
    const id = ++requestId.current.songs;
    setSongs((current) => ({ ...current, loading: true, error: null }));
    try {
      const result = await searchSongs(query, language, controller.signal);
      if (requestId.current.songs === id) setSongs({ ...result, loading: false, error: null });
      return result.items;
    } catch (error) {
      if (controller.signal.aborted) return [];
      const message = error instanceof Error ? error.message : 'Unable to load songs.';
      if (requestId.current.songs === id) setSongs((current) => ({ ...current, loading: false, error: message }));
      return [];
    }
  }, []);

  const runTrending = useCallback(async (language: MusicLanguage) => {
    activeRequests.current.songs?.abort();
    const controller = new AbortController();
    activeRequests.current.songs = controller;
    const id = ++requestId.current.songs;
    setSongs((current) => ({ ...current, loading: true, error: null }));
    try {
      const result = await getTrendingByLanguage(language, controller.signal);
      if (requestId.current.songs === id) setSongs({ ...result, loading: false, error: null });
      return result.items;
    } catch (error) {
      if (controller.signal.aborted) return [];
      const message = error instanceof Error ? error.message : 'Unable to load trending songs.';
      if (requestId.current.songs === id) setSongs((current) => ({ ...current, loading: false, error: message }));
      return [];
    }
  }, []);

  const runAlbumSearch = useCallback(async (query: string) => {
    activeRequests.current.albums?.abort();
    const controller = new AbortController();
    activeRequests.current.albums = controller;
    const id = ++requestId.current.albums;
    setAlbums((current) => ({ ...current, loading: true, error: null }));
    try {
      const result = await searchMovieAlbums(query, controller.signal);
      if (requestId.current.albums === id) setAlbums({ ...result, loading: false, error: null });
      return result.items;
    } catch (error) {
      if (controller.signal.aborted) return [];
      const message = error instanceof Error ? error.message : 'Unable to load albums.';
      if (requestId.current.albums === id) setAlbums((current) => ({ ...current, loading: false, error: message }));
      return [];
    }
  }, []);

  const loadAlbum = useCallback(async (albumId: string) => {
    activeRequests.current.details?.abort();
    const controller = new AbortController();
    activeRequests.current.details = controller;
    const id = ++requestId.current.details;
    setAlbumLoading(true);
    setAlbumError(null);
    try {
      const result = await getAlbumDetails(albumId, controller.signal);
      if (requestId.current.details === id) setAlbum(result);
      return result;
    } catch (error) {
      if (controller.signal.aborted) return null;
      const message = error instanceof Error ? error.message : 'Unable to load album details.';
      if (requestId.current.details === id) setAlbumError(message);
      return null;
    } finally {
      if (requestId.current.details === id) setAlbumLoading(false);
    }
  }, []);

  useEffect(() => () => {
    activeRequests.current.songs?.abort();
    activeRequests.current.albums?.abort();
    activeRequests.current.details?.abort();
  }, []);

  return {
    songs,
    albums,
    album,
    albumLoading,
    albumError,
    searchSongs: runSongSearch,
    getTrendingByLanguage: runTrending,
    searchMovieAlbums: runAlbumSearch,
    getAlbumDetails: loadAlbum,
  };
}

import { useCallback, useEffect, useRef, useState } from 'react';
