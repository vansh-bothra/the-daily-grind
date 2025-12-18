'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, User, Bug, Heart } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

// ============================================================================
// GAME ARCHITECTURE - Abstracted Puzzle System
// ============================================================================
//
// This game is built on a highly abstracted architecture that supports:
//
// 1. MULTIPLE GRID SIZES (4x4, 6x6, 8x8, etc.)
//    - Grid size is configurable per level
//    - UI scales dynamically based on grid size
//
// 2. MULTIPLE TILE TYPES (Coffee, GitHub Issues, Support Tickets, etc.)
//    - Each tile type has: icon, color, movability, matching rules
//    - Special tiles: deliverable items (coffee, issues)
//    - Obstacle tiles: immovable blocks (manager tiles)
//    - Regular tiles: numbered puzzle pieces
//
// 3. MULTIPLE EMPLOYEE TYPES (Regular, Developer, Customer Support, etc.)
//    - Each employee type can only receive specific tile types
//    - Matching rules enforce game objectives
//
// 4. LEVEL SYSTEM
//    - Each level defines: grid size, duration, available tiles/employees
//    - Easy to create new levels with different combinations
//
// 5. EXTENSIBILITY
//    - Add new tile types → Update TILE_TYPES
//    - Add new employee types → Update EMPLOYEE_TYPES
//    - Add new levels → Update LEVELS array
//    - Core game logic remains unchanged
//
// Example: To add a "Bug Fix" tile for QA employees:
//   1. Add tile type to TILE_TYPES
//   2. Add employee type to EMPLOYEE_TYPES
//   3. Create level with these types in LEVELS
//
// ============================================================================

// ============================================================================
// TYPE DEFINITIONS - Core game abstractions
// ============================================================================

type Position = { row: number; col: number };
type EmployeePosition = 'top' | 'bottom' | 'left' | 'right';

// Tile type definition - describes a category of tiles (coffee, issue, etc.)
type TileTypeConfig = {
    id: string;                    // Unique identifier (e.g., 'coffee', 'github-issue')
    name: string;                  // Display name
    icon: LucideIcon;              // Icon component
    color: string;                 // Tailwind classes for color
    movable: boolean;              // Can this tile be moved?
    matchesEmployeeType: string;   // Which employee type can receive this?
    particleColor: string;         // Color for pour animation particles
};

// Employee type definition - describes a category of employees
type EmployeeTypeConfig = {
    id: string;                    // Unique identifier (e.g., 'regular', 'developer')
    name: string;                  // Display name
    icon: string | LucideIcon;     // Emoji or icon component
    acceptsTileTypes: string[];    // Which tile types can this employee receive?
    awakeColor: string;            // Tailwind classes when awake
    sleepingColor: string;         // Tailwind classes when sleeping
};

// Level configuration - defines a complete game level
type LevelConfig = {
    id: number;
    name: string;
    gridSize: number;              // 4x4, 6x6, 8x8, etc.
    gameDuration: number;          // seconds
    tileTypes: TileTypeConfig[];   // Available tile types in this level
    employeeTypes: EmployeeTypeConfig[]; // Available employee types
    specialTileId?: string;        // The tile that needs to be delivered (e.g., 'coffee')
    employeesPerSide: number;      // How many employees on each side
};

// Tile instance - a specific tile in the game
type Tile = {
    id: number;
    value: number;
    position: Position;
    tileTypeId: string;            // References TileTypeConfig.id
};

// Employee instance - a specific employee in the game
type Employee = {
    id: number;
    position: EmployeePosition;
    index: number;
    employeeTypeId: string;        // References EmployeeTypeConfig.id
};

// ============================================================================
// GAME CONFIGURATIONS - Define tile types, employee types, and levels
// ============================================================================

// Available tile types
const TILE_TYPES: Record<string, TileTypeConfig> = {
    regular: {
        id: 'regular',
        name: 'Regular',
        icon: User, // Won't be shown, we show numbers instead
        color: 'bg-slate-200 text-slate-700 hover:bg-slate-300',
        movable: true,
        matchesEmployeeType: '', // Regular tiles don't match anyone
        particleColor: 'bg-slate-600',
    },
    coffee: {
        id: 'coffee',
        name: 'Coffee',
        icon: Coffee,
        color: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/50',
        movable: true,
        matchesEmployeeType: 'regular',
        particleColor: 'bg-amber-600',
    },
    githubIssue: {
        id: 'github-issue',
        name: 'GitHub Issue',
        icon: Bug,
        color: 'bg-gradient-to-br from-red-500 to-red-700 text-white shadow-lg shadow-red-500/50',
        movable: true,
        matchesEmployeeType: 'developer',
        particleColor: 'bg-red-600',
    },
    support: {
        id: 'support',
        name: 'Support Ticket',
        icon: Heart,
        color: 'bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/50',
        movable: true,
        matchesEmployeeType: 'support',
        particleColor: 'bg-pink-600',
    },
    manager: {
        id: 'manager',
        name: 'Manager',
        icon: User,
        color: 'bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-lg shadow-purple-500/50',
        movable: false, // Immovable obstacle tile
        matchesEmployeeType: '', // Can't match with anyone
        particleColor: 'bg-purple-600',
    },
};

// Available employee types
const EMPLOYEE_TYPES: Record<string, EmployeeTypeConfig> = {
    regular: {
        id: 'regular',
        name: 'Employee',
        icon: '😴',
        acceptsTileTypes: ['coffee'],
        awakeColor: 'bg-slate-600',
        sleepingColor: 'bg-red-500 ring-4 ring-red-400/50',
    },
    developer: {
        id: 'developer',
        name: 'Developer',
        icon: '💻',
        acceptsTileTypes: ['github-issue'],
        awakeColor: 'bg-blue-600',
        sleepingColor: 'bg-red-500 ring-4 ring-red-400/50',
    },
    support: {
        id: 'support',
        name: 'Support',
        icon: '🎧',
        acceptsTileTypes: ['support'],
        awakeColor: 'bg-green-600',
        sleepingColor: 'bg-red-500 ring-4 ring-red-400/50',
    },
};

// Level definitions
const LEVELS: LevelConfig[] = [
    {
        id: 1,
        name: 'Coffee Run - Easy',
        gridSize: 4,
        gameDuration: 80,
        tileTypes: [TILE_TYPES.coffee],
        employeeTypes: [EMPLOYEE_TYPES.regular],
        specialTileId: 'coffee',
        employeesPerSide: 4,
    },
    {
        id: 2,
        name: 'Developer Support - Medium',
        gridSize: 6,
        gameDuration: 100,
        tileTypes: [TILE_TYPES.githubIssue],
        employeeTypes: [EMPLOYEE_TYPES.developer],
        specialTileId: 'github-issue',
        employeesPerSide: 6,
    },
    {
        id: 3,
        name: 'Mixed Office - Hard',
        gridSize: 8,
        gameDuration: 120,
        tileTypes: [TILE_TYPES.coffee, TILE_TYPES.githubIssue, TILE_TYPES.support],
        employeeTypes: [EMPLOYEE_TYPES.regular, EMPLOYEE_TYPES.developer, EMPLOYEE_TYPES.support],
        specialTileId: 'coffee', // Can be changed dynamically in game
        employeesPerSide: 8,
    },
];

// ============================================================================
// HELPER FUNCTIONS - Game logic abstracted for any level configuration
// ============================================================================

/**
 * Creates initial tiles for a given level configuration
 * The special tile (e.g., coffee) is placed in the middle
 * One tile is left empty (bottom-right corner)
 */
const createInitialTiles = (level: LevelConfig): Tile[] => {
    const tiles: Tile[] = [];
    let id = 0;
    const gridSize = level.gridSize;
    const middleTileIndex = Math.floor((gridSize * gridSize) / 2);
    const specialTileId = level.specialTileId || level.tileTypes[0].id;

    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            // Skip the empty slot (bottom-right corner)
            if (row === gridSize - 1 && col === gridSize - 1) {
                continue;
            }
            
            // Determine tile type - special tile in middle, regular tiles elsewhere
            const tileTypeId = (id === middleTileIndex) ? specialTileId : 'regular';
            
            tiles.push({
                id: id++,
                value: id,
                position: { row, col },
                tileTypeId: tileTypeId,
            });
        }
    }

    return tiles;
};

/**
 * Shuffles tiles by performing random valid moves
 * This ensures the puzzle is always solvable
 */
const shuffleTiles = (tiles: Tile[], gridSize: number): Tile[] => {
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
const getValidMoves = (emptyPos: Position, gridSize: number): Position[] => {
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
 */
const createEmployees = (level: LevelConfig): Employee[] => {
    const employees: Employee[] = [];
    let id = 0;
    const employeesPerSide = level.employeesPerSide;
    const positions: EmployeePosition[] = ['top', 'right', 'bottom', 'left'];

    positions.forEach(position => {
        for (let i = 0; i < employeesPerSide; i++) {
            // Randomly assign employee type from available types
            const randomTypeIndex = Math.floor(Math.random() * level.employeeTypes.length);
            const employeeType = level.employeeTypes[randomTypeIndex];
            
            employees.push({
                id: id++,
                position,
                index: i,
                employeeTypeId: employeeType.id,
            });
        }
    });

    return employees;
};

/**
 * Gets the target cell position for an employee based on their position around the grid
 */
const getTargetCell = (employee: Employee, gridSize: number): Position => {
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
const checkCanPour = (
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

// ============================================================================
// MAIN GAME COMPONENT
// ============================================================================

export default function Home() {
    // Level management - start with Level 1
    const [currentLevel, setCurrentLevel] = useState<LevelConfig>(LEVELS[0]);
    const [levelIndex, setLevelIndex] = useState(0);
    
    // Game state
    const [tiles, setTiles] = useState<Tile[]>([]);
    const [emptyPos, setEmptyPos] = useState<Position>({ 
        row: currentLevel.gridSize - 1, 
        col: currentLevel.gridSize - 1 
    });
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [sleepingEmployee, setSleepingEmployee] = useState<Employee | null>(null);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(currentLevel.gameDuration);
    const [gameStarted, setGameStarted] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    
    // Special tile tracking (dynamically determined from level config)
    const [specialTileId, setSpecialTileId] = useState<string>(currentLevel.specialTileId || 'coffee');
    
    // Pour state
    const [canPour, setCanPour] = useState(false);
    const [pourDirection, setPourDirection] = useState<EmployeePosition | null>(null);
    const [isPouring, setIsPouring] = useState(false);

    // Initialize game with current level
    const initGame = useCallback(() => {
        // Create tiles and employees based on current level
        const initialTiles = createInitialTiles(currentLevel);
        const shuffledTiles = shuffleTiles(initialTiles, currentLevel.gridSize);
        setTiles(shuffledTiles);

        const initialEmployees = createEmployees(currentLevel);
        setEmployees(initialEmployees);

        // Find empty position after shuffle
        const allPositions = new Set<string>();
        shuffledTiles.forEach(t => allPositions.add(`${t.position.row},${t.position.col}`));
        for (let row = 0; row < currentLevel.gridSize; row++) {
            for (let col = 0; col < currentLevel.gridSize; col++) {
                if (!allPositions.has(`${row},${col}`)) {
                    setEmptyPos({ row, col });
                }
            }
        }

        // Select random sleeping employee that matches the special tile type
        const specialTile = currentLevel.specialTileId || currentLevel.tileTypes[0].id;
        const tileType = currentLevel.tileTypes.find(t => t.id === specialTile);
        
        // Filter employees that can accept the special tile
        const matchingEmployees = initialEmployees.filter(emp => {
            const empType = currentLevel.employeeTypes.find(et => et.id === emp.employeeTypeId);
            return empType && empType.acceptsTileTypes.includes(specialTile);
        });

        const randomEmployee = matchingEmployees[Math.floor(Math.random() * matchingEmployees.length)];
        setSleepingEmployee(randomEmployee);

        setScore(0);
        setTimeLeft(currentLevel.gameDuration);
        setGameStarted(true);
        setGameOver(false);
        setCanPour(false);
        setPourDirection(null);
        setIsPouring(false);
        setSpecialTileId(specialTile);
    }, [currentLevel]);

    // Timer
    useEffect(() => {
        if (!gameStarted || gameOver) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    setGameOver(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [gameStarted, gameOver]);

    // Check for pour opportunity
    useEffect(() => {
        if (!sleepingEmployee || !gameStarted || gameOver) return;

        // Find the special tile (coffee, issue, etc.)
        const specialTile = tiles.find(t => t.tileTypeId === specialTileId);
        if (!specialTile) return;

        const targetCell = getTargetCell(sleepingEmployee, currentLevel.gridSize);

        // Build tile and employee type lookups
        const tileTypesMap: Record<string, TileTypeConfig> = {};
        currentLevel.tileTypes.forEach(t => tileTypesMap[t.id] = t);
        
        const employeeTypesMap: Record<string, EmployeeTypeConfig> = {};
        currentLevel.employeeTypes.forEach(e => employeeTypesMap[e.id] = e);

        // Check if tile can be poured
        const { canPour: canPourTile, direction } = checkCanPour(
            specialTile, 
            targetCell, 
            sleepingEmployee,
            tileTypesMap,
            employeeTypesMap
        );
        setCanPour(canPourTile);
        setPourDirection(direction);
    }, [tiles, emptyPos, sleepingEmployee, specialTileId, gameStarted, gameOver, currentLevel]);

    // Handle tile click
    const handleTileClick = (tile: Tile) => {
        if (!gameStarted || gameOver) return;

        // Check if tile is movable (some tiles like "manager" tiles can't move)
        const tileType = currentLevel.tileTypes.find(t => t.id === tile.tileTypeId);
        if (tileType && !tileType.movable) {
            return; // Can't move immovable tiles
        }

        const { row, col } = tile.position;
        const { row: emptyRow, col: emptyCol } = emptyPos;

        // Check if tile is adjacent to empty slot
        const isAdjacent =
            (row === emptyRow && Math.abs(col - emptyCol) === 1) ||
            (col === emptyCol && Math.abs(row - emptyRow) === 1);

        if (!isAdjacent) return;

        // Swap tile with empty slot
        setTiles(prevTiles =>
            prevTiles.map(t =>
                t.id === tile.id
                    ? { ...t, position: { ...emptyPos } }
                    : t
            )
        );
        setEmptyPos({ row, col });
    };

    // Handle pour
    const handlePour = () => {
        if (!sleepingEmployee || isPouring) return;

        setIsPouring(true);

        // Wait for animation to complete
        setTimeout(() => {
            // Increment score
            setScore(prev => prev + 1);

            // Select new sleeping employee that can accept the special tile
            const matchingEmployees = employees.filter(emp => {
                const empType = currentLevel.employeeTypes.find(et => et.id === emp.employeeTypeId);
                return empType && empType.acceptsTileTypes.includes(specialTileId);
            });

            const randomEmployee = matchingEmployees[Math.floor(Math.random() * matchingEmployees.length)];
            setSleepingEmployee(randomEmployee);

            setCanPour(false);
            setPourDirection(null);
            setIsPouring(false);
        }, 1500); // Animation duration
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <div className="max-w-4xl w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-5xl font-bold text-white mb-2 flex items-center justify-center gap-3">
                        <Coffee className="w-12 h-12 text-amber-500" />
                        The Office Coffee Run
                    </h1>
                    <p className="text-slate-300 text-lg">{currentLevel.name}</p>
                    <p className="text-slate-400 text-sm mt-1">{currentLevel.gridSize}x{currentLevel.gridSize} Grid</p>
                </div>

                {/* Game Stats */}
                <div className="flex justify-between items-center mb-6 bg-slate-800/50 backdrop-blur rounded-lg p-4">
                    <div className="text-center">
                        <div className="text-3xl font-bold text-white">{score}</div>
                        <div className="text-sm text-slate-400">Score</div>
                    </div>
                    <div className="text-center">
                        <div className={`text-3xl font-bold ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                            {timeLeft}s
                        </div>
                        <div className="text-sm text-slate-400">Time Left</div>
                    </div>
                    {!gameStarted && (
                        <button
                            onClick={initGame}
                            className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors"
                        >
                            Start Game
                        </button>
                    )}
                    {gameOver && (
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors"
                        >
                            Play Again
                        </button>
                    )}
                </div>

                {/* Game Board */}
                <div className="relative mx-auto" style={{ width: 'fit-content' }}>
                    {/* Employee Ring with proper padding */}
                    <div className="relative p-16 md:p-20">
                        {/* Top Employees */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 flex gap-16">
                            {employees.filter(e => e.position === 'top').map(emp => {
                                const empType = currentLevel.employeeTypes.find(et => et.id === emp.employeeTypeId);
                                return (
                                    <EmployeeAvatar
                                        key={emp.id}
                                        employee={emp}
                                        employeeType={empType}
                                        isSleeping={sleepingEmployee?.id === emp.id}
                                    />
                                );
                            })}
                        </div>

                        {/* Right Employees */}
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-16">
                            {employees.filter(e => e.position === 'right').map(emp => {
                                const empType = currentLevel.employeeTypes.find(et => et.id === emp.employeeTypeId);
                                return (
                                    <EmployeeAvatar
                                        key={emp.id}
                                        employee={emp}
                                        employeeType={empType}
                                        isSleeping={sleepingEmployee?.id === emp.id}
                                    />
                                );
                            })}
                        </div>

                        {/* Bottom Employees */}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-16">
                            {employees.filter(e => e.position === 'bottom').map(emp => {
                                const empType = currentLevel.employeeTypes.find(et => et.id === emp.employeeTypeId);
                                return (
                                    <EmployeeAvatar
                                        key={emp.id}
                                        employee={emp}
                                        employeeType={empType}
                                        isSleeping={sleepingEmployee?.id === emp.id}
                                    />
                                );
                            })}
                        </div>

                        {/* Left Employees */}
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 flex flex-col gap-16">
                            {employees.filter(e => e.position === 'left').map(emp => {
                                const empType = currentLevel.employeeTypes.find(et => et.id === emp.employeeTypeId);
                                return (
                                    <EmployeeAvatar
                                        key={emp.id}
                                        employee={emp}
                                        employeeType={empType}
                                        isSleeping={sleepingEmployee?.id === emp.id}
                                    />
                                );
                            })}
                        </div>

                        {/* Puzzle Grid */}
                        <div className="bg-slate-800/30 backdrop-blur rounded-2xl shadow-2xl p-4">
                            <div 
                                className="grid gap-2"
                                style={{ 
                                    gridTemplateColumns: `repeat(${currentLevel.gridSize}, minmax(0, 1fr))` 
                                }}
                            >
                                {Array.from({ length: currentLevel.gridSize * currentLevel.gridSize }).map((_, idx) => {
                                    const row = Math.floor(idx / currentLevel.gridSize);
                                    const col = idx % currentLevel.gridSize;
                                    const tile = tiles.find(t => t.position.row === row && t.position.col === col);
                                    const tileType = tile ? currentLevel.tileTypes.find(t => t.id === tile.tileTypeId) : null;
                                    const isSpecialTile = tile?.tileTypeId === specialTileId;

                                    // Dynamic tile size based on grid size
                                    const tileSize = currentLevel.gridSize === 4 ? 'w-20 h-20 md:w-24 md:h-24' :
                                                      currentLevel.gridSize === 6 ? 'w-14 h-14 md:w-16 md:h-16' :
                                                      'w-10 h-10 md:w-12 md:h-12';

                                    return (
                                        <div key={idx} className={`relative ${tileSize} bg-slate-700/30 rounded-lg`}>
                                            {tile && (
                                                <GameTile
                                                    tile={tile}
                                                    tileType={tileType}
                                                    isSpecialTile={isSpecialTile}
                                                    onClick={() => handleTileClick(tile)}
                                                    disabled={!gameStarted || gameOver}
                                                    canPour={isSpecialTile && canPour}
                                                    pourDirection={pourDirection}
                                                    onPour={handlePour}
                                                    isPouring={isPouring}
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Game Over Modal */}
                <AnimatePresence>
                    {gameOver && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
                        >
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                className="bg-slate-800 rounded-2xl p-8 text-center max-w-md"
                            >
                                <h2 className="text-4xl font-bold text-white mb-4">Time's Up!</h2>
                                <p className="text-6xl font-bold text-amber-500 mb-2">{score}</p>
                                <p className="text-slate-300 mb-6">Coffees Delivered</p>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors"
                                >
                                    Play Again
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

// ============================================================================
// GAME TILE COMPONENT - Renders individual tiles with type-specific styling
// ============================================================================

function GameTile({
    tile,
    tileType,
    isSpecialTile,
    onClick,
    disabled,
    canPour,
    pourDirection,
    onPour,
    isPouring
}: {
    tile: Tile;
    tileType: TileTypeConfig | null | undefined;
    isSpecialTile: boolean;
    onClick: () => void;
    disabled: boolean;
    canPour?: boolean;
    pourDirection?: EmployeePosition | null;
    onPour?: () => void;
    isPouring?: boolean;
}) {
    // Generate particle drops based on direction (only for special tiles when pouring)
    const getParticleDrops = () => {
        if (!isSpecialTile || !pourDirection || !isPouring || !tileType) return null;
        
        const drops = Array.from({ length: 12 }).map((_, i) => {
            const delay = i * 0.08;
            let dropClass = '';
            
            switch (pourDirection) {
                case 'top':
                    dropClass = 'top-0 left-1/2 -translate-x-1/2 -translate-y-full';
                    break;
                case 'bottom':
                    dropClass = 'bottom-0 left-1/2 -translate-x-1/2 translate-y-full';
                    break;
                case 'left':
                    dropClass = 'left-0 top-1/2 -translate-x-full -translate-y-1/2';
                    break;
                case 'right':
                    dropClass = 'right-0 top-1/2 translate-x-full -translate-y-1/2';
                    break;
            }

            return (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ 
                        opacity: [0, 1, 1, 0],
                        scale: [0, 1.5, 1.5, 0.8],
                        y: pourDirection === 'top' ? -60 : pourDirection === 'bottom' ? 60 : 0,
                        x: pourDirection === 'left' ? -60 : pourDirection === 'right' ? 60 : 0,
                    }}
                    transition={{ 
                        duration: 1,
                        delay,
                        ease: 'easeOut'
                    }}
                    className={`absolute ${dropClass} w-3 h-3 ${tileType.particleColor} rounded-full shadow-lg`}
                />
            );
        });

        return drops;
    };

    return (
        <motion.div
            layout
            layoutId={`tile-${tile.id}`}
            initial={false}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute inset-0"
        >
            <motion.button
                onClick={onClick}
                disabled={disabled || (canPour && !isPouring)}
                className={`w-full h-full rounded-lg flex flex-col items-center justify-center font-bold text-xl cursor-pointer transition-all relative ${
                    isSpecialTile && tileType
                        ? tileType.color
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    } ${disabled && !canPour ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
            >
                {isSpecialTile && tileType ? (
                    <>
                        <tileType.icon className="w-8 h-8" />
                        {canPour && !isPouring && (
                            <motion.span
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute bottom-1 text-xs font-semibold bg-white text-amber-600 px-2 py-0.5 rounded"
                            >
                                Pour!
                            </motion.span>
                        )}
                    </>
                ) : (
                    <span className="text-sm md:text-base">{tile.value}</span>
                )}
                
                {/* Particle drops animation */}
                {isSpecialTile && isPouring && getParticleDrops()}
            </motion.button>

            {/* Clickable overlay for pouring */}
            {canPour && !isPouring && (
                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onPour?.();
                    }}
                    className="absolute inset-0 bg-green-500/20 rounded-lg backdrop-blur-[1px] flex items-center justify-center z-10"
                >
                    <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                        className="bg-green-500 text-white px-3 py-1.5 rounded-lg font-bold text-sm shadow-lg"
                    >
                        Pour Coffee
                    </motion.div>
                </motion.button>
            )}
        </motion.div>
    );
}

// ============================================================================
// EMPLOYEE AVATAR COMPONENT - Renders employees with type-specific styling
// ============================================================================

function EmployeeAvatar({
    employee,
    employeeType,
    isSleeping
}: {
    employee: Employee;
    employeeType: EmployeeTypeConfig | undefined;
    isSleeping: boolean;
}) {
    if (!employeeType) return null;

    const icon = employeeType.icon;
    const isEmoji = typeof icon === 'string';

    return (
        <motion.div
            animate={isSleeping ? { scale: [1, 1.1, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
                isSleeping ? employeeType.sleepingColor : employeeType.awakeColor
            }`}
        >
            {isSleeping ? (
                <span className="text-xl">😴</span>
            ) : isEmoji ? (
                <span className="text-xl">{icon}</span>
            ) : (
                <User className="w-6 h-6 text-slate-300" />
            )}
        </motion.div>
    );
}
