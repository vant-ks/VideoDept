/**
 * Frontend Logging Utility
 * 
 * Three-tier logging for user-facing application:
 * 1. DEBUG - Development troubleshooting (only in dev mode)
 * 2. INFO - User action tracking and feedback
 * 3. ERROR - Error tracking and user-friendly messages
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  ERROR = 'ERROR'
}

export enum LogContext {
  API = 'API',
  UI = 'UI',
  SYNC = 'SYNC',
  STORAGE = 'STORAGE',
  WEBSOCKET = 'WS',
  VALIDATION = 'VALID'
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: LogContext;
  message: string;
  data?: any;
  error?: Error;
}

class FrontendLogger {
  private static instance: FrontendLogger;
  private isDev: boolean;
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 100;

  private constructor() {
    this.isDev = import.meta.env.MODE === 'development';
  }

  static getInstance(): FrontendLogger {
    if (!FrontendLogger.instance) {
      FrontendLogger.instance = new FrontendLogger();
    }
    return FrontendLogger.instance;
  }

  /**
   * Get emoji for visual identification
   */
  private getEmoji(level: LogLevel, context: LogContext): string {
    if (level === LogLevel.ERROR) return '❌';
    if (level === LogLevel.INFO) {
      switch (context) {
        case LogContext.API: return '🔌';
        case LogContext.UI: return '🖱️';
        case LogContext.SYNC: return '🔄';
        case LogContext.STORAGE: return '💾';
        case LogContext.WEBSOCKET: return '🔌';
        case LogContext.VALIDATION: return '✓';
        default: return 'ℹ️';
      }
    }
    return '🔍'; // DEBUG
  }

  /**
   * Format log message
   */
  private formatMessage(level: LogLevel, context: LogContext, message: string, data?: any): string {
    const emoji = this.getEmoji(level, context);
    let formatted = `${emoji} [${context}] ${message}`;
    
    if (data && Object.keys(data).length > 0) {
      const dataStr = Object.entries(data)
        .filter(([_, v]) => v !== undefined && v !== null)
        .map(([k, v]) => {
          if (typeof v === 'object' && !Array.isArray(v)) {
            return `${k}={...}`;
          }
          return `${k}=${JSON.stringify(v)}`;
        })
        .join(', ');
      if (dataStr) formatted += ` {${dataStr}}`;
    }
    
    return formatted;
  }

  /**
   * Log to buffer for debugging
   */
  private addToBuffer(entry: LogEntry) {
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }
  }

  /**
   * DEBUG level - Development only, detailed troubleshooting
   */
  debug(context: LogContext, message: string, data?: any) {
    if (!this.isDev) return;
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.DEBUG,
      context,
      message,
      data
    };
    
    this.addToBuffer(entry);
    console.log(this.formatMessage(LogLevel.DEBUG, context, message, data));
  }

  /**
   * INFO level - User actions and system feedback
   */
  info(context: LogContext, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      context,
      message,
      data
    };
    
    this.addToBuffer(entry);
    console.log(this.formatMessage(LogLevel.INFO, context, message, data));
  }

  /**
   * ERROR level - Errors with context
   */
  error(context: LogContext, message: string, error?: Error, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      context,
      message,
      data,
      error
    };
    
    this.addToBuffer(entry);
    
    console.error(this.formatMessage(LogLevel.ERROR, context, message, data));
    if (error) {
      console.error('Error details:', error);
    }
  }

  /**
   * API request logging
   */
  logApiRequest(method: string, url: string, data?: any) {
    this.debug(LogContext.API, `${method} ${url}`, data);
  }

  /**
   * API response logging
   */
  logApiResponse(method: string, url: string, status: number, duration: number, data?: any) {
    if (status >= 400) {
      this.error(LogContext.API, `${method} ${url} - ${status}`, undefined, { duration, ...data });
    } else {
      this.info(LogContext.API, `${method} ${url} - ${status}`, { duration, ...data });
    }
  }

  /**
   * User action logging
   */
  logUserAction(action: string, details?: any) {
    this.info(LogContext.UI, action, details);
  }

  /**
   * Sync operation logging
   */
  logSync(operation: string, direction: 'up' | 'down' | 'conflict', itemCount?: number) {
    this.info(LogContext.SYNC, `${direction.toUpperCase()}: ${operation}`, { itemCount });
  }

  /**
   * Storage operation logging
   */
  logStorage(operation: string, store: string, success: boolean, details?: any) {
    if (success) {
      this.debug(LogContext.STORAGE, `${operation} ${store}`, details);
    } else {
      this.error(LogContext.STORAGE, `${operation} ${store} failed`, undefined, details);
    }
  }

  /**
   * WebSocket event logging
   */
  logWsEvent(event: string, data?: any) {
    this.debug(LogContext.WEBSOCKET, event, data);
  }

  /**
   * Validation logging
   */
  logValidation(field: string, valid: boolean, message?: string) {
    if (valid) {
      this.debug(LogContext.VALIDATION, `${field} valid`);
    } else {
      this.error(LogContext.VALIDATION, `${field} invalid: ${message}`);
    }
  }

  /**
   * Get recent logs (for debugging)
   */
  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logBuffer.slice(-count);
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logBuffer, null, 2);
  }

  /**
   * Clear log buffer
   */
  clearLogs() {
    this.logBuffer = [];
  }
}

// Export singleton
export const logger = FrontendLogger.getInstance();

// Export convenience functions
export const logApiRequest = (method: string, url: string, data?: any) => 
  logger.logApiRequest(method, url, data);

export const logApiResponse = (method: string, url: string, status: number, duration: number, data?: any) => 
  logger.logApiResponse(method, url, status, duration, data);

export const logUserAction = (action: string, details?: any) => 
  logger.logUserAction(action, details);

export const logSync = (operation: string, direction: 'up' | 'down' | 'conflict', itemCount?: number) => 
  logger.logSync(operation, direction, itemCount);

export const logStorage = (operation: string, store: string, success: boolean, details?: any) => 
  logger.logStorage(operation, store, success, details);

export const logWsEvent = (event: string, data?: any) => 
  logger.logWsEvent(event, data);

export const logValidation = (field: string, valid: boolean, message?: string) => 
  logger.logValidation(field, valid, message);
