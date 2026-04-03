# FadeDown

A browser-based screen time manager for young kids. No app install, no account, no server — just open the page and go.

**Live app**: https://neil-a.github.io/fadedown/fadedown.html

---

## What it does

FadeDown gives kids a curated homescreen of approved apps and games. As their session nears its end, the screen slowly and imperceptibly loses colour saturation — going from full colour to near-greyscale. Kids naturally disengage as the experience becomes less stimulating. When the session ends, the screen locks with a gentle message.

There's no alarm, no countdown timer, no confrontation. The fade does the work.

---

## How the fade works

- Parent sets a **session duration** (e.g. 45 minutes) and a **fade start point** (e.g. after 30 minutes)
- For the first 30 minutes: full colour
- From 30–45 minutes: screen gradually fades from 100% → 20% saturation via CSS `filter: saturate()`
- The transition is `60s linear` — invisible moment-to-moment, only noticeable in retrospect
- At session end: locked at minimum saturation, lock screen shown

---

## Features

- **App grid** — curated tiles: Scratch, Chess, 2048, Drawing, YouTube
- **YouTube player** — browse approved channels and playlists, videos pre-validated to be embeddable
- **Schedule enforcement** — app locks outside configured hours and days
- **Parent panel** — hidden behind a challenge (maths puzzle, PIN, or pattern)
- **Session controls** — add time, reset colour, end session early
- **QR backup & restore** — export settings as a QR code, restore by scanning or pasting

---

## YouTube API Key

The YouTube feature requires a free **YouTube Data API v3** key.

**Why**: FadeDown fetches video lists from channels and playlists using the YouTube Data API. Without a key it can't browse channels.

**How to get one (free)**:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → **APIs & Services** → **Enable APIs**
3. Search for and enable **YouTube Data API v3**
4. Go to **Credentials** → **Create Credentials** → **API Key**
5. Copy the key

**Where to enter it**: Open FadeDown → long-press top-right corner for 1.5s → Parent Panel → YouTube Settings → paste key.

The key is stored only in your browser's `localStorage`. It never leaves your device.

> **YouTube Premium & ads**: If you have YouTube Premium, sign into Google in the same browser. The embed uses your session to suppress ads — no extra config needed.

---

## Security model

FadeDown is designed for young children (under ~10) in a supervised environment. Security is achieved through simplicity:

| Layer | How |
|---|---|
| Challenge gate | Parent access requires solving a maths puzzle, PIN, or pattern |
| Hashed answers | PIN/pattern stored as SHA-256 hash only — raw answer never saved |
| Brute force limit | 3 wrong attempts triggers a 60-second cooldown |
| No escape routes | Designed for iOS Guided Access or Android kiosk mode — no URL bar, no tab switching |
| No server | Nothing to hack. All state is local. |

**Honest limitation**: A determined older child with DevTools access can clear `localStorage`. This is accepted — the QR restore flow lets parents recover settings in under 2 minutes.

---

## No infrastructure

- No backend, no database, no user accounts
- No data leaves the device
- No ads, no tracking, no analytics
- Free forever — a single "Buy Me a Coffee" link in the parent panel is the only monetisation

Settings live in `localStorage`. Session state lives in `sessionStorage` (resets when the tab closes).

---

## Deployment

Hosted as a static file on GitHub Pages. No build step.

To run locally: just open `fadedown.html` in a browser.

To deploy your own copy: fork the repo, enable GitHub Pages on the `main` branch from `/` root.

---

## Tech

- Single HTML file — all CSS and JS inline
- No framework, no build tooling
- CDN dependencies: `qrcode.min.js` (QR generation), `jsQR.js` (QR scanning) — both MIT licensed
- YouTube IFrame Player API for error detection
- YouTube Data API v3 for channel/playlist browsing
