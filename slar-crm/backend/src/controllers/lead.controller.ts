import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/clients';

export const listLeads = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, assignedSalesperson, zoneId, dateFrom, dateTo, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {};
    const user = (req as any).user;
    if (user.dealerId) where.dealerId = user.dealerId;
    
    // Roles scoping
    if (user.role === 'SALESPERSON') {
      where.assignedSalesperson = user.id;
    }

    if (status) where.status = status;
    if (assignedSalesperson) where.assignedSalesperson = assignedSalesperson;
    if (zoneId) where.zoneId = zoneId;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
      if (dateTo) where.createdAt.lte = new Date(dateTo as string);
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          salesperson: { select: { name: true } },
          zone: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({ success: true, data: { leads, total, page: parseInt(page as string), limit: parseInt(limit as string) } });
  } catch (err) { next(err); }
};

export const getLead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const where: any = { id: req.params.id };
    const user = (req as any).user;
    if (user.dealerId) where.dealerId = user.dealerId;
    if (user.role === 'SALESPERSON') where.assignedSalesperson = user.id;

    const lead = await prisma.lead.findFirst({
      where,
      include: {
        salesperson: { select: { name: true, phone: true } },
        timelineEvents: { orderBy: { createdAt: 'desc' }, include: { performer: { select: { name: true } } } },
        visits: { orderBy: { scheduledAt: 'desc' } },
        proposals: { orderBy: { createdAt: 'desc' } }
      }
    });

    if (!lead) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } });
    
    // Fetch polymorphic call logs
    const callLogs = await prisma.callLog.findMany({
      where: { entityType: 'LEAD', entityId: lead.id },
      orderBy: { createdAt: 'desc' },
      include: { caller: { select: { name: true } } }
    });

    res.json({ success: true, data: { ...lead, callLogs } });
  } catch (err) { next(err); }
};

export const updateLead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, notes } = req.body;
    const where: any = { id: req.params.id };
    const user = (req as any).user;
    
    if (user.dealerId) where.dealerId = user.dealerId;
    if (user.role === 'SALESPERSON') where.assignedSalesperson = user.id;

    const existing = await prisma.lead.findFirst({ where });
    if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } });

    const updated = await prisma.lead.update({
      where: { id: req.params.id },
      data: {
        ...(status && { status }),
        ...(notes && { notes }),
      }
    });

    // Log to timeline if status changed
    if (status && existing.status !== status) {
      await prisma.timelineEvent.create({
        data: {
          leadId: req.params.id,
          eventType: 'STATUS_UPDATE',
          description: `Status changed from ${existing.status} to ${status}`,
          performedBy: user.id
        }
      });
    }

    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};

export const addCallLog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { callType, disposition, notes, followUpAt, duration } = req.body;
    const log = await prisma.callLog.create({
      data: {
        entityType: 'LEAD',
        entityId: req.params.id,
        calledBy: (req as any).user.id,
        callType,
        disposition,
        notes,
        followUpAt: followUpAt ? new Date(followUpAt) : null,
        duration: duration ? parseInt(duration) : null,
      },
    });

    res.status(201).json({ success: true, data: log });
  } catch (err) { next(err); }
};

export const convertToCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const where: any = { id: req.params.id };
    const user = (req as any).user;
    if (user.dealerId) where.dealerId = user.dealerId;
    if (user.role === 'SALESPERSON') where.assignedSalesperson = user.id;

    const lead = await prisma.lead.findFirst({ where });
    if (!lead) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } });
    
    if (lead.status === 'WON') {
      return res.status(400).json({ success: false, error: { code: 'ALREADY_WON', message: 'This lead is already a customer' } });
    }

    // Update Lead
    const updatedLead = await prisma.lead.update({
      where: { id: req.params.id },
      data: { status: 'WON' }
    });

    // Create Customer record
    const customer = await prisma.customer.create({
      data: {
        customerCode: `CUS-${Date.now()}`,
        zoneId: lead.zoneId,
        assignedSalesperson: lead.assignedSalesperson,
        leadId: lead.id,
        name: lead.name,
        email: lead.email || '',
        phone: lead.phone,
        address: lead.address || '',
        city: lead.city || '',
        pincode: lead.pincode || '',
        dealerId: lead.dealerId,
      }
    });

    await prisma.timelineEvent.create({
      data: {
        leadId: req.params.id,
        eventType: 'LEAD_CONVERTED',
        description: `Lead won and transitioned to active Customer profile.`,
        performedBy: user.id
      }
    });

    res.status(201).json({ success: true, data: { lead: updatedLead, customer } });
  } catch (err) { next(err); }
};
