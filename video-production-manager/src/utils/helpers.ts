import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatResolution(width?: number, height?: number): string {
  if (!width || !height) return '—';
  return `${width}×${height}`;
}

export function formatFrameRate(rate: number): string {
  return `${rate}fps`;
}

export function getConnectorColor(connector: string): string {
  const colors: Record<string, string> = {
    'SDI': 'text-signal-sdi',
    'HDMI': 'text-signal-hdmi',
    'DP': 'text-signal-dp',
    'FIBER': 'text-signal-fiber',
    'NDI': 'text-av-cyan',
    'USB-C': 'text-av-purple',
  };
  return colors[connector] || 'text-av-text-muted';
}

export function getConnectorBgColor(connector: string): string {
  const colors: Record<string, string> = {
    'SDI': 'bg-signal-sdi/20 border-signal-sdi/50',
    'HDMI': 'bg-signal-hdmi/20 border-signal-hdmi/50',
    'DP': 'bg-signal-dp/20 border-signal-dp/50',
    'FIBER': 'bg-signal-fiber/20 border-signal-fiber/50',
    'NDI': 'bg-av-cyan/20 border-av-cyan/50',
    'USB-C': 'bg-av-purple/20 border-av-purple/50',
  };
  return colors[connector] || 'bg-av-surface-light border-av-border';
}

export function getSourceTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    'LAPTOP': '💻',
    'CAM': '📹',
    'SERVER': '🖥️',
    'PLAYBACK': '▶️',
    'GRAPHICS': '🎨',
    'PTZ': '🎥',
    'ROBO': '🤖',
    'OTHER': '📡',
  };
  return icons[type] || '📡';
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'VIDEO': 'bg-signal-sdi/20 text-signal-sdi',
    'CAMS': 'bg-signal-hdmi/20 text-signal-hdmi',
    'FOH': 'bg-av-purple/20 text-av-purple',
    'HOUSE': 'bg-av-cyan/20 text-av-cyan',
    'RIGGING': 'bg-av-warning/20 text-av-warning',
    'LED': 'bg-signal-fiber/20 text-signal-fiber',
    'NETWORK': 'bg-av-info/20 text-av-info',
    'OTHER': 'bg-av-surface-light text-av-text-muted',
  };
  return colors[category] || colors['OTHER'];
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function parseIPOctet(ip: string): number[] {
  return ip.split('.').map(Number);
}

export function sortIPAddresses(ips: { ip: string }[]): { ip: string }[] {
  return [...ips].sort((a, b) => {
    const aOctets = parseIPOctet(a.ip);
    const bOctets = parseIPOctet(b.ip);
    for (let i = 0; i < 4; i++) {
      if (aOctets[i] !== bOctets[i]) {
        return aOctets[i] - bOctets[i];
      }
    }
    return 0;
  });
}

export function calculateScaling(
  inputWidth: number,
  inputHeight: number,
  targetWidth: number,
  targetHeight: number
): { width: number; height: number; scaleFactor: number } {
  const scaleX = targetWidth / inputWidth;
  const scaleY = targetHeight / inputHeight;
  const scaleFactor = Math.min(scaleX, scaleY);
  
  return {
    width: Math.round(inputWidth * scaleFactor),
    height: Math.round(inputHeight * scaleFactor),
    scaleFactor,
  };
}

export function pixelsToInches(pixels: number, ppi: number = 72): number {
  return pixels / ppi;
}

export function inchesToPixels(inches: number, ppi: number = 72): number {
  return inches * ppi;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
