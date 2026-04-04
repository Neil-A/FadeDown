# FadeTube — Product Requirements Specification

&#x20;

## Overview

FadeTube is a browser-based child screen-time management tool. It presents a curated pseudo-homescreen of approved apps and games to a child, then imperceptibly reduces screen colour saturation over time to naturally wind down engagement. It is designed to run inside a locked browser session (iOS Guided Access / Android kiosk mode) and requires no backend, no user accounts, and no data leaving the device.

***

## Core Philosophy

- **Zero infrastructure**: No server, no database, no authentication service.
- **Zero data egress**: All state lives in `localStorage` on the device. Nothing is transmitted anywhere.
- **Zero friction for parents**: Setup takes under 5 minutes. Recovery from lost settings takes under 2 minutes via QR scan.
- **Honest monetisation**: A single "Buy Me a Coffee" link in the parent panel. No ads, no subscriptions, no paywalls.

***

## Delivery Format

A **single self-contained HTML file** (`fadetube.html`).

- No build step required.
- No external dependencies except two lightweight JS libraries loaded via CDN:
  - `qrcode.min.js` — QR code generation (MIT licence)
  - `jsQR.js` — QR code scanning via camera (MIT licence)
- All CSS and JS inline.
- Must work in Safari (iOS) and Chrome (Android) with no install.
- Target deployment: Cloudflare Pages (free tier). Static file hosting only.

***

## Application Structure

The app has two distinct views:

### 1. Child View (default)

The screen the child sees. Fullscreen, touch-friendly, no browser chrome visible (assume Guided Access / kiosk mode is active).

### 2. Parent Panel

A settings overlay, accessible only by solving a challenge. Completely hidden from the child view.

***

## Child View — Requirements

### Layout

- Fullscreen pseudo-homescreen aesthetic. Soft, calm, child-friendly visual design.
- Large tappable app tiles arranged in a grid (3–4 columns depending on screen width).
- Clock visible at top (current time, large and readable).
- Session timer visible — shows remaining time in a friendly format ("You have 32 minutes left 🌤️").
- No browser URL bar, no navigation — fullscreen feel.

### App Tiles

Curated list of approved, ad-free, embeddable apps. Each tile shows an icon and label. Tapping opens the app in an iframe that fills the screen, with a visible back button to return to the homescreen.

Default app list (all free, embeddable, no ads):

App

URL / Embed

Scratch

`https://scratch.mit.edu/projects/<id>/embed` (configurable project IDs)

Chess

`https://lichess.org/embed/game/<id>` or `https://lichess.org/?embed`

2048

Self-hosted copy of MIT-licensed 2048 (inline or same-origin iframe)

Drawing

Simple canvas drawing tool (inline, no external dependency)

YouTube Kids

`https://www.youtubekids.com` (opens in iframe — note: may require full-page redirect on some platforms; fall back to new tab if iframe blocked)

Parent can configure which tiles are visible via the Parent Panel.

### Session Timer & Fade Engine

This is the core mechanic.

- Parent configures a **session duration** (e.g. 45 minutes).
- For the first N minutes (configurable, default 30), the screen displays at full colour saturation.
- After the fade threshold is crossed, the screen **imperceptibly reduces saturation** toward a configured minimum (default 20% saturation).
- Fade is applied as a CSS `filter: saturate(X)` on the root element, updated every 60 seconds.
- The transition between saturation steps must use `transition: filter 60s linear` — invisible in real time, perceptible only in retrospect.
- When the session ends (timer hits zero), saturation reaches its minimum and a gentle end-of-session screen appears: friendly message, no alarm, suggests putting the device down.

**Fade calculation:**

```
fadeRange = sessionDuration - fadeThreshold  (minutes)
saturationDrop = (1.0 - minSaturation) / fadeRange  (per minute)
currentSat = max(minSaturation, 1.0 - saturationDrop * minutesSinceFadeStart)

```

**Configurable parameters (stored in localStorage, set via Parent Panel):**

- `sessionMins` — total session length in minutes (default: 45)
- `fadeStartMins` — minutes before fade begins (default: 30)
- `minSaturation` — minimum saturation (0.0 to 1.0, default: 0.2)
- `schedule.start` — earliest time child can start a session (default: "09:00")
- `schedule.end` — latest time (default: "20:00")
- `activeDays` — array of day indices \[0–6], default weekdays \[1,2,3,4,5]

### Outside Scheduled Hours

If the current time is outside the allowed schedule, the child view shows a friendly locked screen: time, a message ("Screen time starts at 9am!"), and a calm illustration. No app tiles visible.

***

## Parent Panel — Requirements

### Access

- A small, discreet trigger to open the Parent Panel. Suggested: long-press (1.5s) on the clock in the top corner, or a small lock icon in a corner.
- On trigger, a **challenge overlay** appears before settings are revealed.

### Challenge Types

Parent chooses one during initial setup:

1. **Maths puzzle** — a randomly generated arithmetic question (e.g. "What is 7 × 8?"). Answer checked against stored hash.
2. **PIN** — 4–6 digit numeric PIN.
3. **Pattern** — a simple dot-grid pattern (3×3).

The answer is stored as a **SHA-256 hash** in `localStorage`. The raw answer is never stored. On entry, hash the input and compare.

On 3 consecutive wrong attempts, show a 60-second cooldown before next attempt (prevents shoulder-surf brute force by a child).

### Parent Panel Sections

#### Active Session

- Shows current saturation level and session progress.
- Button: "Add 15 minutes" (extends current session without resetting fade).
- Button: "End session now".
- Button: "Reset to full colour" (resets saturation to 1.0 without extending time).

#### App Configuration

- Toggle visibility of each default app tile.
- Input field to add a custom URL app (label + URL). Max 8 custom apps.
- Drag to reorder tiles (or up/down arrows for simplicity).

#### Time & Fade Settings

- Session duration (slider: 15–120 minutes, step 5)
- Fade starts after (slider: 5 minutes to sessionDuration-5)
- Minimum saturation (slider: 0% to 50%)
- Schedule start/end time (time inputs)
- Active days (day toggle buttons)

#### Challenge Settings

- Change challenge type or answer.
- Current type shown, with "Change" button that requires re-solving the current challenge first.

#### Backup & Restore

See QR Backup section below.

#### About / Support

- One paragraph explaining the product philosophy (no data, no servers, free forever).
- "Buy Me a Coffee" button linking to the Ko-fi or Buy Me a Coffee page.
- Version number.
- Link to GitHub repository.

***

## QR Backup & Restore — Requirements

### Purpose

Allow parents to recover settings after `localStorage` is cleared (browser update, privacy clear, device change) without any cloud dependency. A printed QR code is the backup medium.

### Export Flow

1. Parent opens Parent Panel → Backup & Restore section.
2. Taps "Generate Backup QR".
3. App serialises current settings to a compact JSON string, Base64 encodes it, and renders a QR code on screen.
4. Parent is instructed to screenshot or print the QR.
5. The challenge answer (PIN/solution) is **excluded** from the QR — parent must re-enter it fresh on restore. All other settings are included.

### Settings payload (example, minified before encoding):

```
{
  "v": 1,
  "apps": ["scratch","chess","2048","draw","yt"],
  "sessionMins": 45,
  "fadeStart": 30,
  "minSat": 0.2,
  "schedule": {"start":"09:00","end":"20:00"},
  "days": [1,2,3,4,5],
  "challengeType": "math"
}

```

Estimated payload size: \~200–300 characters. Well within QR capacity at high error correction.

### QR Generation

- Use `qrcode.min.js` (MIT, CDN-loaded).
- Error correction level: **H** (high — survives partial damage, smudging, poor print quality).
- Render to a `<canvas>` element, sized for easy printing.
- Include a "Print" button that opens the browser print dialog with only the QR and a short label visible.

### Restore Flow

1. Fresh device or cleared browser loads `fadetube.html`.
2. Child view shows locked state (no settings found).
3. A small "Restore Settings" link visible (not prominent — children shouldn't find it easily).
4. Parent taps it, Parent Panel opens with a camera scan interface.
5. `jsQR.js` accesses device camera via `getUserMedia`, scans QR in real time.
6. On successful decode: settings are parsed, validated, and written to `localStorage`.
7. Parent is prompted to re-enter their challenge answer to complete restore.
8. App reloads into normal state.

### Fallback

If camera access is unavailable (permission denied, no camera): show a text input where parent can paste a Base64 string (the encoded QR data as text, copy-pasted from a saved note or email).

***

## State Management

All state lives in `localStorage` under a single key: `fadetube_config`.

Session state (current session start time, current saturation) lives in `sessionStorage` — it resets naturally when the browser tab is closed, which is the desired behaviour.

### Schema version

Include a `"v": 1` field in the config. On load, if the version doesn't match the current expected version, migrate or prompt re-setup. Prevents silent breakage from schema changes in future versions.

***

## Security Model

This product is designed for young children (under \~10) in a supervised Guided Access environment. The security model is appropriate for that context, not for adversarial teenagers.

- Challenge answer stored as SHA-256 hash only.
- 3-attempt lockout with 60-second cooldown.
- No settings accessible without solving the challenge.
- Guided Access (iOS) or kiosk mode (Android) prevents tab switching, URL entry, and home button access — this is the primary containment layer.
- `localStorage` can be cleared by a determined older child via DevTools. This is accepted and documented. The QR restore flow is the mitigation.

***

## Visual Design Requirements

- **Audience**: Children 4–10, parents as secondary audience.
- **Tone**: Calm, soft, friendly. Not aggressive or gamified. Think picture-book illustration aesthetic.
- **Colour palette**: Soft pastels. Sky blues, warm creams, gentle greens. No harsh primaries.
- **Typography**: Rounded, friendly font (e.g. Nunito, Fredoka One). Large touch targets (minimum 56px tap area).
- **Fade visibility**: The saturation reduction must be imperceptible in real time. Use slow CSS transitions. Never show a saturation percentage or progress bar to the child.
- **Parent Panel**: Clean, functional, minimal. Contrasting aesthetic from child view — slightly more formal to signal "this is the adult area."
- **End of session screen**: Gentle, non-alarming. A calm illustration, a friendly message ("Great session! Time to rest your eyes 🌙"). No countdown timer on this screen.
- **Dark mode**: Not required for v1.

***

## Performance Requirements

- Initial load under 200KB total (excluding CDN libraries and iframe content).
- No layout shift on load.
- Fade engine update loop: runs every 60 seconds via `setInterval`. Must not cause perceptible jank.
- Camera scan (QR restore): activates only on explicit parent action, not on load.

***

## Browser Compatibility

Browser

Support

Safari iOS 15+

Primary target

Chrome Android 90+

Primary target

Chrome Desktop

Secondary (for parent testing/setup)

Firefox

Best effort

PWA manifest optional but recommended — allows "Add to Home Screen" which removes browser chrome and improves the kiosk feel.

***

## Out of Scope (v1)

- Cloud sync or cross-device settings
- Multiple child profiles on one device
- Usage analytics or reporting
- Push notifications
- Native app packaging
- In-app purchases or subscription logic
- Any server-side component of any kind

***

## File Structure

Single file delivery:

```
fadetube.html        ← entire application

```

Optional companion files for deployment:

```
manifest.json        ← PWA manifest (add to home screen support)
icon-192.png         ← App icon
icon-512.png         ← App icon large

```

***

## Suggested Development Order

1. Child homescreen layout with static app tiles
2. Iframe app launcher with back button
3. Session timer display
4. Fade engine (saturation reduction over time)
5. Schedule enforcement (outside-hours lock screen)
6. Parent Panel shell with challenge gate
7. Settings persistence (localStorage read/write)
8. QR export (generate + print)
9. QR restore (camera scan + text fallback)
10. Polish: animations, end-of-session screen, empty states
11. PWA manifest + icons

