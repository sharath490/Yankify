import { useEffect, useState } from 'react';
import type { Album, Track } from '../types/music';
import { useCatalog } from '../hooks/useCatalog';

interface AlbumViewProps {
  album: Album;
  onBack?: () => void;
  onPlayTrack?: (track: Track, queue?: Track[]) => void;
  onAddToQueue?: (track: Track) => void;
}

const formatTime = (duration: number) => `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}`;

export default function AlbumView({ album: initialAlbum, onBack, onPlayTrack, onAddToQueue }: AlbumViewProps) {
  const { album: loadedAlbum, albumLoading, albumError, getAlbumDetails } = useCatalog();
  const [queueNotice, setQueueNotice] = useState('');
  const album = loadedAlbum?.id === initialAlbum.id ? loadedAlbum : initialAlbum;
  const needsTracks = !album.tracks.length && !!album.id;

  useEffect(() => {
    if (needsTracks) void getAlbumDetails(initialAlbum.id);
  }, [initialAlbum.id, needsTracks, getAlbumDetails]);

  const playAlbum = () => {
    if (album.tracks[0]) onPlayTrack?.(album.tracks[0], album.tracks);
  };

  const addTrack = (track: Track) => {
    onAddToQueue?.(track);
    setQueueNotice(`${track.title} added to queue`);
    window.setTimeout(() => setQueueNotice(''), 2200);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0b0c0f] pb-28 text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[520px] opacity-40 blur-3xl" style={{ backgroundImage: `linear-gradient(to bottom, rgba(11,12,15,.15), #0b0c0f), url(${album.artworkUrl})`, backgroundPosition: 'center', backgroundSize: 'cover' }} />
      <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-5 sm:px-7">
        <button type="button" onClick={onBack} className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-4 py-2 text-sm text-zinc-200 backdrop-blur-xl transition hover:bg-white/10"><span aria-hidden="true">←</span> Back</button>
        <header className="flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:gap-8">
          <img src={album.artworkUrl} alt={`${album.title} album cover`} className="aspect-square w-52 rounded-[28px] object-cover shadow-[0_25px_70px_rgba(0,0,0,.55)] sm:w-64" />
          <div className="min-w-0 pb-1">
            <p className="text-xs font-bold uppercase tracking-[.22em] text-zinc-300">Movie soundtrack · {album.language}</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-.05em] sm:text-6xl">{album.title}</h1>
            <p className="mt-3 text-base text-zinc-300">Music by <span className="font-semibold text-white">{album.artist || 'Various artists'}</span></p>
            <p className="mt-2 text-sm text-zinc-400">{album.year || 'Release year unavailable'}{album.tracks.length ? ` · ${album.tracks.length} songs` : ''}</p>
            <button type="button" disabled={!album.tracks.length} onClick={playAlbum} className="mt-6 inline-flex items-center gap-3 rounded-full bg-[#fa2d48] px-6 py-3 font-bold shadow-[0_12px_35px_rgba(250,45,72,.25)] transition hover:bg-[#ff4560] disabled:cursor-not-allowed disabled:opacity-50"><span>▶</span> Play Full Album</button>
          </div>
        </header>

        <section className="mt-12">
          <div className="mb-3 grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 border-b border-white/10 px-4 pb-3 text-xs font-bold uppercase tracking-[.18em] text-zinc-500"><span>#</span><span>Title</span><span>Duration</span></div>
          {albumLoading && needsTracks && <p className="px-4 py-8 text-sm text-zinc-400">Loading the complete soundtrack…</p>}
          {albumError && !album.tracks.length && <p role="alert" className="px-4 py-6 text-sm text-rose-300">{albumError}</p>}
          {!albumLoading && !album.tracks.length && <p className="px-4 py-8 text-sm text-zinc-400">No tracklist is available for this album yet.</p>}
          <ol className="space-y-1">
            {album.tracks.map((track, index) => <li key={track.id} className="group grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-4 py-3 transition hover:bg-white/[.07]">
              <button type="button" onClick={() => onPlayTrack?.(track, album.tracks)} aria-label={`Play ${track.title}`} className="text-left text-sm tabular-nums text-zinc-500 group-hover:text-[#fa2d48]">{String(index + 1).padStart(2, '0')}</button>
              <button type="button" onClick={() => onPlayTrack?.(track, album.tracks)} className="min-w-0 text-left"><span className="block truncate font-semibold text-white">{track.title}</span><span className="mt-1 block truncate text-sm text-zinc-400">{track.artist}</span></button>
              <div className="flex items-center gap-3"><span className="text-sm tabular-nums text-zinc-500">{formatTime(track.durationSec)}</span><button type="button" onClick={() => addTrack(track)} aria-label={`Add ${track.title} to queue`} title="Add to queue" className="rounded-full px-2 py-1 text-lg text-zinc-500 opacity-100 transition hover:bg-white/10 hover:text-white sm:opacity-0 sm:group-hover:opacity-100">＋</button></div>
            </li>)}
          </ol>
          {queueNotice && <p role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-[#202127] px-5 py-3 text-sm shadow-xl">{queueNotice}</p>}
        </section>
      </div>
    </main>
  );
}
