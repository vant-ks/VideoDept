/**
 * Utilities for converting between snake_case (database) and camelCase (frontend)
 */

// Special field mappings that don't follow simple case conversion
const SPECIAL_MAPPINGS: Record<string, string> = {
  // Database -> Frontend
  'output_connector': 'output',
  'device_name': 'device',
  'note': 'notes', // Only for ip_addresses
};

const REVERSE_MAPPINGS: Record<string, string> = Object.fromEntries(
  Object.entries(SPECIAL_MAPPINGS).map(([k, v]) => [v, k])
);

export function toCamelCase(obj: any, entityType?: string): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => toCamelCase(item, entityType));
  }
  
  if (obj instanceof Date) {
    return obj;
  }
  
  if (typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      // Check for special mappings first
      if (SPECIAL_MAPPINGS[key]) {
        acc[SPECIAL_MAPPINGS[key]] = toCamelCase(obj[key], entityType);
      } else {
        // Convert snake_case to camelCase
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        acc[camelKey] = toCamelCase(obj[key], entityType);
      }
      return acc;
    }, {} as any);
  }
  
  return obj;
}

export function toSnakeCase(obj: any, entityType?: string): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => toSnakeCase(item, entityType));
  }
  
  if (obj instanceof Date) {
    return obj;
  }
  
  if (typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      // Check for reverse special mappings first
      if (REVERSE_MAPPINGS[key]) {
        acc[REVERSE_MAPPINGS[key]] = toSnakeCase(obj[key], entityType);
      } else {
        // Convert camelCase to snake_case
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        acc[snakeKey] = toSnakeCase(obj[key], entityType);
      }
      return acc;
    }, {} as any);
  }
  
  return obj;
}
