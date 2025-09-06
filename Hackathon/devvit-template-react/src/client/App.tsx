import { navigateTo } from '@devvit/web/client';
import { useState, useRef, useEffect } from 'react';

export const App = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState('#000000'); // Start with black
  const [brushSize, setBrushSize] = useState(3);
  const [username, setUsername] = useState<string>('');
  const [postId, setPostId] = useState<string>('');
  const [hasLoadedInitialDrawing, setHasLoadedInitialDrawing] = useState<boolean>(false);
  const [userHasDrawn, setUserHasDrawn] = useState<boolean>(false);
  const [hasCompletedStroke, setHasCompletedStroke] = useState<boolean>(false); // Track if user completed their one stroke
  const [isLoadingDrawing, setIsLoadingDrawing] = useState<boolean>(false); // Prevent concurrent loads
  const [lastLoadTime, setLastLoadTime] = useState<number>(0); // Track when we last loaded drawing data
  const [currentStrokeCount, setCurrentStrokeCount] = useState<number>(0); // Track current stroke count
  const [isInitializing, setIsInitializing] = useState<boolean>(true); // Track if app is still initializing

  // Create refs for current values to avoid closure issues
  const currentColorRef = useRef(currentColor);
  const brushSizeRef = useRef(brushSize);
  const isDrawingRef = useRef(false); // Add ref for immediate drawing state
  const hasCompletedStrokeRef = useRef(false); // Add ref for immediate stroke completion check
  const isInitializingRef = useRef(true); // Add ref for immediate initialization check
  
  // Update refs when state changes
  useEffect(() => {
    currentColorRef.current = currentColor;
    console.log('Color updated to:', currentColor);
  }, [currentColor]);
  
  useEffect(() => {
    brushSizeRef.current = brushSize;
    console.log('Brush size updated to:', brushSize);
  }, [brushSize]);

  useEffect(() => {
    hasCompletedStrokeRef.current = hasCompletedStroke;
    console.log('hasCompletedStroke updated to:', hasCompletedStroke);
  }, [hasCompletedStroke]);

  useEffect(() => {
    isInitializingRef.current = isInitializing;
    console.log('isInitializing updated to:', isInitializing);
  }, [isInitializing]);

  // Ensure canvas is always ready for drawing
  const ensureCanvasReady = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      console.log('Ensuring canvas is ready for drawing');
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // Make sure canvas is not in some weird state
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
    }
  };

  // Setup canvas with proper dimensions and touch event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      // Save current canvas content if user has drawn something
      let imageData: ImageData | null = null;
      const ctx = canvas.getContext('2d');
      if (ctx && userHasDrawn) {
        console.log('Saving canvas content before resize');
        imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      }
      
      // Set actual canvas size (high DPI support)
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      // Set display size
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      
      // Scale context for high DPI
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Set white background if this is initial setup
        if (!userHasDrawn && !hasLoadedInitialDrawing) {
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

      // Only load existing drawing on initial setup, not on every resize, and not if user has already drawn
      if (!hasLoadedInitialDrawing && postId && !userHasDrawn) {
        console.log('resizeCanvas: Loading drawing data because hasLoadedInitialDrawing is false and user has not drawn');
        loadDrawingData(true);
      } else {
        console.log('resizeCanvas: Not loading drawing data - hasLoadedInitialDrawing:', hasLoadedInitialDrawing, 'postId:', !!postId, 'userHasDrawn:', userHasDrawn);
      }
    };

    // Add non-passive touch event listeners to handle preventDefault properly
    const handleTouchStartPassive = (e: TouchEvent) => {
      console.log('Touch start event triggered! isInitializing:', isInitializing, 'hasCompletedStroke:', hasCompletedStroke, 'ref:', hasCompletedStrokeRef.current);
      e.preventDefault();
      
      // Check if app is still initializing (use ref for immediate check)
      if (isInitializingRef.current) {
        console.log('BLOCKED: App is still initializing, please wait...');
        e.stopPropagation();
        return;
      }
      
      // Check if user has already completed their one stroke (use ref for immediate check)
      if (hasCompletedStrokeRef.current) {
        console.log('BLOCKED: User has already completed their stroke for this session');
        e.stopPropagation();
        return;
      }
      
      console.log('ALLOWING: User can start touch drawing');
      const touch = e.touches[0];
      if (touch) {
        setIsDrawing(true);
        isDrawingRef.current = true; // Set ref immediately
        setUserHasDrawn(true); // Mark that user has started drawing
        
        // Ensure canvas is ready for drawing
        ensureCanvasReady();
        
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = (touch.clientX - rect.left) * scaleX / (window.devicePixelRatio || 1);
        const y = (touch.clientY - rect.top) * scaleY / (window.devicePixelRatio || 1);

        const ctx = canvas.getContext('2d');
        if (ctx) {
          console.log('Touch: Setting stroke color to:', currentColorRef.current, 'size:', brushSizeRef.current);
          console.log('Touch coordinates:', x, y);
          ctx.strokeStyle = currentColorRef.current;
          ctx.lineWidth = brushSizeRef.current;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(x, y);
        }
      }
    };

    const handleTouchMovePassive = (e: TouchEvent) => {
      e.preventDefault();
      
      // Check if app is still initializing (use ref for immediate check)
      if (isInitializingRef.current) {
        return;
      }
      
      // Check if user has completed their stroke (use ref for immediate check)
      if (hasCompletedStrokeRef.current) {
        console.log('BLOCKED: User has completed stroke, blocking touch move');
        return;
      }
      
      console.log('Touch move event, isDrawing ref:', isDrawingRef.current, 'state:', isDrawing);
      if (!isDrawingRef.current) return; // Use ref instead of state
      
      const touch = e.touches[0];
      if (touch) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = (touch.clientX - rect.left) * scaleX / (window.devicePixelRatio || 1);
        const y = (touch.clientY - rect.top) * scaleY / (window.devicePixelRatio || 1);

        const ctx = canvas.getContext('2d');
        if (ctx) {
          console.log('Touch move - drawing line to:', x, y);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
      }
    };

    const handleTouchEndPassive = (e: TouchEvent) => {
      console.log('Touch end event');
      e.preventDefault();
      
      // Check if app is still initializing (use ref for immediate check)
      if (isInitializingRef.current) {
        return;
      }
      
      // Check if user has completed their stroke (use ref for immediate check)
      if (hasCompletedStrokeRef.current) {
        console.log('BLOCKED: User has completed stroke, blocking touch end');
        return;
      }
      
      stopDrawing(); // Use the centralized stopDrawing function
    };

    // Initial setup
    resizeCanvas();
    
    // Ensure canvas is ready for drawing with white background
    const ctx = canvas.getContext('2d');
    if (ctx && !hasLoadedInitialDrawing) {
      console.log('Initial canvas setup - setting white background');
      const dpr = window.devicePixelRatio || 1;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    }
    
    // Add non-passive touch listeners
    canvas.addEventListener('touchstart', handleTouchStartPassive, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMovePassive, { passive: false });
    canvas.addEventListener('touchend', handleTouchEndPassive, { passive: false });
    
    // Handle window resize
    window.addEventListener('resize', resizeCanvas);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('touchstart', handleTouchStartPassive);
      canvas.removeEventListener('touchmove', handleTouchMovePassive);
      canvas.removeEventListener('touchend', handleTouchEndPassive);
    };
  }, [postId]); // Remove currentColor, brushSize, isDrawing from dependencies

  // Auto-save drawing data using efficient blob approach (converted to data URL for compatibility)
  const saveDrawingData = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !postId) {
      console.log('Cannot save: canvas or postId missing', { canvas: !!canvas, postId });
      return;
    }

    try {
      console.log('Saving drawing data for postId:', postId);
      
      // Convert canvas to blob first (more efficient), then to data URL for server compatibility
      canvas.toBlob(async (blob) => {
        if (!blob) {
          console.error('Failed to create blob from canvas');
          return;
        }
        
        console.log('Canvas blob created, size:', Math.round(blob.size / 1024), 'KB');
        
        // Convert blob to data URL for server compatibility
        const reader = new FileReader();
        reader.onload = async () => {
          const drawingData = reader.result as string;
          console.log('Drawing data length:', drawingData.length);
          
          const response = await fetch('/api/save-drawing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              postId: postId,
              drawingData: drawingData 
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('Drawing saved successfully');
            
            // Update stroke count if provided by server
            if (data.strokeCount !== undefined) {
              setCurrentStrokeCount(data.strokeCount);
              console.log('Updated stroke count to:', data.strokeCount);
            }
            
            // Update last load time to prevent immediate overwrite from polling
            setLastLoadTime(Date.now());
            
            // Check if artwork is completed (500 strokes reached)
            if (data.completed) {
              console.log('🎉 Artwork completed! 500 strokes reached.');
              // Show a completion message
              alert('🎉 Congratulations! This collaborative artwork has reached 500 strokes and is now complete!\n\nA new canvas has been created for continued collaboration. Thank you for being part of this amazing community art project!');
            }
          } else {
            console.error('Failed to save drawing:', response.status);
          }
        };
        reader.readAsDataURL(blob);
        
      }, 'image/png', 0.8); // 80% quality - good balance of size vs quality
      
    } catch (error) {
      console.error('Failed to save drawing:', error);
    }
  };

  // Load existing drawing data
  const loadDrawingData = async (forceRefresh = false) => {
    if (!postId) {
      console.log('No postId available for loading');
      return;
    }

    // Prevent concurrent loads
    if (isLoadingDrawing) {
      console.log('Already loading drawing data, skipping concurrent request');
      return;
    }

    // Don't auto-load if user is currently drawing (to avoid interrupting their stroke)
    // But allow loading if they're not actively drawing, even if they've drawn before
    if (isDrawing && !forceRefresh) {
      console.log('Skipping load - user is actively drawing');
      return;
    }

    // Also don't load if user has completed their stroke (unless manual refresh)
    if (hasCompletedStroke && !forceRefresh) {
      console.log('Skipping load - user has completed their stroke');
      return;
    }

    // Don't auto-load during initialization unless forced
    if (isInitializing && !forceRefresh) {
      console.log('Skipping load - app is still initializing');
      return;
    }

    try {
      setIsLoadingDrawing(true);
      console.log('Loading drawing data for postId:', postId, 'forceRefresh:', forceRefresh, 'hasLoadedInitialDrawing:', hasLoadedInitialDrawing);
      const response = await fetch('/api/load-drawing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Received drawing data:', data);
        
        if (data.drawingData) {
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext('2d');
          if (canvas && ctx) {
            // Check if this is initial stroke metadata
            if (data.drawingData.startsWith('data:application/json;base64,')) {
              console.log('Detected initial stroke metadata, drawing...');
              
              // Decode the base64 JSON data
              const base64Data = data.drawingData.replace('data:application/json;base64,', '');
              const jsonData = atob(base64Data);
              const strokeData = JSON.parse(jsonData);
              
              if (strokeData.type === 'initialStroke') {
                console.log('Drawing initial stroke:', strokeData);
                
                // Clear canvas and set white background
                const dpr = window.devicePixelRatio || 1;
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
                
                // Draw the initial stroke based on type
                ctx.strokeStyle = strokeData.color;
                ctx.lineWidth = strokeData.width;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.beginPath();
                
                if (strokeData.strokeType === 'curve') {
                  // Draw a quadratic curve
                  ctx.moveTo(strokeData.startX, strokeData.startY);
                  ctx.quadraticCurveTo(strokeData.controlX, strokeData.controlY, strokeData.endX, strokeData.endY);
                } else if (strokeData.strokeType === 'zigzag') {
                  // Draw a multi-point zigzag path
                  if (strokeData.points && strokeData.points.length > 0) {
                    ctx.moveTo(strokeData.points[0].x, strokeData.points[0].y);
                    for (let i = 1; i < strokeData.points.length; i++) {
                      ctx.lineTo(strokeData.points[i].x, strokeData.points[i].y);
                    }
                  }
                } else {
                  // Draw a straight line (default)
                  ctx.moveTo(strokeData.startX, strokeData.startY);
                  ctx.lineTo(strokeData.endX, strokeData.endY);
                }
                
                ctx.stroke();
                
                // Reset canvas context to user's current settings after drawing initial stroke
                ctx.strokeStyle = currentColorRef.current;
                ctx.lineWidth = brushSizeRef.current;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                
                console.log('🎨 Initial stroke drawn on canvas');
                
                setHasLoadedInitialDrawing(true);
                setLastLoadTime(Date.now());
                setIsLoadingDrawing(false);
                return;
              }
            }
            
            // Handle regular image data (PNG/JPEG/SVG data URLs)
            // Save current canvas state if user has drawn something
            let currentCanvasData = null;
            if (userHasDrawn && !forceRefresh) {
              currentCanvasData = canvas.toDataURL();
              console.log('Saved current user drawing before loading collaborative updates');
            }
            
            const img = new Image();
            img.onload = () => {
              console.log('Loading collaborative drawing, preserving user work:', !!currentCanvasData);
              
              // First set white background
              const dpr = window.devicePixelRatio || 1;
              ctx.fillStyle = 'white';
              ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
              
              // Then draw the loaded collaborative image
              ctx.drawImage(img, 0, 0, canvas.width / dpr, canvas.height / dpr);
              
              // If user had current work and this isn't a force refresh, blend it back
              if (currentCanvasData && !forceRefresh) {
                const userImg = new Image();
                userImg.onload = () => {
                  // Blend user's current work on top using a lighter composite mode
                  ctx.globalCompositeOperation = 'multiply';
                  ctx.globalAlpha = 0.7;
                  ctx.drawImage(userImg, 0, 0, canvas.width / dpr, canvas.height / dpr);
                  
                  // Reset for normal drawing
                  ctx.globalCompositeOperation = 'source-over';
                  ctx.globalAlpha = 1.0;
                  ctx.lineCap = 'round';
                  ctx.lineJoin = 'round';
                  
                  console.log('Blended user drawing with collaborative updates');
                };
                userImg.src = currentCanvasData;
              } else {
                // Reset drawing settings to ensure canvas is still drawable
                ctx.strokeStyle = currentColorRef.current;
                ctx.lineWidth = brushSizeRef.current;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.globalCompositeOperation = 'source-over';
                ctx.globalAlpha = 1.0;
              }
              ctx.globalCompositeOperation = 'source-over';
              ctx.globalAlpha = 1.0;
              
              setHasLoadedInitialDrawing(true);
              setLastLoadTime(Date.now()); // Track when we successfully loaded
              
              // Log collaborative update if this was not the initial load
              if (hasLoadedInitialDrawing && userHasDrawn) {
                console.log('Collaborative update received');
              }
              
              console.log('Image loaded and canvas reset for drawing');
            };
            img.onerror = (e) => {
              console.error('Failed to load image:', e);
            };
            img.src = data.drawingData;
          }
        } else {
          console.log('No drawing data found - not clearing canvas');
          setHasLoadedInitialDrawing(true);
          setLastLoadTime(Date.now()); // Track load time even when no data
        }
      } else {
        console.error('Failed to fetch drawing data:', response.status);
      }
    } catch (error) {
      console.error('Failed to load drawing:', error);
    } finally {
      setIsLoadingDrawing(false);
    }
  };

  // Load initial drawing when postId is first available (for collaboration)
  useEffect(() => {
    if (postId && !hasLoadedInitialDrawing && !userHasDrawn && canvasRef.current) {
      console.log('useEffect: Loading initial collaborative drawing for postId:', postId);
      loadDrawingData(true);
    }
  }, [postId]); // Remove hasLoadedInitialDrawing from deps to prevent re-triggering

  // Periodic refresh for real-time collaboration to handle multiple players drawing simultaneously
  useEffect(() => {
    if (!postId || hasCompletedStroke || isInitializing) return; // Don't poll if user completed their stroke or still initializing
    
    console.log('Setting up periodic refresh for collaborative drawing - handling concurrent players');
    
    // Use faster interval (2 seconds) for more responsive real-time collaboration
    const interval = setInterval(() => {
      // Skip if still initializing
      if (isInitializingRef.current) {
        console.log('Skipping periodic refresh - app still initializing');
        return;
      }
      
      const timeSinceLastLoad = Date.now() - lastLoadTime;
      
      // Don't load too soon after saving to prevent overwriting fresh user strokes
      if (timeSinceLastLoad < 3000) {
        console.log(`Skipping periodic refresh - too soon after last save/load (${timeSinceLastLoad}ms)`);
        return;
      }
      
      console.log(`Periodic refresh: Loading updated drawing data (${timeSinceLastLoad}ms since last load)`);
      
      // Load updates even while user is between strokes
      loadDrawingData(false);
    }, 2000); // Every 2 seconds for responsive real-time collaboration while drawing

    return () => {
      console.log('Clearing periodic refresh interval');
      clearInterval(interval);
    };
  }, [postId, hasCompletedStroke, lastLoadTime, isInitializing]);

  // Optional: Load when window gains focus (user returns to tab)
  // Uncomment this if you want focus-based updates
  /*
  useEffect(() => {
    const handleFocus = () => {
      if (postId && !hasCompletedStroke) {
        console.log('Window focus: Loading updated drawing data');
        loadDrawingData(false);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [postId, hasCompletedStroke]);
  */

  // Get username and postId on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        console.log('Fetching initial data...');
        const response = await fetch('/api/init');
        if (response.ok) {
          const data = await response.json();
          console.log('Initial data received:', data);
          setUsername(data.username || 'Artist');
          
          // Ensure we have a postId, generate one if needed
          const receivedPostId = data.postId || `fallback_${Date.now()}`;
          setPostId(receivedPostId);
          console.log('PostId set to:', receivedPostId);
          
          // Fetch current stroke count for this post
          try {
            const strokeResponse = await fetch('/api/get-stroke-count', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ postId: receivedPostId }),
            });
            if (strokeResponse.ok) {
              const strokeData = await strokeResponse.json();
              setCurrentStrokeCount(strokeData.strokeCount);
              console.log('Initial stroke count:', strokeData.strokeCount);
            }
          } catch (strokeError) {
            console.error('Failed to fetch stroke count:', strokeError);
          }
          
          // If we have initial drawing data, load it
          if (data.drawingData && canvasRef.current) {
            console.log('Loading initial drawing data from /api/init');
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              // Check if this is initial stroke metadata
              if (data.drawingData.startsWith('data:application/json;base64,')) {
                console.log('Detected initial stroke metadata in /api/init, drawing...');
                
                // Decode the base64 JSON data
                const base64Data = data.drawingData.replace('data:application/json;base64,', '');
                const jsonData = atob(base64Data);
                const strokeData = JSON.parse(jsonData);
                
                if (strokeData.type === 'initialStroke') {
                  console.log('Drawing initial stroke from /api/init:', strokeData);
                  
                  // Clear canvas and set white background
                  const dpr = window.devicePixelRatio || 1;
                  ctx.fillStyle = 'white';
                  ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
                  
                  // Draw the initial stroke based on type
                  ctx.strokeStyle = strokeData.color;
                  ctx.lineWidth = strokeData.width;
                  ctx.lineCap = 'round';
                  ctx.lineJoin = 'round';
                  ctx.beginPath();
                  
                  if (strokeData.strokeType === 'curve') {
                    // Draw a quadratic curve
                    ctx.moveTo(strokeData.startX, strokeData.startY);
                    ctx.quadraticCurveTo(strokeData.controlX, strokeData.controlY, strokeData.endX, strokeData.endY);
                  } else if (strokeData.strokeType === 'zigzag') {
                    // Draw a multi-point zigzag path
                    if (strokeData.points && strokeData.points.length > 0) {
                      ctx.moveTo(strokeData.points[0].x, strokeData.points[0].y);
                      for (let i = 1; i < strokeData.points.length; i++) {
                        ctx.lineTo(strokeData.points[i].x, strokeData.points[i].y);
                      }
                    }
                  } else {
                    // Draw a straight line (default)
                    ctx.moveTo(strokeData.startX, strokeData.startY);
                    ctx.lineTo(strokeData.endX, strokeData.endY);
                  }
                  
                  ctx.stroke();
                  
                  // Reset canvas context to user's current settings after drawing initial stroke
                  ctx.strokeStyle = currentColorRef.current;
                  ctx.lineWidth = brushSizeRef.current;
                  ctx.lineCap = 'round';
                  ctx.lineJoin = 'round';
                  
                  console.log('Initial stroke drawn on canvas from /api/init');
                  
                  setHasLoadedInitialDrawing(true);
                  setIsInitializing(false); // Mark initialization as complete
                } else {
                  console.log('Unknown stroke metadata format');
                  setIsInitializing(false);
                }
              } else {
                // Handle regular image data (PNG/JPEG data URLs)
                const img = new Image();
                img.onload = () => {
                  // Set white background first
                  ctx.fillStyle = 'white';
                  ctx.fillRect(0, 0, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));
                  // Draw the loaded image
                  ctx.drawImage(img, 0, 0, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));
                  // Reset drawing settings
                  ctx.strokeStyle = currentColorRef.current;
                  ctx.lineWidth = brushSizeRef.current;
                  ctx.lineCap = 'round';
                  ctx.lineJoin = 'round';
                  ctx.globalCompositeOperation = 'source-over';
                  ctx.globalAlpha = 1.0;
                  setHasLoadedInitialDrawing(true);
                  setIsInitializing(false); // Mark initialization as complete
                  console.log('Initial image loaded and canvas reset for drawing');
                };
                img.onerror = (e) => {
                  console.error('Failed to load initial image from /api/init:', e);
                  setIsInitializing(false); // Mark initialization as complete even on error
                };
                img.src = data.drawingData;
              }
            }
          } else {
            console.log('No initial drawing data from /api/init');
            // Mark initialization as complete even if no drawing data
            setIsInitializing(false);
          }
        } else {
          console.error('Failed to fetch initial data:', response.status, response.statusText);
          setUsername('Artist');
          // Generate fallback postId
          const fallbackPostId = `fallback_${Date.now()}`;
          setPostId(fallbackPostId);
          setIsInitializing(false); // Mark initialization as complete even on error
          console.log('Using fallback postId:', fallbackPostId);
        }
      } catch (error) {
        console.log('Could not fetch initial data:', error);
        setUsername('Artist');
        // Generate fallback postId
        const fallbackPostId = `fallback_${Date.now()}`;
        setPostId(fallbackPostId);
        setIsInitializing(false); // Mark initialization as complete even on error
        console.log('Using fallback postId due to error:', fallbackPostId);
      }
    };
    fetchInitialData();
  }, []);

  // Get correct coordinates with proper scaling
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX / (window.devicePixelRatio || 1),
      y: (e.clientY - rect.top) * scaleY / (window.devicePixelRatio || 1)
    };
  };

  // Test function to see if canvas drawing works at all
  // Drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    console.log('startDrawing called! isInitializing:', isInitializing, 'hasCompletedStroke:', hasCompletedStroke, 'ref:', hasCompletedStrokeRef.current);
    
    // Check if app is still initializing (use ref for immediate check)
    if (isInitializingRef.current) {
      console.log('BLOCKED: App is still initializing, please wait...');
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // Check if user has already completed their one stroke (use ref for immediate check)
    if (hasCompletedStrokeRef.current) {
      console.log('BLOCKED: User has already completed their stroke for this session');
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('No canvas ref!');
      return;
    }
    
    console.log('ALLOWING: User can start drawing');
    setIsDrawing(true);
    isDrawingRef.current = true; // Set ref immediately
    setUserHasDrawn(true); // Mark that user has started drawing
    
    // Ensure canvas is ready for drawing
    ensureCanvasReady();
    
    const { x, y } = getCoordinates(e);
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      console.log('Drawing at coordinates:', x, y, 'with color:', currentColorRef.current, 'size:', brushSizeRef.current);
      console.log('Canvas context state - strokeStyle:', ctx.strokeStyle, 'lineWidth:', ctx.lineWidth);
      ctx.strokeStyle = currentColorRef.current;
      ctx.lineWidth = brushSizeRef.current;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Check if app is still initializing (use ref for immediate check)
    if (isInitializingRef.current) {
      return;
    }
    
    // Check if user has completed their stroke (use ref for immediate check)
    if (hasCompletedStrokeRef.current) {
      console.log('BLOCKED: User has completed stroke, blocking mouse draw');
      return;
    }
    
    console.log('draw called, isDrawing ref:', isDrawingRef.current, 'state:', isDrawing);
    if (!isDrawingRef.current) return; // Use ref instead of state
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const { x, y } = getCoordinates(e);
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      console.log('Mouse move - drawing line to:', x, y, 'strokeStyle:', ctx.strokeStyle);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    console.log('stopDrawing called');
    
    // Don't process if still initializing
    if (isInitializingRef.current) {
      return;
    }
    
    // Prevent multiple calls to stopDrawing after stroke is completed
    if (hasCompletedStrokeRef.current) {
      console.log('BLOCKED: stopDrawing called but stroke already completed');
      return;
    }
    
    setIsDrawing(false);
    isDrawingRef.current = false; // Reset ref
    
    // Mark that user has completed their one stroke for this session
    setHasCompletedStroke(true);
    hasCompletedStrokeRef.current = true; // Update ref immediately for instant checks
    
    // Save immediately when drawing stops
    saveDrawingData();
  };

  // Color palette
  const colorPalette = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', 
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500',
    '#800080', '#FFC0CB', '#A52A2A', '#808080'
  ];

  return (
    <div className="h-screen w-full bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden">
      {/* Loading Screen Overlay */}
      {isInitializing && (
        <div className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">🎨 Loading DevvitDrawApp</h2>
            <p className="text-gray-600 mb-4">Preparing your collaborative canvas...</p>
            <div className="text-sm text-gray-500">
              Please wait while we load the current artwork and set up your drawing tools.
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-800">
              🎨 DevvitDrawApp
            </h1>
            <span className="text-sm text-gray-600">
              Welcome, {username}!
            </span>
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-md">
              <span className="text-sm font-medium text-blue-700">
                📊 Strokes: {currentStrokeCount}
              </span>
            </div>
          </div>
          
          {/* Tools */}
          <div className="flex items-center gap-4">
            {/* Color Picker */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Color:</label>
              <input
                type="color"
                value={currentColor}
                onChange={(e) => {
                  const newColor = e.target.value;
                  console.log('Color picker onChange - old:', currentColor, 'new:', newColor);
                  setCurrentColor(newColor);
                  console.log('setCurrentColor called with:', newColor);
                }}
                className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
              />
            </div>

            {/* Brush Size */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Size:</label>
              <input
                type="range"
                min="1"
                max="20"
                value={brushSize}
                onChange={(e) => {
                  console.log('Brush size changed to:', e.target.value);
                  setBrushSize(Number(e.target.value));
                }}
                className="w-16"
              />
              <span className="text-sm text-gray-600 w-6">{brushSize}</span>
            </div>

          </div>
        </div>

        {/* Color Palette */}
        <div className="flex items-center gap-1 mt-3">
          <span className="text-xs text-gray-600 mr-2">Quick colors:</span>
          {colorPalette.map((color) => (
            <button
              key={color}
              onClick={() => setCurrentColor(color)}
              className={`w-6 h-6 rounded border-2 transition-transform hover:scale-110 ${
                currentColor === color ? 'border-gray-800 scale-110' : 'border-gray-300'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 p-4">
        <div className="h-full bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <canvas
            ref={canvasRef}
            className={`w-full h-full block ${
              isInitializing 
                ? 'cursor-wait opacity-50' 
                : hasCompletedStroke 
                  ? 'cursor-not-allowed opacity-75' 
                  : 'cursor-crosshair'
            }`}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onClick={() => console.log('Canvas clicked!')}
            style={{ 
              touchAction: 'none',
              display: 'block'
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex gap-4">
            <button
              onClick={() => navigateTo('https://www.reddit.com/r/DevvitDrawApp')}
              className="hover:text-blue-600 transition-colors"
            >
              r/DevvitDrawApp
            </button>
            <button
              onClick={() => navigateTo('https://developers.reddit.com/docs')}
              className="hover:text-blue-600 transition-colors"
            >
              Devvit Docs
            </button>
          </div>
          <span>🖌️ Click and drag to draw • Touch supported</span>
        </div>
      </div>
    </div>
  );
};
