import React from 'react';
import {
  ChessBoard,
  BoardDndProvider,
  SparePiece,
  fenToPieceArray,
  pieceArrayToFen,
  squareToPosition,
  PieceType,
  Color,
} from 'react-shahmat';
import type { Piece } from 'react-shahmat';

// Position editor built from the library's building blocks: SparePiece
// palettes drag onto a freeMove board; pieces drag off the board to remove.

export const SOURCE = `import {
  ChessBoard, BoardDndProvider, SparePiece,
  fenToPieceArray, pieceArrayToFen, squareToPosition,
  PieceType, Color,
} from 'react-shahmat';
import type { Piece } from 'react-shahmat';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const TYPES = [PieceType.King, PieceType.Queen, PieceType.Rook,
               PieceType.Bishop, PieceType.Knight, PieceType.Pawn];

function PositionEditor() {
  const [fen, setFen] = React.useState(START);

  // Apply an edit to the piece array and serialize back to FEN
  const edit = (fn: (board: (Piece | null)[][]) => void) => {
    const board = fenToPieceArray(fen);
    fn(board);
    setFen(pieceArrayToFen(board));
  };
  const at = squareToPosition;

  const palette = (color: Color) => (
    <div style={{ display: 'flex' }}>
      {TYPES.map(type => (
        <SparePiece key={type} piece={{ type, color }} size={40} />
      ))}
    </div>
  );

  return (
    <BoardDndProvider>
      {palette(Color.Black)}
      <ChessBoard
        position={fen}
        freeMove
        onMove={({ from, to }) => edit(b => {
          b[at(to).rank][at(to).file] = b[at(from).rank][at(from).file];
          b[at(from).rank][at(from).file] = null;
        })}
        onPiecePlace={(piece, sq) => edit(b => {
          b[at(sq).rank][at(sq).file] = piece;
        })}
        onPieceRemove={sq => edit(b => {
          b[at(sq).rank][at(sq).file] = null;
        })}
      />
      {palette(Color.White)}
      <button onClick={() => setFen('8/8/8/8/8/8/8/8 w - - 0 1')}>Clear</button>
      <button onClick={() => setFen(START)}>Start position</button>
      <code>{fen}</code>
    </BoardDndProvider>
  );
}`;

export const TITLE = 'Position Editor';
export const DESCRIPTION =
  'Build custom positions chess.com-style: drag spare pieces onto the board, ' +
  'move pieces freely with freeMove, and drag pieces off the board to remove ' +
  'them. Assembled from SparePiece, BoardDndProvider, and the ' +
  'fenToPieceArray/pieceArrayToFen helpers — no dedicated editor component.';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const TYPES = [
  PieceType.King,
  PieceType.Queen,
  PieceType.Rook,
  PieceType.Bishop,
  PieceType.Knight,
  PieceType.Pawn,
];

export default function PositionEditor() {
  const [fen, setFen] = React.useState(START);

  const edit = (fn: (board: (Piece | null)[][]) => void) => {
    const board = fenToPieceArray(fen);
    fn(board);
    setFen(pieceArrayToFen(board));
  };
  const at = squareToPosition;

  const palette = (color: Color) => (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
      {TYPES.map(type => (
        <SparePiece key={type} piece={{ type, color }} size={40} />
      ))}
    </div>
  );

  return (
    <BoardDndProvider>
      {palette(Color.Black)}
      <ChessBoard
        position={fen}
        freeMove
        onMove={({ from, to }) =>
          edit(b => {
            b[at(to).rank][at(to).file] = b[at(from).rank][at(from).file];
            b[at(from).rank][at(from).file] = null;
          })
        }
        onPiecePlace={(piece, sq) =>
          edit(b => {
            b[at(sq).rank][at(sq).file] = piece;
          })
        }
        onPieceRemove={sq =>
          edit(b => {
            b[at(sq).rank][at(sq).file] = null;
          })
        }
      />
      {palette(Color.White)}
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
        <button
          className='control-button'
          onClick={() => setFen('8/8/8/8/8/8/8/8 w - - 0 1')}
        >
          Clear
        </button>
        <button className='control-button' onClick={() => setFen(START)}>
          Start position
        </button>
        <code style={{ fontSize: 11 }}>{fen}</code>
      </div>
    </BoardDndProvider>
  );
}
