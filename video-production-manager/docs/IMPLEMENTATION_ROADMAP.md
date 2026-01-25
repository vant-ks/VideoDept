# Implementation Roadmap: Database Migration

## Overview

This roadmap outlines the transition from localStorage-based state management to a production-ready database with cloud + local sync capabilities.

## Phase 1: Backend API Server (Priority 1)

### 1.1 Project Setup
```bash
# Create backend directory
mkdir -p video-production-api
cd video-production-api

# Initialize Node.js project
npm init -y

# Install dependencies
npm install express cors helmet compression
npm install dotenv pg uuid
npm install @supabase/supabase-js
npm install express-validator

# Dev dependencies
npm install -D typescript @types/node @types/express
npm install -D tsx nodemon prisma
```

### 1.2 Database Choice: Supabase (Recommended)

**Why Supabase:**
- ✅ Hosted PostgreSQL (free tier available)
- ✅ Automatic REST API generation
- ✅ Real-time subscriptions built-in
- ✅ Built-in auth and row-level security
- ✅ Can self-host if needed later
- ✅ Excellent tooling and dashboard

**Setup:**
1. Create Supabase project at https://supabase.com
2. Get connection string and anon key
3. Use Supabase CLI or web interface for schema management

### 1.3 Alternative: Self-Hosted PostgreSQL

**For full control:**
```bash
# Using Docker
docker run --name video-prod-db \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=video_production \
  -p 5432:5432 \
  -v pgdata:/var/lib/postgresql/data \
  -d postgres:15
```

### 1.4 Database Schema Implementation

**Using Prisma (Recommended ORM):**

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Production {
  id           String   @id @default(uuid())
  client       String
  showName     String   @map("show_name")
  venue        String?
  room         String?
  loadIn       DateTime? @map("load_in")
  loadOut      DateTime? @map("load_out")
  showInfoUrl  String?  @map("show_info_url")
  status       ProductionStatus @default(PLANNING)
  
  // Relationships
  sources      Source[]
  sends        Send[]
  connections  Connection[]
  
  // Sync metadata
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")
  syncedAt         DateTime? @map("synced_at")
  lastModifiedBy   String? @map("last_modified_by")
  version          Int @default(1)
  isDeleted        Boolean @default(false) @map("is_deleted")
  
  @@map("productions")
}

enum ProductionStatus {
  PLANNING
  READY
  ACTIVE
  COMPLETED
  ARCHIVED
}

model EquipmentSpec {
  id               String   @id @default(uuid())
  category         EquipmentCategory
  manufacturer     String
  model            String
  ioArchitecture   IoArchitecture @map("io_architecture")
  cardSlots        Int? @map("card_slots")
  formatByIo       Boolean @default(true) @map("format_by_io")
  isSecondaryDevice Boolean @default(false) @map("is_secondary_device")
  deviceFormats    Json? @map("device_formats")
  specs            Json?
  
  // Relationships
  ioPorts          EquipmentIoPort[]
  cards            EquipmentCard[]
  
  // Sync metadata
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")
  syncedAt         DateTime? @map("synced_at")
  lastModifiedBy   String? @map("last_modified_by")
  version          Int @default(1)
  isDeleted        Boolean @default(false) @map("is_deleted")
  
  @@map("equipment_specs")
  @@index([category, isDeleted])
  @@index([isSecondaryDevice])
}

enum EquipmentCategory {
  CAMERA
  CCU
  SWITCHER
  ROUTER
  LED_PROCESSOR
  LED_TILE
  PROJECTOR
  RECORDER
  MONITOR
  CONVERTER
}

enum IoArchitecture {
  DIRECT
  CARD_BASED
}

model EquipmentIoPort {
  id           String   @id @default(uuid())
  equipmentId  String   @map("equipment_id")
  equipment    EquipmentSpec @relation(fields: [equipmentId], references: [id], onDelete: Cascade)
  portType     PortType @map("port_type")
  ioType       String   @map("io_type")
  label        String?
  format       String?
  portIndex    Int?     @map("port_index")
  
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
  version      Int @default(1)
  
  @@map("equipment_io_ports")
  @@index([equipmentId])
}

enum PortType {
  INPUT
  OUTPUT
}

model EquipmentCard {
  id           String   @id @default(uuid())
  equipmentId  String   @map("equipment_id")
  equipment    EquipmentSpec @relation(fields: [equipmentId], references: [id], onDelete: Cascade)
  slotNumber   Int      @map("slot_number")
  
  // Relationships
  ioPorts      EquipmentCardIo[]
  
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
  version      Int @default(1)
  
  @@unique([equipmentId, slotNumber])
  @@map("equipment_cards")
}

model EquipmentCardIo {
  id          String   @id @default(uuid())
  cardId      String   @map("card_id")
  card        EquipmentCard @relation(fields: [cardId], references: [id], onDelete: Cascade)
  portType    PortType @map("port_type")
  ioType      String   @map("io_type")
  label       String?
  format      String?
  portIndex   Int?     @map("port_index")
  
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  version     Int @default(1)
  
  @@map("equipment_card_io")
  @@index([cardId])
}

model Source {
  id              String   @id @default(uuid())
  productionId    String   @map("production_id")
  production      Production @relation(fields: [productionId], references: [id], onDelete: Cascade)
  type            String
  name            String
  hRes            Int?     @map("h_res")
  vRes            Int?     @map("v_res")
  rate            Float?
  standard        String?
  note            String?
  secondaryDevice String?  @map("secondary_device")
  blanking        String?
  
  // Relationships
  outputs         SourceOutput[]
  connections     Connection[]
  
  // Sync metadata
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")
  syncedAt         DateTime? @map("synced_at")
  lastModifiedBy   String? @map("last_modified_by")
  version          Int @default(1)
  isDeleted        Boolean @default(false) @map("is_deleted")
  
  @@map("sources")
  @@index([productionId, isDeleted])
  @@index([type])
}

model SourceOutput {
  id          String   @id @default(uuid())
  sourceId    String   @map("source_id")
  source      Source @relation(fields: [sourceId], references: [id], onDelete: Cascade)
  connector   String
  outputIndex Int      @default(1) @map("output_index")
  
  createdAt   DateTime @default(now()) @map("created_at")
  version     Int @default(1)
  
  @@map("source_outputs")
  @@index([sourceId])
}

model Send {
  id              String   @id @default(uuid())
  productionId    String   @map("production_id")
  production      Production @relation(fields: [productionId], references: [id], onDelete: Cascade)
  type            String
  name            String
  hRes            Int?     @map("h_res")
  vRes            Int?     @map("v_res")
  rate            Float?
  standard        String?
  note            String?
  secondaryDevice String?  @map("secondary_device")
  outputConnector String?  @map("output_connector")
  
  // Sync metadata
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")
  syncedAt         DateTime? @map("synced_at")
  lastModifiedBy   String? @map("last_modified_by")
  version          Int @default(1)
  isDeleted        Boolean @default(false) @map("is_deleted")
  
  @@map("sends")
  @@index([productionId, isDeleted])
  @@index([type])
}

model Connection {
  id                 String   @id @default(uuid())
  productionId       String   @map("production_id")
  production         Production @relation(fields: [productionId], references: [id], onDelete: Cascade)
  
  // Source
  sourceId           String?  @map("source_id")
  source             Source? @relation(fields: [sourceId], references: [id], onDelete: SetNull)
  sourceOutputId     String?  @map("source_output_id")
  
  // Intermediate
  intermediateType   String?  @map("intermediate_type")
  intermediateId     String?  @map("intermediate_id")
  intermediateInput  String?  @map("intermediate_input")
  intermediateOutput String?  @map("intermediate_output")
  
  // Destination
  destinationType    String   @map("destination_type")
  destinationId      String?  @map("destination_id")
  
  // Metadata
  signalPath         Json?    @map("signal_path")
  note               String?
  
  // Sync metadata
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")
  version            Int @default(1)
  isDeleted          Boolean @default(false) @map("is_deleted")
  
  @@map("connections")
  @@index([productionId])
  @@index([sourceId])
}

model SyncLog {
  id                String   @id @default(uuid())
  syncDirection     SyncDirection @map("sync_direction")
  startedAt         DateTime @default(now()) @map("started_at")
  completedAt       DateTime? @map("completed_at")
  status            SyncStatus
  recordsSynced     Int @default(0) @map("records_synced")
  conflictsDetected Int @default(0) @map("conflicts_detected")
  errors            Json?
  serverId          String?  @map("server_id")
  
  createdAt         DateTime @default(now()) @map("created_at")
  
  @@map("sync_log")
}

enum SyncDirection {
  UPLOAD
  DOWNLOAD
  BIDIRECTIONAL
}

enum SyncStatus {
  STARTED
  COMPLETED
  FAILED
  PARTIAL
}

model SyncConflict {
  id               String   @id @default(uuid())
  tableName        String   @map("table_name")
  recordId         String   @map("record_id")
  cloudVersion     Int?     @map("cloud_version")
  localVersion     Int?     @map("local_version")
  cloudData        Json?    @map("cloud_data")
  localData        Json?    @map("local_data")
  cloudUpdatedAt   DateTime? @map("cloud_updated_at")
  localUpdatedAt   DateTime? @map("local_updated_at")
  resolution       ConflictResolution @default(PENDING)
  resolvedAt       DateTime? @map("resolved_at")
  resolvedBy       String?  @map("resolved_by")
  
  createdAt        DateTime @default(now()) @map("created_at")
  
  @@map("sync_conflicts")
}

enum ConflictResolution {
  PENDING
  CLOUD_WINS
  LOCAL_WINS
  MANUAL
}
```

### 1.5 API Server Structure

```typescript
// src/server.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
import productionsRouter from './routes/productions';
import equipmentRouter from './routes/equipment';
import sourcesRouter from './routes/sources';
import sendsRouter from './routes/sends';

app.use('/api/productions', productionsRouter);
app.use('/api/equipment', equipmentRouter);
app.use('/api/sources', sourcesRouter);
app.use('/api/sends', sendsRouter);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
```

## Phase 2: Frontend API Client

### 2.1 Create API Client Service

```typescript
// src/services/api/client.ts
import axios, { AxiosInstance } from 'axios';

class ApiClient {
  private client: AxiosInstance;
  
  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Request interceptor for auth
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
    
    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle auth error
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }
  
  // Generic CRUD methods
  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.client.get(url, { params });
    return response.data;
  }
  
  async post<T>(url: string, data: any): Promise<T> {
    const response = await this.client.post(url, data);
    return response.data;
  }
  
  async put<T>(url: string, data: any): Promise<T> {
    const response = await this.client.put(url, data);
    return response.data;
  }
  
  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete(url);
    return response.data;
  }
}

// Auto-detect API endpoint
const getApiBaseUrl = (): string => {
  // Check for LAN server
  const lanServer = localStorage.getItem('lan_server_url');
  if (lanServer) return lanServer;
  
  // Check environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Default to cloud
  return 'https://api.yourdomain.com';
};

export const apiClient = new ApiClient(getApiBaseUrl());
```

### 2.2 Replace Zustand Store with API-backed Store

```typescript
// src/hooks/useStore.ts - New version with API
import { create } from 'zustand';
import { apiClient } from '@/services/api/client';
import type { Production, Source, Send, EquipmentSpec } from '@/types';

interface ProductionStore {
  // Data
  production: Production | null;
  sources: Source[];
  sends: Send[];
  equipmentSpecs: EquipmentSpec[];
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchProduction: (id: string) => Promise<void>;
  fetchSources: (productionId: string) => Promise<void>;
  fetchSends: (productionId: string) => Promise<void>;
  fetchEquipment: () => Promise<void>;
  
  addSource: (source: Omit<Source, 'id'>) => Promise<Source>;
  updateSource: (id: string, updates: Partial<Source>) => Promise<void>;
  deleteSource: (id: string) => Promise<void>;
  
  addEquipmentSpec: (spec: Omit<EquipmentSpec, 'id'>) => Promise<EquipmentSpec>;
  updateEquipmentSpec: (id: string, updates: Partial<EquipmentSpec>) => Promise<void>;
  
  // ... more actions
}

export const useProductionStore = create<ProductionStore>((set, get) => ({
  production: null,
  sources: [],
  sends: [],
  equipmentSpecs: [],
  isLoading: false,
  error: null,
  
  fetchProduction: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const production = await apiClient.get<Production>(`/api/productions/${id}`);
      set({ production, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  fetchSources: async (productionId: string) => {
    set({ isLoading: true, error: null });
    try {
      const sources = await apiClient.get<Source[]>(`/api/productions/${productionId}/sources`);
      set({ sources, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  addSource: async (sourceData: Omit<Source, 'id'>) => {
    const production = get().production;
    if (!production) throw new Error('No active production');
    
    try {
      const newSource = await apiClient.post<Source>(
        `/api/productions/${production.id}/sources`,
        sourceData
      );
      set((state) => ({ sources: [...state.sources, newSource] }));
      return newSource;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  updateSource: async (id: string, updates: Partial<Source>) => {
    try {
      await apiClient.put(`/api/sources/${id}`, updates);
      set((state) => ({
        sources: state.sources.map((s) => 
          s.id === id ? { ...s, ...updates } : s
        ),
      }));
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  deleteSource: async (id: string) => {
    try {
      await apiClient.delete(`/api/sources/${id}`);
      set((state) => ({
        sources: state.sources.filter((s) => s.id !== id),
      }));
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  fetchEquipment: async () => {
    set({ isLoading: true, error: null });
    try {
      const equipment = await apiClient.get<EquipmentSpec[]>('/api/equipment');
      set({ equipmentSpecs: equipment, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  addEquipmentSpec: async (specData: Omit<EquipmentSpec, 'id'>) => {
    try {
      const newSpec = await apiClient.post<EquipmentSpec>('/api/equipment', specData);
      set((state) => ({ equipmentSpecs: [...state.equipmentSpecs, newSpec] }));
      return newSpec;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  updateEquipmentSpec: async (id: string, updates: Partial<EquipmentSpec>) => {
    try {
      await apiClient.put(`/api/equipment/${id}`, updates);
      set((state) => ({
        equipmentSpecs: state.equipmentSpecs.map((spec) =>
          spec.id === id ? { ...spec, ...updates } : spec
        ),
      }));
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
}));
```

## Phase 3: Sync Service

### 3.1 Sync Manager

```typescript
// src/services/sync/SyncManager.ts
export class SyncManager {
  private syncInterval: NodeJS.Timer | null = null;
  private isOnline: boolean = navigator.onLine;
  
  constructor(
    private cloudUrl: string,
    private localUrl: string
  ) {
    this.setupNetworkMonitoring();
  }
  
  private setupNetworkMonitoring() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.triggerSync();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }
  
  startAutoSync(intervalMs: number = 60000) {
    this.syncInterval = setInterval(() => {
      if (this.isOnline) {
        this.triggerSync();
      }
    }, intervalMs);
  }
  
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
  
  async triggerSync(): Promise<SyncResult> {
    // Implementation
  }
}
```

## Phase 4: Migration & Deployment

### 4.1 Data Migration Script

```typescript
// scripts/migrate-to-db.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateFromLocalStorage() {
  // Read from localStorage
  const storedData = localStorage.getItem('production-store');
  if (!storedData) return;
  
  const data = JSON.parse(storedData);
  
  // Migrate productions
  // Migrate sources
  // Migrate sends
  // etc.
}
```

### 4.2 LAN Server Packaging

Package the API server for easy deployment:
- Docker container
- Electron app wrapper
- Simple executable with embedded database

## Timeline

- **Week 1-2:** Backend API + Database setup
- **Week 3:** Frontend API integration
- **Week 4:** Sync service
- **Week 5:** Testing & deployment
- **Week 6:** Documentation & training

## Next Immediate Steps

Would you like me to:
1. **Start building the backend API server now?**
2. **Set up Supabase project and schema?**
3. **Create the API client for the frontend?**
4. **Build a proof-of-concept sync service?**

Let me know which part you'd like to tackle first!
