use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

#[wasm_bindgen]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum PieceType {
    Pawn,
    Rook,
    Knight,
    Bishop,
    Queen,
    King,
}

#[wasm_bindgen]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Color {
    White,
    Black,
}

#[wasm_bindgen]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Piece {
    piece_type: PieceType,
    color: Color,
}

#[wasm_bindgen]
impl Piece {
    #[wasm_bindgen(constructor)]
    pub fn new(piece_type: PieceType, color: Color) -> Piece {
        Piece { piece_type, color }
    }

    #[wasm_bindgen(getter = piece_type)]
    pub fn get_piece_type(&self) -> PieceType {
        self.piece_type
    }

    #[wasm_bindgen(getter = color)]
    pub fn get_color(&self) -> Color {
        self.color
    }
}

#[wasm_bindgen]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Position {
    file: u8, // 0-7 (a-h)
    rank: u8, // 0-7 (1-8)
}

#[wasm_bindgen]
impl Position {
    #[wasm_bindgen(constructor)]
    pub fn new(file: u8, rank: u8) -> Result<Position, JsValue> {
        if file > 7 || rank > 7 {
            return Err(JsValue::from_str("Invalid position"));
        }
        Ok(Position { file, rank })
    }

    #[wasm_bindgen(getter = file)]
    pub fn get_file(&self) -> u8 {
        self.file
    }

    #[wasm_bindgen(getter = rank)]
    pub fn get_rank(&self) -> u8 {
        self.rank
    }

    pub fn to_algebraic(&self) -> String {
        let file_char = (b'a' + self.file) as char;
        let rank_char = (b'1' + self.rank) as char;
        format!("{}{}", file_char, rank_char)
    }
}

#[wasm_bindgen]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Move {
    from: Position,
    to: Position,
    promotion: Option<PieceType>,
}

#[wasm_bindgen]
impl Move {
    #[wasm_bindgen(constructor)]
    pub fn new(from: Position, to: Position, promotion: Option<PieceType>) -> Move {
        Move { from, to, promotion }
    }

    #[wasm_bindgen(getter = from)]
    pub fn get_from(&self) -> Position {
        self.from
    }

    #[wasm_bindgen(getter = to)]
    pub fn get_to(&self) -> Position {
        self.to
    }

    #[wasm_bindgen(getter = promotion)]
    pub fn get_promotion(&self) -> Option<PieceType> {
        self.promotion
    }
}

#[wasm_bindgen]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ChessBoard {
    board: [[Option<Piece>; 8]; 8],
    current_player: Color,
    white_king_moved: bool,
    black_king_moved: bool,
    white_rook_a_moved: bool,
    white_rook_h_moved: bool,
    black_rook_a_moved: bool,
    black_rook_h_moved: bool,
    en_passant_target: Option<Position>,
}

#[wasm_bindgen]
impl ChessBoard {
    #[wasm_bindgen(constructor)]
    pub fn new() -> ChessBoard {
        let mut board = ChessBoard {
            board: [[None; 8]; 8],
            current_player: Color::White,
            white_king_moved: false,
            black_king_moved: false,
            white_rook_a_moved: false,
            white_rook_h_moved: false,
            black_rook_a_moved: false,
            black_rook_h_moved: false,
            en_passant_target: None,
        };
        board.setup_initial_position();
        board
    }

    pub fn setup_initial_position(&mut self) {
        // Clear board
        self.board = [[None; 8]; 8];

        // Place pawns
        for file in 0..8 {
            self.board[1][file] = Some(Piece::new(PieceType::Pawn, Color::White));
            self.board[6][file] = Some(Piece::new(PieceType::Pawn, Color::Black));
        }

        // Place pieces for white
        self.board[0][0] = Some(Piece::new(PieceType::Rook, Color::White));
        self.board[0][1] = Some(Piece::new(PieceType::Knight, Color::White));
        self.board[0][2] = Some(Piece::new(PieceType::Bishop, Color::White));
        self.board[0][3] = Some(Piece::new(PieceType::Queen, Color::White));
        self.board[0][4] = Some(Piece::new(PieceType::King, Color::White));
        self.board[0][5] = Some(Piece::new(PieceType::Bishop, Color::White));
        self.board[0][6] = Some(Piece::new(PieceType::Knight, Color::White));
        self.board[0][7] = Some(Piece::new(PieceType::Rook, Color::White));

        // Place pieces for black
        self.board[7][0] = Some(Piece::new(PieceType::Rook, Color::Black));
        self.board[7][1] = Some(Piece::new(PieceType::Knight, Color::Black));
        self.board[7][2] = Some(Piece::new(PieceType::Bishop, Color::Black));
        self.board[7][3] = Some(Piece::new(PieceType::Queen, Color::Black));
        self.board[7][4] = Some(Piece::new(PieceType::King, Color::Black));
        self.board[7][5] = Some(Piece::new(PieceType::Bishop, Color::Black));
        self.board[7][6] = Some(Piece::new(PieceType::Knight, Color::Black));
        self.board[7][7] = Some(Piece::new(PieceType::Rook, Color::Black));
    }

    #[wasm_bindgen(getter = current_player)]
    pub fn get_current_player(&self) -> Color {
        self.current_player
    }

    pub fn get_piece(&self, position: Position) -> Option<Piece> {
        self.board[position.rank as usize][position.file as usize]
    }

    pub fn get_valid_moves(&self, from: Position) -> Vec<Position> {
        let piece = match self.get_piece(from) {
            Some(piece) => piece,
            None => return Vec::new(),
        };

        if piece.color != self.current_player {
            return Vec::new();
        }

        let mut moves = Vec::new();

        match piece.piece_type {
            PieceType::Pawn => {
                self.get_pawn_moves(from, piece.color, &mut moves);
            }
            PieceType::Rook => {
                self.get_rook_moves(from, piece.color, &mut moves);
            }
            PieceType::Knight => {
                self.get_knight_moves(from, piece.color, &mut moves);
            }
            PieceType::Bishop => {
                self.get_bishop_moves(from, piece.color, &mut moves);
            }
            PieceType::Queen => {
                self.get_queen_moves(from, piece.color, &mut moves);
            }
            PieceType::King => {
                self.get_king_moves(from, piece.color, &mut moves);
            }
        }

        moves
    }

    fn get_pawn_moves(&self, from: Position, color: Color, moves: &mut Vec<Position>) {
        let direction = if color == Color::White { 1 } else { -1 };
        let start_rank = if color == Color::White { 1 } else { 6 };

        // Forward move
        let new_rank = from.rank as i8 + direction;
        if new_rank >= 0 && new_rank <= 7 {
            let forward_pos = Position { file: from.file, rank: new_rank as u8 };
            if self.get_piece(forward_pos).is_none() {
                moves.push(forward_pos);

                // Double forward from starting position
                if from.rank == start_rank {
                    let double_forward_rank = new_rank + direction;
                    if double_forward_rank >= 0 && double_forward_rank <= 7 {
                        let double_forward_pos = Position { file: from.file, rank: double_forward_rank as u8 };
                        if self.get_piece(double_forward_pos).is_none() {
                            moves.push(double_forward_pos);
                        }
                    }
                }
            }
        }

        // Capture moves
        for file_offset in [-1, 1] {
            let new_file = from.file as i8 + file_offset;
            let new_rank = from.rank as i8 + direction;
            
            if new_file >= 0 && new_file <= 7 && new_rank >= 0 && new_rank <= 7 {
                let capture_pos = Position { file: new_file as u8, rank: new_rank as u8 };
                if let Some(target_piece) = self.get_piece(capture_pos) {
                    if target_piece.color != color {
                        moves.push(capture_pos);
                    }
                }
            }
        }
    }

    fn get_rook_moves(&self, from: Position, color: Color, moves: &mut Vec<Position>) {
        let directions = [(0, 1), (0, -1), (1, 0), (-1, 0)];
        for (file_dir, rank_dir) in directions {
            self.get_sliding_moves(from, color, file_dir, rank_dir, moves);
        }
    }

    fn get_bishop_moves(&self, from: Position, color: Color, moves: &mut Vec<Position>) {
        let directions = [(1, 1), (1, -1), (-1, 1), (-1, -1)];
        for (file_dir, rank_dir) in directions {
            self.get_sliding_moves(from, color, file_dir, rank_dir, moves);
        }
    }

    fn get_queen_moves(&self, from: Position, color: Color, moves: &mut Vec<Position>) {
        self.get_rook_moves(from, color, moves);
        self.get_bishop_moves(from, color, moves);
    }

    fn get_knight_moves(&self, from: Position, color: Color, moves: &mut Vec<Position>) {
        let knight_moves = [
            (2, 1), (2, -1), (-2, 1), (-2, -1),
            (1, 2), (1, -2), (-1, 2), (-1, -2)
        ];

        for (file_offset, rank_offset) in knight_moves {
            let new_file = from.file as i8 + file_offset;
            let new_rank = from.rank as i8 + rank_offset;

            if new_file >= 0 && new_file <= 7 && new_rank >= 0 && new_rank <= 7 {
                let new_pos = Position { file: new_file as u8, rank: new_rank as u8 };
                if let Some(piece) = self.get_piece(new_pos) {
                    if piece.color != color {
                        moves.push(new_pos);
                    }
                } else {
                    moves.push(new_pos);
                }
            }
        }
    }

    fn get_king_moves(&self, from: Position, color: Color, moves: &mut Vec<Position>) {
        let king_moves = [
            (1, 0), (-1, 0), (0, 1), (0, -1),
            (1, 1), (1, -1), (-1, 1), (-1, -1)
        ];

        for (file_offset, rank_offset) in king_moves {
            let new_file = from.file as i8 + file_offset;
            let new_rank = from.rank as i8 + rank_offset;

            if new_file >= 0 && new_file <= 7 && new_rank >= 0 && new_rank <= 7 {
                let new_pos = Position { file: new_file as u8, rank: new_rank as u8 };
                if let Some(piece) = self.get_piece(new_pos) {
                    if piece.color != color {
                        moves.push(new_pos);
                    }
                } else {
                    moves.push(new_pos);
                }
            }
        }
    }

    fn get_sliding_moves(&self, from: Position, color: Color, file_dir: i8, rank_dir: i8, moves: &mut Vec<Position>) {
        let mut file = from.file as i8 + file_dir;
        let mut rank = from.rank as i8 + rank_dir;

        while file >= 0 && file <= 7 && rank >= 0 && rank <= 7 {
            let pos = Position { file: file as u8, rank: rank as u8 };
            
            if let Some(piece) = self.get_piece(pos) {
                if piece.color != color {
                    moves.push(pos);
                }
                break;
            } else {
                moves.push(pos);
            }

            file += file_dir;
            rank += rank_dir;
        }
    }

    pub fn make_move(&mut self, chess_move: Move) -> Result<bool, JsValue> {
        let from_piece = self.get_piece(chess_move.from)
            .ok_or_else(|| JsValue::from_str("No piece at source position"))?;

        if from_piece.color != self.current_player {
            return Err(JsValue::from_str("Not your turn"));
        }

        let valid_moves = self.get_valid_moves(chess_move.from);
        if !valid_moves.contains(&chess_move.to) {
            return Err(JsValue::from_str("Invalid move"));
        }

        // Make the move
        self.board[chess_move.to.rank as usize][chess_move.to.file as usize] = Some(from_piece);
        self.board[chess_move.from.rank as usize][chess_move.from.file as usize] = None;

        // Handle promotion
        if let Some(promotion_type) = chess_move.promotion {
            if from_piece.piece_type == PieceType::Pawn {
                let promotion_rank = if from_piece.color == Color::White { 7 } else { 0 };
                if chess_move.to.rank == promotion_rank {
                    self.board[chess_move.to.rank as usize][chess_move.to.file as usize] = 
                        Some(Piece::new(promotion_type, from_piece.color));
                }
            }
        }

        // Update castling rights
        if from_piece.piece_type == PieceType::King {
            match from_piece.color {
                Color::White => self.white_king_moved = true,
                Color::Black => self.black_king_moved = true,
            }
        } else if from_piece.piece_type == PieceType::Rook {
            match (from_piece.color, chess_move.from.file) {
                (Color::White, 0) => self.white_rook_a_moved = true,
                (Color::White, 7) => self.white_rook_h_moved = true,
                (Color::Black, 0) => self.black_rook_a_moved = true,
                (Color::Black, 7) => self.black_rook_h_moved = true,
                _ => {}
            }
        }

        // Switch players
        self.current_player = match self.current_player {
            Color::White => Color::Black,
            Color::Black => Color::White,
        };

        Ok(true)
    }

    pub fn to_fen(&self) -> String {
        let mut fen = String::new();

        // Board state
        for rank in (0..8).rev() {
            let mut empty_count = 0;
            for file in 0..8 {
                if let Some(piece) = self.board[rank][file] {
                    if empty_count > 0 {
                        fen.push_str(&empty_count.to_string());
                        empty_count = 0;
                    }
                    let piece_char = match (piece.piece_type, piece.color) {
                        (PieceType::Pawn, Color::White) => 'P',
                        (PieceType::Pawn, Color::Black) => 'p',
                        (PieceType::Rook, Color::White) => 'R',
                        (PieceType::Rook, Color::Black) => 'r',
                        (PieceType::Knight, Color::White) => 'N',
                        (PieceType::Knight, Color::Black) => 'n',
                        (PieceType::Bishop, Color::White) => 'B',
                        (PieceType::Bishop, Color::Black) => 'b',
                        (PieceType::Queen, Color::White) => 'Q',
                        (PieceType::Queen, Color::Black) => 'q',
                        (PieceType::King, Color::White) => 'K',
                        (PieceType::King, Color::Black) => 'k',
                    };
                    fen.push(piece_char);
                } else {
                    empty_count += 1;
                }
            }
            if empty_count > 0 {
                fen.push_str(&empty_count.to_string());
            }
            if rank > 0 {
                fen.push('/');
            }
        }

        // Active color
        fen.push(' ');
        fen.push(match self.current_player {
            Color::White => 'w',
            Color::Black => 'b',
        });

        // Castling availability
        fen.push(' ');
        let mut castling = String::new();
        if !self.white_king_moved && !self.white_rook_h_moved {
            castling.push('K');
        }
        if !self.white_king_moved && !self.white_rook_a_moved {
            castling.push('Q');
        }
        if !self.black_king_moved && !self.black_rook_h_moved {
            castling.push('k');
        }
        if !self.black_king_moved && !self.black_rook_a_moved {
            castling.push('q');
        }
        if castling.is_empty() {
            castling.push('-');
        }
        fen.push_str(&castling);

        // En passant target square
        fen.push(' ');
        if let Some(target) = self.en_passant_target {
            fen.push_str(&target.to_algebraic());
        } else {
            fen.push('-');
        }

        // Halfmove clock and fullmove number (simplified)
        fen.push_str(" 0 1");

        fen
    }
}