import type { Album, Track } from '../types/music';

export interface UserPlaylist {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: number;
}

export interface LibraryData {
  likedTracks: Track[];
  savedAlbums: Album[];
  recentlyPlayed: Track[];
  playlists: UserPlaylist[];
}

const STORAGE_KEY = 'yankify-library-v1';
const CHANGE_EVENT = 'yankify:library-change';
const emptyLibrary = (): LibraryData => ({ likedTracks: [], savedAlbums: [], recentlyPlayed: [], playlists: [] });

export function readLibrary(): LibraryData {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<LibraryData>;
    return {
      likedTracks: Array.isArray(parsed.likedTracks) ? parsed.likedTracks : [],
      savedAlbums: Array.isArray(parsed.savedAlbums) ? parsed.savedAlbums : [],
      recentlyPlayed: Array.isArray(parsed.recentlyPlayed) ? parsed.recentlyPlayed : [],
      playlists: Array.isArray(parsed.playlists) ? parsed.playlists : [],
    };
  } catch {
    return emptyLibrary();
  }
}

function writeLibrary(update: (current: LibraryData) => LibraryData): LibraryData {
  const next = update(readLibrary());
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // The in-memory UI still works when storage is disabled or full.
  }
  return next;
}

export function subscribeLibrary(listener: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}

export function toggleLikedTrack(track: Track): void {
  writeLibrary((current) => ({
    ...current,
    likedTracks: current.likedTracks.some((item) => item.id === track.id)
      ? current.likedTracks.filter((item) => item.id !== track.id)
      : [track, ...current.likedTracks],
  }));
}

export function saveAlbum(album: Album): void {
  writeLibrary((current) => ({ ...current, savedAlbums: [album, ...current.savedAlbums.filter((item) => item.id !== album.id)] }));
}

export function removeSavedAlbum(albumId: string): void {
  writeLibrary((current) => ({ ...current, savedAlbums: current.savedAlbums.filter((album) => album.id !== albumId) }));
}

export function recordRecentlyPlayed(track: Track): void {
  writeLibrary((current) => ({
    ...current,
    recentlyPlayed: [track, ...current.recentlyPlayed.filter((item) => item.id !== track.id)].slice(0, 100),
  }));
}

export function createPlaylist(name: string): UserPlaylist | null {
  const cleanName = name.trim();
  if (!cleanName) return null;
  const playlist: UserPlaylist = { id: `playlist:${crypto.randomUUID?.() ?? Date.now()}`, name: cleanName, trackIds: [], createdAt: Date.now() };
  writeLibrary((current) => ({ ...current, playlists: [playlist, ...current.playlists] }));
  return playlist;
}

export function deletePlaylist(playlistId: string): void {
  writeLibrary((current) => ({ ...current, playlists: current.playlists.filter((playlist) => playlist.id !== playlistId) }));
}

export function addTrackToPlaylist(playlistId: string, track: Track): void {
  writeLibrary((current) => ({
    ...current,
    likedTracks: current.likedTracks.some((item) => item.id === track.id) ? current.likedTracks : current.likedTracks,
    playlists: current.playlists.map((playlist) => playlist.id === playlistId && !playlist.trackIds.includes(track.id)
      ? { ...playlist, trackIds: [...playlist.trackIds, track.id] }
      : playlist),
  }));
}

export function removeTrackFromPlaylist(playlistId: string, trackId: string): void {
  writeLibrary((current) => ({ ...current, playlists: current.playlists.map((playlist) => playlist.id === playlistId
    ? { ...playlist, trackIds: playlist.trackIds.filter((id) => id !== trackId) }
    : playlist) }));
}
