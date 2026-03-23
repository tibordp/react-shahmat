import { ChessBoard } from 'react-shahmat';

// A static, non-interactive board displaying a specific position.
// Perfect for embedding diagrams in articles, puzzles, or documentation.

export const SOURCE = `import { ChessBoard } from 'react-shahmat';

function StaticDiagram() {
  return (
    <ChessBoard
      position="r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4"
      whiteMovable={false}
      blackMovable={false}
    />
  );
}`;

export const TITLE = 'Static Diagram';
export const DESCRIPTION =
  'A non-interactive board displaying a position from a FEN string. Set both whiteMovable and blackMovable to false to prevent any interaction.';

export default function StaticDiagram() {
  return (
    <ChessBoard
      position='r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4'
      whiteMovable={false}
      blackMovable={false}
    />
  );
}
