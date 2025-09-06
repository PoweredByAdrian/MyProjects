import { redis, reddit, context } from '@devvit/web/server';

// Function to generate a random initial stroke as JSON metadata
async function generateRandomInitialStroke(): Promise<string> {
  // Generate completely random RGB color
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);
  const randomColor = `rgb(${r}, ${g}, ${b})`;
  
  // Generate random brush size (bigger than default)
  const brushSizes = [5, 8, 12, 15, 20];
  const randomBrushSize = brushSizes[Math.floor(Math.random() * brushSizes.length)];
  
  // Determine stroke type: straight line, curve, or zigzag
  const strokeTypes = ['line', 'curve', 'zigzag'];
  const strokeType = strokeTypes[Math.floor(Math.random() * strokeTypes.length)];
  
  // Generate random start point
  const startX = Math.floor(Math.random() * 400) + 200; // Keep within reasonable canvas bounds
  const startY = Math.floor(Math.random() * 300) + 150;
  
  let strokeData;
  
  if (strokeType === 'curve') {
    // Create a curved stroke with control points - 500 pixels long
    const angle1 = Math.random() * 2 * Math.PI;
    const angle2 = Math.random() * 2 * Math.PI;
    const length = 500; // Fixed 500 pixel length
    
    const midX = startX + Math.cos(angle1) * (length * 0.5);
    const midY = startY + Math.sin(angle1) * (length * 0.5);
    const endX = startX + Math.cos(angle2) * length;
    const endY = startY + Math.sin(angle2) * length;
    
    strokeData = {
      type: 'initialStroke',
      strokeType: 'curve',
      color: randomColor,
      startX: Math.round(startX),
      startY: Math.round(startY),
      controlX: Math.round(midX),
      controlY: Math.round(midY),
      endX: Math.round(endX),
      endY: Math.round(endY),
      width: randomBrushSize
    };
  } else if (strokeType === 'zigzag') {
    // Create a zigzag stroke with multiple points - total length 500 pixels
    const points: Array<{x: number, y: number}> = [];
    const numPoints = Math.floor(Math.random() * 4) + 3; // 3-6 points
    const direction = Math.random() * 2 * Math.PI;
    const stepLength = 500 / (numPoints - 1); // Divide 500 pixels across all segments
    
    points.push({ x: startX, y: startY });
    
    for (let i = 1; i < numPoints; i++) {
      const variation = (Math.random() - 0.5) * Math.PI; // Random direction variation
      const currentAngle = direction + variation;
      const prevPoint = points[i - 1];
      
      if (prevPoint) {
        const newX: number = prevPoint.x + Math.cos(currentAngle) * stepLength;
        const newY: number = prevPoint.y + Math.sin(currentAngle) * stepLength;
        
        points.push({ 
          x: Math.round(newX), 
          y: Math.round(newY) 
        });
      }
    }
    
    strokeData = {
      type: 'initialStroke',
      strokeType: 'zigzag',
      color: randomColor,
      points: points,
      width: randomBrushSize
    };
  } else {
    // Create a straight line - exactly 500 pixels long
    const angle = Math.random() * 2 * Math.PI;
    const length = 500; // Fixed 500 pixel length
    
    const endX = startX + Math.cos(angle) * length;
    const endY = startY + Math.sin(angle) * length;
    
    strokeData = {
      type: 'initialStroke',
      strokeType: 'line',
      color: randomColor,
      startX: Math.round(startX),
      startY: Math.round(startY), 
      endX: Math.round(endX),
      endY: Math.round(endY),
      width: randomBrushSize
    };
  }
  
  console.log('Generated initial stroke metadata for new post:', strokeData);
  
  // Store this as a special data URL that the client will recognize
  const metadataUrl = `data:application/json;base64,${Buffer.from(JSON.stringify(strokeData)).toString('base64')}`;
  
  return metadataUrl;
}

export const createPost = async () => {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error('subredditName is required');
  }

  // Create the post first
  const post = await reddit.submitCustomPost({
    title: 'DevvitDrawApp - Collaborative Drawing Canvas',
    subredditName: subredditName,
  });
  
  // Generate and save the initial stroke immediately after post creation
  console.log(`Generating initial random stroke for new post ${post.id} during post creation`);
  const initialStrokeData = await generateRandomInitialStroke();
  
  // Save the initial stroke to Redis for client-side rendering
  await redis.set(`drawing:${post.id}`, initialStrokeData);
  
  // Initialize stroke count to 0 (initial stroke doesn't count toward user strokes)
  await redis.set(`strokes:${post.id}`, '0');
  
  console.log(`Initial stroke generated and saved for post ${post.id} during post creation`);
  
  return post;
};
