import { Compass, Home, Library, Search, Sparkles } from 'lucide-react';
import { useState } from 'react';
import AlbumView from './components/AlbumView';
import HomeView from './components/HomeView';
import LibraryView from './components/LibraryView';
import MiniPlayer from './components/MiniPlayer';
import NowPlayingView from './components/NowPlayingView';
import SearchView from './components/SearchView';
import { usePlayer } from './context/PlayerContext';
import type { Album, Track } from './types/music';

 type Page = 'Home' | 'Explore' | 'Search' | 'Your Library';
const navItems = [
  { label: 'Home' as const, icon: Home },
  { label: 'Explore' as const, icon: Compass },
  { label: 'Search' as const, icon: Search },
  { label: 'Your Library' as const, icon: Library },
];

export default function App() {
  const [page, setPage] = useState<Page>('Home');
  const [album, setAlbum] = useState<Album | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const player = usePlayer();
  const playTrack = (track: Track, queue?: Track[]) => player.playTrack(track, queue);
  const openAlbum = (selected: Album) => setAlbum(selected);
  const navigate = (next: Page) => { setAlbum(null); setPage(next); };

  return <div className="min-h-screen w-full bg-[#0b0c0f] text-white">
    <div className="mx-auto flex min-h-screen w-full max-w-[1800px]">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-white/[.07] bg-black/20 p-5 backdrop-blur-2xl lg:block">
        <div className="mb-10 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[#fa2d48] to-[#e8633c]"><Sparkles className="h-5 w-5" /></span><span><span className="block text-[10px] uppercase tracking-[.22em] text-zinc-500">Listen together</span><strong className="text-xl">Yankify</strong></span></div>
        <nav className="space-y-2" aria-label="Main navigation">{navItems.map(({ label, icon: Icon }) => <button key={label} type="button" onClick={() => navigate(label)} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${page === label && !album ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}><Icon className="h-5 w-5" />{label}</button>)}</nav>
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[.04] p-4"><p className="text-xs uppercase tracking-widest text-zinc-500">One home for your sound</p><p className="mt-2 text-sm leading-relaxed text-zinc-300">Discover songs, explore movie soundtracks, and keep your favorites close.</p></div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/[.06] bg-[#0b0c0f]/75 px-4 backdrop-blur-2xl sm:px-7">
          <div className="flex items-center gap-2 lg:hidden"><span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#fa2d48] to-[#e8633c]"><Sparkles className="h-4 w-4" /></span><strong>Yankify</strong></div>
          <div className="hidden text-sm font-semibold text-zinc-300 lg:block">{album ? 'Movie soundtrack' : page}</div>
          <button type="button" onClick={() => navigate('Search')} className="rounded-full border border-white/10 bg-white/[.05] px-4 py-2 text-sm text-zinc-400 hover:bg-white/10">Search your vibe <span className="ml-2">⌕</span></button>
        </header>

        <div className="px-4 py-6 sm:px-7 lg:py-8">
          {album ? <AlbumView album={album} onBack={() => setAlbum(null)} onPlayTrack={playTrack} onAddToQueue={(track) => player.setQueue([...player.queue, track])} /> : page === 'Home' || page === 'Explore' ? <HomeView onPlayTrack={playTrack} onOpenAlbum={openAlbum} /> : page === 'Search' ? <SearchView onPlayTrack={playTrack} onOpenAlbum={openAlbum} /> : <LibraryView onPlayTrack={playTrack} onOpenAlbum={openAlbum} />}
        </div>
      </div>
    </div>

    <nav className="fixed inset-x-3 bottom-3 z-40 flex justify-around rounded-2xl border border-white/10 bg-[#15171c]/90 p-2 backdrop-blur-2xl lg:hidden" aria-label="Mobile navigation">{navItems.map(({ label, icon: Icon }) => <button key={label} type="button" aria-label={label} onClick={() => navigate(label)} className={`grid h-11 w-14 place-items-center rounded-xl ${page === label && !album ? 'text-[#fa2d48]' : 'text-zinc-400'}`}><Icon className="h-5 w-5" /></button>)}</nav>

    <MiniPlayer onExpand={() => setPlayerOpen(true)} />
    <NowPlayingView open={playerOpen} onClose={() => setPlayerOpen(false)} />
  </div>;
}
