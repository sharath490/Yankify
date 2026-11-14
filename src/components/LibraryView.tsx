import { useEffect, useMemo, useState } from 'react';
import { Album, Track } from '../types/music';
import { addTrackToPlaylist, createPlaylist, deletePlaylist, readLibrary, removeSavedAlbum, removeTrackFromPlaylist, saveAlbum, subscribeLibrary, UserPlaylist } from '../services/libraryService';

 type LibraryFilter = 'Playlists' | 'Albums' | 'YT Music';

interface LibraryViewProps {
  onPlayTrack?: (track: Track, queue?: Track[]) => void;
  onOpenAlbum?: (album: Album) => void;
}

export default function LibraryView({ onPlayTrack, onOpenAlbum }: LibraryViewProps) {
  const [library, setLibrary] = useState(readLibrary);
  const [filter, setFilter] = useState<LibraryFilter>('Playlists');
  const [createOpen, setCreateOpen] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [trackPickerOpen, setTrackPickerOpen] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => subscribeLibrary(() => setLibrary(readLibrary())), []);
  const trackMap = useMemo(() => new Map([...library.likedTracks, ...library.recentlyPlayed].map((track) => [track.id, track])), [library.likedTracks, library.recentlyPlayed]);
  const youtubeTracks = useMemo(() => [...trackMap.values()].filter((track) => track.source === 'youtube'), [trackMap]);
  const availableTracks = useMemo(() => [...trackMap.values()], [trackMap]);
  const activePlaylist = library.playlists.find((playlist) => playlist.id === selectedPlaylist);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2200);
  };
  const submitPlaylist = () => {
    const created = createPlaylist(playlistName);
    if (!created) return;
    setPlaylistName('');
    setCreateOpen(false);
    setSelectedPlaylist(created.id);
  };
  const addToPlaylist = (playlist: UserPlaylist, track: Track) => {
    addTrackToPlaylist(playlist.id, track);
    setTrackPickerOpen(false);
    notify(`Added ${track.title} to ${playlist.name}`);
  };

  return <main className="min-h-screen space-y-7 pb-32 text-white">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-zinc-400">Everything you keep close</p><h1 className="mt-1 text-4xl font-black tracking-tight">Your Library</h1></div><button type="button" onClick={() => setCreateOpen(true)} className="rounded-full bg-gradient-to-r from-[#fa2d48] to-[#e8633c] px-5 py-3 text-sm font-bold shadow-lg">＋ New playlist</button></header>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <button type="button" onClick={() => { setFilter('Playlists'); setSelectedPlaylist(null); }} className="rounded-2xl border border-white/10 bg-[#17191f] p-4 text-left"><span className="block text-2xl font-black">{library.likedTracks.length}</span><span className="text-sm text-zinc-400">Liked songs</span></button>
      <button type="button" onClick={() => setFilter('Albums')} className="rounded-2xl border border-white/10 bg-[#17191f] p-4 text-left"><span className="block text-2xl font-black">{library.savedAlbums.length}</span><span className="text-sm text-zinc-400">Saved albums</span></button>
      <button type="button" onClick={() => setFilter('Playlists')} className="rounded-2xl border border-white/10 bg-[#17191f] p-4 text-left"><span className="block text-2xl font-black">{library.recentlyPlayed.length}</span><span className="text-sm text-zinc-400">Recently played</span></button>
      <button type="button" onClick={() => setFilter('YT Music')} className="rounded-2xl border border-white/10 bg-[#17191f] p-4 text-left"><span className="block text-2xl font-black">{youtubeTracks.length}</span><span className="text-sm text-zinc-400">YT Music</span></button>
    </div>
    <nav aria-label="Library filters" className="flex gap-2">{(['Playlists', 'Albums', 'YT Music'] as const).map((item) => <button type="button" key={item} onClick={() => { setFilter(item); setSelectedPlaylist(null); }} className={`rounded-full px-4 py-2 text-sm font-semibold ${filter === item ? 'bg-white text-black' : 'border border-white/10 bg-white/5 text-zinc-300'}`}>{item}</button>)}</nav>

    {filter === 'Albums' && <section><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">Saved movie albums</h2></div><div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{library.savedAlbums.map((album) => <article key={album.id} className="group relative"><button type="button" onClick={() => onOpenAlbum?.(album)} className="w-full text-left"><img src={album.artworkUrl} alt="" className="aspect-square w-full rounded-2xl object-cover transition group-hover:scale-[1.02]" /><span className="mt-3 block truncate font-semibold">{album.title}</span><span className="mt-1 block truncate text-sm text-zinc-400">{album.artist}</span></button><button type="button" aria-label={`Remove ${album.title} from saved albums`} onClick={() => removeSavedAlbum(album.id)} className="absolute right-2 top-2 rounded-full bg-black/70 px-3 py-1 text-sm">✕</button></article>)}</div>{!library.savedAlbums.length && <Empty text="Save soundtracks here to find them quickly." />}</section>}

    {filter === 'YT Music' && <section className="space-y-3"><h2 className="text-xl font-bold">YouTube Music</h2>{youtubeTracks.map((track) => <TrackRow key={track.id} track={track} onPlay={() => onPlayTrack?.(track, youtubeTracks)} />)}{!youtubeTracks.length && <Empty text="Imported YouTube tracks and liked videos will appear here." />}</section>}

    {filter === 'Playlists' && <section className="space-y-5">
      {selectedPlaylist && activePlaylist ? <div><button type="button" onClick={() => setSelectedPlaylist(null)} className="mb-4 text-sm text-zinc-400 hover:text-white">← All playlists</button><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-widest text-zinc-500">Playlist</p><h2 className="text-3xl font-black">{activePlaylist.name}</h2></div><button type="button" onClick={() => setTrackPickerOpen(true)} className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm">＋ Add tracks</button></div><div className="mt-5 space-y-2">{activePlaylist.trackIds.map((id) => trackMap.get(id)).filter((track): track is Track => !!track).map((track, index, list) => <div key={track.id} className="flex items-center gap-2"><div className="min-w-0 flex-1"><TrackRow track={track} onPlay={() => onPlayTrack?.(track, list)} /></div><button type="button" onClick={() => removeTrackFromPlaylist(activePlaylist.id, track.id)} aria-label={`Remove ${track.title}`} className="rounded-full px-3 py-2 text-zinc-400 hover:bg-white/10 hover:text-white">✕</button></div>)}{!activePlaylist.trackIds.length && <Empty text="This playlist is empty. Add tracks from your library." />}</div></div> : <><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{library.playlists.map((playlist) => <article key={playlist.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#17191f] p-4"><button type="button" onClick={() => setSelectedPlaylist(playlist.id)} className="min-w-0 flex-1 text-left"><span className="block truncate font-bold">{playlist.name}</span><span className="mt-1 block text-sm text-zinc-400">{playlist.trackIds.length} tracks</span></button><button type="button" aria-label={`Delete ${playlist.name}`} onClick={() => deletePlaylist(playlist.id)} className="rounded-full p-2 text-zinc-500 hover:bg-white/10 hover:text-white">✕</button></article>)}</div>{!library.playlists.length && <Empty text="Create your first playlist to collect tracks." />}<div><h2 className="mb-3 text-xl font-bold">Liked Songs <span className="text-sm font-normal text-zinc-500">{library.likedTracks.length}</span></h2><div className="space-y-2">{library.likedTracks.map((track) => <TrackRow key={track.id} track={track} onPlay={() => onPlayTrack?.(track, library.likedTracks)} />)}</div>{!library.likedTracks.length && <Empty text="Tap the heart in the player to save a song." />}</div><div><h2 className="mb-3 text-xl font-bold">Recently Played</h2><div className="space-y-2">{library.recentlyPlayed.slice(0, 12).map((track, index) => <TrackRow key={track.id} track={track} onPlay={() => onPlayTrack?.(track, library.recentlyPlayed.slice(index))} />)}</div>{!library.recentlyPlayed.length && <Empty text="Your listening history will show up here." />}</div></>}
    </section>}

    {createOpen && <Modal title="Create playlist" onClose={() => setCreateOpen(false)}><label className="block text-sm text-zinc-300" htmlFor="playlist-name">Playlist name</label><input id="playlist-name" autoFocus value={playlistName} onChange={(event) => setPlaylistName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') submitPlaylist(); }} placeholder="Late night favorites" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-[#fa2d48]" /><button type="button" onClick={submitPlaylist} disabled={!playlistName.trim()} className="mt-4 w-full rounded-full bg-[#fa2d48] py-3 font-bold disabled:opacity-40">Create playlist</button></Modal>}
    {trackPickerOpen && activePlaylist && <Modal title={`Add tracks to ${activePlaylist.name}`} onClose={() => setTrackPickerOpen(false)}><div className="max-h-[55vh] space-y-2 overflow-auto">{availableTracks.map((track) => <div key={track.id} className="flex items-center gap-3 rounded-xl bg-white/5 p-2"><img src={track.artworkUrl} alt="" className="h-10 w-10 rounded-lg object-cover" /><span className="min-w-0 flex-1 truncate text-sm">{track.title}</span><button type="button" onClick={() => addToPlaylist(activePlaylist, track)} disabled={activePlaylist.trackIds.includes(track.id)} className="rounded-full bg-white/10 px-3 py-1 text-xs disabled:opacity-40">{activePlaylist.trackIds.includes(track.id) ? 'Added' : 'Add'}</button></div>)}{!availableTracks.length && <Empty text="Listen to or like songs first, then add them to playlists." />}</div></Modal>}
    {toast && <div role="status" className="fixed bottom-8 left-1/2 z-[100] -translate-x-1/2 rounded-full border border-white/10 bg-[#202127] px-5 py-3 text-sm shadow-xl">{toast}</div>}
  </main>;
}

function TrackRow({ track, onPlay }: { track: Track; onPlay: () => void }) {
  return <button type="button" onClick={onPlay} className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-white/[.07]"><img src={track.artworkUrl} alt="" className="h-12 w-12 rounded-lg object-cover" /><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{track.title}</span><span className="block truncate text-xs text-zinc-400">{track.artist} · {track.album}</span></span><span className="text-[#fa2d48]">▶</span></button>;
}

function Empty({ text }: { text: string }) { return <p className="rounded-2xl border border-white/5 bg-white/[.03] p-5 text-sm text-zinc-500">{text}</p>; }
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) { return <div role="presentation" onClick={onClose} className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"><section role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()} className="w-full max-w-md rounded-3xl border border-white/10 bg-[#17191f] p-6 shadow-2xl"><header className="mb-5 flex items-center justify-between"><h2 className="text-xl font-bold">{title}</h2><button type="button" onClick={onClose} aria-label="Close" className="rounded-full bg-white/5 px-3 py-1">✕</button></header>{children}</section></div>; }
