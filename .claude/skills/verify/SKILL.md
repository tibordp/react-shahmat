---
name: verify
description: Build, run, and drive the react-shahmat demo app to verify library changes end-to-end.
---

# Verifying react-shahmat changes

The library's surface is the `ChessBoard` component; the demo app is the way
to drive it. The demo consumes the **built** package (`file:..` → `dist/`),
so always rebuild the library first.

## Build & serve

```bash
# Library build requires ffmpeg on PATH (audiosprite sound sprite)
npm install && npm run build                   # repo root
cd demo && npm install && npm run build        # demo (vite)
npx vite preview --port 4173 --strictPort      # serves demo/build
# URL: http://localhost:4173/react-shahmat/#/playground  (HashRouter)
```

`npm run dev` in demo works too but `vite.config.ts` has `open: true` — it
pops a browser window; prefer `vite preview` for headless runs.

## Driving with Playwright

Squares are addressable via accessibility attributes:

- Square divs: `[role="button"][aria-label^="e4"]` — label is
  `"e4, white pawn"` or bare `"e4"` when empty; also `id$="-sq-<file><rank>"`
  (0-indexed, e.g. e4 → `-sq-43`).
- Board container: `[role="group"][aria-label="Chess board"]`, with
  `aria-activedescendant` tracking the keyboard cursor.
- Selection state: `aria-pressed` on the square.
- Promotion dialog buttons: `button img[alt^="Promote to"]`.

Interactions: click square centers for click-moves; `mouse.down/move/up` for
drags (TouchBackend with mouse events); right-button drag draws arrows,
right-click toggles highlights. Insert ~100ms pauses between right-down,
move, and up — the arrow-start state needs a render between events.

## Gotchas that produce false failures

- **Uncheck `#blackAi` first** in the playground, or Stockfish replies and
  the position is nondeterministic.
- **Turn order matters.** With AI off you play both sides. Interacting with
  a piece whose color is not on turn queues a _premove_ (visual only), and
  the next right-click _cancels premoves_ instead of drawing an arrow.
- **Keyboard cursor starts at the last clicked square** (or e1/e8 if none).
  The first arrow keypress only _initializes_ the cursor without moving it
  when no square was clicked yet.
- **Playground binds window-level ArrowLeft/Right to history navigation.**
  The board stops propagation for keys it consumes while focused, so this
  only matters if you dispatch keys while the board is not focused —
  stepping into history makes the board readonly.
- The FEN input (`#fenInput` + Load button) lives in the collapsed
  "Position" section of the settings panel — click the section title first.

## Quick checks worth including

Move by click, move by drag, capture by drag, arrow + highlight, keyboard
move (Tab/focus → arrows → Enter), premove queue + right-click cancel,
promotion dialog (load FEN `4k3/P7/8/8/8/8/8/4K3 w - - 0 1`), sound sprite
network request (`chess_sfx`), Examples page (11 boards, no duplicate DOM
ids), zero console errors.
