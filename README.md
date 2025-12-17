# The Office Coffee Run ☕

A browser-based sliding puzzle game with a corporate twist! Wake up your sleepy colleagues by delivering coffee before time runs out.

![Game Screenshot](/.gemini/antigravity/brain/16c893df-34a2-4281-88da-d903e6fe604b/game_loaded_1765959407789.png)

## 🎮 Game Overview

**The Office Coffee Run** combines the classic 15-puzzle with a time-management challenge. Players must:
- Slide tiles in a 4×4 grid to position the coffee tile
- Deliver coffee to sleeping employees positioned around the board
- Score as many deliveries as possible within 60 seconds

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Installation

```bash
# Navigate to project directory
cd coffee-run

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to play!

## 🎯 How to Play

1. Click **Start Game** to begin
2. **Slide tiles** by clicking on tiles adjacent to the empty space
3. **Find the sleeper**: Look for the employee with a red background and 😴 emoji
4. **Position the coffee**: Move the orange coffee tile to the grid cell next to the sleeping employee
5. **Deliver**: When positioned correctly, green arrow(s) will appear - click to deliver!
6. **Score points**: Each delivery = +1 point
7. **Beat the clock**: You have 60 seconds to score as many points as possible

## 🛠️ Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Lucide React** - Beautiful icons

## 📁 Project Structure

```
coffee-run/
├── app/
│   ├── page.tsx          # Main game component
│   ├── layout.tsx        # Root layout with metadata
│   └── globals.css       # Global styles
├── public/               # Static assets
├── package.json          # Dependencies
└── README.md            # This file
```

## 🎨 Customization Guide

### Adding Custom Employee Images

Currently, the game uses generic user icons. To add real employee photos:

1. **Create an employees directory**:
```bash
mkdir -p public/employees
```

2. **Add employee images** (recommended: 200×200px, circular crop):
```
public/employees/
├── employee-1.jpg
├── employee-2.jpg
├── ...
└── employee-16.jpg
```

3. **Update the Employee type** in `app/page.tsx`:
```typescript
type Employee = {
  id: number;
  position: EmployeePosition;
  index: number;
  imageUrl?: string;  // Add this
  name?: string;      // Add this
};
```

4. **Modify createEmployees()** to include image URLs:
```typescript
const createEmployees = (): Employee[] => {
  const employees: Employee[] = [];
  let id = 0;
  
  const positions: EmployeePosition[] = ['top', 'right', 'bottom', 'left'];
  
  for (const position of positions) {
    for (let i = 0; i < 4; i++) {
      employees.push({
        id: id,
        position,
        index: i,
        imageUrl: `/employees/employee-${id + 1}.jpg`,
        name: `Employee ${id + 1}`
      });
      id++;
    }
  }
  
  return employees;
};
```

5. **Update EmployeeAvatar component**:
```typescript
function EmployeeAvatar({ employee, isSleeping }: { employee: Employee; isSleeping: boolean }) {
  return (
    <motion.div
      animate={isSleeping ? { scale: [1, 1.1, 1] } : {}}
      transition={{ repeat: Infinity, duration: 1.5 }}
      className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden ${
        isSleeping ? 'ring-4 ring-red-400/50' : ''
      }`}
    >
      {employee.imageUrl ? (
        <div className="relative w-full h-full">
          <img 
            src={employee.imageUrl} 
            alt={employee.name || 'Employee'} 
            className={`w-full h-full object-cover ${isSleeping ? 'brightness-75' : ''}`}
          />
          {isSleeping && (
            <div className="absolute inset-0 bg-red-500/40 flex items-center justify-center">
              <span className="text-2xl">😴</span>
            </div>
          )}
        </div>
      ) : (
        <div className={`w-full h-full flex items-center justify-center ${
          isSleeping ? 'bg-red-500' : 'bg-slate-600'
        }`}>
          {isSleeping ? (
            <span className="text-xl">😴</span>
          ) : (
            <User className="w-6 h-6 text-slate-300" />
          )}
        </div>
      )}
    </motion.div>
  );
}
```

### Adding the CEO Feature

Add a special CEO character who watches over the office:

1. **Add CEO state** in the main component:
```typescript
const [ceoMood, setCeoMood] = useState<'happy' | 'neutral' | 'frustrated'>('neutral');
```

2. **Update CEO mood based on performance**:
```typescript
useEffect(() => {
  if (!gameStarted || gameOver) return;
  
  if (score >= 10) setCeoMood('happy');
  else if (timeLeft <= 10 && score < 5) setCeoMood('frustrated');
  else setCeoMood('neutral');
}, [score, timeLeft, gameStarted, gameOver]);
```

3. **Add CEO component**:
```typescript
function CEOAvatar({ mood }: { mood: 'happy' | 'neutral' | 'frustrated' }) {
  const emoji = mood === 'happy' ? '😊' : mood === 'frustrated' ? '😠' : '😐';
  const bgColor = mood === 'happy' ? 'bg-green-500' : mood === 'frustrated' ? 'bg-red-500' : 'bg-blue-500';
  
  return (
    <motion.div
      animate={{ y: [0, -5, 0] }}
      transition={{ repeat: Infinity, duration: 2 }}
      className="flex flex-col items-center gap-2"
    >
      <div className={`w-16 h-16 rounded-full ${bgColor} flex items-center justify-center text-3xl shadow-lg`}>
        {emoji}
      </div>
      <div className="text-white font-semibold text-sm">CEO</div>
    </motion.div>
  );
}
```

4. **Add CEO to the UI** (above the game board):
```tsx
{/* CEO Watching */}
<div className="absolute -top-24 left-1/2 -translate-x-1/2">
  <CEOAvatar mood={ceoMood} />
</div>
```

## 🎮 Game Mechanics

### Sliding Puzzle
- Standard 15-puzzle with 4×4 grid (15 tiles + 1 empty slot)
- Click tiles adjacent to empty space to slide them
- Tiles shuffle randomly at game start

### Coffee Delivery
- **Coffee Tile**: Orange tile with coffee icon (tile #7)
- **Target**: Grid cell adjacent to the sleeping employee
- **Delivery**: Green arrows appear when positioned correctly

### Scoring
- +1 point per successful delivery
- New random employee falls asleep after each delivery
- 60-second time limit

## 🎨 Design Features

- **Dark Theme**: Modern slate gradient background
- **Smooth Animations**: Framer Motion spring physics
- **Visual Feedback**: 
  - Pulsing sleeping employee
  - Glowing coffee tile
  - Animated delivery arrows
  - Urgency cues (red timer at <10s)
- **Responsive**: Adapts to mobile and desktop screens

## 📝 Build for Production

```bash
# Build optimized production bundle
npm run build

# Start production server
npm start
```

## 🤝 Contributing

Feel free to customize and extend the game! Some ideas:
- Add difficulty levels (larger grids, less time)
- Implement high score persistence (localStorage)
- Add sound effects for deliveries
- Create power-ups (freeze time, auto-solve)
- Add multiplayer mode

## 📄 License

This project is open source and available under the MIT License.

## 🎉 Credits

Created with ❤️ using Next.js, React, and Tailwind CSS.

---

**Ready to play?** Run `npm run dev` and start delivering coffee! ☕
