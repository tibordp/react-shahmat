import React from 'react';
import { ChessBoard, useChessGame, PieceType, Color } from 'react-shahmat';
import type { Piece } from 'react-shahmat';

// Custom piece rendering with renderPiece.
// This example uses styled letter pieces — but you can render anything:
// imported SVGs via pieceSet, custom React components, canvas elements, etc.

export const SOURCE = `import { ChessBoard, useChessGame, PieceType, Color } from 'react-shahmat';
import type { Piece } from 'react-shahmat';

const LETTERS = ['', 'R', 'N', 'B', 'Q', 'K', ''];

function renderPiece(piece: Piece, size: number) {
  const isWhite = piece.color === Color.White;
  const letter = piece.type === PieceType.Pawn
    ? '' : LETTERS[piece.type];
  const diameter = size * (piece.type === PieceType.Pawn ? 0.45 : 0.6);

  return (
    <div style={{
      width: diameter, height: diameter, borderRadius: '50%',
      background: isWhite ? '#f5f0e8' : '#3a3a3a',
      border: \`2px solid \${isWhite ? '#c8b87a' : '#1a1a1a'}\`,
      color: isWhite ? '#5a4e3a' : '#d4cfc4',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.32, fontWeight: 700,
      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      userSelect: 'none',
    }}>
      {letter}
    </div>
  );
}

function CustomPieces() {
  const game = useChessGame();
  return <ChessBoard {...game.boardProps} renderPiece={renderPiece} />;
}`;

export const TITLE = 'Custom Pieces';
export const DESCRIPTION =
  'Use renderPiece to render anything — styled elements, custom SVGs, or React components. For swapping piece images, use the pieceSet prop with bundler-imported URLs. Both work across the board, drag ghost, animations, and promotion dialog.';

const LETTERS = ['', 'R', 'N', 'B', 'Q', 'K', ''];

function renderPiece(piece: Piece, size: number) {
  const isWhite = piece.color === Color.White;
  const letter = piece.type === PieceType.Pawn ? '' : LETTERS[piece.type];
  const diameter = size * (piece.type === PieceType.Pawn ? 0.45 : 0.6);

  return (
    <div
      style={{
        width: diameter,
        height: diameter,
        borderRadius: '50%',
        background: isWhite ? '#f5f0e8' : '#3a3a3a',
        border: `2px solid ${isWhite ? '#c8b87a' : '#1a1a1a'}`,
        color: isWhite ? '#5a4e3a' : '#d4cfc4',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.32,
        fontWeight: 700,
        fontFamily: 'Georgia, serif',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        userSelect: 'none',
        lineHeight: 1,
      }}
    >
      {letter}
    </div>
  );
}

export default function CustomPieces() {
  const game = useChessGame();
  return <ChessBoard {...game.boardProps} renderPiece={renderPiece} />;
}
