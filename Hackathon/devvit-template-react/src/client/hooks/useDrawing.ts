import { useRef, useCallback } from 'react';
import { getCoordinates } from '../utils/canvasUtils';
import { saveDrawingData } from '../utils/apiUtils';

interface UseDrawingProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  currentColor: string;
  brushSize: number;
  isInitializing: boolean;
  hasCompletedStroke: boolean;
  isArtworkCompleted: boolean;
  isArtworkPermanentlyCompleted?: boolean;
  setIsDrawing: (drawing: boolean) => void;
  setUserHasDrawn: (drawn: boolean) => void;
  setHasCompletedStroke: (completed: boolean) => void;
  setLastLoadTime: (time: number) => void;
  setLastKnownTimestamp: (timestamp?: number) => void;
  setCurrentStrokeCount: (count: number) => void;
  postId: string;
  onArtworkComplete: (finalStrokeCount?: number) => void;
  checkCooldown?: () => void;
  // TEMPORARILY DISABLED: Stroke preservation functions to debug canvas disappearing
  // startStrokePreservation: (x: number, y: number, color: string, width: number) => void;
  // addPointToStrokePreservation: (x: number, y: number) => void;
  // finishStrokePreservation: () => void;
}

export const useDrawing = ({
  canvasRef,
  currentColor,
  brushSize,
  isInitializing,
  hasCompletedStroke,
  isArtworkCompleted,
  isArtworkPermanentlyCompleted = false,
  setIsDrawing,
  setUserHasDrawn,
  setHasCompletedStroke,
  setLastLoadTime,
  setLastKnownTimestamp,
  setCurrentStrokeCount,
  postId,
  onArtworkComplete,
  checkCooldown,
  // TEMPORARILY DISABLED: Stroke preservation functions to debug canvas disappearing
  // startStrokePreservation,
  // addPointToStrokePreservation,
  // finishStrokePreservation,
}: UseDrawingProps) => {
  const currentColorRef = useRef(currentColor);
  const brushSizeRef = useRef(brushSize);
  const isDrawingRef = useRef(false);
  const hasCompletedStrokeRef = useRef(hasCompletedStroke);
  const isInitializingRef = useRef(isInitializing);
  const isArtworkCompletedRef = useRef(isArtworkCompleted);

  // Update refs when values change
  currentColorRef.current = currentColor;
  brushSizeRef.current = brushSize;
  hasCompletedStrokeRef.current = hasCompletedStroke;
  isInitializingRef.current = isInitializing;
  isArtworkCompletedRef.current = isArtworkCompleted;

  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    console.log('startDrawing called! isInitializing:', isInitializing, 'hasCompletedStroke:', hasCompletedStroke);
    
    // Check if app is still initializing (use ref for immediate check)
    if (isInitializingRef.current) {
      console.log('BLOCKED: App is still initializing, please wait...');
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // Check if artwork is permanently completed (no one can draw anymore)
    if (isArtworkPermanentlyCompleted) {
      console.log('BLOCKED: This artwork is permanently completed! No more drawing allowed from anyone.');
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // Check if artwork is completed (max strokes reached)
    if (isArtworkCompletedRef.current) {
      console.log('BLOCKED: This artwork is completed! No more drawing allowed.');
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // Check if user has already completed their one stroke (use ref for immediate check)
    if (hasCompletedStrokeRef.current) {
      console.log('BLOCKED: User has already completed their stroke for this session');
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('No canvas ref!');
      return;
    }
    
    console.log('ALLOWING: User can start drawing');
    setIsDrawing(true);
    isDrawingRef.current = true; // Set ref immediately
    setUserHasDrawn(true); // Mark that user has started drawing
    
    const { x, y } = getCoordinates(e, canvas);
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      console.log('Drawing at coordinates:', x, y, 'with color:', currentColorRef.current, 'size:', brushSizeRef.current);
      
      // TEMPORARILY DISABLED: Start stroke preservation to debug canvas disappearing
      // startStrokePreservation(x, y, currentColorRef.current, brushSizeRef.current);
      
      // Close any existing path first to prevent connecting to old strokes
      ctx.closePath();
      
      // Set up the drawing context with current settings
      ctx.strokeStyle = currentColorRef.current;
      ctx.lineWidth = brushSizeRef.current;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      
      // Start a completely fresh path
      ctx.beginPath();
      ctx.moveTo(x, y);
      
      console.log('Started new drawing path at:', x, y, 'with style:', ctx.strokeStyle, 'width:', ctx.lineWidth);
    }
  }, [canvasRef, isInitializing, hasCompletedStroke, isArtworkCompleted, setIsDrawing, setUserHasDrawn]);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // Early return if not actually drawing - don't even log
    if (!isDrawingRef.current) return;
    
    // Check if app is still initializing (use ref for immediate check)
    if (isInitializingRef.current) {
      return;
    }
    
    // Check if artwork is permanently completed (no one can draw anymore)
    if (isArtworkPermanentlyCompleted) {
      console.log('BLOCKED: This artwork is permanently completed! No more drawing allowed from anyone.');
      return;
    }
    
    // Check if artwork is completed (use ref for immediate check)
    if (isArtworkCompletedRef.current) {
      return;
    }
    
    // Check if user has completed their stroke (use ref for immediate check)
    if (hasCompletedStrokeRef.current) {
      console.log('BLOCKED: User has completed stroke, blocking mouse draw');
      return;
    }
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const { x, y } = getCoordinates(e, canvas);
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Make sure we're still using the correct stroke settings
      if (ctx.strokeStyle !== currentColorRef.current) {
        ctx.strokeStyle = currentColorRef.current;
        console.log('Updated stroke color to:', currentColorRef.current);
      }
      if (ctx.lineWidth !== brushSizeRef.current) {
        ctx.lineWidth = brushSizeRef.current;
        console.log('Updated line width to:', brushSizeRef.current);
      }
      
      console.log('Mouse move - drawing line to:', x, y, 'strokeStyle:', ctx.strokeStyle, 'lineWidth:', ctx.lineWidth);
      
      // TEMPORARILY DISABLED: Add point to stroke preservation to debug canvas disappearing
      // addPointToStrokePreservation(x, y);
      
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }, [canvasRef]);

  const stopDrawing = useCallback(async () => {
    console.log('stopDrawing called');
    
    // Don't process if we weren't actually drawing
    if (!isDrawingRef.current) {
      console.log('BLOCKED: stopDrawing called but was not drawing');
      return;
    }
    
    // Don't process if still initializing
    if (isInitializingRef.current) {
      return;
    }
    
    // Prevent multiple calls to stopDrawing after stroke is completed
    if (hasCompletedStrokeRef.current) {
      console.log('BLOCKED: stopDrawing called but stroke already completed');
      return;
    }
    
    setIsDrawing(false);
    isDrawingRef.current = false; // Reset ref
    
    // Close the current drawing path
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.closePath(); // Properly close the current stroke path
      console.log('Closed drawing path');
    }
    
    // TEMPORARILY DISABLED: Finish stroke preservation to debug canvas disappearing
    // finishStrokePreservation();
    
    // Mark that user has completed their one stroke for this session
    setHasCompletedStroke(true);
    hasCompletedStrokeRef.current = true; // Update ref immediately for instant checks
    
    // Set cooldown state immediately - don't wait for server response
    if (checkCooldown) {
      console.log('Setting cooldown state immediately after stroke completion');
      checkCooldown();
    }
    
    // Save immediately when drawing stops
    try {
      const result = await saveDrawingData(canvas, postId);
      if (result) {
        // Update timestamp when we save
        if (result.timestamp) {
          setLastKnownTimestamp(result.timestamp);
          console.log('Updated local timestamp to:', result.timestamp);
        }
        
        // Update stroke count if provided by server
        if (result.strokeCount !== undefined) {
          setCurrentStrokeCount(result.strokeCount);
          console.log('Updated stroke count to:', result.strokeCount);
        }
        
        // Update last load time to prevent immediate overwrite from polling
        setLastLoadTime(Date.now());
        
        // Trigger cooldown check again after save to get accurate remaining time
        if (checkCooldown) {
          console.log('Triggering cooldown check after drawing save');
          checkCooldown();
        }
        
        // Check if artwork is completed (max strokes reached)
        if (result.completed) {
          console.log('🎉 Artwork completed! Maximum strokes reached.');
          // Trigger completion workflow with the correct stroke count from server
          onArtworkComplete(result.strokeCount);
        }
      }
    } catch (error) {
      console.error('Failed to save drawing after stroke completion:', error);
    }
  }, [canvasRef, postId, setIsDrawing, setHasCompletedStroke, setLastLoadTime, setLastKnownTimestamp, setCurrentStrokeCount, onArtworkComplete]);

  return {
    startDrawing,
    draw,
    stopDrawing,
  };
};
