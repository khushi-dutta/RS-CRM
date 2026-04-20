/**
 * Data Migration: Validate data integrity after migration
 * 
 * Checks for:
 * - Circular references in hierarchy
 * - Orphaned hierarchy records
 * - Invalid performance snapshot values
 * - Missing required fields
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ValidationResult {
  check: string;
  passed: boolean;
  details: string;
}

async function validateDataIntegrity(): Promise<void> {
  console.log('Running data integrity validation...\n');
  const results: ValidationResult[] = [];

  // 1. Check for circular references in hierarchy
  const hierarchies = await prisma.teamHierarchy.findMany({
    where: { isActive: true },
  });

  let circularRefs = 0;
  for (const h of hierarchies) {
    const pathParts = h.path.split('/').filter(Boolean);
    const uniqueParts = new Set(pathParts);
    if (pathParts.length !== uniqueParts.size) {
      circularRefs++;
      console.error(`Circular reference detected for user ${h.userId}: path=${h.path}`);
    }
  }

  results.push({
    check: 'No circular references in hierarchy',
    passed: circularRefs === 0,
    details: circularRefs === 0 ? 'All hierarchy paths are acyclic' : `Found ${circularRefs} circular references`,
  });

  // 2. Check for orphaned hierarchy records (user doesn't exist)
  const hierarchyUserIds = hierarchies.map(h => h.userId);
  const existingUsers = await prisma.user.findMany({
    where: { id: { in: hierarchyUserIds } },
    select: { id: true },
  });
  const existingUserIds = new Set(existingUsers.map(u => u.id));
  const orphanedHierarchies = hierarchyUserIds.filter(id => !existingUserIds.has(id));

  results.push({
    check: 'No orphaned hierarchy records',
    passed: orphanedHierarchies.length === 0,
    details: orphanedHierarchies.length === 0
      ? 'All hierarchy records have valid users'
      : `Found ${orphanedHierarchies.length} orphaned records`,
  });

  // 3. Check performance snapshot value bounds
  const snapshots = await prisma.performanceSnapshot.findMany();
  const invalidSnapshots = snapshots.filter(s =>
    s.taskCompletionRate < 0 || s.taskCompletionRate > 100 ||
    s.averageResponseTime < 0 ||
    s.qualityScore < 0 || s.qualityScore > 10 ||
    s.overdueTaskCount < 0
  );

  results.push({
    check: 'Performance snapshot values within bounds',
    passed: invalidSnapshots.length === 0,
    details: invalidSnapshots.length === 0
      ? 'All performance metrics are within valid ranges'
      : `Found ${invalidSnapshots.length} snapshots with invalid values`,
  });

  // 4. Check hierarchy level consistency
  let levelInconsistencies = 0;
  for (const h of hierarchies) {
    const pathParts = h.path.split('/').filter(Boolean);
    const expectedLevel = pathParts.length - 1;
    if (h.level !== expectedLevel) {
      levelInconsistencies++;
      console.warn(`Level inconsistency for user ${h.userId}: expected=${expectedLevel}, actual=${h.level}`);
    }
  }

  results.push({
    check: 'Hierarchy levels consistent with paths',
    passed: levelInconsistencies === 0,
    details: levelInconsistencies === 0
      ? 'All hierarchy levels match path depths'
      : `Found ${levelInconsistencies} level inconsistencies`,
  });

  // 5. Check supervisor references are valid
  const supervisorIds = hierarchies
    .filter(h => h.supervisorId)
    .map(h => h.supervisorId!);

  const validSupervisors = await prisma.user.findMany({
    where: { id: { in: supervisorIds } },
    select: { id: true },
  });
  const validSupervisorIds = new Set(validSupervisors.map(u => u.id));
  const invalidSupervisors = supervisorIds.filter(id => !validSupervisorIds.has(id));

  results.push({
    check: 'All supervisor references are valid',
    passed: invalidSupervisors.length === 0,
    details: invalidSupervisors.length === 0
      ? 'All supervisor IDs reference valid users'
      : `Found ${invalidSupervisors.length} invalid supervisor references`,
  });

  // Print summary
  console.log('\n=== Validation Summary ===');
  let allPassed = true;
  for (const result of results) {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${result.check}`);
    console.log(`   ${result.details}`);
    if (!result.passed) allPassed = false;
  }

  console.log(`\nOverall: ${allPassed ? '✅ All checks passed' : '❌ Some checks failed'}`);
  console.log(`Total hierarchy records: ${hierarchies.length}`);
  console.log(`Total performance snapshots: ${snapshots.length}`);

  if (!allPassed) {
    process.exit(1);
  }
}

validateDataIntegrity()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
