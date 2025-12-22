'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Upload, Hash, Image as ImageIcon, RotateCcw, Home, Trophy, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

// Types
interface Position {
    row: number;
    col: number;
}

interface Tile {
    value: number;
    position: Position;
}

type GameMode = 'numbers' | 'image';

// Constants
const GRID_SIZE = 4;
const TOTAL_TILES = GRID_SIZE * GRID_SIZE;

export default function ClassicPuzzle() {
    // Theme
    const [isDarkMode, setIsDarkMode] = useState(true);
    
    // Game mode
    const [gameMode, setGameMode] = useState<GameMode>('numbers');
    const [customImage, setCustomImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Game state
    const [tiles, setTiles] = useState<Tile[]>([]);
    const [emptyPos, setEmptyPos] = useState<Position>({ row: 3, col: 3 });
    const [moves, setMoves] = useState(0);
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [gameStarted, setGameStarted] = useState(false);
    const [gameWon, setGameWon] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [isShuffling, setIsShuffling] = useState(false);
    const [showReference, setShowReference] = useState(false);

    // Check if puzzle is solved
    const checkWin = useCallback((currentTiles: Tile[]): boolean => {
        for (const tile of currentTiles) {
            const expectedRow = Math.floor((tile.value - 1) / GRID_SIZE);
            const expectedCol = (tile.value - 1) % GRID_SIZE;
            if (tile.position.row !== expectedRow || tile.position.col !== expectedCol) {
                return false;
            }
        }
        return true;
    }, []);

    // Initialize tiles in solved state
    const initTiles = useCallback((): Tile[] => {
        const newTiles: Tile[] = [];
        for (let i = 1; i < TOTAL_TILES; i++) {
            newTiles.push({
                value: i,
                position: {
                    row: Math.floor((i - 1) / GRID_SIZE),
                    col: (i - 1) % GRID_SIZE
                }
            });
        }
        return newTiles;
    }, []);

    // Shuffle tiles using valid moves to ensure solvability
    const shuffleTiles = useCallback((tiles: Tile[], empty: Position): { tiles: Tile[], emptyPos: Position } => {
        let currentTiles = tiles.map(t => ({ ...t, position: { ...t.position } }));
        let currentEmpty = { ...empty };
        
        const directions = [
            { row: -1, col: 0 },
            { row: 1, col: 0 },
            { row: 0, col: -1 },
            { row: 0, col: 1 }
        ];
        
        // Perform many random moves to shuffle
        for (let i = 0; i < 200; i++) {
            const validMoves: Position[] = [];
            
            for (const dir of directions) {
                const newRow = currentEmpty.row + dir.row;
                const newCol = currentEmpty.col + dir.col;
                
                if (newRow >= 0 && newRow < GRID_SIZE && newCol >= 0 && newCol < GRID_SIZE) {
                    validMoves.push({ row: newRow, col: newCol });
                }
            }
            
            const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
            
            // Find tile at this position and swap with empty
            currentTiles = currentTiles.map(t => {
                if (t.position.row === randomMove.row && t.position.col === randomMove.col) {
                    return { ...t, position: { ...currentEmpty } };
                }
                return t;
            });
            
            currentEmpty = randomMove;
        }
        
        return { tiles: currentTiles, emptyPos: currentEmpty };
    }, []);

    // Start new game
    const startGame = useCallback(() => {
        setIsShuffling(true);
        const initialTiles = initTiles();
        
        // Small delay for visual effect
        setTimeout(() => {
            const { tiles: shuffledTiles, emptyPos: newEmptyPos } = shuffleTiles(initialTiles, { row: 3, col: 3 });
            setTiles(shuffledTiles);
            setEmptyPos(newEmptyPos);
            setMoves(0);
            setTimeElapsed(0);
            setGameStarted(true);
            setGameWon(false);
            setIsShuffling(false);
        }, 300);
    }, [initTiles, shuffleTiles]);

    // Handle tile click
    const handleTileClick = (tile: Tile) => {
        if (!gameStarted || gameWon || isShuffling) return;

        const { row, col } = tile.position;
        const { row: emptyRow, col: emptyCol } = emptyPos;

        // Check if tile is adjacent to empty slot
        const isAdjacent =
            (row === emptyRow && Math.abs(col - emptyCol) === 1) ||
            (col === emptyCol && Math.abs(row - emptyRow) === 1);

        if (!isAdjacent) return;

        // Swap tile with empty slot
        const newTiles = tiles.map(t =>
            t.value === tile.value
                ? { ...t, position: { ...emptyPos } }
                : t
        );

        setTiles(newTiles);
        setEmptyPos({ row, col });
        setMoves(prev => prev + 1);

        // Check win condition
        if (checkWin(newTiles)) {
            setGameWon(true);
            // Show results after a delay to let user see the completed puzzle
            setTimeout(() => {
                setShowResults(true);
            }, 1500);
        }
    };

    // Timer effect
    useEffect(() => {
        if (!gameStarted || gameWon) return;

        const timer = setInterval(() => {
            setTimeElapsed(prev => prev + 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [gameStarted, gameWon]);

    // Handle image upload
    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new window.Image();
            img.onload = () => {
                // Create canvas to make image square
                const canvas = document.createElement('canvas');
                const size = Math.min(img.width, img.height);
                canvas.width = 400;
                canvas.height = 400;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    // Center crop to square
                    const sx = (img.width - size) / 2;
                    const sy = (img.height - size) / 2;
                    ctx.drawImage(img, sx, sy, size, size, 0, 0, 400, 400);
                    setCustomImage(canvas.toDataURL());
                    setGameMode('image');
                }
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    // Format time
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Get tile background style for image mode
    // Uses percentage-based positioning to work with any tile size
    const getTileStyle = (value: number): React.CSSProperties => {
        if (gameMode !== 'image' || !customImage) return {};
        
        const row = Math.floor((value - 1) / GRID_SIZE);
        const col = (value - 1) % GRID_SIZE;
        
        // Use 400% size so each tile shows 1/4 of the image
        // Position is calculated as percentage: col * (100/3)% for 4 columns
        return {
            backgroundImage: `url(${customImage})`,
            backgroundSize: '400% 400%',
            backgroundPosition: `${col * (100 / 3)}% ${row * (100 / 3)}%`
        };
    };

    return (
        <div className={`min-h-screen flex items-center justify-center p-4 transition-colors ${
            isDarkMode 
                ? 'bg-linear-to-br from-slate-900 via-slate-800 to-slate-900' 
                : 'bg-linear-to-br from-slate-100 via-slate-50 to-slate-100'
        }`}>
            <div className={`w-full relative transition-all ${showReference ? 'max-w-3xl' : 'max-w-lg'}`}>
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <Link href="/" className={`p-2 rounded-full transition-colors ${
                        isDarkMode
                            ? 'bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white'
                            : 'bg-slate-200/50 hover:bg-slate-300/50 text-slate-700 hover:text-slate-900'
                    }`}>
                        <Home className="w-6 h-6" />
                    </Link>
                    
                    <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        15 Puzzle
                    </h1>
                    
                    <div className="flex gap-2">
                        {/* Reference Image Toggle - only show in image mode when game started */}
                        {gameMode === 'image' && customImage && gameStarted && !showResults && (
                            <button
                                onClick={() => setShowReference(!showReference)}
                                className={`p-2 rounded-full transition-colors ${
                                    showReference
                                        ? isDarkMode
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-purple-500 text-white'
                                        : isDarkMode
                                            ? 'bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white'
                                            : 'bg-slate-200/50 hover:bg-slate-300/50 text-slate-700 hover:text-slate-900'
                                }`}
                                title={showReference ? 'Hide Reference' : 'Show Reference'}
                            >
                                {showReference ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                            </button>
                        )}
                        
                        <button
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className={`p-2 rounded-full transition-colors ${
                                isDarkMode
                                    ? 'bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white'
                                    : 'bg-slate-200/50 hover:bg-slate-300/50 text-slate-700 hover:text-slate-900'
                            }`}
                        >
                            {isDarkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {/* Mode Selector & Image Upload */}
                {!gameStarted && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6"
                    >
                        <div className={`flex gap-2 p-1 rounded-xl ${
                            isDarkMode ? 'bg-slate-800/50' : 'bg-slate-200/50'
                        }`}>
                            <button
                                onClick={() => setGameMode('numbers')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-all ${
                                    gameMode === 'numbers'
                                        ? isDarkMode
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-blue-500 text-white'
                                        : isDarkMode
                                            ? 'text-slate-400 hover:text-white'
                                            : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <Hash className="w-5 h-5" />
                                Numbers
                            </button>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-all ${
                                    gameMode === 'image'
                                        ? isDarkMode
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-purple-500 text-white'
                                        : isDarkMode
                                            ? 'text-slate-400 hover:text-white'
                                            : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <ImageIcon className="w-5 h-5" />
                                Custom Image
                            </button>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                        />
                        
                        {/* Image Preview */}
                        {gameMode === 'image' && customImage && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="mt-4 flex justify-center"
                            >
                                <div className="relative">
                                    <img
                                        src={customImage}
                                        alt="Puzzle preview"
                                        className="w-32 h-32 rounded-lg object-cover"
                                    />
                                    <div className={`absolute inset-0 rounded-lg border-2 ${
                                        isDarkMode ? 'border-purple-500' : 'border-purple-400'
                                    }`} />
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                )}

                {/* Stats Bar */}
                {gameStarted && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex justify-between items-center mb-4 p-4 rounded-xl ${
                            isDarkMode ? 'bg-slate-800/50' : 'bg-slate-200/50'
                        }`}
                    >
                        <div className="text-center">
                            <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                {formatTime(timeElapsed)}
                            </div>
                            <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                Time
                            </div>
                        </div>
                        <div className="text-center">
                            <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                {moves}
                            </div>
                            <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                Moves
                            </div>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className={`p-2 rounded-lg transition-colors ${
                                isDarkMode
                                    ? 'bg-slate-700 hover:bg-slate-600 text-white'
                                    : 'bg-slate-300 hover:bg-slate-400 text-slate-900'
                            }`}
                            title="Start Over"
                        >
                            <RotateCcw className="w-5 h-5" />
                        </button>
                    </motion.div>
                )}

                {/* Game Board Container */}
                <div className={`flex gap-4 ${showReference ? 'flex-row' : 'flex-col'}`}>
                    {/* Reference Image */}
                    <AnimatePresence>
                        {showReference && customImage && (
                            <motion.div
                                initial={{ opacity: 0, x: -20, width: 0 }}
                                animate={{ opacity: 1, x: 0, width: 'auto' }}
                                exit={{ opacity: 0, x: -20, width: 0 }}
                                className={`relative rounded-2xl p-3 flex-shrink-0 ${
                                    isDarkMode ? 'bg-slate-800/80' : 'bg-slate-200/80'
                                }`}
                            >
                                <div className="aspect-square w-48 md:w-64">
                                    <img
                                        src={customImage}
                                        alt="Reference"
                                        className="w-full h-full rounded-lg object-cover"
                                    />
                                </div>
                                <div className={`text-center mt-2 text-sm font-medium ${
                                    isDarkMode ? 'text-slate-400' : 'text-slate-600'
                                }`}>
                                    Reference
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    
                    {/* Game Board */}
                    <div className={`relative rounded-2xl p-3 flex-1 ${
                        isDarkMode ? 'bg-slate-800/80' : 'bg-slate-200/80'
                    }`}>
                    {/* Puzzle Grid */}
                    <div className="relative aspect-square">
                        <div className="grid grid-cols-4 gap-2 h-full">
                            {Array.from({ length: TOTAL_TILES }).map((_, idx) => {
                                const row = Math.floor(idx / GRID_SIZE);
                                const col = idx % GRID_SIZE;
                                const tile = tiles.find(t => t.position.row === row && t.position.col === col);
                                const isEmpty = emptyPos.row === row && emptyPos.col === col;
                                
                                // Show 16th piece when game is won
                                const showFinalPiece = gameWon && isEmpty;

                                return (
                                    <div
                                        key={idx}
                                        className={`relative rounded-lg ${
                                            isDarkMode ? 'bg-slate-700/30' : 'bg-slate-300/30'
                                        }`}
                                    >
                                        {tile && (
                                            <motion.div
                                                layout
                                                layoutId={`tile-${tile.value}`}
                                                initial={false}
                                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                                className="absolute inset-0"
                                            >
                                                <button
                                                    onClick={() => handleTileClick(tile)}
                                                    disabled={!gameStarted || gameWon}
                                                    className={`w-full h-full rounded-lg font-bold text-2xl cursor-pointer transition-all flex items-center justify-center ${
                                                        gameMode === 'numbers'
                                                            ? isDarkMode
                                                                ? 'bg-linear-to-br from-blue-500 via-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 hover:from-blue-400 hover:via-blue-500 hover:to-blue-600'
                                                                : 'bg-linear-to-br from-blue-400 via-blue-500 to-blue-600 text-white shadow-lg shadow-blue-400/30 hover:from-blue-300 hover:via-blue-400 hover:to-blue-500'
                                                            : 'shadow-lg rounded-lg'
                                                    } ${!gameStarted || gameWon ? '' : 'hover:scale-105'}`}
                                                    style={gameMode === 'image' ? getTileStyle(tile.value) : {}}
                                                >
                                                    {gameMode === 'numbers' && tile.value}
                                                </button>
                                            </motion.div>
                                        )}
                                        
                                        {/* Show 16th piece when won */}
                                        {showFinalPiece && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.3, type: 'spring' }}
                                                className={`absolute inset-0 rounded-lg font-bold text-2xl flex items-center justify-center ${
                                                    gameMode === 'numbers'
                                                        ? isDarkMode
                                                            ? 'bg-linear-to-br from-green-500 via-green-600 to-green-700 text-white shadow-lg shadow-green-500/30'
                                                            : 'bg-linear-to-br from-green-400 via-green-500 to-green-600 text-white shadow-lg shadow-green-400/30'
                                                        : 'shadow-lg'
                                                }`}
                                                style={gameMode === 'image' ? getTileStyle(16) : {}}
                                            >
                                                {gameMode === 'numbers' && 16}
                                            </motion.div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Start Overlay */}
                    <AnimatePresence>
                        {!gameStarted && !isShuffling && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 rounded-2xl flex items-center justify-center bg-black/50 backdrop-blur-sm"
                            >
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={startGame}
                                    className={`px-8 py-4 rounded-xl font-bold text-xl shadow-lg transition-colors ${
                                        gameMode === 'image' && customImage
                                            ? 'bg-purple-600 hover:bg-purple-500 text-white'
                                            : 'bg-blue-600 hover:bg-blue-500 text-white'
                                    }`}
                                >
                                    {gameMode === 'image' && customImage ? 'Start Image Puzzle' : 'Start Puzzle'}
                                </motion.button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Shuffling Overlay */}
                    <AnimatePresence>
                        {isShuffling && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 rounded-2xl flex items-center justify-center bg-black/50 backdrop-blur-sm"
                            >
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                    className="w-12 h-12 border-4 border-white border-t-transparent rounded-full"
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Win Overlay */}
                    <AnimatePresence>
                        {showResults && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm"
                            >
                                <motion.div
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: 'spring', delay: 0.2 }}
                                    className="mb-4"
                                >
                                    <Trophy className="w-20 h-20 text-yellow-400" />
                                </motion.div>
                                
                                <motion.h2
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                    className="text-3xl font-bold text-white mb-6"
                                >
                                    Puzzle Solved!
                                </motion.h2>
                                
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                    className="flex gap-8 mb-6"
                                >
                                    <div className="text-center">
                                        <div className="text-4xl font-bold text-white">{formatTime(timeElapsed)}</div>
                                        <div className="text-slate-400">Time</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-4xl font-bold text-white">{moves}</div>
                                        <div className="text-slate-400">Moves</div>
                                    </div>
                                </motion.div>
                                
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.6 }}
                                    className="flex gap-4"
                                >
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors"
                                    >
                                        Play Again
                                    </button>
                                    <Link
                                        href="/"
                                        className="px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-semibold transition-colors"
                                    >
                                        Home
                                    </Link>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    </div>
                </div>

                {/* Instructions */}
                {!gameStarted && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className={`mt-6 text-center ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}
                    >
                        <p className="text-sm">
                            Click tiles adjacent to the empty space to move them.
                            <br />
                            Arrange tiles from 1 to 15 (or complete the image).
                        </p>
                    </motion.div>
                )}
            </div>
        </div>
    );
}

