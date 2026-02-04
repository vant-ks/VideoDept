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
        from: updatedProduction.lastModifiedBy || updatedProduction.last_modified_by,
        version: updatedProduction.version,
        fieldVersions: updatedProduction.field_versions,
        productionId: updatedProduction.id
      });

      const store = useProjectStore.getState();
      const currentProject = store.activeProject;

      if (!currentProject) {
        console.log('🔄 No active project, ignoring update');
        return;
      }

      // Check if incoming version is newer
      const currentVersion = currentProject.version || 1;
      const incomingVersion = updatedProduction.version;

      console.log('📊 Version check:', {
        current: currentVersion,
        incoming: incomingVersion,
        currentProductionId: currentProject.production.id,
        incomingProductionId: updatedProduction.id
      });

      if (incomingVersion <= currentVersion) {
        console.log('🔄 Ignoring older or same version update');
        return;
      }

      // Auto-merge: Update production fields with incoming data
      console.log('🔀 Merging incoming data:', {
        currentClient: currentProject.production?.client,
        incomingClient: updatedProduction.client,
        currentVersion,
        incomingVersion
      });

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

      console.log('🔀 Merged project data:', mergedProject.production);

      // Update local state - use setState directly to force re-render
      useProjectStore.setState({ 
        activeProject: mergedProject as any 
      });
      
      console.log('🔀 After update, store state:', {
        version: useProjectStore.getState().activeProject?.version,
        client: useProjectStore.getState().activeProject?.production?.client
      });

      // Update IndexedDB cache
      if (activeProjectId) {
        await projectDB.updateProject(activeProjectId, mergedProject);
      }

      console.log('✅ Auto-merged production update from another user');
    });

    // Subscribe to entity creation events
    const unsubscribeEntityCreated = subscribe('checklist-item:created', async (data: any) => {
      console.log('📥 Received checklist-item:created', data);
      const store = useProjectStore.getState();
      const currentProject = store.activeProject;
      
      if (!currentProject || currentProject.production.id !== productionId) return;
      
      // Add the new item to checklist
      const newItem = {
        id: data.id,
        item: data.title,
        title: data.title,
        category: data.category,
        completed: data.completed || false,
        moreInfo: data.more_info,
        completionNote: data.completion_note,
        assignedTo: data.assigned_to,
        dueDate: data.due_date,
        completionDate: data.completion_date,
        completedAt: data.completed_at,
        reference: data.reference,
        daysBeforeShow: data.days_before_show
      };
      
      // Check if item already exists (prevent duplicates)
      if (currentProject.checklist.some(item => item.id === newItem.id)) {
        console.log('🔄 Item already exists, skipping');
        return;
      }
      
      const updatedProject = {
        ...currentProject,
        checklist: [...currentProject.checklist, newItem]
      };
      
      useProjectStore.setState({ activeProject: updatedProject as any });
      
      if (activeProjectId) {
        await projectDB.updateProject(activeProjectId, updatedProject);
      }
      
      console.log('✅ Added new checklist item from sync');
    });

    // Subscribe to entity update events
    const unsubscribeEntityUpdated = subscribe('checklist-item:updated', async (data: any) => {
      console.log('📥 Received checklist-item:updated', data);
      const store = useProjectStore.getState();
      const currentProject = store.activeProject;
      
      if (!currentProject || currentProject.production.id !== productionId) return;
      
      const updatedItem = {
        id: data.id,
        item: data.title,
        title: data.title,
        category: data.category,
        completed: data.completed,
        moreInfo: data.more_info,
        completionNote: data.completion_note,
        assignedTo: data.assigned_to,
        dueDate: data.due_date,
        completionDate: data.completion_date,
        completedAt: data.completed_at,
        reference: data.reference,
        daysBeforeShow: data.days_before_show
      };
      
      const updatedProject = {
        ...currentProject,
        checklist: currentProject.checklist.map(item =>
          item.id === data.id ? { ...item, ...updatedItem } : item
        )
      };
      
      useProjectStore.setState({ activeProject: updatedProject as any });
      
      if (activeProjectId) {
        await projectDB.updateProject(activeProjectId, updatedProject);
      }
      
      console.log('✅ Updated checklist item from sync');
    });

    // Subscribe to entity deletion events
    const unsubscribeEntityDeleted = subscribe('checklist-item:deleted', async (data: any) => {
      console.log('📥 Received checklist-item:deleted', data);
      const store = useProjectStore.getState();
      const currentProject = store.activeProject;
      
      if (!currentProject || currentProject.production.id !== productionId) return;
      
      const updatedProject = {
        ...currentProject,
        checklist: currentProject.checklist.filter(item => item.id !== data.id)
      };
      
      useProjectStore.setState({ activeProject: updatedProject as any });
      
      if (activeProjectId) {
        await projectDB.updateProject(activeProjectId, updatedProject);
      }
      
      console.log('✅ Deleted checklist item from sync');
    });

    return () => {
      unsubscribe();
      unsubscribeEntityCreated();
      unsubscribeEntityUpdated();
      unsubscribeEntityDeleted();
    };
  }, [activeProject?.production?.id, isConnected, subscribe, isSaving, activeProjectId]);
}
