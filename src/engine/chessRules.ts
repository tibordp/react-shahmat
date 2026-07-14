export enum PieceType {
  Pawn = 0,
  Rook = 1,
  Knight = 2,
  Bishop = 3,
  Queen = 4,
  King = 5,
}

export enum Color {
  White = 0,
  Black = 1,
}

export interface Piece {
  type: PieceType;
  color: Color;
}

export interface Position {
  file: number; // 0-7
  rank: number; // 0-7
}

export interface Move {
  fromFile: number;
  fromRank: number;
  toFile: number;
  toRank: number;
  promotionPiece?: PieceType; // For pawn promotion moves
}

export interface MoveResult {
  success: boolean;
  type?: 'normal' | 'capture' | 'castling' | 'enPassant' | 'promotion';
  capturedPiece?: Piece;
  additionalMoves?: Array<{ from: Position; to: Position; piece: Piece }>; // For castling rook move
  promotionRequired?: boolean; // When success=false due to missing promotion piece
}

export interface ValidMoveResult {
  valid: boolean;
  type?: 'normal' | 'capture' | 'castling' | 'enPassant' | 'promotion';
  capturedPiece?: Piece;
  additionalMoves?: Array<{ from: Position; to: Position; piece: Piece }>; // For castling rook move
  promotionRequired?: boolean; // If move requires promotion piece
}

export interface GameState {
  fen: string;
  currentPlayer: Color;
  validMoves: Move[];
  isCheck: boolean;
  isGameOver: boolean;
  result?: GameResult;
  moveHistory: Move[];
  capturedPieces: { white: Piece[]; black: Piece[] };
  /** Number of times the current position has occurred (including this one) */
  repetitionCount: number;
  /** Half-moves since last capture or pawn move (for 50/75-move rule) */
  halfmoveClock: number;
  /** True if neither side has sufficient material to checkmate */
  insufficientMaterial: boolean;
}

export interface GameResult {
  winner?: Color;
  reason:
    | 'checkmate'
    | 'stalemate'
    | 'draw'
    | 'resignation'
    | 'timeout'
    | 'repetition'
    | 'fifty_moves'
    | 'insufficient_material';
}

export type MoveType =
  'normal' | 'capture' | 'castling' | 'enPassant' | 'promotion';

export interface HistoryEntry {
  move: Move;
  piece: Piece;
  moveType: MoveType;
  capturedPiece?: Piece;
  promotionPiece?: PieceType;
  fen: string;
  isCheck: boolean;
  isCheckmate: boolean;
  algebraic: string;
}

export interface ChessError {
  type: 'invalid_move' | 'callback_error' | 'timeout';
  player: Color;
  move?: Move;
  message: string;
  originalError?: Error;
}

export class ChessRules {
  private board: (Piece | null)[][];
  private currentPlayer: Color;
  private enPassantTarget: Position | null; // Square where en passant capture can happen
  private lastMove: Move | null; // Track the last move made
  private moveHistory: Move[]; // Track all moves made
  private historyEntries: HistoryEntry[]; // Rich history with piece/capture/notation info
  private fenHistory: string[]; // FEN at each position (index 0 = initial, index n = after move n)
  private halfmoveClock: number; // Moves since last capture or pawn move (for 50-move rule)
  private fullmoveNumber: number; // Increments after Black's move
  private castlingRights: {
    whiteKingSide: boolean;
    whiteQueenSide: boolean;
    blackKingSide: boolean;
    blackQueenSide: boolean;
  };
  // getGameState() is expensive (full legal move enumeration) and callers
  // invoke it several times per position — cache until the position mutates.
  private cachedGameState: GameState | null = null;

  constructor() {
    this.board = this.createEmptyBoard();
    this.currentPlayer = Color.White;
    this.enPassantTarget = null;
    this.lastMove = null;
    this.moveHistory = [];
    this.historyEntries = [];
    this.fenHistory = [];
    this.halfmoveClock = 0;
    this.fullmoveNumber = 1;
    this.castlingRights = {
      whiteKingSide: true,
      whiteQueenSide: true,
      blackKingSide: true,
      blackQueenSide: true,
    };
    this.setupInitialPosition();
    this.fenHistory.push(this.generateFEN());
  }

  private createEmptyBoard(): (Piece | null)[][] {
    return Array(8)
      .fill(null)
      .map(() => Array(8).fill(null));
  }

  private setupInitialPosition(): void {
    // Place pawns
    for (let file = 0; file < 8; file++) {
      this.board[1][file] = { type: PieceType.Pawn, color: Color.White };
      this.board[6][file] = { type: PieceType.Pawn, color: Color.Black };
    }

    // Place pieces for white
    this.board[0][0] = { type: PieceType.Rook, color: Color.White };
    this.board[0][1] = { type: PieceType.Knight, color: Color.White };
    this.board[0][2] = { type: PieceType.Bishop, color: Color.White };
    this.board[0][3] = { type: PieceType.Queen, color: Color.White };
    this.board[0][4] = { type: PieceType.King, color: Color.White };
    this.board[0][5] = { type: PieceType.Bishop, color: Color.White };
    this.board[0][6] = { type: PieceType.Knight, color: Color.White };
    this.board[0][7] = { type: PieceType.Rook, color: Color.White };

    // Place pieces for black
    this.board[7][0] = { type: PieceType.Rook, color: Color.Black };
    this.board[7][1] = { type: PieceType.Knight, color: Color.Black };
    this.board[7][2] = { type: PieceType.Bishop, color: Color.Black };
    this.board[7][3] = { type: PieceType.Queen, color: Color.Black };
    this.board[7][4] = { type: PieceType.King, color: Color.Black };
    this.board[7][5] = { type: PieceType.Bishop, color: Color.Black };
    this.board[7][6] = { type: PieceType.Knight, color: Color.Black };
    this.board[7][7] = { type: PieceType.Rook, color: Color.Black };
  }

  public getBoardState(): (Piece | null)[][] {
    // Return a deep copy to prevent external modification
    return this.board.map(row =>
      row.map(piece => (piece ? { ...piece } : null))
    );
  }

  public getCurrentPlayer(): Color {
    return this.currentPlayer;
  }

  public getPiece(position: Position): Piece | null {
    const { file, rank } = position;
    if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
    return this.board[rank][file];
  }

  private getPieceFromBoard(
    position: Position,
    board: (Piece | null)[][]
  ): Piece | null {
    const { file, rank } = position;
    if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
    // Note: board is in visual format [7-rank][file], need to convert
    return board[7 - rank][file];
  }

  private getPieceForPattern(
    position: Position,
    customBoard?: (Piece | null)[][]
  ): Piece | null {
    return customBoard
      ? this.getPieceFromBoard(position, customBoard)
      : this.getPiece(position);
  }

  public getValidMoves(from: Position): Position[] {
    const piece = this.getPiece(from);
    if (!piece || piece.color !== this.currentPlayer) return [];

    const pseudoLegalMoves = this.getValidMovesForPiece(
      from.file,
      from.rank,
      piece,
      true
    );

    // Filter out moves that would leave the king in check
    return pseudoLegalMoves.filter(to => this.isMoveLegal(from, to));
  }

  /**
   * Get potential moves for UI hints and pre-moves.
   * This method can be configured to show different levels of move validation.
   */
  public getPotentialMoves(
    from: Position,
    options: {
      ignorePieceBlocking?: boolean;
      includeIllegalMoves?: boolean;
      forPreMove?: boolean;
      forAnyColor?: boolean; // Allow moves for any color, not just current player
      boardState?: (Piece | null)[][]; // Optional custom board state for premove calculations
    } = {}
  ): Position[] {
    const piece = options.boardState
      ? this.getPieceFromBoard(from, options.boardState)
      : this.getPiece(from);
    if (!piece) return [];

    // For pre-moves or when forAnyColor is true, allow any color
    if (
      !options.forAnyColor &&
      !options.forPreMove &&
      piece.color !== this.currentPlayer
    ) {
      return [];
    }

    const moves = this.getMovementPattern(
      from.file,
      from.rank,
      piece,
      options.ignorePieceBlocking || options.forPreMove,
      options.boardState
    );

    // If we want to include illegal moves (like for pre-moves), return early
    if (options.includeIllegalMoves || options.forPreMove) {
      return moves;
    }

    // Otherwise filter out moves that would leave the king in check
    return moves.filter(to => this.isMoveLegal(from, to));
  }

  /**
   * Get basic movement pattern for a piece type, ignoring all game rules.
   * This is useful for showing potential squares in UI.
   */
  public getBasicMovementPattern(
    pieceType: PieceType,
    from: Position,
    color: Color
  ): Position[] {
    const piece = { type: pieceType, color };
    return this.getMovementPattern(from.file, from.rank, piece, true);
  }

  private isMoveLegal(from: Position, to: Position): boolean {
    // Simulate the move and check if king would be in check
    const piece = this.getPiece(from);
    if (!piece) return false;

    // Store original state
    const originalTarget = this.getPiece(to);
    const originalEnPassantTarget = this.enPassantTarget;

    // Special handling for castling - already checked in canCastle method
    if (piece.type === PieceType.King && Math.abs(to.file - from.file) === 2) {
      // Castling legality is already verified in addCastlingMoves/canCastle
      return true;
    }

    // Special handling for en passant capture
    let capturedEnPassantPawn: Piece | null = null;
    let capturedEnPassantPos: Position | null = null;

    if (
      piece.type === PieceType.Pawn &&
      this.enPassantTarget &&
      to.file === this.enPassantTarget.file &&
      to.rank === this.enPassantTarget.rank
    ) {
      const direction = piece.color === Color.White ? 1 : -1;
      capturedEnPassantPos = { file: to.file, rank: to.rank - direction };
      capturedEnPassantPawn = this.getPiece(capturedEnPassantPos);
      this.board[capturedEnPassantPos.rank][capturedEnPassantPos.file] = null;
    }

    // Make the move temporarily
    this.board[to.rank][to.file] = piece;
    this.board[from.rank][from.file] = null;

    // Check if king is in check after this move
    const isLegal = !this.isKingInCheck(piece.color);

    // Restore original state
    this.board[from.rank][from.file] = piece;
    this.board[to.rank][to.file] = originalTarget;

    if (capturedEnPassantPawn && capturedEnPassantPos) {
      this.board[capturedEnPassantPos.rank][capturedEnPassantPos.file] =
        capturedEnPassantPawn;
    }

    this.enPassantTarget = originalEnPassantTarget;

    return isLegal;
  }

  private addPawnMovesPattern(
    from: Position,
    color: Color,
    moves: Position[],
    ignorePieceBlocking: boolean = false,
    customBoard?: (Piece | null)[][]
  ): void {
    const direction = color === Color.White ? 1 : -1;
    const startRank = color === Color.White ? 1 : 6;

    // Forward move
    const newRank = from.rank + direction;
    if (this.isInBounds(from.file, newRank)) {
      const forwardBlocked =
        !ignorePieceBlocking &&
        this.getPieceForPattern(
          { file: from.file, rank: newRank },
          customBoard
        );

      if (ignorePieceBlocking || !forwardBlocked) {
        moves.push({ file: from.file, rank: newRank });

        // Double forward from starting position
        if (from.rank === startRank) {
          const doubleRank = newRank + direction;
          if (this.isInBounds(from.file, doubleRank)) {
            const doubleBlocked =
              !ignorePieceBlocking &&
              this.getPieceForPattern(
                { file: from.file, rank: doubleRank },
                customBoard
              );
            if (ignorePieceBlocking || !doubleBlocked) {
              moves.push({ file: from.file, rank: doubleRank });
            }
          }
        }
      }
    }

    // Capture moves (diagonal)
    for (const fileOffset of [-1, 1]) {
      const newFile = from.file + fileOffset;
      if (this.isInBounds(newFile, newRank)) {
        if (ignorePieceBlocking) {
          // For pre-moves, show all diagonal squares
          moves.push({ file: newFile, rank: newRank });
        } else {
          const target = this.getPieceForPattern(
            { file: newFile, rank: newRank },
            customBoard
          );
          if (target && target.color !== color) {
            moves.push({ file: newFile, rank: newRank });
          }
          // En passant capture
          else if (
            this.enPassantTarget &&
            this.enPassantTarget.file === newFile &&
            this.enPassantTarget.rank === newRank
          ) {
            moves.push({ file: newFile, rank: newRank });
          }
        }
      }
    }
  }

  private addRookMovesPattern(
    from: Position,
    color: Color,
    moves: Position[],
    ignorePieceBlocking: boolean = false,
    customBoard?: (Piece | null)[][]
  ): void {
    const directions = [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ];
    for (const [fileDir, rankDir] of directions) {
      this.addSlidingMovesPattern(
        from,
        color,
        fileDir,
        rankDir,
        moves,
        ignorePieceBlocking,
        customBoard
      );
    }
  }

  private addBishopMovesPattern(
    from: Position,
    color: Color,
    moves: Position[],
    ignorePieceBlocking: boolean = false,
    customBoard?: (Piece | null)[][]
  ): void {
    const directions = [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ];
    for (const [fileDir, rankDir] of directions) {
      this.addSlidingMovesPattern(
        from,
        color,
        fileDir,
        rankDir,
        moves,
        ignorePieceBlocking,
        customBoard
      );
    }
  }

  private addQueenMovesPattern(
    from: Position,
    color: Color,
    moves: Position[],
    ignorePieceBlocking: boolean = false,
    customBoard?: (Piece | null)[][]
  ): void {
    this.addRookMovesPattern(
      from,
      color,
      moves,
      ignorePieceBlocking,
      customBoard
    );
    this.addBishopMovesPattern(
      from,
      color,
      moves,
      ignorePieceBlocking,
      customBoard
    );
  }

  private addKnightMovesPattern(
    from: Position,
    color: Color,
    moves: Position[],
    ignorePieceBlocking: boolean = false,
    customBoard?: (Piece | null)[][]
  ): void {
    const knightMoves = [
      [2, 1],
      [2, -1],
      [-2, 1],
      [-2, -1],
      [1, 2],
      [1, -2],
      [-1, 2],
      [-1, -2],
    ];

    for (const [fileOffset, rankOffset] of knightMoves) {
      const newFile = from.file + fileOffset;
      const newRank = from.rank + rankOffset;

      if (this.isInBounds(newFile, newRank)) {
        if (ignorePieceBlocking) {
          moves.push({ file: newFile, rank: newRank });
        } else {
          const target = this.getPieceForPattern(
            { file: newFile, rank: newRank },
            customBoard
          );
          if (!target || target.color !== color) {
            moves.push({ file: newFile, rank: newRank });
          }
        }
      }
    }
  }

  private addKingMovesPattern(
    from: Position,
    color: Color,
    moves: Position[],
    ignorePieceBlocking: boolean = false,
    customBoard?: (Piece | null)[][]
  ): void {
    const kingMoves = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ];

    for (const [fileOffset, rankOffset] of kingMoves) {
      const newFile = from.file + fileOffset;
      const newRank = from.rank + rankOffset;

      if (this.isInBounds(newFile, newRank)) {
        if (ignorePieceBlocking) {
          moves.push({ file: newFile, rank: newRank });
        } else {
          const target = this.getPieceForPattern(
            { file: newFile, rank: newRank },
            customBoard
          );
          if (!target || target.color !== color) {
            moves.push({ file: newFile, rank: newRank });
          }
        }
      }
    }

    // Add castling moves
    if (ignorePieceBlocking) {
      // For pre-moves, add castling squares without validation
      const homeRank = color === Color.White ? 0 : 7;
      if (from.rank === homeRank && from.file === 4) {
        moves.push({ file: 6, rank: homeRank }); // King side
        moves.push({ file: 2, rank: homeRank }); // Queen side
      }
    } else {
      this.addCastlingMoves(from, color, moves);
    }
  }

  private addSlidingMovesPattern(
    from: Position,
    color: Color,
    fileDir: number,
    rankDir: number,
    moves: Position[],
    ignorePieceBlocking: boolean = false,
    customBoard?: (Piece | null)[][]
  ): void {
    let file = from.file + fileDir;
    let rank = from.rank + rankDir;

    while (this.isInBounds(file, rank)) {
      if (ignorePieceBlocking) {
        // For pre-moves, show all squares in the direction
        moves.push({ file, rank });
      } else {
        const target = this.getPieceForPattern({ file, rank }, customBoard);

        if (!target) {
          moves.push({ file, rank });
        } else {
          if (target.color !== color) {
            moves.push({ file, rank });
          }
          break;
        }
      }

      file += fileDir;
      rank += rankDir;
    }
  }

  private isInBounds(file: number, rank: number): boolean {
    return file >= 0 && file <= 7 && rank >= 0 && rank <= 7;
  }

  private addCastlingMoves(
    from: Position,
    color: Color,
    moves: Position[]
  ): void {
    // Can only castle if king is on its starting square and not in check
    const startRank = color === Color.White ? 0 : 7;
    if (
      from.file !== 4 ||
      from.rank !== startRank ||
      this.isKingInCheck(color)
    ) {
      return;
    }

    // Check king-side castling
    if (
      color === Color.White
        ? this.castlingRights.whiteKingSide
        : this.castlingRights.blackKingSide
    ) {
      if (this.canCastle(color, true)) {
        moves.push({ file: 6, rank: startRank });
      }
    }

    // Check queen-side castling
    if (
      color === Color.White
        ? this.castlingRights.whiteQueenSide
        : this.castlingRights.blackQueenSide
    ) {
      if (this.canCastle(color, false)) {
        moves.push({ file: 2, rank: startRank });
      }
    }
  }

  private canCastle(color: Color, kingSide: boolean): boolean {
    const rank = color === Color.White ? 0 : 7;
    const kingFile = 4;
    const rookFile = kingSide ? 7 : 0;
    const direction = kingSide ? 1 : -1;

    // Check if rook is in position
    const rook = this.getPiece({ file: rookFile, rank });
    if (!rook || rook.type !== PieceType.Rook || rook.color !== color) {
      return false;
    }

    // Check if squares between king and rook are empty
    const start = Math.min(kingFile, rookFile) + 1;
    const end = Math.max(kingFile, rookFile);
    for (let file = start; file < end; file++) {
      if (this.getPiece({ file, rank })) {
        return false;
      }
    }

    // Check if king passes through or ends up in check
    for (let i = 0; i <= 2; i++) {
      const testFile = kingFile + i * direction;
      if (testFile < 0 || testFile > 7) continue;

      // Temporarily move king to test square
      const originalPiece = this.board[rank][testFile];
      this.board[rank][testFile] = this.board[rank][kingFile];
      if (testFile !== kingFile) {
        this.board[rank][kingFile] = null;
      }

      const inCheck = this.isKingInCheckAt(color, testFile, rank);

      // Restore board
      this.board[rank][kingFile] = this.board[rank][testFile];
      this.board[rank][testFile] = originalPiece;

      if (inCheck) {
        return false;
      }
    }

    return true;
  }

  private isKingInCheckAt(color: Color, file: number, rank: number): boolean {
    const enemyColor = color === Color.White ? Color.Black : Color.White;
    return this.isSquareAttacked(file, rank, enemyColor);
  }

  private static readonly KNIGHT_OFFSETS: ReadonlyArray<
    readonly [number, number]
  > = [
    [2, 1],
    [2, -1],
    [-2, 1],
    [-2, -1],
    [1, 2],
    [1, -2],
    [-1, 2],
    [-1, -2],
  ];

  private static readonly KING_OFFSETS: ReadonlyArray<
    readonly [number, number]
  > = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];

  private static readonly ROOK_DIRECTIONS: ReadonlyArray<
    readonly [number, number]
  > = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ];

  private static readonly BISHOP_DIRECTIONS: ReadonlyArray<
    readonly [number, number]
  > = [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];

  /**
   * Test whether a square is attacked by any piece of the given color, by
   * probing outward from the square (knight/king/pawn offsets plus sliding
   * rays) instead of generating every enemy piece's move list.
   */
  private isSquareAttacked(
    file: number,
    rank: number,
    byColor: Color
  ): boolean {
    // Knight attacks
    for (const [df, dr] of ChessRules.KNIGHT_OFFSETS) {
      const p = this.getPiece({ file: file + df, rank: rank + dr });
      if (p && p.color === byColor && p.type === PieceType.Knight) return true;
    }

    // King attacks (adjacent squares)
    for (const [df, dr] of ChessRules.KING_OFFSETS) {
      const p = this.getPiece({ file: file + df, rank: rank + dr });
      if (p && p.color === byColor && p.type === PieceType.King) return true;
    }

    // Pawn attacks: a white pawn attacks diagonally upward, so it must sit
    // one rank below the target square (and vice versa for black).
    const pawnRank = byColor === Color.White ? rank - 1 : rank + 1;
    for (const df of [-1, 1]) {
      const p = this.getPiece({ file: file + df, rank: pawnRank });
      if (p && p.color === byColor && p.type === PieceType.Pawn) return true;
    }

    // Sliding attacks: rook/queen along ranks and files
    for (const [df, dr] of ChessRules.ROOK_DIRECTIONS) {
      let f = file + df;
      let r = rank + dr;
      while (this.isInBounds(f, r)) {
        const p = this.board[r][f];
        if (p) {
          if (
            p.color === byColor &&
            (p.type === PieceType.Rook || p.type === PieceType.Queen)
          ) {
            return true;
          }
          break;
        }
        f += df;
        r += dr;
      }
    }

    // Sliding attacks: bishop/queen along diagonals
    for (const [df, dr] of ChessRules.BISHOP_DIRECTIONS) {
      let f = file + df;
      let r = rank + dr;
      while (this.isInBounds(f, r)) {
        const p = this.board[r][f];
        if (p) {
          if (
            p.color === byColor &&
            (p.type === PieceType.Bishop || p.type === PieceType.Queen)
          ) {
            return true;
          }
          break;
        }
        f += df;
        r += dr;
      }
    }

    return false;
  }

  /**
   * Get movement pattern for a piece, with optional piece blocking consideration.
   * This unifies the logic used by both legal move validation and pre-move hints.
   */
  private getMovementPattern(
    file: number,
    rank: number,
    piece: Piece,
    ignorePieceBlocking: boolean = false,
    customBoard?: (Piece | null)[][]
  ): Position[] {
    const moves: Position[] = [];
    const from = { file, rank };

    switch (piece.type) {
      case PieceType.Pawn:
        this.addPawnMovesPattern(
          from,
          piece.color,
          moves,
          ignorePieceBlocking,
          customBoard
        );
        break;
      case PieceType.Rook:
        this.addRookMovesPattern(
          from,
          piece.color,
          moves,
          ignorePieceBlocking,
          customBoard
        );
        break;
      case PieceType.Knight:
        this.addKnightMovesPattern(
          from,
          piece.color,
          moves,
          ignorePieceBlocking,
          customBoard
        );
        break;
      case PieceType.Bishop:
        this.addBishopMovesPattern(
          from,
          piece.color,
          moves,
          ignorePieceBlocking,
          customBoard
        );
        break;
      case PieceType.Queen:
        this.addQueenMovesPattern(
          from,
          piece.color,
          moves,
          ignorePieceBlocking,
          customBoard
        );
        break;
      case PieceType.King:
        this.addKingMovesPattern(
          from,
          piece.color,
          moves,
          ignorePieceBlocking,
          customBoard
        );
        break;
    }

    return moves;
  }

  private getValidMovesForPiece(
    file: number,
    rank: number,
    piece: Piece,
    includeCastling: boolean = true
  ): Position[] {
    if (piece.type === PieceType.King && !includeCastling) {
      // For king in check detection, use only basic king moves without castling
      const moves: Position[] = [];
      const kingMoves = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ];

      const from = { file, rank };
      for (const [fileOffset, rankOffset] of kingMoves) {
        const newFile = from.file + fileOffset;
        const newRank = from.rank + rankOffset;

        if (this.isInBounds(newFile, newRank)) {
          const target = this.getPiece({ file: newFile, rank: newRank });
          if (!target || target.color !== piece.color) {
            moves.push({ file: newFile, rank: newRank });
          }
        }
      }
      return moves;
    }

    return this.getMovementPattern(file, rank, piece, false);
  }

  private analyzeMoveType(
    from: Position,
    to: Position,
    promotionPiece?: PieceType
  ): ValidMoveResult {
    const piece = this.getPiece(from);
    if (!piece || piece.color !== this.currentPlayer) {
      return { valid: false };
    }

    const validMoves = this.getValidMoves(from);
    const isValidMove = validMoves.some(
      move => move.file === to.file && move.rank === to.rank
    );

    if (!isValidMove) {
      return { valid: false };
    }

    const targetPiece = this.getPiece(to);
    let type: 'normal' | 'capture' | 'castling' | 'enPassant' | 'promotion' =
      'normal';
    let capturedPiece: Piece | undefined;
    let additionalMoves: Array<{ from: Position; to: Position; piece: Piece }> =
      [];
    let promotionRequired = false;

    // Determine move type
    if (piece.type === PieceType.King && Math.abs(to.file - from.file) === 2) {
      // Castling
      type = 'castling';
      const kingSide = to.file > from.file;
      const rookFromFile = kingSide ? 7 : 0;
      const rookToFile = kingSide ? 5 : 3;
      const rook = this.getPiece({ file: rookFromFile, rank: from.rank });
      if (rook) {
        additionalMoves.push({
          from: { file: rookFromFile, rank: from.rank },
          to: { file: rookToFile, rank: from.rank },
          piece: rook,
        });
      }
    } else if (piece.type === PieceType.Pawn) {
      const promotionRank = piece.color === Color.White ? 7 : 0;
      const direction = piece.color === Color.White ? 1 : -1;

      // Check for en passant
      if (
        this.enPassantTarget &&
        to.file === this.enPassantTarget.file &&
        to.rank === this.enPassantTarget.rank
      ) {
        type = 'enPassant';
        const capturedPawnRank = to.rank - direction;
        capturedPiece =
          this.getPiece({ file: to.file, rank: capturedPawnRank }) || undefined;
      }
      // Check for promotion
      else if (to.rank === promotionRank) {
        type = 'promotion';
        capturedPiece = targetPiece || undefined;
        // Note: PieceType.Pawn === 0 is falsy, so compare against undefined —
        // an explicit (illegal) pawn promotion must be rejected, not treated
        // as "no piece supplied".
        if (promotionPiece === undefined) {
          promotionRequired = true;
        } else if (
          promotionPiece !== PieceType.Queen &&
          promotionPiece !== PieceType.Rook &&
          promotionPiece !== PieceType.Bishop &&
          promotionPiece !== PieceType.Knight
        ) {
          return { valid: false };
        }
      }
      // Regular pawn move or capture
      else if (targetPiece) {
        type = 'capture';
        capturedPiece = targetPiece;
      }
    } else if (targetPiece) {
      // Regular capture
      type = 'capture';
      capturedPiece = targetPiece;
    }

    return {
      valid: true,
      type,
      capturedPiece,
      additionalMoves,
      promotionRequired,
    };
  }

  public isValidMove(
    from: Position,
    to: Position,
    promotionPiece?: PieceType
  ): ValidMoveResult {
    return this.analyzeMoveType(from, to, promotionPiece);
  }

  public makeMove(
    from: Position,
    to: Position,
    promotionPiece?: PieceType
  ): MoveResult {
    // First analyze the move to get rich information. A promotion move
    // without a promotion piece is valid-but-incomplete: report it as
    // promotionRequired instead of executing with an undefined piece.
    const analysis = this.analyzeMoveType(from, to, promotionPiece);
    if (!analysis.valid || analysis.promotionRequired) {
      return {
        success: false,
        promotionRequired: analysis.promotionRequired,
      };
    }

    const piece = this.getPiece(from)!; // We know it exists from analysis
    const { type, capturedPiece, additionalMoves } = analysis;

    // SAN disambiguation must be computed against the pre-move board, so do
    // it now, before the move is executed.
    const disambiguation = this.computeDisambiguation(piece, from, to);

    // Clear en passant target from previous turn
    this.enPassantTarget = null;

    // Execute the move based on type
    if (type === 'castling') {
      // Handle castling
      this.board[to.rank][to.file] = piece;
      this.board[from.rank][from.file] = null;

      // Move the rook (from additionalMoves)
      const rookMove = additionalMoves![0];
      this.board[rookMove.to.rank][rookMove.to.file] = rookMove.piece;
      this.board[rookMove.from.rank][rookMove.from.file] = null;

      this.updateCastlingRights(from.file, from.rank, piece);
    } else if (type === 'enPassant') {
      // Handle en passant capture
      const direction = piece.color === Color.White ? 1 : -1;
      const capturedPawnRank = to.rank - direction;

      // Remove the captured pawn
      this.board[capturedPawnRank][to.file] = null;

      // Move the pawn
      this.board[to.rank][to.file] = piece;
      this.board[from.rank][from.file] = null;
    } else if (type === 'promotion') {
      // Handle pawn promotion
      this.board[to.rank][to.file] = {
        type: promotionPiece!,
        color: piece.color,
      };
      this.board[from.rank][from.file] = null;
    } else {
      // Handle normal moves and captures
      // Check for double pawn move (sets en passant target).
      // Only record the target when an enemy pawn stands adjacent and could
      // actually capture — a "phantom" target makes the FEN non-canonical and
      // breaks repetition detection (positions differing only in an unusable
      // ep field must compare equal).
      if (
        piece.type === PieceType.Pawn &&
        Math.abs(to.rank - from.rank) === 2
      ) {
        const direction = piece.color === Color.White ? 1 : -1;
        for (const fileOffset of [-1, 1]) {
          const neighbor = this.getPiece({
            file: to.file + fileOffset,
            rank: to.rank,
          });
          if (
            neighbor &&
            neighbor.type === PieceType.Pawn &&
            neighbor.color !== piece.color
          ) {
            this.enPassantTarget = {
              file: to.file,
              rank: from.rank + direction,
            };
            break;
          }
        }
      }

      // Regular move or capture
      this.board[to.rank][to.file] = piece;
      this.board[from.rank][from.file] = null;

      // Update castling rights for king and rook moves
      this.updateCastlingRights(from.file, from.rank, piece);
    }

    // Any move landing on a home corner square kills that side's castling
    // right — this is how rights are lost when a rook is captured at home.
    // (If the square was empty, the original rook already left and the right
    // is already gone, so clearing again is harmless.)
    this.clearCastlingRightsAt(to.file, to.rank);

    // Update halfmove clock (resets on capture or pawn move)
    if (
      piece.type === PieceType.Pawn ||
      capturedPiece ||
      type === 'capture' ||
      type === 'enPassant'
    ) {
      this.halfmoveClock = 0;
    } else {
      this.halfmoveClock++;
    }

    // Record the move
    const moveRecord: Move = {
      fromFile: from.file,
      fromRank: from.rank,
      toFile: to.file,
      toRank: to.rank,
      promotionPiece,
    };
    this.lastMove = moveRecord;
    this.moveHistory.push(moveRecord);

    // Switch players and update fullmove number
    this.currentPlayer =
      this.currentPlayer === Color.White ? Color.Black : Color.White;

    // Increment fullmove number after black's move
    if (this.currentPlayer === Color.White) {
      this.fullmoveNumber++;
    }

    // The position changed — invalidate the cached game state
    this.cachedGameState = null;

    // Build rich history entry
    const fen = this.generateFEN();
    const isCheck = this.isKingInCheck(this.currentPlayer);
    const isCheckmate = isCheck && !this.hasAnyLegalMove();
    const algebraic = this.computeAlgebraic(
      piece,
      from,
      to,
      type as MoveType,
      capturedPiece,
      promotionPiece,
      isCheck,
      isCheckmate,
      disambiguation
    );
    this.historyEntries.push({
      move: moveRecord,
      piece: { ...piece },
      moveType: type as MoveType,
      capturedPiece: capturedPiece ? { ...capturedPiece } : undefined,
      promotionPiece,
      fen,
      isCheck,
      isCheckmate,
      algebraic,
    });
    this.fenHistory.push(fen);

    return {
      success: true,
      type,
      capturedPiece,
      additionalMoves,
    };
  }

  public isKingInCheck(color: Color): boolean {
    // Find the king of the specified color
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = this.board[rank][file];
        if (piece && piece.type === PieceType.King && piece.color === color) {
          return this.isKingInCheckAt(color, file, rank);
        }
      }
    }
    return false;
  }

  private updateCastlingRights(
    fromFile: number,
    fromRank: number,
    piece: Piece
  ): void {
    // If king moves, lose all castling rights for that color
    if (piece.type === PieceType.King) {
      if (piece.color === Color.White) {
        this.castlingRights.whiteKingSide = false;
        this.castlingRights.whiteQueenSide = false;
      } else {
        this.castlingRights.blackKingSide = false;
        this.castlingRights.blackQueenSide = false;
      }
    }

    // If rook moves from starting position, lose castling rights for that side
    if (piece.type === PieceType.Rook) {
      if (piece.color === Color.White && fromRank === 0) {
        if (fromFile === 0) {
          this.castlingRights.whiteQueenSide = false;
        } else if (fromFile === 7) {
          this.castlingRights.whiteKingSide = false;
        }
      } else if (piece.color === Color.Black && fromRank === 7) {
        if (fromFile === 0) {
          this.castlingRights.blackQueenSide = false;
        } else if (fromFile === 7) {
          this.castlingRights.blackKingSide = false;
        }
      }
    }
  }

  /** Clear the castling right associated with a rook home square, if any. */
  private clearCastlingRightsAt(file: number, rank: number): void {
    if (rank === 0) {
      if (file === 0) this.castlingRights.whiteQueenSide = false;
      else if (file === 7) this.castlingRights.whiteKingSide = false;
    } else if (rank === 7) {
      if (file === 0) this.castlingRights.blackQueenSide = false;
      else if (file === 7) this.castlingRights.blackKingSide = false;
    }
  }

  public getLastMove(): Move | null {
    return this.lastMove;
  }

  public getHistory(): HistoryEntry[] {
    return [...this.historyEntries];
  }

  public getFenHistory(): string[] {
    return [...this.fenHistory];
  }

  public undoToFen(fen: string, plyCount: number): boolean {
    // Save history before setPosition (which clears it)
    const savedHistory = this.historyEntries.slice(0, plyCount);
    const savedFenHistory = this.fenHistory.slice(0, plyCount + 1);
    const savedMoveHistory = this.moveHistory.slice(0, plyCount);

    const success = this.setPosition(fen);
    if (success) {
      this.historyEntries = savedHistory;
      this.fenHistory = savedFenHistory;
      this.moveHistory = savedMoveHistory;
      this.lastMove = plyCount > 0 ? savedMoveHistory[plyCount - 1] : null;
    }
    return success;
  }

  private computeAlgebraic(
    piece: Piece,
    from: Position,
    to: Position,
    moveType: MoveType,
    capturedPiece: Piece | undefined,
    promotionPiece: PieceType | undefined,
    isCheck: boolean,
    isCheckmate: boolean,
    disambiguation: string
  ): string {
    const FILE_LETTERS = 'abcdefgh';
    const toSquare = FILE_LETTERS[to.file] + (to.rank + 1);
    const isCapture = !!capturedPiece || moveType === 'enPassant';
    let notation = '';

    if (moveType === 'castling') {
      notation = to.file > from.file ? 'O-O' : 'O-O-O';
    } else if (piece.type === PieceType.Pawn) {
      if (isCapture) {
        notation = FILE_LETTERS[from.file] + 'x' + toSquare;
      } else {
        notation = toSquare;
      }
      if (moveType === 'promotion' && promotionPiece !== undefined) {
        const PIECE_LETTERS = ['', 'R', 'N', 'B', 'Q', 'K'];
        notation += '=' + PIECE_LETTERS[promotionPiece];
      }
    } else {
      const PIECE_LETTERS = ['', 'R', 'N', 'B', 'Q', 'K'];
      notation = PIECE_LETTERS[piece.type];
      notation += disambiguation;

      if (isCapture) {
        notation += 'x';
      }
      notation += toSquare;
    }

    if (isCheckmate) {
      notation += '#';
    } else if (isCheck) {
      notation += '+';
    }

    return notation;
  }

  /**
   * SAN disambiguation for the move about to be played. Must be called on the
   * pre-move board (from makeMove, before the move is executed): finds other
   * same-type pieces that could also legally reach the target square.
   */
  private computeDisambiguation(
    piece: Piece,
    from: Position,
    to: Position
  ): string {
    // Pawns and kings never need disambiguation (pawn captures are
    // disambiguated by file in SAN; there is only one king).
    if (piece.type === PieceType.Pawn || piece.type === PieceType.King) {
      return '';
    }

    const sameTypePositions: Position[] = [];
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const p = this.board[rank][file];
        if (
          p &&
          p.type === piece.type &&
          p.color === piece.color &&
          (rank !== from.rank || file !== from.file)
        ) {
          const moves = this.getValidMoves({ file, rank });
          if (moves.some(m => m.file === to.file && m.rank === to.rank)) {
            sameTypePositions.push({ file, rank });
          }
        }
      }
    }

    if (sameTypePositions.length === 0) return '';

    const FILE_LETTERS = 'abcdefgh';
    const sameFile = sameTypePositions.some(p => p.file === from.file);
    const sameRank = sameTypePositions.some(p => p.rank === from.rank);

    if (!sameFile) {
      return FILE_LETTERS[from.file];
    } else if (!sameRank) {
      return (from.rank + 1).toString();
    } else {
      return FILE_LETTERS[from.file] + (from.rank + 1);
    }
  }

  /**
   * Count how many times the current position has occurred in the game.
   * Compares piece placement, active color, castling rights, and en passant target.
   */
  public getRepetitionCount(): number {
    if (this.fenHistory.length === 0) return 1;
    const currentKey = this.positionKey(this.generateFEN());
    let count = 0;
    for (const fen of this.fenHistory) {
      if (this.positionKey(fen) === currentKey) count++;
    }
    return count;
  }

  /** Extract the position-relevant part of a FEN (no move counters) */
  private positionKey(fen: string): string {
    const parts = fen.split(' ');
    // piece placement + active color + castling + en passant
    return parts.slice(0, 4).join(' ');
  }

  /**
   * Check if the position has insufficient material for either side to checkmate.
   * Only returns true when checkmate is literally impossible:
   * - K vs K
   * - K+B vs K
   * - K+N vs K
   * - K+B vs K+B (same color bishops)
   */
  public isInsufficientMaterial(): boolean {
    const pieces: {
      color: Color;
      type: PieceType;
      file: number;
      rank: number;
    }[] = [];

    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = this.board[rank][file];
        if (piece) {
          pieces.push({ ...piece, file, rank });
        }
      }
    }

    // Any pawns, rooks, or queens → sufficient material
    if (
      pieces.some(
        p =>
          p.type === PieceType.Pawn ||
          p.type === PieceType.Rook ||
          p.type === PieceType.Queen
      )
    ) {
      return false;
    }

    // Filter to non-king pieces
    const minors = pieces.filter(p => p.type !== PieceType.King);

    // K vs K
    if (minors.length === 0) return true;

    // K+minor vs K
    if (minors.length === 1) return true;

    // K+B vs K+B — only insufficient if bishops are on the same color square
    if (
      minors.length === 2 &&
      minors[0].type === PieceType.Bishop &&
      minors[1].type === PieceType.Bishop &&
      minors[0].color !== minors[1].color
    ) {
      const color0 = (minors[0].file + minors[0].rank) % 2;
      const color1 = (minors[1].file + minors[1].rank) % 2;
      if (color0 === color1) return true;
    }

    return false;
  }

  /**
   * Parse a SAN (Standard Algebraic Notation) move and find the matching legal move.
   * Returns the matching Move or null if no legal move matches.
   */
  public parseSAN(san: string): Move | null {
    const FILE_CHARS = 'abcdefgh';
    const cleaned = san.replace(/[+#!?]+$/, ''); // strip check/mate/annotation markers

    // Castling
    if (cleaned === 'O-O' || cleaned === '0-0') {
      const rank = this.currentPlayer === Color.White ? 0 : 7;
      return this.isValidMove({ file: 4, rank }, { file: 6, rank }).valid
        ? { fromFile: 4, fromRank: rank, toFile: 6, toRank: rank }
        : null;
    }
    if (cleaned === 'O-O-O' || cleaned === '0-0-0') {
      const rank = this.currentPlayer === Color.White ? 0 : 7;
      return this.isValidMove({ file: 4, rank }, { file: 2, rank }).valid
        ? { fromFile: 4, fromRank: rank, toFile: 2, toRank: rank }
        : null;
    }

    // Parse promotion (e.g., "e8=Q" or "exd8=Q")
    let promotionPiece: PieceType | undefined;
    let rest = cleaned;
    const promoMatch = rest.match(/=([QRBN])$/);
    if (promoMatch) {
      const promoMap: Record<string, PieceType> = {
        Q: PieceType.Queen,
        R: PieceType.Rook,
        B: PieceType.Bishop,
        N: PieceType.Knight,
      };
      promotionPiece = promoMap[promoMatch[1]];
      rest = rest.slice(0, -2);
    }

    // Remove capture indicator
    rest = rest.replace('x', '');

    // Determine piece type
    let pieceType = PieceType.Pawn;
    if (rest.length > 0 && 'KQRBN'.includes(rest[0])) {
      const pieceMap: Record<string, PieceType> = {
        K: PieceType.King,
        Q: PieceType.Queen,
        R: PieceType.Rook,
        B: PieceType.Bishop,
        N: PieceType.Knight,
      };
      pieceType = pieceMap[rest[0]];
      rest = rest.slice(1);
    }

    // Last two characters are the destination square
    if (rest.length < 2) return null;
    const toFile = FILE_CHARS.indexOf(rest[rest.length - 2]);
    const toRank = parseInt(rest[rest.length - 1]) - 1;
    if (toFile < 0 || toRank < 0 || toRank > 7) return null;

    // Disambiguation (remaining characters before destination)
    const disambig = rest.slice(0, -2);
    let disambigFile = -1;
    let disambigRank = -1;
    for (const ch of disambig) {
      if (FILE_CHARS.includes(ch)) disambigFile = FILE_CHARS.indexOf(ch);
      else if (ch >= '1' && ch <= '8') disambigRank = parseInt(ch) - 1;
    }

    // Find matching legal move
    const to = { file: toFile, rank: toRank };
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = this.board[rank][file];
        if (
          !piece ||
          piece.color !== this.currentPlayer ||
          piece.type !== pieceType
        )
          continue;
        if (disambigFile >= 0 && file !== disambigFile) continue;
        if (disambigRank >= 0 && rank !== disambigRank) continue;

        const from = { file, rank };
        const validation = this.isValidMove(from, to, promotionPiece);
        if (validation.valid) {
          return {
            fromFile: file,
            fromRank: rank,
            toFile: toFile,
            toRank: toRank,
            promotionPiece,
          };
        }
      }
    }

    return null;
  }

  /** True if the current player has at least one legal move (cheap mate/stalemate probe). */
  private hasAnyLegalMove(): boolean {
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = this.board[rank][file];
        if (piece && piece.color === this.currentPlayer) {
          if (this.getValidMoves({ file, rank }).length > 0) return true;
        }
      }
    }
    return false;
  }

  public getGameState(): GameState {
    if (this.cachedGameState) return this.cachedGameState;

    // Get all valid moves for current player. getValidMoves already returns
    // fully legal destinations, so no re-validation is needed — a pawn move
    // to the last rank is a promotion by definition and expands to all four
    // promotion choices.
    const validMoves: Move[] = [];
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = this.board[rank][file];
        if (piece && piece.color === this.currentPlayer) {
          const pieceMoves = this.getValidMoves({ file, rank });
          const promotionRank =
            piece.type === PieceType.Pawn
              ? piece.color === Color.White
                ? 7
                : 0
              : -1;
          for (const move of pieceMoves) {
            if (move.rank === promotionRank) {
              for (const promotionPiece of [
                PieceType.Queen,
                PieceType.Rook,
                PieceType.Bishop,
                PieceType.Knight,
              ]) {
                validMoves.push({
                  fromFile: file,
                  fromRank: rank,
                  toFile: move.file,
                  toRank: move.rank,
                  promotionPiece,
                });
              }
            } else {
              validMoves.push({
                fromFile: file,
                fromRank: rank,
                toFile: move.file,
                toRank: move.rank,
              });
            }
          }
        }
      }
    }

    // Calculate captured pieces
    const capturedPieces = this.getCapturedPieces();

    // Check game over conditions
    const isGameOver = validMoves.length === 0;
    let result: GameResult | undefined;

    if (isGameOver) {
      if (this.isKingInCheck(this.currentPlayer)) {
        // Checkmate
        result = {
          winner:
            this.currentPlayer === Color.White ? Color.Black : Color.White,
          reason: 'checkmate',
        };
      } else {
        // Stalemate
        result = { reason: 'stalemate' };
      }
    }

    this.cachedGameState = {
      fen: this.generateFEN(),
      currentPlayer: this.currentPlayer,
      validMoves,
      isCheck: this.isKingInCheck(this.currentPlayer),
      isGameOver,
      result,
      moveHistory: this.moveHistory || [],
      capturedPieces,
      repetitionCount: this.getRepetitionCount(),
      halfmoveClock: this.halfmoveClock,
      insufficientMaterial: this.isInsufficientMaterial(),
    };
    return this.cachedGameState;
  }

  private getCapturedPieces(): { white: Piece[]; black: Piece[] } {
    // Calculate what pieces should be on the board vs what actually are
    const initialPieces = {
      white: [
        { type: PieceType.King, count: 1 },
        { type: PieceType.Queen, count: 1 },
        { type: PieceType.Rook, count: 2 },
        { type: PieceType.Bishop, count: 2 },
        { type: PieceType.Knight, count: 2 },
        { type: PieceType.Pawn, count: 8 },
      ],
      black: [
        { type: PieceType.King, count: 1 },
        { type: PieceType.Queen, count: 1 },
        { type: PieceType.Rook, count: 2 },
        { type: PieceType.Bishop, count: 2 },
        { type: PieceType.Knight, count: 2 },
        { type: PieceType.Pawn, count: 8 },
      ],
    };

    // Count current pieces
    const currentPieces: {
      white: Record<number, number>;
      black: Record<number, number>;
    } = { white: {}, black: {} };
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = this.board[rank][file];
        if (piece) {
          const color = piece.color === Color.White ? 'white' : 'black';
          currentPieces[color][piece.type] =
            (currentPieces[color][piece.type] || 0) + 1;
        }
      }
    }

    // Calculate captured pieces
    const capturedWhite: Piece[] = [];
    const capturedBlack: Piece[] = [];

    for (const { type, count } of initialPieces.white) {
      const remaining = currentPieces.white[type] || 0;
      for (let i = 0; i < count - remaining; i++) {
        capturedWhite.push({ type, color: Color.White });
      }
    }

    for (const { type, count } of initialPieces.black) {
      const remaining = currentPieces.black[type] || 0;
      for (let i = 0; i < count - remaining; i++) {
        capturedBlack.push({ type, color: Color.Black });
      }
    }

    return { white: capturedWhite, black: capturedBlack };
  }

  private generateFEN(): string {
    // Simple FEN generation (position only, not full FEN with castling rights etc.)
    let fen = '';

    for (let rank = 7; rank >= 0; rank--) {
      let emptySquares = 0;
      for (let file = 0; file < 8; file++) {
        const piece = this.board[rank][file];
        if (piece) {
          if (emptySquares > 0) {
            fen += emptySquares.toString();
            emptySquares = 0;
          }
          const pieceChar = this.pieceToFENChar(piece);
          fen += pieceChar;
        } else {
          emptySquares++;
        }
      }
      if (emptySquares > 0) {
        fen += emptySquares.toString();
      }
      if (rank > 0) {
        fen += '/';
      }
    }

    // Add current player
    fen += ` ${this.currentPlayer === Color.White ? 'w' : 'b'}`;

    // Add castling rights
    let castling = '';
    if (this.castlingRights.whiteKingSide) castling += 'K';
    if (this.castlingRights.whiteQueenSide) castling += 'Q';
    if (this.castlingRights.blackKingSide) castling += 'k';
    if (this.castlingRights.blackQueenSide) castling += 'q';
    fen += ` ${castling || '-'}`;

    // Add en passant target square
    if (this.enPassantTarget) {
      const fileChar = String.fromCharCode(97 + this.enPassantTarget.file); // 'a' + file
      const rankChar = (this.enPassantTarget.rank + 1).toString(); // rank + 1 for 1-based
      fen += ` ${fileChar}${rankChar}`;
    } else {
      fen += ' -';
    }

    // Add halfmove clock and fullmove number
    fen += ` ${this.halfmoveClock} ${this.fullmoveNumber}`;

    return fen;
  }

  private pieceToFENChar(piece: Piece): string {
    const chars = ['p', 'r', 'n', 'b', 'q', 'k'];
    let char = chars[piece.type];
    return piece.color === Color.White ? char.toUpperCase() : char;
  }

  /**
   * Load a position from FEN. Validates structure (8x8 board, exactly one
   * king per side, well-formed fields) and returns false without touching
   * the engine state if the FEN is invalid.
   */
  public setPosition(fen: string): boolean {
    const parts = fen.trim().split(/\s+/);
    if (parts.length < 4 || parts.length > 6) return false;

    const [position, activeColor, castlingField, enPassant] = parts;
    const halfmoveField = parts[4] ?? '0';
    const fullmoveField = parts[5] ?? '1';

    // Parse the board into a temporary structure first
    const ranks = position.split('/');
    if (ranks.length !== 8) return false;

    const newBoard = this.createEmptyBoard();
    let whiteKings = 0;
    let blackKings = 0;

    for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
      let fileIndex = 0;
      for (const char of ranks[rankIndex]) {
        if (char >= '1' && char <= '8') {
          fileIndex += parseInt(char);
        } else {
          const piece = this.fenCharToPiece(char);
          if (!piece || fileIndex > 7) return false;
          if (piece.type === PieceType.King) {
            if (piece.color === Color.White) whiteKings++;
            else blackKings++;
          }
          newBoard[7 - rankIndex][fileIndex] = piece;
          fileIndex++;
        }
      }
      if (fileIndex !== 8) return false;
    }

    if (whiteKings !== 1 || blackKings !== 1) return false;

    if (activeColor !== 'w' && activeColor !== 'b') return false;

    if (!/^(-|K?Q?k?q?)$/.test(castlingField) || castlingField === '')
      return false;

    let enPassantTarget: Position | null = null;
    if (enPassant !== '-') {
      if (!/^[a-h][36]$/.test(enPassant)) return false;
      enPassantTarget = {
        file: enPassant.charCodeAt(0) - 97,
        rank: parseInt(enPassant[1]) - 1,
      };
    }

    if (!/^\d+$/.test(halfmoveField) || !/^\d+$/.test(fullmoveField))
      return false;

    // Everything validated — commit
    this.cachedGameState = null;
    this.board = newBoard;
    this.currentPlayer = activeColor === 'w' ? Color.White : Color.Black;
    this.castlingRights = {
      whiteKingSide: castlingField.includes('K'),
      whiteQueenSide: castlingField.includes('Q'),
      blackKingSide: castlingField.includes('k'),
      blackQueenSide: castlingField.includes('q'),
    };
    this.enPassantTarget = enPassantTarget;
    this.halfmoveClock = parseInt(halfmoveField);
    this.fullmoveNumber = parseInt(fullmoveField);

    // Clear move history and last move when setting position
    this.lastMove = null;
    this.moveHistory = [];
    this.historyEntries = [];
    this.fenHistory = [this.generateFEN()];

    return true;
  }

  private fenCharToPiece(char: string): Piece | null {
    const lowerChar = char.toLowerCase();
    const color = char === lowerChar ? Color.Black : Color.White;

    switch (lowerChar) {
      case 'p':
        return { type: PieceType.Pawn, color };
      case 'r':
        return { type: PieceType.Rook, color };
      case 'n':
        return { type: PieceType.Knight, color };
      case 'b':
        return { type: PieceType.Bishop, color };
      case 'q':
        return { type: PieceType.Queen, color };
      case 'k':
        return { type: PieceType.King, color };
      default:
        return null;
    }
  }

  public resetGame(): void {
    this.cachedGameState = null;
    this.board = this.createEmptyBoard();
    this.currentPlayer = Color.White;
    this.enPassantTarget = null;
    this.lastMove = null;
    this.moveHistory = [];
    this.historyEntries = [];
    this.fenHistory = [];
    this.halfmoveClock = 0;
    this.fullmoveNumber = 1;
    this.castlingRights = {
      whiteKingSide: true,
      whiteQueenSide: true,
      blackKingSide: true,
      blackQueenSide: true,
    };
    this.setupInitialPosition();
    this.fenHistory.push(this.generateFEN());
  }
}
