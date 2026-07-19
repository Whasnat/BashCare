import cron from 'node-cron';
import billingService from './billingService.js';

class CronService {
  startCronJobs() {
    console.log('[CronService] Initializing background cron jobs...');

    // Runs at 00:00 on the 1st of every month
    cron.schedule('0 0 1 * *', async () => {
      console.log('[CronService] Monthly invoice generation triggered by internal cron timer.');
      try {
        await billingService.generateSystemWideInvoices();
      } catch (err) {
        console.error('[CronService] Error generating monthly invoices:', err);
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Dhaka'
    });

    // Runs every day at 00:00
    cron.schedule('0 0 * * *', async () => {
      console.log('[CronService] Daily overdue & reminder tasks triggered.');
      try {
        await billingService.sendPaymentReminders();
        await billingService.processOverdueInvoices();
      } catch (err) {
        console.error('[CronService] Error in daily tasks:', err);
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Dhaka'
    });

    console.log('[CronService] Cron jobs initialized successfully.');
  }
}

export default new CronService();
