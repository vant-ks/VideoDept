import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import ServerDiscoveryService from './services/ServerDiscoveryService';

console.log('🔥 SERVER.TS LOADING AT:', new Date().toISOString());

// Load environment variables
dotenv.config();

// Initialize Prisma
export const prisma = new PrismaClient();
console.log('🔥 Prisma initialized, models:', Object.keys(prisma).filter(k => /^[a-z]/.test(k)).length);

// Initialize Express app
const app: Express = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
  }
});

const PORT = process.env.PORT || 3010;
const ENABLE_MDNS = process.env.ENABLE_MDNS === 'true';

// Presence tracking: productionId -> Map<userId, userInfo>
const activeUsers = new Map<string, Map<string, { userId: string; userName: string; socketId: string; }>>();

// Production list room tracking
const productionListUsers = new Set<string>();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);
  
  // Production list room (for Shows dashboard)
  socket.on('production-list:join', ({ userId, userName }) => {
    socket.join('production-list');
    productionListUsers.add(socket.id);
    console.log(`📋 ${userName} joined production list room`);
  });
  
  socket.on('production-list:leave', ({ userId }) => {
    socket.leave('production-list');
    productionListUsers.delete(socket.id);
    console.log(`📋 User left production list room`);
  });
  
  socket.on('production:join', ({ productionId, userId, userName }) => {
    socket.join(`production:${productionId}`);
    socket.data.productionId = productionId;
    socket.data.userId = userId;
    socket.data.userName = userName;
    
    // Add to active users
    if (!activeUsers.has(productionId)) {
      activeUsers.set(productionId, new Map());
    }
    activeUsers.get(productionId)!.set(userId, { userId, userName, socketId: socket.id });
    
    console.log(`👤 ${userName} joined production: ${productionId}`);
    
    // Broadcast updated user list to room
    const users = Array.from(activeUsers.get(productionId)!.values());
    io.to(`production:${productionId}`).emit('presence:update', users);
  });
  
  socket.on('production:leave', ({ productionId, userId }) => {
    socket.leave(`production:${productionId}`);
    activeUsers.get(productionId)?.delete(userId);
    
    const users = Array.from(activeUsers.get(productionId)?.values() || []);
    io.to(`production:${productionId}`).emit('presence:update', users);
    
    console.log(`👋 User left production: ${productionId}`);
  });
  
  // Real-time change broadcasting
  socket.on('production:change', ({ productionId, userId, changeType, data }) => {
    // Broadcast to everyone except sender
    socket.to(`production:${productionId}`).emit('production:change', {
      userId,
      userName: socket.data.userName,
      changeType,
      data
    });
  });
  
  socket.on('disconnect', () => {
    const { productionId, userId } = socket.data;
    if (productionId && userId) {
      activeUsers.get(productionId)?.delete(userId);
      const users = Array.from(activeUsers.get(productionId)?.values() || []);
      io.to(`production:${productionId}`).emit('presence:update', users);
      console.log(`🔌 User disconnected: ${socket.id}`);
    }
  });
});

export { io };

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Server Discovery Service
let discoveryService: ServerDiscoveryService | null = null;

// ============================================================================
// ROUTES
// ============================================================================

// Health check at /api/health
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    server: 'Video Production API',
    version: '1.0.0'
  });
});

// Server info endpoint
app.get('/api/server/info', (req: Request, res: Response) => {
  const addresses = discoveryService?.getLocalIpAddresses() || [];
  res.json({
    serverName: process.env.SERVER_NAME || 'Video Production Server',
    port: PORT,
    addresses,
    isLANServer: ENABLE_MDNS,
    uptime: process.uptime()
  });
});

// Start/stop server advertising
app.post('/api/server/advertise', (req: Request, res: Response) => {
  try {
    if (!discoveryService) {
      discoveryService = new ServerDiscoveryService(process.env.SERVER_NAME);
    }
    discoveryService.advertise(Number(PORT));
    res.json({ success: true, message: 'Server is now advertising on LAN' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/server/stop-advertising', (req: Request, res: Response) => {
  try {
    if (discoveryService) {
      discoveryService.stopAdvertising();
    }
    res.json({ success: true, message: 'Stopped advertising' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Restart server (trigger tsx watch reload by touching file)
app.post('/api/server/restart', async (req: Request, res: Response) => {
  try {
    console.log('🔄 Server restart requested');
    
    // Import fs utilities
    const fs = await import('fs');
    const path = await import('path');
    
    // Touch server.ts to trigger tsx watch reload
    const serverPath = path.join(__dirname, 'server.ts');
    const now = new Date();
    
    try {
      fs.utimesSync(serverPath, now, now);
      console.log('✅ Touched server.ts - tsx watch will reload');
    } catch (touchError) {
      // If touch fails, try alternative approach
      console.warn('⚠️ Could not touch server.ts, trying alternative...');
      // Just respond - manual restart needed
    }
    
    res.json({ 
      success: true, 
      message: 'Server reload triggered',
      note: 'tsx watch detected file change and will restart automatically'
    });
  } catch (error: any) {
    console.error('Restart error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Global app reset - broadcast to all clients
app.post('/api/server/global-reset', async (req: Request, res: Response) => {
  try {
    console.log('🔄 Global app reset requested - broadcasting to all clients');
    
    // Broadcast global reset event to ALL connected clients
    io.emit('app:global-reset', {
      timestamp: Date.now(),
      message: 'Database has been reset. Clearing local data...'
    });
    
    console.log('📡 Broadcasted app:global-reset to all clients');
    
    res.json({ 
      success: true, 
      message: 'Global reset event broadcasted to all clients'
    });
  } catch (error: any) {
    console.error('Global reset error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Discover servers on LAN
app.get('/api/server/discover', async (req: Request, res: Response) => {
  try {
    const timeout = Number(req.query.timeout) || 5000;
    const tempDiscovery = new ServerDiscoveryService();
    const servers = await tempDiscovery.findServers(timeout);
    tempDiscovery.shutdown();
    res.json({ servers });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Import routes
import productionsRouter from './routes/productions';
import equipmentRouter from './routes/equipment';
import sourcesRouter from './routes/sources';
import sendsRouter from './routes/sends';
import camerasRouter from './routes/cameras';
import ccusRouter from './routes/ccus';
import settingsRouter from './routes/settings';
import eventsRouter from './routes/events';
import healthRouter from './routes/health';
import mediaServerRouter from './routes/media-servers';
import routerRouter from './routes/routers';
import cableSnakeRouter from './routes/cable-snakes';
import recordRouter from './routes/records';
import streamRouter from './routes/streams';
import visionSwitcherRouter from './routes/vision-switchers';
import camSwitcherRouter from './routes/cam-switchers';
import ledScreenRouter from './routes/led-screens';
import projectionScreenRouter from './routes/projection-screens';
import ipAddressRouter from './routes/ip-addresses';
import checklistItemRouter from './routes/checklist-items';
import connectionRouter from './routes/connections';
import adminRouter from './routes/admin';

app.use('/api/productions', productionsRouter);
app.use('/api/equipment', equipmentRouter);
app.use('/api/sources', sourcesRouter);
app.use('/api/sends', sendsRouter);
app.use('/api/cameras', camerasRouter);
app.use('/api/ccus', ccusRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/admin', adminRouter);
app.use('/', healthRouter); // Provides /health and /health/diagnostics
app.use('/api/media-servers', mediaServerRouter);
app.use('/api/routers', routerRouter);
app.use('/api/cable-snakes', cableSnakeRouter);
app.use('/api/records', recordRouter);
app.use('/api/streams', streamRouter);
app.use('/api/vision-switchers', visionSwitcherRouter);
app.use('/api/cam-switchers', camSwitcherRouter);
app.use('/api/led-screens', ledScreenRouter);
app.use('/api/projection-screens', projectionScreenRouter);
app.use('/api/ip-addresses', ipAddressRouter);
app.use('/api/checklist-items', checklistItemRouter);
app.use('/api/connections', connectionRouter);
app.use('/api', eventsRouter); // Events routes (includes production context)

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected');

    // Start HTTP server (now with Socket.io)
    httpServer.listen(PORT, () => {
      console.log('');
      console.log('🚀 Video Production API Server');
      console.log('================================');
      console.log(`   Port: ${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('');

      // Start mDNS advertising if enabled
      if (ENABLE_MDNS) {
        discoveryService = new ServerDiscoveryService(process.env.SERVER_NAME);
        discoveryService.advertise(Number(PORT));
      } else if (process.env.NODE_ENV !== 'production') {
        // Only try to get local IPs in development (fails in containers)
        try {
          console.log('📍 Local URLs:');
          const addresses = new ServerDiscoveryService().getLocalIpAddresses();
          addresses.forEach(ip => console.log(`      - http://${ip}:${PORT}`));
        } catch (error) {
          console.log('   (Could not determine local IP addresses)');
        }
      }
      
      console.log('');
      console.log('📘 API Documentation: http://localhost:' + PORT + '/health');
      console.log('🔌 WebSocket enabled for real-time collaboration');
      console.log('');
      console.log('');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  
  if (discoveryService) {
    discoveryService.shutdown();
  }
  
  await prisma.$disconnect();
  console.log('✅ Server shut down gracefully');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Promise Rejection:', reason);
  console.error('   Promise:', promise);
  // Don't exit - log and continue
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Log but don't exit immediately - give server time to finish requests
});

// Start the server
startServer();

export default app;
