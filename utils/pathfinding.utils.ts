import { Position, Tile } from '@/types/game.types';

/**
 * Check if a position is adjacent to any manager
 */
const isAdjacentToManager = (pos: Position, gridState: (number | null)[][], gridSize: number): boolean => {
    const directions = [
        { row: -1, col: 0 }, // up
        { row: 1, col: 0 },  // down
        { row: 0, col: -1 }, // left
        { row: 0, col: 1 }   // right
    ];
    
    for (const dir of directions) {
        const adjRow = pos.row + dir.row;
        const adjCol = pos.col + dir.col;
        
        // Check bounds
        if (adjRow >= 0 && adjRow < gridSize && adjCol >= 0 && adjCol < gridSize) {
            // Check if adjacent cell is a manager (-1)
            if (gridState[adjRow][adjCol] === -1) {
                return true;
            }
        }
    }
    
    return false;
};

/**
 * Calculate minimum number of moves to reach target using BFS
 * Considers manager tiles as obstacles that must be avoided
 * Also ensures the active tile never becomes adjacent to a manager
 */
export const calculateMinimumMoves = (
    tiles: Tile[],
    activeTile: Tile,
    targetCell: Position,
    emptyPos: Position,
    gridSize: number
): number => {
    // Create a grid representation
    const grid: (number | null)[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
    
    // Fill grid with tile IDs
    tiles.forEach(tile => {
        grid[tile.position.row][tile.position.col] = tile.id;
    });
    
    // Mark managers as obstacles (-1)
    tiles.forEach(tile => {
        if (tile.tileTypeId === 'manager') {
            grid[tile.position.row][tile.position.col] = -1;
        }
    });
    
    // Empty position
    grid[emptyPos.row][emptyPos.col] = 0;
    
    // Use BFS to find minimum moves
    // State: [activeTileRow, activeTileCol, emptyRow, emptyCol, moves]
    interface State {
        activePos: Position;
        emptyPos: Position;
        moves: number;
        gridState: (number | null)[][];
    }
    
    const queue: State[] = [{
        activePos: activeTile.position,
        emptyPos: emptyPos,
        moves: 0,
        gridState: grid.map(row => [...row])
    }];
    
    const visited = new Set<string>();
    const getStateKey = (activePos: Position, emptyPos: Position): string => 
        `${activePos.row},${activePos.col},${emptyPos.row},${emptyPos.col}`;
    
    visited.add(getStateKey(activeTile.position, emptyPos));
    
    const MAX_ITERATIONS = 10000; // Prevent infinite loops
    let iterations = 0;
    
    while (queue.length > 0 && iterations < MAX_ITERATIONS) {
        iterations++;
        const current = queue.shift()!;
        
        // Check if active tile reached target
        if (current.activePos.row === targetCell.row && current.activePos.col === targetCell.col) {
            return current.moves;
        }
        
        // Try moving empty space in all 4 directions
        const directions = [
            { row: -1, col: 0 }, // up
            { row: 1, col: 0 },  // down
            { row: 0, col: -1 }, // left
            { row: 0, col: 1 }   // right
        ];
        
        for (const dir of directions) {
            const newEmptyRow = current.emptyPos.row + dir.row;
            const newEmptyCol = current.emptyPos.col + dir.col;
            
            // Check bounds
            if (newEmptyRow < 0 || newEmptyRow >= gridSize || 
                newEmptyCol < 0 || newEmptyCol >= gridSize) {
                continue;
            }
            
            // Check if tile at new position is a manager (obstacle)
            if (current.gridState[newEmptyRow][newEmptyCol] === -1) {
                continue;
            }
            
            // Create new state
            const newGridState = current.gridState.map(row => [...row]);
            const tileId = current.gridState[newEmptyRow][newEmptyCol];
            
            // Swap empty with tile
            newGridState[current.emptyPos.row][current.emptyPos.col] = tileId;
            newGridState[newEmptyRow][newEmptyCol] = 0;
            
            // Track new active position if active tile moved
            let newActivePos = current.activePos;
            if (newEmptyRow === current.activePos.row && newEmptyCol === current.activePos.col) {
                newActivePos = { row: current.emptyPos.row, col: current.emptyPos.col };
            }
            
            // CRITICAL: Check if the new active position would be adjacent to a manager
            // If so, this is an invalid state (would result in game over)
            if (isAdjacentToManager(newActivePos, newGridState, gridSize)) {
                continue; // Skip this move - it would result in game over
            }
            
            const newEmptyPos = { row: newEmptyRow, col: newEmptyCol };
            const stateKey = getStateKey(newActivePos, newEmptyPos);
            
            if (!visited.has(stateKey)) {
                visited.add(stateKey);
                queue.push({
                    activePos: newActivePos,
                    emptyPos: newEmptyPos,
                    moves: current.moves + 1,
                    gridState: newGridState
                });
            }
        }
    }
    
    // If no path found, return a large number
    return 999;
};

/**
 * Calculate allowed moves based on minimum moves and delivery count
 * After 5 deliveries, start restricting moves
 */
export const calculateAllowedMoves = (
    minimumMoves: number,
    deliveryCount: number
): number => {
    if (deliveryCount < 5) {
        return Infinity; // No restriction before 5 deliveries
    }
    
    // Gradually reduce the bonus
    // 5-9 deliveries: +5 moves
    // 10-14 deliveries: +4 moves
    // 15-19 deliveries: +3 moves
    // 20-24 deliveries: +2 moves
    // 25+ deliveries: +1 move
    
    const bonusMoves = Math.max(1, 6 - Math.floor((deliveryCount - 5) / 5));
    
    return minimumMoves + bonusMoves;
};

