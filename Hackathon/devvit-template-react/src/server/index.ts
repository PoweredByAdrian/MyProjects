import express from 'express';
import { InitResponse, SaveDrawingRequest, SaveDrawingResponse, LoadDrawingRequest, LoadDrawingResponse, CheckUpdateRequest, CheckUpdateResponse, CheckCooldownRequest, CheckCooldownResponse, CompleteArtworkRequest, CompleteArtworkResponse } from '../shared/types/api';
import { MAX_STROKES } from '../shared/constants';
import { redis, reddit, createServer, context, getServerPort, media } from '@devvit/web/server';
import { createPost } from './core/post';

const app = express();

// Middleware for JSON body parsing (increased limit for images)
app.use(express.json({ limit: '50mb' }));
// Middleware for URL-encoded body parsing
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const router = express.Router();

// Cooldown duration in milliseconds (5 minutes = 300,000 ms)
const COOLDOWN_DURATION = 1 * 1000 * 5; // 5 minutes

// Function to check if user is in cooldown
async function checkUserCooldown(userId: string, postId: string): Promise<{ canDraw: boolean; cooldownRemaining?: number; lastDrawTime?: number }> {
  if (!userId) {
    console.log('🔍 checkUserCooldown: No userId provided');
    return { canDraw: true }; // Allow anonymous users for now
  }
  
  const cooldownKey = `cooldown:${postId}:${userId}`;
  console.log(`🔍 checkUserCooldown: Checking key ${cooldownKey}`);
  
  const lastDrawTimeStr = await redis.get(cooldownKey);
  
  if (!lastDrawTimeStr) {
    console.log('🔍 checkUserCooldown: No previous draw time found');
    return { canDraw: true }; // No previous draw time
  }
  
  const lastDrawTime = parseInt(lastDrawTimeStr);
  const timeSinceLastDraw = Date.now() - lastDrawTime;
  
  console.log(`🔍 checkUserCooldown: Last draw time: ${new Date(lastDrawTime).toLocaleString()}, time since: ${timeSinceLastDraw}ms, cooldown duration: ${COOLDOWN_DURATION}ms`);
  
  if (timeSinceLastDraw >= COOLDOWN_DURATION) {
    console.log('🔍 checkUserCooldown: Cooldown expired - can draw');
    return { canDraw: true, lastDrawTime };
  }
  
  const cooldownRemaining = Math.ceil((COOLDOWN_DURATION - timeSinceLastDraw) / 1000); // in seconds
  console.log(`🔍 checkUserCooldown: Still on cooldown - ${cooldownRemaining} seconds remaining`);
  return { canDraw: false, cooldownRemaining, lastDrawTime };
}

router.get<{ postId: string }, InitResponse | { status: string; message: string }>(
  '/api/init',
  async (_req, res): Promise<void> => {
    const { postId } = context;

    if (!postId) {
      console.error('API Init Error: postId not found in devvit context');
      res.status(400).json({
        status: 'error',
        message: 'postId is required but missing from context',
      });
      return;
    }

    try {
      const [username, drawingData, timestampStr] = await Promise.all([
        reddit.getCurrentUsername(),
        redis.get(`drawing:${postId}`),
        redis.get(`drawing_timestamp:${postId}`)
      ]);
      
      // Get current user ID for cooldown tracking
      const currentUser = await reddit.getCurrentUser();
      const userId = currentUser?.id;

      const timestamp = timestampStr ? parseInt(timestampStr) : undefined;
      
      // Check cooldown status for this user
      let cooldownInfo: { canDraw: boolean; cooldownRemaining?: number; lastDrawTime?: number } = { canDraw: true };
      if (userId) {
        cooldownInfo = await checkUserCooldown(userId, postId);
      }

      // The initial stroke should already exist from post creation
      // If it doesn't exist for some reason, log an error but don't create it here
      if (!drawingData) {
        console.log(`Warning: No initial stroke found for post ${postId} - this should have been created during post creation`);
      }

      res.json({
        type: 'init',
        postId: postId,
        username: username ?? 'anonymous',
        ...(userId && { userId: userId }),
        drawingData: drawingData || null,
        canDraw: cooldownInfo.canDraw,
        ...(cooldownInfo.cooldownRemaining && { cooldownRemaining: cooldownInfo.cooldownRemaining }),
        ...(timestamp && { timestamp })
      });
    } catch (error) {
      console.error(`API Init Error for post ${postId}:`, error);
      let errorMessage = 'Unknown error during initialization';
      if (error instanceof Error) {
        errorMessage = `Initialization failed: ${error.message}`;
      }
      res.status(400).json({ status: 'error', message: errorMessage });
    }
  }
);

// Helper function to post canvas image to subreddit after each stroke
async function postCanvasImageToSubreddit(postId: string, drawingData: string, strokeCount: number) {
  try {
    if (!drawingData || !context.subredditName) {
      console.log('Cannot post image: missing drawing data or subreddit name');
      return;
    }

    // Handle both SVG and regular image formats
    const base64Data = drawingData.replace(/^data:image\/[a-z+]+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const canvasSize = Math.round(imageBuffer.length / 1024);
    
    console.log(`🖼️ Posting canvas image as comment after stroke ${strokeCount}: ${canvasSize}KB (format: ${drawingData.split(';')[0]})`);
    
    // Upload image to Reddit using media API
    const uploadResponse = await media.upload({
      url: drawingData,
      type: 'image',
    });
    
    console.log('Canvas image uploaded successfully:', {
      mediaId: uploadResponse.mediaId,
      availableProps: Object.keys(uploadResponse)
    });
    
    // Post the image as a comment under the current post (where the app is)
    try {
      // Ensure postId has the correct Reddit format
      const redditPostId = postId.startsWith('t3_') ? postId as `t3_${string}` : `t3_${postId}` as `t3_${string}`;
      
      await reddit.submitComment({
        id: redditPostId, // Use the current post ID where the app is running
        richtext: {
          document: [
            {
              e: 'par',
              c: [
                {
                  e: 'text',
                  t: `🎨 **Stroke #${strokeCount}**`
                }
              ]
            },
            {
              e: 'par',
              c: [
                {
                  e: 'text',
                  t: '🖼️ **Current canvas state:**'
                }
              ]
            },
            {
              e: 'img',
              id: uploadResponse.mediaId
            },
            {
              e: 'par',
              c: [
                {
                  e: 'text',
                  t: '⬆️ *Add your own stroke to continue this collaborative masterpiece!*'
                }
              ]
            }
          ]
        }
      });
      
      console.log(`Successfully posted canvas image as comment under post ${postId}`);
      
    } catch (commentError) {
      console.error('Failed to add image comment, trying simple text comment:', commentError);
      
      // Fallback: Simple text comment with media reference
      const redditPostId = postId.startsWith('t3_') ? postId as `t3_${string}` : `t3_${postId}` as `t3_${string}`;
      
      await reddit.submitComment({
        id: redditPostId,
        text: `🎨 **Stroke #${strokeCount}**\n\n�️ Current canvas state: Media ID ${uploadResponse.mediaId}\n\n⬆️ *Add your own stroke to continue this collaborative masterpiece!*`
      });
      
      console.log('Posted fallback text comment with canvas update info');
    }
    
  } catch (error) {
    console.error('Failed to post canvas image to subreddit:', error);
    
    // Fallback: Create a text post mentioning the update
    try {
      const subreddit = await reddit.getSubredditByName(context.subredditName!);
      const fallbackPost = await subreddit.submitPost({
        title: `🎨 Canvas Update - Stroke #${strokeCount}`,
        text: `# Live Canvas Update!

🖌️ **Stroke #${strokeCount}** has been added to our collaborative artwork!

## 🎯 Join the Collaboration
Visit the main drawing post to see the current canvas and add your own stroke.

*The canvas is evolving with every contribution!* 🎨✨`,
        sendreplies: false
      });
      
      console.log(`Posted fallback text update: ${fallbackPost.url}`);
      return fallbackPost;
      
    } catch (fallbackError) {
      console.error('Failed to post fallback update:', fallbackError);
      return null;
    }
  }
}

// GIF Generation Function
// Helper function to update post progress with a comment and image
// Save drawing data endpoint
router.post<{}, SaveDrawingResponse | { status: string; message: string }, SaveDrawingRequest>(
  '/api/save-drawing',
  async (req, res): Promise<void> => {
    try {
      const { postId, drawingData } = req.body;
      
      if (!postId || !drawingData) {
        res.status(400).json({
          status: 'error',
          message: 'Missing postId or drawingData',
        });
        return;
      }

      console.log(`Saving drawing for post ${postId}, data size: ${drawingData.length} characters`);
      
      // Check if artwork is already completed
      const isCompleted = await redis.get(`completed:${postId}`);
      if (isCompleted === 'true') {
        res.status(403).json({
          status: 'error',
          message: 'This artwork is already completed. No more strokes can be added.',
        });
        return;
      }
      
      // Get current user ID for cooldown checking
      const currentUser = await reddit.getCurrentUser();
      const userId = currentUser?.id;
      
      // Check cooldown if user has ID
      if (userId) {
        const cooldownResult = await checkUserCooldown(userId, postId);
        
        if (!cooldownResult.canDraw) {
          res.status(429).json({
            status: 'error',
            message: `You must wait ${cooldownResult.cooldownRemaining} seconds before drawing again`,
          });
          return;
        }
      }
      
      // Create timestamp for this update
      const timestamp = Date.now();
      
      // Store the drawing data in Redis
      await redis.set(`drawing:${postId}`, drawingData);
      
      // Store the timestamp for this drawing update
      await redis.set(`drawing_timestamp:${postId}`, timestamp.toString());
      
      // This is a user stroke - increment stroke count
      const newStrokeCount = await redis.incrBy(`strokes:${postId}`, 1);
      console.log(`📈 Stroke count for post ${postId}: ${newStrokeCount} at ${new Date(timestamp).toLocaleString()}`);
      
      // Check if artwork is completed (max strokes reached)
      const completed = newStrokeCount >= MAX_STROKES;

      // Mark artwork as completed in Redis if it reaches max strokes
      if (completed) {
        await redis.set(`completed:${postId}`, 'true');
        console.log(`🏁 Artwork ${postId} marked as completed after ${newStrokeCount} strokes`);
      }
      
      // Post the current canvas image to the subreddit after each stroke
      await postCanvasImageToSubreddit(postId, drawingData, newStrokeCount);
      
      // Get final stroke count for response
      const finalStrokeCount = await redis.get(`strokes:${postId}`);
      const finalCount = finalStrokeCount ? parseInt(finalStrokeCount) : 0;
      
      // Record user's draw time for cooldown tracking
      if (userId) {
        await redis.set(`cooldown:${postId}:${userId}`, timestamp.toString());
        console.log(`🕒 Recorded cooldown for user ${userId} on post ${postId} at ${new Date(timestamp).toLocaleString()}`);
      }
      
      res.json({
        type: 'save-drawing',
        postId,
        success: true,
        strokeCount: finalCount,
        completed,
        timestamp
      });
      
    } catch (error) {
      console.error(`Error saving drawing for post ${req.body?.postId}:`, error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to save drawing data',
      });
    }
  }
);

// Load drawing data endpoint
router.post<{}, LoadDrawingResponse | { status: string; message: string }, LoadDrawingRequest>(
  '/api/load-drawing',
  async (req, res): Promise<void> => {
    try {
      const { postId } = req.body;
      
      if (!postId) {
        res.status(400).json({
          status: 'error',
          message: 'Missing postId',
        });
        return;
      }

      console.log(`Loading drawing for post ${postId}`);
      
      // Get the drawing data from Redis
      const drawingData = await redis.get(`drawing:${postId}`);
      
      // Get the timestamp when this drawing was last updated
      const timestampStr = await redis.get(`drawing_timestamp:${postId}`);
      const timestamp = timestampStr ? parseInt(timestampStr) : undefined;
      
      console.log(`📋 Loading drawing for post ${postId}, timestamp: ${timestamp ? new Date(timestamp).toLocaleString() : 'none'}`);
      
      // Check if this is the first time loading and if we need to post initial canvas
      if (drawingData) {
        // Log that we have initial stroke data for rendering only
        const strokeCount = await redis.get(`strokeCount:${postId}`);
        const currentCount = strokeCount ? parseInt(strokeCount) : 0;
        
        if (currentCount === 0) {
          console.log(`📋 Loading initial stroke data for post ${postId} - for display only`);
        }
      }
      
      res.json({
        type: 'load-drawing',
        postId,
        drawingData: drawingData || null,
        ...(timestamp && { timestamp })
      });
      
    } catch (error) {
      console.error(`Error loading drawing for post ${req.body?.postId}:`, error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to load drawing data',
      });
    }
  }
);

// Check if drawing has been updated since last known timestamp
router.post<{}, CheckUpdateResponse | { status: string; message: string }, CheckUpdateRequest>(
  '/api/check-update',
  async (req, res): Promise<void> => {
    try {
      const { postId, lastKnownTimestamp } = req.body;
      
      if (!postId) {
        res.status(400).json({
          status: 'error',
          message: 'Missing postId',
        });
        return;
      }

      // Get the current timestamp for this drawing
      const timestampStr = await redis.get(`drawing_timestamp:${postId}`);
      const currentTimestamp = timestampStr ? parseInt(timestampStr) : undefined;
      
      const hasUpdate = currentTimestamp !== undefined && 
                       (lastKnownTimestamp === undefined || currentTimestamp > lastKnownTimestamp);
      
      console.log(`🔄 Check update for ${postId}: current=${currentTimestamp}, lastKnown=${lastKnownTimestamp}, hasUpdate=${hasUpdate}`);
      
      res.json({
        type: 'check-update',
        postId,
        hasUpdate,
        ...(hasUpdate && currentTimestamp && { timestamp: currentTimestamp })
      });
      
    } catch (error) {
      console.error(`Error checking update for post ${req.body?.postId}:`, error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to check for updates',
      });
    }
  }
);

// Check if artwork is completed endpoint
router.post<{}, { isCompleted: boolean; strokeCount?: number } | { status: string; message: string }, { postId: string }>(
  '/api/check-completion',
  async (req, res): Promise<void> => {
    try {
      const { postId } = req.body;
      
      if (!postId) {
        res.status(400).json({
          status: 'error',
          message: 'Missing postId',
        });
        return;
      }

      const isCompleted = await redis.get(`completed:${postId}`);
      const strokeCountStr = await redis.get(`strokes:${postId}`);
      const strokeCount = strokeCountStr ? parseInt(strokeCountStr) : 0;
      
      res.json({
        isCompleted: isCompleted === 'true',
        strokeCount
      });
      
    } catch (error) {
      console.error(`Error checking completion for post ${req.body?.postId}:`, error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to check completion status',
      });
    }
  }
);

// Check user cooldown endpoint
router.post<{}, CheckCooldownResponse | { status: string; message: string }, CheckCooldownRequest>(
  '/api/check-cooldown',
  async (req, res): Promise<void> => {
    try {
      const { postId } = req.body;
      
      if (!postId) {
        res.status(400).json({
          status: 'error',
          message: 'Missing postId',
        });
        return;
      }

      // Get current user ID
      const currentUser = await reddit.getCurrentUser();
      const userId = currentUser?.id;
      
      console.log(`🔍 Check cooldown for post ${postId}, user: ${userId || 'anonymous'}`);
      
      if (!userId) {
        // Allow anonymous users or users without ID
        console.log('🔍 No user ID - allowing drawing');
        res.json({
          type: 'check-cooldown',
          postId,
          canDraw: true
        });
        return;
      }

      const cooldownResult = await checkUserCooldown(userId, postId);
      
      console.log(`🔍 Cooldown result for user ${userId}:`, cooldownResult);
      
      res.json({
        type: 'check-cooldown',
        postId,
        canDraw: cooldownResult.canDraw,
        ...(cooldownResult.cooldownRemaining && { cooldownRemaining: cooldownResult.cooldownRemaining }),
        ...(cooldownResult.lastDrawTime && { lastDrawTime: cooldownResult.lastDrawTime })
      });
      
    } catch (error) {
      console.error(`Error checking cooldown for post ${req.body?.postId}:`, error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to check cooldown',
      });
    }
  }
);

// Get stroke count endpoint
router.post<{}, { strokeCount: number } | { status: string; message: string }, { postId: string }>(
  '/api/get-stroke-count',
  async (req, res): Promise<void> => {
    try {
      const { postId } = req.body;
      
      if (!postId) {
        res.status(400).json({
          status: 'error',
          message: 'Missing postId',
        });
        return;
      }

      console.log(`Getting stroke count for post ${postId}`);
      
      // Get the stroke count from Redis
      const strokeCountStr = await redis.get(`strokes:${postId}`);
      const strokeCount = strokeCountStr ? parseInt(strokeCountStr) : 0;
      
      res.json({
        strokeCount
      });
      
    } catch (error) {
      console.error(`Error getting stroke count for post ${req.body?.postId}:`, error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get stroke count',
      });
    }
  }
);

// Get drawing statistics and GIF data endpoint
router.post<{}, { strokeCount: number; metadata?: any; gifData?: any } | { status: string; message: string }, { postId: string }>(
  '/api/get-drawing-stats',
  async (req, res): Promise<void> => {
    try {
      const { postId } = req.body;
      
      if (!postId) {
        res.status(400).json({
          status: 'error',
          message: 'Missing postId',
        });
        return;
      }

      console.log(`Getting drawing stats for post ${postId}`);
      
      // Get the stroke count from Redis
      const strokeCountStr = await redis.get(`strokes:${postId}`);
      const strokeCount = strokeCountStr ? parseInt(strokeCountStr) : 0;
      
      // Get metadata if available
      const metadataStr = await redis.get(`metadata:${postId}`);
      const metadata = metadataStr ? JSON.parse(metadataStr) : null;
      
      // Get GIF data if available
      const gifDataStr = await redis.get(`gif_data:${postId}`);
      const gifData = gifDataStr ? JSON.parse(gifDataStr) : null;
      
      res.json({
        strokeCount,
        ...(metadata && { metadata }),
        ...(gifData && { gifData })
      });
      
    } catch (error) {
      console.error(`Error getting drawing stats for post ${req.body?.postId}:`, error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get drawing stats',
      });
    }
  }
);

// Complete artwork endpoint - when max strokes are reached
router.post<{}, CompleteArtworkResponse | { status: string; message: string }, CompleteArtworkRequest>(
  '/api/complete-artwork',
  async (req, res): Promise<void> => {
    try {
      const { currentPostId, finalImage, strokeCount } = req.body;
      
      if (!currentPostId || !finalImage) {
        res.status(400).json({
          status: 'error',
          message: 'currentPostId and finalImage are required'
        });
        return;
      }
      
      console.log(`🎉 Completing artwork for post ${currentPostId} with ${strokeCount} strokes`);
      
      // Upload the final image to Reddit
      const imageData = finalImage.split(',')[1];
      if (!imageData) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid image data'
        });
        return;
      }
      
      const uploadedImage = await media.upload({
        url: finalImage,
        type: 'image',
      });
      
      // Create a new post with the completed artwork as a rich text post with image
      const subreddit = await reddit.getSubredditByName(context.subredditName!);
      const finalPost = await subreddit.submitPost({
        title: `🎨 Collaborative Masterpiece Complete! (${strokeCount} strokes)`,
        richtext: {
          document: [
            {
              e: 'par',
              c: [
                {
                  e: 'text',
                  t: '🎉 ',
                  f: [[0, 11, 1]] // Bold
                },
                {
                  e: 'text',
                  t: 'Community Art Project Complete!',
                  f: [[0, 31, 1]] // Bold
                }
              ]
            },
            {
              e: 'par',
              c: [
                {
                  e: 'text',
                  t: '�️ **Final Collaborative Artwork:**'
                }
              ]
            },
            {
              e: 'img',
              id: uploadedImage.mediaId
            },
            {
              e: 'par',
              c: [
                {
                  e: 'text',
                  t: `🖌️ **Final Stats:** ${strokeCount} total strokes`
                }
              ]
            },
            {
              e: 'par',
              c: [
                {
                  e: 'text',
                  t: '👥 **Contributors:** Community artists from our collaborative canvas'
                }
              ]
            },
            {
              e: 'par',
              c: [
                {
                  e: 'text',
                  t: '🎨 **The Journey:** This artwork was created through the collective creativity of our community. Each stroke was carefully placed by a different artist, building upon the work of those who came before.'
                }
              ]
            },
            {
              e: 'par',
              c: [
                {
                  e: 'text',
                  t: 'Thank you to everyone who participated in this amazing collaborative art project!'
                }
              ]
            },
            {
              e: 'par',
              c: [
                {
                  e: 'text',
                  t: '✨ Want to start a new collaborative artwork? Create a new DevvitDrawApp post!'
                }
              ]
            }
          ]
        }
      });
      
      console.log(`Final artwork posted as ${finalPost.id}`);
      
      // Mark the current post as completed
      const metadata = {
        postId: currentPostId,
        totalStrokes: strokeCount,
        endTime: Date.now(),
        isCompleted: true,
        finalPostId: finalPost.id
      };
      await redis.set(`metadata:${currentPostId}`, JSON.stringify(metadata));
      await redis.set(`completed:${currentPostId}`, 'true');
      
      // Create a new collaborative drawing post
      const newPost = await createPost();
      
      console.log(`New collaborative drawing started with post ${newPost.id}`);
      
      res.json({
        type: 'complete-artwork',
        success: true,
        newPostId: newPost.id,
        finalPostUrl: `https://reddit.com/r/${context.subredditName}/comments/${finalPost.id}`
      });
      
    } catch (error) {
      console.error('Error completing artwork:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to complete artwork'
      });
    }
  }
);

router.post('/internal/on-app-install', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      status: 'success',
      message: `Post created in subreddit ${context.subredditName} with id ${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

router.post('/internal/menu/post-create', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

// Use router middleware
app.use(router);

// Get port from environment variable with fallback
const port = getServerPort();

const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port);
