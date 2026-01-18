import { Send } from '@/models/Send';
import type { Send as ISend, SendType } from '@/types';

/**
 * Service for managing Sends with business logic and CRUD operations
 */
export class SendService {
  /**
   * Generate a unique ID for a new send
   */
  static generateId(existingSends: ISend[]): string {
    const sendNumbers = existingSends
      .map(s => {
        const match = s.id.match(/^SEND\s*(\d+)$/i);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => !isNaN(n));

    const maxNumber = sendNumbers.length > 0 ? Math.max(...sendNumbers) : 0;
    return `SEND ${maxNumber + 1}`;
  }

  /**
   * Check if a send ID already exists (checks globally against sends and sources)
   */
  static idExists(id: string, sends: ISend[], excludeId?: string, allSources?: any[]): boolean {
    // Check in sends
    const existsInSends = sends.some(s => s.id === id && s.id !== excludeId);
    if (existsInSends) return true;
    
    // Check in sources if provided
    if (allSources) {
      const existsInSources = allSources.some((s: any) => s.id === id);
      return existsInSources;
    }
    
    return false;
  }

  /**
   * Create a new send with auto-generated ID
   */
  static createNew(
    existingSends: ISend[],
    type: SendType = 'VIDEO SWITCH',
    name?: string
  ): Send {
    const id = this.generateId(existingSends);
    return Send.create(id, type, name || `${type} ${id}`);
  }

  /**
   * Validate a send before saving
   */
  static validate(send: Partial<ISend>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!send.id?.trim()) {
      errors.push('Send ID is required');
    }
    if (!send.name?.trim()) {
      errors.push('Send name is required');
    }
    if (!send.type) {
      errors.push('Send type is required');
    }
    if (!send.rate || send.rate <= 0) {
      errors.push('Valid frame rate is required');
    }
    if (!send.output) {
      errors.push('Output connector type is required');
    }
    if (send.hRes && send.hRes < 0) {
      errors.push('Horizontal resolution cannot be negative');
    }
    if (send.vRes && send.vRes < 0) {
      errors.push('Vertical resolution cannot be negative');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get sends filtered by type
   */
  static filterByType(sends: ISend[], type: SendType): ISend[] {
    return sends.filter(s => s.type === type);
  }

  /**
   * Get sends filtered by output connector
   */
  static filterByConnector(sends: ISend[], connector: string): ISend[] {
    return sends.filter(s => s.output === connector);
  }

  /**
   * Search sends by name or notes
   */
  static search(sends: ISend[], query: string): ISend[] {
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) return sends;

    return sends.filter(
      s =>
        s.name.toLowerCase().includes(lowerQuery) ||
        s.id.toLowerCase().includes(lowerQuery) ||
        s.note?.toLowerCase().includes(lowerQuery) ||
        s.secondaryDevice?.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Sort sends by a given field
   */
  static sort(
    sends: ISend[],
    field: keyof ISend,
    direction: 'asc' | 'desc' = 'asc'
  ): ISend[] {
    return [...sends].sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];

      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });
  }

  /**
   * Export sends to JSON string
   */
  static exportToJSON(sends: ISend[]): string {
    return JSON.stringify(sends, null, 2);
  }

  /**
   * Import sends from JSON string
   */
  static importFromJSON(json: string): { sends: Send[]; errors: string[] } {
    const errors: string[] = [];
    const sends: Send[] = [];

    try {
      const data = JSON.parse(json);
      const sendArray = Array.isArray(data) ? data : [data];

      sendArray.forEach((item, index) => {
        try {
          const send = Send.fromJSON(item);
          sends.push(send);
        } catch (error) {
          errors.push(`Item ${index + 1}: ${error instanceof Error ? error.message : 'Invalid data'}`);
        }
      });
    } catch (error) {
      errors.push(`JSON parse error: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
    }

    return { sends, errors };
  }

  /**
   * Get statistics about sends
   */
  static getStatistics(sends: ISend[]) {
    const byType = sends.reduce((acc, send) => {
      acc[send.type] = (acc[send.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byConnector = sends.reduce((acc, send) => {
      acc[send.output] = (acc[send.output] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const resolutions = sends
      .filter(s => s.hRes && s.vRes)
      .map(s => `${s.hRes}x${s.vRes}`);
    const uniqueResolutions = [...new Set(resolutions)];

    return {
      total: sends.length,
      byType,
      byConnector,
      uniqueResolutions,
      hdCount: sends.filter(s => {
        const pixels = (s.hRes || 0) * (s.vRes || 0);
        return pixels >= 1280 * 720;
      }).length,
      uhd4kCount: sends.filter(s => {
        const pixels = (s.hRes || 0) * (s.vRes || 0);
        return pixels >= 3840 * 2160;
      }).length,
    };
  }

  /**
   * Check compatibility between a source and this send
   */
  static isCompatible(send: ISend, sourceHRes?: number, sourceVRes?: number): boolean {
    if (!send.hRes || !send.vRes || !sourceHRes || !sourceVRes) {
      // If either doesn't have resolution specified, assume compatible
      return true;
    }
    // Check if source resolution fits within send resolution
    return sourceHRes <= send.hRes && sourceVRes <= send.vRes;
  }

  /**
   * Find compatible sends for a given source resolution
   */
  static findCompatible(sends: ISend[], sourceHRes?: number, sourceVRes?: number): ISend[] {
    if (!sourceHRes || !sourceVRes) {
      return sends;
    }
    return sends.filter(s => this.isCompatible(s, sourceHRes, sourceVRes));
  }
}
