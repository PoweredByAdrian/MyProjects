import React, { RefObject } from 'react';
import CooldownNotification from './CooldownNotification';
import { CompletionOverlay } from './CompletionOverlay';

interface DrawingCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isInitializing: boolean;
  hasCompletedStroke: boolean;
  isArtworkCompleted: boolean;
  isArtworkPermanentlyCompleted: boolean;
  hasCheckedCompletion: boolean;
  currentStrokeCount: number;
  startDrawing: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  draw: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  stopDrawing: () => void;
  canDraw: boolean;
  isOnCooldown: boolean;
  cooldownRemaining: number;
  formatTime: (seconds: number) => string;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  canvasRef,
  isInitializing,
  hasCompletedStroke,
  isArtworkCompleted,
  isArtworkPermanentlyCompleted = false,
  hasCheckedCompletion = true,
  currentStrokeCount,
  startDrawing,
  draw,
  stopDrawing,
  canDraw,
  isOnCooldown,
  cooldownRemaining,
  formatTime,
}) => {
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Cannot draw if completion check hasn't been done yet
    if (!hasCheckedCompletion) {
      console.log('BLOCKED: Completion status not yet verified');
      return;
    }
    
    // Cannot draw if artwork is permanently completed
    if (isArtworkPermanentlyCompleted) {
      console.log('BLOCKED: Artwork is permanently completed, no drawing allowed');
      return;
    }
    
    // Can draw if: not initializing AND cooldown allows it AND (never completed stroke OR cooldown is over)
    const canDrawNow = canDraw && !isInitializing && (!hasCompletedStroke || !isOnCooldown);
    
    if (canDrawNow) {
      startDrawing(e);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Cannot draw if completion check hasn't been done yet
    if (!hasCheckedCompletion) {
      return;
    }
    
    // Cannot draw if artwork is permanently completed
    if (isArtworkPermanentlyCompleted) {
      return;
    }
    
    // Can draw if: not initializing AND cooldown allows it AND (never completed stroke OR cooldown is over)
    const canDrawNow = canDraw && !isInitializing && (!hasCompletedStroke || !isOnCooldown);
    
    if (canDrawNow) {
      draw(e);
    }
  };

  const handleMouseUp = () => {
    // Cannot draw if completion check hasn't been done yet
    if (!hasCheckedCompletion) {
      return;
    }
    
    // Cannot draw if artwork is permanently completed
    if (isArtworkPermanentlyCompleted) {
      return;
    }
    
    // Can draw if: not initializing AND cooldown allows it AND (never completed stroke OR cooldown is over)
    const canDrawNow = canDraw && !isInitializing && (!hasCompletedStroke || !isOnCooldown);
    
    if (canDrawNow) {
      stopDrawing();
    }
  };

  const getCursorClass = () => {
    if (isInitializing) return 'cursor-wait opacity-50';
    if (!hasCheckedCompletion) return 'cursor-wait opacity-50';
    if (isArtworkPermanentlyCompleted) return 'cursor-not-allowed opacity-75';
    if (isArtworkCompleted) return 'cursor-not-allowed opacity-75';
    if (!canDraw) return 'cursor-not-allowed opacity-75';
    if (hasCompletedStroke && isOnCooldown) return 'cursor-not-allowed opacity-75';
    return 'cursor-crosshair';
  };

  return (
    <div className="flex-1 flex items-center justify-center min-h-0" style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={720}
        height={530}
        className={`block rounded-xl shadow-inner ${getCursorClass()}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={() => console.log('Canvas clicked!')}
        style={{ 
          touchAction: 'none',
          display: 'block',
          width: '720px',
          height: '530px',
          border: '2px solid #000000',
          backgroundColor: 'white',
          borderRadius: '12px'
        }}
      />
      <CooldownNotification
        isVisible={isOnCooldown}
        remainingTime={cooldownRemaining}
        formatTime={formatTime}
      />
      
      {/* Artwork Completion Overlay */}
      {isArtworkCompleted && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            padding: '30px',
            borderRadius: '15px',
            textAlign: 'center',
            zIndex: 1000,
            minWidth: '300px',
            border: '2px solid #ffd700',
          }}
        >
          <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '15px' }}>
            🎉 Artwork Complete! 🎉
          </div>
          <div style={{ fontSize: '16px', marginBottom: '15px' }}>
            This collaborative masterpiece has reached 5 strokes!
          </div>
          <div style={{ fontSize: '14px', color: '#ffd700' }}>
            Creating final post and preparing new canvas...
            You can close this app.
          </div>
        </div>
      )}
      
      {/* Permanent Completion Overlay */}
      <CompletionOverlay 
        isVisible={isArtworkPermanentlyCompleted} 
        strokeCount={currentStrokeCount}
      />
    </div>
  );
};
