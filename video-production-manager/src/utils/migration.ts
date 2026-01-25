/**
 * Data Migration Utility
 * Converts old localStorage format to new 3-store + IndexedDB structure
 */

import type { VideoDepProject } from '@/types';
import { projectDB } from './indexedDB';
import { v4 as uuidv4 } from 'uuid';

const OLD_STORAGE_KEY = 'video-production-storage';
const MIGRATION_FLAG_KEY = 'viddept-migrated-v2';

interface OldStoreFormat {
  state: {
    production: any;
    sources: any[];
    sends: any[];
    ledScreens: any[];
    projectionScreens: any[];
    ipAddresses: any[];
    checklist: any[];
    videoSwitchers: any[];
    serverAllocations: any[];
    ccus: any[];
    cameras: any[];
    mediaServers: any[];
    mediaServerLayers: any[];
    connectorTypes: string[];
    sourceTypes: string[];
    frameRates: string[];
    resolutions: string[];
    equipmentSpecs: any[];
    activeTab: string;
    theme: 'light' | 'dark';
    accentColor: string;
    collapsedCategories: string[];
  };
  version: number;
}

/**
 * Check if migration is needed
 */
export function needsMigration(): boolean {
  // Check if already migrated
  if (localStorage.getItem(MIGRATION_FLAG_KEY)) {
    return false;
  }

  // Check if old data exists
  const oldData = localStorage.getItem(OLD_STORAGE_KEY);
  return !!oldData;
}

/**
 * Perform migration from old format to new structure
 */
export async function migrateData(): Promise<{
  success: boolean;
  projectId?: string;
  error?: string;
}> {
  try {
    console.log('🔄 Starting data migration...');

    // Get old data
    const oldDataStr = localStorage.getItem(OLD_STORAGE_KEY);
    if (!oldDataStr) {
      console.log('✅ No old data to migrate');
      localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
      return { success: true };
    }

    const oldData: OldStoreFormat = JSON.parse(oldDataStr);

    // 1. Extract and save preferences
    console.log('📋 Migrating preferences...');
    const preferences = {
      theme: oldData.state.theme || 'dark',
      accentColor: oldData.state.accentColor || '#10b981',
      activeTab: oldData.state.activeTab || 'dashboard',
      collapsedCategories: oldData.state.collapsedCategories || [],
      sidebarCollapsed: false,
    };
    localStorage.setItem('app-preferences', JSON.stringify({ state: preferences, version: 0 }));

    // 2. Extract and save equipment library
    console.log('🛠️ Migrating equipment library...');
    const equipmentLibrary = {
      version: '1.0.0',
      lastUpdated: Date.now(),
      equipmentSpecs: oldData.state.equipmentSpecs || [],
      connectorTypes: oldData.state.connectorTypes || [],
      sourceTypes: oldData.state.sourceTypes || [],
      frameRates: oldData.state.frameRates || [],
      resolutions: oldData.state.resolutions || [],
      customEquipment: [],
    };
    localStorage.setItem('equipment-library', JSON.stringify({ state: equipmentLibrary, version: 0 }));

    // 3. Create project from old data
    console.log('📦 Creating project from old data...');
    
    // Generate a name for the migrated project
    const projectName = oldData.state.production?.showName || 'Migrated Project';
    const client = oldData.state.production?.client || 'Migrated';
    
    const project: VideoDepProject = {
      version: '1.0.0',
      created: Date.now(),
      modified: Date.now(),
      production: oldData.state.production || {
        id: uuidv4(),
        client,
        showName: projectName,
        venue: '',
        room: '',
        loadIn: new Date().toISOString().split('T')[0],
        loadOut: new Date().toISOString().split('T')[0],
      },
      sources: oldData.state.sources || [],
      sends: oldData.state.sends || [],
      checklist: oldData.state.checklist || [],
      ledScreens: oldData.state.ledScreens || [],
      projectionScreens: oldData.state.projectionScreens || [],
      computers: [], // New field
      ccus: oldData.state.ccus || [],
      cameras: oldData.state.cameras || [],
      mediaServers: oldData.state.mediaServers || [],
      mediaServerLayers: oldData.state.mediaServerLayers || [],
      videoSwitchers: oldData.state.videoSwitchers || [],
      routers: [],
      serverAllocations: oldData.state.serverAllocations || [],
      ipAddresses: oldData.state.ipAddresses || [],
      cableSnakes: [],
      presets: [],
      usedEquipmentIds: [],
    };

    // Ensure production has ID
    if (!project.production.id) {
      project.production.id = uuidv4();
    }

    // Save to IndexedDB
    const projectId = uuidv4();
    await projectDB.createProject({ ...project, id: projectId } as any);
    console.log(`✅ Created project: ${projectId}`);

    // 4. Mark as migrated
    localStorage.setItem(MIGRATION_FLAG_KEY, 'true');

    // 5. Backup old data (don't delete it yet, just in case)
    localStorage.setItem(`${OLD_STORAGE_KEY}-backup`, oldDataStr);
    console.log('💾 Backed up old data');

    console.log('🎉 Migration completed successfully!');
    return { success: true, projectId };

  } catch (error) {
    console.error('❌ Migration failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Reset migration flag (for testing)
 */
export function resetMigrationFlag(): void {
  localStorage.removeItem(MIGRATION_FLAG_KEY);
  console.log('🔄 Migration flag reset');
}

/**
 * Restore backed up data (if migration went wrong)
 */
export function restoreBackup(): boolean {
  try {
    const backup = localStorage.getItem(`${OLD_STORAGE_KEY}-backup`);
    if (!backup) {
      console.log('No backup found');
      return false;
    }

    localStorage.setItem(OLD_STORAGE_KEY, backup);
    localStorage.removeItem(MIGRATION_FLAG_KEY);
    console.log('✅ Backup restored');
    return true;
  } catch (error) {
    console.error('Failed to restore backup:', error);
    return false;
  }
}

/**
 * Clean up after successful migration (delete old data)
 */
export function cleanupOldData(): void {
  localStorage.removeItem(OLD_STORAGE_KEY);
  localStorage.removeItem(`${OLD_STORAGE_KEY}-backup`);
  console.log('🧹 Old data cleaned up');
}

/**
 * Get migration status
 */
export function getMigrationStatus(): {
  isMigrated: boolean;
  hasOldData: boolean;
  hasBackup: boolean;
} {
  return {
    isMigrated: !!localStorage.getItem(MIGRATION_FLAG_KEY),
    hasOldData: !!localStorage.getItem(OLD_STORAGE_KEY),
    hasBackup: !!localStorage.getItem(`${OLD_STORAGE_KEY}-backup`),
  };
}
