import { useState, useEffect, useRef } from 'react';

interface UseCooldownProps {
  postId: string;
  isInitializing: boolean;
  onCooldownExpired?: () => void;
}

interface CooldownState {
  canDraw: boolean;
  cooldownRemaining: number;
  isOnCooldown: boolean;
}

export const useCooldown = ({ postId, isInitializing, onCooldownExpired }: UseCooldownProps) => {
  const [cooldownState, setCooldownState] = useState<CooldownState>({
    canDraw: true,
    cooldownRemaining: 0,
    isOnCooldown: false,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkCooldown = async () => {
    if (!postId || isInitializing) {
      return;
    }

    try {
      const response = await fetch('/api/check-cooldown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      });

      if (response.ok) {
        const result = await response.json();
        
        setCooldownState({
          canDraw: result.canDraw,
          cooldownRemaining: result.cooldownRemaining || 0,
          isOnCooldown: !result.canDraw,
        });

        // If on cooldown, start countdown timer
        if (!result.canDraw && result.cooldownRemaining > 0) {
          startCountdown(result.cooldownRemaining);
        }
      } else {
        console.error('Cooldown check failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error checking cooldown:', error);
    }
  };

  const startCountdown = (remainingSeconds: number) => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    let timeLeft = remainingSeconds;

    intervalRef.current = setInterval(() => {
      timeLeft -= 1;

      if (timeLeft <= 0) {
        setCooldownState({
          canDraw: true,
          cooldownRemaining: 0,
          isOnCooldown: false,
        });
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        // Call the callback when cooldown expires
        if (onCooldownExpired) {
          onCooldownExpired();
        }
      } else {
        setCooldownState(prev => ({
          ...prev,
          cooldownRemaining: timeLeft,
        }));
      }
    }, 1000);
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Check cooldown on mount and when postId changes
  useEffect(() => {
    console.log('useCooldown useEffect triggered:', { postId: !!postId, isInitializing });
    checkCooldown();
  }, [postId, isInitializing]);

  // Also check cooldown periodically (every 10 seconds)
  useEffect(() => {
    if (!postId || isInitializing) return;
    
    console.log('Setting up periodic cooldown check');
    const interval = setInterval(() => {
      console.log('Periodic cooldown check...');
      checkCooldown();
    }, 10000); // Check every 10 seconds

    return () => {
      console.log('Clearing periodic cooldown check');
      clearInterval(interval);
    };
  }, [postId, isInitializing]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    ...cooldownState,
    formatTime,
    checkCooldown,
  };
};
