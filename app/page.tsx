'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee } from 'lucide-react';

// Types
import { Position, EmployeePosition, Tile, Employee, LevelConfig, TileTypeConfig, EmployeeTypeConfig } from '@/types/game.types';

// Configurations
import { LEVELS } from '@/config/game.config';

// Utils
import {
    createInitialTiles,
    shuffleTiles,
    createEmployees,
    getTargetCell,
    checkCanPour,
    findValidManagerTile,
    isAdjacentToManager,
} from '@/utils/game.utils';

// Components
import { GameTile } from '@/components/GameTile';
import { EmployeeAvatar } from '@/components/EmployeeAvatar';

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
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [gameStarted, setGameStarted] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [managerCount, setManagerCount] = useState(0);
    const [gameOverReason, setGameOverReason] = useState<string>('');
    
    // Special tile tracking (dynamically determined from level config)
    const [specialTileId, setSpecialTileId] = useState<string>(currentLevel.specialTileId || 'coffee');
    
    // Pour state
    const [canPour, setCanPour] = useState(false);
    const [pourDirection, setPourDirection] = useState<EmployeePosition | null>(null);
    const [isPouring, setIsPouring] = useState(false);

    // Handle level change
    const handleLevelChange = (newLevelIndex: number) => {
        if (newLevelIndex < 0 || newLevelIndex >= LEVELS.length) return;
        
        const newLevel = LEVELS[newLevelIndex];
        setCurrentLevel(newLevel);
        setLevelIndex(newLevelIndex);
        
        // Reset game state
        setGameStarted(false);
        setGameOver(false);
        setScore(0);
        setTimeElapsed(0);
        setTiles([]);
        setEmployees([]);
        setSleepingEmployee(null);
        setEmptyPos({ row: newLevel.gridSize - 1, col: newLevel.gridSize - 1 });
        setSpecialTileId(newLevel.specialTileId || 'coffee');
        setCanPour(false);
        setPourDirection(null);
        setIsPouring(false);
        setManagerCount(0);
        setGameOverReason('');
    };

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
        setTimeElapsed(0);
        setGameStarted(true);
        setGameOver(false);
        setCanPour(false);
        setPourDirection(null);
        setIsPouring(false);
        setSpecialTileId(specialTile);
        setManagerCount(0);
        setGameOverReason('');
    }, [currentLevel]);

    // Timer and Manager Spawning
    useEffect(() => {
        if (!gameStarted || gameOver) return;

        const timer = setInterval(() => {
            setTimeElapsed(prev => prev + 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [gameStarted, gameOver]);

    // Manager spawning/moving based on deliveries (handled in handlePour)

    // Check for pour opportunity and manager adjacency
    useEffect(() => {
        if (!sleepingEmployee || !gameStarted || gameOver) return;

        // Find the special tile (coffee, issue, etc.)
        const specialTile = tiles.find(t => t.tileTypeId === specialTileId);
        if (!specialTile) return;

        // Check if caught by manager
        if (isAdjacentToManager(specialTile, tiles)) {
            setGameOver(true);
            setGameOverReason('Caught by manager! 👔');
            return;
        }

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
            const newScore = score + 1;
            
            // Increment score
            setScore(newScore);

            // Select new sleeping employee ONCE for both manager placement and game state
            const matchingEmployees = employees.filter(emp => {
                const empType = currentLevel.employeeTypes.find(et => et.id === emp.employeeTypeId);
                return empType && empType.acceptsTileTypes.includes(specialTileId);
            });
            const nextEmployee = matchingEmployees[Math.floor(Math.random() * matchingEmployees.length)];
            const nextTargetCell = getTargetCell(nextEmployee, currentLevel.gridSize);

            // Handle manager spawning/moving based on deliveries
            setTiles(prevTiles => {
                const currentManagers = prevTiles.filter(t => t.tileTypeId === 'manager').length;
                const maxManagers = currentLevel.maxManagers || 0;
                
                // First manager appears after 10 deliveries
                if (newScore === 10 && currentManagers === 0 && maxManagers > 0) {
                    const specialTile = prevTiles.find(t => t.tileTypeId === specialTileId);
                    if (!specialTile) return prevTiles;
                    
                    const managerTile = findValidManagerTile(prevTiles, specialTile, nextTargetCell, emptyPos, currentLevel.gridSize);
                    
                    if (managerTile) {
                        setManagerCount(1);
                        return prevTiles.map(t => 
                            t.id === managerTile.id 
                                ? { ...t, tileTypeId: 'manager' }
                                : t
                        );
                    }
                }
                // After 10 deliveries, move manager after each delivery
                else if (newScore > 10 && currentManagers > 0) {
                    const specialTile = prevTiles.find(t => t.tileTypeId === specialTileId);
                    if (!specialTile) return prevTiles;
                    
                    // First, reset current manager tiles to regular
                    const tilesWithoutManagers = prevTiles.map(t => 
                        t.tileTypeId === 'manager' ? { ...t, tileTypeId: 'regular' } : t
                    );
                    
                    // Find new manager position(s)
                    const managersToSpawn = Math.min(
                        Math.floor((newScore - 10) / 5) + 1, // 1 manager at 10, 2 at 15, 3 at 20, etc.
                        maxManagers
                    );
                    
                    let updatedTiles = [...tilesWithoutManagers];
                    let spawnedManagers = 0;
                    
                    for (let i = 0; i < managersToSpawn; i++) {
                        const newManagerTile = findValidManagerTile(updatedTiles, specialTile, nextTargetCell, emptyPos, currentLevel.gridSize);
                        if (newManagerTile) {
                            updatedTiles = updatedTiles.map(t => 
                                t.id === newManagerTile.id 
                                    ? { ...t, tileTypeId: 'manager' }
                                    : t
                            );
                            spawnedManagers++;
                        }
                    }
                    
                    setManagerCount(spawnedManagers);
                    return updatedTiles;
                }
                
                return prevTiles;
            });

            // Use the same employee we selected for manager placement
            setSleepingEmployee(nextEmployee);

            setCanPour(false);
            setPourDirection(null);
            setIsPouring(false);
        }, 1500); // Animation duration
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <div className="max-w-4xl w-full">
                {/* Header */}
                <div className="text-center mb-6">
                    <h1 className="text-5xl font-bold text-white mb-2 flex items-center justify-center gap-3">
                        <Coffee className="w-12 h-12 text-amber-500" />
                        The Office Coffee Run
                    </h1>
                    <p className="text-slate-300 text-lg">{currentLevel.name}</p>
                    <p className="text-slate-400 text-sm mt-1">{currentLevel.gridSize}x{currentLevel.gridSize} Grid</p>
                </div>

                {/* Level Switcher */}
                <div className="mb-6">
                    <div className="text-center mb-3">
                        <p className="text-slate-400 text-sm">
                            {gameStarted && !gameOver 
                                ? '🔒 Level locked during game' 
                                : 'Select Level'}
                        </p>
                    </div>
                    <div className="flex justify-center gap-3 flex-wrap">
                        {LEVELS.map((level, index) => {
                            const difficulty = level.name.includes('Easy') ? '🟢' : 
                                             level.name.includes('Medium') ? '🟡' : '🔴';
                            return (
                                <motion.button
                                    key={level.id}
                                    onClick={() => handleLevelChange(index)}
                                    disabled={gameStarted && !gameOver}
                                    whileHover={!(gameStarted && !gameOver) ? { scale: 1.05 } : {}}
                                    whileTap={!(gameStarted && !gameOver) ? { scale: 0.95 } : {}}
                                    className={`px-5 py-3 rounded-lg font-semibold transition-all ${
                                        index === levelIndex
                                            ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/50 ring-2 ring-amber-400'
                                            : 'bg-slate-700/80 text-slate-300 hover:bg-slate-600'
                                    } ${
                                        gameStarted && !gameOver
                                            ? 'opacity-50 cursor-not-allowed'
                                            : 'hover:shadow-xl'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">{difficulty}</span>
                                        <div>
                                            <div className="text-sm font-bold">Level {level.id}</div>
                                            <div className="text-xs opacity-80">{level.gridSize}x{level.gridSize} • Max {level.maxManagers} 👔</div>
                                        </div>
                                    </div>
                                </motion.button>
                            );
                        })}
                    </div>
                </div>

                {/* Game Stats */}
                <div className="flex justify-between items-center mb-6 bg-slate-800/50 backdrop-blur rounded-lg p-4">
                    <div className="text-center">
                        <div className="text-3xl font-bold text-white">{score}</div>
                        <div className="text-sm text-slate-400">Deliveries</div>
                        {score < 10 && gameStarted && !gameOver && (
                            <div className="text-xs text-purple-400 mt-1">
                                {10 - score} until manager
                            </div>
                        )}
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-white">
                            {Math.floor(timeElapsed / 60)}:{(timeElapsed % 60).toString().padStart(2, '0')}
                        </div>
                        <div className="text-sm text-slate-400">Time</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-purple-400">
                            {tiles.filter(t => t.tileTypeId === 'manager').length}
                        </div>
                        <div className="text-sm text-slate-400">Managers 👔</div>
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
                    {/* Employee Ring with responsive padding */}
                    <div className="relative" style={{ padding: currentLevel.gridSize === 4 ? '80px' : currentLevel.gridSize === 5 ? '64px' : '56px' }}>
                        {/* Top Employees */}
                        <div 
                            className="absolute top-0 left-1/2 -translate-x-1/2 flex"
                            style={{ gap: currentLevel.gridSize === 4 ? '64px' : currentLevel.gridSize === 5 ? '48px' : '40px' }}
                        >
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
                        <div 
                            className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col"
                            style={{ gap: currentLevel.gridSize === 4 ? '64px' : currentLevel.gridSize === 5 ? '48px' : '40px' }}
                        >
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
                        <div 
                            className="absolute bottom-0 left-1/2 -translate-x-1/2 flex"
                            style={{ gap: currentLevel.gridSize === 4 ? '64px' : currentLevel.gridSize === 5 ? '48px' : '40px' }}
                        >
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
                        <div 
                            className="absolute left-0 top-1/2 -translate-y-1/2 flex flex-col"
                            style={{ gap: currentLevel.gridSize === 4 ? '64px' : currentLevel.gridSize === 5 ? '48px' : '40px' }}
                        >
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
                                className="grid"
                                style={{ 
                                    gridTemplateColumns: `repeat(${currentLevel.gridSize}, minmax(0, 1fr))`,
                                    gap: currentLevel.gridSize === 4 ? '8px' : currentLevel.gridSize === 5 ? '6px' : '4px'
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
                                                      currentLevel.gridSize === 5 ? 'w-16 h-16 md:w-20 md:h-20' :
                                                      'w-14 h-14 md:w-16 md:h-16';

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
                                <h2 className="text-4xl font-bold text-white mb-2">Game Over!</h2>
                                {gameOverReason && (
                                    <p className="text-xl text-red-400 mb-4">{gameOverReason}</p>
                                )}
                                <div className="bg-slate-700/50 rounded-lg p-6 mb-6">
                                    <p className="text-6xl font-bold text-amber-500 mb-2">{score}</p>
                                    <p className="text-slate-300 mb-4">Deliveries Completed</p>
                                    <div className="flex justify-center gap-6 text-sm">
                                        <div>
                                            <p className="text-2xl font-bold text-white">
                                                {Math.floor(timeElapsed / 60)}:{(timeElapsed % 60).toString().padStart(2, '0')}
                                            </p>
                                            <p className="text-slate-400">Time Survived</p>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-purple-400">{managerCount}</p>
                                            <p className="text-slate-400">Managers Spawned</p>
                                        </div>
                                    </div>
                                </div>
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
