import { useState, useCallback, useRef, useEffect } from 'react';
import { Color, Move, ChessError, ChessBoardCallbacks } from '../engine/jsChessEngine';

interface UseChessGameProps {
  chessEngine: any;
  onWhiteMove?: ChessBoardCallbacks['onWhiteMove'];
  onBlackMove?: ChessBoardCallbacks['onBlackMove'];
  onError?: ChessBoardCallbacks['onError'];
  onGameStateChange?: ChessBoardCallbacks['onGameStateChange'];
}

export function useChessGame({
  chessEngine,
  onWhiteMove,
  onBlackMove,
  onError,
  onGameStateChange,
}: UseChessGameProps) {
  const [pendingExternalMove, setPendingExternalMove] = useState<Move | null>(null);
  const isProcessingExternal = useRef(false);
  const lastProcessedTurn = useRef<string>('');

  // Determine if current player is external
  const currentPlayer = chessEngine?.getCurrentPlayer();
  const isCurrentPlayerExternal = currentPlayer === Color.White ? !!onWhiteMove : !!onBlackMove;
  const currentCallback = currentPlayer === Color.White ? onWhiteMove : onBlackMove;
  
  const gameState = chessEngine?.getGameState();
  const isGameOver = gameState?.isGameOver || false;
  
  // Simple state calculation
  const canHumanMove = !isGameOver && !isCurrentPlayerExternal;

  // Notify about game state changes
  useEffect(() => {
    if (onGameStateChange && chessEngine) {
      onGameStateChange(chessEngine.getGameState());
    }
  }, [onGameStateChange, chessEngine, currentPlayer]);

  // Handle external player moves with proper turn tracking
  useEffect(() => {
    if (!chessEngine || !currentCallback || isProcessingExternal.current || isGameOver) {
      return;
    }

    if (!isCurrentPlayerExternal) {
      return;
    }

    // Create a unique turn identifier to prevent duplicate processing
    const currentTurnId = `${currentPlayer}-${gameState?.moveHistory?.length || 0}`;
    if (lastProcessedTurn.current === currentTurnId) {
      return;
    }

    lastProcessedTurn.current = currentTurnId;
    isProcessingExternal.current = true;
    
    const executeExternalMove = async () => {
      try {
        const gameState = chessEngine.getGameState();
        const opponentMove = chessEngine.getLastMove();
        const move = await currentCallback(gameState, opponentMove || undefined);
        
        // Validate move
        const from = { file: move.fromFile, rank: move.fromRank };
        const to = { file: move.toFile, rank: move.toRank };
        const validationResult = chessEngine.isValidMove(from, to);
        
        if (validationResult.valid) {
          // Set the pending external move for ChessBoard to animate
          setPendingExternalMove(move);
        } else {
          const error: ChessError = {
            type: 'invalid_move',
            player: currentPlayer!,
            move,
            message: 'Invalid move from external player'
          };
          onError?.(error);
        }
      } catch (error) {
        const chessError: ChessError = {
          type: 'callback_error',
          player: currentPlayer!,
          message: `External player error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          originalError: error instanceof Error ? error : undefined
        };
        onError?.(chessError);
      } finally {
        isProcessingExternal.current = false;
      }
    };

    executeExternalMove();
  }, [chessEngine, currentCallback, currentPlayer, isCurrentPlayerExternal, isGameOver, onError, gameState?.moveHistory?.length]);

  // Simple move execution - no animation handling
  const makeMove = useCallback((move: Move) => {
    if (!chessEngine) return false;

    const from = { file: move.fromFile, rank: move.fromRank };
    const to = { file: move.toFile, rank: move.toRank };
    const result = chessEngine.makeMove(from, to);
    
    return result.success;
  }, [chessEngine]);

  // Clear pending external move after it's been handled
  const clearPendingExternalMove = useCallback(() => {
    setPendingExternalMove(null);
    isProcessingExternal.current = false;
  }, []);

  // Game control functions
  const resetGame = useCallback(() => {
    chessEngine?.resetGame();
    setPendingExternalMove(null);
    isProcessingExternal.current = false;
    lastProcessedTurn.current = '';
  }, [chessEngine]);

  const setPosition = useCallback((fen: string) => {
    const success = chessEngine?.setPosition(fen);
    if (success) {
      setPendingExternalMove(null);
      isProcessingExternal.current = false;
      lastProcessedTurn.current = '';
    }
    return success || false;
  }, [chessEngine]);

  return {
    // State
    canHumanMove,
    isExternalTurn: !isGameOver && isCurrentPlayerExternal,
    pendingExternalMove,
    
    // Actions
    makeMove,
    clearPendingExternalMove,
    resetGame,
    setPosition,
    
    // Engine access
    chessEngine,
  };
}