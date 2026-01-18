import type { Send as ISend, SendType, ConnectorType } from '@/types';

/**
 * Send class representing a video output destination
 * Provides validation, utility methods, and business logic for sends
 */
export class Send implements ISend {
  id: string;
  type: SendType;
  name: string;
  hRes?: number;
  vRes?: number;
  rate: number;
  standard?: string;
  note?: string;
  secondaryDevice?: string;
  output: ConnectorType;

  constructor(data: Partial<ISend> & { id: string; type: SendType; name: string; rate: number; output: ConnectorType }) {
    this.id = data.id;
    this.type = data.type;
    this.name = data.name;
    this.hRes = data.hRes;
    this.vRes = data.vRes;
    this.rate = data.rate;
    this.standard = data.standard;
    this.note = data.note;
    this.secondaryDevice = data.secondaryDevice;
    this.output = data.output;
    
    this.validate();
  }

  /**
   * Validates the send data
   * @throws Error if validation fails
   */
  validate(): void {
    if (!this.id.trim()) {
      throw new Error('Send ID is required');
    }
    if (!this.name.trim()) {
      throw new Error('Send name is required');
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
   * Checks if this is an HD send
   */
  isHD(): boolean {
    const pixels = this.getTotalPixels();
    return pixels !== null && pixels >= 1280 * 720;
  }

  /**
   * Checks if this is a 4K/UHD send
   */
  is4K(): boolean {
    const pixels = this.getTotalPixels();
    return pixels !== null && pixels >= 3840 * 2160;
  }

  /**
   * Checks if this send can accept a given resolution
   * @param hRes Horizontal resolution
   * @param vRes Vertical resolution
   */
  canAcceptResolution(hRes: number, vRes: number): boolean {
    if (!this.hRes || !this.vRes) {
      // If send doesn't have specified resolution, assume it can accept anything
      return true;
    }
    // Check if input resolution is less than or equal to send resolution
    return hRes <= this.hRes && vRes <= this.vRes;
  }

  /**
   * Updates the send with partial data
   */
  update(updates: Partial<ISend>): Send {
    return new Send({
      ...this.toJSON(),
      ...updates,
    });
  }

  /**
   * Creates a duplicate of this send with a new ID
   */
  duplicate(newId?: string): Send {
    return new Send({
      ...this.toJSON(),
      id: newId || `${this.id}-copy`,
      name: `${this.name} (Copy)`,
    });
  }

  /**
   * Converts the send to a plain object
   */
  toJSON(): ISend {
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
      output: this.output,
    };
  }

  /**
   * Creates a Send instance from plain object data
   */
  static fromJSON(data: ISend): Send {
    return new Send(data);
  }

  /**
   * Creates a new send with default values
   */
  static create(
    id: string,
    type: SendType = 'VIDEO SWITCH',
    name: string = 'New Send'
  ): Send {
    return new Send({
      id,
      type,
      name,
      rate: 59.94,
      output: 'HDMI',
      hRes: 1920,
      vRes: 1080,
    });
  }

  /**
   * Validates send data without creating an instance
   */
  static isValid(data: Partial<ISend>): boolean {
    try {
      if (!data.id || !data.name || !data.type || !data.rate || !data.output) {
        return false;
      }
      new Send(data as ISend);
      return true;
    } catch {
      return false;
    }
  }
}
