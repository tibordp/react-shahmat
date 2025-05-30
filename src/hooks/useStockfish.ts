import { useState, useCallback, useEffect, useRef } from 'react';
import { Move } from '../engine/jsChessEngine';

export interface StockfishAPI {
  getBestMove: (fen: string, skillLevel?: number) => Promise<Move | null>;
  isReady: boolean;
  isThinking: boolean;
}

export const useStockfish = (): StockfishAPI => {
  const [isReady, setIsReady] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const pendingMoveRef = useRef<((move: Move | null) => void) | null>(null);
  const currentRequestIdRef = useRef<number>(0);

  useEffect(() => {
    let mounted = true;

    const initStockfish = async () => {
      try {
        console.log('Initializing Stockfish Worker...');

        // Create Web Worker with Stockfish
        const worker = new Worker('/stockfish.js');
        workerRef.current = worker;

        // Set up message listener
        worker.onmessage = e => {
          const message = e.data;
          console.log('Stockfish:', message);

          if (message === 'uciok') {
            setIsReady(true);
            console.log('Stockfish UCI ready');
          } else if (message.startsWith('bestmove')) {
            setIsThinking(false);

            // Only process the move if we still have a pending request
            if (pendingMoveRef.current) {
              const moveMatch = message.match(
                /bestmove ([a-h][1-8][a-h][1-8])([qrbn])?/
              );

              if (moveMatch) {
                const moveStr = moveMatch[1];
                const promotion = moveMatch[2];

                try {
                  const move = parseUCIMove(moveStr, promotion);
                  pendingMoveRef.current(move);
                } catch (error) {
                  console.error('Failed to parse move:', moveStr, error);
                  pendingMoveRef.current(null);
                }
              } else {
                pendingMoveRef.current(null);
              }
              pendingMoveRef.current = null;
            }
          }
        };

        worker.onerror = error => {
          console.error('Stockfish Worker error:', error);
          if (mounted) {
            setIsReady(false);
          }
        };

        // Initialize UCI protocol
        worker.postMessage('uci');
      } catch (error) {
        console.error('Failed to initialize Stockfish:', error);
        if (mounted) {
          setIsReady(false);
        }
      }
    };

    initStockfish();

    return () => {
      mounted = false;
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const getBestMove = useCallback(
    async (fen: string, skillLevel: number = 5): Promise<Move | null> => {
      if (!workerRef.current || !isReady || isThinking) {
        return null;
      }

      // Cancel any previous request
      if (pendingMoveRef.current) {
        workerRef.current.postMessage('stop');
        pendingMoveRef.current(null);
        pendingMoveRef.current = null;
      }

      const requestId = ++currentRequestIdRef.current;

      return new Promise(resolve => {
        setIsThinking(true);
        pendingMoveRef.current = (move: Move | null) => {
          // Only resolve if this is still the current request
          if (requestId === currentRequestIdRef.current) {
            resolve(move);
          }
        };

        // Set skill level (0-20)
        workerRef.current!.postMessage(
          `setoption name Skill Level value ${skillLevel}`
        );

        // Set position
        workerRef.current!.postMessage(`position fen ${fen}`);

        // Adjust search parameters based on skill level for better differentiation
        let searchCommand;
        if (skillLevel <= 1) {
          searchCommand = 'go depth 1';
        } else if (skillLevel <= 3) {
          searchCommand = 'go depth 2';
        } else if (skillLevel <= 5) {
          searchCommand = 'go depth 3';
        } else if (skillLevel <= 8) {
          searchCommand = 'go movetime 500';
        } else if (skillLevel <= 15) {
          searchCommand = 'go movetime 1000';
        } else {
          searchCommand = 'go movetime 2000';
        }

        workerRef.current!.postMessage(searchCommand);

        // Timeout after 8 seconds - send stop command to properly cancel
        setTimeout(() => {
          if (
            requestId === currentRequestIdRef.current &&
            pendingMoveRef.current
          ) {
            console.log('Stockfish timeout - sending stop command');
            workerRef.current?.postMessage('stop');
            setIsThinking(false);
            pendingMoveRef.current(null);
            pendingMoveRef.current = null;
            resolve(null);
          }
        }, 8000);
      });
    },
    [isReady, isThinking]
  );

  return {
    getBestMove,
    isReady,
    isThinking,
  };
};

// Helper function to convert UCI notation to our Move format
function parseUCIMove(uciMove: string, promotion?: string): Move {
  if (uciMove.length < 4) {
    throw new Error(`Invalid UCI move: ${uciMove}`);
  }

  const fromFile = uciMove.charCodeAt(0) - 97; // 'a' = 0
  const fromRank = parseInt(uciMove[1]) - 1; // '1' = 0
  const toFile = uciMove.charCodeAt(2) - 97;
  const toRank = parseInt(uciMove[3]) - 1;

  const move: Move = {
    fromFile,
    fromRank,
    toFile,
    toRank,
  };

  // Handle promotion
  if (promotion) {
    const promotionMap: { [key: string]: number } = {
      q: 4, // Queen
      r: 1, // Rook
      b: 3, // Bishop
      n: 2, // Knight
    };
    move.promotionPiece = promotionMap[promotion];
  }

  return move;
}
