import { schedule } from 'node-cron';

class CronJobs {
  static start() {
    // Example of a Cron Job running every minute
    schedule('* * * * *', () => {
      console.log('Cron job is running every minute!');
      // Add your cron job logic here (e.g., perform a task, send emails, etc.)
    });

    // You can add more cron jobs here by repeating the cron.schedule() line
    // For example: cron.schedule('0 0 * * *', () => { ... }); // runs at midnight every day
  }
}

// Use CommonJS export syntax
export default CronJobs;
