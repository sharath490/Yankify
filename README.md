# Yankify

A React + TypeScript + Vite + Tailwind starter for a unified music catalog experience.

## Personal library and device controls

- Your Library data (liked tracks, saved soundtrack albums, recent playback, and playlists) is stored locally in the current browser. No account is required.
- Browser Media Session support adds lock-screen and headset metadata and play/pause/skip/seek actions where available. Hardware controls require a supported browser and a secure context (HTTPS/localhost).
- The compact player and full-screen player share the same playback context; the mini-player uses a short slide-up transition.
- Stream mirror switches can be surfaced as low-key toast messages by dispatching `yankify:mirror-switch` with an optional message string as the event detail.

## Catalog and YouTube integrations

- `src/services/streamingService.ts` tries public Saavn API mirrors in order and falls back to Apple's public iTunes Search/Lookup API.
- Saavn song URLs are catalog-provided streams; availability and cross-origin playback depend on the upstream service. iTunes only supplies preview clips, not full-length audio.
- YouTube Data API/Piped video search and Google Identity Services playlist imports are optional; configure your own Google Cloud project and do not commit API keys.
- Third-party endpoints may change, rate-limit, or be unavailable. Browser CORS policies may require a same-origin server-side proxy.
