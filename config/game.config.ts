import { Coffee, User, Bug, Heart } from 'lucide-react';
import { TileTypeConfig, EmployeeTypeConfig, LevelConfig } from '@/types/game.types';

// ============================================================================
// GAME CONFIGURATIONS
// ============================================================================

// Available tile types
export const TILE_TYPES: Record<string, TileTypeConfig> = {
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
export const EMPLOYEE_TYPES: Record<string, EmployeeTypeConfig> = {
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
export const LEVELS: LevelConfig[] = [
    {
        id: 1,
        name: 'Coffee Run - Easy',
        gridSize: 4,
        gameDuration: 0, // Infinite game
        tileTypes: [TILE_TYPES.coffee],
        employeeTypes: [EMPLOYEE_TYPES.regular],
        specialTileId: 'coffee',
        employeesPerSide: 4,
        maxManagers: 1,
    },
    {
        id: 2,
        name: 'Developer Support - Medium',
        gridSize: 5,
        gameDuration: 0, // Infinite game
        tileTypes: [TILE_TYPES.githubIssue],
        employeeTypes: [EMPLOYEE_TYPES.developer],
        specialTileId: 'github-issue',
        employeesPerSide: 5,
        maxManagers: 2,
    },
    {
        id: 3,
        name: 'Mixed Office - Hard',
        gridSize: 6,
        gameDuration: 0, // Infinite game
        tileTypes: [TILE_TYPES.coffee, TILE_TYPES.githubIssue, TILE_TYPES.support],
        employeeTypes: [EMPLOYEE_TYPES.regular, EMPLOYEE_TYPES.developer, EMPLOYEE_TYPES.support],
        specialTileId: 'coffee', // Can be changed dynamically in game
        employeesPerSide: 6,
        maxManagers: 3,
    },
];

