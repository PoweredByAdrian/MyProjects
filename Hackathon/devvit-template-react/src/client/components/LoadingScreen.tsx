import React from 'react';

interface LoadingScreenProps {
  isInitializing: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ isInitializing }) => {
  if (!isInitializing) return null;

  return (
    <div className="absolute inset-0 bg-white bg-opacity-95 backdrop-blur-sm flex items-center justify-center z-50 rounded-2xl">
      <div className="text-center p-8 bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mb-6"></div>
        <h2 className="text-2xl font-bold text-gray-800 mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          🎨 DevvitDrawApp
        </h2>
        <p className="text-gray-600 mb-4 text-lg">Preparing your collaborative canvas...</p>
        <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
          Loading artwork and setting up drawing tools
        </div>
      </div>
    </div>
  );
};
