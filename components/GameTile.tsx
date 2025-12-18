import { motion } from 'framer-motion';
import { Tile, TileTypeConfig, EmployeePosition } from '@/types/game.types';

// ============================================================================
// GAME TILE COMPONENT - Renders individual tiles with type-specific styling
// ============================================================================

interface GameTileProps {
    tile: Tile;
    tileType: TileTypeConfig | null | undefined;
    isSpecialTile: boolean;
    onClick: () => void;
    disabled: boolean;
    canPour?: boolean;
    pourDirection?: EmployeePosition | null;
    onPour?: () => void;
    isPouring?: boolean;
}

export function GameTile({
    tile,
    tileType,
    isSpecialTile,
    onClick,
    disabled,
    canPour,
    pourDirection,
    onPour,
    isPouring
}: GameTileProps) {
    // Generate particle drops based on direction (only for special tiles when pouring)
    const getParticleDrops = () => {
        if (!isSpecialTile || !pourDirection || !isPouring || !tileType) return null;
        
        const drops = Array.from({ length: 12 }).map((_, i) => {
            const delay = i * 0.08;
            let dropClass = '';
            
            switch (pourDirection) {
                case 'top':
                    dropClass = 'top-0 left-1/2 -translate-x-1/2 -translate-y-full';
                    break;
                case 'bottom':
                    dropClass = 'bottom-0 left-1/2 -translate-x-1/2 translate-y-full';
                    break;
                case 'left':
                    dropClass = 'left-0 top-1/2 -translate-x-full -translate-y-1/2';
                    break;
                case 'right':
                    dropClass = 'right-0 top-1/2 translate-x-full -translate-y-1/2';
                    break;
            }

            return (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ 
                        opacity: [0, 1, 1, 0],
                        scale: [0, 1.5, 1.5, 0.8],
                        y: pourDirection === 'top' ? -60 : pourDirection === 'bottom' ? 60 : 0,
                        x: pourDirection === 'left' ? -60 : pourDirection === 'right' ? 60 : 0,
                    }}
                    transition={{ 
                        duration: 1,
                        delay,
                        ease: 'easeOut'
                    }}
                    className={`absolute ${dropClass} w-3 h-3 ${tileType.particleColor} rounded-full shadow-lg`}
                />
            );
        });

        return drops;
    };

    return (
        <motion.div
            layout
            layoutId={`tile-${tile.id}`}
            initial={false}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute inset-0"
        >
            <motion.button
                onClick={onClick}
                disabled={disabled || (canPour && !isPouring) || tile.tileTypeId === 'manager'}
                className={`w-full h-full rounded-lg flex flex-col items-center justify-center font-bold text-xl cursor-pointer transition-all relative ${
                    tile.tileTypeId === 'manager'
                        ? 'bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-lg shadow-purple-500/50 cursor-not-allowed'
                        : isSpecialTile && tileType
                        ? tileType.color
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    } ${disabled && !canPour && tile.tileTypeId !== 'manager' ? 'opacity-50 cursor-not-allowed' : tile.tileTypeId !== 'manager' ? 'hover:scale-105' : ''}`}
            >
                {tile.tileTypeId === 'manager' ? (
                    <>
                        <span className="text-2xl mb-1">👔</span>
                        <span className="text-xs">{tile.value}</span>
                    </>
                ) : isSpecialTile && tileType ? (
                    <>
                        <tileType.icon className="w-8 h-8" />
                        {canPour && !isPouring && (
                            <motion.span
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute bottom-1 text-xs font-semibold bg-white text-amber-600 px-2 py-0.5 rounded"
                            >
                                Pour!
                            </motion.span>
                        )}
                    </>
                ) : (
                    <span className="text-sm md:text-base">{tile.value}</span>
                )}
                
                {/* Particle drops animation */}
                {isSpecialTile && isPouring && getParticleDrops()}
            </motion.button>

            {/* Clickable overlay for pouring */}
            {canPour && !isPouring && (
                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onPour?.();
                    }}
                    className="absolute inset-0 bg-green-500/20 rounded-lg backdrop-blur-[1px] flex items-center justify-center z-10"
                >
                    <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                        className="bg-green-500 text-white px-3 py-1.5 rounded-lg font-bold text-sm shadow-lg"
                    >
                        Pour Coffee
                    </motion.div>
                </motion.button>
            )}
        </motion.div>
    );
}

