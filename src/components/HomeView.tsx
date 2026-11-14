import { useEffect, useMemo, useState } from 'react';
import type { Album, MusicLanguage, Track } from '../types/music';
import { useCatalog } from '../hooks/useCatalog';

const languages: Array<'All' | MusicLanguage> = ['All', 'Telugu', 'Tamil', 'Hindi', 'English', 'Malayalam', 'Punjabi'];
const fallbackArt = [
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=700&q=80',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=700&q=80',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=700&q=80',
  'https://images.unsplash.com/photo-1525201548942-d8732f6617a0?auto=format&fit=crop&w=700&q=80',
];

interface HomeViewProps {
  greetingName?: string;
  onPlayTrack?: (track: Track, queue?: Track[]) => void;
  onOpenAlbum?: (album: Album) => void;
  onOpenSettings?: () => void;
}

const seconds = (value: number) => `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;

export default function HomeView({ greetingName = 'Sharath', onPlayTrack, onOpenAlbum, onOpenSettings }: HomeViewProps) {
  const [language, setLanguage] = useState<'All' | MusicLanguage>('All');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [clientId, setClientId] = useState(() => localStorage.getItem('yankify-google-client-id') ?? '');
  const { songs, albums, getTrendingByLanguage, searchMovieAlbums } = useCatalog();

  useEffect(() => {
    if (language !== 'All') void getTrendingByLanguage(language);
    else void getTrendingByLanguage('English');
    void searchMovieAlbums(language === 'All' ? 'trending movie soundtrack' : `${language} movie soundtrack`);
  }, [language, getTrendingByLanguage, searchMovieAlbums]);

  const tracks = useMemo(() => songs.items.filter((track) => language === 'All' || track.language === language), [songs.items, language]);
  const albumItems = albums.items;
  const quickTracks = tracks.slice(0, 3);

  const saveSettings = () => {
    localStorage.setItem('yankify-google-client-id', clientId.trim());
    setSettingsOpen(false);
    onOpenSettings?.();
  };

  const playTrack = (track?: Track, index = 0) => {
    if (!track) return;
    onPlayTrack?.(track, tracks.slice(index));
  };

  const renderAlbumCarousel = (title: string, subtitle: string, items: Album[], accent: string) => (
    <section className="space-y-4" key={title}>
      <div className="flex items-end justify-between gap-3">
        <div><h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{title}</h2><p className="mt-1 text-sm text-zinc-400">{subtitle}</p></div>
        <span className="hidden text-xs font-semibold uppercase tracking-[.18em] text-zinc-500 sm:block">Made for you</span>
      </div>
      <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {(items.length ? items : []).slice(0, 10).map((album, index) => (
          <button key={`${title}-${album.id}`} onClick={() => onOpenAlbum?.(album)} className="group w-[200px] shrink-0 text-left" type="button">
            <div className="relative aspect-square overflow-hidden rounded-[26px] bg-[#1a1b20] shadow-[0_12px_35px_rgba(0,0,0,.32)]">
              {album.artworkUrl ? <img src={album.artworkUrl} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-110" /> : <div className="h-full w-full" style={{ background: `linear-gradient(145deg, ${accent}, #191a20)` }} />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-70" />
              <span className="absolute bottom-3 left-3 rounded-full bg-black/35 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md">{album.language}</span>
              <span className="absolute bottom-3 right-3 flex h-11 w-11 translate-y-2 items-center justify-center rounded-full bg-[#1ed760] text-lg text-black opacity-0 shadow-xl transition group-hover:translate-y-0 group-hover:opacity-100">▶</span>
            </div>
            <h3 className="mt-3 truncate font-semibold text-white">{album.title}</h3>
            <p className="mt-1 truncate text-sm text-zinc-400">{album.artist}{album.year ? ` · ${album.year}` : ''}</p>
          </button>
        ))}
        {!items.length && <div className="flex min-h-[230px] w-full items-center rounded-3xl border border-white/5 bg-white/[.03] px-5 text-sm text-zinc-500">{albums.loading ? 'Finding albums…' : 'Albums will appear here when the catalog is available.'}</div>}
      </div>
    </section>
  );

  const quickAccess = [
    { title: 'Liked Songs', detail: 'Your favorites, all together', color: 'from-[#2b3562] to-[#5434a5]', track: quickTracks[0] },
    { title: 'Recently Played', detail: quickTracks[1]?.title ?? 'Pick up where you left off', color: 'from-[#a23a2b] to-[#e8633c]', track: quickTracks[1] },
    { title: 'Daily Mixes', detail: `${language === 'All' ? 'Your' : language} daily blend`, color: 'from-[#137d68] to-[#39b78b]', track: quickTracks[2] },
    { title: 'Made for you', detail: 'A little bit of everything', color: 'from-[#753a6c] to-[#dc5686]', track: quickTracks[0] },
  ];

  return (
    <div className="min-h-screen space-y-9 pb-32 text-white">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-sm font-medium text-zinc-400">Your sound, all in one place</p><h1 className="mt-1 text-3xl font-black tracking-[-.04em] sm:text-4xl">Welcome Back, {greetingName}</h1></div>
        <button type="button" aria-label="Settings and API configuration" onClick={() => { setSettingsOpen(true); onOpenSettings?.(); }} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl text-zinc-200 transition hover:bg-white/10">⚙</button>
      </header>

      <nav aria-label="Filter by language" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {languages.map((item) => <button key={item} type="button" onClick={() => setLanguage(item)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${language === item ? 'bg-white text-black' : 'border border-white/10 bg-white/[.04] text-zinc-300 hover:bg-white/10'}`}>{item}</button>)}
      </nav>

      <section aria-label="Quick access" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {quickAccess.map((item, index) => <button key={item.title} type="button" onClick={() => playTrack(item.track, index)} className={`group relative flex min-h-[76px] items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r ${item.color} p-2 text-left transition hover:brightness-110`}>
          <img src={item.track?.artworkUrl || fallbackArt[index]} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover shadow-lg" />
          <span className="min-w-0 flex-1"><span className="block truncate font-bold text-white">{item.title}</span><span className="mt-0.5 block truncate text-xs text-white/70">{item.detail}</span></span>
          <span className="mr-2 flex h-10 w-10 shrink-0 translate-y-1 items-center justify-center rounded-full bg-[#1ed760] text-black opacity-0 shadow-xl transition group-hover:translate-y-0 group-hover:opacity-100">▶</span>
        </button>)}
      </section>

      {renderAlbumCarousel('Trending Movie Albums', 'Soundtracks making their way into your rotation', albumItems, '#fa2d48')}
      <section className="space-y-4">
        <div><h2 className="text-xl font-bold tracking-tight sm:text-2xl">Top Hits in Your Language</h2><p className="mt-1 text-sm text-zinc-400">{language === 'All' ? 'A fresh mix from across your languages' : `Fresh picks in ${language}`}</p></div>
        <div className="flex gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(tracks.length ? tracks : []).slice(0, 10).map((track, index) => <button key={track.id} onClick={() => playTrack(track, index)} type="button" className="group w-[200px] shrink-0 text-left">
            <div className="relative aspect-square overflow-hidden rounded-[26px] bg-[#181a20] shadow-xl"><img src={track.artworkUrl || fallbackArt[index % fallbackArt.length]} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-110" /><span className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" /><span className="absolute bottom-3 right-3 flex h-11 w-11 translate-y-2 items-center justify-center rounded-full bg-[#fa2d48] opacity-0 shadow-xl transition group-hover:translate-y-0 group-hover:opacity-100">▶</span></div>
            <span className="mt-3 block truncate font-semibold">{track.title}</span><span className="mt-1 block truncate text-sm text-zinc-400">{track.artist} · {seconds(track.durationSec)}</span>
          </button>)}
          {!tracks.length && <div className="flex min-h-[230px] w-full items-center rounded-3xl border border-white/5 bg-white/[.03] px-5 text-sm text-zinc-500">{songs.loading ? 'Finding your hits…' : songs.error ?? 'No tracks available right now.'}</div>}
        </div>
      </section>
      {renderAlbumCarousel('Spatial & Lo-Fi Sessions', 'Immersive sound for focus, late nights, and slow mornings', albumItems.slice().reverse(), '#7257d9')}

      {settingsOpen && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#17191f] p-6 shadow-2xl">
          <div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#fa2d48]">Yankify settings</p><h2 id="settings-title" className="mt-2 text-2xl font-bold">Connect your services</h2></div><button type="button" onClick={() => setSettingsOpen(false)} aria-label="Close settings" className="rounded-full bg-white/5 px-3 py-1 text-zinc-300 hover:bg-white/10">✕</button></div>
          <label htmlFor="google-client-id" className="mt-6 block text-sm font-medium text-zinc-300">Google OAuth client ID <span className="text-zinc-500">(optional)</span></label>
          <input id="google-client-id" value={clientId} onChange={(event) => setClientId(event.target.value)} placeholder="your-client-id.apps.googleusercontent.com" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-[#fa2d48]" />
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">The ID is stored in this browser only. Configure the YouTube Data API and authorized origin in Google Cloud before connecting.</p>
          <button type="button" onClick={saveSettings} className="mt-5 w-full rounded-full bg-gradient-to-r from-[#fa2d48] to-[#e8633c] px-5 py-3 font-bold">Save settings</button>
        </div>
      </div>}
    </div>
  );
}
