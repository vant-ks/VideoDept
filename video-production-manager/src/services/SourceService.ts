import { Source } from '@/models/Source';
import type { Source as ISource, SourceType } from '@/types';

/**
 * Service for managing Sources with business logic and CRUD operations
 */
export class SourceService {
  /**
   * Generate a unique ID for a new source
   */
  static generateId(existingSources: ISource[]): string {
    const sourceNumbers = existingSources
      .map(s => {
        const match = s.id.match(/^SRC\s*(\d+)$/i);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => !isNaN(n));

    const maxNumber = sourceNumbers.length > 0 ? Math.max(...sourceNumbers) : 0;
    return `SRC ${maxNumber + 1}`;
  }

  /**
   * Create a new source with auto-generated ID
   */
  static createNew(
    existingSources: ISource[],
    type: SourceType = 'LAPTOP',
    name?: string
  ): Source {
    const id = this.generateId(existingSources);
    return Source.create(id, type, name || `${type} ${id}`);
  }

  /**
   * Validate a source before saving
   */
  static validate(source: Partial<ISource>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!source.id?.trim()) {
      errors.push('Source ID is required');
    }
    if (!source.name?.trim()) {
      errors.push('Source name is required');
    }
    if (!source.type) {
      errors.push('Source type is required');
    }
    if (!source.rate || source.rate <= 0) {
      errors.push('Valid frame rate is required');
    }
    if (!source.outputs || source.outputs.length === 0) {
      errors.push('At least one output is required');
    }
    if (source.hRes && source.hRes < 0) {
      errors.push('Horizontal resolution cannot be negative');
    }
    if (source.vRes && source.vRes < 0) {
      errors.push('Vertical resolution cannot be negative');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if a source ID already exists (checks globally against sources and sends)
   */
  static idExists(id: string, sources: ISource[], excludeId?: string, allSends?: any[]): boolean {
    // Check in sources
    const existsInSources = sources.some(s => s.id === id && s.id !== excludeId);
    if (existsInSources) return true;
    
    // Check in sends if provided
    if (allSends) {
      const existsInSends = allSends.some((s: any) => s.id === id);
      return existsInSends;
    }
    
    return false;
  }

  /**
   * Calculate link type (SL, DL, or 4K) based on resolution and frame rate
   * Factors in reduced blanking to determine pixel clock requirements
   */
  static getLinkType(source: ISource): string {
    if (!source.hRes || !source.vRes) return 'N/A';
    
    const pixels = source.hRes * source.vRes;
    const rate = source.rate;
    
    // Calculate pixel clock based on blanking type
    // Standard blanking adds ~26% overhead
    // RBv1/RBv2 adds ~8% overhead
    // RBv3 adds ~6% overhead
    let blankingMultiplier = 1.26; // Standard blanking
    
    if (source.blanking === 'RBv1' || source.blanking === 'RBv2') {
      blankingMultiplier = 1.08;
    } else if (source.blanking === 'RBv3') {
      blankingMultiplier = 1.06;
    }
    
    // Pixel clock in MHz
    const pixelClock = (pixels * rate * blankingMultiplier) / 1_000_000;
    
    // 4K resolution (3840x2160 and above)
    if (pixels >= 3840 * 2160) {
      return '4K';
    }
    
    // Dual-Link threshold: ~165 MHz for single-link DVI/HDMI
    // Resolutions above 1920x1080 typically need dual-link
    if (pixels > 1920 * 1080) {
      return 'DL';
    }
    
    // For 1920x1080, check if pixel clock exceeds single-link capacity
    // Single-Link DVI/HDMI max: ~165 MHz
    if (pixels === 1920 * 1080 && pixelClock > 165) {
      return 'DL';
    }
    
    // Single-Link (default for most HD content)
    return 'SL';
  }

  /**
   * Get formatted display string with resolution, frame rate, and link type
   * Example: "1920 x 1080 @ 59.94 (SL)"
   */
  static getFormattedDisplay(source: ISource): string {
    if (!source.hRes || !source.vRes) {
      return `@ ${source.rate} fps`;
    }
    
    const linkType = this.getLinkType(source);
    return `${source.hRes} x ${source.vRes} @ ${source.rate} (${linkType})`;
  }

  /**
   * Get sources filtered by type
   */
  static filterByType(sources: ISource[], type: SourceType): ISource[] {
    return sources.filter(s => s.type === type);
  }

  /**
   * Get sources filtered by output connector
   */
  static filterByConnector(sources: ISource[], connector: string): ISource[] {
    return sources.filter(s => s.outputs.some(output => output.connector === connector));
  }

  /**
   * Search sources by name or notes
   */
  static search(sources: ISource[], query: string): ISource[] {
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) return sources;

    return sources.filter(
      s =>
        s.name.toLowerCase().includes(lowerQuery) ||
        s.id.toLowerCase().includes(lowerQuery) ||
        s.note?.toLowerCase().includes(lowerQuery) ||
        s.secondaryDevice?.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Sort sources by a given field
   */
  static sort(
    sources: ISource[],
    field: keyof ISource,
    direction: 'asc' | 'desc' = 'asc'
  ): ISource[] {
    return [...sources].sort((a, b) => {
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
   * Export sources to JSON string
   */
  static exportToJSON(sources: ISource[]): string {
    return JSON.stringify(sources, null, 2);
  }

  /**
   * Import sources from JSON string
   */
  static importFromJSON(json: string): { sources: Source[]; errors: string[] } {
    const errors: string[] = [];
    const sources: Source[] = [];

    try {
      const data = JSON.parse(json);
      const sourceArray = Array.isArray(data) ? data : [data];

      sourceArray.forEach((item, index) => {
        try {
          const source = Source.fromJSON(item);
          sources.push(source);
        } catch (error) {
          errors.push(`Item ${index + 1}: ${error instanceof Error ? error.message : 'Invalid data'}`);
        }
      });
    } catch (error) {
      errors.push(`JSON parse error: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
    }

    return { sources, errors };
  }

  /**
   * Get statistics about sources
   */
  static getStatistics(sources: ISource[]) {
    const byType = sources.reduce((acc, source) => {
      acc[source.type] = (acc[source.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byConnector = sources.reduce((acc, source) => {
      // Defensive: ensure outputs exists and is an array
      const outputs = source.outputs || [];
      outputs.forEach(output => {
        acc[output.connector] = (acc[output.connector] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const resolutions = sources
      .filter(s => s.hRes && s.vRes)
      .map(s => `${s.hRes}x${s.vRes}`);
    const uniqueResolutions = [...new Set(resolutions)];

    return {
      total: sources.length,
      byType,
      byConnector,
      uniqueResolutions,
      hdCount: sources.filter(s => {
        const pixels = (s.hRes || 0) * (s.vRes || 0);
        return pixels >= 1280 * 720;
      }).length,
      uhd4kCount: sources.filter(s => {
        const pixels = (s.hRes || 0) * (s.vRes || 0);
        return pixels >= 3840 * 2160;
      }).length,
    };
  }
}
