/**
 * Project Import/Export Utilities
 * Handle .vdpx file format import and export
 */

import type { VideoDepProject } from '@/types';

const VDPX_VERSION = '1.0.0';
const VDPX_MAGIC = 'VDPX'; // File format identifier

/**
 * Export project as .vdpx JSON file
 */
export async function exportProject(project: VideoDepProject, filename?: string): Promise<void> {
  try {
    // Validate project data
    validateProject(project);

    // Create JSON with pretty formatting
    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    
    // Generate filename if not provided
    const defaultFilename = `${project.production.client}_${project.production.showName}_${new Date().toISOString().split('T')[0]}.vdpx`.replace(/\s+/g, '_');
    const exportFilename = filename || defaultFilename;
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = exportFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export project:', error);
    throw new Error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Import project from .vdpx file
 */
export async function importProject(file: File): Promise<VideoDepProject> {
  try {
    // Validate file extension
    if (!file.name.endsWith('.vdpx')) {
      throw new Error('Invalid file type. Expected .vdpx file');
    }

    // Read file content
    const text = await file.text();
    const project = JSON.parse(text) as VideoDepProject;

    // Validate project structure
    validateProject(project);

    // Check version compatibility
    if (project.version !== VDPX_VERSION) {
      console.warn(`Project version ${project.version} may not be fully compatible with current version ${VDPX_VERSION}`);
      // Future: Add migration logic here
    }

    // Update timestamps
    project.modified = Date.now();

    return project;
  } catch (error) {
    console.error('Failed to import project:', error);
    throw new Error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate project structure
 */
function validateProject(project: any): asserts project is VideoDepProject {
  // Check required fields
  if (!project.version) {
    throw new Error('Missing project version');
  }

  if (!project.production) {
    throw new Error('Missing production data');
  }

  if (!project.production.client || !project.production.showName) {
    throw new Error('Missing required production fields (client, showName)');
  }

  // Check required arrays
  const requiredArrays = [
    'sources',
    'sends',
    'checklist',
    'ledScreens',
    'projectionScreens',
    'computers',
    'ccus',
    'cameras',
    'usedEquipmentIds'
  ];

  for (const field of requiredArrays) {
    if (!Array.isArray(project[field])) {
      // Initialize missing arrays
      project[field] = [];
      console.warn(`Initialized missing array field: ${field}`);
    }
  }

  // Validate timestamps
  if (typeof project.created !== 'number') {
    project.created = Date.now();
  }

  if (typeof project.modified !== 'number') {
    project.modified = Date.now();
  }
}

/**
 * Create a blank project template
 */
export function createBlankProject(
  client: string,
  showName: string,
  venue?: string,
  loadIn?: string
): Omit<VideoDepProject, 'version' | 'created' | 'modified'> {
  return {
    production: {
      id: '',
      client,
      showName,
      venue: venue || '',
      room: '',
      loadIn: loadIn || new Date().toISOString().split('T')[0],
      loadOut: loadIn || new Date().toISOString().split('T')[0],
    },
    sources: [],
    sends: [],
    checklist: [],
    ledScreens: [],
    projectionScreens: [],
    computers: [],
    ccus: [],
    cameras: [],
    mediaServers: [],
    mediaServerLayers: [],
    videoSwitchers: [],
    routers: [],
    serverAllocations: [],
    ipAddresses: [],
    cableSnakes: [],
    presets: [],
    usedEquipmentIds: [],
  };
}

/**
 * Prompt user to select a .vdpx file
 */
export function promptImportFile(): Promise<File> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.vdpx';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        resolve(file);
      } else {
        reject(new Error('No file selected'));
      }
    };
    
    input.click();
  });
}

/**
 * Get project summary for display
 */
export function getProjectSummary(project: VideoDepProject) {
  return {
    name: project.production.showName,
    client: project.production.client,
    venue: project.production.venue,
    loadIn: project.production.loadIn,
    sourcesCount: project.sources?.length || 0,
    sendsCount: project.sends?.length || 0,
    checklistCount: project.checklist?.length || 0,
    checklistCompleted: project.checklist?.filter(c => c.completed).length || 0,
    equipmentCount: project.usedEquipmentIds?.length || 0,
    lastModified: new Date(project.modified).toLocaleDateString(),
    created: new Date(project.created).toLocaleDateString(),
  };
}
