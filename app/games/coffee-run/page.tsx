'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, Info, X, Sun, Moon, Home } from 'lucide-react';
import Link from 'next/link';

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
    isPuzzleSolved,
    findValidManagerTile,
    isAdjacentToManager,
} from '@/utils/game.utils';
import { playDeliverySound, initAudio } from '@/utils/sound.utils';
import { calculateMinimumMoves, calculateAllowedMoves } from '@/utils/pathfinding.utils';

// Components
import { GameTile } from '@/components/GameTile';
import { EmployeeAvatar } from '@/components/EmployeeAvatar';
import { CEOAvatar } from '@/components/CEOAvatar';

// ============================================================================
// MAIN GAME COMPONENT
// ============================================================================

export default function CoffeeRunGame() {
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
    const [gameWon, setGameWon] = useState(false);
    const [managerCount, setManagerCount] = useState(0);
    const [gameOverReason, setGameOverReason] = useState<string>('');
    
    // Special tile tracking (dynamically determined from level config)
    const [specialTileId, setSpecialTileId] = useState<string>(currentLevel.specialTileId || 'coffee');
    
    // Pour state
    const [canPour, setCanPour] = useState(false);
    const [pourDirection, setPourDirection] = useState<EmployeePosition | null>(null);
    const [isPouring, setIsPouring] = useState(false);
    
    // CEO state
    const [ceoMood, setCeoMood] = useState<'happy' | 'neutral' | 'frustrated'>('neutral');
    
    // Info modal state
    const [showInfoModal, setShowInfoModal] = useState(false);
    
    // Theme state
    const [isDarkMode, setIsDarkMode] = useState(true);
    
    // Move restriction state
    const [currentMoves, setCurrentMoves] = useState(0);
    const [minimumMoves, setMinimumMoves] = useState<number>(0);
    const [allowedMoves, setAllowedMoves] = useState<number>(Infinity);
    const [movesRestricted, setMovesRestricted] = useState(false);

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
        setCeoMood('neutral');
        setGameWon(false);
        setManagerCount(0);
        setGameOverReason('');
        setCurrentMoves(0);
        setMinimumMoves(0);
        setAllowedMoves(Infinity);
        setMovesRestricted(false);
        
        // Initialize audio context on game start
        initAudio();
    }, [currentLevel]);

    // Timer and Manager Spawning
    useEffect(() => {
        if (!gameStarted || gameOver || gameWon) return;

        const timer = setInterval(() => {
            setTimeElapsed(prev => {
                const newTime = prev + 1;
                // Check if time limit reached (if gameDuration > 0)
                if (currentLevel.gameDuration > 0 && newTime >= currentLevel.gameDuration) {
                    setGameOver(true);
                    setGameOverReason('Time\'s Up!');
                    return newTime;
                }
                return newTime;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [gameStarted, gameOver, gameWon, currentLevel.gameDuration]);

    // Manager spawning/moving based on deliveries (handled in handlePour)
    
    // Calculate minimum moves at the start of each delivery (score change)
    useEffect(() => {
        if (!gameStarted || gameOver || gameWon || !sleepingEmployee) return;
        
        const specialTile = tiles.find(t => t.tileTypeId === specialTileId);
        if (!specialTile) return;
        
        const targetCell = getTargetCell(sleepingEmployee, currentLevel.gridSize);
        
        // Calculate minimum moves for this delivery
        const minMoves = calculateMinimumMoves(tiles, specialTile, targetCell, emptyPos, currentLevel.gridSize);
        setMinimumMoves(minMoves);
        
        // Calculate allowed moves based on score
        const allowed = calculateAllowedMoves(minMoves, score);
        setAllowedMoves(allowed);
        
        // Check if moves are restricted (after 5 deliveries)
        setMovesRestricted(score >= 5);
    }, [score, gameStarted]); // Only recalculate when score changes (new delivery)

    // Check for pour opportunity and manager adjacency
    useEffect(() => {
        if (!sleepingEmployee || !gameStarted || gameOver || gameWon) return;

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
        
        // Check if out of moves (using the frozen minimumMoves from start of delivery)
        if (movesRestricted && currentMoves >= allowedMoves) {
            setGameOver(true);
            setGameOverReason('Out of moves! 🚫');
        }
    }, [tiles, emptyPos, sleepingEmployee, specialTileId, gameStarted, gameOver, gameWon, currentLevel, currentMoves, movesRestricted, allowedMoves]);

    // Update CEO mood based on performance
    useEffect(() => {
        if (!gameStarted || gameOver || gameWon) return;
        
        if (score >= 10) setCeoMood('happy');
        else if (currentLevel.gameDuration > 0 && (currentLevel.gameDuration - timeElapsed) <= 10 && score < 5) setCeoMood('frustrated');
        else setCeoMood('neutral');
    }, [score, timeElapsed, currentLevel.gameDuration, gameStarted, gameOver, gameWon]);

    // Check for win condition: puzzle solved AND CEO is neutral or happy
    useEffect(() => {
        if (!gameStarted || gameOver || gameWon) return;
        
        const puzzleSolved = isPuzzleSolved(tiles, emptyPos, currentLevel.gridSize);
        const ceoIsNeutralOrHappy = ceoMood === 'neutral' || ceoMood === 'happy';
        
        if (puzzleSolved && ceoIsNeutralOrHappy) {
            // Add bonus score and win the game
            setScore(prev => prev + 15);
            setGameWon(true);
            setGameOver(true);
        }
    }, [tiles, emptyPos, ceoMood, gameStarted, gameOver, gameWon, currentLevel.gridSize]);

    // Handle tile click
    const handleTileClick = (tile: Tile) => {
        if (!gameStarted || gameOver || gameWon) return;

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
        
        // Check if move limit reached (after 5 deliveries)
        if (movesRestricted && currentMoves >= allowedMoves) {
            return; // Can't move if out of moves
        }

        // Swap tile with empty slot
        setTiles(prevTiles =>
            prevTiles.map(t =>
                t.id === tile.id
                    ? { ...t, position: { ...emptyPos } }
                    : t
            )
        );
        setEmptyPos({ row, col });
        
        // Increment move counter
        setCurrentMoves(prev => prev + 1);
    };

    // Handle pour
    const handlePour = () => {
        if (!sleepingEmployee || isPouring) return;

        setIsPouring(true);
        
        // Play delivery sound effect
        playDeliverySound();

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
                
                // First manager appears after 5 deliveries
                if (newScore === 5 && currentManagers === 0 && maxManagers > 0) {
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
                // After 5 deliveries, move manager after each delivery
                else if (newScore > 5 && currentManagers > 0) {
                    const specialTile = prevTiles.find(t => t.tileTypeId === specialTileId);
                    if (!specialTile) return prevTiles;
                    
                    // First, reset current manager tiles to regular
                    const tilesWithoutManagers = prevTiles.map(t => 
                        t.tileTypeId === 'manager' ? { ...t, tileTypeId: 'regular' } : t
                    );
                    
                    // Find new manager position(s)
                    const managersToSpawn = Math.min(
                        Math.floor((newScore - 5) / 5) + 1, // 1 manager at 5, 2 at 10, 3 at 15, etc.
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
            
            // Reset move counter for next delivery
            setCurrentMoves(0);
            // Note: Minimum moves will be calculated by the useEffect that listens to score changes
        }, 1500); // Animation duration
    };

    return (
        <div className={`min-h-screen flex items-center justify-center p-4 transition-colors ${
            isDarkMode 
                ? 'bg-linear-to-br from-slate-900 via-slate-800 to-slate-900' 
                : 'bg-linear-to-br from-slate-100 via-slate-50 to-slate-100'
        }`}>
            <div className="max-w-4xl w-full relative">
                {/* Header Controls */}
                <div className="absolute top-0 left-0 right-0 flex justify-between items-center z-10 px-0">
                    {/* Home Icon - Top Left */}
                    <Link href="/">
                        <button className={`p-2 rounded-full transition-colors ${
                            isDarkMode
                                ? 'bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white'
                                : 'bg-slate-200/50 hover:bg-slate-300/50 text-slate-700 hover:text-slate-900'
                        }`}
                        aria-label="Home">
                            <Home className="w-6 h-6" />
                        </button>
                    </Link>

                    {/* Right side controls */}
                    <div className="flex gap-3">
                        {/* Info Icon */}
                        <button
                            onClick={() => setShowInfoModal(true)}
                            className={`p-2 rounded-full transition-colors ${
                                isDarkMode
                                    ? 'bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white'
                                    : 'bg-slate-200/50 hover:bg-slate-300/50 text-slate-700 hover:text-slate-900'
                            }`}
                            aria-label="How to Play"
                        >
                            <Info className="w-6 h-6" />
                        </button>

                        {/* Theme Toggle */}
                        <button
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className={`p-2 rounded-full transition-colors ${
                                isDarkMode
                                    ? 'bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white'
                                    : 'bg-slate-200/50 hover:bg-slate-300/50 text-slate-700 hover:text-slate-900'
                            }`}
                            aria-label="Toggle Theme"
                        >
                            {isDarkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className={`text-5xl font-bold mb-2 flex items-center justify-center gap-3 ${
                        isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                        <Coffee className="w-12 h-12 text-amber-500" />
                        The Office Coffee Run
                    </h1>
                    <p className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>{currentLevel.name}</p>
                    <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {currentLevel.gridSize}x{currentLevel.gridSize} Grid
                    </p>
                </div>

                {/* Level Switcher */}
                <div className="mb-6">
                    <div className="text-center mb-3">
                        <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
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
                                            : isDarkMode 
                                                ? 'bg-slate-700/80 text-slate-300 hover:bg-slate-600'
                                                : 'bg-slate-200/80 text-slate-700 hover:bg-slate-300'
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
                                            <div className={`text-xs opacity-80 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                                {level.gridSize}x{level.gridSize} • Max {level.maxManagers} 👔
                                            </div>
                                        </div>
                                    </div>
                                </motion.button>
                            );
                        })}
                    </div>
                </div>

                {/* Game Stats */}
                <div className={`flex justify-between items-center mb-6 backdrop-blur rounded-lg p-4 ${
                    isDarkMode ? 'bg-slate-800/50' : 'bg-slate-200/50'
                }`}>
                    <div className="text-center">
                        <div className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{score}</div>
                        <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Deliveries</div>
                        {score < 5 && gameStarted && !gameOver && (
                            <div className={`text-xs mt-1 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                                {5 - score} until manager
                            </div>
                        )}
                    </div>
                    {currentLevel.maxManagers && currentLevel.maxManagers > 0 && (
                        <div className="text-center">
                            <div className={`text-3xl font-bold ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                                {tiles.filter(t => t.tileTypeId === 'manager').length}
                            </div>
                            <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Managers 👔</div>
                        </div>
                    )}
                    {gameStarted && movesRestricted && (
                        <div className="text-center">
                            <div className={`text-3xl font-bold ${
                                currentMoves >= allowedMoves
                                    ? 'text-red-500 animate-pulse'
                                    : currentMoves >= allowedMoves * 0.8
                                    ? 'text-yellow-500'
                                    : isDarkMode ? 'text-cyan-400' : 'text-cyan-600'
                            }`}>
                                {currentMoves}/{allowedMoves === Infinity ? '∞' : allowedMoves}
                            </div>
                            <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Moves</div>
                            <div className={`text-xs mt-1 ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                                Min: {minimumMoves}
                            </div>
                        </div>
                    )}
                    {gameStarted && (
                        <div className="text-center">
                            <CEOAvatar mood={ceoMood} isDarkMode={isDarkMode} />
                        </div>
                    )}
                    <div className="text-center">
                        {currentLevel.gameDuration > 0 ? (
                            <>
                                <div className={`text-3xl font-bold ${
                                    (currentLevel.gameDuration - timeElapsed) <= 10 
                                        ? 'text-red-500 animate-pulse' 
                                        : isDarkMode ? 'text-white' : 'text-slate-900'
                                }`}>
                                    {Math.max(0, currentLevel.gameDuration - timeElapsed)}s
                                </div>
                                <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Time Left</div>
                            </>
                        ) : (
                            <>
                                <div className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    {Math.floor(timeElapsed / 60)}:{(timeElapsed % 60).toString().padStart(2, '0')}
                                </div>
                                <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Time</div>
                            </>
                        )}
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
                        {/* Employee positioning - consistent pattern for all grid sizes */}
                        {(() => {
                            // Calculate employee gap based on grid size
                            // Using fixed gaps that work well visually
                            const employeeGap = 
                                currentLevel.gridSize === 4 ? 60 : // 4x4: 60px
                                currentLevel.gridSize === 5 ? 40 : // 5x5: 40px
                                25; // 6x6: 25px

                            return (
                                <>
                                    {/* Top Employees */}
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 flex" style={{ gap: `${employeeGap}px` }}>
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
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col" style={{ gap: `${employeeGap}px` }}>
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
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex" style={{ gap: `${employeeGap}px` }}>
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
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 flex flex-col" style={{ gap: `${employeeGap}px` }}>
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
                                </>
                            );
                        })()}

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
                                        <div key={idx} className={`relative ${tileSize} rounded-lg ${
                                            isDarkMode ? 'bg-slate-700/30' : 'bg-slate-300/30'
                                        }`}>
                                            {tile && (
                                                <GameTile
                                                    tile={tile}
                                                    tileType={tileType}
                                                    isSpecialTile={isSpecialTile}
                                                    onClick={() => handleTileClick(tile)}
                                                    disabled={!gameStarted || gameOver || gameWon}
                                                    canPour={isSpecialTile && canPour}
                                                    pourDirection={pourDirection}
                                                    onPour={handlePour}
                                                    isPouring={isPouring}
                                                    gridSize={currentLevel.gridSize}
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info Modal */}
                <AnimatePresence>
                    {showInfoModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
                            onClick={() => setShowInfoModal(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className={`rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto ${
                                    isDarkMode ? 'bg-slate-800' : 'bg-white'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <h2 className={`text-3xl font-bold flex items-center gap-2 ${
                                        isDarkMode ? 'text-white' : 'text-slate-900'
                                    }`}>
                                        <Info className="w-8 h-8 text-amber-500" />
                                        How to Play
                                    </h2>
                                    <button
                                        onClick={() => setShowInfoModal(false)}
                                        className={`p-2 rounded-full transition-colors ${
                                            isDarkMode
                                                ? 'hover:bg-slate-700 text-slate-400 hover:text-white'
                                                : 'hover:bg-slate-200 text-slate-600 hover:text-slate-900'
                                        }`}
                                        aria-label="Close"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className={`space-y-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                    <div>
                                        <h3 className={`text-xl font-semibold mb-2 ${
                                            isDarkMode ? 'text-white' : 'text-slate-900'
                                        }`}>🎮 Game Overview</h3>
                                        <p className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>
                                            Slide tiles in a puzzle grid to position special tiles (coffee, GitHub issues, support tickets) and deliver them to sleeping employees. Avoid managers and score as many points as possible!
                                        </p>
                                    </div>

                                    <div>
                                        <h3 className={`text-xl font-semibold mb-2 ${
                                            isDarkMode ? 'text-white' : 'text-slate-900'
                                        }`}>📋 Instructions</h3>
                                        <ol className="list-decimal list-inside space-y-2 ml-2">
                                            <li>Click <strong>Start Game</strong> to begin</li>
                                            <li><strong>Slide tiles</strong> by clicking on tiles adjacent to the empty space</li>
                                            <li><strong>Find the sleeper</strong>: Look for the employee with a red background and 😴 emoji</li>
                                            <li><strong>Position the special tile</strong>: Move the special tile (coffee, GitHub issue, etc.) to the grid cell next to the sleeping employee</li>
                                            <li><strong>Deliver</strong>: When positioned correctly, a green button will appear - click to deliver!</li>
                                            <li><strong>Score points</strong>: Each delivery = +1 point</li>
                                            <li><strong>Avoid managers</strong>: After 5 deliveries, managers 👔 will appear and move around. Don't let them catch your special tile!</li>
                                            <li><strong>Beat the clock</strong>: Score as many points as possible (or solve the puzzle for bonus points)</li>
                                        </ol>
                                    </div>

                                    <div>
                                        <h3 className={`text-xl font-semibold mb-2 ${
                                            isDarkMode ? 'text-white' : 'text-slate-900'
                                        }`}>🏆 Winning Condition</h3>
                                        <p className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>
                                            Solve the puzzle by arranging tiles 1-15 in order AND keep the CEO neutral or happy to win +15 bonus points!
                                        </p>
                                    </div>

                                    <div>
                                        <h3 className={`text-xl font-semibold mb-2 ${
                                            isDarkMode ? 'text-white' : 'text-slate-900'
                                        }`}>👔 Managers</h3>
                                        <ul className="list-disc list-inside space-y-1 ml-2">
                                            <li>Managers appear after <strong>5 deliveries</strong></li>
                                            <li>They move around the grid after each delivery</li>
                                            <li>If a manager is adjacent to your special tile, <strong>game over!</strong></li>
                                            <li>More managers spawn as your score increases</li>
                                            <li>Managers are immovable obstacles - plan your moves carefully!</li>
                                        </ul>
                                    </div>

                                    <div>
                                        <h3 className={`text-xl font-semibold mb-2 ${
                                            isDarkMode ? 'text-white' : 'text-slate-900'
                                        }`}>🎯 Move Restrictions</h3>
                                        <ul className="list-disc list-inside space-y-1 ml-2">
                                            <li>After <strong>10 deliveries</strong>, moves become limited per delivery</li>
                                            <li>The game calculates the <strong>minimum moves</strong> needed to reach the destination</li>
                                            <li>You get <strong>minimum + bonus moves</strong> (bonus starts at +5, gradually decreases)</li>
                                            <li>Each tile swap counts as one move</li>
                                            <li>Moves reset after each delivery</li>
                                            <li>If you run out of moves, <strong>game over!</strong></li>
                                            <li>Plan your path efficiently!</li>
                                        </ul>
                                    </div>

                                    <div>
                                        <h3 className={`text-xl font-semibold mb-2 ${
                                            isDarkMode ? 'text-white' : 'text-slate-900'
                                        }`}>😊 CEO Mood</h3>
                                        <ul className="list-disc list-inside space-y-1 ml-2">
                                            <li><span className="text-green-500">😊 Happy</span>: Score ≥ 10 points</li>
                                            <li><span className="text-blue-500">😐 Neutral</span>: Default state</li>
                                            <li><span className="text-red-500">😠 Frustrated</span>: Time ≤ 10s AND score &lt; 5</li>
                                        </ul>
                                    </div>

                                    <div className={`pt-4 border-t ${
                                        isDarkMode ? 'border-slate-700' : 'border-slate-300'
                                    }`}>
                                        <p className={`text-sm ${
                                            isDarkMode ? 'text-slate-400' : 'text-slate-600'
                                        }`}>
                                            <strong>Tip:</strong> The faster you deliver coffee, the happier the CEO will be! 🎯
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

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
                                className={`rounded-2xl p-8 text-center max-w-md ${
                                    isDarkMode ? 'bg-slate-800' : 'bg-white'
                                }`}
                            >
                                {gameWon ? (
                                    <>
                                        <h2 className="text-4xl font-bold text-green-500 mb-4">🎉 You Won!</h2>
                                        <p className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Puzzle Solved!</p>
                                        <p className="text-6xl font-bold text-green-500 mb-2">{score}</p>
                                        <p className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Total Score</p>
                                        <p className="text-sm text-green-400 mb-6">+15 Bonus Points!</p>
                                    </>
                                ) : (
                                    <>
                                        <h2 className={`text-4xl font-bold mb-2 ${
                                            isDarkMode ? 'text-white' : 'text-slate-900'
                                        }`}>Game Over!</h2>
                                        {gameOverReason && (
                                            <p className={`text-xl mb-4 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>{gameOverReason}</p>
                                        )}
                                        <div className={`rounded-lg p-6 mb-6 ${isDarkMode ? 'bg-slate-700/50' : 'bg-slate-200/50'}`}>
                                            <p className="text-6xl font-bold text-amber-500 mb-2">{score}</p>
                                            <p className={`mb-4 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Deliveries Completed</p>
                                            <div className="flex justify-center gap-6 text-sm">
                                                <div>
                                                    <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                        {Math.floor(timeElapsed / 60)}:{(timeElapsed % 60).toString().padStart(2, '0')}
                                                    </p>
                                                    <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>Time Survived</p>
                                                </div>
                                                {currentLevel.maxManagers && currentLevel.maxManagers > 0 && (
                                                    <div>
                                                        <p className={`text-2xl font-bold ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>{managerCount}</p>
                                                        <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>Managers Spawned</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
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
