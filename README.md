# Yankify

A React + TypeScript + Vite + Tailwind starter for a unified music catalog experience.

## Catalog and YouTube integrations

- `src/services/streamingService.ts` tries the configured public Saavn API mirrors in order and falls back to Apple's public iTunes Search/Lookup API.
- Saavn song URLs are catalog-provided streams; availability and cross-origin playback depend on the upstream service. iTunes only supplies short preview clips, not full-length audio.
- `src/services/youtubeMusicService.ts` searches YouTube Data API v3 when an API key is supplied and then tries Piped. Video playback should use the official YouTube player and comply with YouTube's terms.
- Optional playlist/liked-video import uses Google Identity Services with the read-only YouTube OAuth scope. Configure an OAuth Web client ID in your own Google Cloud project, enable YouTube Data API v3, and authorize your app's origin. Never commit OAuth secrets or API keys.

The public Saavn mirrors, Piped instance, and upstream APIs are third-party services and may change, rate-limit, or be unavailable. Browser CORS policies may also prevent direct client requests; a same-origin server-side proxy can be used if needed.
