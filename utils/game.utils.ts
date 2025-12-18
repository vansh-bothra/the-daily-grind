import {
    Position,
    EmployeePosition,
    Tile,
    Employee,
    LevelConfig,
    TileTypeConfig,
    EmployeeTypeConfig,
} from '@/types/game.types';

// ============================================================================
// GAME LOGIC UTILITIES
// ============================================================================

/**
 * Creates initial tiles for a given level configuration
 * Regular tiles are numbered 1-14, coffee tile is numbered 15
 * The special tile (e.g., coffee) is placed in the middle
 * One tile is left empty (bottom-right corner)
 */
export const createInitialTiles = (level: LevelConfig): Tile[] => {
    const tiles: Tile[] = [];
    let id = 0;
    const gridSize = level.gridSize;
    const middleTileIndex = Math.floor((gridSize * gridSize) / 2);
    const specialTileId = level.specialTileId || level.tileTypes[0].id;
    const totalTiles = (gridSize * gridSize) - 1; // Total tiles excluding empty slot (15 for 4x4)

    // First pass: create all tiles with positions
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            // Skip the empty slot (bottom-right corner)
            if (row === gridSize - 1 && col === gridSize - 1) {
                continue;
            }
            
            // Determine tile type - special tile in middle, regular tiles elsewhere
            const isSpecialTile = id === middleTileIndex;
            const tileTypeId = isSpecialTile ? specialTileId : 'regular';
            
            tiles.push({
                id: id++,
                value: 0, // Will be assigned in second pass
                position: { row, col },
                tileTypeId: tileTypeId,
            });
        }
    }

    // Second pass: assign values (1-14 for regular tiles, 15 for special tile)
    let regularValueCounter = 1;
    tiles.forEach(tile => {
        if (tile.tileTypeId === 'regular') {
            tile.value = regularValueCounter++;
        } else {
            tile.value = totalTiles; // 15 for 4x4 grid
        }
    });

    return tiles;
};

/**
 * Shuffles tiles by performing random valid moves
 * This ensures the puzzle is always solvable
 */
export const shuffleTiles = (tiles: Tile[], gridSize: number): Tile[] => {
    const shuffled = [...tiles];
    const emptyPos = { row: gridSize - 1, col: gridSize - 1 };

    // Perform random valid moves (more moves for larger grids)
    const shuffleMoves = gridSize * 25; // 100 for 4x4, 150 for 6x6, 200 for 8x8
    for (let i = 0; i < shuffleMoves; i++) {
        const validMoves = getValidMoves(emptyPos, gridSize);
        const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];

        const tileToMove = shuffled.find(
            t => t.position.row === randomMove.row && t.position.col === randomMove.col
        );

        if (tileToMove) {
            const temp = { ...tileToMove.position };
            tileToMove.position = { ...emptyPos };
            emptyPos.row = temp.row;
            emptyPos.col = temp.col;
        }
    }

    return shuffled;
};

/**
 * Gets valid moves for a tile (positions adjacent to empty slot)
 */
export const getValidMoves = (emptyPos: Position, gridSize: number): Position[] => {
    const moves: Position[] = [];
    const { row, col } = emptyPos;

    if (row > 0) moves.push({ row: row - 1, col });
    if (row < gridSize - 1) moves.push({ row: row + 1, col });
    if (col > 0) moves.push({ row, col: col - 1 });
    if (col < gridSize - 1) moves.push({ row, col: col + 1 });

    return moves;
};

/**
 * Creates employees for a given level configuration
 * Distributes them evenly around the grid (top, right, bottom, left)
 * If multiple employee types exist, randomly assigns types
 * Assigns employee images and names if available
 */
export const createEmployees = (level: LevelConfig): Employee[] => {
    const employees: Employee[] = [];
    let id = 0;
    const employeesPerSide = level.employeesPerSide;
    const positions: EmployeePosition[] = ['top', 'right', 'bottom', 'left'];

    positions.forEach(position => {
        for (let i = 0; i < employeesPerSide; i++) {
            // Randomly assign employee type from available types
            const randomTypeIndex = Math.floor(Math.random() * level.employeeTypes.length);
            const employeeType = level.employeeTypes[randomTypeIndex];
            
            // Assign image URL and name (employee-1.jpg through employee-16.jpg)
            const employeeNumber = (id % 16) + 1;
            const imageUrl = `/employees/employee-${employeeNumber}.jpg`;
            const name = `Employee ${employeeNumber}`;
            
            employees.push({
                id: id++,
                position,
                index: i,
                employeeTypeId: employeeType.id,
                imageUrl,
                name,
            });
        }
    });

    return employees;
};

/**
 * Gets the target cell position for an employee based on their position around the grid
 */
export const getTargetCell = (employee: Employee, gridSize: number): Position => {
    switch (employee.position) {
        case 'top':
            return { row: 0, col: employee.index };
        case 'bottom':
            return { row: gridSize - 1, col: employee.index };
        case 'left':
            return { row: employee.index, col: 0 };
        case 'right':
            return { row: employee.index, col: gridSize - 1 };
    }
};

/**
 * Checks if a tile can be "poured" (delivered) to an employee
 * Validates:
 * 1. Tile is at the target cell
 * 2. Employee type accepts this tile type (matching rules)
 */
export const checkCanPour = (
    tile: Tile,
    targetCell: Position,
    employee: Employee,
    tileTypes: Record<string, TileTypeConfig>,
    employeeTypes: Record<string, EmployeeTypeConfig>
): { canPour: boolean; direction: EmployeePosition | null } => {
    const { row: tileRow, col: tileCol } = tile.position;
    const { row: targetRow, col: targetCol } = targetCell;

    // Check if tile is AT the target cell (edge cell)
    if (tileRow !== targetRow || tileCol !== targetCol) {
        return { canPour: false, direction: null };
    }

    // Check if employee type accepts this tile type (matching rules)
    const tileType = tileTypes[tile.tileTypeId];
    const employeeType = employeeTypes[employee.employeeTypeId];
    
    if (!tileType || !employeeType) {
        return { canPour: false, direction: null };
    }

    // Verify the tile's target employee type matches the actual employee type
    const isMatch = employeeType.acceptsTileTypes.includes(tile.tileTypeId);
    
    if (isMatch) {
        return { canPour: true, direction: employee.position };
    }

    return { canPour: false, direction: null };
};

/**
 * Checks if the puzzle is solved (tiles are in correct order)
 * Tiles should be arranged from 1-15 in order, with empty slot at bottom-right
 */
export const isPuzzleSolved = (tiles: Tile[], emptyPos: Position, gridSize: number): boolean => {
    const totalTiles = gridSize * gridSize - 1; // 15 for 4x4
    
    // Check if empty slot is in correct position (bottom-right)
    if (emptyPos.row !== gridSize - 1 || emptyPos.col !== gridSize - 1) {
        return false;
    }
    
    // Check if all tiles are in correct positions
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            // Skip empty slot
            if (row === gridSize - 1 && col === gridSize - 1) {
                continue;
            }
            
            // Find tile at this position
            const tile = tiles.find(t => t.position.row === row && t.position.col === col);
            if (!tile) {
                return false;
            }
            
            // Calculate expected value for this position
            const expectedValue = row * gridSize + col + 1;
            
            // Check if tile value matches expected value
            if (tile.value !== expectedValue) {
                return false;
            }
        }
    }
    
    return true;
};

