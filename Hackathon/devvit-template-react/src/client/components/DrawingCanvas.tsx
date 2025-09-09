import React, { RefObject } from 'react';
import CooldownNotification from './CooldownNotification';

interface DrawingCanvasProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  isInitializing: boolean;
  hasCompletedStroke: boolean;
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
  startDrawing,
  draw,
  stopDrawing,
  canDraw,
  isOnCooldown,
  cooldownRemaining,
  formatTime,
}) => {
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (canDraw && !isInitializing && !hasCompletedStroke) {
      startDrawing(e);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (canDraw && !isInitializing && !hasCompletedStroke) {
      draw(e);
    }
  };

  const handleMouseUp = () => {
    if (canDraw && !isInitializing && !hasCompletedStroke) {
      stopDrawing();
    }
  };

  const getCursorClass = () => {
    if (isInitializing) return 'cursor-wait opacity-50';
    if (!canDraw || isOnCooldown) return 'cursor-not-allowed opacity-75';
    if (hasCompletedStroke) return 'cursor-not-allowed opacity-75';
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
    </div>
  );
};
