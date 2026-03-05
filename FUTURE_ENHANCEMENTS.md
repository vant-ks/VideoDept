# Future Enhancements & Optional Features

**Status:** Ideas and features for future development  
**Last Updated:** February 21, 2026  

These items are not critical for current Phase 5 completion but represent valuable enhancements for future releases.

---

## 🎨 Phase 4.4: Field Edit Indicators (Google Sheets Style)

**Description:** Real-time visual indication of who's editing which fields

**Features:**
- [ ] Real-time field locking/indication
- [ ] Show who's editing which field
- [ ] Colored borders around active fields (per user)
- [ ] User avatars next to fields being edited
- [ ] Cursor position/selection sync across browsers

**Considerations:**
- Performance impact with many concurrent editors
- WebSocket message frequency for cursor movements
- UI/UX for field ownership indicators

---

## 🔄 Advanced Sync Features

### Offline Queue
- [ ] Save changes locally when offline
- [ ] Queue operations in IndexedDB
- [ ] Auto-sync when connection restored
- [ ] Conflict resolution for queued changes
- [ ] Visual indicator of pending sync count

### Undo/Redo with Sync
- [ ] Undo/redo stack per entity
- [ ] Sync undo/redo actions across browsers
- [ ] Visual timeline of changes
- [ ] Rollback to specific version

### Conflict Resolution UI
- [ ] Manual merge interface for complex conflicts
- [ ] Side-by-side diff view
- [ ] Field-by-field resolution
- [ ] Accept theirs/mine/merge options

---

## 📊 Activity & Audit Features

### Activity Feed
- [ ] Real-time activity log showing all changes
- [ ] Filter by entity type, user, time range
- [ ] Search through change history
- [ ] Export activity log to CSV

### User Audit Trails
- [ ] Complete user action history
- [ ] Track who changed what and when
- [ ] Compliance/accountability features
- [ ] Admin dashboard for audit review

### Export/Import
- [ ] Export production data to JSON
- [ ] Import pre-configured templates
- [ ] Sync state snapshots
- [ ] Backup/restore functionality

---

## 🔧 Technical Enhancements

### WebSocket Scalability
- [ ] Review Socket.io concurrent connections limit
- [ ] Load testing with many users (50+)
- [ ] Performance benchmarking
- [ ] Connection pooling strategies

### Redis Adapter for Socket.io
- [ ] Multi-server deployment support
- [ ] Horizontal scaling across instances
- [ ] Session persistence
- [ ] Pub/sub for cross-server events

### Service Workers
- [ ] Offline support with service workers
- [ ] Background sync capability
- [ ] Cache strategies for assets
- [ ] Push notifications for updates

---

## 🚀 Feature Enhancements

### Production Checklist Phases

**Current Priority:** Lower (after testing complete)  
**Switch Time:** 12:01 AM CT on load-in day

**Implementation:**
- Automatic switch from pre-production to production checklist
- Time-based trigger (12:01 AM CT on load-in day)
- Pre-production checklist becomes read-only archive
- Production checklist covers: setup, testing, rehearsal, show day, strike
- Summary view of pre-production completion status

**Technical Requirements:**
- Time zone handling (Central Time)
- Checklist versioning/archiving
- New category set for production phase
- Modal viewer for archived pre-production checklist

---

## 📱 Mobile & Responsive

- [ ] Touch-optimized interactions
- [ ] Mobile-specific layouts
- [ ] Gesture support (swipe, pinch-zoom)
- [ ] Offline mode for mobile
- [ ] Native mobile app considerations

---

## 🔐 Security & Permissions

- [ ] Role-based access control
- [ ] Read-only viewers
- [ ] Edit permissions per entity type
- [ ] Production ownership/admin
- [ ] Secure sharing links

---

## 🎯 User Experience

- [ ] Onboarding tutorial
- [ ] Keyboard shortcuts
- [ ] Bulk operations (multi-select)
- [ ] Quick filters and saved views
- [ ] Dark mode enhancements

---

## 💾 Data Management

- [ ] Automated backups
- [ ] Point-in-time recovery
- [ ] Data retention policies
- [ ] Archive old productions
- [ ] Production templates library

---

**Note:** Review and prioritize these items after Phase 5 (multi-browser sync testing) is complete.

---

## 📷 Camera / CCU Relationships

### One Camera per CCU (and vice versa)
- [ ] Enforce 1:1 camera↔CCU relationship at DB and API level
- [ ] Prevent assigning a camera already linked to another CCU
- [ ] UI validation feedback when constraint is violated

### Camera / CCU Compatibility Data + Validation
- [ ] Define compatibility matrix (CCU model → supported camera models)
- [ ] Store compatibility rules in equipment specs or a dedicated table
- [ ] Warn or block incompatible camera↔CCU pairings on assignment
- [ ] Display compatibility status on CCU card / camera card

### Camera Lenses & FOV Tool Import
- [ ] Lens data model (focal length, mount, max aperture, etc.)
- [ ] Associate lenses with cameras (camera loadout)
- [ ] FOV calculator tool based on sensor size + focal length
- [ ] Import lens data from CSV or external spec source
