import { useState, useRef, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LoadingScreen } from './components/LoadingScreen';
import { DrawingCanvas } from './components/DrawingCanvas';
import { useDrawing } from './hooks/useDrawing';
import { useCanvasSetup } from './hooks/useCanvasSetup';
import { useCollaboration } from './hooks/useCollaboration';
import { useCooldown } from './hooks/useCooldown';
// TEMPORARILY DISABLED: import { useStrokePreservation } from './hooks/useStrokePreservation';
import { fetchInitialData } from './utils/apiUtils';

export const App = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // UI State
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  
  // User State
  const [username, setUsername] = useState<string>('');
  const [postId, setPostId] = useState<string>('');
  const [userHasDrawn, setUserHasDrawn] = useState<boolean>(false);
  const [hasCompletedStroke, setHasCompletedStroke] = useState<boolean>(false);
  
  // App State
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [loadingTasks, setLoadingTasks] = useState({
    fetchedInitialData: false,
    checkedCompletion: false,
    fetchedStrokeCount: false,
    loadedDrawing: false,
  });
  const [hasLoadedInitialDrawing, setHasLoadedInitialDrawing] = useState<boolean>(false);
  const [isArtworkCompleted, setIsArtworkCompleted] = useState<boolean>(false);
  const [isArtworkPermanentlyCompleted, setIsArtworkPermanentlyCompleted] = useState<boolean>(false);
  const [hasCheckedCompletion, setHasCheckedCompletion] = useState<boolean>(false);
  
  // Collaboration State
  const [lastLoadTime, setLastLoadTime] = useState<number>(0);
  const [currentStrokeCount, setCurrentStrokeCount] = useState<number>(0);
  const [lastKnownTimestamp, setLastKnownTimestamp] = useState<number | undefined>(undefined);

  // Check if all loading tasks are complete
  const checkLoadingComplete = useCallback((tasks: typeof loadingTasks) => {
    const allTasksComplete = Object.values(tasks).every(task => task === true);
    if (allTasksComplete && isInitializing) {
      console.log('All loading tasks completed, hiding loading screen');
      setIsInitializing(false);
    }
  }, [isInitializing]);

  // Update loading task status
  const updateLoadingTask = useCallback((taskName: keyof typeof loadingTasks, completed: boolean = true) => {
    setLoadingTasks(prevTasks => {
      const newTasks = { ...prevTasks, [taskName]: completed };
      checkLoadingComplete(newTasks);
      return newTasks;
    });
  }, [checkLoadingComplete]);

  // Check if artwork is permanently completed (reached 5 strokes)
  const checkArtworkCompletion = async () => {
    if (!postId) return;

    try {
      const response = await fetch('/api/check-completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      });

      if (response.ok) {
        const result = await response.json();
        setIsArtworkPermanentlyCompleted(result.isCompleted);
        if (result.strokeCount !== undefined) {
          setCurrentStrokeCount(result.strokeCount);
        }
        setHasCheckedCompletion(true);
        updateLoadingTask('checkedCompletion');
      } else {
        setHasCheckedCompletion(true);
        updateLoadingTask('checkedCompletion');
      }
    } catch (error) {
      console.error('Error checking artwork completion:', error);
      setHasCheckedCompletion(true);
      updateLoadingTask('checkedCompletion');
    }
  };

  // Cooldown functionality (moved before useDrawing to pass checkCooldown)
  const cooldownState = useCooldown({ 
    postId, 
    isInitializing,
    onCooldownExpired: () => {
      // Only reset hasCompletedStroke if artwork is not permanently completed
      if (!isArtworkPermanentlyCompleted) {
        setHasCompletedStroke(false);
        console.log('Cooldown expired - user can now draw again');
      } else {
        console.log('Cooldown expired but artwork is permanently completed - no drawing allowed');
      }
    }
  });

  // TEMPORARILY DISABLED: Stroke preservation to debug canvas disappearing
  // const {
  //   startStroke: startStrokePreservation,
  //   addPointToStroke: addPointToStrokePreservation,
  //   finishStroke: finishStrokePreservation,
  //   redrawPreservedStrokes,
  //   clearPreservedStrokes,
  // } = useStrokePreservation({
  //   canvasRef,
  //   isDrawing,
  // });

  const { loadDrawing } = useCanvasSetup({
    canvasRef,
    postId,
    userHasDrawn,
    hasLoadedInitialDrawing,
    isInitializing,
    hasCompletedStroke,
    isDrawing,
    currentColor,
    brushSize,
    lastLoadTime,
    setUserHasDrawn,
    setHasLoadedInitialDrawing,
    setIsDrawing,
    setHasCompletedStroke,
    setLastLoadTime,
    // TEMPORARILY DISABLED: redrawPreservedStrokes function to debug canvas disappearing
    // redrawPreservedStrokes,
  });

  // Handle artwork completion (5 strokes reached) - now has access to loadDrawing
  const handleArtworkCompletion = async (finalStrokeCount?: number) => {
    if (!canvasRef.current || !postId) return;
    
    // Use the provided stroke count from server, or fall back to current state
    const actualStrokeCount = finalStrokeCount ?? currentStrokeCount;
    console.log('🎉 Artwork completed! Creating final post with stroke count:', actualStrokeCount);
    setIsArtworkCompleted(true);
    setIsArtworkPermanentlyCompleted(true);
    
    try {
      // Create final post with the completed artwork
      const canvas = canvasRef.current;
      const imageDataUrl = canvas.toDataURL('image/png');
      
      const response = await fetch('/api/complete-artwork', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPostId: postId,
          finalImage: imageDataUrl,
          strokeCount: actualStrokeCount // Use the correct stroke count
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Final post created successfully:', result);
        console.log('Artwork is now permanently completed and locked');
        
        // DO NOT reset anything - keep the artwork permanently locked
        // The canvas should remain as-is and no further drawing should be allowed
        
      } else {
        console.error('Failed to complete artwork');
      }
    } catch (error) {
      console.error('Error completing artwork:', error);
    }
  };

  // Custom hooks
  const { startDrawing, draw, stopDrawing } = useDrawing({
    canvasRef,
    currentColor,
    brushSize,
    isInitializing,
    hasCompletedStroke,
    isArtworkCompleted,
    isArtworkPermanentlyCompleted,
    setIsDrawing,
    setUserHasDrawn,
    setHasCompletedStroke,
    setLastLoadTime,
    setLastKnownTimestamp,
    setCurrentStrokeCount,
    postId,
    onArtworkComplete: handleArtworkCompletion,
    checkCooldown: cooldownState.checkCooldown,
    // TEMPORARILY DISABLED: Stroke preservation functions to debug canvas disappearing
    // startStrokePreservation,
    // addPointToStrokePreservation,
    // finishStrokePreservation,
  });

  useCollaboration({
    postId,
    isInitializing,
    ...(lastKnownTimestamp !== undefined && { lastKnownTimestamp }),
    lastLoadTime,
    hasCompletedStroke,
    loadDrawing,
  });

  // TEMPORARILY DISABLED: Clear old preserved strokes periodically to debug canvas disappearing
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     clearPreservedStrokes(15000); // Clear strokes older than 15 seconds
  //   }, 5000); // Check every 5 seconds

  //   return () => clearInterval(interval);
  // }, [clearPreservedStrokes]);

  // Load initial drawing during or after initialization
  useEffect(() => {
    const loadInitialDrawing = async () => {
      if (postId && !hasLoadedInitialDrawing && !userHasDrawn && canvasRef.current) {
        console.log('useEffect: Loading initial collaborative drawing for postId:', postId);
        try {
          await loadDrawing(true);
        } catch (error) {
          console.error('Failed to load initial drawing in useEffect:', error);
        }
      }
    };
    
    loadInitialDrawing();
  }, [postId, hasLoadedInitialDrawing, userHasDrawn, loadDrawing]);

  // Get username and postId on mount
  useEffect(() => {
    const initializeApp = async () => {
      const data = await fetchInitialData();
      
      if (data) {
        setUsername(data.username || 'Artist');
        const receivedPostId = data.postId || `fallback_${Date.now()}`;
        setPostId(receivedPostId);
        console.log('PostId set to:', receivedPostId);
        
        // Set initial timestamp if provided
        if (data.timestamp) {
          setLastKnownTimestamp(data.timestamp);
          console.log('Initial timestamp set to:', data.timestamp);
        }
        
        // Mark initial data as fetched
        updateLoadingTask('fetchedInitialData');
        
        // Check if artwork is completed (this will update the completion task)
        await checkArtworkCompletion();
        
        // Fetch current stroke count
        try {
          const strokeResponse = await fetch('/api/get-stroke-count', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId: receivedPostId }),
          });
          if (strokeResponse.ok) {
            const strokeData = await strokeResponse.json();
            setCurrentStrokeCount(strokeData.strokeCount);
            console.log('Initial stroke count:', strokeData.strokeCount);
          }
          updateLoadingTask('fetchedStrokeCount');
        } catch (strokeError) {
          console.error('Failed to fetch stroke count:', strokeError);
          updateLoadingTask('fetchedStrokeCount');
        }
        
        // Handle initial drawing data if present
        if (data.drawingData && canvasRef.current) {
          console.log('Loading initial drawing data from /api/init during initialization');
        }
        
        // Load any existing collaborative drawing while still in loading screen
        if (receivedPostId && canvasRef.current) {
          console.log('Loading collaborative drawing data during initialization');
          try {
            await loadDrawing(true);
            updateLoadingTask('loadedDrawing');
          } catch (error) {
            console.error('Failed to load initial drawing:', error);
            updateLoadingTask('loadedDrawing');
          }
        } else {
          // No drawing to load, mark as complete
          updateLoadingTask('loadedDrawing');
        }
      } else {
        // Fallback - mark all tasks as complete since there's nothing to load
        setUsername('Artist');
        const fallbackPostId = `fallback_${Date.now()}`;
        setPostId(fallbackPostId);
        console.log('Using fallback postId:', fallbackPostId);
        
        updateLoadingTask('fetchedInitialData');
        updateLoadingTask('checkedCompletion');
        updateLoadingTask('fetchedStrokeCount');
        updateLoadingTask('loadedDrawing');
      }
    };

    initializeApp();
  }, [updateLoadingTask, checkArtworkCompletion, loadDrawing]);

  // Periodically check for artwork completion
  useEffect(() => {
    if (!isInitializing && postId && !isArtworkPermanentlyCompleted) {
      const interval = setInterval(() => {
        checkArtworkCompletion();
      }, 2000); // Check every 2 seconds

      return () => clearInterval(interval);
    }
  }, [isInitializing, postId, isArtworkPermanentlyCompleted, checkArtworkCompletion]);

  // Periodic check for artwork completion
  useEffect(() => {
    if (!isInitializing && postId && !isArtworkPermanentlyCompleted) {
      const interval = setInterval(() => {
        checkArtworkCompletion();
      }, 3000); // Check every 3 seconds

      return () => clearInterval(interval);
    }
  }, [isInitializing, postId, isArtworkPermanentlyCompleted, checkArtworkCompletion]);

  return (
    <div 
      className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 shadow-2xl flex flex-col"
      style={{ 
        width: '754px', 
        height: '584px',
        minWidth: '754px',
        minHeight: '584px',
        maxWidth: '754px', 
        maxHeight: '584px',
        resize: 'none',
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(10px)'
      }}
    >
      <LoadingScreen isInitializing={isInitializing} />
      
      <Header
        username={username}
        currentStrokeCount={currentStrokeCount}
        currentColor={currentColor}
        setCurrentColor={setCurrentColor}
        brushSize={brushSize}
        setBrushSize={setBrushSize}
      />

      <DrawingCanvas
        canvasRef={canvasRef}
        isInitializing={isInitializing}
        hasCompletedStroke={hasCompletedStroke}
        isArtworkCompleted={isArtworkCompleted}
        isArtworkPermanentlyCompleted={isArtworkPermanentlyCompleted}
        hasCheckedCompletion={hasCheckedCompletion}
        currentStrokeCount={currentStrokeCount}
        startDrawing={startDrawing}
        draw={draw}
        stopDrawing={stopDrawing}
        canDraw={cooldownState.canDraw}
        isOnCooldown={cooldownState.isOnCooldown}
        cooldownRemaining={cooldownState.cooldownRemaining}
        formatTime={cooldownState.formatTime}
      />

      <Footer hasCompletedStroke={hasCompletedStroke} />
    </div>
  );
};
