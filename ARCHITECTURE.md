# 🏗️ Coffee Run Game - Architecture Documentation

## 📁 Project Structure

```
coffee-run/
├── app/
│   └── page.tsx                 # Main game component (UI & game loop)
├── components/
│   ├── GameTile.tsx            # Individual tile component
│   └── EmployeeAvatar.tsx      # Employee display component
├── config/
│   └── game.config.ts          # Game configurations (tiles, employees, levels)
├── types/
│   └── game.types.ts           # TypeScript type definitions
├── utils/
│   └── game.utils.ts           # Game logic utilities
└── ARCHITECTURE.md             # This file
```

## 🎯 File Responsibilities

### **`types/game.types.ts`**
**Purpose:** Central type definitions for the entire game

**Exports:**
- `Position` - Grid position (row, col)
- `EmployeePosition` - Employee location (top, bottom, left, right)
- `TileTypeConfig` - Configuration for a tile type (coffee, issue, etc.)
- `EmployeeTypeConfig` - Configuration for an employee type (regular, dev, etc.)
- `LevelConfig` - Complete level definition
- `Tile` - Instance of a tile in the game
- `Employee` - Instance of an employee in the game

**When to modify:** Adding new entity types or changing core data structures

---

### **`config/game.config.ts`**
**Purpose:** All game content and configuration

**Exports:**
- `TILE_TYPES` - Available tile types (coffee, github-issue, support, manager, etc.)
- `EMPLOYEE_TYPES` - Available employee types (regular, developer, support)
- `LEVELS` - Level definitions (grid size, duration, tiles, employees)

**When to modify:**
- Adding new tile types → Update `TILE_TYPES`
- Adding new employee types → Update `EMPLOYEE_TYPES`
- Adding new levels → Update `LEVELS` array
- Changing game balance (durations, grid sizes)

**Example - Add a new tile type:**
```typescript
bugFix: {
    id: 'bug-fix',
    name: 'Bug Fix',
    icon: Wrench,
    color: 'bg-gradient-to-br from-yellow-500 to-orange-600',
    movable: true,
    matchesEmployeeType: 'qa-engineer',
    particleColor: 'bg-yellow-600',
}
```

---

### **`utils/game.utils.ts`**
**Purpose:** Pure functions for game logic

**Exports:**
- `createInitialTiles(level)` - Generate initial tile layout
- `shuffleTiles(tiles, gridSize)` - Shuffle tiles (ensures solvability)
- `getValidMoves(emptyPos, gridSize)` - Get valid moves for empty slot
- `createEmployees(level)` - Generate employees for a level
- `getTargetCell(employee, gridSize)` - Get employee's target cell
- `checkCanPour(tile, target, employee, types)` - Validate pour action

**When to modify:**
- Changing game mechanics (e.g., diagonal moves)
- Adding new game rules (e.g., obstacles, power-ups)
- Optimizing algorithms

---

### **`components/GameTile.tsx`**
**Purpose:** Renders individual puzzle tiles

**Props:**
- `tile` - The tile instance
- `tileType` - Configuration for this tile type
- `isSpecialTile` - Is this the deliverable tile?
- `onClick` - Click handler
- `disabled` - Is tile clickable?
- `canPour` - Can this tile be poured?
- `pourDirection` - Direction to pour
- `onPour` - Pour action handler
- `isPouring` - Currently pouring?

**Features:**
- Type-specific styling (coffee, issue, etc.)
- Pour animation with particle effects
- Pour button overlay
- Animated transitions

**When to modify:**
- Changing tile appearance
- Adding new animations
- Customizing pour effects

---

### **`components/EmployeeAvatar.tsx`**
**Purpose:** Renders employee avatars around the grid

**Props:**
- `employee` - The employee instance
- `employeeType` - Configuration for this employee type
- `isSleeping` - Is this employee sleeping?

**Features:**
- Type-specific colors (developer, support, etc.)
- Sleeping animation (pulsing)
- Emoji or icon support

**When to modify:**
- Changing employee appearance
- Adding new animations
- Customizing employee states

---

### **`app/page.tsx`**
**Purpose:** Main game component orchestrating everything

**Responsibilities:**
1. **State Management** - Game state, level, score, timer
2. **Game Loop** - Timer, pour checking, game flow
3. **Event Handlers** - Tile clicks, pour actions, game init
4. **UI Layout** - Header, stats, board, employees, modal

**When to modify:**
- Changing UI layout
- Adding new game features
- Modifying game flow

---

## 🔄 Data Flow

```
User Action (Click Tile)
    ↓
app/page.tsx → handleTileClick()
    ↓
Update tiles state
    ↓
useEffect (pour checking)
    ↓
utils/game.utils.ts → checkCanPour()
    ↓
Update canPour state
    ↓
components/GameTile.tsx → Shows pour button
    ↓
User clicks "Pour Coffee"
    ↓
app/page.tsx → handlePour()
    ↓
Increment score, select new employee
```

## 🚀 Adding New Features

### Add a New Tile Type (e.g., "Manager" obstacle)

1. **Define the type** in `config/game.config.ts`:
```typescript
manager: {
    id: 'manager',
    name: 'Manager',
    icon: User,
    color: 'bg-gradient-to-br from-purple-500 to-purple-700',
    movable: false,  // Immovable!
    matchesEmployeeType: '',
    particleColor: 'bg-purple-600',
}
```

2. **Use in a level** in `config/game.config.ts`:
```typescript
{
    id: 4,
    name: 'Avoid the Manager',
    gridSize: 5,
    gameDuration: 90,
    tileTypes: [TILE_TYPES.coffee, TILE_TYPES.manager],
    employeeTypes: [EMPLOYEE_TYPES.regular],
    specialTileId: 'coffee',
    employeesPerSide: 5,
}
```

3. **No other changes needed!** The game logic already checks `tileType.movable`

### Add a New Employee Type (e.g., "QA Engineer")

1. **Define the type** in `config/game.config.ts`:
```typescript
qaEngineer: {
    id: 'qa-engineer',
    name: 'QA Engineer',
    icon: '🔍',
    acceptsTileTypes: ['bug-fix'],
    awakeColor: 'bg-yellow-600',
    sleepingColor: 'bg-red-500 ring-4 ring-red-400/50',
}
```

2. **Create matching tile type** (see above)

3. **Add to a level**

### Add a New Level

Simply add to the `LEVELS` array in `config/game.config.ts`:
```typescript
{
    id: 5,
    name: 'Your Level Name',
    gridSize: 6,
    gameDuration: 100,
    tileTypes: [TILE_TYPES.coffee, TILE_TYPES.githubIssue],
    employeeTypes: [EMPLOYEE_TYPES.regular, EMPLOYEE_TYPES.developer],
    specialTileId: 'coffee',
    employeesPerSide: 6,
}
```

## 🎨 Styling Guide

- **Tailwind CSS** is used throughout
- **Colors:** Defined in tile/employee configs
- **Animations:** Framer Motion in component files
- **Responsive:** Grid adapts to screen size

## 📝 Best Practices

1. **Keep types in sync** - Update types when adding new properties
2. **Pure functions** - Utils should be stateless and testable
3. **Component isolation** - Components should be self-contained
4. **Configuration over code** - Prefer config changes over logic changes
5. **Type safety** - Always use TypeScript types

## 🐛 Debugging Tips

- **Tile not moving?** → Check `tileType.movable`
- **Pour not working?** → Check matching rules in `checkCanPour()`
- **Employee not showing?** → Check `employeeType` exists in level config
- **Animation glitches?** → Check Framer Motion `layoutId` uniqueness

---

**Last Updated:** Dec 18, 2025

