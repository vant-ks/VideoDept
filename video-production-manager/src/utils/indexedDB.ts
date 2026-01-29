/**
 * IndexedDB Wrapper for Project Storage
 * Acts as local "cloud" database for development
 * Will be replaced with real API calls in production
 */

import type { VideoDepProject, ChangeRecord } from '@/types';

const DB_NAME = 'VideoDeptDB';
const DB_VERSION = 1;
const PROJECTS_STORE = 'projects';
const CHANGES_STORE = 'changes';

interface DBSchema {
  projects: VideoDepProject & { id: string };
  changes: ChangeRecord;
}

class ProjectDatabase {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Projects store
        if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
          const projectStore = db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
          projectStore.createIndex('modified', 'modified', { unique: false });
          projectStore.createIndex('clientShowName', ['production.client', 'production.showName'], { unique: false });
        }

        // Changes store (for sync tracking)
        if (!db.objectStoreNames.contains(CHANGES_STORE)) {
          const changesStore = db.createObjectStore(CHANGES_STORE, { keyPath: 'id' });
          changesStore.createIndex('timestamp', 'timestamp', { unique: false });
          changesStore.createIndex('projectId', 'projectId', { unique: false });
        }
      };
    });
  }

  private getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): IDBObjectStore {
    if (!this.db) throw new Error('Database not initialized');
    const tx = this.db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  // Project CRUD Operations

  async getAllProjects(): Promise<VideoDepProject[]> {
    // Ensure DB is initialized
    if (!this.db) {
      await this.init();
    }
    const store = this.getStore(PROJECTS_STORE);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getProject(id: string): Promise<VideoDepProject | undefined> {
    // Ensure DB is initialized
    if (!this.db) {
      await this.init();
    }
    const store = this.getStore(PROJECTS_STORE);
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async createProject(project: VideoDepProject): Promise<void> {
    // Ensure DB is initialized
    if (!this.db) {
      await this.init();
    }
    const store = this.getStore(PROJECTS_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.add(project);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateProject(id: string, updates: Partial<VideoDepProject>): Promise<void> {
    const store = this.getStore(PROJECTS_STORE, 'readwrite');
    return new Promise(async (resolve, reject) => {
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const project = getRequest.result;
        if (!project) {
          reject(new Error('Project not found'));
          return;
        }

        const updated = { 
          ...project, 
          ...updates, 
          modified: Date.now() 
        };
        const putRequest = store.put(updated);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async deleteProject(id: string): Promise<void> {
    const store = this.getStore(PROJECTS_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Change Tracking (for sync)

  async recordChange(change: ChangeRecord): Promise<void> {
    const store = this.getStore(CHANGES_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.add(change);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getChangesSince(timestamp: number, projectId?: string): Promise<ChangeRecord[]> {
    const store = this.getStore(CHANGES_STORE);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        let changes = request.result.filter((c: ChangeRecord) => c.timestamp > timestamp);
        if (projectId) {
          changes = changes.filter((c: any) => c.projectId === projectId);
        }
        resolve(changes);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearOldChanges(olderThan: number): Promise<void> {
    const store = this.getStore(CHANGES_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.openCursor();
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          if (cursor.value.timestamp < olderThan) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton instance
export const projectDB = new ProjectDatabase();

// Initialize on module load
projectDB.init().catch(console.error);
