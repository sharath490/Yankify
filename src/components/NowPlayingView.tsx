import { Heart, ListMusic, Pause, Play, Repeat, Shuffle, SkipBack, SkipForward, Volume2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePlayer, type PlayerMode } from '../context/PlayerContext';
import { fetchLyrics, type LyricLine } from '../services/lyricsService';

const modes: Array<{ id: PlayerMode; label: string }> = [
  { id: 'song', label: 'Song' },
  { id: 'video', label: 'Video' },
  { id: 'cassette', label: 'Cassette' },
];
const timeLabel = (time: number) => `${Math.floor(Math.max(time, 0) / 60)}:${String(Math.floor(Math.max(time, 0) % 60)).padStart(2, '0')}`;

function paletteFor(title: string) {
  let hash = 0;
  for (const char of title) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  const hue = Math.abs(hash) % 360;
  return `radial-gradient(ellipse at 18% 18%, hsla(${hue}, 84%, 53%, .38), transparent 44%), radial-gradient(ellipse at 82% 78%, hsla(${(hue + 55) % 360}, 76%, 46%, .3), transparent 48%), linear-gradient(135deg, #0b0c0f, hsl(${(hue + 15) % 360} 28% 12%), #090a0d)`;
}

function CassetteDeck({ playing, progress, artwork }: { playing: boolean; progress: number; artwork: string }) {
  const roll = Math.max(8, 24 - Math.min(progress, 1) * 13);
  return <div className="w-full max-w-[540px] rounded-[30px] border border-white/15 bg-gradient-to-br from-[#efe3cb] via-[#c9baa1] to-[#82755f] p-5 shadow-[0_35px_90px_rgba(0,0,0,.5)] sm:p-8">
    <div className="relative rounded-[20px] border-[7px] border-[#302b27] bg-[#d6c6a9] p-5 shadow-inner">
      <div className="mb-4 flex items-center justify-between font-mono text-xs font-black uppercase tracking-[.28em] text-[#3d3329]"><span>YANKIFY · C-90</span><span>STEREO</span></div>
      <svg viewBox="0 0 520 230" role="img" aria-label="Animated cassette tape deck" className="w-full overflow-visible">
        <rect x="12" y="18" width="496" height="194" rx="25" fill="#efe4ce" stroke="#54483a" strokeWidth="6" />
        <rect x="48" y="48" width="424" height="118" rx="20" fill="#272a2b" />
        <path d="M65 64h390v83H65z" fill="#141718" stroke="#7d725f" strokeWidth="3" />
        <circle cx="158" cy="105" r="39" fill="#d5c6a7" stroke="#a58e67" strokeWidth="5" />
        <circle cx="362" cy="105" r="39" fill="#d5c6a7" stroke="#a58e67" strokeWidth="5" />
        <g className={playing ? 'cassette-spool' : ''} style={{ transformOrigin: '158px 105px' }}>
          <circle cx="158" cy="105" r={roll} fill="#b79b6b" /><path d={`M158 ${105 - roll}v${roll * 2}M${158 - roll} 105h${roll * 2}M${158 - roll * .7} ${105 - roll * .7}l${roll * 1.4} ${roll * 1.4}M${158 + roll * .7} ${105 - roll * .7}l${-roll * 1.4} ${roll * 1.4}`} stroke="#59472d" strokeWidth="4" />
        </g>
        <g className={playing ? 'cassette-spool' : ''} style={{ transformOrigin: '362px 105px', animationDirection: 'reverse' }}>
          <circle cx="362" cy="105" r={roll} fill="#b79b6b" /><path d={`M362 ${105 - roll}v${roll * 2}M${362 - roll} 105h${roll * 2}M${362 - roll * .7} ${105 - roll * .7}l${roll * 1.4} ${roll * 1.4}M${362 + roll * .7} ${105 - roll * .7}l${-roll * 1.4} ${roll * 1.4}`} stroke="#59472d" strokeWidth="4" />
        </g>
        <path d="M198 105h124" stroke="#c6a872" strokeWidth="5" /><path d="M217 168l-25 29h136l-25-29z" fill="#403a31" />
        <text x="260" y="82" textAnchor="middle" fill="#f4e8d0" fontSize="12" fontWeight="bold" letterSpacing="3">NOW PLAYING</text>
      </svg>
      <div className="mt-3 flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-[.22em] text-[#453c31]"><span>{artwork ? 'SIDE A' : 'YANKIFY MIX'}</span><span>{Math.round(progress * 100)}% PLAYED</span></div>
    </div>
    <style>{`@keyframes spool-spin { to { transform: rotate(360deg); } } .cassette-spool { animation: spool-spin 2.2s linear infinite; }`}</style>
  </div>;
}

function YouTubeFrame({ videoId, currentTime, playing, onState }: { videoId: string; currentTime: number; playing: boolean; onState: (playing: boolean, time?: number, duration?: number) => void }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const postCommand = (func: string, args: unknown[] = []) => frameRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), 'https://www.youtube.com');
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.youtube.com' || typeof event.data !== 'string') return;
      try {
        const data = JSON.parse(event.data) as { event?: string; info?: { currentTime?: number; duration?: number; playerState?: number } };
        if (data.event === 'infoDelivery' && data.info) onState(data.info.playerState === 1, data.info.currentTime, data.info.duration);
      } catch { /* Ignore unrelated YouTube messages. */ }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onState]);
  useEffect(() => { postCommand('seekTo', [currentTime, true]); }, [videoId]);
  useEffect(() => { postCommand(playing ? 'playVideo' : 'pauseVideo'); }, [playing, videoId]);

  return <div className="aspect-video w-full max-w-5xl overflow-hidden rounded-[26px] border border-white/10 bg-black shadow-2xl">
    <iframe ref={frameRef} title="YouTube music video" className="h-full w-full" src={`https://www.youtube.com/embed/${encodeURIComponent(videoId)}?enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}&start=${Math.floor(currentTime)}&playsinline=1&rel=0`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
  </div>;
}

interface NowPlayingViewProps { onClose?: () => void; open?: boolean; }

export default function NowPlayingView({ onClose, open = true }: NowPlayingViewProps) {
  const player = usePlayer();
  const { track, queue, mode, setMode, isPlaying, currentTime, duration, volume, shuffle, repeat, favorite, togglePlayback, playNext, playPrevious, seek, setVolume, setShuffle, cycleRepeat, toggleFavorite, setVideoPlaybackState, playTrack } = player;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const activeLyricRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!track || !showLyrics) return;
    const controller = new AbortController();
    setLyricsLoading(true);
    fetchLyrics(track.title, track.artist, controller.signal).then(setLyrics).catch(() => setLyrics([])).finally(() => setLyricsLoading(false));
    return () => controller.abort();
  }, [track?.id, showLyrics]);

  const activeLine = useMemo(() => lyrics.reduce((active, line, index) => line.time <= currentTime ? index : active, -1), [lyrics, currentTime]);
  useEffect(() => activeLyricRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), [activeLine]);
  const videoState = useCallback((playing: boolean, time?: number, videoDuration?: number) => setVideoPlaybackState(playing, time, videoDuration), [setVideoPlaybackState]);

  if (!open || !track) return null;
  const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0;
  const videoId = track.youtubeVideoId;

  return <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#0b0c0f] text-white" style={{ backgroundImage: paletteFor(track.title) }}>
    <div className="absolute inset-0 bg-black/35 backdrop-blur-3xl" />
    <div className="relative mx-auto flex min-h-full max-w-7xl flex-col px-4 pb-8 pt-4 sm:px-8">
      <header className="flex items-center justify-between gap-3">
        <button type="button" onClick={onClose} aria-label="Close player" className="rounded-full border border-white/10 bg-black/20 p-3 text-zinc-200 backdrop-blur-xl hover:bg-white/10"><X className="h-5 w-5" /></button>
        <div className="rounded-full border border-white/10 bg-black/30 p-1.5 backdrop-blur-2xl">
          <div className="flex items-center gap-1" role="tablist" aria-label="Playback mode">{modes.map((item) => <button key={item.id} type="button" role="tab" aria-selected={mode === item.id} onClick={() => {
            if (item.id === 'video' && !videoId) return;
            setMode(item.id);
          }} disabled={item.id === 'video' && !videoId} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${mode === item.id ? 'bg-white text-black shadow-lg' : 'text-zinc-300 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40'}`}>{item.label}</button>)}</div>
        </div>
        <button type="button" onClick={() => setDrawerOpen(true)} aria-label="Open queue" className="rounded-full border border-white/10 bg-black/20 p-3 text-zinc-200 backdrop-blur-xl hover:bg-white/10"><ListMusic className="h-5 w-5" /></button>
      </header>

      <main className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,.9fr)]">
        <section className="flex min-w-0 flex-col items-center">
          <div className="mb-6 flex w-full max-w-3xl items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.25em] text-white/60">{mode === 'song' ? 'Now playing · song' : mode === 'video' ? 'Now playing · video' : 'Now playing · cassette'}</p><p className="mt-1 text-xs text-white/40">{track.album} · {track.source}</p></div><button type="button" onClick={toggleFavorite} aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'} className={`rounded-full p-3 transition ${favorite ? 'text-rose-400' : 'text-white/60 hover:text-white'}`}><Heart className={`h-6 w-6 ${favorite ? 'fill-current' : ''}`} /></button></div>
          {mode === 'video' && videoId ? <YouTubeFrame videoId={videoId} currentTime={currentTime} playing={isPlaying} onState={videoState} /> : mode === 'cassette' ? <CassetteDeck playing={isPlaying} progress={progress} artwork={track.artworkUrl} /> : <img src={track.artworkUrl} alt={`${track.title} cover`} className={`aspect-square w-full max-w-[min(68vw,440px)] rounded-[30px] object-cover shadow-[0_35px_100px_rgba(0,0,0,.5)] transition-transform duration-700 ${isPlaying ? 'scale-[1.015]' : 'scale-100'}`} />}
          <div className="mt-7 w-full max-w-2xl text-center"><h1 className="truncate text-3xl font-black tracking-tight sm:text-5xl">{track.title}</h1><p className="mt-2 truncate text-lg text-white/65">{track.artist}</p></div>

          <div className="mt-7 w-full max-w-2xl">
            <div className="mb-2 flex justify-between text-xs tabular-nums text-white/60"><span>{timeLabel(currentTime)}</span><span>{duration ? `-${timeLabel(Math.max(0, duration - currentTime))}` : '--:--'}</span></div>
            <input aria-label="Playback progress" type="range" min={0} max={Math.max(duration, 1)} step="0.1" value={Math.min(currentTime, duration || 0)} onChange={(event) => seek(Number(event.target.value))} className="h-1.5 w-full cursor-pointer accent-white" />
            <div className="mt-5 flex items-center justify-center gap-5 sm:gap-8">
              <button type="button" aria-label="Shuffle" onClick={() => setShuffle(!shuffle)} className={`p-2 ${shuffle ? 'text-emerald-300' : 'text-white/55 hover:text-white'}`}><Shuffle className="h-5 w-5" /></button>
              <button type="button" aria-label="Previous" onClick={playPrevious} className="text-white/80 hover:text-white"><SkipBack className="h-6 w-6 fill-current" /></button>
              <button type="button" aria-label={isPlaying ? 'Pause' : 'Play'} onClick={togglePlayback} className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black shadow-xl transition hover:scale-105">{isPlaying ? <Pause className="h-7 w-7 fill-current" /> : <Play className="ml-1 h-7 w-7 fill-current" />}</button>
              <button type="button" aria-label="Next" onClick={playNext} className="text-white/80 hover:text-white"><SkipForward className="h-6 w-6 fill-current" /></button>
              <button type="button" aria-label={`Repeat ${repeat}`} onClick={cycleRepeat} className={`relative p-2 ${repeat !== 'off' ? 'text-emerald-300' : 'text-white/55 hover:text-white'}`}><Repeat className="h-5 w-5" />{repeat === 'one' && <span className="absolute right-0 top-0 text-[9px] font-bold">1</span>}</button>
            </div>
            <div className="mt-5 flex items-center justify-between"><button type="button" onClick={() => setShowLyrics((value) => !value)} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10">{showLyrics ? 'Hide lyrics' : 'Lyrics'}</button><label className="flex items-center gap-2 text-white/60"><Volume2 className="h-4 w-4" /><input aria-label="Volume" type="range" min={0} max={1} step={0.01} value={volume} onChange={(event) => setVolume(Number(event.target.value))} className="w-20 accent-white" /></label></div>
          </div>
        </section>

        <aside className="min-h-[300px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[.06] backdrop-blur-2xl lg:max-h-[72vh]">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-white/45">Words in time</p><h2 className="mt-1 text-lg font-bold">Lyrics</h2></div><button type="button" onClick={() => setShowLyrics((value) => !value)} className="text-xs text-white/60 hover:text-white">{showLyrics ? 'Show lyrics' : 'Load lyrics'}</button></div>
          <div className="max-h-[55vh] space-y-4 overflow-y-auto px-5 py-6 lg:max-h-[calc(72vh-72px)]">
            {lyricsLoading && <p className="text-sm text-white/50">Finding synced lyrics…</p>}
            {!lyricsLoading && lyrics.length > 0 && lyrics.map((line, index) => <button key={`${line.time}-${index}`} ref={index === activeLine ? activeLyricRef : null} type="button" onClick={() => seek(line.time)} className={`block w-full text-left text-xl font-semibold leading-snug transition sm:text-2xl ${index === activeLine ? 'text-white opacity-100' : 'text-white opacity-40 hover:opacity-75'}`}>{line.text}</button>)}
            {!lyricsLoading && !lyrics.length && <div className="flex min-h-[180px] flex-col items-center justify-center text-center"><p className="text-sm text-white/55">{showLyrics ? 'Synced lyrics are not available for this track.' : 'Lyrics will appear here when available.'}</p><button type="button" onClick={() => setShowLyrics(true)} className="mt-3 rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/15">Find lyrics</button></div>}
          </div>
        </aside>
      </main>

      <footer className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-white/55 backdrop-blur-xl"><span className="truncate">{track.title} · {track.artist}</span><button type="button" onClick={() => setDrawerOpen(true)} className="shrink-0 rounded-full bg-white/10 px-4 py-2 font-semibold text-white hover:bg-white/15">Up Next · {queue.length}</button></footer>

      {drawerOpen && <div className="fixed inset-0 z-[90] bg-black/55" onClick={() => setDrawerOpen(false)}><section role="dialog" aria-modal="true" aria-label="Up Next queue" onClick={(event) => event.stopPropagation()} className="absolute inset-x-0 bottom-0 max-h-[78vh] overflow-y-auto rounded-t-[30px] border border-white/10 bg-[#15171c]/95 p-5 shadow-2xl backdrop-blur-2xl sm:left-auto sm:right-6 sm:top-6 sm:max-h-[calc(100vh-3rem)] sm:w-[420px] sm:rounded-[30px]"><header className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-white/45">Playing next</p><h2 className="mt-1 text-2xl font-black">Up Next</h2></div><button type="button" aria-label="Close queue" onClick={() => setDrawerOpen(false)} className="rounded-full bg-white/10 p-2"><X className="h-4 w-4" /></button></header><div className="mt-5 space-y-2">{queue.map((item, index) => <button key={`${item.id}-${index}`} type="button" onClick={() => { playTrack(item, queue); setDrawerOpen(false); }} className={`flex w-full items-center gap-3 rounded-2xl p-2 text-left transition hover:bg-white/10 ${item.id === track.id ? 'bg-white/[.08]' : ''}`}><span className="w-6 text-center text-xs tabular-nums text-white/45">{item.id === track.id ? '♫' : String(index + 1).padStart(2, '0')}</span><img src={item.artworkUrl} alt="" className="h-12 w-12 rounded-lg object-cover" /><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{item.title}</span><span className="block truncate text-xs text-white/50">{item.artist}</span></span>{item.id === track.id && <span className="text-xs text-emerald-300">Playing</span>}</button>)}{!queue.length && <p className="py-10 text-center text-sm text-white/50">Your queue is empty.</p>}</div></section></div>}
    </div>
  </div>;
}
