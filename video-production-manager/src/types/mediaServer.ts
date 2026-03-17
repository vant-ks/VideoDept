export interface MediaServer {
  id: string;
  name: string; // e.g., "Server 1 A", "Server 1 B" (auto-generated from pairNumber)
  pairNumber: number; // 1, 2, 3, etc. (auto-assigned, user can drag-reorder)
  isBackup: boolean; // false for A, true for B
  platform: string; // e.g., "Resolume Arena", "Disguise", "Watchout", "Ventuz", etc.
  note?: string;
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
