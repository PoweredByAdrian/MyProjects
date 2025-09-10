import { useEffect, useCallback, useRef } from 'react';
import { setupCanvas, ensureCanvasReady, getCoordinates } from '../utils/canvasUtils';
import { loadDrawingData } from '../utils/apiUtils';

interface UseCanvasSetupProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  postId: string;
  userHasDrawn: boolean;
  hasLoadedInitialDrawing: boolean;
  isInitializing: boolean;
  hasCompletedStroke: boolean;
  isDrawing: boolean;
  currentColor: string;
  brushSize: number;
  lastLoadTime: number;
  setUserHasDrawn: (drawn: boolean) => void;
  setHasLoadedInitialDrawing: (loaded: boolean) => void;
  setIsDrawing: (drawing: boolean) => void;
  setHasCompletedStroke: (completed: boolean) => void;
  setLastLoadTime: (time: number) => void;
  // TEMPORARILY DISABLED: redrawPreservedStrokes to debug canvas disappearing
  redrawPreservedStrokes?: () => void;
}

export const useCanvasSetup = ({
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
  redrawPreservedStrokes,
}: UseCanvasSetupProps) => {
  
  // Track if initial stroke has been drawn to prevent redrawing
  const hasDrawnInitialStroke = useRef(false);
  
  const loadDrawing = useCallback(async (forceRefresh = false) => {
    if (!postId) {
      console.log('No postId available for loading');
      return;
    }

    // Don't auto-load if user is currently drawing (to avoid interrupting their stroke)
    if (isDrawing && !forceRefresh) {
      console.log('Skipping load - user is actively drawing');
      return;
    }

    // Be more conservative about loading after user has drawn something
    const timeSinceLastLoad = Date.now() - lastLoadTime;
    if (hasCompletedStroke && !forceRefresh && timeSinceLastLoad < 3000) {
      console.log('Skipping load - user recently completed a stroke, waiting longer to avoid overwriting');
      return;
    }

    // Don't load if user has completed their stroke (unless manual refresh and enough time has passed)
    if (hasCompletedStroke && !forceRefresh) {
      console.log('Skipping load - user has completed their stroke');
      return;
    }

    // Allow loading during initialization when forced (for initial drawing)
    // Skip auto-loading during initialization unless it's forced
    if (isInitializing && !forceRefresh) {
      console.log('Skipping load - app is still initializing and not forced');
      return;
    }

    console.log('Proceeding with loadDrawing, forceRefresh:', forceRefresh);

    try {
      const data = await loadDrawingData(postId);
      if (data?.drawingData) {
        await renderDrawingData(data.drawingData);
        setHasLoadedInitialDrawing(true);
        setLastLoadTime(Date.now());
      }
    } catch (error) {
      console.error('Failed to load drawing:', error);
    }
  }, [postId, isDrawing, hasCompletedStroke, isInitializing, setHasLoadedInitialDrawing, setLastLoadTime, lastLoadTime]);

  const renderDrawingData = useCallback(async (drawingData: string) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    console.log('🎨 renderDrawingData called - this will redraw the entire canvas');

    // Check if this is initial stroke metadata
    if (drawingData.startsWith('data:application/json;base64,')) {
      console.log('Detected initial stroke metadata');
      
      // Always draw initial stroke if we haven't drawn it yet
      if (hasDrawnInitialStroke.current) {
        console.log('Initial stroke already drawn, skipping to prevent redraw');
        return;
      }
      
      console.log('🎨 Drawing initial stroke - clearing canvas...');
      
      // Decode the base64 JSON data
      const base64Data = drawingData.replace('data:application/json;base64,', '');
      const jsonData = atob(base64Data);
      const strokeData = JSON.parse(jsonData);
      
      if (strokeData.type === 'initialStroke') {
        console.log('Drawing initial stroke:', strokeData);
        
        // Clear canvas and set white background
        const dpr = window.devicePixelRatio || 1;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        
        // Draw the initial stroke based on type
        ctx.strokeStyle = strokeData.color;
        ctx.lineWidth = strokeData.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        
        if (strokeData.strokeType === 'curve') {
          // Draw a quadratic curve
          ctx.moveTo(strokeData.startX, strokeData.startY);
          ctx.quadraticCurveTo(strokeData.controlX, strokeData.controlY, strokeData.endX, strokeData.endY);
        } else if (strokeData.strokeType === 'zigzag') {
          // Draw a multi-point zigzag path
          if (strokeData.points && strokeData.points.length > 0) {
            ctx.moveTo(strokeData.points[0].x, strokeData.points[0].y);
            for (let i = 1; i < strokeData.points.length; i++) {
              ctx.lineTo(strokeData.points[i].x, strokeData.points[i].y);
            }
          }
        } else {
          // Draw a straight line (default)
          ctx.moveTo(strokeData.startX, strokeData.startY);
          ctx.lineTo(strokeData.endX, strokeData.endY);
        }
        
        ctx.stroke();
        ctx.closePath();
        
        // Mark that we've drawn the initial stroke
        hasDrawnInitialStroke.current = true;
        console.log('🎨 Initial stroke drawn and marked as drawn');
        
        // Reset canvas context to user's current settings after drawing initial stroke
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
        
        console.log('🎨 Initial stroke drawn on canvas (first time)');
        
        // TEMPORARILY DISABLED: Redraw preserved strokes to debug canvas disappearing
        // setTimeout(() => {
        //   console.log('🛡️ Redrawing preserved strokes after initial stroke');
        //   redrawPreservedStrokes();
        // }, 50);
        
        return;
      }
    }
    
    // Handle regular image data (PNG/JPEG/SVG data URLs)
    const img = new Image();
    img.onload = () => {
      console.log('🎨 Loading collaborative drawing - this WILL CLEAR the canvas and redraw everything');
      
      // First set white background
      const dpr = window.devicePixelRatio || 1;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      
      // Then draw the loaded collaborative image
      ctx.drawImage(img, 0, 0, canvas.width / dpr, canvas.height / dpr);
      
      // Reset drawing settings to ensure canvas is still drawable
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      
      console.log('✅ Collaborative drawing loaded - canvas has been fully redrawn with server data');
      
      // TEMPORARILY DISABLED: Redraw preserved strokes to debug canvas disappearing
      // setTimeout(() => {
      //   console.log('🛡️ Redrawing preserved strokes after collaborative update');
      //   redrawPreservedStrokes();
      // }, 50); // Small delay to ensure canvas is ready
    };
    
    img.onerror = (e) => {
      console.error('Failed to load image:', e);
    };
    img.src = drawingData;
  }, [canvasRef, userHasDrawn, currentColor, brushSize, isInitializing, hasDrawnInitialStroke, redrawPreservedStrokes]);

  // Setup canvas with proper dimensions and touch event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const fixedWidth = 720;
      const fixedHeight = 530;
      
      // Don't clear the canvas if initial stroke has been drawn
      const hasContent = userHasDrawn || hasDrawnInitialStroke.current;
      console.log('🔄 resizeCanvas called - userHasDrawn:', userHasDrawn, 'hasDrawnInitialStroke:', hasDrawnInitialStroke.current, 'hasContent:', hasContent);
      setupCanvas(canvas, fixedWidth, fixedHeight, hasContent);

      // Only load existing drawing on initial setup, not on every resize
      if (!hasLoadedInitialDrawing && postId && !userHasDrawn && !hasDrawnInitialStroke.current) {
        console.log('resizeCanvas: Loading drawing data because hasLoadedInitialDrawing is false and user has not drawn');
        loadDrawing(true);
      }
    };

    // Touch event handlers
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (isInitializing || hasCompletedStroke) return;
      
      const touch = e.touches[0];
      if (touch) {
        setIsDrawing(true);
        setUserHasDrawn(true);
        
        ensureCanvasReady(canvas);
        
        const { x, y } = getCoordinates(touch as any, canvas);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.strokeStyle = currentColor;
          ctx.lineWidth = brushSize;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 1.0;
          ctx.closePath();
          ctx.beginPath();
          ctx.moveTo(x, y);
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (isInitializing || hasCompletedStroke || !isDrawing) return;
      
      const touch = e.touches[0];
      if (touch) {
        const { x, y } = getCoordinates(touch as any, canvas);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.lineTo(x, y);
          ctx.stroke();
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (isInitializing || hasCompletedStroke) return;
      setHasCompletedStroke(true);
    };

    // Initial setup
    resizeCanvas();
    
    // Add touch listeners
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [postId, userHasDrawn, hasLoadedInitialDrawing]); // Removed currentColor and brushSize from dependencies

  return {
    loadDrawing,
    renderDrawingData,
  };
};
