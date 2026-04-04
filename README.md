# FadeDown

A browser-based screen time manager for young kids. No app install, no account, no server — just open the page and go.

**Live app**: https://neil-a.github.io/FadeDown/fadedown.html

---

## What it does

FadeDown gives kids a curated YouTube feed. As their session nears its end, the screen slowly and imperceptibly loses colour saturation — going from full colour to near-greyscale. Kids naturally disengage as the experience becomes less stimulating. When the session ends, the screen locks with a gentle message.

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

- **YouTube feed** — curated video tiles from approved channels, merged into a single scrollable feed
- **Channel filter chips** — tap a channel to filter the feed; tap again to clear
- **Shorts filtering** — videos ≤60s are hidden by default (configurable)
- **Back button cooldown** — back button is locked for 30 seconds after a video starts to prevent rapid channel-flipping
- **Schedule enforcement** — app locks outside configured hours and days
- **Parent panel** — hidden behind a PIN, pattern, or maths challenge
- **PIN reset** — "Forgot PIN?" button appears after the first wrong attempt, bypasses the cooldown, goes straight to setup
- **Session controls** — add time, reset colour, end session early
- **QR backup & restore** — export settings as a QR code, restore by scanning or pasting

---

## YouTube API Key

The YouTube feature requires a free **YouTube Data API v3** key.

**Why**: FadeDown fetches video lists from channels using the YouTube Data API. Without a key it can't browse channels.

**How to get one (free)**:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → **APIs & Services** → **Enable APIs**
3. Search for and enable **YouTube Data API v3**
4. Go to **Credentials** → **Create Credentials** → **API Key**
5. Copy the key

**Where to enter it**: Open FadeDown → tap the lock icon → Parent Panel → YouTube Settings → paste key.

The key is stored only in your browser's `localStorage`. It never leaves your device — except in API calls made directly to Google's servers.

### Restricting your API key (recommended)

By default a Google API key can be used from any origin. If your key were ever stolen (e.g. via a compromised GitHub account), an attacker could consume your free quota.

To lock it to your site only:

1. Go to [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services** → **Credentials**
2. Click your API key
3. Under **Application restrictions** → select **HTTP referrers (websites)**
4. Add your site, e.g. `https://neil-a.github.io/*` (or your own domain)
5. Save

After this the key only works when requests come from your site — useless to anyone else.

> **YouTube Premium & ads**: If you have YouTube Premium, sign into Google in the same browser. The embed uses your session to suppress ads — no extra config needed.

---

## Parent Access

FadeDown requires a challenge to access the parent panel, preventing kids from changing settings.

### First-time setup

On first launch a setup screen appears. Choose:

- **PIN** — 4–6 digit code (recommended)
- **Pattern** — draw a pattern across a 3×3 grid
- **Maths Puzzle** — random addition question, no setup needed

The PIN and pattern are stored as a **SHA-256 hash only** — the raw value is never saved.

### Resetting a forgotten PIN

If you enter the wrong PIN:

- After the **1st wrong attempt**: a "Forgot PIN? Reset now" button appears
- After **3 wrong attempts**: a 60-second cooldown activates, but the reset button stays visible
- Clicking **Reset** takes you straight to setup — no cooldown wait required
- From there you can set a new PIN, pattern, or switch to maths

You can also change your challenge type at any time from inside the parent panel → **Challenge Settings** → **Change Challenge Type**.

---

## Security model

FadeDown is designed for young children (under ~10) in a supervised environment.

| Layer | How |
|---|---|
| Challenge gate | Parent access requires PIN, pattern, or maths puzzle |
| Hashed credentials | PIN/pattern stored as SHA-256 hash — raw value never saved |
| Brute force limit | 3 wrong attempts triggers a 60-second cooldown |
| PIN reset path | Resets via setup panel — no maths bypass required (by design, parent is present) |
| Back button lock | 30-second cooldown after each video starts — kids can't rapidly flip through content |
| No escape routes | Designed for iOS Guided Access or Android kiosk mode — no URL bar, no tab switching |
| No server | Nothing to hack. All state is local. |

**Honest limitation**: A determined older child with DevTools access can clear `localStorage`. This is accepted — the QR restore flow lets parents recover settings in under 2 minutes.

### GitHub / hosting security

FadeDown is a single HTML file served from GitHub Pages. A compromised GitHub account means a compromised app — an attacker with push access could modify the JS to exfiltrate your YouTube API key, capture your PIN before hashing, or serve arbitrary content to your child's locked-down device.

**Mitigations:**

| Action | Why it matters |
|---|---|
| Enable GitHub 2FA | Blocks the most common account takeover paths |
| Restrict your API key to your domain | Stolen key becomes useless from any other origin |
| Enable branch protection on `main` | Requires a PR + review before any code reaches the live site |
| Periodically rotate your API key | Free to replace; limits the window if one is ever exposed |

---

## No infrastructure

- No backend, no database, no user accounts
- No data leaves the device (except YouTube API calls to Google)
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
- CDN dependencies inlined: `qrcode.min.js` (QR generation), `jsQR.js` (QR scanning) — both MIT licensed
- YouTube IFrame Player API for playback and error detection
- YouTube Data API v3 for channel browsing
- SHA-256 via Web Crypto API (`crypto.subtle.digest`) for PIN/pattern hashing
