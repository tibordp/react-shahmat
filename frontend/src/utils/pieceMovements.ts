import { Piece, Position, PieceType, Color } from '../engine/jsChessEngine';

/**
 * Calculate basic movement patterns for a chess piece.
 * This is used for pre-moves and only considers piece type movement patterns,
 * not game rules like check, pins, etc.
 */
export function calculateBasicPieceMovements(
  piece: Piece, 
  file: number, 
  rank: number, 
  board: (Piece | null)[][]
): Position[] {
  const moves: Position[] = [];
  
  switch (piece.type) {
    case PieceType.Pawn:
      const direction = piece.color === Color.White ? 1 : -1;
      const startRank = piece.color === Color.White ? 1 : 6;
      
      // Forward move - don't check for blocking since board state will change
      if (rank + direction >= 0 && rank + direction <= 7) {
        moves.push({ file, rank: rank + direction });
        
        // Double move from start position
        if (rank === startRank && rank + 2 * direction >= 0 && rank + 2 * direction <= 7) {
          moves.push({ file, rank: rank + 2 * direction });
        }
      }
      
      // Diagonal captures - for pre-moves, show all diagonal squares
      [-1, 1].forEach(df => {
        const newFile = file + df;
        const newRank = rank + direction;
        if (newFile >= 0 && newFile <= 7 && newRank >= 0 && newRank <= 7) {
          moves.push({ file: newFile, rank: newRank });
        }
      });
      break;
      
    case PieceType.Rook:
      // Horizontal and vertical moves only
      [[-1,0], [1,0], [0,-1], [0,1]].forEach(([df, dr]) => {
        for (let i = 1; i < 8; i++) {
          const newFile = file + df * i;
          const newRank = rank + dr * i;
          if (newFile < 0 || newFile > 7 || newRank < 0 || newRank > 7) break;
          moves.push({ file: newFile, rank: newRank });
        }
      });
      break;
      
    case PieceType.Knight:
      // L-shaped moves
      [[-2,-1], [-2,1], [-1,-2], [-1,2], [1,-2], [1,2], [2,-1], [2,1]].forEach(([df, dr]) => {
        const newFile = file + df;
        const newRank = rank + dr;
        if (newFile >= 0 && newFile <= 7 && newRank >= 0 && newRank <= 7) {
          moves.push({ file: newFile, rank: newRank });
        }
      });
      break;
      
    case PieceType.Bishop:
      // Diagonal moves only
      [[-1,-1], [-1,1], [1,-1], [1,1]].forEach(([df, dr]) => {
        for (let i = 1; i < 8; i++) {
          const newFile = file + df * i;
          const newRank = rank + dr * i;
          if (newFile < 0 || newFile > 7 || newRank < 0 || newRank > 7) break;
          moves.push({ file: newFile, rank: newRank });
        }
      });
      break;
      
    case PieceType.Queen:
      // Combination of rook and bishop moves
      [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]].forEach(([df, dr]) => {
        for (let i = 1; i < 8; i++) {
          const newFile = file + df * i;
          const newRank = rank + dr * i;
          if (newFile < 0 || newFile > 7 || newRank < 0 || newRank > 7) break;
          moves.push({ file: newFile, rank: newRank });
        }
      });
      break;
      
    case PieceType.King:
      // One square in any direction
      [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]].forEach(([df, dr]) => {
        const newFile = file + df;
        const newRank = rank + dr;
        if (newFile >= 0 && newFile <= 7 && newRank >= 0 && newRank <= 7) {
          moves.push({ file: newFile, rank: newRank });
        }
      });
      
      // Add castling squares for pre-moves
      // For pre-moves, we don't check castling rights or check conditions
      // The engine will validate when the pre-move actually executes
      const homeRank = piece.color === Color.White ? 0 : 7;
      if (rank === homeRank && file === 4) {
        // King side castling (e1-g1 for white, e8-g8 for black)
        moves.push({ file: 6, rank: homeRank });
        // Queen side castling (e1-c1 for white, e8-c8 for black)  
        moves.push({ file: 2, rank: homeRank });
      }
      break;
  }
  
  return moves;
}