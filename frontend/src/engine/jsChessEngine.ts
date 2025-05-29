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
}

export interface MoveResult {
  success: boolean;
  type?: 'normal' | 'capture' | 'castling' | 'enPassant' | 'promotion';
  capturedPiece?: Piece;
  additionalMoves?: Array<{from: Position, to: Position, piece: Piece}>; // For castling rook move
  promotionRequired?: boolean; // When success=false due to missing promotion piece
  checkStatus?: 'none' | 'check' | 'checkmate' | 'stalemate';
}

export interface ValidMoveResult {
  valid: boolean;
  type?: 'normal' | 'capture' | 'castling' | 'enPassant' | 'promotion';
  capturedPiece?: Piece;
  additionalMoves?: Array<{from: Position, to: Position, piece: Piece}>; // For castling rook move
  promotionRequired?: boolean; // If move requires promotion piece
  resultingCheckStatus?: 'none' | 'check' | 'checkmate' | 'stalemate'; // Game state after this move
}

export class JSChessEngine {
  private board: (Piece | null)[][];
  private currentPlayer: Color;
  private enPassantTarget: Position | null; // Square where en passant capture can happen
  private lastMove: Move | null; // Track the last move made
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
    this.castlingRights = {
      whiteKingSide: true,
      whiteQueenSide: true,
      blackKingSide: true,
      blackQueenSide: true,
    };
    this.setupInitialPosition();
  }

  private createEmptyBoard(): (Piece | null)[][] {
    return Array(8).fill(null).map(() => Array(8).fill(null));
  }

  private setupInitialPosition(): void {
    // Place pawns
    for (let file = 0; file < 8; file++) {
      this.board[1][file] = { type: PieceType.Pawn, color: Color.White };
      this.board[6][file] = { type: PieceType.Pawn, color: Color.Black };
    }

    // Place pieces for white
    this.board[0][0] = { type: PieceType.Rook, color: Color.White };
   // this.board[0][1] = { type: PieceType.Knight, color: Color.White };
   // this.board[0][2] = { type: PieceType.Bishop, color: Color.White };
   // this.board[0][3] = { type: PieceType.Queen, color: Color.White };
    this.board[0][4] = { type: PieceType.King, color: Color.White };
    //this.board[0][5] = { type: PieceType.Bishop, color: Color.White };
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
    return this.board.map(row => row.map(piece =>
      piece ? { ...piece } : null
    ));
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

    const pseudoLegalMoves = this.getValidMovesForPiece(from.file, from.rank, piece, true);
    
    // Filter out moves that would leave the king in check
    return pseudoLegalMoves.filter(to => this.isMoveLegal(from, to));
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
    
    if (piece.type === PieceType.Pawn && 
        this.enPassantTarget && 
        to.file === this.enPassantTarget.file && 
        to.rank === this.enPassantTarget.rank) {
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
      this.board[capturedEnPassantPos.rank][capturedEnPassantPos.file] = capturedEnPassantPawn;
    }
    
    this.enPassantTarget = originalEnPassantTarget;

    return isLegal;
  }

  private addPawnMoves(from: Position, color: Color, moves: Position[]): void {
    const direction = color === Color.White ? 1 : -1;
    const startRank = color === Color.White ? 1 : 6;

    // Forward move
    const newRank = from.rank + direction;
    if (this.isInBounds(from.file, newRank) && !this.getPiece({ file: from.file, rank: newRank })) {
      moves.push({ file: from.file, rank: newRank });

      // Double forward from starting position
      if (from.rank === startRank) {
        const doubleRank = newRank + direction;
        if (this.isInBounds(from.file, doubleRank) && !this.getPiece({ file: from.file, rank: doubleRank })) {
          moves.push({ file: from.file, rank: doubleRank });
        }
      }
    }

    // Capture moves
    for (const fileOffset of [-1, 1]) {
      const newFile = from.file + fileOffset;
      if (this.isInBounds(newFile, newRank)) {
        const target = this.getPiece({ file: newFile, rank: newRank });
        if (target && target.color !== color) {
          moves.push({ file: newFile, rank: newRank });
        }
        // En passant capture
        else if (this.enPassantTarget &&
                 this.enPassantTarget.file === newFile &&
                 this.enPassantTarget.rank === newRank) {
          moves.push({ file: newFile, rank: newRank });
        }
      }
    }
  }

  private addRookMoves(from: Position, color: Color, moves: Position[]): void {
    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    for (const [fileDir, rankDir] of directions) {
      this.addSlidingMoves(from, color, fileDir, rankDir, moves);
    }
  }

  private addBishopMoves(from: Position, color: Color, moves: Position[]): void {
    const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
    for (const [fileDir, rankDir] of directions) {
      this.addSlidingMoves(from, color, fileDir, rankDir, moves);
    }
  }

  private addQueenMoves(from: Position, color: Color, moves: Position[]): void {
    this.addRookMoves(from, color, moves);
    this.addBishopMoves(from, color, moves);
  }

  private addKnightMoves(from: Position, color: Color, moves: Position[]): void {
    const knightMoves = [
      [2, 1], [2, -1], [-2, 1], [-2, -1],
      [1, 2], [1, -2], [-1, 2], [-1, -2]
    ];

    for (const [fileOffset, rankOffset] of knightMoves) {
      const newFile = from.file + fileOffset;
      const newRank = from.rank + rankOffset;

      if (this.isInBounds(newFile, newRank)) {
        const target = this.getPiece({ file: newFile, rank: newRank });
        if (!target || target.color !== color) {
          moves.push({ file: newFile, rank: newRank });
        }
      }
    }
  }

  private addKingMoves(from: Position, color: Color, moves: Position[]): void {
    const kingMoves = [
      [1, 0], [-1, 0], [0, 1], [0, -1],
      [1, 1], [1, -1], [-1, 1], [-1, -1]
    ];

    for (const [fileOffset, rankOffset] of kingMoves) {
      const newFile = from.file + fileOffset;
      const newRank = from.rank + rankOffset;

      if (this.isInBounds(newFile, newRank)) {
        const target = this.getPiece({ file: newFile, rank: newRank });
        if (!target || target.color !== color) {
          moves.push({ file: newFile, rank: newRank });
        }
      }
    }

    // Add castling moves
    this.addCastlingMoves(from, color, moves);
  }

  private addSlidingMoves(from: Position, color: Color, fileDir: number, rankDir: number, moves: Position[]): void {
    let file = from.file + fileDir;
    let rank = from.rank + rankDir;

    while (this.isInBounds(file, rank)) {
      const target = this.getPiece({ file, rank });

      if (!target) {
        moves.push({ file, rank });
      } else {
        if (target.color !== color) {
          moves.push({ file, rank });
        }
        break;
      }

      file += fileDir;
      rank += rankDir;
    }
  }

  private isInBounds(file: number, rank: number): boolean {
    return file >= 0 && file <= 7 && rank >= 0 && rank <= 7;
  }

  private addCastlingMoves(from: Position, color: Color, moves: Position[]): void {
    // Can only castle if king is on its starting square and not in check
    const startRank = color === Color.White ? 0 : 7;
    if (from.file !== 4 || from.rank !== startRank || this.isKingInCheck(color)) {
      return;
    }

    // Check king-side castling
    if (color === Color.White ? this.castlingRights.whiteKingSide : this.castlingRights.blackKingSide) {
      if (this.canCastle(color, true)) {
        moves.push({ file: 6, rank: startRank });
      }
    }

    // Check queen-side castling
    if (color === Color.White ? this.castlingRights.whiteQueenSide : this.castlingRights.blackQueenSide) {
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
      const testFile = kingFile + (i * direction);
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

  private getValidMovesForPiece(file: number, rank: number, piece: Piece, includeCastling: boolean = true): Position[] {
    const moves: Position[] = [];
    const from = { file, rank };

    switch (piece.type) {
      case PieceType.Pawn:
        this.addPawnMoves(from, piece.color, moves);
        break;
      case PieceType.Rook:
        this.addRookMoves(from, piece.color, moves);
        break;
      case PieceType.Knight:
        this.addKnightMoves(from, piece.color, moves);
        break;
      case PieceType.Bishop:
        this.addBishopMoves(from, piece.color, moves);
        break;
      case PieceType.Queen:
        this.addQueenMoves(from, piece.color, moves);
        break;
      case PieceType.King:
        // Add basic king moves
        const kingMoves = [
          [1, 0], [-1, 0], [0, 1], [0, -1],
          [1, 1], [1, -1], [-1, 1], [-1, -1]
        ];

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

        // Add castling moves only if requested
        if (includeCastling) {
          this.addCastlingMoves(from, piece.color, moves);
        }
        break;
    }

    return moves;
  }

  private analyzeMoveType(from: Position, to: Position, promotionPiece?: PieceType): ValidMoveResult {
    const piece = this.getPiece(from);
    if (!piece || piece.color !== this.currentPlayer) {
      return { valid: false };
    }

    const validMoves = this.getValidMoves(from);
    const isValidMove = validMoves.some(move => move.file === to.file && move.rank === to.rank);

    if (!isValidMove) {
      return { valid: false };
    }

    const targetPiece = this.getPiece(to);
    let type: 'normal' | 'capture' | 'castling' | 'enPassant' | 'promotion' = 'normal';
    let capturedPiece: Piece | undefined;
    let additionalMoves: Array<{from: Position, to: Position, piece: Piece}> = [];
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
          piece: rook
        });
      }
    } else if (piece.type === PieceType.Pawn) {
      const promotionRank = piece.color === Color.White ? 7 : 0;
      const direction = piece.color === Color.White ? 1 : -1;

      // Check for en passant
      if (this.enPassantTarget && 
          to.file === this.enPassantTarget.file && 
          to.rank === this.enPassantTarget.rank) {
        type = 'enPassant';
        const capturedPawnRank = to.rank - direction;
        capturedPiece = this.getPiece({ file: to.file, rank: capturedPawnRank }) || undefined;
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
      promotionRequired
    };
  }

  public isValidMove(from: Position, to: Position, promotionPiece?: PieceType): ValidMoveResult {
    return this.analyzeMoveType(from, to, promotionPiece);
  }

  public makeMove(from: Position, to: Position, promotionPiece?: PieceType): MoveResult {
    // First analyze the move to get rich information
    const analysis = this.analyzeMoveType(from, to, promotionPiece);
    
    if (!analysis.valid) {
      return {
        success: false,
        promotionRequired: analysis.promotionRequired
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
      this.board[to.rank][to.file] = { type: promotionPiece!, color: piece.color };
      this.board[from.rank][from.file] = null;
    } else {
      // Handle normal moves and captures
      // Check for double pawn move (sets en passant target)
      if (piece.type === PieceType.Pawn && Math.abs(to.rank - from.rank) === 2) {
        const direction = piece.color === Color.White ? 1 : -1;
        this.enPassantTarget = { file: to.file, rank: from.rank + direction };
      }

      // Regular move or capture
      this.board[to.rank][to.file] = piece;
      this.board[from.rank][from.file] = null;

      // Update castling rights for king and rook moves
      this.updateCastlingRights(from.file, from.rank, piece);
    }

    // Record the move
    this.lastMove = { fromFile: from.file, fromRank: from.rank, toFile: to.file, toRank: to.rank };

    // Switch players
    this.currentPlayer = this.currentPlayer === Color.White ? Color.Black : Color.White;

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
      checkStatus
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
          if (moves.some(move => move.file === kingPosition!.file && move.rank === kingPosition!.rank)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  private updateCastlingRights(fromFile: number, fromRank: number, piece: Piece): void {
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


  public resetGame(): void {
    this.board = this.createEmptyBoard();
    this.currentPlayer = Color.White;
    this.enPassantTarget = null;
    this.lastMove = null;
    this.castlingRights = {
      whiteKingSide: true,
      whiteQueenSide: true,
      blackKingSide: true,
      blackQueenSide: true,
    };
    this.setupInitialPosition();
  }
}
