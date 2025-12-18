import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import { Employee, EmployeeTypeConfig } from '@/types/game.types';

// ============================================================================
// EMPLOYEE AVATAR COMPONENT - Renders employees with type-specific styling
// ============================================================================

interface EmployeeAvatarProps {
    employee: Employee;
    employeeType: EmployeeTypeConfig | undefined;
    isSleeping: boolean;
}

export function EmployeeAvatar({
    employee,
    employeeType,
    isSleeping
}: EmployeeAvatarProps) {
    if (!employeeType) return null;

    const icon = employeeType.icon;
    const isEmoji = typeof icon === 'string';

    return (
        <motion.div
            animate={isSleeping ? { scale: [1, 1.1, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
                isSleeping ? employeeType.sleepingColor : employeeType.awakeColor
            }`}
        >
            {isSleeping ? (
                <span className="text-xl">😴</span>
            ) : isEmoji ? (
                <span className="text-xl">{icon}</span>
            ) : (
                <User className="w-6 h-6 text-slate-300" />
            )}
        </motion.div>
    );
}

