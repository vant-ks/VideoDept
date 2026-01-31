/**
 * Jest Test Setup
 * Runs before all tests to configure test environment
 */

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3010';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db';
