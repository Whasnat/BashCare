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
      timezone: 'Asia/Dhaka' // Using Asia/Dhaka since BashaCare targets Bangladesh
    });

    console.log('[CronService] Cron jobs initialized successfully.');
  }
}

export default new CronService();
