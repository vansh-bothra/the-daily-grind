'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Sun, Moon, RotateCw, Home, Info, X, Flag, Move, Clock, Users, Trophy } from 'lucide-react';
import Link from 'next/link';
import { Cell, Piece } from '@/types/puzzle.types';
import {
    PUZZLE_PIECES,
    createRectangularBoard,
    createHexagonalBoard,
    canPlacePiece,
    placePiece,
    removePiece,
    isPuzzleSolved,
    getAvailableDates,
    formatDate,
} from '@/utils/puzzle.utils';

export default function PuzzleADay() {
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [targetDate, setTargetDate] = useState<Date>(new Date());
    const [board, setBoard] = useState<Cell[]>([]);
    const [pieces, setPieces] = useState<Piece[]>([]);
    const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
    const [draggedPiece, setDraggedPiece] = useState<string | null>(null);
    const [dragOverCell, setDragOverCell] = useState<string | null>(null);
    const [previewPosition, setPreviewPosition] = useState<{ row: number; col: number } | null>(null);
    const [canPlacePreview, setCanPlacePreview] = useState(false);
    const [solved, setSolved] = useState(false);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [showSolution, setShowSolution] = useState(false);
    const [availableDates] = useState(getAvailableDates());
    const [startTime, setStartTime] = useState<number | null>(null);
    const [solveTime, setSolveTime] = useState<number | null>(null);

    // Initialize board and pieces
    useEffect(() => {
        const newBoard = createRectangularBoard(targetDate);
        setBoard(newBoard);
        
        const newPieces: Piece[] = PUZZLE_PIECES.map(p => ({
            ...p,
            placed: false,
            position: undefined,
        }));
        setPieces(newPieces);
        setSolved(false);
        setShowSolution(false);
        setStartTime(Date.now());
        setSolveTime(null);
    }, [targetDate]);

    // Check if puzzle is solved
    useEffect(() => {
        if (board.length > 0) {
            const isSolved = isPuzzleSolved(board);
            if (isSolved && !solved && startTime) {
                setSolveTime(Math.floor((Date.now() - startTime) / 1000));
            }
            setSolved(isSolved);
        }
    }, [board, solved, startTime]);

    const handlePieceClick = (pieceId: string) => {
        setSelectedPiece(pieceId);
    };

    const handleRotatePiece = (pieceId: string, event?: React.MouseEvent) => {
        if (event) {
            event.stopPropagation();
        }
        
        setPieces(prev => prev.map(p => {
            if (p.id === pieceId) {
                const newRotation = (p.currentRotation + 1) % p.shapes.length;
                
                // If piece is placed, check if new rotation fits
                if (p.placed && p.position) {
                    const testPiece = { ...p, currentRotation: newRotation };
                    // Remove piece temporarily
                    const tempBoard = removePiece(pieceId, board);
                    if (canPlacePiece(testPiece, p.position, tempBoard)) {
                        // Place with new rotation
                        const newBoard = placePiece(testPiece, p.position, tempBoard);
                        setBoard(newBoard);
                        return { ...p, currentRotation: newRotation };
                    }
                    return p; // Can't rotate in current position
                }
                
                return { ...p, currentRotation: newRotation };
            }
            return p;
        }));
    };

    const handleRemovePiece = (pieceId: string, event?: React.MouseEvent) => {
        if (event) {
            event.stopPropagation();
        }
        setBoard(prev => removePiece(pieceId, prev));
        setPieces(prev => prev.map(p => 
            p.id === pieceId ? { ...p, placed: false, position: undefined } : p
        ));
    };

    const handleBoardCellClick = (cell: Cell) => {
        if (!selectedPiece || cell.type === 'empty') return;
        
        const piece = pieces.find(p => p.id === selectedPiece);
        if (!piece || piece.placed) return;
        
        const position = { row: cell.row, col: cell.col };
        
        if (canPlacePiece(piece, position, board)) {
            const newBoard = placePiece(piece, position, board);
            setBoard(newBoard);
            setPieces(prev => prev.map(p => 
                p.id === selectedPiece ? { ...p, placed: true, position } : p
            ));
            setSelectedPiece(null);
        }
    };

    // Drag and drop handlers
    const handleDragStart = (e: React.DragEvent, pieceId: string) => {
        setDraggedPiece(pieceId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', pieceId);
    };

    const handleDragEnd = () => {
        setDraggedPiece(null);
        setDragOverCell(null);
        setPreviewPosition(null);
        setCanPlacePreview(false);
    };

    const handleDragOver = (e: React.DragEvent, cell: Cell) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        if (cell.type === 'empty' || !draggedPiece) {
            setPreviewPosition(null);
            setCanPlacePreview(false);
            return;
        }
        
        const piece = pieces.find(p => p.id === draggedPiece);
        if (!piece) return;
        
        const position = { row: cell.row, col: cell.col };
        
        // Remove piece from board if it was already placed
        let tempBoard = board;
        if (piece.placed) {
            tempBoard = removePiece(piece.id, board);
        }
        
        // Check if piece can be placed at this position
        const canPlace = canPlacePiece(piece, position, tempBoard);
        setPreviewPosition(position);
        setCanPlacePreview(canPlace);
        setDragOverCell(cell.id);
    };

    const handleDragLeave = () => {
        setDragOverCell(null);
        setPreviewPosition(null);
        setCanPlacePreview(false);
    };

    const handleDrop = (e: React.DragEvent, cell: Cell) => {
        e.preventDefault();
        setDragOverCell(null);
        
        if (!draggedPiece || cell.type === 'empty') return;
        
        const piece = pieces.find(p => p.id === draggedPiece);
        if (!piece) return;
        
        const position = { row: cell.row, col: cell.col };
        
        // Remove piece from board if it was already placed
        let tempBoard = board;
        if (piece.placed) {
            tempBoard = removePiece(piece.id, board);
        }
        
        if (canPlacePiece(piece, position, tempBoard)) {
            const newBoard = placePiece(piece, position, tempBoard);
            setBoard(newBoard);
            setPieces(prev => prev.map(p => 
                p.id === draggedPiece ? { ...p, placed: true, position } : p
            ));
        }
    };

    const handlePieceBoardClick = (e: React.MouseEvent, pieceId: string) => {
        e.stopPropagation();
        setSelectedPiece(pieceId);
    };

    const handleReset = () => {
        const newBoard = createRectangularBoard(targetDate);
        setBoard(newBoard);
        
        const newPieces: Piece[] = PUZZLE_PIECES.map(p => ({
            ...p,
            placed: false,
            position: undefined,
            currentRotation: 0,
        }));
        setPieces(newPieces);
        setSolved(false);
        setShowSolution(false);
        setStartTime(Date.now());
        setSolveTime(null);
    };

    const handleGiveUp = () => {
        setShowSolution(true);
    };

    const getCellColor = (cell: Cell, isPreview: boolean = false) => {
        if (cell.type === 'empty') return isDarkMode ? 'bg-transparent' : 'bg-transparent';
        
        if (isPreview) {
            return canPlacePreview
                ? 'bg-green-500/40 border-2 border-green-400'
                : 'bg-red-500/40 border-2 border-red-400';
        }
        
        if (cell.isTarget) {
            return isDarkMode 
                ? 'bg-amber-500/30 border-2 border-amber-500' 
                : 'bg-amber-400/40 border-2 border-amber-600';
        }
        
        if (cell.isCovered && cell.coveredBy) {
            const piece = pieces.find(p => p.id === cell.coveredBy);
            if (piece) {
                return `bg-linear-to-br ${piece.color}`;
            }
        }
        
        return isDarkMode 
            ? 'bg-slate-700/50 hover:bg-slate-600/50' 
            : 'bg-slate-200/50 hover:bg-slate-300/50';
    };

    // Check if a cell is part of the preview
    const isCellInPreview = (cell: Cell): boolean => {
        if (!previewPosition || !draggedPiece) return false;
        
        const piece = pieces.find(p => p.id === draggedPiece);
        if (!piece) return false;
        
        const shape = piece.shapes[piece.currentRotation];
        return shape.cells.some(shapeCell => 
            previewPosition.row + shapeCell.row === cell.row &&
            previewPosition.col + shapeCell.col === cell.col
        );
    };

    return (
        <div className={`min-h-screen flex flex-col items-center justify-center p-4 transition-colors ${
            isDarkMode 
                ? 'bg-linear-to-br from-slate-900 via-slate-800 to-slate-900' 
                : 'bg-linear-to-br from-slate-100 via-slate-50 to-slate-100'
        }`}>
            <div className="max-w-7xl w-full relative">
                {/* Header Controls */}
                <div className="flex justify-between items-center mb-6">
                    <Link href="/">
                        <button className={`p-3 rounded-full transition-colors ${
                            isDarkMode
                                ? 'bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white'
                                : 'bg-slate-200/50 hover:bg-slate-300/50 text-slate-700 hover:text-slate-900'
                        }`}>
                            <Home className="w-6 h-6" />
                        </button>
                    </Link>

                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowSolution(true)}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                                isDarkMode
                                    ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                                    : 'bg-red-100 hover:bg-red-200 text-red-700'
                            }`}
                        >
                            <Flag className="w-5 h-5" />
                            Need Help?
                        </button>
                        <button
                            onClick={() => setShowInfoModal(true)}
                            className={`p-3 rounded-full transition-colors ${
                                isDarkMode
                                    ? 'bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white'
                                    : 'bg-slate-200/50 hover:bg-slate-300/50 text-slate-700 hover:text-slate-900'
                            }`}
                        >
                            <Info className="w-6 h-6" />
                        </button>
                        <button
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className={`p-3 rounded-full transition-colors ${
                                isDarkMode
                                    ? 'bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white'
                                    : 'bg-slate-200/50 hover:bg-slate-300/50 text-slate-700 hover:text-slate-900'
                            }`}
                        >
                            {isDarkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {/* Title */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <h1 className={`text-5xl md:text-6xl font-bold mb-4 flex items-center justify-center gap-3 ${
                        isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                        <Calendar className="w-12 h-12 text-amber-500" />
                        A Puzzle A Day
                    </h1>
                            <p className={`text-lg ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                Place all pieces to cover everything except the month and date
                            </p>
                </motion.div>


                {/* Date Selector */}
                <div className="flex justify-center gap-2 mb-8 flex-wrap">
                    {availableDates.map((date, index) => {
                        const isSelected = date.toDateString() === targetDate.toDateString();
                        const isToday = index === 0;
                        
                        return (
                            <button
                                key={date.toISOString()}
                                onClick={() => setTargetDate(date)}
                                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                                    isSelected
                                        ? 'bg-amber-500 text-white shadow-lg'
                                        : isDarkMode
                                        ? 'bg-slate-700/80 text-slate-300 hover:bg-slate-600'
                                        : 'bg-slate-200/80 text-slate-700 hover:bg-slate-300'
                                }`}
                            >
                                {isToday ? '🔥 Today' : formatDate(date)}
                            </button>
                        );
                    })}
                </div>

                {/* Main Game Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Board */}
                    <div className="lg:col-span-2">
                        <div className={`p-6 rounded-2xl ${
                            isDarkMode ? 'bg-slate-800/50 backdrop-blur' : 'bg-white/50 backdrop-blur'
                        }`}>
                            {/* Target Date Display */}
                            <div className={`text-center mb-6 p-4 rounded-lg ${
                                isDarkMode ? 'bg-slate-700/50' : 'bg-slate-200/50'
                            }`}>
                                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                    Puzzle for
                                </p>
                                <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    {formatDate(targetDate)}
                                </p>
                            </div>

                            {/* Board Grid */}
                            <div className="grid grid-cols-7 gap-2 max-w-2xl mx-auto puzzle-board">
                                {board.map((cell) => {
                                    const coveringPiece = cell.isCovered && cell.coveredBy 
                                        ? pieces.find(p => p.id === cell.coveredBy)
                                        : null;
                                    
                                    // Check if this cell is the top-left of a placed piece
                                    const isOriginCell = coveringPiece?.position?.row === cell.row && 
                                                        coveringPiece?.position?.col === cell.col;
                                    
                                    const isInPreview = isCellInPreview(cell);
                                    const showPreview = isInPreview && draggedPiece && (!cell.isCovered || cell.coveredBy === draggedPiece);
                                    
                                    return (
                                        <motion.div
                                            key={cell.id}
                                            onDragOver={(e: any) => handleDragOver(e, cell)}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e: any) => handleDrop(e, cell)}
                                            onClick={() => handleBoardCellClick(cell)}
                                            className={`aspect-square rounded-lg flex items-center justify-center text-sm font-bold transition-all relative ${
                                                showPreview ? getCellColor(cell, true) : getCellColor(cell)
                                            } ${
                                                cell.type === 'empty' ? 'invisible' : ''
                                            } ${
                                                selectedPiece && !cell.isCovered && cell.type !== 'empty'
                                                    ? 'cursor-pointer ring-2 ring-blue-400'
                                                    : ''
                                            } ${
                                                cell.isCovered && cell.coveredBy !== draggedPiece ? 'cursor-move' : 'cursor-pointer'
                                            }`}
                                            draggable={cell.isCovered && isOriginCell}
                                            onDragStart={(e: any) => {
                                                if (cell.coveredBy && isOriginCell) {
                                                    handleDragStart(e, cell.coveredBy);
                                                }
                                            }}
                                            onDragEnd={handleDragEnd}
                                        >
                                            {!cell.isCovered && !showPreview && (
                                                <span className={isDarkMode ? 'text-white' : 'text-slate-900'}>
                                                    {cell.value}
                                                </span>
                                            )}
                                            
                                            {/* Show piece controls on origin cell */}
                                            {cell.isCovered && isOriginCell && coveringPiece && !draggedPiece && (
                                                <div 
                                                    className="absolute inset-0 flex items-center justify-center gap-1 opacity-0 hover:opacity-100 transition-opacity bg-black/50 rounded-lg z-10"
                                                    onClick={(e) => handlePieceBoardClick(e, coveringPiece.id)}
                                                >
                                                    <button
                                                        onClick={(e) => handleRotatePiece(coveringPiece.id, e)}
                                                        className="p-1 bg-white rounded hover:bg-gray-200"
                                                        title="Rotate"
                                                    >
                                                        <RotateCw className="w-3 h-3 text-slate-900" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleRemovePiece(coveringPiece.id, e)}
                                                        className="p-1 bg-red-500 rounded hover:bg-red-600"
                                                        title="Remove"
                                                    >
                                                        <X className="w-3 h-3 text-white" />
                                                    </button>
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </div>

                            {/* Solution Message */}
                            {showSolution && !solved && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`mt-6 p-4 rounded-lg text-center ${
                                        isDarkMode ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-red-100 text-red-700 border border-red-300'
                                    }`}
                                >
                                    <p className="font-semibold">💡 This puzzle has multiple solutions!</p>
                                    <p className="text-sm mt-1">Try different combinations. Every date is solvable!</p>
                                </motion.div>
                            )}
                        </div>
                    </div>

                    {/* Pieces Panel */}
                    <div className="lg:col-span-1">
                        <div className={`p-6 rounded-2xl ${
                            isDarkMode ? 'bg-slate-800/50 backdrop-blur' : 'bg-white/50 backdrop-blur'
                        }`}>
                            <h2 className={`text-2xl font-bold mb-2 ${
                                isDarkMode ? 'text-white' : 'text-slate-900'
                            }`}>
                                Puzzle Pieces
                            </h2>
                            <p className={`text-sm mb-4 ${
                                isDarkMode ? 'text-slate-400' : 'text-slate-600'
                            }`}>
                                Drag pieces onto the board
                            </p>

                            {/* All pieces in one container */}
                            <div className={`p-4 rounded-xl min-h-[400px] ${
                                isDarkMode ? 'bg-slate-700/30 border-2 border-slate-600/50' : 'bg-slate-200/30 border-2 border-slate-300/50'
                            }`}>
                                <div className="grid grid-cols-2 gap-3">
                                    {pieces.map((piece) => {
                                        const shape = piece.shapes[piece.currentRotation];
                                        const maxRow = Math.max(...shape.cells.map(c => c.row));
                                        const maxCol = Math.max(...shape.cells.map(c => c.col));
                                        const CELL_SIZE = 16; // Fixed cell size in pixels
                                        
                                        return (
                                            <div
                                                key={piece.id}
                                                className={`relative ${
                                                    piece.placed ? 'opacity-30 pointer-events-none' : ''
                                                }`}
                                            >
                                                <div
                                                    draggable={!piece.placed}
                                                    onDragStart={(e) => {
                                                        if (!piece.placed) {
                                                            handleDragStart(e, piece.id);
                                                            // Create custom drag image
                                                            const dragImage = document.createElement('div');
                                                            dragImage.style.position = 'absolute';
                                                            dragImage.style.top = '-1000px';
                                                            document.body.appendChild(dragImage);
                                                            e.dataTransfer.setDragImage(dragImage, 0, 0);
                                                            setTimeout(() => document.body.removeChild(dragImage), 0);
                                                        }
                                                    }}
                                                    onDragEnd={handleDragEnd}
                                                    className={`p-3 rounded-lg transition-all relative ${
                                                        isDarkMode ? 'bg-slate-600/50 hover:bg-slate-600' : 'bg-slate-300/50 hover:bg-slate-300'
                                                    } ${
                                                        !piece.placed ? 'cursor-grab active:cursor-grabbing hover:scale-105' : ''
                                                    } ${
                                                        draggedPiece === piece.id ? 'scale-95 opacity-50' : ''
                                                    }`}
                                                >
                                                    {/* Piece shape with fixed cell size */}
                                                    <div 
                                                        className="relative mx-auto"
                                                        style={{
                                                            width: `${(maxCol + 1) * CELL_SIZE}px`,
                                                            height: `${(maxRow + 1) * CELL_SIZE}px`,
                                                        }}
                                                    >
                                                        {shape.cells.map((cell, idx) => (
                                                            <div
                                                                key={idx}
                                                                className={`absolute rounded bg-linear-to-br ${piece.color} shadow-sm`}
                                                                style={{
                                                                    width: `${CELL_SIZE - 2}px`,
                                                                    height: `${CELL_SIZE - 2}px`,
                                                                    left: `${cell.col * CELL_SIZE}px`,
                                                                    top: `${cell.row * CELL_SIZE}px`,
                                                                }}
                                                            />
                                                        ))}
                                                    </div>

                                                    {/* Rotate button */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRotatePiece(piece.id, e);
                                                        }}
                                                        className={`absolute top-1 right-1 p-1 rounded ${
                                                            isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-200 hover:bg-slate-100'
                                                        }`}
                                                        title="Rotate"
                                                    >
                                                        <RotateCw className="w-3 h-3" />
                                                    </button>

                                                    {piece.placed && (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                                                            <span className="text-xs text-white font-semibold">Placed</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Quick actions */}
                            <div className="mt-4 flex gap-2">
                                <button
                                    onClick={handleReset}
                                    className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
                                        isDarkMode
                                            ? 'bg-slate-700 hover:bg-slate-600 text-white'
                                            : 'bg-slate-300 hover:bg-slate-400 text-slate-900'
                                    }`}
                                >
                                    Reset All
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Success Toast */}
                <AnimatePresence>
                    {solved && (
                        <motion.div
                            initial={{ opacity: 0, y: -100 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -100 }}
                            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full mx-4"
                        >
                            <div className="bg-linear-to-r from-green-500 to-emerald-600 rounded-xl shadow-2xl p-6 text-white">
                                <div className="flex items-center gap-3 mb-4">
                                    <Trophy className="w-8 h-8" />
                                    <div>
                                        <h3 className="text-2xl font-bold">🎉 Puzzle Solved!</h3>
                                        <p className="text-sm text-green-100">Amazing work!</p>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-3 mt-4">
                                    <div className="text-center p-3 rounded-lg bg-white/20">
                                        <Clock className="w-5 h-5 mx-auto mb-1" />
                                        <p className="text-xs text-green-100">Your Time</p>
                                        <p className="text-lg font-bold">
                                            {solveTime ? `${Math.floor(solveTime / 60)}:${(solveTime % 60).toString().padStart(2, '0')}` : '--'}
                                        </p>
                                    </div>
                                    <div className="text-center p-3 rounded-lg bg-white/20">
                                        <Users className="w-5 h-5 mx-auto mb-1" />
                                        <p className="text-xs text-green-100">Solved Today</p>
                                        <p className="text-lg font-bold">1,247</p>
                                    </div>
                                    <div className="text-center p-3 rounded-lg bg-white/20">
                                        <Trophy className="w-5 h-5 mx-auto mb-1" />
                                        <p className="text-xs text-green-100">Avg Time</p>
                                        <p className="text-lg font-bold">8:32</p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        setSolved(false);
                                        setSolveTime(null);
                                        handleReset();
                                    }}
                                    className="mt-4 w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-all"
                                >
                                    Try Another Date
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Info Modal */}
                <AnimatePresence>
                    {showInfoModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                            onClick={() => setShowInfoModal(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className={`rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto ${
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
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className={`space-y-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                    <div>
                                        <h3 className={`text-xl font-semibold mb-2 ${
                                            isDarkMode ? 'text-white' : 'text-slate-900'
                                        }`}>🎯 Goal</h3>
                                        <p>Place all 8 puzzle pieces on the board so that only the current date (month and day number) remains uncovered.</p>
                                    </div>

                                    <div>
                                        <h3 className={`text-xl font-semibold mb-2 ${
                                            isDarkMode ? 'text-white' : 'text-slate-900'
                                        }`}>📋 Instructions</h3>
                                        <ol className="list-decimal list-inside space-y-2 ml-2">
                                            <li>Choose a date (today or any of the previous 5 days)</li>
                                            <li>The target cells (month + date) are highlighted in <span className="text-amber-500">amber/gold</span></li>
                                            <li><strong>Drag pieces</strong> from the pieces box onto the board</li>
                                            <li>As you drag, you'll see a <span className="text-green-500">green preview</span> where the piece will be placed</li>
                                            <li><span className="text-red-500">Red preview</span> means the piece can't be placed there (out of bounds or overlapping)</li>
                                            <li><strong>Rotate/Flip:</strong> Click the ⟳ button to cycle through all orientations (rotations + flips)</li>
                                            <li><strong>Move placed pieces:</strong> Pick them up from the board and drag to a new spot</li>
                                            <li>Hover over placed pieces on the board for rotate/remove options</li>
                                            <li>Win by covering all cells except the two target cells!</li>
                                        </ol>
                                    </div>

                                    <div>
                                        <h3 className={`text-xl font-semibold mb-2 ${
                                            isDarkMode ? 'text-white' : 'text-slate-900'
                                        }`}>💡 Tips</h3>
                                        <ul className="list-disc list-inside space-y-1 ml-2">
                                            <li>Watch the color-coded preview as you drag (green = valid, red = invalid)</li>
                                            <li>Pieces now support all rotations AND flips (horizontal/vertical)</li>
                                            <li>Keep rotating to see all possible orientations - some pieces have 8 variations!</li>
                                            <li>Each puzzle has multiple valid solutions</li>
                                            <li>Pieces cannot extend beyond the board edges</li>
                                            <li>Drag pieces freely between positions to experiment</li>
                                            <li>Work from corners and edges first</li>
                                            <li>Don't give up! Every date is solvable</li>
                                        </ul>
                                    </div>

                                    <div>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

