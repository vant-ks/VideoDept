/**
 * Log Service
 * Tracks changes to settings and equipment for audit trail
 */

export interface LogEntry {
  id: string;
  timestamp: string;
  category: 'settings' | 'equipment' | 'general' | 'debug';
  action: 'add' | 'update' | 'delete' | 'reorder';
  entityType: string;
  entityId?: string;
  entityName?: string;
  details: string;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}

class LogService {
  private static readonly STORAGE_KEY = 'production-logs';
  private static readonly MAX_LOGS = 1000;

  /**
   * Add a new log entry
   */
  static log(entry: Omit<LogEntry, 'id' | 'timestamp'>): void {
    const logs = this.getLogs();
    
    const newEntry: LogEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };

    logs.unshift(newEntry);

    // Keep only the most recent entries
    if (logs.length > this.MAX_LOGS) {
      logs.splice(this.MAX_LOGS);
    }

    this.saveLogs(logs);
  }

  /**
   * Log settings change
   */
  static logSettingsChange(
    action: 'add' | 'update' | 'delete' | 'reorder',
    entityType: 'sourceType' | 'connectorType' | 'frameRate' | 'resolution',
    details: string,
    entityName?: string
  ): void {
    this.log({
      category: 'settings',
      action,
      entityType,
      entityName,
      details,
    });
  }

  /**
   * Log equipment change
   */
  static logEquipmentChange(
    action: 'add' | 'update' | 'delete',
    equipmentId: string,
    equipmentName: string,
    details: string,
    changes?: { field: string; oldValue: any; newValue: any }[]
  ): void {
    this.log({
      category: 'equipment',
      action,
      entityType: 'equipment',
      entityId: equipmentId,
      entityName: equipmentName,
      details,
      changes,
    });
  }

  /**
   * Log general change (sources, sends, checklist, etc.)
   */
  static logGeneralChange(
    action: 'add' | 'update' | 'delete' | 'reorder',
    entityType: string,
    entityName: string,
    details: string,
    entityId?: string,
    changes?: { field: string; oldValue: any; newValue: any }[]
  ): void {
    this.log({
      category: 'general',
      action,
      entityType,
      entityId,
      entityName,
      details,
      changes,
    });
  }

  /**
   * Log debug information
   */
  static logDebug(
    entityType: string,
    details: string,
    entityName?: string,
    entityId?: string
  ): void {
    this.log({
      category: 'debug',
      action: 'update',
      entityType,
      entityId,
      entityName,
      details,
    });
  }

  /**
   * Get all logs
   */
  static getLogs(): LogEntry[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load logs:', error);
      return [];
    }
  }

  /**
   * Get logs by category
   */
  static getLogsByCategory(category: LogEntry['category']): LogEntry[] {
    return this.getLogs().filter(log => log.category === category);
  }

  /**
   * Get logs by entity
   */
  static getLogsByEntity(entityType: string, entityId?: string): LogEntry[] {
    const logs = this.getLogs().filter(log => log.entityType === entityType);
    return entityId ? logs.filter(log => log.entityId === entityId) : logs;
  }

  /**
   * Get logs in date range
   */
  static getLogsByDateRange(startDate: Date, endDate: Date): LogEntry[] {
    return this.getLogs().filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= startDate && logDate <= endDate;
    });
  }

  /**
   * Clear all logs
   */
  static clearLogs(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Export logs as JSON
   */
  static exportLogs(): string {
    return JSON.stringify(this.getLogs(), null, 2);
  }

  /**
   * Save logs to localStorage
   */
  private static saveLogs(logs: LogEntry[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to save logs:', error);
    }
  }
}

export default LogService;
