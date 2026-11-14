import { useEffect, useState } from 'react';
import type { Album, Track } from '../types/music';
import { useCatalog } from '../hooks/useCatalog';
import { findMusicVideoId } from '../services/youtubeMusicService';

type SearchCategory = 'All' | 'Songs' | 'Movie Albums' | 'Music Videos';
const categories: SearchCategory[] = ['All', 'Songs', 'Movie Albums', 'Music Videos'];
const moods = [
  { name: 'Tamil Hits', color: 'from-orange-500 to-rose-600', query: 'Tamil hit songs' },
  { name: 'Telugu Cinema', color: 'from-fuchsia-600 to-purple-900', query: 'Telugu movie soundtrack' },
  { name: 'Bollywood', color: 'from-amber-400 to-red-600', query: 'Hindi Bollywood hits' },
  { name: 'Indie Chill', color: 'from-emerald-400 to-teal-800', query: 'English indie chill' },
  { name: 'Lo-Fi Focus', color: 'from-blue-500 to-indigo-900', query: 'lofi focus' },
  { name: 'Malayalam', color: 'from-lime-500 to-green-900', query: 'Malayalam songs' },
  { name: 'Punjabi Energy', color: 'from-pink-500 to-rose-800', query: 'Punjabi hits' },
  { name: 'Late Night', color: 'from-violet-500 to-slate-900', query: 'late night music' },
];

interface SearchViewProps {
  onPlayTrack?: (track: Track, queue?: Track[]) => void;
  onOpenAlbum?: (album: Album) => void;
  youtubeApiKey?: string;
}

export default function SearchView({ onPlayTrack, onOpenAlbum, youtubeApiKey }: SearchViewProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [category, setCategory] = useState<SearchCategory>('All');
  const [videos, setVideos] = useState<Array<{ track: Track; videoId: string }>>([]);
  const [videoLoading, setVideoLoading] = useState(false);
  const { songs, albums, searchSongs, searchMovieAlbums } = useCatalog();

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!debouncedQuery) return;
    if (category === 'All' || category === 'Songs' || category === 'Music Videos') void searchSongs(debouncedQuery);
    if (category === 'All' || category === 'Movie Albums') void searchMovieAlbums(debouncedQuery);
  }, [debouncedQuery, category, searchSongs, searchMovieAlbums]);

  useEffect(() => {
    if (!debouncedQuery || (category !== 'Music Videos' && category !== 'All')) {
      setVideos([]);
      setVideoLoading(false);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    const tracks = songs.items.slice(0, 8);
    setVideoLoading(true);
    Promise.all(tracks.map(async (track) => {
      const videoId = await findMusicVideoId(track.title, track.artist, youtubeApiKey, controller.signal);
      return videoId ? { track, videoId } : null;
    })).then((results) => {
      if (!cancelled) setVideos(results.filter((item): item is { track: Track; videoId: string } => item !== null));
    }).catch(() => {
      if (!cancelled) setVideos([]);
    }).finally(() => {
      if (!cancelled) setVideoLoading(false);
    });
    return () => { cancelled = true; controller.abort(); };
  }, [debouncedQuery, category, songs.items, youtubeApiKey]);

  const pickMood = (moodQuery: string) => {
    setCategory('All');
    setQuery(moodQuery);
  };

  const visibleSongs = category === 'Movie Albums' ? [] : songs.items;
  const visibleAlbums = category === 'Songs' || category === 'Music Videos' ? [] : albums.items;

  return (
    <main className="min-h-screen space-y-7 pb-32 text-white">
      <header><p className="text-sm font-medium text-zinc-400">Find your next repeat</p><h1 className="mt-1 text-3xl font-black tracking-[-.04em] sm:text-4xl">Search</h1></header>
      <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#181a20] px-4 py-3 shadow-lg focus-within:border-[#fa2d48]/60">
        <span aria-hidden="true" className="text-xl text-zinc-400">⌕</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Songs, artists, movie albums…" className="w-full bg-transparent text-base text-white outline-none placeholder:text-zinc-500" aria-label="Search songs, artists, and movie albums" />
        {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="rounded-full px-2 text-zinc-400 hover:text-white">✕</button>}
      </label>
      <nav aria-label="Search categories" className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${category === item ? 'bg-white text-black' : 'border border-white/10 bg-white/[.04] text-zinc-300 hover:bg-white/10'}`}>{item}</button>)}</nav>

      {!debouncedQuery ? <section className="space-y-4"><div><h2 className="text-xl font-bold">Browse all</h2><p className="mt-1 text-sm text-zinc-400">Choose a sound and let the next song find you.</p></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{moods.map((mood) => <button key={mood.name} type="button" onClick={() => pickMood(mood.query)} className={`relative min-h-[130px] overflow-hidden rounded-2xl bg-gradient-to-br ${mood.color} p-4 text-left shadow-lg transition hover:-translate-y-1 hover:shadow-2xl`}><span className="relative z-10 max-w-[130px] text-xl font-black tracking-tight">{mood.name}</span><span aria-hidden="true" className="absolute -bottom-5 -right-3 rotate-12 text-7xl opacity-20">♫</span></button>)}</div></section> : <div className="space-y-9">
        {(category === 'All' || category === 'Songs') && <section className="space-y-3"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">Songs</h2>{songs.loading && <span className="text-xs text-zinc-500">Searching…</span>}</div>{songs.error && !songs.items.length && <p role="alert" className="text-sm text-rose-300">{songs.error}</p>}<div className="space-y-1">{visibleSongs.map((track, index) => <button key={track.id} type="button" onClick={() => onPlayTrack?.(track, visibleSongs.slice(index))} className="group flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-white/[.07]"><img src={track.artworkUrl} alt="" className="h-14 w-14 rounded-lg object-cover" /><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{track.title}</span><span className="mt-1 block truncate text-sm text-zinc-400">{track.artist} · {track.album}</span></span><span className="rounded-full bg-[#1ed760] px-3 py-2 text-sm text-black opacity-0 transition group-hover:opacity-100">▶</span></button>)}{!songs.loading && !visibleSongs.length && <p className="rounded-xl bg-white/[.03] p-4 text-sm text-zinc-500">No songs found. Try another query.</p>}</div></section>}
        {(category === 'All' || category === 'Movie Albums') && <section className="space-y-3"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">Movie Albums</h2>{albums.loading && <span className="text-xs text-zinc-500">Searching…</span>}</div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{visibleAlbums.map((album) => <button key={album.id} type="button" onClick={() => onOpenAlbum?.(album)} className="rounded-2xl border border-white/5 bg-[#16181d] p-3 text-left transition hover:bg-white/10"><img src={album.artworkUrl} alt="" className="aspect-square w-full rounded-xl object-cover" /><span className="mt-3 block truncate font-semibold">{album.title}</span><span className="mt-1 block truncate text-sm text-zinc-400">{album.artist} · {album.year || album.language}</span></button>)}</div>{!albums.loading && !visibleAlbums.length && <p className="rounded-xl bg-white/[.03] p-4 text-sm text-zinc-500">No movie albums found.</p>}</section>}
        {(category === 'All' || category === 'Music Videos') && <section className="space-y-3"><div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">Music Videos</h2><p className="mt-1 text-sm text-zinc-400">Official and relevant video matches</p></div>{videoLoading && <span className="text-xs text-zinc-500">Finding videos…</span>}</div><div className="grid gap-3 sm:grid-cols-2">{videos.map(({ track, videoId }) => <button key={`${track.id}-${videoId}`} type="button" onClick={() => onPlayTrack?.({ ...track, youtubeVideoId: videoId, source: 'youtube' }, videos.map((item) => ({ ...item.track, youtubeVideoId: item.videoId, source: 'youtube' })))} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-[#16181d] p-3 text-left transition hover:bg-white/10"><img src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`} alt="" className="aspect-video w-32 rounded-xl object-cover" /><span className="min-w-0"><span className="block truncate font-semibold">{track.title}</span><span className="mt-1 block truncate text-sm text-zinc-400">{track.artist} · Watch video</span></span><span className="text-[#fa2d48]">▶</span></button>)}</div>{!videoLoading && !videos.length && <p className="rounded-xl bg-white/[.03] p-4 text-sm text-zinc-500">No video matches yet. Add a YouTube API key in Settings or try another search.</p>}</section>}
      </div>}
    </main>
  );
}
