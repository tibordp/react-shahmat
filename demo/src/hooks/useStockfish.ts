import { useState, useCallback, useEffect, useRef } from 'react';
import type { BoardMove, PromotionPiece } from 'react-shahmat';

export type AiMode =
  'random' | 'worstfish' | 'drawfish' | 'easy' | 'medium' | 'hard' | 'maximum';

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
  /** Keyed by UCI move; present only in drawfish mode. */
  drawCandidates?: Map<string, { move: BoardMove; distance: number }>;
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
        // Track MultiPV info lines for worstfish/drawfish modes
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
        } else if (
          pending?.drawCandidates &&
          !/\b(lowerbound|upperbound)\b/.test(message)
        ) {
          const pvMatch = message.match(/ pv ([a-h][1-8][a-h][1-8])([qrbn])?/);
          const scoreMatch = message.match(/ score (cp|mate) (-?\d+)/);
          if (pvMatch && scoreMatch) {
            const value = parseInt(scoreMatch[2], 10);
            // Mate lines are as far from equality as it gets; among them,
            // a longer mate counts as (marginally) closer to a draw.
            const distance =
              scoreMatch[1] === 'cp'
                ? Math.abs(value)
                : 1_000_000 - Math.abs(value);
            try {
              // Deeper iterations overwrite shallower scores for the same move
              pending.drawCandidates.set(pvMatch[1] + (pvMatch[2] ?? ''), {
                move: parseUCIMove(pvMatch[1], pvMatch[2]),
                distance,
              });
            } catch {
              /* ignore */
            }
          }
        }
      } else if (message.startsWith('bestmove')) {
        const pending = pendingRef.current;
        if (pending) {
          clearTimeout(pending.timeoutId);

          const drawPick = pending.drawCandidates
            ? [...pending.drawCandidates.values()].reduce(
                (best, c) => (!best || c.distance < best.distance ? c : best),
                null as { move: BoardMove; distance: number } | null
              )
            : null;

          if (pending.isWorstfish && pending.worstMove) {
            pending.resolve(pending.worstMove);
          } else if (drawPick) {
            pending.resolve(drawPick.move);
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
      const isDrawfish = mode === 'drawfish';
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

        pendingRef.current = {
          resolve,
          requestId,
          timeoutId,
          isWorstfish,
          drawCandidates: isDrawfish ? new Map() : undefined,
        };

        // Configure engine based on mode
        if (isWorstfish || isDrawfish) {
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

          const goCommand =
            isWorstfish || isDrawfish
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
