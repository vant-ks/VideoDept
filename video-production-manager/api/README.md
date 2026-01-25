# Video Production API

Backend API server for the Video Production Manager application with cloud + local sync capabilities.

## Features

- 🗄️ PostgreSQL database with Prisma ORM
- 📡 Automatic LAN server discovery (mDNS/Bonjour)
- 🔄 Sync service for cloud ↔ local operations
- 🚀 RESTful API for all entities
- 🔒 Soft deletes and version tracking
- 📱 Can run as LAN server on any team member's laptop

## Quick Start

### 1. Install Dependencies

```bash
cd api
npm install
```

### 2. Set Up Database

Copy the `.env.example` to `.env` and configure your database:

```bash
cp .env.example .env
```

Edit `.env`:
```
DATABASE_URL="postgresql://user:password@localhost:5432/video_production"
PORT=3001
SERVER_NAME="Video Production Server"
ENABLE_MDNS=true
```

### 3. Run Database Migrations

```bash
npm run prisma:migrate
```

### 4. Start the Server

```bash
# Development mode (auto-restart on changes)
npm run dev

# Production mode
npm run build
npm start
```

The server will start on `http://localhost:3001`

## Server Discovery & LAN Mode

### Automatic Discovery (mDNS/Bonjour)

When `ENABLE_MDNS=true`, the server automatically advertises itself on the local network. Other devices can discover it without knowing the IP address.

### API Endpoints for Server Management

#### Get Server Info
```http
GET /api/server/info
```

Response:
```json
{
  "serverName": "Video Production Server",
  "port": 3001,
  "addresses": ["192.168.1.100", "10.0.0.50"],
  "isLANServer": true,
  "uptime": 3600
}
```

#### Start Advertising (Promote to LAN Server)
```http
POST /api/server/advertise
```

This makes the current instance discoverable on the LAN.

#### Stop Advertising
```http
POST /api/server/stop-advertising
```

#### Discover Other Servers on LAN
```http
GET /api/server/discover?timeout=5000
```

Response:
```json
{
  "servers": [
    {
      "name": "Video Production Server",
      "host": "Kevins-MacBook.local",
      "port": 3001,
      "addresses": ["192.168.1.100"]
    }
  ]
}
```

## API Endpoints

### Productions
- `GET /api/productions` - List all productions
- `GET /api/productions/:id` - Get single production
- `POST /api/productions` - Create production
- `PUT /api/productions/:id` - Update production
- `DELETE /api/productions/:id` - Delete production

### Equipment
- `GET /api/equipment` - List all equipment specs
- `GET /api/equipment/:id` - Get single equipment
- `POST /api/equipment` - Create equipment
- `PUT /api/equipment/:id` - Update equipment
- `DELETE /api/equipment/:id` - Delete equipment

### Sources
- `GET /api/sources/production/:productionId` - List sources for production
- `GET /api/sources/:id` - Get single source
- `POST /api/sources` - Create source
- `PUT /api/sources/:id` - Update source
- `DELETE /api/sources/:id` - Delete source

### Sends
- `GET /api/sends/production/:productionId` - List sends for production
- `GET /api/sends/:id` - Get single send
- `POST /api/sends` - Create send
- `PUT /api/sends/:id` - Update send
- `DELETE /api/sends/:id` - Delete send

### Settings
- `GET /api/settings` - Get all settings
- `GET /api/settings/:key` - Get single setting
- `POST /api/settings/:key` - Set/update setting
- `DELETE /api/settings/:key` - Delete setting

## Database Schema

See `prisma/schema.prisma` for the complete database schema.

Key tables:
- `productions` - Show/event information
- `equipment_specs` - Equipment library
- `sources` - Video sources
- `sends` - Destination feeds
- `connections` - Signal routing
- `sync_log` - Sync history
- `server_registry` - LAN server tracking

## Development

### Database Management

```bash
# Generate Prisma Client
npm run prisma:generate

# Create a migration
npm run prisma:migrate

# Open Prisma Studio (database GUI)
npm run prisma:studio

# Push schema without migration
npm run db:push
```

### Project Structure

```
api/
├── src/
│   ├── server.ts              # Main Express server
│   ├── services/
│   │   └── ServerDiscoveryService.ts  # mDNS/Bonjour discovery
│   └── routes/
│       ├── productions.ts     # Productions endpoints
│       ├── equipment.ts       # Equipment endpoints
│       ├── sources.ts         # Sources endpoints
│       ├── sends.ts           # Sends endpoints
│       └── settings.ts        # Settings endpoints
├── prisma/
│   └── schema.prisma          # Database schema
├── package.json
└── tsconfig.json
```

## Deployment

### As LAN Server (On-Site)

1. Install on a laptop or mini PC
2. Connect to venue's local network
3. Start server with `npm start`
4. Server auto-advertises on LAN
5. Team members connect to the server
6. Server syncs to cloud when internet available

### As Cloud Server

Deploy to any Node.js hosting platform:
- Heroku
- Railway
- DigitalOcean
- AWS/GCP/Azure
- Your own VPS

Make sure to set environment variables and provision a PostgreSQL database.

## Troubleshooting

### mDNS/Bonjour not working

- **macOS/Linux**: Should work out of the box
- **Windows**: May need to install Bonjour Print Services
- **Docker**: Needs host network mode

Fallback: Use manual IP entry in the client app.

### Database connection issues

Check your `DATABASE_URL` in `.env`:
- Ensure PostgreSQL is running
- Verify credentials
- Check firewall settings

### Port already in use

Change the `PORT` in `.env` to an available port.

## License

MIT
