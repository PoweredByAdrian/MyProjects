import React from 'react';
import { navigateTo } from '@devvit/web/client';

interface FooterProps {
  hasCompletedStroke: boolean;
}

export const Footer: React.FC<FooterProps> = ({ hasCompletedStroke }) => {
  return (
    <div className="bg-white bg-opacity-90 backdrop-blur-sm border-t border-gray-200 px-6 py-0.5 rounded-b-2xl flex-shrink-0">
      <div className="flex items-center justify-between text-xs text-gray-600 mx-2">
        <div className="flex gap-4">
          <button
            onClick={() => navigateTo('https://www.reddit.com/r/DevvitDrawApp')}
            className="hover:text-blue-600 transition-colors font-medium hover:underline"
          >
            r/DevvitDrawApp
          </button>
          <button
            onClick={() => navigateTo('https://developers.reddit.com/docs')}
            className="hover:text-blue-600 transition-colors font-medium hover:underline"
          >
            Devvit Docs
          </button>
        </div>
        <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-semibold">
          {hasCompletedStroke ? (
            "✅ Your stroke added!"
          ) : (
            "🖌️ Click and drag to draw • Touch supported"
          )}
        </span>
      </div>
    </div>
  );
};
