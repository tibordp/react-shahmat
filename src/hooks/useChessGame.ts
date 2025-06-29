import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Color,
  Move,
  ChessError,
  ChessBoardCallbacks,
  GameState,
} from '../engine/jsChessEngine';
import { ChessEngineAPI } from './useJSChessEngine';

interface UseChessGameProps {
  chessEngine: ChessEngineAPI;
  whiteIsHuman?: boolean;
  blackIsHuman?: boolean;
  onPositionChange?: (gameState: GameState, lastMove?: Move) => void;
  onError?: ChessBoardCallbacks['onError'];
}

export function useChessGame({
  chessEngine,
  whiteIsHuman = true,
  blackIsHuman = true,
  onPositionChange,
  onError,
}: UseChessGameProps) {
  // Track last external move for animation purposes
  const [lastExternalMove, setLastExternalMove] = useState<{
    move: Move;
    timestamp: number;
  } | null>(null);
  const [preMoves, setPreMoves] = useState<Move[]>([]);
  const isProcessingExternal = useRef(false);
  const lastProcessedTurn = useRef<string>('');

  // Determine if current player is external (non-human)
  const currentPlayer = chessEngine?.getCurrentPlayer();
  const isCurrentPlayerExternal =
    currentPlayer === Color.White ? !whiteIsHuman : !blackIsHuman;

  const gameState = chessEngine?.getGameState();
  const isGameOver = gameState?.isGameOver || false;

  // Simple state calculation
  const canHumanMove = !isGameOver && !isCurrentPlayerExternal;
  const canMakePreMoves = !isGameOver && isCurrentPlayerExternal;

  // Notify about position changes only when explicitly called
  const notifyPositionChange = useCallback(() => {
    if (onPositionChange && chessEngine) {
      const gameState = chessEngine.getGameState();
      const lastMove = chessEngine.getLastMove();
      onPositionChange(gameState, lastMove || undefined);
    }
  }, [onPositionChange, chessEngine]);

  // Initial position notification - only once when engine loads
  const hasNotifiedInitial = useRef(false);
  useEffect(() => {
    if (chessEngine && onPositionChange && !hasNotifiedInitial.current) {
      hasNotifiedInitial.current = true;
      notifyPositionChange();
    }
  }, [chessEngine, onPositionChange, notifyPositionChange]);

  // Simple move execution - no animation handling
  const makeMove = useCallback(
    (move: Move) => {
      if (!chessEngine) return null;

      const from = { file: move.fromFile, rank: move.fromRank };
      const to = { file: move.toFile, rank: move.toRank };
      const result = chessEngine.makeMove(from, to, move.promotionPiece);

      if (result.success) {
        notifyPositionChange();
      }

      return result;
    },
    [chessEngine, notifyPositionChange]
  );

  // External move execution via ref method - validates and queues for execution
  const executeExternalMove = useCallback(
    (move: Move) => {
      if (!chessEngine) return false;

      // Validate move
      const from = { file: move.fromFile, rank: move.fromRank };
      const to = { file: move.toFile, rank: move.toRank };
      const validationResult = chessEngine.isValidMove(
        from,
        to,
        move.promotionPiece
      );

      if (validationResult.valid) {
        // Queue move for ChessBoard to execute (with sound and animation)
        setLastExternalMove({
          move,
          timestamp: Date.now(),
        });
        return true;
      } else {
        console.log('Invalid move attempt:', validationResult);
        const error: ChessError = {
          type: 'invalid_move',
          player: currentPlayer!,
          move,
          message: 'Invalid move from external player',
        };
        onError?.(error);
        return false;
      }
    },
    [chessEngine, currentPlayer, onError]
  );

  // Clear last external move after animation is handled
  const clearLastExternalMove = useCallback(() => {
    setLastExternalMove(null);
  }, []);

  // Game control functions
  const resetGame = useCallback(() => {
    chessEngine?.resetGame();
    setLastExternalMove(null);
    isProcessingExternal.current = false;
    lastProcessedTurn.current = '';
    // Notify about the reset position
    notifyPositionChange();
  }, [chessEngine, notifyPositionChange]);

  const setPosition = useCallback(
    (fen: string) => {
      const success = chessEngine?.setPosition(fen);
      if (success) {
        setLastExternalMove(null);
        setPreMoves([]);
        isProcessingExternal.current = false;
        lastProcessedTurn.current = '';
        // Notify about the new position
        notifyPositionChange();
      }
      return success || false;
    },
    [chessEngine, notifyPositionChange]
  );

  // Pre-move management
  const addPreMove = useCallback((move: Move) => {
    setPreMoves(prev => [...prev, move]);
  }, []);

  const clearPreMoves = useCallback(() => {
    setPreMoves([]);
  }, []);

  const validateAndExecutePreMoves = useCallback(() => {
    if (preMoves.length === 0 || !chessEngine) return;

    // Validate each pre-move in sequence on a simulated board state
    let currentBoardState = chessEngine;
    const validPreMoves: Move[] = [];

    for (const preMove of preMoves) {
      const from = { file: preMove.fromFile, rank: preMove.fromRank };
      const to = { file: preMove.toFile, rank: preMove.toRank };

      const validation = currentBoardState.isValidMove(
        from,
        to,
        preMove.promotionPiece
      );
      if (!validation.valid) {
        // If any pre-move is invalid, clear all and stop
        setPreMoves([]);
        return;
      }

      validPreMoves.push(preMove);
      // For now, just validate the first move - full simulation would require board cloning
      break;
    }

    // Execute the first valid pre-move
    if (validPreMoves.length > 0) {
      const firstMove = validPreMoves[0];
      const result = makeMove(firstMove);

      if (result?.success) {
        // Remove the executed move and keep remaining pre-moves
        setPreMoves(prev => prev.slice(1));
      } else {
        // If execution failed, clear all pre-moves
        setPreMoves([]);
      }
    }
  }, [preMoves, chessEngine, makeMove]);

  // Execute pre-moves when it becomes human's turn
  useEffect(() => {
    if (canHumanMove && preMoves.length > 0) {
      validateAndExecutePreMoves();
    }
  }, [canHumanMove, preMoves.length, validateAndExecutePreMoves]);

  return {
    // State
    canHumanMove,
    canMakePreMoves,
    isExternalTurn: !isGameOver && isCurrentPlayerExternal,
    lastExternalMove,
    preMoves,

    // Actions
    makeMove,
    executeExternalMove,
    addPreMove,
    clearPreMoves,
    clearLastExternalMove,
    resetGame,
    setPosition,

    // Engine access
    chessEngine,
  };
}
