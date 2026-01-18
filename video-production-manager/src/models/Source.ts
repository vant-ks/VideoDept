import type { Source as ISource, SourceType, ConnectorType } from '@/types';

/**
 * Source class representing a video input source
 * Provides validation, utility methods, and business logic for sources
 */
export class Source implements ISource {
  id: string;
  type: SourceType;
  name: string;
  hRes?: number;
  vRes?: number;
  rate: number;
  standard?: string;
  note?: string;
  secondaryDevice?: string;
  outputs: Array<{ id: string; connector: ConnectorType }>;
  blanking?: 'none' | 'RBv1' | 'RBv2' | 'RBv3';

  constructor(data: Partial<ISource> & { id: string; type: SourceType; name: string; rate: number; outputs: Array<{ id: string; connector: ConnectorType }> }) {
    this.id = data.id;
    this.type = data.type;
    this.name = data.name;
    this.hRes = data.hRes;
    this.vRes = data.vRes;
    this.rate = data.rate;
    this.standard = data.standard;
    this.note = data.note;
    this.secondaryDevice = data.secondaryDevice;
    this.outputs = data.outputs;
    this.blanking = data.blanking;
    
    this.validate();
  }

  /**
   * Validates the source data
   * @throws Error if validation fails
   */
  validate(): void {
    if (!this.id.trim()) {
      throw new Error('Source ID is required');
    }
    if (!this.name.trim()) {
      throw new Error('Source name is required');
    }
    if (this.rate <= 0) {
      throw new Error('Frame rate must be positive');
    }
    if (this.hRes && this.hRes < 0) {
      throw new Error('Horizontal resolution cannot be negative');
    }
    if (this.vRes && this.vRes < 0) {
      throw new Error('Vertical resolution cannot be negative');
    }
  }

  /**
   * Returns the full resolution string (e.g., "1920x1080")
   */
  getResolutionString(): string {
    if (this.hRes && this.vRes) {
      return `${this.hRes}x${this.vRes}`;
    }
    return 'N/A';
  }

  /**
   * Returns the complete format string (e.g., "1920x1080@59.94")
   */
  getFormatString(): string {
    const res = this.getResolutionString();
    return res !== 'N/A' ? `${res}@${this.rate}` : `@${this.rate}`;
  }

  /**
   * Returns the aspect ratio as a decimal
   */
  getAspectRatio(): number | null {
    if (this.hRes && this.vRes && this.vRes > 0) {
      return this.hRes / this.vRes;
    }
    return null;
  }

  /**
   * Returns a formatted aspect ratio string (e.g., "16:9")
   */
  getAspectRatioString(): string {
    const ratio = this.getAspectRatio();
    if (!ratio) return 'N/A';

    // Common aspect ratios
    if (Math.abs(ratio - 16/9) < 0.01) return '16:9';
    if (Math.abs(ratio - 4/3) < 0.01) return '4:3';
    if (Math.abs(ratio - 16/10) < 0.01) return '16:10';
    if (Math.abs(ratio - 21/9) < 0.01) return '21:9';
    if (Math.abs(ratio - 32/9) < 0.01) return '32:9';
    
    return ratio.toFixed(2);
  }

  /**
   * Returns total pixel count
   */
  getTotalPixels(): number | null {
    if (this.hRes && this.vRes) {
      return this.hRes * this.vRes;
    }
    return null;
  }

  /**
   * Checks if this is an HD source
   */
  isHD(): boolean {
    const pixels = this.getTotalPixels();
    return pixels !== null && pixels >= 1280 * 720;
  }

  /**
   * Checks if this is a 4K/UHD source
   */
  is4K(): boolean {
    const pixels = this.getTotalPixels();
    return pixels !== null && pixels >= 3840 * 2160;
  }

  /**
   * Returns the link type (SL, DL, or 4K) based on resolution and frame rate
   * SL (Single-Link): Up to 1920x1080 @ 60fps
   * DL (Dual-Link): Up to 2560x1440 @ 60fps or 1920x1080 @ 120fps
   * 4K: 3840x2160 and above
   */
  getLinkType(): string {
    if (!this.hRes || !this.vRes) return 'N/A';
    
    const pixels = this.getTotalPixels();
    if (!pixels) return 'N/A';
    
    // 4K resolution
    if (pixels >= 3840 * 2160) {
      return '4K';
    }
    
    // Dual-Link scenarios
    if (pixels > 1920 * 1080) {
      return 'DL';
    }
    
    if (pixels === 1920 * 1080 && this.rate > 60) {
      return 'DL';
    }
    
    // Single-Link (default for most HD content)
    return 'SL';
  }

  /**
   * Returns formatted resolution and frame rate string with link type
   * Example: "1920 x 1080 @ 59.94 (SL)"
   */
  getFormattedDisplay(): string {
    if (!this.hRes || !this.vRes) {
      return `@ ${this.rate} fps`;
    }
    
    const linkType = this.getLinkType();
    return `${this.hRes} x ${this.vRes} @ ${this.rate} (${linkType})`;
  }

  /**
   * Updates the source with partial data
   */
  update(updates: Partial<ISource>): Source {
    return new Source({
      ...this.toJSON(),
      ...updates,
    });
  }

  /**
   * Creates a duplicate of this source with a new ID
   */
  duplicate(newId?: string): Source {
    return new Source({
      ...this.toJSON(),
      id: newId || `${this.id}-copy`,
      name: `${this.name} (Copy)`,
    });
  }

  /**
   * Converts the source to a plain object
   */
  toJSON(): ISource {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      hRes: this.hRes,
      vRes: this.vRes,
      rate: this.rate,
      standard: this.standard,
      note: this.note,
      secondaryDevice: this.secondaryDevice,
      outputs: this.outputs,
      blanking: this.blanking,
    };
  }

  /**
   * Creates a Source instance from plain object data
   */
  static fromJSON(data: ISource): Source {
    return new Source(data);
  }

  /**
   * Creates a new source with default values
   */
  static create(
    id: string,
    type: SourceType = 'LAPTOP',
    name: string = 'New Source'
  ): Source {
    return new Source({
      id,
      type,
      name,
      rate: 59.94,
      outputs: [{ id: 'out-1', connector: 'HDMI' }],
      hRes: 1920,
      vRes: 1080,
    });
  }

  /**
   * Validates source data without creating an instance
   */
  static isValid(data: Partial<ISource>): boolean {
    try {
      if (!data.id || !data.name || !data.type || !data.rate || !data.outputs || data.outputs.length === 0) {
        return false;
      }
      new Source(data as ISource);
      return true;
    } catch {
      return false;
    }
  }
}
