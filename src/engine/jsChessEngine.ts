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
  checkStatus?: 'none' | 'check' | 'checkmate' | 'stalemate';
}

export interface ValidMoveResult {
  valid: boolean;
  type?: 'normal' | 'capture' | 'castling' | 'enPassant' | 'promotion';
  capturedPiece?: Piece;
  additionalMoves?: Array<{ from: Position; to: Position; piece: Piece }>; // For castling rook move
  promotionRequired?: boolean; // If move requires promotion piece
  resultingCheckStatus?: 'none' | 'check' | 'checkmate' | 'stalemate'; // Game state after this move
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
}

export interface GameResult {
  winner?: Color;
  reason: 'checkmate' | 'stalemate' | 'draw' | 'resignation' | 'timeout';
}

export interface ChessError {
  type: 'invalid_move' | 'callback_error' | 'timeout';
  player: Color;
  move?: Move;
  message: string;
  originalError?: Error;
}

export interface ChessBoardCallbacks {
  onWhiteMove?: (gameState: GameState, opponentMove?: Move) => Promise<Move>;
  onBlackMove?: (gameState: GameState, opponentMove?: Move) => Promise<Move>;
  onError?: (error: ChessError) => void;
  onGameStateChange?: (gameState: GameState) => void;
}

export interface ChessBoardRef {
  resetGame: () => void;
  setPosition: (fen: string) => boolean;
  getGameState: () => GameState;
  executeExternalMove: (move: Move) => boolean;
}

export class JSChessEngine {
  private board: (Piece | null)[][];
  private currentPlayer: Color;
  private enPassantTarget: Position | null; // Square where en passant capture can happen
  private lastMove: Move | null; // Track the last move made
  private moveHistory: Move[]; // Track all moves made
  private halfmoveClock: number; // Moves since last capture or pawn move (for 50-move rule)
  private fullmoveNumber: number; // Increments after Black's move
  private castlingRights: {
    whiteKingSide: boolean;
    whiteQueenSide: boolean;
    blackKingSide: boolean;
    blackQueenSide: boolean;
  };

  constructor() {
    this.board = this.createEmptyBoard();
    this.currentPlayer = Color.White;
    this.enPassantTarget = null;
    this.lastMove = null;
    this.moveHistory = [];
    this.halfmoveClock = 0;
    this.fullmoveNumber = 1;
    this.castlingRights = {
      whiteKingSide: true,
      whiteQueenSide: true,
      blackKingSide: true,
      blackQueenSide: true,
    };
    this.setupInitialPosition();
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
    } = {}
  ): Position[] {
    const piece = this.getPiece(from);
    if (!piece) return [];

    // For pre-moves or when forAnyColor is true, allow any color
    if (!options.forAnyColor && !options.forPreMove && piece.color !== this.currentPlayer) {
      return [];
    }

    const moves = this.getMovementPattern(
      from.file,
      from.rank,
      piece,
      options.ignorePieceBlocking || options.forPreMove
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
  public getBasicMovementPattern(pieceType: PieceType, from: Position, color: Color): Position[] {
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
    ignorePieceBlocking: boolean = false
  ): void {
    const direction = color === Color.White ? 1 : -1;
    const startRank = color === Color.White ? 1 : 6;

    // Forward move
    const newRank = from.rank + direction;
    if (this.isInBounds(from.file, newRank)) {
      const forwardBlocked = !ignorePieceBlocking && this.getPiece({ file: from.file, rank: newRank });
      
      if (ignorePieceBlocking || !forwardBlocked) {
        moves.push({ file: from.file, rank: newRank });

        // Double forward from starting position
        if (from.rank === startRank) {
          const doubleRank = newRank + direction;
          if (this.isInBounds(from.file, doubleRank)) {
            const doubleBlocked = !ignorePieceBlocking && this.getPiece({ file: from.file, rank: doubleRank });
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
          const target = this.getPiece({ file: newFile, rank: newRank });
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

  // Backward compatibility
  private addPawnMoves(from: Position, color: Color, moves: Position[]): void {
    this.addPawnMovesPattern(from, color, moves, false);
  }

  private addRookMovesPattern(
    from: Position,
    color: Color,
    moves: Position[],
    ignorePieceBlocking: boolean = false
  ): void {
    const directions = [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ];
    for (const [fileDir, rankDir] of directions) {
      this.addSlidingMovesPattern(from, color, fileDir, rankDir, moves, ignorePieceBlocking);
    }
  }

  // Backward compatibility
  private addRookMoves(from: Position, color: Color, moves: Position[]): void {
    this.addRookMovesPattern(from, color, moves, false);
  }

  private addBishopMovesPattern(
    from: Position,
    color: Color,
    moves: Position[],
    ignorePieceBlocking: boolean = false
  ): void {
    const directions = [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ];
    for (const [fileDir, rankDir] of directions) {
      this.addSlidingMovesPattern(from, color, fileDir, rankDir, moves, ignorePieceBlocking);
    }
  }

  // Backward compatibility
  private addBishopMoves(
    from: Position,
    color: Color,
    moves: Position[]
  ): void {
    this.addBishopMovesPattern(from, color, moves, false);
  }

  private addQueenMovesPattern(
    from: Position,
    color: Color,
    moves: Position[],
    ignorePieceBlocking: boolean = false
  ): void {
    this.addRookMovesPattern(from, color, moves, ignorePieceBlocking);
    this.addBishopMovesPattern(from, color, moves, ignorePieceBlocking);
  }

  // Backward compatibility
  private addQueenMoves(from: Position, color: Color, moves: Position[]): void {
    this.addQueenMovesPattern(from, color, moves, false);
  }

  private addKnightMovesPattern(
    from: Position,
    color: Color,
    moves: Position[],
    ignorePieceBlocking: boolean = false
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
          const target = this.getPiece({ file: newFile, rank: newRank });
          if (!target || target.color !== color) {
            moves.push({ file: newFile, rank: newRank });
          }
        }
      }
    }
  }

  // Backward compatibility
  private addKnightMoves(
    from: Position,
    color: Color,
    moves: Position[]
  ): void {
    this.addKnightMovesPattern(from, color, moves, false);
  }

  private addKingMovesPattern(
    from: Position,
    color: Color,
    moves: Position[],
    ignorePieceBlocking: boolean = false
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
          const target = this.getPiece({ file: newFile, rank: newRank });
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

  // Backward compatibility
  private addKingMoves(from: Position, color: Color, moves: Position[]): void {
    this.addKingMovesPattern(from, color, moves, false);
  }

  private addSlidingMovesPattern(
    from: Position,
    color: Color,
    fileDir: number,
    rankDir: number,
    moves: Position[],
    ignorePieceBlocking: boolean = false
  ): void {
    let file = from.file + fileDir;
    let rank = from.rank + rankDir;

    while (this.isInBounds(file, rank)) {
      if (ignorePieceBlocking) {
        // For pre-moves, show all squares in the direction
        moves.push({ file, rank });
      } else {
        const target = this.getPiece({ file, rank });

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

  // Backward compatibility
  private addSlidingMoves(
    from: Position,
    color: Color,
    fileDir: number,
    rankDir: number,
    moves: Position[]
  ): void {
    this.addSlidingMovesPattern(from, color, fileDir, rankDir, moves, false);
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
    // Check if any enemy piece can attack the given position
    const enemyColor = color === Color.White ? Color.Black : Color.White;
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const piece = this.board[r][f];
        if (piece && piece.color === enemyColor) {
          const moves = this.getValidMovesForPiece(f, r, piece, false); // Don't include castling to avoid recursion
          if (moves.some(move => move.file === file && move.rank === rank)) {
            return true;
          }
        }
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
    ignorePieceBlocking: boolean = false
  ): Position[] {
    const moves: Position[] = [];
    const from = { file, rank };

    switch (piece.type) {
      case PieceType.Pawn:
        this.addPawnMovesPattern(from, piece.color, moves, ignorePieceBlocking);
        break;
      case PieceType.Rook:
        this.addRookMovesPattern(from, piece.color, moves, ignorePieceBlocking);
        break;
      case PieceType.Knight:
        this.addKnightMovesPattern(from, piece.color, moves, ignorePieceBlocking);
        break;
      case PieceType.Bishop:
        this.addBishopMovesPattern(from, piece.color, moves, ignorePieceBlocking);
        break;
      case PieceType.Queen:
        this.addQueenMovesPattern(from, piece.color, moves, ignorePieceBlocking);
        break;
      case PieceType.King:
        this.addKingMovesPattern(from, piece.color, moves, ignorePieceBlocking);
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
        if (!promotionPiece) {
          promotionRequired = true;
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
    // First analyze the move to get rich information
    console.log(
      `Making move from ${from.file},${from.rank} to ${to.file},${to.rank} with promotion: ${promotionPiece}`
    );
    const analysis = this.analyzeMoveType(from, to, promotionPiece);
    if (!analysis.valid) {
      return {
        success: false,
        promotionRequired: analysis.promotionRequired,
      };
    }

    const piece = this.getPiece(from)!; // We know it exists from analysis
    const { type, capturedPiece, additionalMoves } = analysis;

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
      // Check for double pawn move (sets en passant target)
      if (
        piece.type === PieceType.Pawn &&
        Math.abs(to.rank - from.rank) === 2
      ) {
        const direction = piece.color === Color.White ? 1 : -1;
        this.enPassantTarget = { file: to.file, rank: from.rank + direction };
      }

      // Regular move or capture
      this.board[to.rank][to.file] = piece;
      this.board[from.rank][from.file] = null;

      // Update castling rights for king and rook moves
      this.updateCastlingRights(from.file, from.rank, piece);
    }

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
    const moveRecord = {
      fromFile: from.file,
      fromRank: from.rank,
      toFile: to.file,
      toRank: to.rank,
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

    // Determine check status after move
    const opponentColor = this.currentPlayer;
    let checkStatus: 'none' | 'check' | 'checkmate' | 'stalemate' = 'none';

    if (this.isKingInCheck(opponentColor)) {
      // TODO: Implement checkmate/stalemate detection
      checkStatus = 'check';
    }

    return {
      success: true,
      type,
      capturedPiece,
      additionalMoves,
      checkStatus,
    };
  }

  public isKingInCheck(color: Color): boolean {
    // Find the king of the specified color
    let kingPosition: Position | null = null;
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = this.board[rank][file];
        if (piece && piece.type === PieceType.King && piece.color === color) {
          kingPosition = { file, rank };
          break;
        }
      }
      if (kingPosition) break;
    }

    if (!kingPosition) return false;

    // Check if any enemy piece can attack the king's position
    const enemyColor = color === Color.White ? Color.Black : Color.White;
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = this.board[rank][file];
        if (piece && piece.color === enemyColor) {
          const moves = this.getValidMovesForPiece(file, rank, piece, false); // Use raw moves to avoid circular dependency
          if (
            moves.some(
              move =>
                move.file === kingPosition!.file &&
                move.rank === kingPosition!.rank
            )
          ) {
            return true;
          }
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

  public getLastMove(): Move | null {
    return this.lastMove;
  }

  public getGameState(): GameState {
    // Get all valid moves for current player
    const validMoves: Move[] = [];
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = this.board[rank][file];
        if (piece && piece.color === this.currentPlayer) {
          const pieceMoves = this.getValidMoves({ file, rank });
          for (const move of pieceMoves) {
            const from = { file, rank };
            const to = { file: move.file, rank: move.rank };
            const validation = this.isValidMove(from, to);

            if (validation.promotionRequired) {
              // Generate all four promotion options
              const promotionPieces = [
                PieceType.Queen,
                PieceType.Rook,
                PieceType.Bishop,
                PieceType.Knight,
              ];
              for (const promotionPiece of promotionPieces) {
                validMoves.push({
                  fromFile: file,
                  fromRank: rank,
                  toFile: move.file,
                  toRank: move.rank,
                  promotionPiece,
                });
              }
            } else {
              // Regular move
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

    return {
      fen: this.generateFEN(),
      currentPlayer: this.currentPlayer,
      validMoves,
      isCheck: this.isKingInCheck(this.currentPlayer),
      isGameOver,
      result,
      moveHistory: this.moveHistory || [],
      capturedPieces,
    };
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
    const currentPieces = { white: {} as any, black: {} as any };
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

  public setPosition(fen: string): boolean {
    try {
      const parts = fen.split(' ');
      if (parts.length < 4) return false; // Need at least position, color, castling, en passant

      const position = parts[0];
      const activeColor = parts[1];
      const castlingRights = parts[2];
      const enPassant = parts[3];
      const halfmove = parts[4] ? parseInt(parts[4]) : 0;
      const fullmove = parts[5] ? parseInt(parts[5]) : 1;

      // Clear board
      this.board = this.createEmptyBoard();

      // Parse board position
      const ranks = position.split('/');
      for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
        const rank = ranks[rankIndex];
        let fileIndex = 0;

        for (const char of rank) {
          if (char >= '1' && char <= '8') {
            // Empty squares
            fileIndex += parseInt(char);
          } else {
            // Piece
            const piece = this.fenCharToPiece(char);
            if (piece) {
              this.board[7 - rankIndex][fileIndex] = piece;
            }
            fileIndex++;
          }
        }
      }

      // Set active color
      this.currentPlayer = activeColor === 'w' ? Color.White : Color.Black;

      // Parse castling rights
      this.castlingRights = {
        whiteKingSide: castlingRights.includes('K'),
        whiteQueenSide: castlingRights.includes('Q'),
        blackKingSide: castlingRights.includes('k'),
        blackQueenSide: castlingRights.includes('q'),
      };

      // Parse en passant target
      if (enPassant !== '-') {
        const file = enPassant.charCodeAt(0) - 97; // 'a' = 97
        const rank = parseInt(enPassant[1]) - 1; // Convert to 0-based
        this.enPassantTarget = { file, rank };
      } else {
        this.enPassantTarget = null;
      }

      // Set move counters
      this.halfmoveClock = halfmove;
      this.fullmoveNumber = fullmove;

      // Clear move history and last move when setting position
      this.lastMove = null;
      this.moveHistory = [];

      return true;
    } catch {
      return false;
    }
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
    this.board = this.createEmptyBoard();
    this.currentPlayer = Color.White;
    this.enPassantTarget = null;
    this.lastMove = null;
    this.moveHistory = [];
    this.halfmoveClock = 0;
    this.fullmoveNumber = 1;
    this.castlingRights = {
      whiteKingSide: true,
      whiteQueenSide: true,
      blackKingSide: true,
      blackQueenSide: true,
    };
    this.setupInitialPosition();
  }
}
