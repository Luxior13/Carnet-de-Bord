import 'server-only';

// Import the singleton prisma instance from the database package
// This ensures proper typing for all Prisma models without casting
export { prisma } from '@repo/database';
