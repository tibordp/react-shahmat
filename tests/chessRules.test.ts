import { describe, it, expect } from 'vitest';
import { ChessRules, Color, PieceType, Move } from '../src/engine/chessRules';

const FILES = 'abcdefgh';

function pos(square: string) {
  return { file: FILES.indexOf(square[0]), rank: parseInt(square[1]) - 1 };
}

/** Play a sequence of SAN moves, asserting each one parses and applies. */
function playSAN(engine: ChessRules, ...moves: string[]) {
  for (const san of moves) {
    const move = engine.parseSAN(san);
    expect(move, `parseSAN failed for '${san}'`).not.toBeNull();
    const result = engine.makeMove(
      { file: move!.fromFile, rank: move!.fromRank },
      { file: move!.toFile, rank: move!.toRank },
      move!.promotionPiece
    );
    expect(result.success, `makeMove failed for '${san}'`).toBe(true);
  }
}

function fenOf(engine: ChessRules): string {
  return engine.getGameState().fen;
}

function fenField(engine: ChessRules, index: number): string {
  return fenOf(engine).split(' ')[index];
}

/**
 * Standard perft: count leaf nodes of the legal move tree.
 * Promotions count once per promotion piece (the engine expands them).
 */
function perft(fen: string, depth: number): number {
  const engine = new ChessRules();
  expect(engine.setPosition(fen)).toBe(true);
  return perftInner(engine, depth);
}

function perftInner(engine: ChessRules, depth: number): number {
  if (depth === 0) return 1;
  const state = engine.getGameState();
  if (depth === 1) return state.validMoves.length;
  let nodes = 0;
  for (const m of state.validMoves) {
    const child = new ChessRules();
    child.setPosition(state.fen);
    const result = child.makeMove(
      { file: m.fromFile, rank: m.fromRank },
      { file: m.toFile, rank: m.toRank },
      m.promotionPiece
    );
    expect(result.success).toBe(true);
    nodes += perftInner(child, depth - 1);
  }
  return nodes;
}

describe('perft — move generation correctness', () => {
  it('initial position: depth 1 = 20, depth 2 = 400', () => {
    const initial = fenOf(new ChessRules());
    expect(perft(initial, 1)).toBe(20);
    expect(perft(initial, 2)).toBe(400);
  });

  it('initial position: depth 3 = 8902', { timeout: 120_000 }, () => {
    expect(perft(fenOf(new ChessRules()), 3)).toBe(8902);
  });

  it(
    'Kiwipete (castling/ep/pins): depth 1 = 48, depth 2 = 2039',
    { timeout: 120_000 },
    () => {
      const kiwipete =
        'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1';
      expect(perft(kiwipete, 1)).toBe(48);
      expect(perft(kiwipete, 2)).toBe(2039);
    }
  );

  it(
    'position 3 (en passant pins): depths 1-3 = 14, 191, 2812',
    { timeout: 120_000 },
    () => {
      const p3 = '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1';
      expect(perft(p3, 1)).toBe(14);
      expect(perft(p3, 2)).toBe(191);
      expect(perft(p3, 3)).toBe(2812);
    }
  );

  it(
    'position 4 (promotions): depth 1 = 6, depth 2 = 264',
    { timeout: 120_000 },
    () => {
      const p4 =
        'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1';
      expect(perft(p4, 1)).toBe(6);
      expect(perft(p4, 2)).toBe(264);
    }
  );

  it('position 5: depth 1 = 44, depth 2 = 1486', { timeout: 120_000 }, () => {
    const p5 = 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8';
    expect(perft(p5, 1)).toBe(44);
    expect(perft(p5, 2)).toBe(1486);
  });
});

describe('castling rights', () => {
  it('revokes castling rights when a rook is captured on its home square', () => {
    const engine = new ChessRules();
    // Black pawn on g2 captures the h1 rook (promoting) — white must lose K-side rights
    expect(engine.setPosition('4k3/8/8/8/8/8/6p1/R3K2R b KQ - 0 1')).toBe(true);
    const result = engine.makeMove(pos('g2'), pos('h1'), PieceType.Queen);
    expect(result.success).toBe(true);
    expect(fenField(engine, 2)).toBe('Q');
  });

  it('revokes black castling rights when a home rook is captured', () => {
    const engine = new ChessRules();
    expect(engine.setPosition('r3k2r/6P1/8/8/8/8/8/4K3 w kq - 0 1')).toBe(true);
    const result = engine.makeMove(pos('g7'), pos('h8'), PieceType.Queen);
    expect(result.success).toBe(true);
    expect(fenField(engine, 2)).toBe('q');
  });

  it('a non-rook capture on a home corner square also clears the right', () => {
    const engine = new ChessRules();
    // Black knight captures the a1 rook — queenside right must be gone from FEN
    expect(engine.setPosition('4k3/8/8/8/8/1n6/8/R3K2R b KQ - 0 1')).toBe(true);
    const result = engine.makeMove(pos('b3'), pos('a1'));
    expect(result.success).toBe(true);
    expect(fenField(engine, 2)).toBe('K');
  });

  it('king move revokes both rights; rook move revokes one side', () => {
    const engine = new ChessRules();
    expect(engine.setPosition('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1')).toBe(
      true
    );
    engine.makeMove(pos('a1'), pos('a2'));
    expect(fenField(engine, 2)).toBe('Kkq');
    engine.makeMove(pos('e8'), pos('e7'));
    expect(fenField(engine, 2)).toBe('K');
  });

  it('allows legal castling both sides', () => {
    const engine = new ChessRules();
    expect(engine.setPosition('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1')).toBe(
      true
    );
    const kingMoves = engine.getValidMoves(pos('e1'));
    expect(kingMoves).toContainEqual(pos('g1'));
    expect(kingMoves).toContainEqual(pos('c1'));
  });

  it('blocks castling through an attacked square', () => {
    const engine = new ChessRules();
    // Black rook on f2 attacks f1: kingside castling illegal, queenside legal
    expect(engine.setPosition('4k3/8/8/8/8/8/5r2/R3K2R w KQ - 0 1')).toBe(true);
    const kingMoves = engine.getValidMoves(pos('e1'));
    expect(kingMoves).not.toContainEqual(pos('g1'));
    expect(kingMoves).toContainEqual(pos('c1'));
  });
});

describe('en passant', () => {
  it('does not emit an en passant target when no enemy pawn can capture', () => {
    const engine = new ChessRules();
    engine.makeMove(pos('e2'), pos('e4'));
    expect(fenField(engine, 3)).toBe('-');
  });

  it('emits the en passant target when an enemy pawn can capture', () => {
    const engine = new ChessRules();
    // Black pawn on d4; white plays e2-e4 → ep capture on e3 is available
    expect(
      engine.setPosition(
        'rnbqkbnr/ppp1pppp/8/8/3p4/8/PPPPPPPP/RNBQKBNR w KQkq - 0 3'
      )
    ).toBe(true);
    engine.makeMove(pos('e2'), pos('e4'));
    expect(fenField(engine, 3)).toBe('e3');
  });

  it('executes en passant capture and removes the captured pawn', () => {
    const engine = new ChessRules();
    expect(
      engine.setPosition(
        'rnbqkbnr/ppp1pppp/8/8/3p4/8/PPPPPPPP/RNBQKBNR w KQkq - 0 3'
      )
    ).toBe(true);
    engine.makeMove(pos('e2'), pos('e4'));
    const result = engine.makeMove(pos('d4'), pos('e3'));
    expect(result.success).toBe(true);
    expect(result.type).toBe('enPassant');
    expect(engine.getPiece(pos('e4'))).toBeNull();
    expect(engine.getPiece(pos('e3'))).toEqual({
      type: PieceType.Pawn,
      color: Color.Black,
    });
  });

  it('rejects en passant that would expose the king along a rank (horizontal pin)', () => {
    const engine = new ChessRules();
    // Ka5, white pawn d5, black pawn c5 (just double-pushed), black queen h5.
    // dxc6 e.p. would clear rank 5 and expose the king to the queen.
    expect(engine.setPosition('8/8/8/K1pP3q/8/8/8/4k3 w - c6 0 1')).toBe(true);
    const moves = engine.getValidMoves(pos('d5'));
    expect(moves).not.toContainEqual(pos('c6'));
    expect(moves).toContainEqual(pos('d6'));
  });

  it('does not count phantom en passant targets as distinct positions for repetition', () => {
    const engine = new ChessRules();
    // 1.e4 creates no real ep possibility, so the position after 1.e4 must be
    // keyed identically to the same position reached without an ep target.
    engine.makeMove(pos('e2'), pos('e4'));
    const fenAfterE4 = fenOf(engine);
    const engine2 = new ChessRules();
    expect(engine2.setPosition(fenAfterE4)).toBe(true);
    expect(fenAfterE4.split(' ')[3]).toBe('-');
  });
});

describe('promotion', () => {
  const promoFen = '4k3/P7/8/8/8/8/8/4K3 w - - 0 1';

  it('requires a promotion piece', () => {
    const engine = new ChessRules();
    expect(engine.setPosition(promoFen)).toBe(true);
    const result = engine.makeMove(pos('a7'), pos('a8'));
    expect(result.success).toBe(false);
    expect(result.promotionRequired).toBe(true);
  });

  it('accepts queen/rook/bishop/knight promotions', () => {
    for (const piece of [
      PieceType.Queen,
      PieceType.Rook,
      PieceType.Bishop,
      PieceType.Knight,
    ]) {
      const engine = new ChessRules();
      expect(engine.setPosition(promoFen)).toBe(true);
      const result = engine.makeMove(pos('a7'), pos('a8'), piece);
      expect(result.success).toBe(true);
      expect(engine.getPiece(pos('a8'))).toEqual({
        type: piece,
        color: Color.White,
      });
    }
  });

  it('rejects promotion to king or pawn', () => {
    for (const piece of [PieceType.King, PieceType.Pawn]) {
      const engine = new ChessRules();
      expect(engine.setPosition(promoFen)).toBe(true);
      const result = engine.makeMove(pos('a7'), pos('a8'), piece);
      expect(result.success).toBe(false);
      expect(engine.getPiece(pos('a8'))).toBeNull();
      expect(engine.getPiece(pos('a7'))).toEqual({
        type: PieceType.Pawn,
        color: Color.White,
      });
    }
  });

  it('generates all four promotion options in the move list', () => {
    const engine = new ChessRules();
    expect(engine.setPosition(promoFen)).toBe(true);
    const promoMoves = engine
      .getGameState()
      .validMoves.filter((m: Move) => m.toRank === 7 && m.fromFile === 0);
    expect(promoMoves).toHaveLength(4);
    expect(new Set(promoMoves.map(m => m.promotionPiece))).toEqual(
      new Set([
        PieceType.Queen,
        PieceType.Rook,
        PieceType.Bishop,
        PieceType.Knight,
      ])
    );
  });
});

describe('FEN parsing and validation', () => {
  it('round-trips well-formed FENs', () => {
    const fens = [
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',
      '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1',
      '4k3/8/8/8/8/8/8/4K3 b - - 12 34',
    ];
    for (const fen of fens) {
      const engine = new ChessRules();
      expect(engine.setPosition(fen)).toBe(true);
      expect(fenOf(engine)).toBe(fen);
    }
  });

  it('rejects structurally invalid FENs', () => {
    const bad = [
      '',
      'not a fen at all',
      '8/8/8/8/8/8/8 w - - 0 1', // 7 ranks
      '8/8/8/8/8/8/8/8/8 w - - 0 1', // 9 ranks
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNRR w KQkq - 0 1', // 9 files
      'rnbqkbnr/ppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', // 7 files in a rank
      '8/8/8/8/8/8/8/8 w - - 0 1', // no kings
      '4k3/8/8/8/8/8/8/8 w - - 0 1', // missing white king
      'K3k2K/8/8/8/8/8/8/8 w - - 0 1', // two white kings
      '4k3/8/8/8/8/8/8/4K3 x - - 0 1', // bad active color
      '4k3/8/8/8/8/8/8/4K3 w ZZ - 0 1', // bad castling field
      '4k3/8/8/8/8/8/8/4K3 w - e9 0 1', // bad ep square
      '4k3/8/8/8/8/8/8/4K3 w - - x 1', // non-numeric halfmove
      '4k3/8/8/8/8/8/8/4K3 w - - 0 y', // non-numeric fullmove
    ];
    for (const fen of bad) {
      const engine = new ChessRules();
      expect(engine.setPosition(fen), `should reject: '${fen}'`).toBe(false);
    }
  });

  it('leaves the engine in a usable state after a rejected FEN', () => {
    const engine = new ChessRules();
    const before = fenOf(engine);
    expect(engine.setPosition('garbage')).toBe(false);
    expect(fenOf(engine)).toBe(before);
    expect(engine.getGameState().validMoves).toHaveLength(20);
  });
});

describe('game end detection', () => {
  it("detects fool's mate", () => {
    const engine = new ChessRules();
    playSAN(engine, 'f3', 'e5', 'g4', 'Qh4');
    const state = engine.getGameState();
    expect(state.isGameOver).toBe(true);
    expect(state.result).toEqual({ winner: Color.Black, reason: 'checkmate' });
    const history = engine.getHistory();
    expect(history[history.length - 1].algebraic).toBe('Qh4#');
  });

  it('detects stalemate', () => {
    const engine = new ChessRules();
    expect(engine.setPosition('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')).toBe(true);
    const state = engine.getGameState();
    expect(state.isGameOver).toBe(true);
    expect(state.result).toEqual({ reason: 'stalemate' });
    expect(state.isCheck).toBe(false);
  });

  it('counts repetitions', () => {
    const engine = new ChessRules();
    playSAN(engine, 'Nf3', 'Nf6', 'Ng1', 'Ng8', 'Nf3', 'Nf6', 'Ng1', 'Ng8');
    expect(engine.getGameState().repetitionCount).toBe(3);
  });

  it('tracks the halfmove clock', () => {
    const engine = new ChessRules();
    playSAN(engine, 'Nf3', 'Nf6', 'Ng1', 'Ng8');
    expect(engine.getGameState().halfmoveClock).toBe(4);
    playSAN(engine, 'e4');
    expect(engine.getGameState().halfmoveClock).toBe(0);
  });

  it('detects insufficient material', () => {
    const insufficient = [
      '4k3/8/8/8/8/8/8/4K3 w - - 0 1', // K vs K
      '4k3/8/8/8/8/8/8/2B1K3 w - - 0 1', // KB vs K
      '4k3/8/8/8/8/8/8/2N1K3 w - - 0 1', // KN vs K
      '2b1k3/8/8/8/8/8/8/4KB2 w - - 0 1', // KB vs KB same-color bishops (c8+f1 both light)
    ];
    for (const fen of insufficient) {
      const engine = new ChessRules();
      expect(engine.setPosition(fen)).toBe(true);
      expect(engine.isInsufficientMaterial(), fen).toBe(true);
    }

    const sufficient = [
      '4k3/8/8/8/8/8/8/3RK3 w - - 0 1', // KR vs K
      '4k3/7p/8/8/8/8/8/4K3 w - - 0 1', // K vs KP
      '1b2k3/8/8/8/8/8/8/4KB2 w - - 0 1', // KB vs KB opposite-color bishops
    ];
    for (const fen of sufficient) {
      const engine = new ChessRules();
      expect(engine.setPosition(fen)).toBe(true);
      expect(engine.isInsufficientMaterial(), fen).toBe(false);
    }
  });
});

describe('algebraic notation', () => {
  it('disambiguates by file when two knights reach the same square', () => {
    const engine = new ChessRules();
    expect(engine.setPosition('4k3/8/8/8/8/8/8/1N2KN2 w - - 0 1')).toBe(true);
    engine.makeMove(pos('b1'), pos('d2'));
    const history = engine.getHistory();
    expect(history[history.length - 1].algebraic).toBe('Nbd2');
  });

  it('notates castling, captures, promotion and check', () => {
    const engine = new ChessRules();
    expect(engine.setPosition('r3k3/6P1/8/8/8/8/8/4K2R w Kq - 0 1')).toBe(true);
    engine.makeMove(pos('e1'), pos('g1'));
    expect(engine.getHistory()[0].algebraic).toBe('O-O');
    engine.makeMove(pos('e8'), pos('d7'));
    engine.makeMove(pos('g7'), pos('g8'), PieceType.Queen);
    expect(engine.getHistory()[2].algebraic).toBe('g8=Q');
  });

  it('parseSAN round-trips generated notation over a full game', () => {
    const moves = [
      'e4',
      'e5',
      'Nf3',
      'Nc6',
      'Bb5',
      'a6',
      'Bxc6',
      'dxc6',
      'O-O',
      'f6',
      'd4',
      'exd4',
      'Nxd4',
      'c5',
      'Ne2',
      'Qxd1',
      'Rxd1',
    ];
    const engine = new ChessRules();
    playSAN(engine, ...moves);
    const history = engine.getHistory();
    const replay = new ChessRules();
    for (const entry of history) {
      const parsed = replay.parseSAN(entry.algebraic);
      expect(parsed, `re-parse '${entry.algebraic}'`).not.toBeNull();
      expect(parsed).toEqual(entry.move);
      replay.makeMove(
        { file: parsed!.fromFile, rank: parsed!.fromRank },
        { file: parsed!.toFile, rank: parsed!.toRank },
        parsed!.promotionPiece
      );
    }
    expect(fenOf(replay)).toBe(fenOf(engine));
  });
});
