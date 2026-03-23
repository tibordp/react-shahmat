import React, { useState, useEffect, useRef } from 'react';
import { Piece, Position } from '../engine/chessRules';
import { AnimationState } from '../hooks/usePieceAnimations';
import { getPieceIcon } from '../utils/pieceIcons';
import type { PieceSet } from '../types';

import styles from './ChessBoard.module.css';

interface AnimatingPieceProps {
  piece: Piece;
  from: Position;
  to: Position;
  startTime: number;
  flipped?: boolean;
  onComplete: () => void;
  squareSize: number;
  animationDuration: number;
  pieceSet: PieceSet;
  renderPiece?: (piece: Piece, size: number) => React.ReactNode;
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
  pieceSet,
  renderPiece,
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
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [fromX, fromY, toX, toY, startTime, onComplete, animationDuration]);

  const scale = squareSize * 0.95;
  return (
    <div
      className={styles.animatingPiece}
      style={{
        left: position.x - scale / 2,
        top: position.y - scale / 2,
        width: scale,
        height: scale,
      }}
    >
      {renderPiece ? (
        renderPiece(piece, squareSize)
      ) : (
        <img
          src={getPieceIcon(piece, pieceSet)}
          alt='animating piece'
          className={styles.animatingPieceImg}
        />
      )}
    </div>
  );
};

interface PieceAnimationsProps {
  animationState: AnimationState | null;
  squareSize: number;
  animationDuration: number;
  flipped?: boolean;
  onAnimationComplete: () => void;
  pieceSet: PieceSet;
  renderPiece?: (piece: Piece, size: number) => React.ReactNode;
}

export const PieceAnimations: React.FC<PieceAnimationsProps> = ({
  animationState,
  squareSize,
  animationDuration,
  flipped,
  onAnimationComplete,
  pieceSet,
  renderPiece,
}) => {
  if (!animationState) return null;

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
          onComplete={index === 0 ? onAnimationComplete : () => {}}
          flipped={flipped}
          pieceSet={pieceSet}
          renderPiece={renderPiece}
        />
      ))}
    </>
  );
};
