export type InitResponse = {
  type: 'init';
  postId: string;
  username: string;
  userId?: string; // User ID for cooldown tracking
  drawingData?: string | null; // Base64 canvas data
  timestamp?: number; // When the drawing was last updated
  canDraw?: boolean; // Whether user can currently draw (cooldown check)
  cooldownRemaining?: number; // Seconds remaining if on cooldown
};

export type SaveDrawingRequest = {
  postId: string;
  drawingData: string; // Base64 canvas data
};

export type SaveDrawingResponse = {
  type: 'save-drawing';
  postId: string;
  success: boolean;
  strokeCount?: number; // Number of total strokes for this post
  completed?: boolean; // Whether this artwork has reached the maximum stroke limit
  timestamp: number; // When this drawing was saved
};

export type LoadDrawingRequest = {
  postId: string;
};

export type LoadDrawingResponse = {
  type: 'load-drawing';
  postId: string;
  drawingData: string | null;
  timestamp?: number; // When the drawing was last updated
};

export type CheckUpdateRequest = {
  postId: string;
  lastKnownTimestamp?: number; // Client's last known timestamp
};

export type CheckUpdateResponse = {
  type: 'check-update';
  postId: string;
  hasUpdate: boolean;
  timestamp?: number; // Current timestamp if there's an update
};

export type CheckCooldownRequest = {
  postId: string;
};

export type CheckCooldownResponse = {
  type: 'check-cooldown';
  postId: string;
  canDraw: boolean;
  cooldownRemaining?: number; // Seconds remaining in cooldown, if any
  lastDrawTime?: number; // Timestamp of last draw
};

export type CompleteArtworkRequest = {
  currentPostId: string;
  finalImage: string; // Base64 canvas data
  strokeCount: number;
};

export type CompleteArtworkResponse = {
  type: 'complete-artwork';
  success: boolean;
  newPostId?: string;
  finalPostUrl?: string;
};
