import { ChessBoard, useChessGame } from 'react-shahmat';

// The simplest interactive board: two humans playing on the same screen.
// useChessGame wraps the built-in game logic and produces all the props ChessBoard needs.

export const SOURCE = `import { ChessBoard, useChessGame } from 'react-shahmat';

function TwoPlayerBoard() {
  const game = useChessGame();

  return <ChessBoard {...game.boardProps} />;
}`;

export const TITLE = 'Two-Player Board';
export const DESCRIPTION =
  'The simplest interactive setup. useChessGame wraps the built-in game logic and produces all the props ChessBoard needs. Both sides are human-controlled.';

export default function TwoPlayerBoard() {
  const game = useChessGame();

  return <ChessBoard {...game.boardProps} />;
}
