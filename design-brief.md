# FadeTube — Design Brief

## What it is

FadeTube is a locked-down YouTube experience for young children (roughly ages 2–10). Parents configure it once; children use it without ever touching settings. It runs entirely in the browser with no backend, no account, and no data leaving the device.

The core mechanic: as a screen-time session nears its end, the display very slowly desaturates — so gradually the child doesn't notice in the moment, but naturally winds down without a jarring alarm or forced cutoff.

---

## The two audiences

**Child** — sees only what the parent approved. Taps a video, watches it, goes back. That's the entire surface. No search, no recommendations, no comments, no related videos. The UI should feel calm, spacious, and friendly. Nothing should compete for attention.

**Parent** — accesses a settings panel hidden behind a challenge (PIN, pattern, or maths puzzle). Does setup once, then rarely returns. When they do it's to: add a channel, extend a session, or check the schedule. The parent UI can be denser and more utilitarian — it's for adults who need to get in and out fast.

---

## Core features

- **Approved channel feed** — parent adds YouTube channel handles or playlist URLs. The app fetches recent videos via RSS and displays them as a scrollable grid of thumbnail tiles.
- **Session timer** — configurable duration (default 45 min). A gentle "X minutes left" message updates in the header.
- **Fade engine** — CSS `filter: saturate()` applied to the entire app container. Transitions from 1.0 to a minimum (default 0.2) over the last portion of the session. The transition itself is `60s linear` so it's imperceptibly slow.
- **Schedule lock** — parent sets allowed days and time window. Outside those hours, a friendly lock screen replaces the app with a message like "Screen time starts at 3pm!"
- **Parent challenge gate** — long-pressing the clock or tapping the lock icon triggers an overlay with a challenge before any settings are shown. 3 wrong attempts trigger a 60-second cooldown.
- **QR backup/restore** — all settings can be exported as a QR code and restored by scanning. Recovery path if the browser is cleared.
- **Kiosk-first design** — built to run inside iOS Guided Access or Android Screen Pinning. No need for any visible browser chrome.

---

## Philosophy and constraints

- **Zero infrastructure.** No server, no API key required (YouTube RSS works without one). No analytics. No tracking.
- **localStorage only.** All config lives in `fadetube_config`. Session state lives in `sessionStorage` and resets naturally when the tab closes.
- **Security scope is honest.** It's designed to contain young children in a supervised environment, not defeat a determined teenager. This is documented and accepted.
- **No alarms, no punishments.** The fade is gentle by design. The end-of-session screen is friendly ("Great session! Time to rest your eyes 🌙"), not stern.
- **Parent controls must be hard to stumble into.** Long-press gesture + challenge = two separate barriers. A child mashing the screen shouldn't accidentally open settings.

---

## Visual design system

### Colours
| Token | Value | Used for |
|---|---|---|
| `--bg-color` | `#0f0f0f` | App background (near-black) |
| `--bg-secondary` | `#1f1f1f` | Top bar, cards |
| `--bg-tertiary` | `#272727` | Inputs, buttons, tiles |
| `--text-color` | `#f1f1f1` | Primary text |
| `--text-secondary` | `#aaaaaa` | Timestamps, subtitles |
| `--accent` | `#ff0000` | Buttons, active states (YouTube red) |
| `--logo-accent` | `#5b8af5` | "Tube" in the wordmark only |
| `--border-color` | `#3f3f3f` | Dividers, input borders |
| `--danger` | `#e74c3c` | Destructive actions |
| `--success` | `#2ecc71` | Confirmations |

### Typography
- **Font:** Nunito (Google Fonts) — rounded, friendly, legible at small sizes on tablet screens
- **Weights used:** 400 (body), 700 (labels), 800 (buttons, headings), 900 (clock, logo, hero text)
- **Letter spacing:** `-0.02em` on display-size text

### Logo
`▶ Fade` in `--text-color` (white), `Tube` in `#5b8af5` (blue). Weight 900. No border, no background, no box. Clean wordmark only.

### Spacing and shape
- Border radius: `12px` (inputs/buttons), `20px` (chips/pills), `32px` (video tiles), `50%` (round buttons)
- Touch targets minimum ~44px tall
- Generous padding on interactive elements — this is a tablet-first UI used by small fingers

---

## Page structure

### `/app` — the main application
Single-page app. All views are layered inside one `#app-container` div that receives the CSS saturation filter. Views show/hide via `.hidden` class:

- **`#yt-container`** — the YouTube experience. Has a top bar (logo + refresh + lock), a horizontally scrollable filter chip row (one chip per channel), and a vertical feed of video thumbnail tiles.
- **`#welcome-page`** — shown only if no channels are configured yet (new user before guide redirect was added; now mostly unused).
- **`#lock-screen`** — shown outside schedule hours. Full-screen, centred, with icon + message + unlock button.
- **`#overlay-container`** — full-screen darkened overlay that hosts panels:
  - **`#challenge-gate`** — the maths/PIN/pattern challenge before parent access
  - **`#parent-panel`** — settings: session controls (add time, reset colour, end session), channel management, schedule, backup/restore
  - **`#setup-panel`** — first-time or change-challenge flow

### `/guide` — the onboarding/marketing page
Scrollable single-column document page. Dark theme matching the app. Sections: what it is, how the fade engine works, step-by-step setup, kiosk mode instructions, parent panel explainer, backup/restore, philosophy. Nav bar at top with logo and "Open App" CTA.

---

## Interaction patterns

- **Primary navigation:** tap to open a video; back button returns to feed
- **Parent access:** long-press (1.5s) the clock area OR tap the 🔒 button
- **Session extension:** inside parent panel during an active session — +15 min button, reset saturation button, end session button
- **Channel management:** add by YouTube handle (`@ChannelName`) or playlist URL; remove with a delete button per entry
- **Filter chips:** tapping a chip filters the feed to that channel; "All" shows everything

---

## Tone

- Calm. Never urgent or alarming.
- Friendly to children without being patronising.
- Trustworthy to parents — honest about what it can and can't do.
- Minimal text everywhere. Labels, not explanations.
