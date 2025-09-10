import React from 'react';

interface CompletionOverlayProps {
  isVisible: boolean;
  strokeCount: number;
}

export const CompletionOverlay: React.FC<CompletionOverlayProps> = ({ 
  isVisible, 
  strokeCount 
}) => {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 rounded-2xl">
      <div className="text-center p-8 bg-white rounded-xl shadow-2xl border border-gray-200 max-w-md mx-4">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-3">
          Artwork Completed
        </h2>
        <p className="text-gray-600 mb-4 text-lg leading-relaxed">
          This artwork has reached <span className="font-bold text-blue-600">{strokeCount} strokes</span> and is now permanently finished.
        </p>
        <p className="text-gray-500 text-sm bg-gray-50 rounded-lg p-3">
          No further drawing is allowed on this canvas.
        </p>
        <div className="mt-6 text-xs text-gray-400">
          🎨 DevvitDrawApp - Collaborative Art Complete
        </div>
      </div>
    </div>
  );
};
