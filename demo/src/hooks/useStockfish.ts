import { useState, useCallback, useEffect, useRef } from 'react';
import type { BoardMove, PromotionPiece } from 'react-shahmat';

export interface StockfishAPI {
  getBestMove: (fen: string, skillLevel?: number) => Promise<BoardMove | null>;
  isReady: boolean;
  isThinking: boolean;
}

export const useStockfish = (): StockfishAPI => {
  const [isReady, setIsReady] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const pendingMoveRef = useRef<((move: BoardMove | null) => void) | null>(null);
  const currentRequestIdRef = useRef<number>(0);

  useEffect(() => {
    let mounted = true;

    const initStockfish = async () => {
      try {
        const worker = new Worker('/stockfish.js');
        workerRef.current = worker;

        worker.onmessage = e => {
          const message = e.data;

          if (message === 'uciok') {
            setIsReady(true);
          } else if (message.startsWith('bestmove')) {
            setIsThinking(false);

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
                } catch {
                  pendingMoveRef.current(null);
                }
              } else {
                pendingMoveRef.current(null);
              }
              pendingMoveRef.current = null;
            }
          }
        };

        worker.onerror = () => {
          if (mounted) {
            setIsReady(false);
          }
        };

        worker.postMessage('uci');
      } catch {
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
    async (fen: string, skillLevel: number = 5): Promise<BoardMove | null> => {
      if (!workerRef.current || !isReady || isThinking) {
        return null;
      }

      if (pendingMoveRef.current) {
        workerRef.current.postMessage('stop');
        pendingMoveRef.current(null);
        pendingMoveRef.current = null;
      }

      const requestId = ++currentRequestIdRef.current;

      return new Promise(resolve => {
        setIsThinking(true);
        pendingMoveRef.current = (move: BoardMove | null) => {
          if (requestId === currentRequestIdRef.current) {
            resolve(move);
          }
        };

        workerRef.current!.postMessage(
          `setoption name Skill Level value ${skillLevel}`
        );
        workerRef.current!.postMessage(`position fen ${fen}`);

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

        setTimeout(() => {
          if (
            requestId === currentRequestIdRef.current &&
            pendingMoveRef.current
          ) {
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

function parseUCIMove(uciMove: string, promotion?: string): BoardMove {
  if (uciMove.length < 4) {
    throw new Error(`Invalid UCI move: ${uciMove}`);
  }

  const from = uciMove.substring(0, 2); // e.g. "e2"
  const to = uciMove.substring(2, 4); // e.g. "e4"

  const move: BoardMove = { from, to };

  if (promotion) {
    const promotionMap: Record<string, PromotionPiece> = {
      q: 'queen',
      r: 'rook',
      b: 'bishop',
      n: 'knight',
    };
    move.promotion = promotionMap[promotion];
  }

  return move;
}
