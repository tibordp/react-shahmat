import React from 'react';
import {
  Piece,
  PieceType,
  Color,
} from '../engine/jsChessEngine';
import whitePawn from '../icons/pawn-w.svg';
import whiteRook from '../icons/rook-w.svg';
import whiteKnight from '../icons/knight-w.svg';
import whiteBishop from '../icons/bishop-w.svg';
import whiteQueen from '../icons/queen-w.svg';
import whiteKing from '../icons/king-w.svg';
import blackPawn from '../icons/pawn-b.svg';
import blackRook from '../icons/rook-b.svg';
import blackKnight from '../icons/knight-b.svg';
import blackBishop from '../icons/bishop-b.svg';
import blackQueen from '../icons/queen-b.svg';
import blackKing from '../icons/king-b.svg';

const PIECE_ICONS: { [key: string]: string } = {
  White_Pawn: whitePawn,
  White_Rook: whiteRook,
  White_Knight: whiteKnight,
  White_Bishop: whiteBishop,
  White_Queen: whiteQueen,
  White_King: whiteKing,
  Black_Pawn: blackPawn,
  Black_Rook: blackRook,
  Black_Knight: blackKnight,
  Black_Bishop: blackBishop,
  Black_Queen: blackQueen,
  Black_King: blackKing,
};

function getPieceTypeName(pieceType: number): string {
  const types = ['Pawn', 'Rook', 'Knight', 'Bishop', 'Queen', 'King'];
  return types[pieceType] || 'Unknown';
}

function getPieceIcon(piece: Piece): string {
  const colorName = piece.color === Color.White ? 'White' : 'Black';
  const typeName = getPieceTypeName(piece.type);
  return PIECE_ICONS[`${colorName}_${typeName}`];
}

export interface PromotionDialogProps {
  isOpen: boolean;
  color: Color;
  promotionSquare: { file: number; rank: number };
  squareSize: number;
  flipped?: boolean;
  onSelect: (pieceType: PieceType) => void;
  onCancel: () => void;
}

export const PromotionDialog: React.FC<PromotionDialogProps> = ({
  isOpen,
  color,
  promotionSquare,
  squareSize,
  flipped,
  onSelect,
  onCancel,
}) => {
  if (!isOpen) return null;

  // Calculate position based on promotion square
  const effectiveSquare = flipped
    ? { file: 7 - promotionSquare.file, rank: 7 - promotionSquare.rank }
    : promotionSquare;

  const squareX = effectiveSquare.file * squareSize;
  const squareY = (7 - effectiveSquare.rank) * squareSize;

  // Determine visual position based on effective square (accounts for board flipping)
  const isVisuallyAtTop = squareY === 0; // Top of the visual board
  const isVisuallyAtBottom = squareY === 7 * squareSize; // Bottom of the visual board

  let pieces = [
    {
      type: PieceType.Queen,
      icon: getPieceIcon({ type: PieceType.Queen, color }),
    },
    {
      type: PieceType.Rook,
      icon: getPieceIcon({ type: PieceType.Rook, color }),
    },
    {
      type: PieceType.Bishop,
      icon: getPieceIcon({ type: PieceType.Bishop, color }),
    },
    {
      type: PieceType.Knight,
      icon: getPieceIcon({ type: PieceType.Knight, color }),
    },
  ];

  // Reverse piece order for bottom promotions so Queen is closest to promotion square
  if (isVisuallyAtBottom) {
    pieces = pieces.reverse();
  }

  const dialogX = squareX;
  let dialogY;

  if (isVisuallyAtTop) {
    // Visually at top - show dialog going down from promotion square
    dialogY = squareY;
  } else if (isVisuallyAtBottom) {
    // Visually at bottom - show dialog going up (position so it ends at promotion square)
    dialogY = squareY - 3 * squareSize;
  } else {
    // Fallback (shouldn't happen in normal chess)
    dialogY = squareY;
  }

  return (
    <>
      {/* Invisible overlay for click-outside-to-cancel */}
      <div
        className='promotion-board-overlay'
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 999,
        }}
        onClick={onCancel}
      />
      <div
        className='promotion-dialog'
        style={{
          position: 'absolute',
          left: dialogX,
          top: dialogY,
          width: squareSize,
          height: squareSize * 4,
          zIndex: 1000,
        }}
        onClick={e => e.stopPropagation()}
      >
        {pieces.map(({ type, icon }) => (
          <button
            key={type}
            className='promotion-piece'
            style={{
              width: squareSize,
              height: squareSize,
            }}
            onClick={() => onSelect(type)}
          >
            <img
              src={icon}
              alt='promotion piece'
              className='promotion-piece-img'
            />
          </button>
        ))}
      </div>
    </>
  );
};