import { PrismaClient, RoleType, RawLeadStatus, LeadSource, CustomerStatus, TaskPriority, TaskStatus, LeadStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();
declare const process: { exit(code?: number): void };

const DEMO_PREFIX = '[DEMO]';
const DEMO_ZONE_NAME = '[DEMO] Central Zone';
const DEMO_BATCH_ID = Date.now().toString();

type DemoUserSpec = {
  email: string;
  name: string;
  role: RoleType;
  dealerId: string | null;
  zoneId: string | null;
};

async function main() {
  console.log('Generating demo data...');

  const passwordHash = await bcrypt.hash('Password@123', 10);

  const demoZone = await ensureDemoZone();
  const existingDealer = await prisma.dealer.findFirst({
    where: { email: 'demo-dealer@slarcrm.com' },
  });

  const demoDealer = existingDealer
    ? await prisma.dealer.update({
        where: { id: existingDealer.id },
        data: {
          companyName: '[DEMO] Solar Dealer',
          contactName: 'Demo Dealer Contact',
          phone: '8888888888',
          address: '[DEMO] 123 Solar Street',
          isActive: true,
        },
      })
    : await prisma.dealer.create({
        data: {
          companyName: '[DEMO] Solar Dealer',
          contactName: 'Demo Dealer Contact',
          email: 'demo-dealer@slarcrm.com',
          phone: '8888888888',
          address: '[DEMO] 123 Solar Street',
          isActive: true,
        },
      });

  const demoUsers = await createDemoUsers(passwordHash, demoDealer.id, demoZone.id);
  await createDemoHierarchy(demoUsers);

  const salespersons = demoUsers.filter((user) => user.role === RoleType.SALESPERSON);
  const callingStaff = demoUsers.filter((user) => user.role === RoleType.CALLING_STAFF);
  const documentationUsers = demoUsers.filter((user) => user.role === RoleType.DOCUMENTATION);
  const installationUsers = demoUsers.filter((user) => user.role === RoleType.INSTALLATION);
  const anyDemoUser = () => demoUsers[Math.floor(Math.random() * demoUsers.length)];
  const anySalesperson = () => salespersons[Math.floor(Math.random() * salespersons.length)];
  const anyCallingStaff = () => callingStaff[Math.floor(Math.random() * callingStaff.length)];

  console.log('Creating 200 Raw Leads...');
  const rawLeadsData = Array.from({ length: 200 }).map((_, index) => ({
    name: `${DEMO_PREFIX} Raw Lead ${DEMO_BATCH_ID}-${String(index + 1).padStart(3, '0')}`,
    phone: `9${String(100000000 + index).slice(-9)}`,
    email: `rawlead-${DEMO_BATCH_ID}-${index + 1}@demo.slarcrm.com`,
    address: faker.location.streetAddress(),
    city: faker.helpers.arrayElement(['Delhi', 'New Delhi', 'Gurgaon', 'Noida', 'Faridabad']),
    pincode: faker.string.numeric(6),
    source: faker.helpers.arrayElement(Object.values(LeadSource)),
    status: faker.helpers.arrayElement(Object.values(RawLeadStatus)),
    dealerId: demoDealer.id,
    assignedTo: anyCallingStaff().id,
  }));

  for (const chunk of chunkArray(rawLeadsData, 50)) {
    await prisma.rawLead.createMany({ data: chunk, skipDuplicates: true });
  }

  const demoRawLeads = await prisma.rawLead.findMany({
    where: { name: { startsWith: `${DEMO_PREFIX} Raw Lead ${DEMO_BATCH_ID}` } },
    orderBy: { createdAt: 'asc' },
    take: 120,
  });

  console.log('Creating 120 Sales Leads...');
  const leadStatuses = [
    LeadStatus.NEW,
    LeadStatus.FOLLOW_UP,
    LeadStatus.VISIT_SCHEDULED,
    LeadStatus.PROPOSAL_SENT,
    LeadStatus.NEGOTIATION,
    LeadStatus.WON,
    LeadStatus.LOST,
  ];

  const leadRows = demoRawLeads.map((rawLead, index) => ({
    leadCode: `DEMO-LEAD-${DEMO_BATCH_ID}-${String(index + 1).padStart(3, '0')}`,
    rawLeadId: rawLead.id,
    name: rawLead.name.replace('Raw Lead', 'Lead'),
    phone: rawLead.phone,
    email: rawLead.email,
    address: rawLead.address,
    city: rawLead.city,
    pincode: rawLead.pincode,
    assignedSalesperson: anySalesperson().id,
    assignedCallingStaff: anyCallingStaff().id,
    zoneId: demoZone.id,
    status: leadStatuses[index % leadStatuses.length],
    dealerId: demoDealer.id,
  }));

  await prisma.lead.createMany({ data: leadRows, skipDuplicates: true });
  await prisma.rawLead.updateMany({
    where: { id: { in: demoRawLeads.map((lead) => lead.id) } },
    data: { status: RawLeadStatus.CONVERTED },
  });

  console.log('Creating 80 Customers...');
  const customersData = Array.from({ length: 80 }).map((_, index) => ({
    customerCode: `DEMO-CUST-${DEMO_BATCH_ID}-${String(index + 1).padStart(3, '0')}`,
    name: `${DEMO_PREFIX} Customer ${DEMO_BATCH_ID}-${String(index + 1).padStart(3, '0')}`,
    phone: `98${String(10000000 + index).slice(-8)}`,
    email: `customer-${DEMO_BATCH_ID}-${index + 1}@demo.slarcrm.com`,
    address: faker.location.streetAddress(),
    city: faker.location.city(),
    pincode: faker.string.numeric(6),
    status: faker.helpers.arrayElement(Object.values(CustomerStatus)),
    dealerId: demoDealer.id,
    assignedSalesperson: anySalesperson().id,
    zoneId: demoZone.id,
  }));

  for (const chunk of chunkArray(customersData, 20)) {
    await prisma.customer.createMany({ data: chunk, skipDuplicates: true });
  }

  const demoCustomers = await prisma.customer.findMany({
    where: { customerCode: { startsWith: `DEMO-CUST-${DEMO_BATCH_ID}` } },
    orderBy: { createdAt: 'asc' },
  });

  const documentationAssignee = documentationUsers[0] ?? anyDemoUser();
  const installationAssignee = installationUsers[0] ?? anyDemoUser();

  for (const [index, customer] of demoCustomers.entries()) {
    if (index < 40) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          assignedDocumentation: documentationAssignee.id,
          status: index % 3 === 0 ? CustomerStatus.ACTIVE : CustomerStatus.INSTALLATION_DONE,
        },
      });

      await prisma.documentationChecklist.create({
        data: {
          customerId: customer.id,
          assignedTo: documentationAssignee.id,
          pmSuryaStatus: index % 2 === 0 ? 'APPROVED' : 'PENDING',
          cmSchemeApplicable: index % 3 === 0,
          cmSchemeStatus: index % 3 === 0 ? 'APPROVED' : 'PENDING',
          loanApplicable: index % 4 === 0,
          loanStatus: index % 4 === 0 ? 'DISBURSED' : 'NA',
          netMeteringStatus: index % 2 === 0 ? 'APPROVED' : 'PENDING',
          completedAt: null,
        },
      });
    } else {
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          assignedInstallation: installationAssignee.id,
          status: index % 2 === 0 ? CustomerStatus.INSTALLATION_DONE : CustomerStatus.ACTIVE,
        },
      });

      await prisma.documentationChecklist.create({
        data: {
          customerId: customer.id,
          assignedTo: documentationAssignee.id,
          pmSuryaStatus: 'APPROVED',
          cmSchemeApplicable: true,
          cmSchemeStatus: 'APPROVED',
          loanApplicable: true,
          loanStatus: 'DISBURSED',
          netMeteringStatus: 'APPROVED',
          completedAt: new Date(),
        },
      });
    }
  }

  console.log('Creating 120 Tasks...');
  const tasksData = Array.from({ length: 120 }).map((_, index) => ({
    title: `${DEMO_PREFIX} Task ${DEMO_BATCH_ID}-${String(index + 1).padStart(3, '0')}`,
    description: faker.lorem.paragraph(),
    priority: faker.helpers.arrayElement(Object.values(TaskPriority)),
    status: faker.helpers.arrayElement(Object.values(TaskStatus)),
    dueDate: faker.date.future(),
    createdBy: anyDemoUser().id,
    assignedTo: anyDemoUser().id,
  }));

  for (const chunk of chunkArray(tasksData, 30)) {
    await prisma.task.createMany({ data: chunk, skipDuplicates: true });
  }

  console.log('Demo data successfully generated!');
}

async function ensureDemoZone() {
  const existingZone = await prisma.zone.findFirst({ where: { name: DEMO_ZONE_NAME } });
  if (existingZone) {
    return existingZone;
  }

  return prisma.zone.create({
    data: {
      name: DEMO_ZONE_NAME,
      coordinates: [
        { lat: 28.6139, lng: 77.2090 },
        { lat: 28.6139, lng: 77.3090 },
        { lat: 28.7139, lng: 77.2090 },
      ],
      city: 'New Delhi',
    },
  });
}

async function createDemoUsers(passwordHash: string, dealerId: string, zoneId: string) {
  const userSpecs: DemoUserSpec[] = [
    { email: 'demo-admin@slarcrm.com', name: '[DEMO] System Admin', role: RoleType.ADMIN, dealerId: null, zoneId },
    { email: 'demo-dealer-admin@slarcrm.com', name: '[DEMO] Dealer Admin', role: RoleType.DEALER_ADMIN, dealerId, zoneId },
    { email: 'demo-dealer-staff@slarcrm.com', name: '[DEMO] Dealer Staff', role: RoleType.DEALER_STAFF, dealerId, zoneId },
    ...buildSequentialUsers('salesperson', 'Salesperson', 19, RoleType.SALESPERSON, dealerId, zoneId),
    ...buildSequentialUsers('calling', 'Calling Staff', 8, RoleType.CALLING_STAFF, dealerId, zoneId),
    ...buildSequentialUsers('project-head', 'Project Head', 4, RoleType.PROJECT_HEAD, dealerId, zoneId),
    ...buildSequentialUsers('documentation', 'Documentation', 2, RoleType.DOCUMENTATION, dealerId, zoneId),
    ...buildSequentialUsers('warehouse', 'Warehouse', 2, RoleType.WAREHOUSE, dealerId, zoneId),
    { email: 'demo-installation-01@slarcrm.com', name: '[DEMO] Installation 01', role: RoleType.INSTALLATION, dealerId, zoneId },
    { email: 'demo-accountant-01@slarcrm.com', name: '[DEMO] Accountant 01', role: RoleType.ACCOUNTANT, dealerId, zoneId },
  ];

  const createdUsers = [] as Awaited<ReturnType<typeof prisma.user.upsert>>[];

  for (const spec of userSpecs) {
    const user = await prisma.user.upsert({
      where: { email: spec.email },
      update: {
        password: passwordHash,
        name: spec.name,
        phone: faker.phone.number({ style: 'national' }).replace(/\D/g, '').padStart(10, '9').slice(0, 10),
        role: spec.role,
        dealerId: spec.dealerId,
        zoneId: spec.zoneId,
        isActive: true,
      },
      create: {
        email: spec.email,
        password: passwordHash,
        name: spec.name,
        phone: faker.phone.number({ style: 'national' }).replace(/\D/g, '').padStart(10, '9').slice(0, 10),
        role: spec.role,
        dealerId: spec.dealerId,
        zoneId: spec.zoneId,
        isActive: true,
      },
    });
    createdUsers.push(user);
  }

  return createdUsers;
}

function buildSequentialUsers(prefix: string, label: string, count: number, role: RoleType, dealerId: string, zoneId: string): DemoUserSpec[] {
  return Array.from({ length: count }).map((_, index) => {
    const number = String(index + 1).padStart(2, '0');
    return {
      email: `demo-${prefix}-${number}@slarcrm.com`,
      name: `[DEMO] ${label} ${number}`,
      role,
      dealerId,
      zoneId,
    };
  });
}

async function createDemoHierarchy(users: Awaited<ReturnType<typeof prisma.user.upsert>>[]) {
  const byEmail = new Map(users.map((user) => [user.email, user]));
  const hierarchyPath = new Map<string, string>();

  const admin = byEmail.get('demo-admin@slarcrm.com');
  const dealerAdmin = byEmail.get('demo-dealer-admin@slarcrm.com');
  const dealerStaff = byEmail.get('demo-dealer-staff@slarcrm.com');

  if (!admin || !dealerAdmin || !dealerStaff) {
    throw new Error('Demo hierarchy could not be initialized');
  }

  await upsertHierarchy(admin.id, null, 0, `/${admin.id}`);
  hierarchyPath.set(admin.id, `/${admin.id}`);

  await upsertHierarchy(dealerAdmin.id, admin.id, 1, `${hierarchyPath.get(admin.id)}/${dealerAdmin.id}`);
  hierarchyPath.set(dealerAdmin.id, `${hierarchyPath.get(admin.id)}/${dealerAdmin.id}`);

  await upsertHierarchy(dealerStaff.id, dealerAdmin.id, 2, `${hierarchyPath.get(dealerAdmin.id)}/${dealerStaff.id}`);
  hierarchyPath.set(dealerStaff.id, `${hierarchyPath.get(dealerAdmin.id)}/${dealerStaff.id}`);

  const projectHeads = users.filter((user) => user.role === RoleType.PROJECT_HEAD);
  for (const [index, projectHead] of projectHeads.entries()) {
    await upsertHierarchy(projectHead.id, dealerAdmin.id, 2, `${hierarchyPath.get(dealerAdmin.id)}/${projectHead.id}`);
    hierarchyPath.set(projectHead.id, `${hierarchyPath.get(dealerAdmin.id)}/${projectHead.id}`);
  }

  const salespeople = users.filter((user) => user.role === RoleType.SALESPERSON);
  const callingStaff = users.filter((user) => user.role === RoleType.CALLING_STAFF);
  const supportUsers = users.filter(
    (user) =>
      user.role === RoleType.DOCUMENTATION ||
      user.role === RoleType.WAREHOUSE ||
      user.role === RoleType.INSTALLATION ||
      user.role === RoleType.ACCOUNTANT
  );

  for (const [index, user] of salespeople.entries()) {
    const supervisor = projectHeads[index % projectHeads.length] ?? dealerAdmin;
    const parentPath = hierarchyPath.get(supervisor.id) ?? hierarchyPath.get(dealerAdmin.id)!;
    await upsertHierarchy(user.id, supervisor.id, 3, `${parentPath}/${user.id}`);
    hierarchyPath.set(user.id, `${parentPath}/${user.id}`);
  }

  for (const [index, user] of callingStaff.entries()) {
    const supervisor = projectHeads[index % projectHeads.length] ?? dealerAdmin;
    const parentPath = hierarchyPath.get(supervisor.id) ?? hierarchyPath.get(dealerAdmin.id)!;
    await upsertHierarchy(user.id, supervisor.id, 3, `${parentPath}/${user.id}`);
    hierarchyPath.set(user.id, `${parentPath}/${user.id}`);
  }

  for (const user of supportUsers) {
    const parentPath = hierarchyPath.get(dealerStaff.id) ?? hierarchyPath.get(dealerAdmin.id)!;
    await upsertHierarchy(user.id, dealerStaff.id, 3, `${parentPath}/${user.id}`);
    hierarchyPath.set(user.id, `${parentPath}/${user.id}`);
  }
}

async function upsertHierarchy(userId: string, supervisorId: string | null, level: number, path: string) {
  return (prisma as any).teamHierarchy.upsert({
    where: { userId },
    update: { supervisorId, level, path, isActive: true },
    create: { userId, supervisorId, level, path, isActive: true },
  });
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunked: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunked.push(array.slice(i, i + size));
  }
  return chunked;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });