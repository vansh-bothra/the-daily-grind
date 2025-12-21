'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Coffee, Sun, Moon, Play, Calendar } from 'lucide-react';
import Link from 'next/link';

// Game card data type
interface GameCard {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    gradient: string;
    href: string;
    status: 'available' | 'coming-soon';
}

export default function Home() {
    const [isDarkMode, setIsDarkMode] = useState(true);

    // Game cards configuration
    const games: GameCard[] = [
        {
            id: 'coffee-run',
            title: 'Coffee Run',
            description: 'Slide tiles to deliver coffee to sleepy employees. Avoid managers and beat the clock!',
            icon: <Coffee className="w-12 h-12" />,
            gradient: 'from-amber-500 via-orange-500 to-red-500',
            href: '/games/coffee-run',
            status: 'available'
        },
        {
            id: 'puzzle-a-day',
            title: 'A Puzzle A Day',
            description: 'Drag and place 8 pieces to cover everything except the month and date. New puzzle every day!',
            icon: <Calendar className="w-12 h-12" />,
            gradient: 'from-purple-500 via-pink-500 to-red-500',
            href: '/games/puzzle-a-day',
            status: 'available'
        },
        {
            id: 'game-3',
            title: 'Coming Soon',
            description: 'More exciting puzzle games are on the way...',
            icon: <Play className="w-12 h-12" />,
            gradient: 'from-blue-500 via-cyan-500 to-teal-500',
            href: '#',
            status: 'coming-soon'
        }
    ];

    return (
        <div className={`min-h-screen flex flex-col items-center justify-center p-4 transition-colors ${
            isDarkMode 
                ? 'bg-linear-to-br from-slate-900 via-slate-800 to-slate-900' 
                : 'bg-linear-to-br from-slate-100 via-slate-50 to-slate-100'
        }`}>
            <div className="max-w-7xl w-full relative">
                {/* Theme Toggle - Top Right */}
                <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className={`absolute top-0 right-0 p-3 rounded-full transition-colors z-10 ${
                        isDarkMode
                            ? 'bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white'
                            : 'bg-slate-200/50 hover:bg-slate-300/50 text-slate-700 hover:text-slate-900'
                    }`}
                    aria-label="Toggle Theme"
                >
                    {isDarkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
                </button>

                {/* Hero Section */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <h1 className={`text-6xl md:text-7xl font-bold mb-4 ${
                        isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                        The Daily Grind
                    </h1>
                    <p className={`text-xl md:text-2xl ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                        Choose your puzzle adventure
                    </p>
                </motion.div>

                {/* Game Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {games.map((game, index) => (
                        <motion.div
                            key={game.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                        >
                            {game.status === 'available' ? (
                                <Link href={game.href}>
                                    <motion.div
                                        whileHover={{ scale: 1.05, y: -5 }}
                                        whileTap={{ scale: 0.98 }}
                                        className={`relative h-80 rounded-2xl overflow-hidden cursor-pointer transition-all ${
                                            isDarkMode 
                                                ? 'bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 shadow-xl hover:shadow-2xl'
                                                : 'bg-white/50 backdrop-blur-sm border border-slate-200/50 shadow-xl hover:shadow-2xl'
                                        }`}
                                    >
                                        {/* Gradient Background */}
                                        <div className={`absolute inset-0 bg-linear-to-br ${game.gradient} opacity-20`} />
                                        
                                        {/* Content */}
                                        <div className="relative h-full p-8 flex flex-col justify-between">
                                            {/* Icon */}
                                            <div className={`inline-flex p-4 rounded-xl w-fit ${
                                                isDarkMode 
                                                    ? 'bg-slate-700/50 text-white'
                                                    : 'bg-slate-100 text-slate-900'
                                            }`}>
                                                {game.icon}
                                            </div>
                                            
                                            {/* Text */}
                                            <div>
                                                <h2 className={`text-3xl font-bold mb-3 ${
                                                    isDarkMode ? 'text-white' : 'text-slate-900'
                                                }`}>
                                                    {game.title}
                                                </h2>
                                                <p className={`text-base mb-4 ${
                                                    isDarkMode ? 'text-slate-300' : 'text-slate-700'
                                                }`}>
                                                    {game.description}
                                                </p>
                                                
                                                {/* Play Button */}
                                                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
                                                    isDarkMode
                                                        ? 'bg-white/10 text-white hover:bg-white/20'
                                                        : 'bg-slate-900/10 text-slate-900 hover:bg-slate-900/20'
                                                }`}>
                                                    <Play className="w-4 h-4" />
                                                    <span>Play Now</span>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                </Link>
                            ) : (
                                <motion.div
                                    className={`relative h-80 rounded-2xl overflow-hidden transition-all opacity-60 ${
                                        isDarkMode 
                                            ? 'bg-slate-800/30 backdrop-blur-sm border border-slate-700/30'
                                            : 'bg-white/30 backdrop-blur-sm border border-slate-200/30'
                                    }`}
                                >
                                    {/* Gradient Background */}
                                    <div className={`absolute inset-0 bg-linear-to-br ${game.gradient} opacity-10`} />
                                    
                                    {/* Content */}
                                    <div className="relative h-full p-8 flex flex-col justify-between">
                                        {/* Icon */}
                                        <div className={`inline-flex p-4 rounded-xl w-fit ${
                                            isDarkMode 
                                                ? 'bg-slate-700/30 text-slate-400'
                                                : 'bg-slate-100/30 text-slate-500'
                                        }`}>
                                            {game.icon}
                                        </div>
                                        
                                        {/* Text */}
                                        <div>
                                            <h2 className={`text-3xl font-bold mb-3 ${
                                                isDarkMode ? 'text-slate-500' : 'text-slate-400'
                                            }`}>
                                                {game.title}
                                            </h2>
                                            <p className={`text-base ${
                                                isDarkMode ? 'text-slate-600' : 'text-slate-500'
                                            }`}>
                                                {game.description}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    ))}
                </div>

                {/* Footer */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className={`text-center mt-16 ${
                        isDarkMode ? 'text-slate-500' : 'text-slate-400'
                    }`}
                >
                    <p className="text-sm">More games coming soon...</p>
                </motion.div>
            </div>
        </div>
    );
}
