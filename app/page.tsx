'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, Info, X } from 'lucide-react';

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
} from '@/utils/game.utils';
import { playDeliverySound, initAudio } from '@/utils/sound.utils';

// Components
import { GameTile } from '@/components/GameTile';
import { EmployeeAvatar } from '@/components/EmployeeAvatar';
import { CEOAvatar } from '@/components/CEOAvatar';

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
    const [gameWon, setGameWon] = useState(false);
    
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
        setCeoMood('neutral');
        setGameWon(false);
        
        // Initialize audio context on game start
        initAudio();
    }, [currentLevel]);

    // Timer
    useEffect(() => {
        if (!gameStarted || gameOver || gameWon) return;

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
    }, [gameStarted, gameOver, gameWon]);

    // Check for pour opportunity
    useEffect(() => {
        if (!sleepingEmployee || !gameStarted || gameOver || gameWon) return;

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
    }, [tiles, emptyPos, sleepingEmployee, specialTileId, gameStarted, gameOver, gameWon, currentLevel]);

    // Update CEO mood based on performance
    useEffect(() => {
        if (!gameStarted || gameOver || gameWon) return;
        
        if (score >= 10) setCeoMood('happy');
        else if (timeLeft <= 10 && score < 5) setCeoMood('frustrated');
        else setCeoMood('neutral');
    }, [score, timeLeft, gameStarted, gameOver, gameWon]);

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
        
        // Play delivery sound effect
        playDeliverySound();

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
            <div className="max-w-4xl w-full relative">
                {/* Info Icon - Top Right */}
                <button
                    onClick={() => setShowInfoModal(true)}
                    className="absolute top-0 right-0 p-2 rounded-full bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white transition-colors z-10"
                    aria-label="How to Play"
                >
                    <Info className="w-6 h-6" />
                </button>

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
                    {/* CEO Watching */}
                    {gameStarted && (
                        <div className="absolute -top-24 left-1/2 -translate-x-1/2">
                            <CEOAvatar mood={ceoMood} />
                        </div>
                    )}
                    
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
                                                    disabled={!gameStarted || gameOver || gameWon}
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
                                className="bg-slate-800 rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <h2 className="text-3xl font-bold text-white flex items-center gap-2">
                                        <Info className="w-8 h-8 text-amber-500" />
                                        How to Play
                                    </h2>
                                    <button
                                        onClick={() => setShowInfoModal(false)}
                                        className="p-2 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                                        aria-label="Close"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="space-y-6 text-slate-300">
                                    <div>
                                        <h3 className="text-xl font-semibold text-white mb-2">🎮 Game Overview</h3>
                                        <p className="text-slate-300">
                                            Slide tiles in a 4×4 grid to position the coffee tile and deliver coffee to sleeping employees before time runs out!
                                        </p>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-semibold text-white mb-2">📋 Instructions</h3>
                                        <ol className="list-decimal list-inside space-y-2 ml-2">
                                            <li>Click <strong>Start Game</strong> to begin</li>
                                            <li><strong>Slide tiles</strong> by clicking on tiles adjacent to the empty space</li>
                                            <li><strong>Find the sleeper</strong>: Look for the employee with a red background and 😴 emoji</li>
                                            <li><strong>Position the coffee</strong>: Move the orange coffee tile (tile #15) to the grid cell next to the sleeping employee</li>
                                            <li><strong>Deliver</strong>: When positioned correctly, green arrow(s) will appear - click to deliver!</li>
                                            <li><strong>Score points</strong>: Each delivery = +1 point</li>
                                            <li><strong>Beat the clock</strong>: You have 60 seconds to score as many points as possible</li>
                                        </ol>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-semibold text-white mb-2">🏆 Winning Condition</h3>
                                        <p className="text-slate-300">
                                            Solve the puzzle by arranging tiles 1-15 in order AND keep the CEO neutral or happy to win +15 bonus points!
                                        </p>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-semibold text-white mb-2">👔 CEO Mood</h3>
                                        <ul className="list-disc list-inside space-y-1 ml-2">
                                            <li><span className="text-green-500">😊 Happy</span>: Score ≥ 10 points</li>
                                            <li><span className="text-blue-500">😐 Neutral</span>: Default state</li>
                                            <li><span className="text-red-500">😠 Frustrated</span>: Time ≤ 10s AND score &lt; 5</li>
                                        </ul>
                                    </div>

                                    <div className="pt-4 border-t border-slate-700">
                                        <p className="text-sm text-slate-400">
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
                                className="bg-slate-800 rounded-2xl p-8 text-center max-w-md"
                            >
                                {gameWon ? (
                                    <>
                                        <h2 className="text-4xl font-bold text-green-500 mb-4">🎉 You Won!</h2>
                                        <p className="text-slate-300 mb-2">Puzzle Solved!</p>
                                        <p className="text-6xl font-bold text-green-500 mb-2">{score}</p>
                                        <p className="text-slate-300 mb-1">Total Score</p>
                                        <p className="text-sm text-green-400 mb-6">+15 Bonus Points!</p>
                                    </>
                                ) : (
                                    <>
                                        <h2 className="text-4xl font-bold text-white mb-4">Time&apos;s Up!</h2>
                                        <p className="text-6xl font-bold text-amber-500 mb-2">{score}</p>
                                        <p className="text-slate-300 mb-6">Coffees Delivered</p>
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
