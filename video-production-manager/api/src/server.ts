import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import ServerDiscoveryService from './services/ServerDiscoveryService';

// Load environment variables
dotenv.config();

// Initialize Prisma
export const prisma = new PrismaClient();

// Initialize Express app
const app: Express = express();
const PORT = process.env.PORT || 3001;
const ENABLE_MDNS = process.env.ENABLE_MDNS === 'true';

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

// Health check
app.get('/health', (req: Request, res: Response) => {
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
import settingsRouter from './routes/settings';

app.use('/api/productions', productionsRouter);
app.use('/api/equipment', equipmentRouter);
app.use('/api/sources', sourcesRouter);
app.use('/api/sends', sendsRouter);
app.use('/api/settings', settingsRouter);

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

    // Start Express server
    app.listen(PORT, () => {
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
      } else {
        console.log('📍 Local URLs:');
        const addresses = new ServerDiscoveryService().getLocalIpAddresses();
        addresses.forEach(ip => console.log(`      - http://${ip}:${PORT}`));
      }
      
      console.log('');
      console.log('📘 API Documentation: http://localhost:' + PORT + '/health');
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

// Start the server
startServer();

export default app;
