'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, User } from 'lucide-react';

// Types
type Position = { row: number; col: number };
type Tile = { id: number; value: number; position: Position };
type EmployeePosition = 'top' | 'bottom' | 'left' | 'right';
type Employee = { id: number; position: EmployeePosition; index: number };

// Constants
const GRID_SIZE = 4;
const GAME_DURATION = 80; // seconds

// Helper functions
const createInitialTiles = (): Tile[] => {
    const tiles: Tile[] = [];
    let id = 0;

    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            if (row === GRID_SIZE - 1 && col === GRID_SIZE - 1) {
                // Empty slot
                continue;
            }
            tiles.push({
                id: id++,
                value: id,
                position: { row, col }
            });
        }
    }

    return tiles;
};

const shuffleTiles = (tiles: Tile[]): Tile[] => {
    const shuffled = [...tiles];
    const emptyPos = { row: GRID_SIZE - 1, col: GRID_SIZE - 1 };

    // Perform random valid moves
    for (let i = 0; i < 100; i++) {
        const validMoves = getValidMoves(emptyPos);
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

const getValidMoves = (emptyPos: Position): Position[] => {
    const moves: Position[] = [];
    const { row, col } = emptyPos;

    if (row > 0) moves.push({ row: row - 1, col });
    if (row < GRID_SIZE - 1) moves.push({ row: row + 1, col });
    if (col > 0) moves.push({ row, col: col - 1 });
    if (col < GRID_SIZE - 1) moves.push({ row, col: col + 1 });

    return moves;
};

const createEmployees = (): Employee[] => {
    const employees: Employee[] = [];
    let id = 0;

    // Top
    for (let i = 0; i < 4; i++) {
        employees.push({ id: id++, position: 'top', index: i });
    }
    // Right
    for (let i = 0; i < 4; i++) {
        employees.push({ id: id++, position: 'right', index: i });
    }
    // Bottom
    for (let i = 0; i < 4; i++) {
        employees.push({ id: id++, position: 'bottom', index: i });
    }
    // Left
    for (let i = 0; i < 4; i++) {
        employees.push({ id: id++, position: 'left', index: i });
    }

    return employees;
};

const getTargetCell = (employee: Employee): Position => {
    switch (employee.position) {
        case 'top':
            return { row: 0, col: employee.index };
        case 'bottom':
            return { row: GRID_SIZE - 1, col: employee.index };
        case 'left':
            return { row: employee.index, col: 0 };
        case 'right':
            return { row: employee.index, col: GRID_SIZE - 1 };
    }
};

const checkCanPour = (coffeeTile: Tile, targetCell: Position, employee: Employee): { canPour: boolean; direction: EmployeePosition | null } => {
    const { row: coffeeRow, col: coffeeCol } = coffeeTile.position;
    const { row: targetRow, col: targetCol } = targetCell;

    // Check if coffee is AT the target cell (edge cell)
    if (coffeeRow === targetRow && coffeeCol === targetCol) {
        // Return the direction based on where the employee is positioned
        return { canPour: true, direction: employee.position };
    }

    return { canPour: false, direction: null };
};

export default function Home() {
    const [tiles, setTiles] = useState<Tile[]>([]);
    const [emptyPos, setEmptyPos] = useState<Position>({ row: GRID_SIZE - 1, col: GRID_SIZE - 1 });
    const [employees] = useState<Employee[]>(createEmployees());
    const [sleepingEmployee, setSleepingEmployee] = useState<Employee | null>(null);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
    const [gameStarted, setGameStarted] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [coffeeTileId] = useState(7); // Middle tile
    const [canPour, setCanPour] = useState(false);
    const [pourDirection, setPourDirection] = useState<EmployeePosition | null>(null);
    const [isPouring, setIsPouring] = useState(false);

    // Initialize game
    const initGame = useCallback(() => {
        const initialTiles = createInitialTiles();
        const shuffledTiles = shuffleTiles(initialTiles);
        setTiles(shuffledTiles);

        // Find empty position after shuffle
        const allPositions = new Set<string>();
        shuffledTiles.forEach(t => allPositions.add(`${t.position.row},${t.position.col}`));
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                if (!allPositions.has(`${row},${col}`)) {
                    setEmptyPos({ row, col });
                }
            }
        }

        // Select random sleeping employee
        const randomEmployee = employees[Math.floor(Math.random() * employees.length)];
        setSleepingEmployee(randomEmployee);

        setScore(0);
        setTimeLeft(GAME_DURATION);
        setGameStarted(true);
        setGameOver(false);
        setCanPour(false);
        setPourDirection(null);
        setIsPouring(false);
    }, [employees]);

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

        const coffeeTile = tiles.find(t => t.id === coffeeTileId);
        if (!coffeeTile) return;

        const targetCell = getTargetCell(sleepingEmployee);

        // Check if coffee can be poured
        const { canPour: canPourCoffee, direction } = checkCanPour(coffeeTile, targetCell, sleepingEmployee);
        setCanPour(canPourCoffee);
        setPourDirection(direction);
    }, [tiles, emptyPos, sleepingEmployee, coffeeTileId, gameStarted, gameOver]);

    // Handle tile click
    const handleTileClick = (tile: Tile) => {
        if (!gameStarted || gameOver) return;

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

            // Select new sleeping employee
            const randomEmployee = employees[Math.floor(Math.random() * employees.length)];
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
                    <p className="text-slate-300 text-lg">Wake up your sleepy colleagues!</p>
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
                            {employees.filter(e => e.position === 'top').map(emp => (
                                <EmployeeAvatar
                                    key={emp.id}
                                    employee={emp}
                                    isSleeping={sleepingEmployee?.id === emp.id}
                                />
                            ))}
                        </div>

                        {/* Right Employees */}
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-16">
                            {employees.filter(e => e.position === 'right').map(emp => (
                                <EmployeeAvatar
                                    key={emp.id}
                                    employee={emp}
                                    isSleeping={sleepingEmployee?.id === emp.id}
                                />
                            ))}
                        </div>

                        {/* Bottom Employees */}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-16">
                            {employees.filter(e => e.position === 'bottom').map(emp => (
                                <EmployeeAvatar
                                    key={emp.id}
                                    employee={emp}
                                    isSleeping={sleepingEmployee?.id === emp.id}
                                />
                            ))}
                        </div>

                        {/* Left Employees */}
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 flex flex-col gap-16">
                            {employees.filter(e => e.position === 'left').map(emp => (
                                <EmployeeAvatar
                                    key={emp.id}
                                    employee={emp}
                                    isSleeping={sleepingEmployee?.id === emp.id}
                                />
                            ))}
                        </div>

                        {/* Puzzle Grid */}
                        <div className="bg-slate-800/30 backdrop-blur rounded-2xl shadow-2xl p-4">
                            <div className="grid grid-cols-4 gap-2">
                                {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, idx) => {
                                    const row = Math.floor(idx / GRID_SIZE);
                                    const col = idx % GRID_SIZE;
                                    const tile = tiles.find(t => t.position.row === row && t.position.col === col);

                                    return (
                                        <div key={idx} className="relative w-20 h-20 md:w-24 md:h-24 bg-slate-700/30 rounded-lg">
                                            {tile && (
                                                <GameTile
                                                    tile={tile}
                                                    isCoffee={tile.id === coffeeTileId}
                                                    onClick={() => handleTileClick(tile)}
                                                    disabled={!gameStarted || gameOver}
                                                    canPour={tile.id === coffeeTileId && canPour}
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

// Components
function GameTile({
    tile,
    isCoffee,
    onClick,
    disabled,
    canPour,
    pourDirection,
    onPour,
    isPouring
}: {
    tile: Tile;
    isCoffee: boolean;
    onClick: () => void;
    disabled: boolean;
    canPour?: boolean;
    pourDirection?: EmployeePosition | null;
    onPour?: () => void;
    isPouring?: boolean;
}) {
    // Generate coffee drops based on direction (only for coffee tile)
    const getCoffeeDrops = () => {
        if (!isCoffee || !pourDirection || !isPouring) return null;
        
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
                    className={`absolute ${dropClass} w-3 h-3 bg-amber-600 rounded-full shadow-lg`}
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
                className={`w-full h-full rounded-lg flex flex-col items-center justify-center font-bold text-xl cursor-pointer transition-all relative ${isCoffee
                    ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/50'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    } ${disabled && !canPour ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
            >
                {isCoffee ? (
                    <>
                        <Coffee className="w-8 h-8" />
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
                    <span>{tile.value}</span>
                )}
                
                {/* Coffee drops animation */}
                {isCoffee && isPouring && getCoffeeDrops()}
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

function EmployeeAvatar({
    employee,
    isSleeping
}: {
    employee: Employee;
    isSleeping: boolean;
}) {
    return (
        <motion.div
            animate={isSleeping ? { scale: [1, 1.1, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className={`w-12 h-12 rounded-full flex items-center justify-center ${isSleeping
                ? 'bg-red-500 ring-4 ring-red-400/50'
                : 'bg-slate-600'
                }`}
        >
            {isSleeping ? (
                <span className="text-xl">😴</span>
            ) : (
                <User className="w-6 h-6 text-slate-300" />
            )}
        </motion.div>
    );
}
