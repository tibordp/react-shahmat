# react-shahmat Demo

This demo application showcases the react-shahmat chess board component with
Stockfish engine integration: a playground with every board option exposed,
plus a gallery of focused examples (controlled boards, puzzles, premoves,
custom themes and pieces, history navigation).

**[Live demo](https://tibordp.github.io/react-shahmat/)**

## Development

### Prerequisites

- Node.js 24 (see `.nvmrc` in the repository root)
- npm

The demo consumes the library via `"react-shahmat": "file:.."`, which resolves
to the **built** package, so build the library first.

### Setup

```bash
# From the repository root: install and build the library
# (the sound sprite build requires ffmpeg — brew install ffmpeg / apt-get install ffmpeg)
npm install
npm run build

# Then, in demo/
cd demo
npm install
npm run copy-stockfish   # copies the Stockfish WASM build into public/
npm run dev
```

The demo will be available at http://localhost:3000.

Tip: run `npm run dev` (rollup watch) in the repository root in a second
terminal to rebuild the library on change while the demo dev server is
running.

## Available scripts

- `npm run dev` — start the Vite development server
- `npm run build` — production build (output in `build/`)
- `npm run typecheck` — TypeScript type checking (`tsc --noEmit`)
- `npm run preview` — serve the production build locally
- `npm run copy-stockfish` — copy Stockfish WASM files into `public/`

## Stockfish integration

The demo uses the official Stockfish WASM build for AI moves. The files are
copied from the `stockfish` npm package into `public/` by
`npm run copy-stockfish` (CI does this during deployment).

## Technology stack

- React 19
- TypeScript
- Vite
- react-shahmat (chess board component)
- Stockfish WASM (chess engine)

## License

MIT
