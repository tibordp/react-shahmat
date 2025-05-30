import React, { useState, useEffect, useRef } from 'react';
import { Piece, Position } from '../engine/jsChessEngine';
import { AnimationState } from '../hooks/usePieceAnimations';

// Piece icons
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
import { Color } from '../engine/jsChessEngine';

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

interface AnimatingPieceProps {
  piece: Piece;
  from: Position;
  to: Position;
  startTime: number;
  flipped?: boolean; // Whether to flip the board for black perspective
  onComplete: () => void;
  squareSize: number;
  animationDuration: number;
}

const AnimatingPiece: React.FC<AnimatingPieceProps> = ({
  piece,
  from,
  to,
  startTime,
  onComplete,
  squareSize,
  flipped,
  animationDuration,
}) => {
  const effectiveFrom = flipped
    ? { file: 7 - from.file, rank: 7 - from.rank }
    : from;
  const effectiveTo = flipped ? { file: 7 - to.file, rank: 7 - to.rank } : to;

  const fromX = effectiveFrom.file * squareSize + squareSize / 2;
  const fromY = (7 - effectiveFrom.rank) * squareSize + squareSize / 2;
  const toX = effectiveTo.file * squareSize + squareSize / 2;
  const toY = (7 - effectiveTo.rank) * squareSize + squareSize / 2;

  const [position, setPosition] = useState({ x: fromX, y: fromY });
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);

      const currentX = fromX + (toX - fromX) * easeOutQuart;
      const currentY = fromY + (toY - fromY) * easeOutQuart;

      setPosition({ x: currentX, y: currentY });

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        onComplete();
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [fromX, fromY, toX, toY, startTime, onComplete, animationDuration]);

  const pieceIcon = getPieceIcon(piece);
  const scale = squareSize * 0.95; // Scale down to fit within the square
  return (
    <div
      className='animating-piece'
      style={{
        left: position.x - scale / 2,
        top: position.y - scale / 2,
        width: scale,
        height: scale,
      }}
    >
      <img
        src={pieceIcon}
        alt='animating piece'
        className='animating-piece-img'
      />
    </div>
  );
};

interface PieceAnimationsProps {
  animationState: AnimationState | null;
  squareSize: number;
  animationDuration: number;
  flipped?: boolean;
  onAnimationComplete: () => void;
}

/**
 * Component that handles rendering of animated pieces during moves.
 * Manages multiple pieces that can be animated simultaneously (e.g., castling).
 */
export const PieceAnimations: React.FC<PieceAnimationsProps> = ({
  animationState,
  squareSize,
  animationDuration,
  flipped,
  onAnimationComplete,
}) => {
  if (!animationState) {
    return null;
  }

  return (
    <>
      {animationState.pieces.map((animatingPiece, index) => (
        <AnimatingPiece
          key={`${animatingPiece.from.file}-${animatingPiece.from.rank}-${index}`}
          piece={animatingPiece.piece}
          from={animatingPiece.from}
          to={animatingPiece.to}
          startTime={animationState.startTime}
          squareSize={squareSize}
          animationDuration={animationDuration}
          onComplete={index === 0 ? onAnimationComplete : () => {}} // Only call completion for the first piece
          flipped={flipped}
        />
      ))}
    </>
  );
};