# Database Architecture: Hybrid Cloud + Local Sync

## Overview

This application uses a hybrid database architecture designed for video production workflows:

- **Cloud-primary** for planning and collaboration in the office
- **Local-first** for reliable on-site operations at venues
- **Automatic sync** when internet connectivity allows

## Architecture Components

### 1. Cloud Database (Production Planning)

**Technology:** PostgreSQL via Supabase  
**Location:** Cloud-hosted (AWS/GCP)  
**Purpose:** Primary source of truth for show planning

**Features:**
- Real-time collaboration between team members
- Historical data and analytics
- Cross-show resource tracking
- Backup and disaster recovery

### 2. On-Site LAN Server

**Technology:** PostgreSQL or SQLite  
**Hardware:** Laptop, Mini PC, or Raspberry Pi  
**Purpose:** Local database replica for venue deployment

**Features:**
- Full database replica
- Serves API to local clients
- Queue-based sync service
- Works completely offline
- Automatic sync when online

### 3. Client Applications

**Technology:** React SPA (this app)  
**Connectivity:** Connects to LAN Server on-site, Cloud DB in office  
**Purpose:** User interface for all roles

## Data Flow

### Planning Phase (Office/Remote)
```
User Device → Cloud DB (Supabase)
           ← Real-time updates
```

### Pre-Show Setup
```
Cloud DB → Sync Service → LAN Server DB
```
Downloads complete production data to local server

### On-Site Operations (Venue)
```
User Devices → LAN Server → Local DB
                         ↓
                   Sync Queue (buffered changes)
```
All operations happen locally - no internet required

### Post-Show / Internet Available
```
LAN Server → Sync Service → Cloud DB
          ← Conflict resolution
          → Updated records
```
Bidirectional sync with conflict resolution

## Database Schema Design

### Core Tables

#### productions
Primary table for show/event information
```sql
CREATE TABLE productions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client TEXT NOT NULL,
  show_name TEXT NOT NULL,
  venue TEXT,
  room TEXT,
  load_in TIMESTAMPTZ,
  load_out TIMESTAMPTZ,
  show_info_url TEXT,
  status TEXT CHECK (status IN ('planning', 'ready', 'active', 'completed', 'archived')),
  
  -- Sync metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  last_modified_by UUID,
  version INTEGER DEFAULT 1,
  is_deleted BOOLEAN DEFAULT FALSE
);
```

#### equipment_specs
Equipment library (shared across productions)
```sql
CREATE TABLE equipment_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  model TEXT NOT NULL,
  io_architecture TEXT CHECK (io_architecture IN ('direct', 'card-based')),
  card_slots INTEGER,
  format_by_io BOOLEAN DEFAULT TRUE,
  is_secondary_device BOOLEAN DEFAULT FALSE,
  device_formats JSONB,
  specs JSONB,
  
  -- Sync metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  last_modified_by UUID,
  version INTEGER DEFAULT 1,
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_equipment_category ON equipment_specs(category) WHERE is_deleted = FALSE;
CREATE INDEX idx_equipment_secondary ON equipment_specs(is_secondary_device) WHERE is_deleted = FALSE;
```

#### equipment_io_ports
I/O configuration for direct architecture equipment
```sql
CREATE TABLE equipment_io_ports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment_specs(id) ON DELETE CASCADE,
  port_type TEXT CHECK (port_type IN ('input', 'output')),
  io_type TEXT NOT NULL,
  label TEXT,
  format TEXT,
  port_index INTEGER,
  
  -- Sync metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER DEFAULT 1
);

CREATE INDEX idx_io_ports_equipment ON equipment_io_ports(equipment_id);
```

#### equipment_cards
Card-based equipment slots
```sql
CREATE TABLE equipment_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment_specs(id) ON DELETE CASCADE,
  slot_number INTEGER NOT NULL,
  
  -- Sync metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  
  UNIQUE(equipment_id, slot_number)
);
```

#### equipment_card_io
I/O ports on cards
```sql
CREATE TABLE equipment_card_io (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES equipment_cards(id) ON DELETE CASCADE,
  port_type TEXT CHECK (port_type IN ('input', 'output')),
  io_type TEXT NOT NULL,
  label TEXT,
  format TEXT,
  port_index INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER DEFAULT 1
);

CREATE INDEX idx_card_io_card ON equipment_card_io(card_id);
```

#### sources
Video sources for a production
```sql
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id UUID NOT NULL REFERENCES productions(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  h_res INTEGER,
  v_res INTEGER,
  rate REAL,
  standard TEXT,
  note TEXT,
  secondary_device TEXT,
  blanking TEXT CHECK (blanking IN ('none', 'RBv1', 'RBv2', 'RBv3')),
  
  -- Sync metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  last_modified_by UUID,
  version INTEGER DEFAULT 1,
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_sources_production ON sources(production_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_sources_type ON sources(type) WHERE is_deleted = FALSE;
```

#### source_outputs
Output connectors for sources
```sql
CREATE TABLE source_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  connector TEXT NOT NULL,
  output_index INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER DEFAULT 1
);

CREATE INDEX idx_source_outputs_source ON source_outputs(source_id);
```

#### sends
Destination/output feeds for a production
```sql
CREATE TABLE sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id UUID NOT NULL REFERENCES productions(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  h_res INTEGER,
  v_res INTEGER,
  rate REAL,
  standard TEXT,
  note TEXT,
  secondary_device TEXT,
  output_connector TEXT,
  
  -- Sync metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  last_modified_by UUID,
  version INTEGER DEFAULT 1,
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_sends_production ON sends(production_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_sends_type ON sends(type) WHERE is_deleted = FALSE;
```

#### connections
Signal routing and connections
```sql
CREATE TABLE connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id UUID NOT NULL REFERENCES productions(id) ON DELETE CASCADE,
  
  -- Source
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  source_output_id UUID REFERENCES source_outputs(id) ON DELETE SET NULL,
  
  -- Intermediate (router/switcher)
  intermediate_type TEXT, -- 'router', 'switcher', 'processor'
  intermediate_id UUID,
  intermediate_input TEXT,
  intermediate_output TEXT,
  
  -- Destination
  destination_type TEXT CHECK (destination_type IN ('send', 'switcher', 'router', 'processor', 'recorder')),
  destination_id UUID,
  
  -- Connection metadata
  signal_path JSONB, -- Full path for complex routing
  note TEXT,
  
  -- Sync metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_connections_production ON connections(production_id);
CREATE INDEX idx_connections_source ON connections(source_id);
```

### Sync Control Tables

#### sync_log
Track all sync operations
```sql
CREATE TABLE sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_direction TEXT CHECK (sync_direction IN ('upload', 'download', 'bidirectional')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('started', 'completed', 'failed', 'partial')),
  records_synced INTEGER DEFAULT 0,
  conflicts_detected INTEGER DEFAULT 0,
  errors JSONB,
  server_id TEXT, -- Identifies which LAN server
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### sync_conflicts
Log conflicts that need resolution
```sql
CREATE TABLE sync_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  cloud_version INTEGER,
  local_version INTEGER,
  cloud_data JSONB,
  local_data JSONB,
  cloud_updated_at TIMESTAMPTZ,
  local_updated_at TIMESTAMPTZ,
  resolution TEXT CHECK (resolution IN ('pending', 'cloud_wins', 'local_wins', 'manual')),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Sync Strategy

### Conflict Resolution Rules

1. **Last Write Wins (LWW)** - Default for most edits
   - Compare `updated_at` timestamps
   - Later timestamp wins
   - Losing version logged in sync_conflicts

2. **Version Vectors** - For critical data
   - Each record has version number
   - Increments on every update
   - Both versions preserved on conflict

3. **Tombstone Deletes** - Soft deletes for sync
   - `is_deleted = TRUE` instead of hard delete
   - Syncs delete operations
   - Periodic cleanup of old tombstones

4. **Production-Level Locking** - Optional
   - Mark production as "locked" on-site
   - Prevents cloud edits during show
   - Full sync after show completion

### Sync Process

#### Pre-Show Download
```sql
-- Download all production data
SELECT * FROM productions WHERE id = $production_id;
SELECT * FROM sources WHERE production_id = $production_id;
SELECT * FROM sends WHERE production_id = $production_id;
-- ... all related tables

-- Download shared resources
SELECT * FROM equipment_specs WHERE updated_at > $last_sync;
```

#### On-Site Operations
- All CRUD operations write to local DB
- Changes queued for sync
- No blocking on network operations

#### Periodic Sync (when online)
```javascript
// Pseudo-code
async function syncToCloud() {
  const changes = await getLocalChanges(lastSyncTimestamp);
  
  for (const change of changes) {
    try {
      const cloudRecord = await fetchFromCloud(change.table, change.id);
      
      if (!cloudRecord) {
        // New record - upload
        await uploadToCloud(change);
      } else if (cloudRecord.updated_at > change.updated_at) {
        // Conflict - cloud is newer
        await logConflict(change, cloudRecord);
        await resolveConflict(change, cloudRecord); // Based on rules
      } else {
        // Local is newer - upload
        await uploadToCloud(change);
      }
    } catch (error) {
      await logSyncError(change, error);
    }
  }
}
```

## API Design

### REST Endpoints

All endpoints work identically against cloud or LAN server:

```
# Productions
GET    /api/productions
GET    /api/productions/:id
POST   /api/productions
PUT    /api/productions/:id
DELETE /api/productions/:id

# Equipment
GET    /api/equipment
GET    /api/equipment/:id
POST   /api/equipment
PUT    /api/equipment/:id
DELETE /api/equipment/:id

# Sources
GET    /api/productions/:id/sources
GET    /api/sources/:id
POST   /api/productions/:id/sources
PUT    /api/sources/:id
DELETE /api/sources/:id

# Sends
GET    /api/productions/:id/sends
GET    /api/sends/:id
POST   /api/productions/:id/sends
PUT    /api/sends/:id
DELETE /api/sends/:id

# Connections
GET    /api/productions/:id/connections
POST   /api/connections
PUT    /api/connections/:id
DELETE /api/connections/:id

# Sync
POST   /api/sync/production/:id/download
POST   /api/sync/production/:id/upload
GET    /api/sync/status
GET    /api/sync/conflicts
POST   /api/sync/conflicts/:id/resolve
```

## Deployment Models

### Office/Planning Mode
```
React App → https://api.yourcompany.com → Cloud PostgreSQL (Supabase)
```

### On-Site Mode
```
React App → http://192.168.1.100:3001 → LAN Server → Local PostgreSQL
                                              ↓
                                    (background sync to cloud)
```

### Client Configuration
```javascript
// Auto-detect environment
const API_BASE_URL = process.env.VITE_API_URL || 
  (window.location.hostname === 'localhost' 
    ? 'http://localhost:3001'
    : detectLANServer() || 'https://api.yourcompany.com'
  );
```

## Implementation Plan

### Phase 1: Backend API (Week 1-2)
- [ ] Create Express/Fastify API server
- [ ] Implement PostgreSQL schema
- [ ] Build REST endpoints
- [ ] Add authentication (JWT)
- [ ] Database migrations

### Phase 2: Frontend Integration (Week 2-3)
- [ ] Replace Zustand localStorage with API client
- [ ] Add loading states and error handling
- [ ] Implement optimistic updates
- [ ] Add offline queue

### Phase 3: Sync Service (Week 3-4)
- [ ] Build sync engine
- [ ] Implement conflict resolution
- [ ] Add sync UI indicators
- [ ] Testing with network interruptions

### Phase 4: LAN Server Package (Week 4-5)
- [ ] Package server for easy deployment
- [ ] Docker container
- [ ] Electron wrapper (optional)
- [ ] Auto-discovery on network
- [ ] Setup wizard

### Phase 5: Testing & Documentation (Week 5-6)
- [ ] End-to-end testing
- [ ] Load testing
- [ ] User documentation
- [ ] Deployment guide

## Migration Strategy

### Step 1: Export Current Data
```javascript
// Export all localStorage data to JSON
const exportData = {
  productions: localStorage.getItem('production-store'),
  // ... all data
};
```

### Step 2: Import to Database
```javascript
// Import script to populate PostgreSQL
await importProductions(exportData.productions);
await importSources(exportData.sources);
// ...
```

### Step 3: Gradual Cutover
- Run old and new systems in parallel
- Validate data consistency
- Switch over when confident

## Monitoring & Maintenance

### Health Checks
- Database connection status
- Sync queue length
- Last successful sync timestamp
- Conflict count

### Backup Strategy
- Cloud: Automated daily backups via Supabase
- LAN Server: Pre-show snapshot, incremental during show
- Export to JSON for long-term archival

### Security
- TLS/SSL for all API calls
- JWT tokens for authentication
- Row-level security in PostgreSQL
- LAN server: Optional password protection
- Cloud: OAuth2 for team access

## Next Steps

1. **Choose database provider** (Supabase vs self-hosted PostgreSQL)
2. **Design initial schema** (refine tables based on all features)
3. **Build API server** (Node.js + Express/Fastify)
4. **Create migration path** (localStorage → PostgreSQL)
5. **Implement sync service** (basic version first)

---

**Questions to finalize:**
1. Supabase (managed) vs self-hosted PostgreSQL?
2. Authentication: Single user or multi-user with roles?
3. LAN server hardware: What will you use on-site?
4. Do you need mobile apps (iOS/Android) or web-only?
