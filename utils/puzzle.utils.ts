import { Cell, Piece, PieceShape, BoardLayout } from '@/types/puzzle.types';

// Month names for the board
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Helper function to generate all rotations and flips for a piece shape
function generateAllOrientations(baseShape: PieceShape): PieceShape[] {
    const orientations: PieceShape[] = [];
    const seen = new Set<string>();
    
    const addOrientation = (cells: { row: number; col: number }[]) => {
        // Normalize to top-left corner
        const minRow = Math.min(...cells.map(c => c.row));
        const minCol = Math.min(...cells.map(c => c.col));
        const normalized = cells.map(c => ({ row: c.row - minRow, col: c.col - minCol }));
        
        // Create signature
        const signature = normalized.map(c => `${c.row},${c.col}`).sort().join('|');
        
        if (!seen.has(signature)) {
            seen.add(signature);
            orientations.push({ cells: normalized });
        }
    };
    
    const { cells } = baseShape;
    
    // Original
    addOrientation(cells);
    
    // Rotate 90° (clockwise)
    addOrientation(cells.map(c => ({ row: c.col, col: -c.row })));
    
    // Rotate 180°
    addOrientation(cells.map(c => ({ row: -c.row, col: -c.col })));
    
    // Rotate 270°
    addOrientation(cells.map(c => ({ row: -c.col, col: c.row })));
    
    // Flip horizontal
    addOrientation(cells.map(c => ({ row: c.row, col: -c.col })));
    
    // Flip horizontal + rotate 90°
    addOrientation(cells.map(c => ({ row: -c.col, col: -c.row })));
    
    // Flip horizontal + rotate 180°
    addOrientation(cells.map(c => ({ row: -c.row, col: c.col })));
    
    // Flip horizontal + rotate 270°
    addOrientation(cells.map(c => ({ row: c.col, col: c.row })));
    
    return orientations;
}

// Define the 8 puzzle pieces with exact specifications
// Note: Coordinates are (col, row) format, converting to { row, col } objects
export const PUZZLE_PIECES: Omit<Piece, 'placed' | 'position'>[] = [
    {
        id: 'piece-1',
        name: 'Blue',
        color: 'from-blue-500 to-blue-600',
        currentRotation: 0,
        shapes: generateAllOrientations({ 
            cells: [
                { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, 
                { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }
            ] 
        })
    },
    {
        id: 'piece-2',
        name: 'Orange',
        color: 'from-orange-500 to-orange-600',
        currentRotation: 0,
        shapes: generateAllOrientations({ 
            cells: [
                { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }, 
                { row: 1, col: 0 }
            ] 
        })
    },
    {
        id: 'piece-3',
        name: 'Purple',
        color: 'from-purple-500 to-purple-600',
        currentRotation: 0,
        shapes: generateAllOrientations({ 
            cells: [
                { row: 0, col: 3 }, { row: 0, col: 2 }, 
                { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }
            ] 
        })
    },
    {
        id: 'piece-4',
        name: 'Green',
        color: 'from-green-500 to-green-600',
        currentRotation: 0,
        shapes: generateAllOrientations({ 
            cells: [
                { row: 0, col: 0 }, 
                { row: 1, col: 0 }, 
                { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }
            ] 
        })
    },
    {
        id: 'piece-5',
        name: 'Pink',
        color: 'from-pink-500 to-pink-600',
        currentRotation: 0,
        shapes: generateAllOrientations({ 
            cells: [
                { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, 
                { row: 1, col: 1 }, { row: 1, col: 2 }
            ] 
        })
    },
    {
        id: 'piece-6',
        name: 'Lime',
        color: 'from-lime-500 to-lime-600',
        currentRotation: 0,
        shapes: generateAllOrientations({ 
            cells: [
                { row: 0, col: 0 }, { row: 0, col: 1 }, 
                { row: 1, col: 1 }, 
                { row: 2, col: 1 }, { row: 2, col: 2 }
            ] 
        })
    },
    {
        id: 'piece-7',
        name: 'Grey',
        color: 'from-gray-400 to-gray-500',
        currentRotation: 0,
        shapes: generateAllOrientations({ 
            cells: [
                { row: 0, col: 0 }, { row: 0, col: 2 }, 
                { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }
            ] 
        })
    },
    {
        id: 'piece-8',
        name: 'Red',
        color: 'from-red-500 to-red-600',
        currentRotation: 0,
        shapes: generateAllOrientations({ 
            cells: [
                { row: 0, col: 0 }, { row: 1, col: 1 }, 
                { row: 1, col: 0 }, 
                { row: 2, col: 0 }, 
                { row: 3, col: 0 }
            ] 
        })
    },
];

// Create the rectangular board layout (7x7 grid with blocked spaces)
export function createRectangularBoard(targetDate: Date): Cell[] {
    const board: Cell[] = [];
    let cellId = 0;

    const month = targetDate.getMonth(); // 0-11
    const date = targetDate.getDate(); // 1-31

    // Row 0: Jan-Jun (6 cells) + 1 empty
    for (let col = 0; col < 6; col++) {
        board.push({
            id: `cell-${cellId++}`,
            row: 0,
            col,
            type: 'month',
            value: MONTHS[col],
            isTarget: col === month,
            isCovered: false,
        });
    }
    board.push({
        id: `cell-${cellId++}`,
        row: 0,
        col: 6,
        type: 'empty',
        isCovered: false,
    });

    // Row 1: Jul-Dec (6 cells) + 1 empty
    for (let col = 0; col < 6; col++) {
        board.push({
            id: `cell-${cellId++}`,
            row: 1,
            col,
            type: 'month',
            value: MONTHS[6 + col],
            isTarget: (6 + col) === month,
            isCovered: false,
        });
    }
    board.push({
        id: `cell-${cellId++}`,
        row: 1,
        col: 6,
        type: 'empty',
        isCovered: false,
    });

    // Row 2: 1-7 (7 cells)
    for (let col = 0; col < 7; col++) {
        board.push({
            id: `cell-${cellId++}`,
            row: 2,
            col,
            type: 'date',
            value: col + 1,
            isTarget: (col + 1) === date,
            isCovered: false,
        });
    }

    // Row 3: 8-14 (7 cells)
    for (let col = 0; col < 7; col++) {
        board.push({
            id: `cell-${cellId++}`,
            row: 3,
            col,
            type: 'date',
            value: 8 + col,
            isTarget: (8 + col) === date,
            isCovered: false,
        });
    }

    // Row 4: 15-21 (7 cells)
    for (let col = 0; col < 7; col++) {
        board.push({
            id: `cell-${cellId++}`,
            row: 4,
            col,
            type: 'date',
            value: 15 + col,
            isTarget: (15 + col) === date,
            isCovered: false,
        });
    }

    // Row 5: 22-28 (7 cells)
    for (let col = 0; col < 7; col++) {
        board.push({
            id: `cell-${cellId++}`,
            row: 5,
            col,
            type: 'date',
            value: 22 + col,
            isTarget: (22 + col) === date,
            isCovered: false,
        });
    }

    // Row 6: 29-31 (3 cells) + 4 empty
    for (let col = 0; col < 3; col++) {
        board.push({
            id: `cell-${cellId++}`,
            row: 6,
            col,
            type: 'date',
            value: 29 + col,
            isTarget: (29 + col) === date,
            isCovered: false,
        });
    }
    for (let col = 3; col < 7; col++) {
        board.push({
            id: `cell-${cellId++}`,
            row: 6,
            col,
            type: 'empty',
            isCovered: false,
        });
    }

    return board;
}

// Create hexagonal board layout (with empty corners for visual variety)
export function createHexagonalBoard(targetDate: Date): Cell[] {
    const board: Cell[] = [];
    let cellId = 0;

    const month = targetDate.getMonth();
    const date = targetDate.getDate();

    // Row 0: 1 empty, Jan-Jun (5 cells), 1 empty
    board.push({
        id: `cell-${cellId++}`,
        row: 0,
        col: 0,
        type: 'empty',
        isCovered: false,
    });
    for (let col = 1; col < 6; col++) {
        board.push({
            id: `cell-${cellId++}`,
            row: 0,
            col,
            type: 'month',
            value: MONTHS[col - 1],
            isTarget: (col - 1) === month,
            isCovered: false,
        });
    }
    board.push({
        id: `cell-${cellId++}`,
        row: 0,
        col: 6,
        type: 'empty',
        isCovered: false,
    });

    // Row 1: Jul-Dec (6 cells), 1 empty
    for (let col = 0; col < 6; col++) {
        const monthIdx = 5 + col;
        if (monthIdx < 12) {
            board.push({
                id: `cell-${cellId++}`,
                row: 1,
                col,
                type: 'month',
                value: MONTHS[monthIdx],
                isTarget: monthIdx === month,
                isCovered: false,
            });
        }
    }
    board.push({
        id: `cell-${cellId++}`,
        row: 1,
        col: 6,
        type: 'empty',
        isCovered: false,
    });

    // Row 2: 1-7 (7 cells)
    for (let col = 0; col < 7; col++) {
        board.push({
            id: `cell-${cellId++}`,
            row: 2,
            col,
            type: 'date',
            value: col + 1,
            isTarget: (col + 1) === date,
            isCovered: false,
        });
    }

    // Row 3: 8-14 (7 cells)
    for (let col = 0; col < 7; col++) {
        board.push({
            id: `cell-${cellId++}`,
            row: 3,
            col,
            type: 'date',
            value: 8 + col,
            isTarget: (8 + col) === date,
            isCovered: false,
        });
    }

    // Row 4: 15-21 (7 cells)
    for (let col = 0; col < 7; col++) {
        board.push({
            id: `cell-${cellId++}`,
            row: 4,
            col,
            type: 'date',
            value: 15 + col,
            isTarget: (15 + col) === date,
            isCovered: false,
        });
    }

    // Row 5: 22-28 (7 cells)
    for (let col = 0; col < 7; col++) {
        board.push({
            id: `cell-${cellId++}`,
            row: 5,
            col,
            type: 'date',
            value: 22 + col,
            isTarget: (22 + col) === date,
            isCovered: false,
        });
    }

    // Row 6: 1 empty, 29-31 (3 cells), 3 empty
    board.push({
        id: `cell-${cellId++}`,
        row: 6,
        col: 0,
        type: 'empty',
        isCovered: false,
    });
    for (let col = 1; col < 4; col++) {
        board.push({
            id: `cell-${cellId++}`,
            row: 6,
            col,
            type: 'date',
            value: 28 + col,
            isTarget: (28 + col) === date,
            isCovered: false,
        });
    }
    for (let col = 4; col < 7; col++) {
        board.push({
            id: `cell-${cellId++}`,
            row: 6,
            col,
            type: 'empty',
            isCovered: false,
        });
    }

    return board;
}

// Check if a piece can be placed at a position (strict validation)
export function canPlacePiece(
    piece: Piece,
    position: { row: number; col: number },
    board: Cell[]
): boolean {
    const shape = piece.shapes[piece.currentRotation];
    
    for (const cell of shape.cells) {
        const targetRow = position.row + cell.row;
        const targetCol = position.col + cell.col;
        
        // Strict bounds checking - must be within 7x7 grid
        if (targetRow < 0 || targetRow >= 7 || targetCol < 0 || targetCol >= 7) {
            return false;
        }
        
        // Find the board cell at this exact position
        const boardCell = board.find(c => c.row === targetRow && c.col === targetCol);
        
        // Cell must exist, not be empty type, and not be already covered by another piece
        if (!boardCell || boardCell.type === 'empty' || (boardCell.isCovered && boardCell.coveredBy !== piece.id)) {
            return false;
        }
    }
    
    return true;
}

// Place a piece on the board
export function placePiece(
    piece: Piece,
    position: { row: number; col: number },
    board: Cell[]
): Cell[] {
    const newBoard = board.map(cell => ({ ...cell }));
    const shape = piece.shapes[piece.currentRotation];
    
    for (const cell of shape.cells) {
        const targetRow = position.row + cell.row;
        const targetCol = position.col + cell.col;
        
        const boardCell = newBoard.find(c => c.row === targetRow && c.col === targetCol);
        if (boardCell) {
            boardCell.isCovered = true;
            boardCell.coveredBy = piece.id;
        }
    }
    
    return newBoard;
}

// Remove a piece from the board
export function removePiece(pieceId: string, board: Cell[]): Cell[] {
    return board.map(cell => ({
        ...cell,
        isCovered: cell.coveredBy === pieceId ? false : cell.isCovered,
        coveredBy: cell.coveredBy === pieceId ? undefined : cell.coveredBy,
    }));
}

// Check if puzzle is solved
export function isPuzzleSolved(board: Cell[]): boolean {
    // All non-empty, non-target cells should be covered
    const uncoveredNonTarget = board.filter(
        cell => cell.type !== 'empty' && !cell.isTarget && !cell.isCovered
    );
    
    // All target cells should NOT be covered
    const coveredTarget = board.filter(
        cell => cell.isTarget && cell.isCovered
    );
    
    return uncoveredNonTarget.length === 0 && coveredTarget.length === 0;
}

// Get available dates (today and previous 5 days)
export function getAvailableDates(): Date[] {
    const dates: Date[] = [];
    const today = new Date();
    
    for (let i = 0; i < 6; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        dates.push(date);
    }
    
    return dates;
}

// Format date for display
export function formatDate(date: Date): string {
    const month = MONTHS[date.getMonth()];
    const day = date.getDate();
    
    return `${month} ${day}`;
}

