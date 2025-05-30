import { useState, useCallback, useRef } from 'react';
import { Piece, Position } from '../engine/jsChessEngine';

export interface AnimatingPiece {
  piece: Piece;
  from: Position;
  to: Position;
}

export interface AnimationState {
  pieces: AnimatingPiece[];
  startTime: number;
  moveId: string; // Unique identifier for this animation
}

export interface UsePieceAnimationsOptions {
  enableAnimations?: boolean;
  animationDuration?: number;
}

export interface UsePieceAnimationsReturn {
  animatingPieces: AnimationState | null;
  startAnimation: (pieces: AnimatingPiece[]) => void;
  interruptAnimation: () => void;
  handleAnimationComplete: () => void;
  isAnimating: boolean;
}

/**
 * Hook to manage piece animations on the chess board.
 * Provides functionality to start, interrupt, and track animations.
 */
export function usePieceAnimations(
  options: UsePieceAnimationsOptions = {}
): UsePieceAnimationsReturn {
  const { enableAnimations = true } = options;

  const [animatingPieces, setAnimatingPieces] = useState<AnimationState | null>(
    null
  );

  // Store completed animations to allow for interruption
  const animationCompleteRef = useRef<(() => void) | null>(null);

  /**
   * Start a new animation with the given pieces
   */
  const startAnimation = useCallback(
    (pieces: AnimatingPiece[]) => {
      if (!enableAnimations || pieces.length === 0) {
        return;
      }

      // Interrupt any current animation
      if (animatingPieces) {
        if (animationCompleteRef.current) {
          animationCompleteRef.current();
          animationCompleteRef.current = null;
        }
        setAnimatingPieces(null);
      }

      const moveId = `${Date.now()}-${Math.random()}`;
      const newAnimationState: AnimationState = {
        pieces,
        startTime: Date.now(),
        moveId,
      };

      setAnimatingPieces(newAnimationState);
    },
    [enableAnimations, animatingPieces]
  );

  /**
   * Interrupt the current animation if one is running
   */
  const interruptAnimation = useCallback(() => {
    if (animatingPieces) {
      // Cancel any ongoing animation
      if (animationCompleteRef.current) {
        animationCompleteRef.current();
        animationCompleteRef.current = null;
      }
      setAnimatingPieces(null);
    }
  }, [animatingPieces]);

  /**
   * Handle animation completion - clean up state
   */
  const handleAnimationComplete = useCallback(() => {
    // Animation is now purely visual - just clean up
    setAnimatingPieces(null);
    animationCompleteRef.current = null;
  }, []);

  // Set up the animation completion reference when animation starts
  if (animatingPieces && !animationCompleteRef.current) {
    animationCompleteRef.current = handleAnimationComplete;
  }

  const isAnimating = animatingPieces !== null;

  return {
    animatingPieces,
    startAnimation,
    interruptAnimation,
    handleAnimationComplete,
    isAnimating,
  };
}
