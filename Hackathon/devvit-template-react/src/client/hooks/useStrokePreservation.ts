import { useCallback, useRef, useState } from 'react';

interface StrokePoint {
  x: number;
  y: number;
}

interface UserStroke {
  id: string;
  points: StrokePoint[];
  color: string;
  width: number;
  timestamp: number;
}

interface UseStrokePreservationProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isDrawing?: boolean; // Add this to prevent interference while drawing
}

export const useStrokePreservation = ({
  canvasRef,
  isDrawing = false,
}: UseStrokePreservationProps) => {
  const [preservedStrokes, setPreservedStrokes] = useState<UserStroke[]>([]);
  const currentStroke = useRef<UserStroke | null>(null);
  
  // Start tracking a new stroke
  const startStroke = useCallback((x: number, y: number, color: string, width: number) => {
    const strokeId = `stroke_${Date.now()}_${Math.random()}`;
    console.log('🛡️ Starting stroke preservation for:', strokeId);
    
    currentStroke.current = {
      id: strokeId,
      points: [{ x, y }],
      color,
      width,
      timestamp: Date.now(),
    };
  }, []);
  
  // Add point to current stroke
  const addPointToStroke = useCallback((x: number, y: number) => {
    if (currentStroke.current) {
      currentStroke.current.points.push({ x, y });
    }
  }, []);
  
  // Finish current stroke and preserve it
  const finishStroke = useCallback(() => {
    if (currentStroke.current && currentStroke.current.points.length > 1) {
      console.log('🛡️ Preserving completed stroke:', currentStroke.current.id);
      
      setPreservedStrokes(prev => {
        const newStrokes = [...prev, currentStroke.current!];
        // Keep only last 3 strokes to avoid memory issues
        return newStrokes.slice(-3);
      });
    }
    currentStroke.current = null;
  }, []);
  
  // Redraw all preserved strokes on canvas
  const redrawPreservedStrokes = useCallback(() => {
    console.log('🛡️ TEMPORARILY DISABLED: Stroke preservation redraw to debug canvas disappearing issue');
    return; // TEMPORARY: Disable to debug
  }, []);
  
  // Clear old preserved strokes (when they're confirmed saved on server)
  const clearPreservedStrokes = useCallback((maxAge: number = 10000) => {
    const now = Date.now();
    setPreservedStrokes(prev => {
      const filtered = prev.filter(stroke => now - stroke.timestamp < maxAge);
      if (filtered.length !== prev.length) {
        console.log(`🛡️ Cleared ${prev.length - filtered.length} old preserved strokes`);
      }
      return filtered;
    });
  }, []);
  
  return {
    startStroke,
    addPointToStroke,
    finishStroke,
    redrawPreservedStrokes,
    clearPreservedStrokes,
    preservedStrokesCount: preservedStrokes.length,
  };
};
