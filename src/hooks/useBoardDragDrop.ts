import { useCallback } from 'react';
import { Piece, Color, Position } from '../engine/jsChessEngine';
import { PlayerColor } from '../types';

interface Arrow {
  from: Position;
  to: Position;
}

export interface UseBoardDragDropOptions {
  boardState: (Piece | null)[][];
  turnColor: PlayerColor;
  movableColor: PlayerColor | 'both' | 'none';
  validMovesForSquare: (file: number, rank: number) => Position[];
  setSelectedSquare: React.Dispatch<React.SetStateAction<Position | null>>;
  setValidMoves: React.Dispatch<React.SetStateAction<Position[]>>;
  setArrows: React.Dispatch<React.SetStateAction<Arrow[]>>;
  setHighlightedSquares: React.Dispatch<React.SetStateAction<Position[]>>;
  onMoveAttempt: (fromFile: number, fromRank: number, toFile: number, toRank: number, isDrag?: boolean) => void;
  onPremoveAttempt: (fromFile: number, fromRank: number, toFile: number, toRank: number) => void;
  canMove: boolean;
  canPremove: boolean;
}

export interface UseBoardDragDropReturn {
  handleDrop: (fromFile: number, fromRank: number, toFile: number, toRank: number) => void;
  handleDragStart: (file: number, rank: number) => void;
  handleDragEnd: (file: number, rank: number) => void;
}

export function useBoardDragDrop(options: UseBoardDragDropOptions): UseBoardDragDropReturn {
  const {
    boardState,
    turnColor,
    movableColor,
    validMovesForSquare,
    setSelectedSquare,
    setValidMoves,
    setArrows,
    setHighlightedSquares,
    onMoveAttempt,
    onPremoveAttempt,
    canMove,
    canPremove,
  } = options;

  const isMovableColor = useCallback(
    (color: Color): boolean => {
      const playerColor = color === Color.White ? 'white' : 'black';
      return movableColor === 'both' || movableColor === playerColor;
    },
    [movableColor]
  );

  const handleDrop = useCallback(
    (fromFile: number, fromRank: number, toFile: number, toRank: number) => {
      const piece = boardState[fromRank]?.[fromFile];
      const turnColorEnum = turnColor === 'white' ? Color.White : Color.Black;
      const isTurnPiece = piece && piece.color === turnColorEnum;

      if (isTurnPiece && canMove) {
        onMoveAttempt(fromFile, fromRank, toFile, toRank, true);
      } else if (!isTurnPiece && canPremove) {
        onPremoveAttempt(fromFile, fromRank, toFile, toRank);
      }
      // Keep piece selected — if the drop was a valid move, handleMoveAttempt
      // already clears selection. If invalid, selection stays so the user
      // can click a valid destination instead.
    },
    [boardState, turnColor, canMove, canPremove, onMoveAttempt, onPremoveAttempt, setSelectedSquare, setValidMoves]
  );

  const handleDragStart = useCallback(
    (file: number, rank: number) => {
      const piece = boardState[rank]?.[file];
      if (!piece || !isMovableColor(piece.color)) return;

      const turnColorEnum = turnColor === 'white' ? Color.White : Color.Black;
      const isTurnPiece = piece.color === turnColorEnum;

      // Allow dragging if it's a normal move (turn piece + canMove)
      // or a premove (non-turn piece + canPremove)
      if (!(isTurnPiece && canMove) && !(!isTurnPiece && canPremove)) return;

      setArrows([]);
      setHighlightedSquares([]);
      setSelectedSquare({ file, rank });

      const moves = validMovesForSquare(file, rank);
      setValidMoves(moves);
    },
    [
      boardState,
      turnColor,
      canMove,
      canPremove,
      isMovableColor,
      validMovesForSquare,
      setArrows,
      setHighlightedSquares,
      setSelectedSquare,
      setValidMoves,
    ]
  );

  const handleDragEnd = useCallback((_file: number, _rank: number) => {
    // Currently empty
  }, []);

  return {
    handleDrop,
    handleDragStart,
    handleDragEnd,
  };
}
