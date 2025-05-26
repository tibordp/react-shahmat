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

export class JSChessEngine {
  private board: (Piece | null)[][];
  private currentPlayer: Color;
  private enPassantTarget: Position | null; // Square where en passant capture can happen

  constructor() {
    this.board = this.createEmptyBoard();
    this.currentPlayer = Color.White;
    this.enPassantTarget = null;
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
    return this.board.map(row => row.map(piece => 
      piece ? { ...piece } : null
    ));
  }

  public getCurrentPlayer(): Color {
    return this.currentPlayer;
  }

  public getPiece(file: number, rank: number): Piece | null {
    if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
    return this.board[rank][file];
  }

  public getValidMoves(file: number, rank: number): Position[] {
    const piece = this.getPiece(file, rank);
    if (!piece || piece.color !== this.currentPlayer) return [];

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
        this.addKingMoves(from, piece.color, moves);
        break;
    }

    return moves;
  }

  private addPawnMoves(from: Position, color: Color, moves: Position[]): void {
    const direction = color === Color.White ? 1 : -1;
    const startRank = color === Color.White ? 1 : 6;

    // Forward move
    const newRank = from.rank + direction;
    if (this.isInBounds(from.file, newRank) && !this.getPiece(from.file, newRank)) {
      moves.push({ file: from.file, rank: newRank });

      // Double forward from starting position
      if (from.rank === startRank) {
        const doubleRank = newRank + direction;
        if (this.isInBounds(from.file, doubleRank) && !this.getPiece(from.file, doubleRank)) {
          moves.push({ file: from.file, rank: doubleRank });
        }
      }
    }

    // Capture moves
    for (const fileOffset of [-1, 1]) {
      const newFile = from.file + fileOffset;
      if (this.isInBounds(newFile, newRank)) {
        const target = this.getPiece(newFile, newRank);
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
        const target = this.getPiece(newFile, newRank);
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
        const target = this.getPiece(newFile, newRank);
        if (!target || target.color !== color) {
          moves.push({ file: newFile, rank: newRank });
        }
      }
    }
  }

  private addSlidingMoves(from: Position, color: Color, fileDir: number, rankDir: number, moves: Position[]): void {
    let file = from.file + fileDir;
    let rank = from.rank + rankDir;

    while (this.isInBounds(file, rank)) {
      const target = this.getPiece(file, rank);
      
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

  public makeMove(fromFile: number, fromRank: number, toFile: number, toRank: number, promotionPiece?: PieceType): boolean {
    const piece = this.getPiece(fromFile, fromRank);
    if (!piece || piece.color !== this.currentPlayer) return false;

    const validMoves = this.getValidMoves(fromFile, fromRank);
    const isValidMove = validMoves.some(move => move.file === toFile && move.rank === toRank);
    
    if (!isValidMove) return false;

    // Clear en passant target from previous turn
    const previousEnPassantTarget = this.enPassantTarget;
    this.enPassantTarget = null;

    // Handle pawn moves
    if (piece.type === PieceType.Pawn) {
      const promotionRank = piece.color === Color.White ? 7 : 0;
      const direction = piece.color === Color.White ? 1 : -1;
      
      // Check for en passant capture
      if (previousEnPassantTarget && 
          toFile === previousEnPassantTarget.file && 
          toRank === previousEnPassantTarget.rank) {
        // En passant capture - remove the captured pawn
        const capturedPawnRank = toRank - direction;
        this.board[capturedPawnRank][toFile] = null;
      }
      
      // Check for double pawn move (sets en passant target)
      if (Math.abs(toRank - fromRank) === 2) {
        this.enPassantTarget = { file: toFile, rank: fromRank + direction };
      }
      
      // Check if this is a promotion
      if (toRank === promotionRank) {
        if (!promotionPiece) {
          // Return false to indicate promotion is needed
          return false;
        }
        // Promote the pawn
        this.board[toRank][toFile] = { type: promotionPiece, color: piece.color };
      } else {
        // Regular pawn move
        this.board[toRank][toFile] = piece;
      }
      this.board[fromRank][fromFile] = null;
    } else {
      // Regular piece move
      this.board[toRank][toFile] = piece;
      this.board[fromRank][fromFile] = null;
    }

    // Switch players
    this.currentPlayer = this.currentPlayer === Color.White ? Color.Black : Color.White;

    return true;
  }

  public isPawnPromotion(fromFile: number, fromRank: number, toFile: number, toRank: number): boolean {
    const piece = this.getPiece(fromFile, fromRank);
    if (!piece || piece.type !== PieceType.Pawn) return false;
    
    const promotionRank = piece.color === Color.White ? 7 : 0;
    return toRank === promotionRank;
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
          const moves = this.getValidMoves(file, rank);
          if (moves.some(move => move.file === kingPosition!.file && move.rank === kingPosition!.rank)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  public resetGame(): void {
    this.board = this.createEmptyBoard();
    this.currentPlayer = Color.White;
    this.enPassantTarget = null;
    this.setupInitialPosition();
  }
}