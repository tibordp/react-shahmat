import { useState, useCallback, useEffect, useRef } from 'react';
import type { BoardMove, PromotionPiece } from 'react-shahmat';

export type AiMode =
  | 'random'
  | 'worstfish'
  | 'easy'
  | 'medium'
  | 'hard'
  | 'maximum';

export interface StockfishAPI {
  /** Search for a move. Mode determines strategy. */
  getMove: (fen: string, mode: AiMode) => Promise<BoardMove | null>;
  isReady: boolean;
  isThinking: boolean;
}

interface PendingRequest {
  resolve: (move: BoardMove | null) => void;
  requestId: number;
  timeoutId: ReturnType<typeof setTimeout>;
  worstMove?: BoardMove;
  isWorstfish: boolean;
}

export const useStockfish = (): StockfishAPI => {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<PendingRequest | null>(null);
  const nextRequestId = useRef(0);
  const readyRef = useRef(false);

  const [isReady, setIsReady] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  const cancelPending = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    clearTimeout(pending.timeoutId);
    pending.resolve(null);
    pendingRef.current = null;
  }, []);

  useEffect(() => {
    let mounted = true;

    const worker = new Worker(import.meta.env.BASE_URL + 'stockfish.js');
    workerRef.current = worker;

    worker.onmessage = e => {
      const message = e.data as string;

      if (message === 'uciok') {
        readyRef.current = true;
        if (mounted) setIsReady(true);
      } else if (message.startsWith('info') && message.includes(' pv ')) {
        // Track MultiPV info lines for worstfish mode
        const pending = pendingRef.current;
        if (pending?.isWorstfish) {
          const pvMatch = message.match(/ pv ([a-h][1-8][a-h][1-8])([qrbn])?/);
          if (pvMatch) {
            // Each successive multipv line is worse — keep overwriting to get the last (worst)
            try {
              pending.worstMove = parseUCIMove(pvMatch[1], pvMatch[2]);
            } catch {
              /* ignore */
            }
          }
        }
      } else if (message.startsWith('bestmove')) {
        const pending = pendingRef.current;
        if (pending) {
          clearTimeout(pending.timeoutId);

          if (pending.isWorstfish && pending.worstMove) {
            pending.resolve(pending.worstMove);
          } else {
            const match = message.match(
              /bestmove ([a-h][1-8][a-h][1-8])([qrbn])?/
            );
            if (match) {
              try {
                pending.resolve(parseUCIMove(match[1], match[2]));
              } catch {
                pending.resolve(null);
              }
            } else {
              pending.resolve(null);
            }
          }
          pendingRef.current = null;
        }
        if (mounted) setIsThinking(false);
      }
    };

    worker.onerror = () => {
      cancelPending();
      readyRef.current = false;
      if (mounted) {
        setIsReady(false);
        setIsThinking(false);
      }
    };

    worker.postMessage('uci');

    return () => {
      mounted = false;
      cancelPending();
      worker.terminate();
      workerRef.current = null;
      readyRef.current = false;
    };
  }, [cancelPending]);

  const getMove = useCallback(
    (fen: string, mode: AiMode): Promise<BoardMove | null> => {
      const worker = workerRef.current;
      if (!worker || !readyRef.current) return Promise.resolve(null);

      // Cancel any in-flight search
      if (pendingRef.current) {
        worker.postMessage('stop');
        cancelPending();
      }

      const requestId = ++nextRequestId.current;
      const isWorstfish = mode === 'worstfish';
      setIsThinking(true);

      return new Promise<BoardMove | null>(resolve => {
        const timeoutId = setTimeout(() => {
          if (pendingRef.current?.requestId === requestId) {
            worker.postMessage('stop');
            const forceId = setTimeout(() => {
              if (pendingRef.current?.requestId === requestId) {
                cancelPending();
                setIsThinking(false);
              }
            }, 1000);
            if (pendingRef.current) pendingRef.current.timeoutId = forceId;
          }
        }, 8000);

        pendingRef.current = { resolve, requestId, timeoutId, isWorstfish };

        // Configure engine based on mode
        if (isWorstfish) {
          worker.postMessage('setoption name Skill Level value 20');
          worker.postMessage('setoption name MultiPV value 200');
        } else {
          const skillLevel =
            mode === 'easy'
              ? 1
              : mode === 'medium'
              ? 8
              : mode === 'hard'
              ? 15
              : 20;
          worker.postMessage(`setoption name Skill Level value ${skillLevel}`);
          worker.postMessage('setoption name MultiPV value 1');
        }

        worker.postMessage(`position fen ${fen}`);
        worker.postMessage('isready');

        const onReady = (e: MessageEvent) => {
          if (e.data !== 'readyok') return;
          if (pendingRef.current?.requestId !== requestId) {
            worker.removeEventListener('message', onReady);
            return;
          }
          worker.removeEventListener('message', onReady);

          const goCommand = isWorstfish
            ? 'go depth 5'
            : mode === 'easy'
            ? 'go depth 1'
            : mode === 'medium'
            ? 'go depth 5'
            : mode === 'hard'
            ? 'go movetime 1000'
            : 'go movetime 2000';

          worker.postMessage(goCommand);
        };
        worker.addEventListener('message', onReady);
      });
    },
    [cancelPending]
  );

  return { getMove, isReady, isThinking };
};

function parseUCIMove(uciMove: string, promotion?: string): BoardMove {
  const from = uciMove.substring(0, 2);
  const to = uciMove.substring(2, 4);
  const move: BoardMove = { from, to };
  if (promotion) {
    const map: Record<string, PromotionPiece> = {
      q: 'queen',
      r: 'rook',
      b: 'bishop',
      n: 'knight',
    };
    move.promotion = map[promotion];
  }
  return move;
}
