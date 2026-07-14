import { describe, it, expect } from 'vitest';
import { ChessRules } from '../src/engine/chessRules';

function perftInner(engine: ChessRules, depth: number): number {
  if (depth === 0) return 1;
  const state = engine.getGameState();
  if (depth === 1) return state.validMoves.length;
  let nodes = 0;
  for (const m of state.validMoves) {
    const child = new ChessRules();
    child.setPosition(state.fen);
    child.makeMove(
      { file: m.fromFile, rank: m.fromRank },
      { file: m.toFile, rank: m.toRank },
      m.promotionPiece
    );
    nodes += perftInner(child, depth - 1);
  }
  return nodes;
}

describe('deep perft', () => {
  it('initial position depth 4 = 197281', { timeout: 300_000 }, () => {
    const start = performance.now();
    expect(perftInner(new ChessRules(), 4)).toBe(197281);
    console.log(`perft(4) took ${Math.round(performance.now() - start)}ms`);
  });
});
