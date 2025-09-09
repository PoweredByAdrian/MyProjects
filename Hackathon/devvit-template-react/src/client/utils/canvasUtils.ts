/**
 * Canvas utility functions for the drawing app
 */

export const ensureCanvasReady = (canvas: HTMLCanvasElement | null) => {
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  if (ctx) {
    console.log('Ensuring canvas is ready for drawing');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Make sure canvas is not in some weird state
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
    // Ensure any previous path is closed
    ctx.closePath();
    ctx.beginPath(); // Start fresh path for new drawing
  }
};

export const getCoordinates = (
  e: React.MouseEvent<HTMLCanvasElement> | MouseEvent,
  canvas: HTMLCanvasElement
) => {
  const rect = canvas.getBoundingClientRect();
  
  // Calculate the actual scale factors
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  // Get the mouse position relative to the canvas
  const clientX = e.clientX - rect.left;
  const clientY = e.clientY - rect.top;
  
  // Scale to canvas coordinates (accounting for high DPI if canvas was scaled)
  const x = clientX * scaleX / (window.devicePixelRatio || 1);
  const y = clientY * scaleY / (window.devicePixelRatio || 1);

  console.log('Coordinate calculation:', {
    mouse: { x: e.clientX, y: e.clientY },
    rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
    canvas: { width: canvas.width, height: canvas.height },
    scale: { x: scaleX, y: scaleY },
    dpr: window.devicePixelRatio || 1,
    result: { x, y }
  });

  return { x, y };
};

export const setupCanvas = (
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  userHasDrawn: boolean
): ImageData | null => {
  const dpr = window.devicePixelRatio || 1;
  
  console.log('🔄 Setting fixed canvas dimensions');

  // Save current canvas content if user has drawn something
  let imageData: ImageData | null = null;
  const ctx = canvas.getContext('2d');
  if (ctx && userHasDrawn) {
    console.log('Saving canvas content before resize');
    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }
  
  // Set actual canvas size (high DPI support)
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  
  // Set display size
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  
  // Scale context for high DPI
  if (ctx) {
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Set white background if this is initial setup
    if (!userHasDrawn && !imageData) {
      console.log('Setting initial white background');
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    }
    
    // Restore canvas content if we saved it
    if (imageData && userHasDrawn) {
      console.log('Restoring canvas content after resize');
      ctx.putImageData(imageData, 0, 0);
    }
  }

  console.log('✅ Canvas setup complete with fixed dimensions');
  return imageData;
};
