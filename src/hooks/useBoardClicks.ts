import { useCallback } from 'react';
import { Piece, Color, Position } from '../engine/jsChessEngine';
import { BoardMove, PlayerColor } from '../types';

interface Arrow {
  from: Position;
  to: Position;
}

export interface UseBoardClicksOptions {
  boardState: (Piece | null)[][];
  turnColor: PlayerColor;
  movableColor: PlayerColor | 'both' | 'none';
  validMovesForSquare: (file: number, rank: number) => Position[];
  selectedSquare: Position | null;
  setSelectedSquare: React.Dispatch<React.SetStateAction<Position | null>>;
  setValidMoves: React.Dispatch<React.SetStateAction<Position[]>>;
  setArrows: React.Dispatch<React.SetStateAction<Arrow[]>>;
  setHighlightedSquares: React.Dispatch<React.SetStateAction<Position[]>>;
  arrowStart: Position | null;
  setArrowStart: (position: Position | null) => void;
  onMoveAttempt: (
    fromFile: number,
    fromRank: number,
    toFile: number,
    toRank: number,
    isDrag?: boolean
  ) => void;
  onPremoveAttempt: (
    fromFile: number,
    fromRank: number,
    toFile: number,
    toRank: number
  ) => void;
  canMove: boolean;
  canPremove: boolean;
  enableArrows: boolean;
  enableHighlights: boolean;
  premoves: BoardMove[];
  clearPremoves: () => void;
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
    boardState,
    turnColor,
    movableColor,
    validMovesForSquare,
    selectedSquare,
    setSelectedSquare,
    setValidMoves,
    setArrows,
    setHighlightedSquares,
    arrowStart,
    setArrowStart,
    onMoveAttempt,
    onPremoveAttempt,
    canMove,
    canPremove,
    enableArrows,
    enableHighlights,
    premoves,
    clearPremoves,
  } = options;

  const isMovableColor = useCallback(
    (color: Color): boolean => {
      const playerColor = color === Color.White ? 'white' : 'black';
      return movableColor === 'both' || movableColor === playerColor;
    },
    [movableColor]
  );

  const turnColorEnum = turnColor === 'white' ? Color.White : Color.Black;

  const handleSquareClick = useCallback(
    (file: number, rank: number) => {
      // Clear arrows and highlights on any left click
      setArrows([]);
      setHighlightedSquares([]);

      const piece = boardState[rank]?.[file];
      const isTurnPiece =
        piece && piece.color === turnColorEnum && isMovableColor(piece.color);
      const isPremovePiece =
        piece &&
        piece.color !== turnColorEnum &&
        isMovableColor(piece.color) &&
        canPremove;

      if (selectedSquare) {
        const selectedPiece =
          boardState[selectedSquare.rank]?.[selectedSquare.file];
        const selectedIsTurn =
          selectedPiece && selectedPiece.color === turnColorEnum;

        if (selectedSquare.file === file && selectedSquare.rank === rank) {
          // Clicking same square — deselect
          setSelectedSquare(null);
          setValidMoves([]);
        } else if (isTurnPiece && selectedIsTurn) {
          // Switching selection to another own piece (normal move)
          setSelectedSquare({ file, rank });
          setValidMoves(validMovesForSquare(file, rank));
        } else if (isPremovePiece && !selectedIsTurn) {
          // Switching selection to another own piece (premove)
          setSelectedSquare({ file, rank });
          setValidMoves(validMovesForSquare(file, rank));
        } else if (selectedIsTurn && canMove) {
          // Destination click for normal move
          onMoveAttempt(selectedSquare.file, selectedSquare.rank, file, rank);
          setSelectedSquare(null);
          setValidMoves([]);
        } else if (!selectedIsTurn && canPremove) {
          // Destination click for premove
          onPremoveAttempt(
            selectedSquare.file,
            selectedSquare.rank,
            file,
            rank
          );
          setSelectedSquare(null);
          setValidMoves([]);
        } else {
          setSelectedSquare(null);
          setValidMoves([]);
        }
      } else if (isTurnPiece && canMove) {
        // Select piece for normal move
        setSelectedSquare({ file, rank });
        setValidMoves(validMovesForSquare(file, rank));
      } else if (isPremovePiece) {
        // Select piece for premove
        setSelectedSquare({ file, rank });
        setValidMoves(validMovesForSquare(file, rank));
      }
    },
    [
      boardState,
      selectedSquare,
      canMove,
      canPremove,
      turnColorEnum,
      isMovableColor,
      validMovesForSquare,
      onMoveAttempt,
      onPremoveAttempt,
      setArrows,
      setHighlightedSquares,
      setSelectedSquare,
      setValidMoves,
    ]
  );

  const handleRightMouseDown = useCallback(
    (file: number, rank: number) => {
      if (premoves.length > 0) {
        clearPremoves();
        return;
      }
      if (enableArrows || enableHighlights) {
        setArrowStart({ file, rank });
      }
    },
    [premoves, clearPremoves, enableArrows, enableHighlights, setArrowStart]
  );

  const handleRightMouseUp = useCallback(
    (file: number, rank: number) => {
      if (arrowStart) {
        if (arrowStart.file === file && arrowStart.rank === rank) {
          if (enableHighlights) {
            setHighlightedSquares(prev => {
              const existingIndex = prev.findIndex(
                square => square.file === file && square.rank === rank
              );
              if (existingIndex >= 0) {
                return prev.filter((_, index) => index !== existingIndex);
              } else {
                return [...prev, { file, rank }];
              }
            });
          }
        } else if (enableArrows) {
          const newArrow = { from: arrowStart, to: { file, rank } };
          setArrows(prev => {
            const existingIndex = prev.findIndex(
              arrow =>
                arrow.from.file === newArrow.from.file &&
                arrow.from.rank === newArrow.from.rank &&
                arrow.to.file === newArrow.to.file &&
                arrow.to.rank === newArrow.to.rank
            );
            if (existingIndex >= 0) {
              return prev.filter((_, index) => index !== existingIndex);
            } else {
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
