"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { Coffee, Box, Trophy, Clock } from "lucide-react"

type Position = { row: number; col: number }

const GRID_SIZE = 4
const GAME_TIME = 60

export default function CoffeeRunGame() {
    const [grid, setGrid] = useState<number[][]>([])
    const [emptyPos, setEmptyPos] = useState<Position>({ row: 3, col: 3 })
    const [coffeePos, setCoffeePos] = useState<Position>({ row: 0, col: 0 })
    const [sleepingEmployee, setSleepingEmployee] = useState<number>(0)
    const [score, setScore] = useState(0)
    const [timeLeft, setTimeLeft] = useState(GAME_TIME)
    const [gameActive, setGameActive] = useState(false)
    const [highScore, setHighScore] = useState(0)

    // Initialize game
    const initializeGame = useCallback(() => {
        const newGrid: number[][] = []
        let tileNum = 0
        for (let i = 0; i < GRID_SIZE; i++) {
            newGrid[i] = []
            for (let j = 0; j < GRID_SIZE; j++) {
                if (i === GRID_SIZE - 1 && j === GRID_SIZE - 1) {
                    newGrid[i][j] = -1 // Empty slot
                } else {
                    newGrid[i][j] = tileNum++
                }
            }
        }
        setGrid(newGrid)
        setEmptyPos({ row: 3, col: 3 })
        setCoffeePos({ row: 0, col: 0 }) // Coffee is tile 0
        setSleepingEmployee(Math.floor(Math.random() * 16))
        setScore(0)
        setTimeLeft(GAME_TIME)
        setGameActive(true)
    }, [])

    // Timer
    useEffect(() => {
        if (!gameActive || timeLeft <= 0) {
            if (timeLeft <= 0) {
                setGameActive(false)
                if (score > highScore) {
                    setHighScore(score)
                }
            }
            return
        }

        const timer = setInterval(() => {
            setTimeLeft((prev) => prev - 1)
        }, 1000)

        return () => clearInterval(timer)
    }, [gameActive, timeLeft, score, highScore])

    // Get target position for coffee based on sleeping employee
    const getTargetPosition = (employeeIndex: number): Position => {
        if (employeeIndex < 4) {
            // Top edge
            return { row: 0, col: employeeIndex }
        } else if (employeeIndex < 8) {
            // Right edge
            return { row: employeeIndex - 4, col: 3 }
        } else if (employeeIndex < 12) {
            // Bottom edge
            return { row: 3, col: 11 - employeeIndex }
        } else {
            // Left edge
            return { row: 15 - employeeIndex, col: 0 }
        }
    }

    // Check if coffee reached target
    useEffect(() => {
        if (!gameActive) return

        const target = getTargetPosition(sleepingEmployee)
        if (coffeePos.row === target.row && coffeePos.col === target.col) {
            setScore((prev) => prev + 1)
            // Wake up and select new sleeping employee
            setTimeout(() => {
                setSleepingEmployee(Math.floor(Math.random() * 16))
            }, 300)
        }
    }, [coffeePos, sleepingEmployee, gameActive])

    // Handle tile click
    const handleTileClick = (row: number, col: number) => {
        if (!gameActive) return

        const rowDiff = Math.abs(row - emptyPos.row)
        const colDiff = Math.abs(col - emptyPos.col)

        // Check if tile is adjacent to empty slot
        if ((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1)) {
            const newGrid = grid.map((r) => [...r])
            const tileValue = newGrid[row][col]

            // Swap tile with empty slot
            newGrid[emptyPos.row][emptyPos.col] = tileValue
            newGrid[row][col] = -1

            setGrid(newGrid)
            setEmptyPos({ row, col })

            // Update coffee position if it was moved
            if (tileValue === 0) {
                setCoffeePos({ row: emptyPos.row, col: emptyPos.col })
            }
        }
    }

    // Render employee avatar
    const renderEmployee = (index: number) => {
        const isSleeping = index === sleepingEmployee
        const baseClasses =
            "w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center text-xl md:text-2xl font-bold transition-all"

        return (
            <motion.div
                key={index}
                className={`${baseClasses} ${isSleeping ? "bg-red-500 text-white ring-4 ring-red-300" : "bg-gray-300 text-gray-600"
                    }`}
                animate={
                    isSleeping
                        ? {
                            scale: [1, 1.1, 1],
                            transition: { repeat: Number.POSITIVE_INFINITY, duration: 1 },
                        }
                        : {}
                }
            >
                {isSleeping ? "😴" : "👤"}
            </motion.div>
        )
    }

    // Get employee positions
    const getEmployeePosition = (index: number) => {
        if (index < 4) {
            // Top
            return { top: 0, left: index }
        } else if (index < 8) {
            // Right
            return { top: index - 4, right: 0 }
        } else if (index < 12) {
            // Bottom
            return { bottom: 0, left: 11 - index }
        } else {
            // Left
            return { top: 15 - index, left: 0 }
        }
    }

    return (
        <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
            <div className="max-w-4xl w-full">
                {/* Header */}
                <div className="text-center mb-6">
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-2 flex items-center justify-center gap-3">
                        <Coffee className="w-10 h-10 text-amber-600" />
                        The Office Coffee Run
                    </h1>
                    <p className="text-slate-600">Slide the coffee to wake up sleeping employees!</p>
                </div>

                {/* Stats */}
                <div className="flex justify-center gap-6 mb-6">
                    <div className="bg-white rounded-lg shadow-md px-6 py-3 flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-600" />
                        <span className="text-sm text-slate-600">Score:</span>
                        <span className="text-2xl font-bold text-slate-800">{score}</span>
                    </div>
                    <div className="bg-white rounded-lg shadow-md px-6 py-3 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-600" />
                        <span className="text-sm text-slate-600">Time:</span>
                        <span className={`text-2xl font-bold ${timeLeft <= 10 ? "text-red-600" : "text-slate-800"}`}>
                            {timeLeft}s
                        </span>
                    </div>
                    <div className="bg-white rounded-lg shadow-md px-6 py-3 flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-600" />
                        <span className="text-sm text-slate-600">High:</span>
                        <span className="text-2xl font-bold text-slate-800">{highScore}</span>
                    </div>
                </div>

                {/* Game Board */}
                <div className="relative mx-auto" style={{ width: "fit-content" }}>
                    {/* Employee Ring */}
                    <div className="relative p-16 md:p-20">
                        {/* Top employees */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 flex gap-4 md:gap-6">
                            {[0, 1, 2, 3].map((i) => renderEmployee(i))}
                        </div>

                        {/* Right employees */}
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-4 md:gap-6">
                            {[4, 5, 6, 7].map((i) => renderEmployee(i))}
                        </div>

                        {/* Bottom employees */}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-4 md:gap-6">
                            {[8, 9, 10, 11].map((i) => renderEmployee(i))}
                        </div>

                        {/* Left employees */}
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 flex flex-col gap-4 md:gap-6">
                            {[12, 13, 14, 15].map((i) => renderEmployee(i))}
                        </div>

                        {/* Grid */}
                        <div className="bg-white rounded-2xl shadow-2xl p-4">
                            <div className="grid grid-cols-4 gap-2">
                                {grid.map((row, rowIndex) =>
                                    row.map((tile, colIndex) => {
                                        const isCoffee = tile === 0
                                        const isEmpty = tile === -1

                                        if (isEmpty) {
                                            return <div key={`${rowIndex}-${colIndex}`} className="w-16 h-16 md:w-20 md:h-20" />
                                        }

                                        return (
                                            <motion.button
                                                key={`${rowIndex}-${colIndex}`}
                                                layout
                                                onClick={() => handleTileClick(rowIndex, colIndex)}
                                                className={`w-16 h-16 md:w-20 md:h-20 rounded-lg font-bold text-lg flex items-center justify-center transition-all ${isCoffee
                                                    ? "bg-linear-to-br from-amber-500 to-orange-600 text-white shadow-lg hover:shadow-xl"
                                                    : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                                                    } ${gameActive ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
                                                whileHover={gameActive ? { scale: 1.05 } : {}}
                                                whileTap={gameActive ? { scale: 0.95 } : {}}
                                                transition={{ type: "spring", stiffness: 300 }}
                                                disabled={!gameActive}
                                            >
                                                {isCoffee ? <Coffee className="w-8 h-8" /> : <Box className="w-6 h-6" />}
                                            </motion.button>
                                        )
                                    }),
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Game Over / Start */}
                {!gameActive && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mt-6">
                        {timeLeft <= 0 && (
                            <div className="mb-4">
                                <h2 className="text-3xl font-bold text-slate-800 mb-2">Time's Up!</h2>
                                <p className="text-xl text-slate-600">Final Score: {score}</p>
                            </div>
                        )}
                        <button
                            onClick={initializeGame}
                            className="bg-linear-to-r from-amber-500 to-orange-600 text-white px-8 py-4 rounded-lg font-bold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105"
                        >
                            {timeLeft <= 0 ? "Play Again" : "Start Game"}
                        </button>
                    </motion.div>
                )}

                {/* Instructions */}
                {!gameActive && timeLeft === GAME_TIME && (
                    <div className="mt-6 bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
                        <h3 className="font-bold text-lg text-slate-800 mb-3">How to Play:</h3>
                        <ul className="text-slate-600 space-y-2">
                            <li>☕ Click tiles adjacent to the empty space to slide them</li>
                            <li>😴 Move the orange coffee tile to the grid cell next to the sleeping employee</li>
                            <li>😄 Wake them up to score points and find the next sleeper!</li>
                            <li>⏱️ You have 60 seconds to score as many points as possible</li>
                        </ul>
                    </div>
                )}
            </div>
        </div>
    )
}
