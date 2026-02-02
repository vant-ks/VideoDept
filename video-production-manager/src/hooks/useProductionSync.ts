import { useEffect } from 'react';
import { useProjectStore } from './useProjectStore';
import { useWebSocket, useProductionRoom } from './useWebSocket';
import { projectDB } from '@/utils/indexedDB';

/**
 * Hook to enable real-time production updates via WebSocket
 * Auto-merges incoming field changes from other users
 */
export function useProductionSync() {
  const { activeProject, activeProjectId, isSaving } = useProjectStore();
  const { subscribe, isConnected } = useWebSocket();
  
  // Join production room when active project changes
  useProductionRoom(activeProject?.production?.id);

  useEffect(() => {
    if (!activeProject?.production?.id || !isConnected) return;

    const productionId = activeProject.production.id;
    const currentUserId = localStorage.getItem('user_id') || 'anonymous';

    console.log('🔄 Setting up real-time sync for production:', productionId);

    // Subscribe to production updates
    const unsubscribe = subscribe('production:updated', async (updatedProduction: any) => {
      // Ignore updates from our own saves
      if (updatedProduction.lastModifiedBy === currentUserId) {
        console.log('🔄 Ignoring own update');
        return;
      }

      // Ignore if this isn't the active production
      if (updatedProduction.id !== productionId) {
        console.log('🔄 Ignoring update for different production');
        return;
      }

      // Ignore if we're currently saving (prevents race condition)
      if (isSaving) {
        console.log('🔄 Ignoring update during save');
        return;
      }

      console.log('📥 Received production update from another user:', {
        from: updatedProduction.lastModifiedBy,
        version: updatedProduction.version,
        fieldVersions: updatedProduction.field_versions
      });

      const store = useProjectStore.getState();
      const currentProject = store.activeProject;

      if (!currentProject) return;

      // Check if incoming version is newer
      const currentVersion = currentProject.version || 1;
      const incomingVersion = updatedProduction.version;

      if (incomingVersion <= currentVersion) {
        console.log('🔄 Ignoring older or same version update');
        return;
      }

      // Auto-merge: Update production fields with incoming data
      const mergedProject = {
        ...currentProject,
        version: incomingVersion,
        production: {
          ...currentProject.production,
          client: updatedProduction.client,
          showName: updatedProduction.show_name || updatedProduction.name,
          venue: updatedProduction.venue,
          room: updatedProduction.room,
          loadIn: updatedProduction.load_in,
          loadOut: updatedProduction.load_out,
          showInfoUrl: updatedProduction.show_info_url,
          status: updatedProduction.status,
          fieldVersions: updatedProduction.field_versions
        },
        modified: Date.now()
      };

      // Update local state
      store.updateActiveProject(mergedProject as any);

      // Update IndexedDB cache
      if (activeProjectId) {
        await projectDB.updateProject(activeProjectId, mergedProject);
      }

      console.log('✅ Auto-merged production update from another user');
    });

    return () => {
      unsubscribe();
    };
  }, [activeProject?.production?.id, isConnected, subscribe, isSaving, activeProjectId]);
}
