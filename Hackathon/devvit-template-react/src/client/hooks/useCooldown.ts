import { useState, useEffect, useRef } from 'react';

interface UseCooldownProps {
  postId: string;
  isInitializing: boolean;
}

interface CooldownState {
  canDraw: boolean;
  cooldownRemaining: number;
  isOnCooldown: boolean;
}

export const useCooldown = ({ postId, isInitializing }: UseCooldownProps) => {
  const [cooldownState, setCooldownState] = useState<CooldownState>({
    canDraw: true,
    cooldownRemaining: 0,
    isOnCooldown: false,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkCooldown = async () => {
    if (!postId || isInitializing) return;

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
    checkCooldown();
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
