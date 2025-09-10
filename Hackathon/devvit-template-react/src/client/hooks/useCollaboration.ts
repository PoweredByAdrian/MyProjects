import { useEffect } from 'react';
import { checkForUpdates } from '../utils/apiUtils';

interface UseCollaborationProps {
  postId: string;
  isInitializing: boolean;
  lastKnownTimestamp?: number;
  lastLoadTime: number;
  hasCompletedStroke: boolean; // Add this to know when user just drew
  loadDrawing: (forceRefresh?: boolean) => Promise<void>;
}

export const useCollaboration = ({
  postId,
  isInitializing,
  lastKnownTimestamp,
  lastLoadTime,
  hasCompletedStroke,
  loadDrawing,
}: UseCollaborationProps) => {
  
  // Polling mechanism to check for updates
  useEffect(() => {
    if (!postId || isInitializing) {
      return; // Don't poll during initialization
    }

    // Always continue polling - even during cooldown or after strokes
    const pollInterval = setInterval(async () => {
      // If user just completed a stroke, be more conservative with polling
      if (hasCompletedStroke) {
        const timeSinceLastLoad = Date.now() - lastLoadTime;
        if (timeSinceLastLoad < 8000) { // Wait 8 seconds after user draws
          console.log(`📡 Skipping polling - user just drew (${timeSinceLastLoad}ms ago)`);
          return;
        }
      }
      
      console.log('📡 Polling for updates...');
      const result = await checkForUpdates(postId, lastKnownTimestamp);
      
      if (result?.hasUpdate) {
        console.log('🆕 New update available, loading latest drawing...');
        await loadDrawing(true); // Force refresh
      }
    }, 2000); // Check every 2 seconds (faster updates)

    return () => clearInterval(pollInterval);
  }, [postId, isInitializing, lastKnownTimestamp, hasCompletedStroke, lastLoadTime, loadDrawing]);

  // Periodic refresh for real-time collaboration
  useEffect(() => {
    if (!postId || isInitializing) {
      console.log('Periodic refresh disabled:', { isInitializing, postId: !!postId });
      return;
    }

    console.log('Setting up periodic refresh for collaborative drawing');
    
    const interval = setInterval(() => {
      if (isInitializing) {
        console.log('Skipping periodic refresh - app still initializing');
        return;
      }
      
      const timeSinceLastLoad = Date.now() - lastLoadTime;
      
      // If user just completed a stroke, be extra conservative
      if (hasCompletedStroke && timeSinceLastLoad < 8000) {
        console.log(`Skipping periodic refresh - user just drew (${timeSinceLastLoad}ms ago)`);
        return;
      }
      
      // Don't load too soon after saving to prevent overwriting fresh user strokes
      // Increased from 1500ms to 5000ms to give more time for server processing
      if (timeSinceLastLoad < 5000) {
        console.log(`Skipping periodic refresh - too soon after last save/load (${timeSinceLastLoad}ms)`);
        return;
      }
      
      console.log(`Periodic refresh: Loading updated drawing data (${timeSinceLastLoad}ms since last load)`);
      loadDrawing(false);
    }, 3000); // Increased from 1000ms to 3000ms (every 3 seconds) for less aggressive polling

    return () => {
      console.log('Clearing periodic refresh interval');
      clearInterval(interval);
    };
  }, [postId, lastLoadTime, hasCompletedStroke, isInitializing, loadDrawing]);
};
