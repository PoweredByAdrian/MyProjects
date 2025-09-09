import { useState, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LoadingScreen } from './components/LoadingScreen';
import { DrawingCanvas } from './components/DrawingCanvas';
import { useDrawing } from './hooks/useDrawing';
import { useCanvasSetup } from './hooks/useCanvasSetup';
import { useCollaboration } from './hooks/useCollaboration';
import { useCooldown } from './hooks/useCooldown';
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
  const [hasLoadedInitialDrawing, setHasLoadedInitialDrawing] = useState<boolean>(false);
  
  // Collaboration State
  const [lastLoadTime, setLastLoadTime] = useState<number>(0);
  const [currentStrokeCount, setCurrentStrokeCount] = useState<number>(0);
  const [lastKnownTimestamp, setLastKnownTimestamp] = useState<number | undefined>(undefined);

  // Custom hooks
  const { startDrawing, draw, stopDrawing } = useDrawing({
    canvasRef,
    currentColor,
    brushSize,
    isInitializing,
    hasCompletedStroke,
    setIsDrawing,
    setUserHasDrawn,
    setHasCompletedStroke,
    setLastLoadTime,
    setLastKnownTimestamp,
    setCurrentStrokeCount,
    postId,
  });

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
    setUserHasDrawn,
    setHasLoadedInitialDrawing,
    setIsDrawing,
    setHasCompletedStroke,
  });

  useCollaboration({
    postId,
    isInitializing,
    hasCompletedStroke,
    ...(lastKnownTimestamp !== undefined && { lastKnownTimestamp }),
    lastLoadTime,
    loadDrawing,
  });

  // Cooldown functionality
  const cooldownState = useCooldown({ postId, isInitializing });

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
        } catch (strokeError) {
          console.error('Failed to fetch stroke count:', strokeError);
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
          } catch (error) {
            console.error('Failed to load initial drawing:', error);
          }
        }
      } else {
        // Fallback
        setUsername('Artist');
        const fallbackPostId = `fallback_${Date.now()}`;
        setPostId(fallbackPostId);
        console.log('Using fallback postId:', fallbackPostId);
      }
      
      setIsInitializing(false);
    };

    initializeApp();
  }, []);

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
        hasCompletedStroke={hasCompletedStroke}
        currentColor={currentColor}
        setCurrentColor={setCurrentColor}
        brushSize={brushSize}
        setBrushSize={setBrushSize}
      />

      <DrawingCanvas
        canvasRef={canvasRef}
        isInitializing={isInitializing}
        hasCompletedStroke={hasCompletedStroke}
        startDrawing={startDrawing}
        draw={draw}
        stopDrawing={stopDrawing}
        canDraw={cooldownState.canDraw}
        isOnCooldown={cooldownState.isOnCooldown}
        cooldownRemaining={cooldownState.cooldownRemaining}
        formatTime={cooldownState.formatTime}
      />

      <Footer />
    </div>
  );
};
