// ============================================================================
// SOUND EFFECTS UTILITY - Generates sound effects using Web Audio API
// ============================================================================

// Singleton audio context that persists
let audioContext: AudioContext | null = null;

/**
 * Gets or creates the audio context, ensuring it's resumed
 */
const getAudioContext = async (): Promise<AudioContext | null> => {
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        
        // Resume audio context if suspended (required by browser autoplay policies)
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        
        return audioContext;
    } catch (error) {
        console.debug('Audio context not available:', error);
        return null;
    }
};

/**
 * Initialize audio context on first user interaction
 * Call this when the game starts to ensure audio is ready
 */
export const initAudio = async () => {
    await getAudioContext();
};

/**
 * Plays a delivery success sound effect
 * Creates a pleasant "ding" sound when coffee is delivered
 */
export const playDeliverySound = async () => {
    const ctx = await getAudioContext();
    if (!ctx) return;
    
    try {
        // Create a pleasant success sound (two-tone chime)
        const playTone = (frequency: number, startTime: number, duration: number) => {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';
            
            // Envelope for smooth sound - increased volume
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.5, startTime + 0.01); // Increased from 0.3 to 0.5
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
            
            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        };
        
        // Play two-tone success chime
        const now = ctx.currentTime;
        playTone(523.25, now, 0.15);      // C5 note
        playTone(659.25, now + 0.1, 0.2); // E5 note
    } catch (error) {
        console.debug('Error playing delivery sound:', error);
    }
};

/**
 * Plays a tile move sound effect (subtle click)
 */
export const playMoveSound = async () => {
    const ctx = await getAudioContext();
    if (!ctx) return;
    
    try {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.value = 200;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
        
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.05);
    } catch (error) {
        console.debug('Error playing move sound:', error);
    }
};

