import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  PieceType,
  GameState,
} from '../engine/jsChessEngine';
import { ChessEngineAPI } from './useJSChessEngine';
import { useJSChessEngine } from './useJSChessEngine';
import { soundManager } from '../utils/soundManager';
import {
  BoardMove,
  PlayerColor,
  ValidMovesMap,
  GameEndOverlay,
  MoveSound,
  colorToPlayerColor,
  positionToSquare,
  boardMoveToInternal,
  buildValidMovesMap,
  ChessError,
} from '../types';
import type { ChessBoardProps } from '../components/ChessBoard';

export interface UseChessGameOptions {
  /** Starting position as FEN. Default: standard starting position */
  initialFen?: string;
  /** Whether white pieces are interactive. Default: true */
  whiteMovable?: boolean;
  /** Whether black pieces are interactive. Default: true */
  blackMovable?: boolean;
  /** Called when the position changes */
  onPositionChange?: (gameState: GameState, lastMove?: BoardMove) => void;
  /** Called on errors */
  onError?: (error: ChessError) => void;
}

export interface UseChessGameReturn {
  /** Props to spread onto <ChessBoard /> */
  boardProps: Pick<
    ChessBoardProps,
    | 'position'
    | 'turnColor'
    | 'lastMove'
    | 'check'
    | 'validMoves'
    | 'gameEndOverlay'
    | 'whiteMovable'
    | 'blackMovable'
    | 'onMove'
    | 'onPlaySound'
  >;
  /** Execute a move (for AI/server moves). Returns true if successful. */
  makeMove: (move: BoardMove) => boolean;
  /** Reset to starting position */
  resetGame: () => void;
  /** Load a position from FEN string */
  setPosition: (fen: string) => boolean;
  /** Get the current game state */
  getGameState: () => GameState;
  /** Direct access to the chess engine API */
  engine: ChessEngineAPI;
}

export function useChessGame(options: UseChessGameOptions = {}): UseChessGameReturn {
  const { initialFen, whiteMovable = true, blackMovable = true, onPositionChange, onError } = options;

  const chessEngine = useJSChessEngine();

  // Track last move for highlighting and animation
  const [lastMove, setLastMove] = useState<BoardMove | undefined>(undefined);
  // Force re-render counter (engine is mutable)
  const [, setRenderCount] = useState(0);

  const forceUpdate = useCallback(() => setRenderCount(c => c + 1), []);

  // Initialize with custom FEN if provided
  const initialFenRef = useRef(initialFen);
  useEffect(() => {
    if (initialFenRef.current) {
      chessEngine.setPosition(initialFenRef.current);
      forceUpdate();
    }
  }, [chessEngine, forceUpdate]);

  // Compute derived state from engine
  const gameState = chessEngine.getGameState();
  const turnColor: PlayerColor = colorToPlayerColor(chessEngine.getCurrentPlayer());

  // Is it a human-movable turn?
  const isHumanTurn = turnColor === 'white' ? whiteMovable : blackMovable;

  const checkSquare = useMemo((): string | undefined => {
    if (!gameState.isCheck) return undefined;
    const board = chessEngine.getBoardState();
    const currentPlayer = chessEngine.getCurrentPlayer();
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = board[rank]?.[file];
        if (piece?.type === PieceType.King && piece.color === currentPlayer) {
          return positionToSquare({ file, rank: 7 - rank });
        }
      }
    }
    return undefined;
  }, [gameState.isCheck, chessEngine]);

  // Only provide valid moves when it's a human-movable turn
  const validMoves = useMemo((): ValidMovesMap => {
    if (gameState.isGameOver || !isHumanTurn) return new Map();
    return buildValidMovesMap(gameState);
  }, [gameState, isHumanTurn]);

  const gameEndOverlay = useMemo((): GameEndOverlay | undefined => {
    if (!gameState.isGameOver || !gameState.result) return undefined;
    if (gameState.result.reason === 'checkmate' && gameState.result.winner !== undefined) {
      return {
        type: 'checkmate',
        winner: colorToPlayerColor(gameState.result.winner),
      };
    } else if (gameState.result.reason === 'stalemate') {
      return { type: 'stalemate' };
    } else {
      return { type: 'draw' };
    }
  }, [gameState]);

  // Determine what sound to play for a move result
  const playSoundForMove = useCallback(
    (moveResult: { type?: string; capturedPiece?: unknown }) => {
      const state = chessEngine.getGameState();

      if (state.isGameOver && state.result) {
        if (state.result.reason === 'checkmate') {
          soundManager.playCheckmate();
        } else {
          soundManager.playDraw();
        }
        return;
      }

      if (state.isCheck) {
        soundManager.playCheck();
      } else if (moveResult.type === 'promotion') {
        soundManager.playPromotion();
      } else if (moveResult.capturedPiece) {
        soundManager.playCapture();
      } else {
        soundManager.playMove();
      }
    },
    [chessEngine]
  );

  // Notify position change
  const notifyPositionChange = useCallback(
    (move?: BoardMove) => {
      if (onPositionChange) {
        onPositionChange(chessEngine.getGameState(), move);
      }
    },
    [onPositionChange, chessEngine]
  );

  // Initial notification
  const hasNotifiedInitial = useRef(false);
  useEffect(() => {
    if (!hasNotifiedInitial.current) {
      hasNotifiedInitial.current = true;
      soundManager.ensureReady();
      notifyPositionChange();
    }
  }, [notifyPositionChange]);

  // Execute a move internally
  const executeMoveInternal = useCallback(
    (boardMove: BoardMove): boolean => {
      const internalMove = boardMoveToInternal(boardMove);
      const from = { file: internalMove.fromFile, rank: internalMove.fromRank };
      const to = { file: internalMove.toFile, rank: internalMove.toRank };

      const result = chessEngine.makeMove(from, to, internalMove.promotionPiece);

      if (result.success) {
        setLastMove(boardMove);
        forceUpdate();
        playSoundForMove(result);
        notifyPositionChange(boardMove);
        return true;
      } else {
        if (result.promotionRequired) {
          return false;
        }
        if (onError) {
          onError({
            type: 'invalid_move',
            player: chessEngine.getCurrentPlayer(),
            move: internalMove,
            message: 'Invalid move',
          });
        }
        return false;
      }
    },
    [chessEngine, forceUpdate, playSoundForMove, notifyPositionChange, onError]
  );

  // onMove handler for the board (human moves)
  const handleBoardMove = useCallback(
    (move: BoardMove) => {
      executeMoveInternal(move);
    },
    [executeMoveInternal]
  );

  // onPlaySound handler for the board
  const handlePlaySound = useCallback(
    (sound: MoveSound) => {
      soundManager.ensureReady();
      switch (sound) {
        case 'premove':
          soundManager.playPreMove();
          break;
        case 'error':
          soundManager.playError();
          break;
        case 'move':
          soundManager.playMove();
          break;
        case 'capture':
          soundManager.playCapture();
          break;
        case 'check':
          soundManager.playCheck();
          break;
        case 'checkmate':
          soundManager.playCheckmate();
          break;
        case 'promotion':
          soundManager.playPromotion();
          break;
        case 'draw':
          soundManager.playDraw();
          break;
        case 'gamestart':
          soundManager.playGameStart();
          break;
      }
    },
    []
  );

  // Public API: make a move (for AI/server)
  const makeMove = useCallback(
    (move: BoardMove): boolean => {
      return executeMoveInternal(move);
    },
    [executeMoveInternal]
  );

  // Public API: reset game
  const resetGame = useCallback(() => {
    chessEngine.resetGame();
    setLastMove(undefined);
    forceUpdate();
    notifyPositionChange();
  }, [chessEngine, forceUpdate, notifyPositionChange]);

  // Public API: set position
  const setPosition = useCallback(
    (fen: string): boolean => {
      const success = chessEngine.setPosition(fen);
      if (success) {
        setLastMove(undefined);
        forceUpdate();
        notifyPositionChange();
      }
      return success;
    },
    [chessEngine, forceUpdate, notifyPositionChange]
  );

  // Public API: get game state
  const getGameState = useCallback(
    (): GameState => chessEngine.getGameState(),
    [chessEngine]
  );

  const boardProps = useMemo(
    () => ({
      position: gameState.fen,
      turnColor,
      lastMove,
      check: checkSquare,
      validMoves,
      gameEndOverlay,
      whiteMovable,
      blackMovable,
      onMove: handleBoardMove,
      onPlaySound: handlePlaySound,
    }),
    [
      gameState.fen,
      turnColor,
      lastMove,
      checkSquare,
      validMoves,
      gameEndOverlay,
      whiteMovable,
      blackMovable,
      handleBoardMove,
      handlePlaySound,
    ]
  );

  return {
    boardProps,
    makeMove,
    resetGame,
    setPosition,
    getGameState,
    engine: chessEngine,
  };
}
