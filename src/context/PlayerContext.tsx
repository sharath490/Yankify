import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Track } from '../types/music';
import { readLibrary, recordRecentlyPlayed, toggleLikedTrack } from '../services/libraryService';

export type PlayerMode = 'song' | 'video' | 'cassette';
export type RepeatMode = 'off' | 'all' | 'one';

interface PlayerContextValue {
  track: Track | null;
  queue: Track[];
  mode: PlayerMode;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
  favorite: boolean;
  audioRef: React.RefObject<HTMLAudioElement>;
  playTrack: (track: Track, queue?: Track[]) => void;
  setQueue: (tracks: Track[]) => void;
  setMode: (mode: PlayerMode) => void;
  togglePlayback: () => void;
  playNext: () => void;
  playPrevious: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  setShuffle: (enabled: boolean) => void;
  cycleRepeat: () => void;
  toggleFavorite: () => void;
  setVideoPlaybackState: (playing: boolean, time?: number, duration?: number) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [queue, setQueueState] = useState<Track[]>([]);
  const [mode, setMode] = useState<PlayerMode>('song');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('off');
  const [libraryVersion, setLibraryVersion] = useState(0);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    if (mode !== 'song' || !track?.audioUrl || !isPlaying) {
      audio.pause();
      return;
    }
    void audio.play().catch(() => setIsPlaying(false));
  }, [track, mode, isPlaying, volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const updateTime = () => setCurrentTime(audio.currentTime || 0);
    const updateDuration = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : track?.durationSec ?? 0);
    const ended = () => {
      if (repeat === 'one') { audio.currentTime = 0; void audio.play(); }
      else playNext();
    };
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('durationchange', updateDuration);
    audio.addEventListener('ended', ended);
    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('durationchange', updateDuration);
      audio.removeEventListener('ended', ended);
    };
  });

  useEffect(() => {
    const refresh = () => setLibraryVersion((value) => value + 1);
    const mirrorChanged = (event: Event) => {
      const message = (event as CustomEvent<string>).detail;
      setToast(message || 'Switched to an available music source.');
      window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToast(''), 3200);
    };
    window.addEventListener('yankify:library-change', refresh);
    window.addEventListener('storage', refresh);
    window.addEventListener('yankify:mirror-switch', mirrorChanged);
    return () => {
      window.removeEventListener('yankify:library-change', refresh);
      window.removeEventListener('storage', refresh);
      window.removeEventListener('yankify:mirror-switch', mirrorChanged);
      window.clearTimeout(toastTimer.current);
    };
  }, []);

  const library = useMemo(() => readLibrary(), [libraryVersion]);
  const setQueue = useCallback((tracks: Track[]) => setQueueState(tracks), []);
  const playTrack = useCallback((nextTrack: Track, nextQueue?: Track[]) => {
    setTrack(nextTrack);
    if (nextQueue) setQueueState(nextQueue);
    setCurrentTime(0);
    setDuration(nextTrack.durationSec || 0);
    setIsPlaying(true);
    recordRecentlyPlayed(nextTrack);
    if (nextTrack.youtubeVideoId && !nextTrack.audioUrl) setMode('video');
    else setMode('song');
  }, []);

  const advance = useCallback((direction: 1 | -1) => {
    if (!queue.length) return;
    const currentIndex = queue.findIndex((item) => item.id === track?.id);
    if (shuffle && direction === 1 && queue.length > 1) {
      let index = currentIndex;
      while (index === currentIndex) index = Math.floor(Math.random() * queue.length);
      playTrack(queue[index], queue);
      return;
    }
    let nextIndex = currentIndex + direction;
    if (nextIndex < 0) nextIndex = repeat === 'all' ? queue.length - 1 : 0;
    if (nextIndex >= queue.length) {
      if (repeat === 'all') nextIndex = 0;
      else { setIsPlaying(false); setCurrentTime(0); return; }
    }
    playTrack(queue[nextIndex], queue);
  }, [queue, track?.id, shuffle, repeat, playTrack]);

  const playNext = useCallback(() => advance(1), [advance]);
  const seek = useCallback((time: number) => {
    const nextTime = Math.max(0, Math.min(time, duration || track?.durationSec || time));
    setCurrentTime(nextTime);
    if (mode === 'song' && audioRef.current) audioRef.current.currentTime = nextTime;
  }, [duration, track?.durationSec, mode]);
  const playPrevious = useCallback(() => {
    if (currentTime > 3) { seek(0); return; }
    advance(-1);
  }, [currentTime, advance, seek]);
  const togglePlayback = useCallback(() => setIsPlaying((playing) => !playing), []);
  const setVolume = useCallback((value: number) => setVolumeState(Math.max(0, Math.min(1, value))), []);
  const cycleRepeat = useCallback(() => setRepeat((value) => value === 'off' ? 'all' : value === 'all' ? 'one' : 'off'), []);
  const toggleFavorite = useCallback(() => { if (track) toggleLikedTrack(track); }, [track]);
  const setVideoPlaybackState = useCallback((playing: boolean, time?: number, videoDuration?: number) => {
    setIsPlaying(playing);
    if (time !== undefined && Number.isFinite(time)) setCurrentTime(time);
    if (videoDuration !== undefined && Number.isFinite(videoDuration)) setDuration(videoDuration);
  }, []);

  useEffect(() => {
    if (!track || !('mediaSession' in navigator)) return;
    const artwork = track.artworkUrl ? track.artworkUrl.replace(/\d+x\d+/g, '512x512') : '';
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: track.album,
      artwork: artwork ? [{ src: artwork, sizes: '512x512', type: 'image/jpeg' }] : [],
    });
    const handlers: Array<[MediaSessionAction, MediaSessionActionHandler | null]> = [
      ['play', () => setIsPlaying(true)],
      ['pause', () => setIsPlaying(false)],
      ['previoustrack', () => playPrevious()],
      ['nexttrack', () => playNext()],
      ['seekto', (details) => { if (details.seekTime !== undefined) seek(details.seekTime); }],
      ['seekbackward', (details) => seek(Math.max(0, currentTime - (details.seekOffset ?? 10)))],
      ['seekforward', (details) => seek(Math.min(duration || track.durationSec, currentTime + (details.seekOffset ?? 10)))],
    ];
    for (const [action, handler] of handlers) {
      try { navigator.mediaSession.setActionHandler(action, handler); } catch { /* Browser does not support this action. */ }
    }
    return () => {
      for (const [action] of handlers) {
        try { navigator.mediaSession.setActionHandler(action, null); } catch { /* Ignore unsupported actions. */ }
      }
    };
  }, [track, playPrevious, playNext, seek, currentTime, duration]);

  useEffect(() => {
    if (!track || !('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    if (duration > 0) {
      try { navigator.mediaSession.setPositionState({ duration, playbackRate: 1, position: Math.min(currentTime, duration) }); } catch { /* Position state is optional. */ }
    }
  }, [track, isPlaying, currentTime, duration]);

  const value = useMemo<PlayerContextValue>(() => ({
    track, queue, mode, isPlaying, currentTime, duration: duration || track?.durationSec || 0,
    volume, shuffle, repeat, favorite: !!track && library.likedTracks.some((item) => item.id === track.id), audioRef,
    playTrack, setQueue, setMode, togglePlayback, playNext, playPrevious, seek,
    setVolume, setShuffle, cycleRepeat, toggleFavorite, setVideoPlaybackState,
  }), [track, queue, mode, isPlaying, currentTime, duration, volume, shuffle, repeat, library, playTrack, setQueue, togglePlayback, playNext, playPrevious, seek, setVolume, cycleRepeat, toggleFavorite, setVideoPlaybackState]);

  return <PlayerContext.Provider value={value}>{children}<audio ref={audioRef} src={track?.audioUrl || undefined} preload="metadata" />{toast && <div role="status" className="fixed bottom-24 left-1/2 z-[120] -translate-x-1/2 rounded-full border border-white/10 bg-[#202127]/95 px-5 py-3 text-sm text-white shadow-xl backdrop-blur-2xl transition-all duration-300">{toast}</div>}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerContextValue {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used inside PlayerProvider');
  return context;
}
