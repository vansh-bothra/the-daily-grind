import { LucideIcon } from 'lucide-react';

// ============================================================================
// CORE TYPE DEFINITIONS
// ============================================================================

export type Position = { row: number; col: number };
export type EmployeePosition = 'top' | 'bottom' | 'left' | 'right';

// Tile type definition - describes a category of tiles (coffee, issue, etc.)
export type TileTypeConfig = {
    id: string;                    // Unique identifier (e.g., 'coffee', 'github-issue')
    name: string;                  // Display name
    icon: LucideIcon;              // Icon component
    color: string;                 // Tailwind classes for color
    movable: boolean;              // Can this tile be moved?
    matchesEmployeeType: string;   // Which employee type can receive this?
    particleColor: string;         // Color for pour animation particles
};

// Employee type definition - describes a category of employees
export type EmployeeTypeConfig = {
    id: string;                    // Unique identifier (e.g., 'regular', 'developer')
    name: string;                  // Display name
    icon: string | LucideIcon;     // Emoji or icon component
    acceptsTileTypes: string[];    // Which tile types can this employee receive?
    awakeColor: string;            // Tailwind classes when awake
    sleepingColor: string;         // Tailwind classes when sleeping
};

// Level configuration - defines a complete game level
export type LevelConfig = {
    id: number;
    name: string;
    gridSize: number;              // 4x4, 5x5, 6x6, etc.
    gameDuration: number;          // seconds (0 = infinite)
    tileTypes: TileTypeConfig[];   // Available tile types in this level
    employeeTypes: EmployeeTypeConfig[]; // Available employee types
    specialTileId?: string;        // The tile that needs to be delivered (e.g., 'coffee')
    employeesPerSide: number;      // How many employees on each side
    maxManagers?: number;          // Maximum manager tiles that can appear
};

// Tile instance - a specific tile in the game
export type Tile = {
    id: number;
    value: number;
    position: Position;
    tileTypeId: string;            // References TileTypeConfig.id
};

// Employee instance - a specific employee in the game
export type Employee = {
    id: number;
    position: EmployeePosition;
    index: number;
    employeeTypeId: string;        // References EmployeeTypeConfig.id
};

