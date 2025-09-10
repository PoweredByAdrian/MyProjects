import React from 'react';

interface DebugPanelProps {
  canDraw: boolean;
  isOnCooldown: boolean;
  hasCompletedStroke: boolean;
  isInitializing: boolean;
  cooldownRemaining: number;
  onResetStroke?: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  canDraw,
  isOnCooldown,
  hasCompletedStroke,
  isInitializing,
  cooldownRemaining,
  onResetStroke,
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 9999,
        minWidth: '200px',
      }}
    >
      <div><strong>Debug Panel</strong></div>
      <div>canDraw: {canDraw ? 'true' : 'false'}</div>
      <div>isOnCooldown: {isOnCooldown ? 'true' : 'false'}</div>
      <div>hasCompletedStroke: {hasCompletedStroke ? 'true' : 'false'}</div>
      <div>isInitializing: {isInitializing ? 'true' : 'false'}</div>
      <div>cooldownRemaining: {cooldownRemaining}s</div>
      <div style={{ marginTop: '5px', color: '#4CAF50' }}>
        Drawing allowed: {canDraw && !isInitializing && (!hasCompletedStroke || !isOnCooldown) ? 'YES' : 'NO'}
      </div>
      {onResetStroke && (
        <button
          onClick={onResetStroke}
          style={{
            marginTop: '5px',
            padding: '3px 6px',
            fontSize: '10px',
            backgroundColor: '#ff4444',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
          }}
        >
          Reset Stroke
        </button>
      )}
    </div>
  );
};
