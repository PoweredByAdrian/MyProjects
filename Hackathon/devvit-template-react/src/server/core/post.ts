import { redis, reddit, context } from '@devvit/web/server';

// Function to generate a random initial stroke as JSON metadata
async function generateRandomInitialStroke(): Promise<string> {
  // Generate completely random RGB color
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);
  const randomColor = `rgb(${r}, ${g}, ${b})`;
  
  // Generate random brush size (5-10 range for more variety)
  const randomBrushSize = Math.floor(Math.random() * 6) + 5; // 5, 6, 7, 8, 9, or 10
  
  // Determine stroke type: straight line, curve, or zigzag
  const strokeTypes = ['line', 'curve', 'zigzag'];
  const strokeType = strokeTypes[Math.floor(Math.random() * strokeTypes.length)];
  
  // Generate random start point (adjusted for 720x530 canvas)
  const startX = Math.floor(Math.random() * 520) + 100; // Keep within reasonable canvas bounds (100-620)
  const startY = Math.floor(Math.random() * 330) + 100; // Keep within reasonable canvas bounds (100-430)
  
  let strokeData;
  
  if (strokeType === 'curve') {
    // Create a curved stroke with control points - dynamic length between 200-400 pixels
    const baseAngle = Math.random() * 2 * Math.PI;
    const curveLength = Math.floor(Math.random() * 200) + 200; // 200-400 pixels
    const curvature = (Math.random() - 0.5) * Math.PI; // How much the curve bends
    
    // Calculate end point
    const endX = startX + Math.cos(baseAngle) * curveLength;
    const endY = startY + Math.sin(baseAngle) * curveLength;
    
    // Calculate control point for the curve (offset perpendicular to the line)
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const controlX = midX + Math.cos(baseAngle + Math.PI/2) * Math.sin(curvature) * (curveLength * 0.3);
    const controlY = midY + Math.sin(baseAngle + Math.PI/2) * Math.sin(curvature) * (curveLength * 0.3);
    
    strokeData = {
      type: 'initialStroke',
      strokeType: 'curve',
      color: randomColor,
      startX: Math.round(Math.max(10, Math.min(710, startX))), // Clamp to canvas bounds
      startY: Math.round(Math.max(10, Math.min(520, startY))),
      controlX: Math.round(Math.max(10, Math.min(710, controlX))),
      controlY: Math.round(Math.max(10, Math.min(520, controlY))),
      endX: Math.round(Math.max(10, Math.min(710, endX))),
      endY: Math.round(Math.max(10, Math.min(520, endY))),
      width: randomBrushSize
    };
  } else if (strokeType === 'zigzag') {
    // Create a zigzag stroke with multiple points - dynamic length between 200-400 pixels
    const points: Array<{x: number, y: number}> = [];
    const numPoints = Math.floor(Math.random() * 3) + 4; // 4-6 points for more interesting shapes
    const baseDirection = Math.random() * 2 * Math.PI;
    const totalLength = Math.floor(Math.random() * 200) + 200; // 200-400 pixels total
    const stepLength = totalLength / (numPoints - 1);
    
    points.push({ x: startX, y: startY });
    
    for (let i = 1; i < numPoints; i++) {
      const variation = (Math.random() - 0.5) * Math.PI * 0.8; // Less extreme variations
      const currentAngle = baseDirection + variation;
      const prevPoint = points[i - 1];
      
      if (prevPoint) {
        const newX = prevPoint.x + Math.cos(currentAngle) * stepLength;
        const newY = prevPoint.y + Math.sin(currentAngle) * stepLength;
        
        // Clamp to canvas bounds
        const clampedX = Math.max(10, Math.min(710, newX));
        const clampedY = Math.max(10, Math.min(520, newY));
        
        points.push({ 
          x: Math.round(clampedX), 
          y: Math.round(clampedY) 
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
    // Create a straight line - dynamic length between 150-350 pixels
    const angle = Math.random() * 2 * Math.PI;
    const length = Math.floor(Math.random() * 200) + 150; // 150-350 pixels
    
    const endX = startX + Math.cos(angle) * length;
    const endY = startY + Math.sin(angle) * length;
    
    strokeData = {
      type: 'initialStroke',
      strokeType: 'line',
      color: randomColor,
      startX: Math.round(Math.max(10, Math.min(710, startX))), // Clamp to canvas bounds
      startY: Math.round(Math.max(10, Math.min(520, startY))),
      endX: Math.round(Math.max(10, Math.min(710, endX))),
      endY: Math.round(Math.max(10, Math.min(520, endY))),
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

  
  // Initialize drawing metadata
  const metadata = {
    postId: post.id,
    totalStrokes: 0,
    startTime: Date.now(),
    contributors: ['System'],
    isCompleted: false
  };
  await redis.set(`metadata:${post.id}`, JSON.stringify(metadata));
  
  console.log(`Initial stroke generated and saved for post ${post.id} during post creation`);
  
  return post;
};
