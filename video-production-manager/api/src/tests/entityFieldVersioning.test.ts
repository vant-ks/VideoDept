/**
 * Tests for Entity Field-Level Versioning
 * 
 * Verifies that the 'id' field (user-defined label) does not cause conflicts
 * when edited concurrently with other fields, since UUID is the real primary key.
 */

import {
  initFieldVersionsForEntity,
  compareFieldVersionsForEntity,
  mergeNonConflictingFieldsForEntity,
  CAMERA_VERSIONED_FIELDS,
  CCU_VERSIONED_FIELDS,
  SOURCE_VERSIONED_FIELDS,
  SEND_VERSIONED_FIELDS,
  FieldVersions,
} from '../utils/fieldVersioning';

describe('Entity Field Versioning - Camera', () => {
  describe('ID field exclusion from conflicts', () => {
    it('should allow concurrent ID rename and other field edit without conflict', () => {
      // Setup: Both clients have same initial state
      const baseFieldVersions: FieldVersions = {
        id: { version: 1, updated_at: '2026-02-10T10:00:00.000Z' },
        name: { version: 1, updated_at: '2026-02-10T10:00:00.000Z' },
        note: { version: 1, updated_at: '2026-02-10T10:00:00.000Z' },
      };
      
      // Client A: Changes ID from "CAM 1" to "CAM 2"
      const clientAVersions: FieldVersions = {
        id: { version: 2, updated_at: '2026-02-10T10:01:00.000Z' },
        name: { version: 1, updated_at: '2026-02-10T10:00:00.000Z' },
        note: { version: 1, updated_at: '2026-02-10T10:00:00.000Z' },
      };
      const clientAData = { id: 'CAM 2', name: 'Camera One', note: 'Original note' };
      
      // Client B: Edits note field
      const clientBVersions: FieldVersions = {
        id: { version: 1, updated_at: '2026-02-10T10:00:00.000Z' },
        name: { version: 1, updated_at: '2026-02-10T10:00:00.000Z' },
        note: { version: 2, updated_at: '2026-02-10T10:01:00.000Z' },
      };
      const clientBData = { id: 'CAM 1', name: 'Camera One', note: 'Updated note' };
      
      // Server state after Client A updates
      const serverData = { id: 'CAM 2', name: 'Camera One', note: 'Original note' };
      const serverVersions = clientAVersions;
      
      // Client B tries to save - should detect NO conflict because 'id' is not in CAMERA_VERSIONED_FIELDS
      const conflicts = compareFieldVersionsForEntity(
        clientBVersions,
        serverVersions,
        clientBData,
        serverData,
        CAMERA_VERSIONED_FIELDS
      );
      
      // 'id' is not in CAMERA_VERSIONED_FIELDS, so no conflict on id change
      expect(conflicts).toHaveLength(0);
      
      // Merge should succeed
      const mergeResult = mergeNonConflictingFieldsForEntity(
        clientBVersions,
        serverVersions,
        clientBData,
        serverData,
        CAMERA_VERSIONED_FIELDS
      );
      
      expect(mergeResult.hasConflicts).toBe(false);
      expect(mergeResult.mergedData.note).toBe('Updated note'); // Client B's change applied
      // 'id' is not a versioned field, so it's applied directly from client data
      expect(mergeResult.mergedData.id).toBe('CAM 1'); // Client B's ID (non-versioned fields take client value)
    });
    
    it('should detect conflict when same versioned field edited by both clients', () => {
      const clientVersions: FieldVersions = {
        name: { version: 1, updated_at: '2026-02-10T10:00:00.000Z' },
      };
      
      const serverVersions: FieldVersions = {
        name: { version: 2, updated_at: '2026-02-10T10:01:00.000Z' }, // Server ahead
      };
      
      const clientData = { name: 'Camera Alpha' };
      const serverData = { name: 'Camera One' };
      
      const conflicts = compareFieldVersionsForEntity(
        clientVersions,
        serverVersions,
        clientData,
        serverData,
        CAMERA_VERSIONED_FIELDS
      );
      
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].fieldName).toBe('name');
      expect(conflicts[0].clientVersion).toBe(1);
      expect(conflicts[0].serverVersion).toBe(2);
    });
    
    it('should not version non-listed fields (id field)', () => {
      // Verify 'id' is NOT in CAMERA_VERSIONED_FIELDS
      expect(CAMERA_VERSIONED_FIELDS.includes('id' as any)).toBe(false);
      
      // When comparing versions, id changes should be ignored
      const clientVersions: FieldVersions = {
        id: { version: 1, updated_at: '2026-02-10T10:00:00.000Z' },
        name: { version: 1, updated_at: '2026-02-10T10:00:00.000Z' },
      };
      
      const serverVersions: FieldVersions = {
        id: { version: 5, updated_at: '2026-02-10T10:05:00.000Z' }, // Much newer
        name: { version: 1, updated_at: '2026-02-10T10:00:00.000Z' },
      };
      
      const clientData = { id: 'CAM 99', name: 'Test Camera' };
      const serverData = { id: 'CAM 1', name: 'Test Camera' };
      
      // Should have NO conflicts because 'id' is not versioned
      const conflicts = compareFieldVersionsForEntity(
        clientVersions,
        serverVersions,
        clientData,
        serverData,
        CAMERA_VERSIONED_FIELDS
      );
      
      expect(conflicts).toHaveLength(0);
    });
  });
  
  describe('Multiple field concurrent edits', () => {
    it('should merge multiple non-conflicting field updates', () => {
      const clientVersions: FieldVersions = {
        name: { version: 2, updated_at: '2026-02-10T10:01:00.000Z' },
        model: { version: 1, updated_at: '2026-02-10T10:00:00.000Z' },
      };
      
      const serverVersions: FieldVersions = {
        name: { version: 2, updated_at: '2026-02-10T10:01:00.000Z' },
        model: { version: 1, updated_at: '2026-02-10T10:00:00.000Z' },
      };
      
      const clientData = { name: 'Camera One', model: 'PXW-Z450', note: 'New note' };
      const serverData = { name: 'Camera One', model: 'Old Model' };
      
      const mergeResult = mergeNonConflictingFieldsForEntity(
        clientVersions,
        serverVersions,
        clientData,
        serverData,
        CAMERA_VERSIONED_FIELDS
      );
      
      expect(mergeResult.hasConflicts).toBe(false);
      expect(mergeResult.mergedData.model).toBe('PXW-Z450');
      expect(mergeResult.mergedData.note).toBe('New note');
      expect(mergeResult.mergedVersions.model.version).toBe(2); // Incremented
    });
  });
});

describe('Entity Field Versioning - CCU', () => {
  it('should exclude id field from CCU_VERSIONED_FIELDS', () => {
    expect(CCU_VERSIONED_FIELDS.includes('id' as any)).toBe(false);
  });
  
  it('should allow concurrent CCU ID rename and field edit', () => {
    const clientVersions: FieldVersions = {
      name: { version: 1, updated_at: '2026-02-10T10:00:00.000Z' },
    };
    
    const serverVersions: FieldVersions = {
      id: { version: 2, updated_at: '2026-02-10T10:01:00.000Z' }, // ID changed by other user
      name: { version: 1, updated_at: '2026-02-10T10:00:00.000Z' },
    };
    
    const clientData = { name: 'CCU Updated Name' };
    const serverData = { id: 'CCU 2', name: 'CCU Original Name' };
    
    const conflicts = compareFieldVersionsForEntity(
      clientVersions,
      serverVersions,
      clientData,
      serverData,
      CCU_VERSIONED_FIELDS
    );
    
    expect(conflicts).toHaveLength(0);
  });
});

describe('Entity Field Versioning - Source', () => {
  it('should exclude id field from SOURCE_VERSIONED_FIELDS', () => {
    expect(SOURCE_VERSIONED_FIELDS.includes('id' as any)).toBe(false);
  });
  
  it('should allow concurrent source ID and category changes', () => {
    const clientVersions: FieldVersions = {
      category: { version: 2, updated_at: '2026-02-10T10:01:00.000Z' },
    };
    
    const serverVersions: FieldVersions = {
      id: { version: 2, updated_at: '2026-02-10T10:01:00.000Z' },
      category: { version: 2, updated_at: '2026-02-10T10:01:00.000Z' },
    };
    
    const clientData = { category: 'PLAYBACK', name: 'Source A' };
    const serverData = { id: 'SRC 99', category: 'PLAYBACK' };
    
    const mergeResult = mergeNonConflictingFieldsForEntity(
      clientVersions,
      serverVersions,
      clientData,
      serverData,
      SOURCE_VERSIONED_FIELDS
    );
    
    expect(mergeResult.hasConflicts).toBe(false);
  });
});

describe('Entity Field Versioning - Send', () => {
  it('should exclude id field from SEND_VERSIONED_FIELDS', () => {
    expect(SEND_VERSIONED_FIELDS.includes('id' as any)).toBe(false);
  });
});

describe('Field version initialization for entities', () => {
  it('should initialize field versions for camera with correct fields', () => {
    const fieldVersions = initFieldVersionsForEntity(CAMERA_VERSIONED_FIELDS);
    
    expect(Object.keys(fieldVersions)).toHaveLength(CAMERA_VERSIONED_FIELDS.length);
    
    for (const field of CAMERA_VERSIONED_FIELDS) {
      expect(fieldVersions[field]).toBeDefined();
      expect(fieldVersions[field].version).toBe(1);
      expect(fieldVersions[field].updated_at).toBeDefined();
    }
    
    // Verify 'id' is NOT initialized
    expect(fieldVersions['id']).toBeUndefined();
  });
  
  it('should initialize field versions for CCU with correct fields', () => {
    const fieldVersions = initFieldVersionsForEntity(CCU_VERSIONED_FIELDS);
    
    expect(Object.keys(fieldVersions)).toHaveLength(CCU_VERSIONED_FIELDS.length);
    expect(fieldVersions['id']).toBeUndefined();
  });
});

describe('Real-world scenario: Team editing same camera', () => {
  it('should handle User A renaming ID while User B adds note', () => {
    // Initial state: Camera exists as "CAM 1"
    const initialVersions: FieldVersions = {
      name: { version: 1, updated_at: '2026-02-10T09:00:00.000Z' },
      note: { version: 1, updated_at: '2026-02-10T09:00:00.000Z' },
    };
    
    // User A: Renames camera ID from "CAM 1" to "Camera Alpha"
    // (Does not send ID in update, but changes stored ID label)
    const userAData = { id: 'Camera Alpha' };
    const serverAfterA = {
      id: 'Camera Alpha',
      name: 'Main Camera',
      note: '',
    };
    const serverVersionsAfterA = {
      ...initialVersions,
      // Note: 'id' doesn't get a version because it's not in CAMERA_VERSIONED_FIELDS
    };
    
    // User B: (Still sees "CAM 1") Adds a note
    const userBVersions = initialVersions;
    const userBData = { note: 'Needs new battery' };
    
    // User B saves - check for conflicts
    const conflicts = compareFieldVersionsForEntity(
      userBVersions,
      serverVersionsAfterA,
      userBData,
      serverAfterA,
      CAMERA_VERSIONED_FIELDS
    );
    
    // Should have NO conflicts - ID change doesn't conflict with note change
    expect(conflicts).toHaveLength(0);
    
    // Merge
    const result = mergeNonConflictingFieldsForEntity(
      userBVersions,
      serverVersionsAfterA,
      userBData,
      serverAfterA,
      CAMERA_VERSIONED_FIELDS
    );
    
    expect(result.hasConflicts).toBe(false);
    expect(result.mergedData.note).toBe('Needs new battery');
    expect(result.mergedData.id).toBe('Camera Alpha'); // Keeps User A's rename
    expect(result.mergedVersions.note.version).toBe(2); // Note version incremented
  });
  
  it('should detect conflict when both users edit same field', () => {
    const initialVersions: FieldVersions = {
      name: { version: 1, updated_at: '2026-02-10T09:00:00.000Z' },
    };
    
    // User A: Changes name to "Alpha"
    const serverVersionsAfterA = {
      name: { version: 2, updated_at: '2026-02-10T09:01:00.000Z' },
    };
    const serverDataAfterA = { name: 'Alpha Camera' };
    
    // User B: Also changes name to "Beta" (still has version 1)
    const userBVersions = initialVersions;
    const userBData = { name: 'Beta Camera' };
    
    const conflicts = compareFieldVersionsForEntity(
      userBVersions,
      serverVersionsAfterA,
      userBData,
      serverDataAfterA,
      CAMERA_VERSIONED_FIELDS
    );
    
    // Should have conflict on 'name' field
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].fieldName).toBe('name');
    expect(conflicts[0].clientValue).toBe('Beta Camera');
    expect(conflicts[0].serverValue).toBe('Alpha Camera');
  });
});
