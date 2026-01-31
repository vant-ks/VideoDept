/**
 * Test Helper Utilities
 * Shared functions for testing API routes and database operations
 */

import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

/**
 * Generate a test production record
 */
export function generateTestProduction(overrides?: any) {
  return {
    id: `test-prod-${Date.now()}`,
    client: 'Test Client',
    show_name: 'Test Show',
    venue: 'Test Venue',
    room: 'Main Hall',
    load_in: new Date(),
    load_out: new Date(Date.now() + 86400000), // +1 day
    status: 'PLANNING',
    version: 1,
    updated_at: new Date(),
    ...overrides,
  };
}

/**
 * Create a test production in the database
 */
export async function createTestProduction(data?: any) {
  const production = generateTestProduction(data);
  return await prisma.productions.create({ data: production });
}

/**
 * Clean up test data
 */
export async function cleanupTestProductions(prefix = 'test-prod-') {
  await prisma.productions.deleteMany({
    where: {
      id: {
        startsWith: prefix,
      },
    },
  });
}

/**
 * Mock Express request
 */
export function mockRequest(body?: any, params?: any, query?: any) {
  return {
    body: body || {},
    params: params || {},
    query: query || {},
    headers: {},
  };
}

/**
 * Mock Express response
 */
export function mockResponse() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

/**
 * Cleanup function to run after tests
 */
export async function afterAllTests() {
  await cleanupTestProductions();
  await prisma.$disconnect();
}
