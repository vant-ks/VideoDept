# Database Settings Implementation

## Overview
Settings lists (Connector Types, Source Types, Frame Rates, Resolutions) have been moved from hardcoded frontend arrays to database-backed tables. This allows them to be managed centrally and synced across devices when the backend is running.

## Database Changes

### New Tables Added to Schema

1. **connector_types** - HDMI, SDI, DP, FIBER, NDI, USB-C
2. **source_types** - LAPTOP, CAM, SERVER, PLAYBACK, GRAPHICS, PTZ, ROBO, OTHER
3. **frame_rates** - 60, 59.94, 50, 30, 29.97, 25, 24, 23.98
4. **resolution_presets** - 8192x1080, 7680x1080, 4096x2160, etc.

Each table has:
- `id` (UUID primary key)
- `name` or `rate` (unique identifier)
- `sortOrder` (for drag-and-drop reordering)
- `isActive` (soft delete flag)
- `createdAt`, `updatedAt` (timestamps)

### API Endpoints Added

Each settings type has 4 endpoints:

- `GET /api/settings/{type}` - List all active items
- `POST /api/settings/{type}` - Add new item
- `DELETE /api/settings/{type}/:name` - Soft delete item (marks inactive)
- `PUT /api/settings/{type}/reorder` - Reorder items

## Setup Instructions

### 1. Run Database Migration

```bash
cd api
npm install
npx prisma migrate dev --name add-settings-tables
```

### 2. Seed Initial Data

```bash
npx ts-node prisma/seed-settings.ts
```

This populates the tables with:
- 6 connector types
- 8 source types
- 8 frame rates
- 9 resolution presets

### 3. Start API Server

```bash
npm run dev
```

Server will start on port 3001.

## Frontend Behavior

### When Backend is Available
- Settings lists load from database
- Add/remove/reorder operations sync to database
- Changes persist across sessions and devices

### When Backend is Unavailable (Offline Mode)
- Settings fall back to hardcoded defaults in frontend store
- Changes stored in localStorage only
- Will sync when backend becomes available

## Future Settings

When adding new settings groups, ask:

**Should this be a database table?**
- YES if: Users need to customize it, it should sync across devices, it changes frequently
- NO if: It's truly static configuration that never changes

Examples requiring DB tables:
- Custom send types
- Custom equipment categories
- Venue presets
- Client list

Examples that can stay hardcoded:
- Theme options (light/dark)
- Color picker presets
- UI layout preferences (stored in localStorage per-user)

## Migration Status

✅ Database schema updated
✅ API routes created
✅ Seed script created
⏳ Need to run migration and seed
⏳ Need to start API server
⏳ Frontend will auto-detect and use API when available
