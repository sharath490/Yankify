import { useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';

/** Keeps the compact player mounted during the full-screen transition for a continuous shared playback state. */
export default function MiniPlayer({ onExpand }: { onExpand: () => void }) {
  const { track, isPlaying, togglePlayback } = usePlayer();
  useEffect(() => {
    document.documentElement.style.setProperty('--mini-player-easing', 'cubic-bezier(.22,1,.36,1)');
  }, []);
  if (!track) return null;
  return <aside className="fixed inset-x-3 bottom-4 z-[60] mx-auto max-w-3xl animate-[slide-up_.35s_cubic-bezier(.22,1,.36,1)] rounded-2xl border border-white/10 bg-[#17191f]/90 p-3 text-white shadow-2xl backdrop-blur-2xl sm:inset-x-6 sm:bottom-6">
    <div className="flex items-center gap-3"><button type="button" onClick={onExpand} className="flex min-w-0 flex-1 items-center gap-3 text-left"><img src={track.artworkUrl} alt="" className="h-12 w-12 rounded-xl object-cover" /><span className="min-w-0"><span className="block truncate text-sm font-bold">{track.title}</span><span className="block truncate text-xs text-zinc-400">{track.artist}</span></span></button><button type="button" onClick={togglePlayback} aria-label={isPlaying ? 'Pause' : 'Play'} className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#fa2d48] to-[#e8633c] font-bold">{isPlaying ? 'Ⅱ' : '▶'}</button><button type="button" onClick={onExpand} aria-label="Open full player" className="rounded-full px-3 py-2 text-zinc-300 hover:bg-white/10">⌃</button></div>
  </aside>;
}
