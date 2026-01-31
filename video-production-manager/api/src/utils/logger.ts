/**
 * Comprehensive Logging System for Video Production Manager
 * 
 * Three-tier logging approach:
 * 1. ADMIN Level - Debug/troubleshooting (development & production debugging)
 * 2. MANAGER Level - Monitoring (operational oversight, performance tracking)
 * 3. TECHNICIAN Level - User feedback (end-user visible feedback)
 */

export enum LogLevel {
  ADMIN = 'ADMIN',       // Detailed technical debugging
  MANAGER = 'MANAGER',   // Operational monitoring
  TECHNICIAN = 'TECH',   // User-visible feedback
  ERROR = 'ERROR'        // Error tracking (all levels)
}

export enum LogCategory {
  API = 'API',
  DATABASE = 'DB',
  WEBSOCKET = 'WS',
  SYNC = 'SYNC',
  AUTH = 'AUTH',
  VALIDATION = 'VALID',
  PERFORMANCE = 'PERF'
}

interface LogContext {
  requestId?: string;
  userId?: string;
  userName?: string;
  productionId?: string;
  duration?: number;
  [key: string]: any;
}

class Logger {
  private static instance: Logger;
  private enabledLevels: Set<LogLevel>;
  private requestIdCounter = 0;

  private constructor() {
    // Default: all levels enabled in development
    const isDev = process.env.NODE_ENV !== 'production';
    this.enabledLevels = isDev 
      ? new Set([LogLevel.ADMIN, LogLevel.MANAGER, LogLevel.TECHNICIAN, LogLevel.ERROR])
      : new Set([LogLevel.MANAGER, LogLevel.ERROR]); // Production: only monitoring and errors
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Generate a unique request ID for tracing
   */
  generateRequestId(): string {
    return `req_${Date.now()}_${++this.requestIdCounter}`;
  }

  /**
   * Format log message with metadata
   */
  private formatLog(
    level: LogLevel,
    category: LogCategory,
    message: string,
    context?: LogContext
  ): string {
    const timestamp = new Date().toISOString();
    const emoji = this.getEmoji(level, category);
    
    let logParts = [`[${timestamp}]`, `${emoji} ${level}`, `[${category}]`, message];
    
    if (context && Object.keys(context).length > 0) {
      const contextStr = Object.entries(context)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
        .join(' ');
      if (contextStr) logParts.push(`{${contextStr}}`);
    }
    
    return logParts.join(' ');
  }

  /**
   * Get emoji based on level and category
   */
  private getEmoji(level: LogLevel, category: LogCategory): string {
    if (level === LogLevel.ERROR) return '❌';
    
    switch (category) {
      case LogCategory.API: return '🔌';
      case LogCategory.DATABASE: return '💾';
      case LogCategory.WEBSOCKET: return '🔌';
      case LogCategory.SYNC: return '🔄';
      case LogCategory.AUTH: return '🔐';
      case LogCategory.VALIDATION: return '✓';
      case LogCategory.PERFORMANCE: return '⚡';
      default: return '📝';
    }
  }

  /**
   * ADMIN LEVEL - Detailed debugging information
   * Use for: SQL queries, request/response bodies, internal state changes
   */
  admin(category: LogCategory, message: string, context?: LogContext) {
    if (this.enabledLevels.has(LogLevel.ADMIN)) {
      console.log(this.formatLog(LogLevel.ADMIN, category, message, context));
    }
  }

  /**
   * MANAGER LEVEL - Operational monitoring
   * Use for: Request completion, performance metrics, resource usage
   */
  manager(category: LogCategory, message: string, context?: LogContext) {
    if (this.enabledLevels.has(LogLevel.MANAGER)) {
      console.log(this.formatLog(LogLevel.MANAGER, category, message, context));
    }
  }

  /**
   * TECHNICIAN LEVEL - User feedback
   * Use for: User actions completed, validation feedback, status updates
   */
  tech(category: LogCategory, message: string, context?: LogContext) {
    if (this.enabledLevels.has(LogLevel.TECHNICIAN)) {
      console.log(this.formatLog(LogLevel.TECHNICIAN, category, message, context));
    }
  }

  /**
   * ERROR LEVEL - Error tracking (always logged)
   * Use for: All errors, with full stack traces
   */
  error(category: LogCategory, message: string, error?: Error, context?: LogContext) {
    const fullContext = { ...context };
    if (error) {
      fullContext.error = error.message;
      fullContext.stack = error.stack;
    }
    console.error(this.formatLog(LogLevel.ERROR, category, message, fullContext));
  }

  /**
   * HTTP Request logging helper
   */
  logRequest(method: string, path: string, context?: LogContext) {
    const requestId = this.generateRequestId();
    this.admin(LogCategory.API, `${method} ${path}`, { ...context, requestId });
    return requestId;
  }

  /**
   * HTTP Response logging helper
   */
  logResponse(method: string, path: string, statusCode: number, duration: number, context?: LogContext) {
    const level = statusCode >= 400 ? LogLevel.ERROR : LogLevel.MANAGER;
    const category = LogCategory.API;
    
    if (level === LogLevel.ERROR) {
      this.error(category, `${method} ${path} - ${statusCode}`, undefined, { ...context, duration });
    } else {
      this.manager(category, `${method} ${path} - ${statusCode}`, { ...context, duration });
    }
  }

  /**
   * Database operation logging
   */
  logDbOperation(operation: string, table: string, duration: number, rowCount?: number, context?: LogContext) {
    this.admin(LogCategory.DATABASE, `${operation} ${table}`, { 
      ...context, 
      duration, 
      rowCount 
    });
    
    // Log slow queries at manager level
    if (duration > 1000) {
      this.manager(LogCategory.PERFORMANCE, `Slow query: ${operation} ${table}`, { 
        duration,
        threshold: 1000
      });
    }
  }

  /**
   * WebSocket event logging
   */
  logWsEvent(event: string, room?: string, context?: LogContext) {
    this.admin(LogCategory.WEBSOCKET, event, { ...context, room });
  }

  /**
   * Sync operation logging
   */
  logSync(operation: string, direction: 'UP' | 'DOWN' | 'CONFLICT', itemCount?: number, context?: LogContext) {
    this.manager(LogCategory.SYNC, `${direction} ${operation}`, { ...context, itemCount });
  }

  /**
   * Validation logging
   */
  logValidation(field: string, valid: boolean, message?: string, context?: LogContext) {
    if (valid) {
      this.tech(LogCategory.VALIDATION, `${field} validated`, context);
    } else {
      this.error(LogCategory.VALIDATION, `${field} validation failed: ${message}`, undefined, context);
    }
  }

  /**
   * Performance measurement wrapper
   */
  async measurePerformance<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: LogContext
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.admin(LogCategory.PERFORMANCE, operation, { ...context, duration });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error(LogCategory.PERFORMANCE, `${operation} failed`, error as Error, { ...context, duration });
      throw error;
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export convenience functions
export const logRequest = (method: string, path: string, context?: LogContext) => 
  logger.logRequest(method, path, context);

export const logResponse = (method: string, path: string, statusCode: number, duration: number, context?: LogContext) => 
  logger.logResponse(method, path, statusCode, duration, context);

export const logDbOperation = (operation: string, table: string, duration: number, rowCount?: number, context?: LogContext) => 
  logger.logDbOperation(operation, table, duration, rowCount, context);

export const logWsEvent = (event: string, room?: string, context?: LogContext) => 
  logger.logWsEvent(event, room, context);

export const logSync = (operation: string, direction: 'UP' | 'DOWN' | 'CONFLICT', itemCount?: number, context?: LogContext) => 
  logger.logSync(operation, direction, itemCount, context);
