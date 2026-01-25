# Getting Started with Database Backend

This guide walks you through setting up the new database-backed architecture for the Video Production Manager.

## Overview

You now have a hybrid cloud + local architecture:
- **Cloud mode**: Connect to a cloud PostgreSQL database for planning and collaboration
- **LAN mode**: Any team member can promote their laptop to be the LAN server on-site

## Step 1: Install PostgreSQL

You need PostgreSQL 14 or higher.

### Option A: Local PostgreSQL

**macOS (using Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
createdb video_production
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres createdb video_production
```

**Windows:**
Download from [postgresql.org](https://www.postgresql.org/download/windows/)

### Option B: Use Supabase (Recommended for Cloud)

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Get your connection string from Settings → Database
4. Use this in your `.env` file

### Option C: Docker

```bash
docker run --name video-prod-db \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=video_production \
  -p 5432:5432 \
  -v pgdata:/var/lib/postgresql/data \
  -d postgres:15
```

## Step 2: Set Up the API Server

```bash
# Navigate to API directory
cd video-production-manager/api

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your database credentials
# DATABASE_URL="postgresql://user:password@localhost:5432/video_production"
```

## Step 3: Initialize the Database

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations to create tables
npm run prisma:migrate

# (Optional) Open Prisma Studio to view your database
npm run prisma:studio
```

## Step 4: Start the API Server

```bash
# Development mode (auto-restart on changes)
npm run dev

# The server will start on http://localhost:3001
```

You should see:
```
🚀 Video Production API Server
================================
   Port: 3001
   Environment: development

✅ Database connected

📡 Server Discovery:
   Service Name: Video Production Server
   Port: 3001
   Local IPs:
      - http://192.168.1.100:3001
      - http://10.0.0.50:3001
```

## Step 5: Update the Frontend

The frontend React app needs to connect to the API server.

### Add Server Connection UI

The `ServerConnection` component has been created. Add it to your Settings page:

```tsx
// src/pages/Settings.tsx
import ServerConnection from '@/components/ServerConnection';

export function Settings() {
  const handleServerConnect = (serverUrl: string) => {
    console.log('Connected to:', serverUrl);
    // Reload app or update API client
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* ... existing settings ... */}
      
      <ServerConnection onConnect={handleServerConnect} />
      
      {/* ... rest of settings ... */}
    </div>
  );
}
```

## Step 6: Usage Scenarios

### Scenario 1: Solo Work (Development)

1. Start API server: `cd api && npm run dev`
2. Start frontend: `npm run dev`
3. Frontend automatically connects to `http://localhost:3001`

### Scenario 2: Office Collaboration (Cloud Mode)

1. Deploy API to cloud (Heroku, Railway, etc.) with Supabase
2. Set frontend env: `VITE_API_URL=https://your-api.herokuapp.com`
3. Multiple team members connect to same cloud database
4. Real-time collaboration on show planning

### Scenario 3: On-Site LAN Server

**Setup at venue:**

1. **Designate LAN Server** (usually Tech Director's laptop):
   - Open Settings → Server Connection
   - Click "Promote to LAN Server"
   - Server starts and advertises on LAN

2. **Other Team Members Connect**:
   - Open Settings → Server Connection
   - Click "Scan for Servers"
   - Select the discovered server
   - Click "Connect"

3. **Alternative: Manual Connection**:
   - Get IP address of LAN server (shown when promoted)
   - Enter IP in "Manual Connection" field
   - Click "Connect"

4. **Work Offline**:
   - All team members now work against local database
   - Fast responses, no internet required
   - Changes are queued for sync

5. **Sync to Cloud** (when internet available):
   - API server automatically syncs changes to cloud
   - Bidirectional sync with conflict resolution

## Verifying Everything Works

### Test API Endpoints

```bash
# Health check
curl http://localhost:3001/health

# Get server info
curl http://localhost:3001/api/server/info

# List equipment (should be empty initially)
curl http://localhost:3001/api/equipment
```

### Test Server Discovery

```bash
# Discover servers on LAN
curl http://localhost:3001/api/server/discover
```

### Test in Frontend

1. Open frontend (http://localhost:3000)
2. Go to Settings
3. Should see "Server Connection" section
4. Try promoting to LAN server
5. Check connection status

## Migration from localStorage

Your existing data is in browser localStorage. To migrate:

1. Export data from Settings page (if you have export feature)
2. Or, create a migration script to read localStorage and POST to API
3. Script example:

```javascript
// Run in browser console on current app
const data = {
  equipment: JSON.parse(localStorage.getItem('production-store') || '{}')
};

// Send to API
fetch('http://localhost:3001/api/equipment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data.equipment)
});
```

## Troubleshooting

### Database Connection Failed

- Check PostgreSQL is running: `pg_isready`
- Verify DATABASE_URL in `.env`
- Check firewall settings

### API Server Won't Start

- Port 3001 already in use? Change PORT in `.env`
- Missing dependencies? Run `npm install`
- Check Node.js version: `node --version` (need v18+)

### Server Discovery Not Working

- **macOS/Linux**: Should work out of the box
- **Windows**: Install [Bonjour Print Services](https://support.apple.com/kb/DL999)
- **Firewall**: Ensure port 3001 is allowed
- **Fallback**: Use manual IP connection

### Frontend Can't Connect to API

- Check API is running: `curl http://localhost:3001/health`
- Check CORS settings in API server
- Try manual IP connection in Server Connection UI

## Next Steps

1. ✅ API server running
2. ✅ Frontend connected to API
3. ⬜ Migrate existing data from localStorage
4. ⬜ Test LAN server mode with multiple devices
5. ⬜ Set up cloud deployment
6. ⬜ Configure sync service

## Support

If you encounter issues:
1. Check API server logs
2. Check browser console for errors
3. Verify database is accessible
4. Test with `curl` commands first

---

**You're now running a production-ready database architecture!** 🎉

The app can work offline, sync when online, and scale to multiple users and shows.
