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
        fieldVersions: updatedProduction.fieldVersions,
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
          showName: updatedProduction.showName || updatedProduction.name,
          venue: updatedProduction.venue,
          room: updatedProduction.room,
          loadIn: updatedProduction.loadIn,
          loadOut: updatedProduction.loadOut,
          showInfoUrl: updatedProduction.showInfoUrl,
          status: updatedProduction.status,
          fieldVersions: updatedProduction.fieldVersions
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
      console.log('📥 Received checklist-item:created', data.id);
      const store = useProjectStore.getState();
      const currentProject = store.activeProject;
      
      if (!currentProject || currentProject.production.id !== productionId) return;
      
      // Add the new item to checklist
      // CRITICAL: API already sends camelCase via toCamelCase(), don't map from snake_case
      const newItem = {
        id: data.id,
        item: data.title,
        title: data.title,
        category: data.category || 'NOTES',
        completed: data.completed || false,
        completedAt: data.completedAt,
        moreInfo: data.moreInfo,
        completionNote: data.completionNote,
        daysBeforeShow: data.daysBeforeShow,
        dueDate: data.dueDate,
        completionDate: data.completionDate,
        assignedTo: data.assignedTo,
        reference: data.reference
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
      
      // CRITICAL: API already sends camelCase via toCamelCase(), don't map from snake_case
      const updatedItem = {
        id: data.id,
        item: data.title,
        title: data.title,
        category: data.category || 'NOTES',
        completed: data.completed,
        completedAt: data.completedAt,
        moreInfo: data.moreInfo,
        completionNote: data.completionNote,
        daysBeforeShow: data.daysBeforeShow,
        dueDate: data.dueDate,
        completionDate: data.completionDate,
        assignedTo: data.assignedTo,
        reference: data.reference
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

    // ===== CAMERA EVENTS =====
    const unsubscribeCameraCreated = subscribe('camera:created', async (data: any) => {
      console.log('📥 Received camera:created', data);
      const store = useProjectStore.getState();
      const currentProject = store.activeProject;
      
      if (!currentProject || currentProject.production.id !== productionId) return;
      if (currentProject.cameras.some(c => c.id === data.id)) {
        console.log('🔄 Camera already exists, skipping');
        return;
      }
      
      const updatedProject = {
        ...currentProject,
        cameras: [...currentProject.cameras, data]
      };
      
      useProjectStore.setState({ activeProject: updatedProject as any });
      if (activeProjectId) {
        await projectDB.updateProject(activeProjectId, updatedProject);
      }
      console.log('✅ Added new camera from sync');
    });

    const unsubscribeCameraUpdated = subscribe('camera:updated', async (data: any) => {
      console.log('📥 Received camera:updated', data);
      const store = useProjectStore.getState();
      const currentProject = store.activeProject;
      
      if (!currentProject || currentProject.production.id !== productionId) return;
      
      const updatedProject = {
        ...currentProject,
        cameras: currentProject.cameras.map(c => c.id === data.id ? { ...c, ...data } : c)
      };
      
      useProjectStore.setState({ activeProject: updatedProject as any });
      if (activeProjectId) {
        await projectDB.updateProject(activeProjectId, updatedProject);
      }
      console.log('✅ Updated camera from sync');
    });

    const unsubscribeCameraDeleted = subscribe('camera:deleted', async (data: any) => {
      console.log('📥 Received camera:deleted', data);
      const store = useProjectStore.getState();
      const currentProject = store.activeProject;
      
      if (!currentProject || currentProject.production.id !== productionId) return;
      
      const updatedProject = {
        ...currentProject,
        cameras: currentProject.cameras.filter(c => c.id !== data.id)
      };
      
      useProjectStore.setState({ activeProject: updatedProject as any });
      if (activeProjectId) {
        await projectDB.updateProject(activeProjectId, updatedProject);
      }
      console.log('✅ Deleted camera from sync');
    });

    // ===== CCU EVENTS =====
    const unsubscribeCCUCreated = subscribe('ccu:created', async (data: any) => {
      console.log('📥 Received ccu:created', data);
      const store = useProjectStore.getState();
      const currentProject = store.activeProject;
      
      if (!currentProject || currentProject.production.id !== productionId) return;
      if (currentProject.ccus.some(c => c.id === data.id)) {
        console.log('🔄 CCU already exists, skipping');
        return;
      }
      
      const updatedProject = {
        ...currentProject,
        ccus: [...currentProject.ccus, data]
      };
      
      useProjectStore.setState({ activeProject: updatedProject as any });
      if (activeProjectId) {
        await projectDB.updateProject(activeProjectId, updatedProject);
      }
      console.log('✅ Added new CCU from sync');
    });

    const unsubscribeCCUUpdated = subscribe('ccu:updated', async (data: any) => {
      console.log('📥 Received ccu:updated', data);
      const store = useProjectStore.getState();
      const currentProject = store.activeProject;
      
      if (!currentProject || currentProject.production.id !== productionId) return;
      
      const updatedProject = {
        ...currentProject,
        ccus: currentProject.ccus.map(c => c.id === data.id ? { ...c, ...data } : c)
      };
      
      useProjectStore.setState({ activeProject: updatedProject as any });
      if (activeProjectId) {
        await projectDB.updateProject(activeProjectId, updatedProject);
      }
      console.log('✅ Updated CCU from sync');
    });

    const unsubscribeCCUDeleted = subscribe('ccu:deleted', async (data: any) => {
      console.log('📥 Received ccu:deleted', data);
      const store = useProjectStore.getState();
      const currentProject = store.activeProject;
      
      if (!currentProject || currentProject.production.id !== productionId) return;
      
      const updatedProject = {
        ...currentProject,
        ccus: currentProject.ccus.filter(c => c.id !== data.id)
      };
      
      useProjectStore.setState({ activeProject: updatedProject as any });
      if (activeProjectId) {
        await projectDB.updateProject(activeProjectId, updatedProject);
      }
      console.log('✅ Deleted CCU from sync');
    });

    // ===== SOURCE EVENTS =====
    const unsubscribeSourceCreated = subscribe('source:created', async (data: any) => {
      console.log('📥 Received source:created', data);
      const store = useProjectStore.getState();
      const currentProject = store.activeProject;
      
      if (!currentProject || currentProject.production.id !== productionId) return;
      if (currentProject.sources.some(s => s.id === data.id)) {
        console.log('🔄 Source already exists, skipping');
        return;
      }
      
      const updatedProject = {
        ...currentProject,
        sources: [...currentProject.sources, data]
      };
      
      useProjectStore.setState({ activeProject: updatedProject as any });
      if (activeProjectId) {
        await projectDB.updateProject(activeProjectId, updatedProject);
      }
      console.log('✅ Added new source from sync');
    });

    const unsubscribeSourceUpdated = subscribe('source:updated', async (data: any) => {
      console.log('📥 Received source:updated', data);
      const store = useProjectStore.getState();
      const currentProject = store.activeProject;
      
      if (!currentProject || currentProject.production.id !== productionId) return;
      
      const updatedProject = {
        ...currentProject,
        sources: currentProject.sources.map(s => s.id === data.id ? { ...s, ...data } : s)
      };
      
      useProjectStore.setState({ activeProject: updatedProject as any });
      if (activeProjectId) {
        await projectDB.updateProject(activeProjectId, updatedProject);
      }
      console.log('✅ Updated source from sync');
    });

    const unsubscribeSourceDeleted = subscribe('source:deleted', async (data: any) => {
      console.log('📥 Received source:deleted', data);
      const store = useProjectStore.getState();
      const currentProject = store.activeProject;
      
      if (!currentProject || currentProject.production.id !== productionId) return;
      
      const updatedProject = {
        ...currentProject,
        sources: currentProject.sources.filter(s => s.id !== data.id)
      };
      
      useProjectStore.setState({ activeProject: updatedProject as any });
      if (activeProjectId) {
        await projectDB.updateProject(activeProjectId, updatedProject);
      }
      console.log('✅ Deleted source from sync');
    });

    // ===== SEND EVENTS =====
    const unsubscribeSendCreated = subscribe('send:created', async (data: any) => {
      console.log('📥 Received send:created', data);
      const store = useProjectStore.getState();
      const currentProject = store.activeProject;
      
      if (!currentProject || currentProject.production.id !== productionId) return;
      if (currentProject.sends.some(s => s.id === data.id)) {
        console.log('🔄 Send already exists, skipping');
        return;
      }
      
      const updatedProject = {
        ...currentProject,
        sends: [...currentProject.sends, data]
      };
      
      useProjectStore.setState({ activeProject: updatedProject as any });
      if (activeProjectId) {
        await projectDB.updateProject(activeProjectId, updatedProject);
      }
      console.log('✅ Added new send from sync');
    });

    const unsubscribeSendUpdated = subscribe('send:updated', async (data: any) => {
      console.log('📥 Received send:updated', data);
      const store = useProjectStore.getState();
      const currentProject = store.activeProject;
      
      if (!currentProject || currentProject.production.id !== productionId) return;
      
      const updatedProject = {
        ...currentProject,
        sends: currentProject.sends.map(s => s.id === data.id ? { ...s, ...data } : s)
      };
      
      useProjectStore.setState({ activeProject: updatedProject as any });
      if (activeProjectId) {
        await projectDB.updateProject(activeProjectId, updatedProject);
      }
      console.log('✅ Updated send from sync');
    });

    const unsubscribeSendDeleted = subscribe('send:deleted', async (data: any) => {
      console.log('📥 Received send:deleted', data);
      const store = useProjectStore.getState();
      const currentProject = store.activeProject;
      
      if (!currentProject || currentProject.production.id !== productionId) return;
      
      const updatedProject = {
        ...currentProject,
        sends: currentProject.sends.filter(s => s.id !== data.id)
      };
      
      useProjectStore.setState({ activeProject: updatedProject as any });
      if (activeProjectId) {
        await projectDB.updateProject(activeProjectId, updatedProject);
      }
      console.log('✅ Deleted send from sync');
    });

    return () => {
      unsubscribe();
      unsubscribeEntityCreated();
      unsubscribeEntityUpdated();
      unsubscribeEntityDeleted();
      unsubscribeCameraCreated();
      unsubscribeCameraUpdated();
      unsubscribeCameraDeleted();
      unsubscribeCCUCreated();
      unsubscribeCCUUpdated();
      unsubscribeCCUDeleted();
      unsubscribeSourceCreated();
      unsubscribeSourceUpdated();
      unsubscribeSourceDeleted();
      unsubscribeSendCreated();
      unsubscribeSendUpdated();
      unsubscribeSendDeleted();
    };
  }, [activeProject?.production?.id, isConnected, subscribe, isSaving, activeProjectId]);
}
