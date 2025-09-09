/**
 * API utility functions for server communication
 */

export const saveDrawingData = async (canvas: HTMLCanvasElement | null, postId: string) => {
  if (!canvas || !postId) {
    console.log('Cannot save: canvas or postId missing', { canvas: !!canvas, postId });
    return null;
  }

  try {
    console.log('Saving drawing data for postId:', postId);
    
    return new Promise<any>((resolve, reject) => {
      // Convert canvas to blob first (more efficient), then to data URL for server compatibility
      canvas.toBlob(async (blob) => {
        if (!blob) {
          console.error('Failed to create blob from canvas');
          reject(new Error('Failed to create blob from canvas'));
          return;
        }
        
        console.log('Canvas blob created, size:', Math.round(blob.size / 1024), 'KB');
        
        // Convert blob to data URL for server compatibility
        const reader = new FileReader();
        reader.onload = async () => {
          const drawingData = reader.result as string;
          console.log('Drawing data length:', drawingData.length);
          
          try {
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
              resolve(data);
            } else {
              console.error('Failed to save drawing:', response.status);
              reject(new Error(`Failed to save drawing: ${response.status}`));
            }
          } catch (error) {
            console.error('Network error saving drawing:', error);
            reject(error);
          }
        };
        reader.readAsDataURL(blob);
        
      }, 'image/png', 0.8); // 80% quality - good balance of size vs quality
    });
    
  } catch (error) {
    console.error('Failed to save drawing:', error);
    throw error;
  }
};

export const checkForUpdates = async (postId: string, lastKnownTimestamp?: number) => {
  if (!postId) return null;

  try {
    const response = await fetch('/api/check-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        postId: postId,
        lastKnownTimestamp: lastKnownTimestamp
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('📡 Update check result:', result.hasUpdate, 'timestamp:', result.timestamp);
      return result;
    } else {
      console.error('Failed to check for updates:', response.statusText);
      return null;
    }
  } catch (error) {
    console.error('Error checking for updates:', error);
    return null;
  }
};

export const fetchInitialData = async () => {
  try {
    console.log('Fetching initial data...');
    const response = await fetch('/api/init');
    if (response.ok) {
      const data = await response.json();
      console.log('Initial data received:', data);
      return data;
    } else {
      console.error('Failed to fetch initial data:', response.status, response.statusText);
      return null;
    }
  } catch (error) {
    console.log('Could not fetch initial data:', error);
    return null;
  }
};

export const loadDrawingData = async (postId: string) => {
  if (!postId) {
    console.log('No postId available for loading');
    return null;
  }

  try {
    console.log('Loading drawing data for postId:', postId);
    const response = await fetch('/api/load-drawing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId }),
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Received drawing data:', data);
      return data;
    } else {
      console.error('Failed to fetch drawing data:', response.status);
      return null;
    }
  } catch (error) {
    console.error('Failed to load drawing:', error);
    return null;
  }
};
