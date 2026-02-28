# Architecture Documentation Index

**Last Updated:** February 28, 2026

Quick reference guide to VideoDept's architectural decisions and standards.

---

## 🏗️ Core Architecture

### [DATABASE_FIRST_ARCHITECTURE.md](architecture-decisions/DATABASE_FIRST_ARCHITECTURE.md)
**Status:** ACTIVE | **Date:** February 2026

Railway PostgreSQL is the primary data store. All clients connect to centralized database. Local IndexedDB is cache only.

**Key Principles:**
- Railway database is single source of truth
- Write operations require internet connection
- Foundation for team collaboration and access control

---

### [RELATIONSHIP_ARCHITECTURE.md](architecture-decisions/RELATIONSHIP_ARCHITECTURE.md)
**Status:** ACTIVE | **Date:** February 28, 2026

**The Dual Storage Pattern** for cross-entity references.

**Key Decision:** Store BOTH UUID (for database integrity) and user-friendly ID (for display/performance)

```prisma
model connections {
  source_uuid  String?  // FK for database relationships
  source_id    String?  // "SRC 1" for UI display
}
```

**Why:** Stable relationships (UUID) + fast display without joins (ID)

**Critical for:** Signal flow, device connections, cable paths

---

## 📊 Data Flow Standards

### [ENTITY_DATA_FLOW_STANDARD.md](ENTITY_DATA_FLOW_STANDARD.md)
**Status:** ENFORCEMENT REQUIRED | **Date:** February 21, 2026

Complete protocol for entity data flow from database → API → frontend → WebSocket.

**Sections:**
1. Database Layer (PostgreSQL + Prisma)
2. API Layer (Express routes + field converters)
3. Frontend Layer (React + Zustand)
4. WebSocket Layer (Real-time sync)
5. UUID vs ID Management (critical patterns)
6. **NEW:** Relationship Architecture (cross-entity references)

**When to Reference:** Creating new entities, WebSocket sync issues, UUID/ID confusion

---

### [DATA_FLOW_ANALYSIS.md](architecture-decisions/DATA_FLOW_ANALYSIS.md)
**Status:** REFERENCE | **Date:** February 2026

Detailed analysis of data flow patterns and anti-patterns discovered during development.

---

## 🎯 Entity Design

### [ENTITY_ARCHITECTURE.md](architecture-decisions/ENTITY_ARCHITECTURE.md)
**Status:** ACTIVE | **Date:** February 2026

BaseEntity pattern and entity categories:
- **Sources:** Computers, Media Servers, CCUs, Cameras
- **Sends:** LED walls, Projectors, Monitors
- **Signal Flow:** Routers, Switchers, Vision mixers

**Key Pattern:** All entities extend BaseEntity with id, name, category, categoryMember

---

### [FORMAT_ASSIGNMENT_ARCHITECTURE.md](architecture-decisions/FORMAT_ASSIGNMENT_ARCHITECTURE.md)
**Status:** ACTIVE | **Date:** February 2026

How signal formats (resolution, frame rate, blanking) are assigned and propagated.

**Modes:**
- System-wide: All outputs inherit from Sources category settings
- Per-output: Individual output format overrides

---

## 🔄 Concurrent Editing

### [CONCURRENT_EDITING_ANALYSIS.md](architecture-decisions/CONCURRENT_EDITING_ANALYSIS.md)
**Status:** ACTIVE | **Date:** February 2026

Strategies for handling simultaneous edits by multiple users.

**Patterns:**
- Optimistic locking with version numbers
- WebSocket-based conflict detection
- Last-write-wins with user notification

---

## 📝 Development Practices

### [DB_DEVELOPMENT_LESSONS.md](DB_DEVELOPMENT_LESSONS.md)
**Date:** January 30, 2026 (Updated February 27, 2026)

**Critical Lessons:**
- Use `prisma db push` for local development
- Save migrations for production deployments
- Pre-migration safety checks
- Zombie process prevention
- **NEW:** No-optimistic-update pattern for WebSocket-synced entities
- **NEW:** Prop passing over recalculation pattern
- **NEW:** WebSocket + user interaction lock pattern
- **NEW:** HTML5 Drag API best practices

---

## 🚀 Quick Start for New Features

### Adding a New Entity Type

1. **Database:** Add model to schema.prisma
   - Include: `uuid` (PK), `id` (display), `production_id` (FK)
   - Follow naming: snake_case in DB
   
2. **API:** Generate routes using pattern from ENTITY_DATA_FLOW_STANDARD.md
   - Use caseConverters for snake_case ↔ camelCase
   - Include WebSocket broadcasts
   
3. **Frontend:** Create page + service
   - Use `uuid` for mutations
   - Display `id` to users
   - Subscribe to WebSocket events

### Adding an Entity Relationship

1. **Database:** Add BOTH fields
   ```prisma
   xxx_uuid    String?  // FK relationship
   xxx_id      String?  // Display value
   
   @relation(fields: [xxx_uuid], references: [uuid])
   @@index([xxx_uuid])
   ```

2. **API:** Update propagation
   - Wrap in transaction
   - Update `xxx_id` in all referencing tables when source entity's `id` changes

3. **Frontend:** Display optimization
   - Use stored `xxx_id` for display (no joins)
   - Use `xxx_uuid` for mutations

See: [RELATIONSHIP_ARCHITECTURE.md](architecture-decisions/RELATIONSHIP_ARCHITECTURE.md)

---

## 📚 Additional Resources

### Development Logs
- [DEVLOG.md](../video-production-manager/DEVLOG.md) - Session-by-session development history
- [CRASH_AUDIT_2026-01-30.md](CRASH_AUDIT_2026-01-30.md) - VS Code crash investigation

### Deployment
- [RAILWAY_DEPLOYMENT.md](../RAILWAY_DEPLOYMENT.md) - Production deployment guide
- [RAILWAY_SETUP_CHECKLIST.md](../RAILWAY_SETUP_CHECKLIST.md) - Initial setup steps

### Project Management
- [FUTURE_ENHANCEMENTS.md](../FUTURE_ENHANCEMENTS.md) - Planned features
- [TODO_NEXT_SESSION.md](../TODO_NEXT_SESSION.md) - Current work queue

---

## 🎯 Architecture Principles Summary

### Data Architecture
1. **Database First:** Railway is primary, IndexedDB is cache
2. **UUID for Integrity:** All entities use UUID as primary key
3. **ID for Display:** User-friendly IDs for communication
4. **Dual Storage:** Cross-entity refs store both UUID and ID

### Code Patterns
5. **No Optimistic Updates:** Refetch after mutations (WebSocket-synced entities)
6. **Prop Passing:** Calculate once, pass as prop (avoid recalculation)
7. **Transaction Wrapping:** Multi-table updates in single transaction
8. **WebSocket Locks:** Prevent external updates during user interactions

### Development Workflow
9. **Local Dev:** `prisma db push` (fast iteration)
10. **Production:** `prisma migrate deploy` (tracked migrations)
11. **Pre-flight Checks:** Kill zombies, validate schema, check memory
12. **Error Prevention:** Follow checklists, use validation scripts

---

## 📖 How to Use This Index

**Starting a new feature?**
1. Find the relevant architecture doc above
2. Follow the patterns exactly
3. Reference ENTITY_DATA_FLOW_STANDARD.md for detailed steps

**Debugging an issue?**
1. Check DEVLOG.md for similar past issues
2. Verify against architecture patterns
3. Run validation scripts

**Adding relationships?**
1. Start with RELATIONSHIP_ARCHITECTURE.md
2. Use dual storage pattern
3. Test ID propagation

---

**Maintained by:** Development Team  
**Last Review:** February 28, 2026  
**Next Review:** When adding signal flow features
