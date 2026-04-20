/**
 * Data Migration: Create initial performance snapshots for existing users
 * 
 * Calculates and stores initial performance metrics for all active users
 * based on their existing task history.
 */

import { PrismaClient, TaskStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function createInitialPerformanceSnapshots() {
  console.log('Creating initial performance snapshots...');

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, role: true },
  });

  console.log(`Processing ${users.length} users...`);

  const snapshotDate = new Date();
  snapshotDate.setHours(0, 0, 0, 0);

  let created = 0;
  let skipped = 0;

  for (const user of users) {
    // Check if snapshot already exists for today
    const existing = await prisma.performanceSnapshot.findUnique({
      where: { userId_snapshotDate: { userId: user.id, snapshotDate } },
    });

    if (existing) {
      skipped++;
      continue;
    }

    // Get tasks for this user (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const tasks = await prisma.task.findMany({
      where: {
        assignedTo: user.id,
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED);
    const overdueTasks = tasks.filter(
      t => t.dueDate && t.dueDate < new Date() && t.status !== TaskStatus.COMPLETED
    );

    // Calculate completion rate
    const taskCompletionRate = totalTasks > 0
      ? (completedTasks.length / totalTasks) * 100
      : 0;

    // Calculate average response time (hours from creation to completion)
    let averageResponseTime = 0;
    if (completedTasks.length > 0) {
      const responseTimes = completedTasks
        .filter(t => t.completedAt)
        .map(t => {
          const diffMs = t.completedAt!.getTime() - t.createdAt.getTime();
          return diffMs / (1000 * 60 * 60); // Convert to hours
        });

      if (responseTimes.length > 0) {
        averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      }
    }

    // Quality score: based on completion rate and overdue ratio (0-10 scale)
    const overdueRatio = totalTasks > 0 ? overdueTasks.length / totalTasks : 0;
    const qualityScore = Math.max(0, Math.min(10,
      (taskCompletionRate / 10) * (1 - overdueRatio)
    ));

    await prisma.performanceSnapshot.create({
      data: {
        userId: user.id,
        snapshotDate,
        taskCompletionRate: Math.round(taskCompletionRate * 100) / 100,
        averageResponseTime: Math.round(averageResponseTime * 100) / 100,
        overdueTaskCount: overdueTasks.length,
        qualityScore: Math.round(qualityScore * 100) / 100,
        calculatedAt: new Date(),
      },
    });

    created++;
    console.log(`Created snapshot for ${user.name} (${user.role}): completion=${taskCompletionRate.toFixed(1)}%, overdue=${overdueTasks.length}`);
  }

  console.log(`\nPerformance snapshots complete. Created: ${created}, Skipped (already exist): ${skipped}`);
}

createInitialPerformanceSnapshots()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
