import { motion } from 'framer-motion';

// ============================================================================
// CEO AVATAR COMPONENT - Renders the CEO watching over the office
// ============================================================================

interface CEOAvatarProps {
    mood: 'happy' | 'neutral' | 'frustrated';
}

export function CEOAvatar({ mood }: CEOAvatarProps) {
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

