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
            className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden ${
                isSleeping ? employeeType.sleepingColor : employeeType.awakeColor
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
                <>
                    {isSleeping ? (
                        <span className="text-xl">😴</span>
                    ) : isEmoji ? (
                        <span className="text-xl">{icon}</span>
                    ) : (
                        <User className="w-6 h-6 text-slate-300" />
                    )}
                </>
            )}
        </motion.div>
    );
}

