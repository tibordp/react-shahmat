import { ChessBoard, useChessGame } from 'react-shahmat';

// Board colors are controlled via CSS custom properties on the style prop.
// This lets you theme the board without any CSS files.

export const SOURCE = `import { ChessBoard, useChessGame } from 'react-shahmat';

function CustomTheme() {
  const game = useChessGame();

  return (
    <ChessBoard
      {...game.boardProps}
      style={{
        '--light-square': '#f0d9b5',
        '--dark-square': '#b58863',
        '--selected-light': '#f7ec74',
        '--selected-dark': '#baca44',
      } as React.CSSProperties}
    />
  );
}`;

export const TITLE = 'Custom Theme';
export const DESCRIPTION = 'Board colors are controlled via CSS custom properties passed through the style prop. No external CSS needed.';

export default function CustomTheme() {
  const game = useChessGame();

  return (
    <ChessBoard {...game.boardProps} style={{
      '--light-square': '#f0d9b5',
      '--dark-square': '#b58863',
      '--selected-light': '#f7ec74',
      '--selected-dark': '#baca44',
    }} />
  );
}
