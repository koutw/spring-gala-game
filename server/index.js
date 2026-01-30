import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { GameManager } from './game/GameManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Environment
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = isProduction
  ? [process.env.RENDER_EXTERNAL_URL, process.env.CORS_ORIGIN].filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:3000'];

// CORS configuration
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());

// Serve static files in production
if (isProduction) {
  app.use(express.static(join(__dirname, '../client/dist')));
}

// Socket.IO setup with CORS
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
  // Optimize for 500 concurrent connections
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6,
  transports: ['websocket', 'polling']
});

// Initialize game manager
const gameManager = new GameManager(io);

// REST API endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/game/status', (req, res) => {
  res.json(gameManager.getGameStatus());
});

// Admin endpoints
app.post('/api/admin/game/start', (req, res) => {
  const { phase, settings } = req.body;
  gameManager.startGame(phase, settings);
  res.json({ success: true });
});

app.post('/api/admin/game/stop', (req, res) => {
  gameManager.stopGame();
  res.json({ success: true });
});

app.post('/api/admin/question', (req, res) => {
  const { question } = req.body;
  gameManager.sendQuestion(question);
  res.json({ success: true });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Player joins game
  socket.on('player:join', (data) => {
    gameManager.addPlayer(socket, data);
  });

  // Player action in Phase 1 (horse racing - tap/shake)
  socket.on('player:action', (data) => {
    gameManager.handlePlayerAction(socket.id, data);
  });

  // Player answer in Phase 2 (quiz)
  socket.on('player:answer', (data) => {
    gameManager.handlePlayerAnswer(socket.id, data);
  });

  // Big screen joins
  socket.on('screen:join', () => {
    gameManager.addScreen(socket);
  });

  // Admin joins
  socket.on('admin:join', () => {
    gameManager.addAdmin(socket);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    gameManager.removeClient(socket.id);
  });
});

// SPA fallback - serve index.html for all non-API routes in production
if (isProduction) {
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../client/dist/index.html'));
  });
}

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`🎮 Spring Gala Game Server running on port ${PORT}`);
  console.log(`📺 Ready for 500 concurrent players`);
  console.log(`🌍 Environment: ${isProduction ? 'Production' : 'Development'}`);
});
