/**
 * Data Migration: Populate initial hierarchy from existing roles
 * 
 * This script creates TeamHierarchy records based on existing user roles.
 * Role hierarchy: ADMIN > PROJECT_HEAD > (SALESPERSON, CALLING_STAFF, DOCUMENTATION, WAREHOUSE, INSTALLATION, ACCOUNTANT)
 * DEALER_ADMIN > DEALER_STAFF
 */

import { PrismaClient, RoleType } from '@prisma/client';

const prisma = new PrismaClient();

const ROLE_LEVELS: Record<string, number> = {
  ADMIN: 0,
  PROJECT_HEAD: 1,
  SALESPERSON: 2,
  CALLING_STAFF: 2,
  DOCUMENTATION: 2,
  WAREHOUSE: 2,
  INSTALLATION: 2,
  ACCOUNTANT: 2,
  DEALER_ADMIN: 1,
  DEALER_STAFF: 2,
};

async function populateInitialHierarchy() {
  console.log('Starting initial hierarchy population...');

  const users = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: { role: 'asc' },
  });

  console.log(`Found ${users.length} active users`);

  // Get admin and project head users
  const admins = users.filter(u => u.role === RoleType.ADMIN);
  const projectHeads = users.filter(u => u.role === RoleType.PROJECT_HEAD);
  const dealerAdmins = users.filter(u => u.role === RoleType.DEALER_ADMIN);

  // Create hierarchy for admins (top level)
  for (const admin of admins) {
    await prisma.teamHierarchy.upsert({
      where: { userId: admin.id },
      update: { level: 0, path: `/${admin.id}/`, supervisorId: null },
      create: {
        userId: admin.id,
        supervisorId: null,
        level: 0,
        path: `/${admin.id}/`,
        isActive: true,
      },
    });
    console.log(`Created hierarchy for admin: ${admin.name}`);
  }

  // Create hierarchy for project heads (under first admin)
  const primaryAdmin = admins[0];
  for (const ph of projectHeads) {
    const supervisorId = primaryAdmin?.id || null;
    const level = supervisorId ? 1 : 0;
    const path = supervisorId ? `/${supervisorId}/${ph.id}/` : `/${ph.id}/`;

    await prisma.teamHierarchy.upsert({
      where: { userId: ph.id },
      update: { level, path, supervisorId },
      create: {
        userId: ph.id,
        supervisorId,
        level,
        path,
        isActive: true,
      },
    });
    console.log(`Created hierarchy for project head: ${ph.name}`);
  }

  // Create hierarchy for dealer admins (under first admin)
  for (const da of dealerAdmins) {
    const supervisorId = primaryAdmin?.id || null;
    const level = supervisorId ? 1 : 0;
    const path = supervisorId ? `/${supervisorId}/${da.id}/` : `/${da.id}/`;

    await prisma.teamHierarchy.upsert({
      where: { userId: da.id },
      update: { level, path, supervisorId },
      create: {
        userId: da.id,
        supervisorId,
        level,
        path,
        isActive: true,
      },
    });
    console.log(`Created hierarchy for dealer admin: ${da.name}`);
  }

  // Create hierarchy for team members (under first project head)
  const primaryProjectHead = projectHeads[0];
  const teamMemberRoles = [
    RoleType.SALESPERSON,
    RoleType.CALLING_STAFF,
    RoleType.DOCUMENTATION,
    RoleType.WAREHOUSE,
    RoleType.INSTALLATION,
    RoleType.ACCOUNTANT,
  ];

  const teamMembers = users.filter(u => teamMemberRoles.includes(u.role));
  for (const member of teamMembers) {
    const supervisorId = primaryProjectHead?.id || primaryAdmin?.id || null;
    const supervisorHierarchy = supervisorId
      ? await prisma.teamHierarchy.findUnique({ where: { userId: supervisorId } })
      : null;

    const level = supervisorHierarchy ? supervisorHierarchy.level + 1 : 0;
    const path = supervisorHierarchy
      ? `${supervisorHierarchy.path}${member.id}/`
      : `/${member.id}/`;

    await prisma.teamHierarchy.upsert({
      where: { userId: member.id },
      update: { level, path, supervisorId },
      create: {
        userId: member.id,
        supervisorId,
        level,
        path,
        isActive: true,
      },
    });
    console.log(`Created hierarchy for ${member.role}: ${member.name}`);
  }

  // Create hierarchy for dealer staff (under their dealer admin)
  const dealerStaff = users.filter(u => u.role === RoleType.DEALER_STAFF);
  for (const staff of dealerStaff) {
    // Find dealer admin for this staff member
    const dealerAdmin = staff.dealerId
      ? dealerAdmins.find(da => da.dealerId === staff.dealerId)
      : dealerAdmins[0];

    const supervisorId = dealerAdmin?.id || null;
    const supervisorHierarchy = supervisorId
      ? await prisma.teamHierarchy.findUnique({ where: { userId: supervisorId } })
      : null;

    const level = supervisorHierarchy ? supervisorHierarchy.level + 1 : 0;
    const path = supervisorHierarchy
      ? `${supervisorHierarchy.path}${staff.id}/`
      : `/${staff.id}/`;

    await prisma.teamHierarchy.upsert({
      where: { userId: staff.id },
      update: { level, path, supervisorId },
      create: {
        userId: staff.id,
        supervisorId,
        level,
        path,
        isActive: true,
      },
    });
    console.log(`Created hierarchy for dealer staff: ${staff.name}`);
  }

  const totalCreated = await prisma.teamHierarchy.count();
  console.log(`\nHierarchy population complete. Total records: ${totalCreated}`);
}

populateInitialHierarchy()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
