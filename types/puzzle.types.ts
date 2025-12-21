// Puzzle-a-day game types

export type CellType = 'month' | 'date' | 'empty';

export interface Cell {
    id: string;
    row: number;
    col: number;
    type: CellType;
    value?: string | number;
    isTarget?: boolean; // The 3 cells that should remain uncovered
    isCovered?: boolean; // Whether a piece is covering this cell
    coveredBy?: string; // ID of the piece covering this cell
}

export interface PieceShape {
    cells: { row: number; col: number }[]; // Relative positions
}

export interface Piece {
    id: string;
    name: string;
    color: string;
    shapes: PieceShape[]; // Different rotations
    currentRotation: number;
    placed: boolean;
    position?: { row: number; col: number }; // Position on board (top-left of piece)
}

export type BoardLayout = 'rectangular';

export interface PuzzleState {
    board: Cell[];
    pieces: Piece[];
    selectedPiece: string | null;
    targetDate: Date;
    layout: BoardLayout;
    solved: boolean;
}

