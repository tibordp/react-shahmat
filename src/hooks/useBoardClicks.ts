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

export interface UseBoardClicksOptions {
  chessEngine: any;
  game: any;
  selectedSquare: { file: number; rank: number } | null;
  setSelectedSquare: React.Dispatch<
    React.SetStateAction<{ file: number; rank: number } | null>
  >;
  setValidMoves: React.Dispatch<React.SetStateAction<any[]>>;
  setArrows: React.Dispatch<React.SetStateAction<Arrow[]>>;
  setHighlightedSquares: React.Dispatch<
    React.SetStateAction<HighlightedSquare[]>
  >;
  arrowStart: { file: number; rank: number } | null;
  setArrowStart: (position: { file: number; rank: number } | null) => void;
  getValidMovesFromVisualBoard: (file: number, rank: number) => any[];
  getVisualBoardState: () => (Piece | null)[][];
  enablePreMoves: boolean;
  enableArrows: boolean;
  enableHighlights: boolean;
  handlePreMoveAttempt: (
    fromFile: number,
    fromRank: number,
    toFile: number,
    toRank: number
  ) => boolean;
  attemptMove: (
    fromFile: number,
    fromRank: number,
    toFile: number,
    toRank: number,
    animate: boolean
  ) => boolean;
  animations: {
    isAnimating: boolean;
  };
  enableAnimations: boolean;
}

export interface UseBoardClicksReturn {
  handleSquareClick: (file: number, rank: number) => void;
  handleRightMouseDown: (file: number, rank: number) => void;
  handleRightMouseUp: (file: number, rank: number) => void;
}

export function useBoardClicks(
  options: UseBoardClicksOptions
): UseBoardClicksReturn {
  const {
    chessEngine,
    game,
    selectedSquare,
    setSelectedSquare,
    setValidMoves,
    setArrows,
    setHighlightedSquares,
    arrowStart,
    setArrowStart,
    getValidMovesFromVisualBoard,
    getVisualBoardState,
    enablePreMoves,
    enableArrows,
    enableHighlights,
    handlePreMoveAttempt,
    attemptMove,
    animations,
    enableAnimations,
  } = options;

  const handleSquareClick = useCallback(
    (file: number, rank: number) => {
      if (!chessEngine) return;

      // Clear arrows and highlights on any left click
      setArrows([]);
      setHighlightedSquares([]);

      // Use visual board state to account for pre-moves
      const visualBoardState = getVisualBoardState();
      const piece = visualBoardState[7 - rank]?.[file];

      // Handle normal moves when it's human's turn
      if (game.canHumanMove) {
        if (selectedSquare) {
          // Try to make a move
          if (
            (selectedSquare.file === file && selectedSquare.rank === rank) ||
            (piece && piece.color === chessEngine.getCurrentPlayer())
          ) {
            // Clicking on a different piece of the same player - switch selection
            setSelectedSquare({ file, rank });
            const moves = getValidMovesFromVisualBoard(file, rank);
            setValidMoves(moves);
          } else {
            // Attempt to move to the clicked square, or deselect if it's an empty square
            if (
              !attemptMove(
                selectedSquare.file,
                selectedSquare.rank,
                file,
                rank,
                enableAnimations
              )
            ) {
              // If move failed and this is an empty square, deselect
              if (!piece) {
                setSelectedSquare(null);
                setValidMoves([]);
              }
            }
          }
        } else if (piece && piece.color === chessEngine.getCurrentPlayer()) {
          // Select a piece and show valid moves
          setSelectedSquare({ file, rank });
          const moves = getValidMovesFromVisualBoard(file, rank);
          setValidMoves(moves);
        }
      }
      // Handle pre-moves when it's external player's turn OR during any animation (and pre-moves are enabled)
      else if (
        (game.canMakePreMoves || animations.isAnimating) &&
        enablePreMoves
      ) {
        // Determine human player color (opposite of current player)
        const humanPlayerColor =
          chessEngine.getCurrentPlayer() === Color.White
            ? Color.Black
            : Color.White;

        if (selectedSquare) {
          // Try to make a pre-move
          if (selectedSquare.file === file && selectedSquare.rank === rank) {
            // Deselect
            setSelectedSquare(null);
            setValidMoves([]);
          } else if (piece && piece.color === humanPlayerColor) {
            // Clicking on own piece - switch selection (for future turn)
            setSelectedSquare({ file, rank });
            // Show valid moves from the visual board position
            const moves = getValidMovesFromVisualBoard(file, rank);
            setValidMoves(moves);
          } else {
            // Try to make a pre-move using shared logic
            handlePreMoveAttempt(
              selectedSquare.file,
              selectedSquare.rank,
              file,
              rank
            );
            setSelectedSquare(null);
            setValidMoves([]);
          }
        } else if (piece && piece.color === humanPlayerColor) {
          // Select a piece for future move
          setSelectedSquare({ file, rank });
          // Show valid moves from the visual board position
          const moves = getValidMovesFromVisualBoard(file, rank);
          setValidMoves(moves);
        }
      }
    },
    [
      chessEngine,
      selectedSquare,
      attemptMove,
      game,
      getValidMovesFromVisualBoard,
      getVisualBoardState,
      enablePreMoves,
      handlePreMoveAttempt,
      animations.isAnimating,
      enableAnimations,
      setArrows,
      setHighlightedSquares,
      setSelectedSquare,
      setValidMoves,
    ]
  );

  const handleRightMouseDown = useCallback(
    (file: number, rank: number) => {
      // Clear pre-moves on any right-click - if pre-moves exist, only clear them and don't start arrow creation
      if (game.preMoves.length > 0) {
        game.clearPreMoves();
        return; // Don't start arrow creation when clearing pre-moves
      }

      // Start arrow creation if arrows are enabled, or set flag for highlights if arrows disabled but highlights enabled
      if (enableArrows || enableHighlights) {
        setArrowStart({ file, rank });
      }
    },
    [game, enableArrows, enableHighlights, setArrowStart]
  );

  const handleRightMouseUp = useCallback(
    (file: number, rank: number) => {
      if (arrowStart) {
        if (arrowStart.file === file && arrowStart.rank === rank) {
          // Same square - toggle square highlight instead of creating arrow (if highlights enabled)
          if (enableHighlights) {
            setHighlightedSquares(prev => {
              const existingIndex = prev.findIndex(
                square => square.file === file && square.rank === rank
              );

              if (existingIndex >= 0) {
                // Remove existing highlight
                return prev.filter((_, index) => index !== existingIndex);
              } else {
                // Add new highlight
                return [...prev, { file, rank }];
              }
            });
          }
        } else if (enableArrows) {
          // Different square - create or toggle arrow (if arrows enabled)
          const newArrow = { from: arrowStart, to: { file, rank } };
          setArrows(prev => {
            // Check if arrow already exists
            const existingIndex = prev.findIndex(
              arrow =>
                arrow.from.file === newArrow.from.file &&
                arrow.from.rank === newArrow.from.rank &&
                arrow.to.file === newArrow.to.file &&
                arrow.to.rank === newArrow.to.rank
            );

            if (existingIndex >= 0) {
              // Remove existing arrow
              return prev.filter((_, index) => index !== existingIndex);
            } else {
              // Add new arrow
              return [...prev, newArrow];
            }
          });
        }
      }
      setArrowStart(null);
    },
    [
      arrowStart,
      enableArrows,
      enableHighlights,
      setArrows,
      setHighlightedSquares,
      setArrowStart,
    ]
  );

  return {
    handleSquareClick,
    handleRightMouseDown,
    handleRightMouseUp,
  };
}
