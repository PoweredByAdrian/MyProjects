import express from 'express';
import { InitResponse, IncrementResponse, DecrementResponse, SaveDrawingRequest, SaveDrawingResponse, LoadDrawingRequest, LoadDrawingResponse } from '../shared/types/api';
import { redis, reddit, createServer, context, getServerPort, media } from '@devvit/web/server';
import { createPost } from './core/post';

const app = express();

// Middleware for JSON body parsing (increased limit for images)
app.use(express.json({ limit: '50mb' }));
// Middleware for URL-encoded body parsing
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const router = express.Router();

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
      const [count, username, drawingData] = await Promise.all([
        redis.get('count'),
        reddit.getCurrentUsername(),
        redis.get(`drawing:${postId}`)
      ]);

      // The initial stroke should already exist from post creation
      // If it doesn't exist for some reason, log an error but don't create it here
      if (!drawingData) {
        console.log(`Warning: No initial stroke found for post ${postId} - this should have been created during post creation`);
      }

      res.json({
        type: 'init',
        postId: postId,
        count: count ? parseInt(count) : 0,
        username: username ?? 'anonymous',
        drawingData: drawingData || null
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

router.post<{ postId: string }, IncrementResponse | { status: string; message: string }, unknown>(
  '/api/increment',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', 1),
      postId,
      type: 'increment',
    });
  }
);

router.post<{ postId: string }, DecrementResponse | { status: string; message: string }, unknown>(
  '/api/decrement',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', -1),
      postId,
      type: 'decrement',
    });
  }
);

router.get('/api/heartbeat', async (_req, res): Promise<void> => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

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
      
      // Store the drawing data in Redis
      await redis.set(`drawing:${postId}`, drawingData);
      
      // This is a user stroke - increment stroke count and post canvas
      const newStrokeCount = await redis.incrBy(`strokes:${postId}`, 1);
      console.log(`Stroke count for post ${postId}: ${newStrokeCount}`);
      
      // Post the current canvas image to the subreddit after each stroke
      await postCanvasImageToSubreddit(postId, drawingData, newStrokeCount);
      
      // Get final stroke count for response
      const finalStrokeCount = await redis.get(`strokes:${postId}`);
      const finalCount = finalStrokeCount ? parseInt(finalStrokeCount) : 0;
      
      // Check if artwork is completed (500 strokes)
      const completed = finalCount >= 500;
      
      res.json({
        type: 'save-drawing',
        postId,
        success: true,
        strokeCount: finalCount,
        completed
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
        drawingData: drawingData || null
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

// Export the function for use in other modules
export { postCanvasImageToSubreddit };
