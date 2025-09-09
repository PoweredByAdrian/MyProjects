import { useEffect } from 'react';
import { checkForUpdates } from '../utils/apiUtils';

interface UseCollaborationProps {
  postId: string;
  isInitializing: boolean;
  hasCompletedStroke: boolean;
  lastKnownTimestamp?: number;
  lastLoadTime: number;
  loadDrawing: (forceRefresh?: boolean) => Promise<void>;
}

export const useCollaboration = ({
  postId,
  isInitializing,
  hasCompletedStroke,
  lastKnownTimestamp,
  lastLoadTime,
  loadDrawing,
}: UseCollaborationProps) => {
  
  // Polling mechanism to check for updates
  useEffect(() => {
    if (!postId || isInitializing || hasCompletedStroke) {
      return; // Don't poll during initialization or after user completed stroke
    }

    const pollInterval = setInterval(async () => {
      console.log('📡 Polling for updates...');
      const result = await checkForUpdates(postId, lastKnownTimestamp);
      
      if (result?.hasUpdate) {
        console.log('🆕 New update available, loading latest drawing...');
        await loadDrawing(true); // Force refresh
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(pollInterval);
  }, [postId, isInitializing, hasCompletedStroke, lastKnownTimestamp, loadDrawing]);

  // Periodic refresh for real-time collaboration
  useEffect(() => {
    if (!postId || hasCompletedStroke || isInitializing) {
      console.log('Periodic refresh disabled:', { hasCompletedStroke, isInitializing, postId: !!postId });
      return;
    }
    
    console.log('Setting up periodic refresh for collaborative drawing');
    
    const interval = setInterval(() => {
      if (isInitializing) {
        console.log('Skipping periodic refresh - app still initializing');
        return;
      }
      
      if (hasCompletedStroke) {
        console.log('Skipping periodic refresh - user has completed stroke');
        return;
      }
      
      const timeSinceLastLoad = Date.now() - lastLoadTime;
      
      // Don't load too soon after saving to prevent overwriting fresh user strokes
      if (timeSinceLastLoad < 3000) {
        console.log(`Skipping periodic refresh - too soon after last save/load (${timeSinceLastLoad}ms)`);
        return;
      }
      
      console.log(`Periodic refresh: Loading updated drawing data (${timeSinceLastLoad}ms since last load)`);
      loadDrawing(false);
    }, 2000); // Every 2 seconds for responsive real-time collaboration

    return () => {
      console.log('Clearing periodic refresh interval');
      clearInterval(interval);
    };
  }, [postId, hasCompletedStroke, lastLoadTime, isInitializing, loadDrawing]);
};
