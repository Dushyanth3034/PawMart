import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// Test connection helper
export async function testDbConnection() {
  try {
    await prisma.$connect();
    console.log('Successfully connected to the database.');
  } catch (error) {
    console.error('Failed to connect to the database:', error);
    process.exit(1);
  }
}
