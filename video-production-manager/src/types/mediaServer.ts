export interface MediaServer {
  id: string;
  name: string; // e.g., "Media Server 1A", "Media Server 1B"
  pairNumber: number; // 1, 2, 3, etc.
  isBackup: boolean; // false for A, true for B
  platform: string; // e.g., "Resolume Arena", "Disguise", "Watchout", "Ventuz", etc.
  outputs: MediaServerOutput[];
  note?: string;
}

export interface MediaServerOutput {
  id: string;
  name: string;
  type: 'HDMI' | 'SDI' | 'DP' | 'FIBER' | 'NDI';
  resolution?: {
    width: number;
    height: number;
  };
  frameRate?: number;
}

export interface MediaServerLayer {
  id: string;
  name: string;
  content: string;
  outputAssignments: MediaServerOutputAssignment[]; // Can span outputs across multiple servers
}

export interface MediaServerOutputAssignment {
  serverId: string; // Which server this output is on
  outputId: string; // Which output on that server
}

export const MEDIA_SERVER_PLATFORMS = [
  'Watchout',
  'Millumin',
  'Mitti',
  'Pixera',
  'TouchDesigner',
  'PlaybackPro',
  'Resolume Arena',
  'Resolume Avenue',
  'Disguise',
  'Ventuz',
  'Smode',
  'Notch',
  'MadMapper',
  'QLab',
  'Other'
] as const;

export const OUTPUT_TYPES = ['HDMI', 'SDI', 'DP', 'FIBER', 'NDI'] as const;
