/**
 * Rollback Script: Remove hierarchy and performance data
 * 
 * Use this to rollback the data migration if needed.
 * WARNING: This will delete all TeamHierarchy and PerformanceSnapshot records.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function rollbackHierarchyMigration() {
  const dryRun = process.argv.includes('--dry-run');

  console.log(`Running rollback${dryRun ? ' (DRY RUN)' : ''}...`);

  // Count records before deletion
  const hierarchyCount = await prisma.teamHierarchy.count();
  const snapshotCount = await prisma.performanceSnapshot.count();

  console.log(`Records to be deleted:`);
  console.log(`  TeamHierarchy: ${hierarchyCount}`);
  console.log(`  PerformanceSnapshot: ${snapshotCount}`);

  if (dryRun) {
    console.log('\nDry run complete. No records were deleted.');
    return;
  }

  // Confirm deletion
  if (!process.argv.includes('--confirm')) {
    console.error('\nERROR: Must pass --confirm flag to execute rollback');
    console.error('Usage: ts-node 04_rollback_hierarchy_migration.ts --confirm');
    process.exit(1);
  }

  console.log('\nExecuting rollback...');

  // Delete performance snapshots first (no FK dependencies)
  const deletedSnapshots = await prisma.performanceSnapshot.deleteMany({});
  console.log(`Deleted ${deletedSnapshots.count} performance snapshots`);

  // Delete team hierarchy records
  const deletedHierarchies = await prisma.teamHierarchy.deleteMany({});
  console.log(`Deleted ${deletedHierarchies.count} hierarchy records`);

  console.log('\nRollback complete.');
}

rollbackHierarchyMigration()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
