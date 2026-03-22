import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  PieceType,
  GameState,
  GameResult,
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
  GameHistoryEntry,
  colorToPlayerColor,
  moveToBoardMove,
  pieceTypeToPromotionPiece,
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
  /** Full move history with piece/capture/check info and algebraic notation */
  history: GameHistoryEntry[];
  /** Roll back to a specific ply (0 = initial position). No arg = undo last move. */
  undo: (toPly?: number) => boolean;
  /** End the game manually (resignation, draw agreement, timeout/flag) */
  endGame: (result: GameResult) => void;
  /** Direct access to the chess engine API */
  engine: ChessEngineAPI;
}

export function useChessGame(options: UseChessGameOptions = {}): UseChessGameReturn {
  const { initialFen, whiteMovable = true, blackMovable = true, onPositionChange, onError } = options;

  const chessEngine = useJSChessEngine();

  // Track last move for highlighting and animation
  const [lastMove, setLastMove] = useState<BoardMove | undefined>(undefined);
  // Manual game result (resignation, draw agreement, flag)
  const [manualGameResult, setManualGameResult] = useState<GameResult | null>(null);
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

  const isGameOver = gameState.isGameOver || !!manualGameResult;
  const effectiveResult = manualGameResult || gameState.result;

  // Only provide valid moves when it's a human-movable turn and game isn't over
  const validMoves = useMemo((): ValidMovesMap => {
    if (isGameOver || !isHumanTurn) return new Map();
    return buildValidMovesMap(gameState);
  }, [gameState, isHumanTurn, isGameOver]);

  const gameEndOverlay = useMemo((): GameEndOverlay | undefined => {
    if (!isGameOver || !effectiveResult) return undefined;
    if (effectiveResult.reason === 'checkmate' && effectiveResult.winner !== undefined) {
      return {
        type: 'checkmate',
        winner: colorToPlayerColor(effectiveResult.winner),
      };
    } else if (effectiveResult.reason === 'stalemate') {
      return { type: 'stalemate' };
    } else if (effectiveResult.reason === 'resignation' && effectiveResult.winner !== undefined) {
      return { type: 'checkmate', winner: colorToPlayerColor(effectiveResult.winner) };
    } else {
      return { type: 'draw' };
    }
  }, [isGameOver, effectiveResult]);

  // Determine what sound(s) to play for a move result
  const playSoundForMove = useCallback(
    (moveResult: { type?: string; capturedPiece?: unknown }) => {
      const state = chessEngine.getGameState();

      // Play the move sound first
      if (moveResult.type === 'promotion') {
        soundManager.playPromotion();
      } else if (moveResult.capturedPiece) {
        soundManager.playCapture();
      } else {
        soundManager.playMove();
      }

      // Layer the game-end or check sound on top
      if (state.isGameOver && state.result) {
        if (state.result.reason === 'checkmate') {
          soundManager.playCheckmate();
        } else {
          soundManager.playDraw();
        }
      } else if (state.isCheck) {
        soundManager.playCheck();
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
    setManualGameResult(null);
    forceUpdate();
    notifyPositionChange();
  }, [chessEngine, forceUpdate, notifyPositionChange]);

  // Public API: set position
  const setPosition = useCallback(
    (fen: string): boolean => {
      const success = chessEngine.setPosition(fen);
      if (success) {
        setLastMove(undefined);
        setManualGameResult(null);
        forceUpdate();
        notifyPositionChange();
      }
      return success;
    },
    [chessEngine, forceUpdate, notifyPositionChange]
  );

  // Public API: end the game manually (resignation, draw agreement, flag)
  const endGame = useCallback(
    (result: GameResult) => {
      setManualGameResult(result);
      soundManager.ensureReady();
      if (result.reason === 'resignation' || result.reason === 'checkmate') {
        soundManager.playCheckmate();
      } else {
        soundManager.playDraw();
      }
      forceUpdate();
      notifyPositionChange();
    },
    [forceUpdate, notifyPositionChange]
  );

  // Public API: get game state
  const getGameState = useCallback(
    (): GameState => chessEngine.getGameState(),
    [chessEngine]
  );

  // Public API: history
  const history = useMemo((): GameHistoryEntry[] => {
    return chessEngine.getHistory().map(entry => ({
      move: moveToBoardMove(entry.move),
      piece: { ...entry.piece },
      moveType: entry.moveType,
      capturedPiece: entry.capturedPiece ? { ...entry.capturedPiece } : undefined,
      promotionPiece: entry.promotionPiece !== undefined
        ? pieceTypeToPromotionPiece(entry.promotionPiece)
        : undefined,
      fen: entry.fen,
      isCheck: entry.isCheck,
      isCheckmate: entry.isCheckmate,
      algebraic: entry.algebraic,
    }));
  }, [chessEngine, gameState]); // gameState dep ensures re-computation after moves

  // Public API: undo to a specific ply
  const undo = useCallback(
    (toPly?: number): boolean => {
      const fenHist = chessEngine.getFenHistory();
      const targetPly = toPly ?? (fenHist.length - 2); // default: undo last move
      if (targetPly < 0 || targetPly >= fenHist.length) return false;

      const targetFen = fenHist[targetPly];
      const success = chessEngine.undoToFen(targetFen, targetPly);
      if (success) {
        setManualGameResult(null);
        if (targetPly > 0) {
          const prevHistory = chessEngine.getHistory();
          const lastEntry = prevHistory[prevHistory.length - 1];
          setLastMove(lastEntry ? moveToBoardMove(lastEntry.move) : undefined);
        } else {
          setLastMove(undefined);
        }
        forceUpdate();
        notifyPositionChange();
      }
      return success;
    },
    [chessEngine, forceUpdate, notifyPositionChange]
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
    history,
    undo,
    endGame,
    engine: chessEngine,
  };
}
