import React, { useCallback } from 'react';
import { Piece, Color } from '../engine/jsChessEngine';

interface Arrow {
  from: { file: number; rank: number };
  to: { file: number; rank: number };
}

interface HighlightedSquare {
  file: number;
  rank: number;
}

export interface UseBoardDragDropOptions {
  chessEngine: any;
  game: any;
  setSelectedSquare: React.Dispatch<
    React.SetStateAction<{ file: number; rank: number } | null>
  >;
  setValidMoves: React.Dispatch<React.SetStateAction<any[]>>;
  setArrows: React.Dispatch<React.SetStateAction<Arrow[]>>;
  setHighlightedSquares: React.Dispatch<
    React.SetStateAction<HighlightedSquare[]>
  >;
  getValidMovesFromVisualBoard: (file: number, rank: number) => any[];
  getVisualBoardState: () => (Piece | null)[][];
  enablePreMoves: boolean;
  whiteIsHuman: boolean;
  blackIsHuman: boolean;
  attemptMove: (
    fromFile: number,
    fromRank: number,
    toFile: number,
    toRank: number,
    animate: boolean
  ) => void;
  handlePreMoveAttempt: (
    fromFile: number,
    fromRank: number,
    toFile: number,
    toRank: number
  ) => boolean;
  playMoveSound: (result: any) => void;
  animations: {
    isAnimating: boolean;
    startAnimation: (pieces: any[]) => void;
  };
  enableAnimations: boolean;
  handleInvalidMoveInCheck: (file: number, rank: number) => void;
}

export interface UseBoardDragDropReturn {
  handleDrop: (
    fromFile: number,
    fromRank: number,
    toFile: number,
    toRank: number
  ) => void;
  handleDragStart: (file: number, rank: number) => void;
  handleDragEnd: (file: number, rank: number) => void;
}

export function useBoardDragDrop(
  options: UseBoardDragDropOptions
): UseBoardDragDropReturn {
  const {
    chessEngine,
    game,
    setSelectedSquare,
    setValidMoves,
    setArrows,
    setHighlightedSquares,
    getValidMovesFromVisualBoard,
    getVisualBoardState,
    enablePreMoves,
    whiteIsHuman,
    blackIsHuman,
    attemptMove,
    handlePreMoveAttempt,
    playMoveSound,
    animations,
    enableAnimations,
    handleInvalidMoveInCheck,
  } = options;

  const handleDrop = useCallback(
    (fromFile: number, fromRank: number, toFile: number, toRank: number) => {
      if (!chessEngine) return;

      // Handle normal drops when it's human's turn
      if (game.canHumanMove) {
        const from = { file: fromFile, rank: fromRank };
        const to = { file: toFile, rank: toRank };

        // Check if this is a valid move and what type
        const validationResult = chessEngine.isValidMove(from, to);

        if (!validationResult.valid) {
          handleInvalidMoveInCheck(fromFile, fromRank);
          return;
        }

        // For castling moves during drag, handle specially
        if (validationResult.type === 'castling') {
          // Execute the full castling move immediately (king is already visually positioned)
          const move = { fromFile, fromRank, toFile, toRank };
          const result = game.makeMove(move);

          if (result?.success) {
            // Clear selection and play sound immediately
            setSelectedSquare(null);
            setValidMoves([]);
            playMoveSound(result);

            // Animate only the rook visually if animations enabled (move is already executed, king is in position)
            if (validationResult.additionalMoves && enableAnimations) {
              const rookMove = validationResult.additionalMoves[0];
              animations.startAnimation([
                {
                  piece: rookMove.piece,
                  from: rookMove.from,
                  to: rookMove.to,
                },
              ]);
            }
          }
          return;
        }

        // Regular move (non-castling) - don't animate drag moves since piece is already positioned
        attemptMove(fromFile, fromRank, toFile, toRank, false);
      }
      // Handle pre-move drops when it's external player's turn OR during any animation (and pre-moves are enabled)
      else if (
        (game.canMakePreMoves || animations.isAnimating) &&
        enablePreMoves
      ) {
        // Use shared pre-move logic
        handlePreMoveAttempt(fromFile, fromRank, toFile, toRank);
        setSelectedSquare(null);
        setValidMoves([]);
      }
    },
    [
      chessEngine,
      attemptMove,
      game,
      handlePreMoveAttempt,
      enablePreMoves,
      playMoveSound,
      animations,
      enableAnimations,
      handleInvalidMoveInCheck,
      setSelectedSquare,
      setValidMoves,
    ]
  );

  const handleDragStart = useCallback(
    (file: number, rank: number) => {
      if (!chessEngine) return;

      // Allow dragging when it's human's turn OR when making pre-moves OR during any animation (and pre-moves are enabled)
      if (game.canHumanMove || enablePreMoves) {
        // Use visual board state to account for pre-moves
        const visualBoardState = getVisualBoardState();
        const piece = visualBoardState[7 - rank]?.[file];
        const isHumanPiece =
          (whiteIsHuman && piece?.color === Color.White) ||
          (blackIsHuman && piece?.color === Color.Black);

        // Only allow dragging allowed color pieces
        if (!isHumanPiece) {
          return;
        }

        // Clear arrows, highlights, and any existing selection indicators when starting to drag
        setArrows([]);
        setHighlightedSquares([]);
        setSelectedSquare({ file, rank });

        // Show valid moves from the visual board position (works for both normal and pre-moves)
        const moves = getValidMovesFromVisualBoard(file, rank);
        setValidMoves(moves);
      }
    },
    [
      chessEngine,
      game,
      getValidMovesFromVisualBoard,
      getVisualBoardState,
      enablePreMoves,
      whiteIsHuman,
      blackIsHuman,
      setArrows,
      setHighlightedSquares,
      setSelectedSquare,
      setValidMoves,
    ]
  );

  const handleDragEnd = useCallback((file: number, rank: number) => {
    // Currently empty - keeping for potential future use
  }, []);

  return {
    handleDrop,
    handleDragStart,
    handleDragEnd,
  };
}
