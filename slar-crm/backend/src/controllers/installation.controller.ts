import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middlewares/auth';
import { UserRole } from '@slar-crm/shared';

const prisma = new PrismaClient();

export const getMyCustomers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    
    // "customers assigned to logged-in installer where documentation is complete (all green)"
    // Documentation complete implies docChecklist.completedAt is not null or status="ACTIVE"
    const whereClause: any = {
      docChecklist: {
        completedAt: { not: null }
      },
      status: { in: ['ACTIVE', 'INSTALLATION_DONE'] }
    };
    
    if (req.user!.role === UserRole.INSTALLATION) {
      whereClause.assignedInstallation = userId;
    } else {
      whereClause.assignedInstallation = { not: null };
    }

    const customers = await prisma.customer.findMany({
      where: whereClause,
      include: {
        siteSurveys: true,
        docChecklist: true,
        visits: {
          where: { visitType: 'SITE_SURVEY' },
          orderBy: { scheduledAt: 'desc' },
          take: 1
        }
      }
    });

    res.json({ success: true, data: customers });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const completeInstallation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { customerId } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { payments: true }
    });

    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    // Mark installation done
    // If final payment already cleared -> sets status to COMPLETED
    // For mock logic, assuming checking if total payment >= expected. Using a simplified flag here.
    const isFinalPaymentCleared = customer.payments.some(p => p.milestone === 'FINAL');
    
    const newStatus = isFinalPaymentCleared ? 'COMPLETED' : 'INSTALLATION_DONE';

    const updated = await prisma.customer.update({
      where: { id: customerId },
      data: { status: newStatus }
    });

    // Notify accountant
    if (customer.assignedAccountant) {
      await prisma.notification.create({
        data: {
          userId: customer.assignedAccountant,
          type: 'FINAL_PAYMENT_DUE',
          title: 'Installation Complete - Final Payment Due',
          message: `Installation for ${customer.name} is complete. Final payment milestone triggered.`,
          entityType: 'CUSTOMER',
          entityId: customerId
        }
      });
    }

    await prisma.timelineEvent.create({
      data: {
        customerId,
        eventType: 'INSTALLATION_COMPLETED',
        description: `Installation marked complete by ${req.user!.id}`,
        performedBy: req.user!.id
      }
    });

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};
