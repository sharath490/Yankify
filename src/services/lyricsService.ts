export interface LyricLine {
  time: number;
  text: string;
}

interface LrclibEntry {
  syncedLyrics?: string | null;
  plainLyrics?: string | null;
  trackName?: string;
  artistName?: string;
}

function parseLrc(value: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const rawLine of value.split(/\r?\n/)) {
    const tags = [...rawLine.matchAll(/\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g)];
    const text = rawLine.replace(/\[[^\]]+\]/g, '').trim();
    if (!text) continue;
    for (const tag of tags) {
      const fraction = (tag[3] ?? '0').padEnd(3, '0').slice(0, 3);
      lines.push({ time: Number(tag[1]) * 60 + Number(tag[2]) + Number(fraction) / 1000, text });
    }
  }
  return lines.sort((a, b) => a.time - b.time);
}

async function requestJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Lyrics request failed (${response.status}).`);
  return response.json() as Promise<T>;
}

/** Retrieve timestamped LRC lyrics, trying exact LRCLIB lookup and then search. */
export async function fetchLyrics(title: string, artist: string, signal?: AbortSignal): Promise<LyricLine[]> {
  const params = new URLSearchParams({ track_name: title, artist_name: artist });
  try {
    const result = await requestJson<LrclibEntry>(`https://lrclib.net/api/get?${params}`, signal);
    if (result.syncedLyrics) {
      const lines = parseLrc(result.syncedLyrics);
      if (lines.length) return lines;
    }
  } catch (error) {
    if (signal?.aborted) throw error;
  }

  const search = new URLSearchParams({ track_name: title, artist_name: artist });
  try {
    const results = await requestJson<LrclibEntry[]>(`https://lrclib.net/api/search?${search}`, signal);
    const match = results.find((entry) => entry.syncedLyrics && entry.trackName?.toLowerCase() === title.toLowerCase())
      ?? results.find((entry) => entry.syncedLyrics);
    return match?.syncedLyrics ? parseLrc(match.syncedLyrics) : [];
  } catch (error) {
    if (signal?.aborted) throw error;
    return [];
  }
}
