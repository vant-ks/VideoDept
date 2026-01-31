/**
 * Field-Level Versioning Utilities
 * 
 * Provides utilities for managing field-level versioning in production records.
 * Enables Google Docs-style concurrent editing where multiple users can edit
 * different fields simultaneously without conflicts.
 */

/**
 * Field version metadata
 */
export interface FieldVersion {
  version: number;
  updated_at: string;
}

/**
 * Map of field names to their version metadata
 */
export type FieldVersions = Record<string, FieldVersion>;

/**
 * Result of field version comparison
 */
export interface FieldConflict {
  fieldName: string;
  clientVersion: number;
  serverVersion: number;
  clientValue: any;
  serverValue: any;
}

/**
 * Result of merge operation
 */
export interface MergeResult {
  hasConflicts: boolean;
  conflicts: FieldConflict[];
  mergedData: Record<string, any>;
  mergedVersions: FieldVersions;
}

/**
 * Production field names that support versioning
 */
export const VERSIONED_FIELDS = [
  'show_name',
  'client',
  'venue',
  'production_type',
  'contact_name',
  'contact_email',
  'contact_phone',
  'show_date',
  'show_time',
  'room',
  'load_in',
  'load_out',
  'show_info_url',
  'status',
] as const;

/**
 * Initialize field versions for a new production
 * Sets all fields to version 1 with current timestamp
 */
export function initFieldVersions(): FieldVersions {
  const now = new Date().toISOString();
  const fieldVersions: FieldVersions = {};
  
  for (const field of VERSIONED_FIELDS) {
    fieldVersions[field] = {
      version: 1,
      updated_at: now,
    };
  }
  
  return fieldVersions;
}

/**
 * Update version for a specific field
 * Increments version and updates timestamp
 */
export function updateFieldVersion(
  fieldVersions: FieldVersions,
  fieldName: string
): FieldVersions {
  const now = new Date().toISOString();
  const currentVersion = fieldVersions[fieldName]?.version || 0;
  
  return {
    ...fieldVersions,
    [fieldName]: {
      version: currentVersion + 1,
      updated_at: now,
    },
  };
}

/**
 * Compare client and server field versions to detect conflicts
 * 
 * @param clientFieldVersions - Field versions from client
 * @param serverFieldVersions - Field versions from server
 * @param clientData - Client's updated data
 * @param serverData - Current server data
 * @returns Array of conflicts (empty if no conflicts)
 */
export function compareFieldVersions(
  clientFieldVersions: FieldVersions,
  serverFieldVersions: FieldVersions,
  clientData: Record<string, any>,
  serverData: Record<string, any>
): FieldConflict[] {
  const conflicts: FieldConflict[] = [];
  
  // Check each field that the client is trying to update
  for (const fieldName in clientData) {
    // Skip if not a versioned field
    if (!VERSIONED_FIELDS.includes(fieldName as any)) {
      continue;
    }
    
    const clientVersion = clientFieldVersions[fieldName]?.version || 0;
    const serverVersion = serverFieldVersions[fieldName]?.version || 0;
    
    // Conflict: client has stale version (server was updated by someone else)
    if (clientVersion < serverVersion) {
      conflicts.push({
        fieldName,
        clientVersion,
        serverVersion,
        clientValue: clientData[fieldName],
        serverValue: serverData[fieldName],
      });
    }
  }
  
  return conflicts;
}

/**
 * Merge non-conflicting field updates
 * 
 * Allows concurrent editing of different fields by:
 * 1. Applying all client changes for fields where versions match
 * 2. Rejecting changes for fields with version conflicts
 * 
 * @param clientFieldVersions - Field versions from client
 * @param serverFieldVersions - Field versions from server
 * @param clientData - Client's updated data
 * @param serverData - Current server data
 * @returns Merge result with conflicts and merged data
 */
export function mergeNonConflictingFields(
  clientFieldVersions: FieldVersions,
  serverFieldVersions: FieldVersions,
  clientData: Record<string, any>,
  serverData: Record<string, any>
): MergeResult {
  const conflicts = compareFieldVersions(
    clientFieldVersions,
    serverFieldVersions,
    clientData,
    serverData
  );
  
  const conflictFields = new Set(conflicts.map(c => c.fieldName));
  const mergedData: Record<string, any> = { ...serverData };
  const mergedVersions: FieldVersions = { ...serverFieldVersions };
  
  // Apply non-conflicting updates
  for (const fieldName in clientData) {
    // Skip conflicting fields
    if (conflictFields.has(fieldName)) {
      continue;
    }
    
    // Skip non-versioned fields (apply directly)
    if (!VERSIONED_FIELDS.includes(fieldName as any)) {
      mergedData[fieldName] = clientData[fieldName];
      continue;
    }
    
    // Apply the update and increment version
    mergedData[fieldName] = clientData[fieldName];
    mergedVersions[fieldName] = {
      version: (serverFieldVersions[fieldName]?.version || 0) + 1,
      updated_at: new Date().toISOString(),
    };
  }
  
  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
    mergedData,
    mergedVersions,
  };
}

/**
 * Validate field versions structure
 */
export function isValidFieldVersions(fieldVersions: any): fieldVersions is FieldVersions {
  if (!fieldVersions || typeof fieldVersions !== 'object' || Array.isArray(fieldVersions)) {
    return false;
  }
  
  for (const key in fieldVersions) {
    const fv = fieldVersions[key];
    if (!fv || typeof fv !== 'object') {
      return false;
    }
    if (typeof fv.version !== 'number' || typeof fv.updated_at !== 'string') {
      return false;
    }
  }
  
  return true;
}
