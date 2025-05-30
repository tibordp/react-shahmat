import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { DndProvider, useDragLayer } from 'react-dnd';
import { TouchBackend } from 'react-dnd-touch-backend';
import { Square } from './Square';
import { ArrowOverlay } from './ArrowOverlay';
import { PromotionDialog } from './PromotionDialog';
import { PieceAnimations } from './PieceAnimations';
import { useJSChessEngine } from '../hooks/useJSChessEngine';
import { useChessGame } from '../hooks/useChessGame';
import { usePieceAnimations } from '../hooks/usePieceAnimations';
import { useBoardDragDrop } from '../hooks/useBoardDragDrop';
import { useBoardClicks } from '../hooks/useBoardClicks';
import { useBoardUIState } from '../hooks/useBoardUIState';
import {
  Piece,
  Position,
  PieceType,
  Color,
  ChessBoardCallbacks,
  ChessBoardRef,
  GameState,
  Move,
} from '../engine/jsChessEngine';
import { soundManager } from '../utils/soundManager';
import { getPieceIcon, whiteKing } from '../utils/pieceIcons';
import './ChessBoard.css';

interface CustomDragLayerProps {
  squareSize: number;
}

const CustomDragLayer: React.FC<CustomDragLayerProps> = ({ squareSize }) => {
  const { isDragging, item, currentOffset } = useDragLayer(monitor => ({
    item: monitor.getItem(),
    currentOffset: monitor.getClientOffset(),
    isDragging: monitor.isDragging(),
  }));

  if (!isDragging || !currentOffset) {
    return null;
  }

  const { x, y } = currentOffset;
  const piece = item?.piece;

  if (!piece) {
    return null;
  }

  const pieceIcon = getPieceIcon(piece);

  return (
    <div className='custom-drag-layer'>
      <div
        className='drag-preview-piece'
        style={{
          left: x - squareSize * 0.5,
          top: y - squareSize * 0.5,
          position: 'absolute',
          width: squareSize,
          height: squareSize,
        }}
      >
        <img
          src={pieceIcon}
          alt='chess piece'
          className='drag-preview-piece-img'
        />
      </div>
    </div>
  );
};

interface GameEndBadgeProps {
  kingPosition: Position;
  squareSize: number;
  flipped?: boolean;
  badgeType: 'winner' | 'loser' | 'draw';
}

const GameEndBadge: React.FC<GameEndBadgeProps> = ({
  kingPosition,
  squareSize,
  flipped,
  badgeType,
}) => {
  // Calculate the king's visual position
  const effectivePosition = flipped
    ? { file: 7 - kingPosition.file, rank: 7 - kingPosition.rank }
    : kingPosition;

  const kingX = effectivePosition.file * squareSize;
  const kingY = (7 - effectivePosition.rank) * squareSize;

  // Badge size (about 40% of square size for better visibility)
  const badgeSize = squareSize * 0.5;

  // Default position: top-right corner of king's square
  let badgeX = kingX + squareSize - badgeSize / 2;
  let badgeY = kingY - badgeSize / 2;

  // Boundary detection - only shift inward just enough to stay within board
  const boardSize = squareSize * 8;

  // Check right boundary - shift left just enough
  if (badgeX + badgeSize > boardSize) {
    badgeX = boardSize - badgeSize;
  }

  // Check top boundary - shift down just enough
  if (badgeY < 0) {
    badgeY = 0;
  }

  const getBadgeColor = () => {
    switch (badgeType) {
      case 'winner':
        return '#4CAF50';
      case 'loser':
        return '#f44336';
      case 'draw':
        return '#757575';
    }
  };

  const renderBadgeContent = () => {
    if (badgeType === 'draw') {
      return (
        <span
          style={{
            color: 'white',
            fontSize: badgeSize * 0.6,
            fontWeight: 'bold',
          }}
        >
          ½
        </span>
      );
    } else {
      // Use white king SVG for both winner and loser
      return (
        <img
          src={whiteKing}
          alt='king'
          style={{
            width: badgeSize * 0.7,
            height: badgeSize * 0.7,
            filter: 'brightness(0) invert(1)', // Make it white
            transform: badgeType === 'loser' ? 'rotate(90deg)' : 'none',
          }}
        />
      );
    }
  };

  return (
    <div
      className='game-end-badge'
      style={{
        position: 'absolute',
        left: badgeX,
        top: badgeY,
        width: badgeSize,
        height: badgeSize,
        backgroundColor: getBadgeColor(),
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
        zIndex: 200,
      }}
    >
      {renderBadgeContent()}
    </div>
  );
};

interface ChessBoardProps {
  size?: number; // Board size in pixels (default: fills container)
  className?: string;
  flipped?: boolean; // Whether to flip the board for black perspective
  whiteIsHuman?: boolean; // Whether white player is human (default: true)
  blackIsHuman?: boolean; // Whether black player is human (default: true)
  enablePreMoves?: boolean; // Whether to enable pre-move functionality (default: true)
  autoPromotionPiece?: PieceType; // Auto-promotion piece (Queen, Rook, Bishop, Knight)
  showCoordinates?: boolean; // Whether to show rank and file labels (default: true)
  animationDuration?: number; // Animation duration in milliseconds (default: 300)
  enableAnimations?: boolean; // Whether to enable move animations (default: true)
  enableSounds?: boolean; // Whether to enable sound effects (default: true)
  enableArrows?: boolean; // Whether to enable right-click arrows (default: true)
  enableHighlights?: boolean; // Whether to enable right-click square highlights (default: true)
  onPositionChange?: (gameState: GameState, lastMove?: Move) => void; // Called when position changes
  onError?: ChessBoardCallbacks['onError']; // Called on errors
}

export const ChessBoard = forwardRef<ChessBoardRef, ChessBoardProps>(
  (
    {
      size,
      className,
      flipped,
      whiteIsHuman = true,
      blackIsHuman = true,
      enablePreMoves = true,
      autoPromotionPiece,
      showCoordinates = true,
      animationDuration = 300,
      enableAnimations = true,
      enableSounds = true,
      enableArrows = true,
      enableHighlights = true,
      onPositionChange,
      onError,
    },
    ref
  ) => {
    const chessEngine = useJSChessEngine();
    const [boardSize, setBoardSize] = useState(size || 512);
    const boardRef = useRef<HTMLDivElement>(null);

    const squareSize = boardSize / 8;

    // Helper function to play appropriate sound based on move result
    const playMoveSound = useCallback(
      (result: any, delay: number = 0) => {
        if (!enableSounds) return;

        const gameState = chessEngine.getGameState();

        if (gameState.isCheck) {
          // Check has highest priority
          if (delay > 0) {
            setTimeout(() => soundManager.playCheckSound(), delay);
          } else {
            soundManager.playCheckSound();
          }
        } else if (result?.capturedPiece) {
          // Capture sound has second priority
          if (delay > 0) {
            setTimeout(() => soundManager.playCaptureSound(), delay);
          } else {
            soundManager.playCaptureSound();
          }
        } else if (result?.type === 'promotion') {
          // Promotion sound has third priority
          if (delay > 0) {
            setTimeout(() => soundManager.playPromotionSound(), delay);
          } else {
            soundManager.playPromotionSound();
          }
        } else {
          // Regular move sound is default
          if (delay > 0) {
            setTimeout(() => soundManager.playMoveSound(), delay);
          } else {
            soundManager.playMoveSound();
          }
        }
      },
      [enableSounds, chessEngine]
    );

    // Initialize clean chess game hook
    const game = useChessGame({
      chessEngine,
      whiteIsHuman,
      blackIsHuman,
      onPositionChange,
      onError,
    });

    // Initialize animation system
    const animations = usePieceAnimations({
      enableAnimations,
      animationDuration,
    });

    // Handle responsive sizing when no size prop is provided
    useEffect(() => {
      if (size) return; // Don't resize if explicit size is provided

      const handleResize = () => {
        if (boardRef.current && boardRef.current.parentElement) {
          const parentWidth = boardRef.current.parentElement.clientWidth;
          const parentHeight = boardRef.current.parentElement.clientHeight;
          const availableSize = Math.min(parentWidth, parentHeight) - 20; // Leave minimal padding
          setBoardSize(Math.max(200, availableSize)); // Lower minimum for better flexibility
        }
      };

      // Use ResizeObserver for better responsiveness
      const resizeObserver = new ResizeObserver(() => {
        handleResize();
      });

      handleResize();
      if (boardRef.current && boardRef.current.parentElement) {
        resizeObserver.observe(boardRef.current.parentElement);
      }

      return () => {
        resizeObserver.disconnect();
      };
    }, [size]);

    // UI State management
    const uiState = useBoardUIState();

    // Find king positions on the current board
    const findKingPositions = useCallback(() => {
      const boardState = chessEngine.getBoardState();
      const kings: { white?: Position; black?: Position } = {};

      for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
          const piece = boardState[7 - rank]?.[file];
          if (piece?.type === PieceType.King) {
            if (piece.color === Color.White) {
              kings.white = { file, rank };
            } else {
              kings.black = { file, rank };
            }
          }
        }
      }

      return kings;
    }, [chessEngine]);

    // Shared function to handle invalid move feedback when king is in check
    const handleInvalidMoveInCheck = useCallback(
      (fromFile: number, fromRank: number) => {
        // Only show feedback if the move was attempted with the current player's piece
        const boardState = chessEngine.getBoardState();
        const piece = boardState[7 - fromRank]?.[fromFile];

        if (!piece || piece.color !== chessEngine.getCurrentPlayer()) {
          return; // Don't show feedback for opponent pieces or empty squares
        }

        const gameState = chessEngine.getGameState();
        if (gameState.isCheck) {
          // Find the king's position and highlight it in red
          const kingPositions = findKingPositions();
          const currentPlayerKing =
            chessEngine.getCurrentPlayer() === Color.White
              ? kingPositions.white
              : kingPositions.black;

          if (currentPlayerKing) {
            // Highlight the king in red temporarily
            uiState.setKingInCheckHighlight(currentPlayerKing);
            setTimeout(() => uiState.setKingInCheckHighlight(null), 1000);

            // Play error sound if enabled
            if (enableSounds) {
              soundManager.playErrorSound();
            }
          }
        }
      },
      [chessEngine, findKingPositions, enableSounds, uiState]
    );

    // Pre-move squares (both origin and destination to show in red)
    const preMoveSquares = game.preMoves.flatMap(move => [
      { file: move.fromFile, rank: move.fromRank }, // origin square
      { file: move.toFile, rank: move.toRank }, // destination square
    ]);

    // Calculate visual board state with pre-moves applied
    const getVisualBoardState = useCallback(() => {
      const baseBoardState = chessEngine.getBoardState();

      if (game.preMoves.length === 0) {
        return baseBoardState;
      }

      // Create a copy of the board state
      const visualBoard = baseBoardState.map(row => [...row]);

      // Apply pre-moves visually
      for (const preMove of game.preMoves) {
        const piece = visualBoard[7 - preMove.fromRank]?.[preMove.fromFile];
        if (piece) {
          // Remove piece from source
          visualBoard[7 - preMove.fromRank][preMove.fromFile] = null;

          // Place piece at destination - use promoted piece if specified
          if (preMove.promotionPiece !== undefined) {
            // Show promoted piece instead of pawn
            visualBoard[7 - preMove.toRank][preMove.toFile] = {
              type: preMove.promotionPiece,
              color: piece.color,
            };
          } else {
            // Regular piece
            visualBoard[7 - preMove.toRank][preMove.toFile] = piece;
          }
        }
      }

      return visualBoard;
    }, [chessEngine, game.preMoves]);

    // Helper function to detect if a move is a pawn promotion
    const isPawnPromotion = useCallback(
      (piece: Piece, fromRank: number, toRank: number): boolean => {
        if (piece.type !== PieceType.Pawn) return false;

        const promotionRank = piece.color === Color.White ? 7 : 0;
        return toRank === promotionRank;
      },
      []
    );

    // Calculate valid moves for a piece at a given position
    const getValidMovesFromVisualBoard = useCallback(
      (file: number, rank: number) => {
        const visualBoard = getVisualBoardState();
        const piece = visualBoard[7 - rank]?.[file];

        if (!piece) return [];

        // If we can make pre-moves (external player's turn) and pre-moves are enabled, use basic movement patterns
        if (game.canMakePreMoves && enablePreMoves) {
          return chessEngine.getPotentialMoves(
            { file, rank },
            { forPreMove: true, boardState: visualBoard }
          );
        }

        // Otherwise use normal engine calculation which includes all game rules
        return chessEngine.getValidMoves({ file, rank });
      },
      [chessEngine, game.canMakePreMoves, getVisualBoardState, enablePreMoves]
    );

    // Shared function to handle pre-move logic
    const handlePreMoveAttempt = useCallback(
      (
        fromFile: number,
        fromRank: number,
        toFile: number,
        toRank: number
      ): boolean => {
        // Allow pre-moves when it's external player's turn OR during any animation
        if (
          !(game.canMakePreMoves || animations.isAnimating) ||
          !enablePreMoves ||
          !chessEngine
        )
          return false;

        const visualBoardState = getVisualBoardState();
        const piece = visualBoardState[7 - fromRank]?.[fromFile];

        if (!piece) return false;

        // Only allow pre-moves with human player's pieces
        const isHumanPiece =
          (whiteIsHuman && piece.color === Color.White) ||
          (blackIsHuman && piece.color === Color.Black);
        if (!isHumanPiece) return false;

        // Check if this is a valid pre-move destination
        const validMoves = getValidMovesFromVisualBoard(fromFile, fromRank);
        const isValidDestination = validMoves.some(
          move => move.file === toFile && move.rank === toRank
        );

        if (!isValidDestination) return false;

        // Check if this is a pawn promotion
        if (isPawnPromotion(piece, fromRank, toRank)) {
          if (autoPromotionPiece) {
            // Auto-promote without showing dialog
            const preMove = {
              fromFile,
              fromRank,
              toFile,
              toRank,
              promotionPiece: autoPromotionPiece,
            };
            game.addPreMove(preMove);

            // Play pre-move sound
            if (enableSounds) {
              soundManager.playPreMoveSound();
            }

            // Clear UI indicators since the pre-move was successfully added
            uiState.clearSelection();
          } else {
            // Show promotion dialog for pre-move
            uiState.setPromotionDialog({
              isOpen: true,
              fromFile,
              fromRank,
              toFile,
              toRank,
              color: piece.color,
              isPreMove: true,
            });
          }
        } else {
          // Regular pre-move
          const preMove = {
            fromFile,
            fromRank,
            toFile,
            toRank,
          };
          game.addPreMove(preMove);

          // Play pre-move sound
          if (enableSounds) {
            soundManager.playPreMoveSound();
          }
        }

        return true; // Indicates pre-move was handled
      },
      [
        enablePreMoves,
        chessEngine,
        getVisualBoardState,
        getValidMovesFromVisualBoard,
        isPawnPromotion,
        game,
        autoPromotionPiece,
        animations.isAnimating,
        whiteIsHuman,
        blackIsHuman,
        enableSounds,
        uiState,
      ]
    );

    // Add ref methods
    useImperativeHandle(
      ref,
      () => ({
        resetGame: () => {
          game.resetGame();
          uiState.clearAll();
          animations.interruptAnimation();
        },
        setPosition: (fen: string) => {
          const success = game.setPosition(fen);
          if (success) {
            uiState.clearAll();
            animations.interruptAnimation();
          }
          return success;
        },
        getGameState: () => chessEngine.getGameState(),
        executeExternalMove: (move: Move) => game.executeExternalMove(move),
      }),
      [game, chessEngine, animations, uiState]
    );

    // Unified move execution function that handles both human and external moves
    const executeMove = useCallback(
      (
        move: Move,
        animate: boolean = false,
        isExternalMove: boolean = false
      ) => {
        if (!chessEngine) return false;

        const from = { file: move.fromFile, rank: move.fromRank };
        const to = { file: move.toFile, rank: move.toRank };

        // Check if the move is valid and what type it would be
        const validationResult = chessEngine.isValidMove(
          from,
          to,
          move.promotionPiece
        );

        if (!validationResult.valid) {
          if (!isExternalMove) {
            handleInvalidMoveInCheck(move.fromFile, move.fromRank);
          }
          return false;
        }

        // Get piece information BEFORE making move for animation
        const boardState = chessEngine.getBoardState();
        const movingPiece = boardState[7 - move.fromRank]?.[move.fromFile];

        // Execute move immediately
        const result = game.makeMove(move);
        if (!result?.success) {
          return false;
        }

        // Play sound immediately
        playMoveSound(result);

        // Handle animation after move execution (purely visual)
        if (animate && enableAnimations && movingPiece) {
          const piecesToAnimate = [
            {
              piece: movingPiece,
              from: { file: move.fromFile, rank: move.fromRank },
              to: { file: move.toFile, rank: move.toRank },
            },
          ];

          // Add any additional moves (like castling rook) from validation result
          if (validationResult.additionalMoves) {
            for (const additionalMove of validationResult.additionalMoves) {
              piecesToAnimate.push({
                piece: additionalMove.piece,
                from: additionalMove.from,
                to: additionalMove.to,
              });
            }
          }

          animations.startAnimation(piecesToAnimate);
        }

        return true;
      },
      [
        chessEngine,
        game,
        playMoveSound,
        enableAnimations,
        animations,
        handleInvalidMoveInCheck,
      ]
    );

    const attemptMove = useCallback(
      (
        fromFile: number,
        fromRank: number,
        toFile: number,
        toRank: number,
        animate: boolean = false
      ) => {
        if (!chessEngine) return false;

        const from = { file: fromFile, rank: fromRank };
        const to = { file: toFile, rank: toRank };
        const move = { fromFile, fromRank, toFile, toRank };

        // Check if promotion is required
        const validationResult = chessEngine.isValidMove(from, to);
        if (validationResult.promotionRequired) {
          if (autoPromotionPiece) {
            // Auto-promote without showing dialog
            const moveWithPromotion = {
              fromFile,
              fromRank,
              toFile,
              toRank,
              promotionPiece: autoPromotionPiece,
            };
            const success = executeMove(moveWithPromotion, animate);
            if (success) {
              uiState.clearSelection();
            }
            return success;
          } else {
            uiState.setPromotionDialog({
              isOpen: true,
              fromFile,
              fromRank,
              toFile,
              toRank,
              color: chessEngine.getPiece(from)?.color || Color.White,
              isPreMove: false,
            });
            return true;
          }
        }

        // Use unified executeMove function
        const success = executeMove(move, animate);
        if (success) {
          uiState.clearSelection();
        }
        return success;
      },
      [chessEngine, autoPromotionPiece, executeMove, uiState]
    );

    // Handle external moves - execute them using the same logic as human moves
    useEffect(() => {
      if (game.lastExternalMove) {
        const moveData = game.lastExternalMove;
        const move = moveData.move;

        // Execute external move with animation using unified logic
        executeMove(move, enableAnimations, true);

        // Clear the external move after handling
        game.clearLastExternalMove();
      }
    }, [game.lastExternalMove, executeMove, enableAnimations, game]);

    const handlePromotion = useCallback(
      (pieceType: PieceType) => {
        if (!chessEngine) return;

        if (uiState.promotionDialog.isPreMove) {
          // Handle pre-move promotion
          const preMove = {
            fromFile: uiState.promotionDialog.fromFile,
            fromRank: uiState.promotionDialog.fromRank,
            toFile: uiState.promotionDialog.toFile,
            toRank: uiState.promotionDialog.toRank,
            promotionPiece: pieceType,
          };
          game.addPreMove(preMove);

          // Play pre-move sound
          if (enableSounds) {
            soundManager.playPreMoveSound();
          }

          uiState.clearSelection();
        } else {
          // Handle regular promotion
          const moveWithPromotion = {
            fromFile: uiState.promotionDialog.fromFile,
            fromRank: uiState.promotionDialog.fromRank,
            toFile: uiState.promotionDialog.toFile,
            toRank: uiState.promotionDialog.toRank,
            promotionPiece: pieceType,
          };
          const success = executeMove(moveWithPromotion, enableAnimations);

          if (success) {
            uiState.clearSelection();
          }
        }

        uiState.setPromotionDialog(prev => ({ ...prev, isOpen: false }));
      },
      [chessEngine, uiState, game, enableSounds, executeMove, enableAnimations]
    );

    const handlePromotionCancel = useCallback(() => {
      uiState.setPromotionDialog(prev => ({ ...prev, isOpen: false }));
    }, [uiState]);

    // Drag and drop handlers
    const dragDropHandlers = useBoardDragDrop({
      chessEngine,
      game,
      setSelectedSquare: uiState.setSelectedSquare,
      setValidMoves: uiState.setValidMoves,
      setArrows: uiState.setArrows,
      setHighlightedSquares: uiState.setHighlightedSquares,
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
    });

    // Click handlers
    const clickHandlers = useBoardClicks({
      chessEngine,
      game,
      selectedSquare: uiState.selectedSquare,
      setSelectedSquare: uiState.setSelectedSquare,
      setValidMoves: uiState.setValidMoves,
      setArrows: uiState.setArrows,
      setHighlightedSquares: uiState.setHighlightedSquares,
      arrowStart: uiState.arrowStart,
      setArrowStart: uiState.setArrowStart,
      getValidMovesFromVisualBoard,
      getVisualBoardState,
      enablePreMoves,
      enableArrows,
      enableHighlights,
      handlePreMoveAttempt,
      attemptMove,
      animations,
      enableAnimations,
    });

    const isSquareSelected = useCallback(
      (file: number, rank: number) => {
        return uiState.selectedSquare
          ? uiState.selectedSquare.file === file &&
              uiState.selectedSquare.rank === rank
          : false;
      },
      [uiState.selectedSquare]
    );

    const isValidMoveSquare = useCallback(
      (file: number, rank: number) => {
        return uiState.validMoves.some(
          move => move.file === file && move.rank === rank
        );
      },
      [uiState.validMoves]
    );

    const isCapture = useCallback(
      (file: number, rank: number) => {
        if (!chessEngine || !isValidMoveSquare(file, rank)) return false;
        const boardState = chessEngine.getBoardState();
        const targetPiece = boardState[7 - rank]?.[file];
        return !!targetPiece;
      },
      [chessEngine, isValidMoveSquare]
    );

    const isPreMoveSquare = useCallback(
      (file: number, rank: number) => {
        return preMoveSquares.some(
          square => square.file === file && square.rank === rank
        );
      },
      [preMoveSquares]
    );

    const isAnimatingFrom = useCallback(
      (file: number, rank: number) => {
        return (
          animations.animatingPieces?.pieces.some(
            p => p.from.file === file && p.from.rank === rank
          ) || false
        );
      },
      [animations.animatingPieces]
    );

    const isAnimatingTo = useCallback(
      (file: number, rank: number) => {
        // Hide pieces at animation destination squares
        return (
          animations.animatingPieces?.pieces.some(
            p => p.to.file === file && p.to.rank === rank
          ) || false
        );
      },
      [animations.animatingPieces]
    );

    const isLastMoveFrom = useCallback(
      (file: number, rank: number) => {
        const lastMove = chessEngine.getLastMove();
        return lastMove
          ? lastMove.fromFile === file && lastMove.fromRank === rank
          : false;
      },
      [chessEngine]
    );

    const isLastMoveTo = useCallback(
      (file: number, rank: number) => {
        const lastMove = chessEngine.getLastMove();
        return lastMove
          ? lastMove.toFile === file && lastMove.toRank === rank
          : false;
      },
      [chessEngine]
    );

    const isHighlighted = useCallback(
      (file: number, rank: number) => {
        return uiState.highlightedSquares.some(
          square => square.file === file && square.rank === rank
        );
      },
      [uiState.highlightedSquares]
    );

    const isKingInCheck = useCallback(
      (file: number, rank: number) => {
        return (
          !!uiState.kingInCheckHighlight &&
          uiState.kingInCheckHighlight.file === file &&
          uiState.kingInCheckHighlight.rank === rank
        );
      },
      [uiState.kingInCheckHighlight]
    );

    if (!chessEngine) {
      return <div>Loading chess engine...</div>;
    }

    let visualBoardState = getVisualBoardState();
    if (flipped) {
      visualBoardState = [...visualBoardState].reverse(); // Flip the board state for black perspective
      visualBoardState = visualBoardState.map(row => [...row].reverse()); // Reverse each row as well
    }

    return (
      <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
        <CustomDragLayer squareSize={squareSize} />
        <div className={`chess-board-container ${className || ''}`}>
          <div
            ref={boardRef}
            className='chess-board'
            style={{
              width: boardSize,
              height: boardSize,
              gridTemplateColumns: `repeat(8, ${squareSize}px)`,
              gridTemplateRows: `repeat(8, ${squareSize}px)`,
              fontSize: Math.max(10, squareSize * 0.12),
            }}
          >
            {visualBoardState.map((row, rankIndex) =>
              row.map((piece, fileIndex) => {
                const actualRank = flipped ? rankIndex : 7 - rankIndex;
                const actualFile = flipped ? 7 - fileIndex : fileIndex;

                return (
                  <Square
                    key={`${actualFile}-${actualRank}`}
                    file={actualFile}
                    rank={actualRank}
                    piece={piece}
                    flipped={flipped}
                    showCoordinates={showCoordinates}
                    isSelected={isSquareSelected(actualFile, actualRank)}
                    isValidMove={isValidMoveSquare(actualFile, actualRank)}
                    isCapture={isCapture(actualFile, actualRank)}
                    isAnimatingFrom={isAnimatingFrom(actualFile, actualRank)}
                    isAnimatingTo={isAnimatingTo(actualFile, actualRank)}
                    isLastMoveFrom={isLastMoveFrom(actualFile, actualRank)}
                    isLastMoveTo={isLastMoveTo(actualFile, actualRank)}
                    isHighlighted={isHighlighted(actualFile, actualRank)}
                    isPreMove={isPreMoveSquare(actualFile, actualRank)}
                    isKingInCheck={isKingInCheck(actualFile, actualRank)}
                    onSquareClick={clickHandlers.handleSquareClick}
                    onDrop={dragDropHandlers.handleDrop}
                    onDragStart={dragDropHandlers.handleDragStart}
                    onDragEnd={dragDropHandlers.handleDragEnd}
                    onRightMouseDown={clickHandlers.handleRightMouseDown}
                    onRightMouseUp={clickHandlers.handleRightMouseUp}
                  />
                );
              })
            )}

            {/* Arrow overlay */}
            <ArrowOverlay
              arrows={uiState.arrows}
              boardSize={boardSize}
              squareSize={squareSize}
              flipped={flipped}
            />

            {enableAnimations && (
              <PieceAnimations
                animationState={animations.animatingPieces}
                squareSize={squareSize}
                animationDuration={animationDuration}
                flipped={flipped}
                onAnimationComplete={animations.handleAnimationComplete}
              />
            )}

            {/* Promotion dialog overlay */}
            <PromotionDialog
              isOpen={uiState.promotionDialog.isOpen}
              color={uiState.promotionDialog.color}
              promotionSquare={{
                file: uiState.promotionDialog.toFile,
                rank: uiState.promotionDialog.toRank,
              }}
              squareSize={squareSize}
              flipped={flipped}
              onSelect={handlePromotion}
              onCancel={handlePromotionCancel}
            />

            {/* Game end badges for checkmate/stalemate */}
            {(() => {
              const gameState = chessEngine.getGameState();
              if (!gameState.isGameOver || !gameState.result) return null;

              const kingPositions = findKingPositions();
              const badges = [];

              if (
                gameState.result.reason === 'checkmate' &&
                gameState.result.winner !== undefined
              ) {
                // Checkmate: winner gets crown, loser gets fallen king
                if (kingPositions.white) {
                  badges.push(
                    <GameEndBadge
                      key='white-king'
                      kingPosition={kingPositions.white}
                      squareSize={squareSize}
                      flipped={flipped}
                      badgeType={
                        gameState.result.winner === Color.White
                          ? 'winner'
                          : 'loser'
                      }
                    />
                  );
                }
                if (kingPositions.black) {
                  badges.push(
                    <GameEndBadge
                      key='black-king'
                      kingPosition={kingPositions.black}
                      squareSize={squareSize}
                      flipped={flipped}
                      badgeType={
                        gameState.result.winner === Color.Black
                          ? 'winner'
                          : 'loser'
                      }
                    />
                  );
                }
              } else if (gameState.result.reason === 'stalemate') {
                // Stalemate: both kings get draw badge
                if (kingPositions.white) {
                  badges.push(
                    <GameEndBadge
                      key='white-king'
                      kingPosition={kingPositions.white}
                      squareSize={squareSize}
                      flipped={flipped}
                      badgeType='draw'
                    />
                  );
                }
                if (kingPositions.black) {
                  badges.push(
                    <GameEndBadge
                      key='black-king'
                      kingPosition={kingPositions.black}
                      squareSize={squareSize}
                      flipped={flipped}
                      badgeType='draw'
                    />
                  );
                }
              }

              return badges;
            })()}
          </div>
        </div>
      </DndProvider>
    );
  }
);

ChessBoard.displayName = 'ChessBoard';
