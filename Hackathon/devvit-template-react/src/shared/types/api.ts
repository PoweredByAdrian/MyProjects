export type InitResponse = {
  type: 'init';
  postId: string;
  count: number;
  username: string;
  drawingData?: string | null; // Base64 canvas data
};

export type IncrementResponse = {
  type: 'increment';
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: 'decrement';
  postId: string;
  count: number;
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
  completed?: boolean; // Whether this artwork has reached the 500-stroke limit
};

export type LoadDrawingRequest = {
  postId: string;
};

export type LoadDrawingResponse = {
  type: 'load-drawing';
  postId: string;
  drawingData: string | null;
};

export type UpdatePreviewRequest = {
  postId: string;
  imageData: string; // Base64 canvas data
};

export type UpdatePreviewResponse = {
  type: 'update-preview';
  postId: string;
  success: boolean;
  previewUrl?: string;
};
