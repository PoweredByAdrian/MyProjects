import React from 'react';
import { MAX_STROKES } from '../../shared/constants';

interface HeaderProps {
  username: string;
  currentStrokeCount: number;
  currentColor: string;
  setCurrentColor: (color: string) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
}

export const Header: React.FC<HeaderProps> = ({
  username,
  currentStrokeCount,
  currentColor,
  setCurrentColor,
  brushSize,
  setBrushSize,
}) => {
  return (
    <div className="bg-white bg-opacity-90 backdrop-blur-sm border-b border-gray-200 px-4 py-1 rounded-t-2xl flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
            🎨 DevvitDrawApp
          </h1>
          <span className="text-xs text-gray-600 bg-gray-50 px-2 py-0.5 rounded-full">
            Welcome, {username}!
          </span>
          <div className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-sm">
            <span className="text-xs font-semibold text-blue-700">
              📊 Strokes: {currentStrokeCount}/{MAX_STROKES}
            </span>
            {currentStrokeCount >= MAX_STROKES && (
              <span className="text-xs bg-green-100 text-green-700 px-1 py-0.5 rounded-full font-medium shadow-sm">
                🎉 Complete!
              </span>
            )}
          </div>
        </div>
        
        {/* Tools */}
        <div className="flex items-center gap-2">
          {/* Color Picker */}
          <div className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded-lg">
            <label className="text-xs font-semibold text-gray-700">Color:</label>
            <input
              type="color"
              value={currentColor}
              onChange={(e) => {
                const newColor = e.target.value;
                console.log('Color picker onChange - old:', currentColor, 'new:', newColor);
                setCurrentColor(newColor);
                console.log('setCurrentColor called with:', newColor);
              }}
              className="w-5 h-5 rounded border border-gray-300 cursor-pointer"
            />
          </div>

          {/* Brush Size */}
          <div className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded-lg">
            <label className="text-xs font-semibold text-gray-700">Size:</label>
            <input
              type="range"
              min="1"
              max="10"
              value={brushSize}
              onChange={(e) => {
                console.log('Brush size changed to:', e.target.value);
                setBrushSize(Number(e.target.value));
              }}
              className="w-12 h-1 bg-blue-100 rounded appearance-none cursor-pointer"
            />
            <span className="text-xs font-semibold text-gray-700 bg-white px-1 py-0.5 rounded min-w-[14px] text-center">{brushSize}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
