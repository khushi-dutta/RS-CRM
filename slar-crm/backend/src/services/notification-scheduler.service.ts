import cron from 'node-cron';
import { 
  notifyTaskDueSoon, 
  notifyTaskOverdue, 
  notifyLowStock 
} from './notification-generator.service';
import { checkAndNotifyLowStock } from './stock-monitor.service';

export function initScheduledNotifications() {
  console.log('Initializing scheduled notifications...');

  // Check for due tasks every hour
  cron.schedule('0 * * * *', async () => {
    console.log('Running due task notifications...');
    try {
      await notifyTaskDueSoon();
    } catch (error) {
      console.error('Error in due task notifications:', error);
    }
  });

  // Check for overdue tasks and escalations every 2 hours
  cron.schedule('0 */2 * * *', async () => {
    console.log('Running overdue task notifications and escalations...');
    try {
      await notifyTaskOverdue();
      const { escalationEngineService } = await import('./escalation-engine.service');
      await escalationEngineService.checkOverdueTasks();
    } catch (error) {
      console.error('Error in overdue task notifications/escalations:', error);
    }
  });

  // Check for low stock every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    console.log('Running low stock notifications...');
    try {
      await checkAndNotifyLowStock();
    } catch (error) {
      console.error('Error in low stock notifications:', error);
    }
  });

  // Daily summary at 9 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('Running daily notification summary...');
    try {
      await notifyTaskDueSoon();
      await checkAndNotifyLowStock();
    } catch (error) {
      console.error('Error in daily notification summary:', error);
    }
  });

  console.log('Scheduled notifications initialized successfully');
}