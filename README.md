# Yankify

A React + TypeScript + Vite + Tailwind app for unified music discovery and playback.

## Install and run

```bash
npm install
npm run dev
```

Create a production build with `npm run build` and serve it locally using `npm run preview`.

## Integrations

- Your Library data is stored in the current browser's local storage.
- Browser Media Session controls and lock-screen metadata are enabled where supported (typically HTTPS or localhost).
- Saavn and Piped mirrors, LRCLIB, iTunes, and YouTube endpoints are third-party services and can change, rate-limit, or be unavailable. Browser CORS policies may require a same-origin API proxy.
- Apple's public iTunes API provides previews, not full-length streams. Use audio URLs only when you have the right to access and play them.
- Google/YouTube integrations require the user's own API/OAuth configuration. Do not commit credentials.
