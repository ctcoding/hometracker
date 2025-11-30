import { ElwaCloudClient } from './elwa-client.js';
import db from './db.js';

export class ElwaScheduler {
  private intervalId?: NodeJS.Timeout;
  private isRunning = false;
  private lastRun: Date | null = null;
  private lastSuccess = false;

  getStatus() {
    return {
      lastRun: this.lastRun?.toISOString() || null,
      success: this.lastSuccess,
    };
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Run daily at 2 AM only (no automatic checks on startup)
    const scheduleNextRun = () => {
      const now = new Date();
      const next2AM = new Date(now);
      next2AM.setHours(2, 0, 0, 0);

      if (next2AM <= now) {
        next2AM.setDate(next2AM.getDate() + 1);
      }

      const msUntil2AM = next2AM.getTime() - now.getTime();

      this.intervalId = setTimeout(() => {
        this.importYesterdayData();
        scheduleNextRun();
      }, msUntil2AM);

      console.log(`Next ELWA import scheduled for: ${next2AM.toLocaleString()}`);
    };

    scheduleNextRun();
    console.log('✓ ELWA Cloud scheduler started');
  }

  stop() {
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = undefined;
    }
    this.isRunning = false;
  }

  async checkAndFillGaps(): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      const settings = db.prepare('SELECT elwaCloudApiKey, elwaSerialNumber FROM settings WHERE id = ?')
        .get('main') as any;

      if (!settings?.elwaCloudApiKey || !settings?.elwaSerialNumber) {
        console.log('⊘ ELWA gap check skipped: API credentials not configured');
        return {
          success: false,
          message: 'ELWA Cloud API credentials not configured',
        };
      }

      // Get the last entry from cloud source
      const lastEntry = db.prepare(
        "SELECT MAX(date) as lastDate FROM elwaReadings WHERE source = 'cloud'"
      ).get() as any;

      // Calculate yesterday and the start date (48h back from yesterday to catch delayed data)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      let startDate: string;

      if (!lastEntry?.lastDate) {
        // No previous cloud data - start from 48h ago
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        startDate = twoDaysAgo.toISOString().split('T')[0];
        console.log(`⊘ ELWA gap check: No previous cloud data, checking last 48h`);
      } else {
        // Re-check last 48h to catch delayed API data
        const recheckFrom = new Date(lastEntry.lastDate);
        recheckFrom.setDate(recheckFrom.getDate() - 2); // Go back 2 days from last entry

        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

        // Use the earlier of: (last entry - 2 days) or (today - 2 days)
        startDate = recheckFrom < twoDaysAgo
          ? recheckFrom.toISOString().split('T')[0]
          : twoDaysAgo.toISOString().split('T')[0];

        console.log(`⟳ Checking ELWA data from ${startDate} to ${yesterdayStr} (includes 48h recheck)...`);
      }

      // Always check from startDate to yesterday
      if (startDate >= yesterdayStr) {
        console.log(`✓ ELWA data check not needed yet`);
        return {
          success: true,
          message: 'No check needed',
        };
      }

      console.log(`⟳ Fetching ELWA data from ${startDate} to ${yesterdayStr}...`);

      const result = await this.importDateRange(startDate, yesterdayStr);

      if (result.success) {
        console.log(`✓ Gap filled: ${result.count} days imported`);
      }

      return result;
    } catch (err) {
      console.error('ELWA gap check error:', err);
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  async importYesterdayData(): Promise<{ success: boolean; message: string; data?: any }> {
    this.lastRun = new Date();

    try {
      const settings = db.prepare('SELECT elwaCloudApiKey, elwaSerialNumber FROM settings WHERE id = ?')
        .get('main') as any;

      if (!settings?.elwaCloudApiKey || !settings?.elwaSerialNumber) {
        this.lastSuccess = false;
        return {
          success: false,
          message: 'ELWA Cloud API key or serial number not configured',
        };
      }

      const client = new ElwaCloudClient(settings.elwaCloudApiKey, settings.elwaSerialNumber);

      const data = await client.getYesterdayData();

      if (!data) {
        // No data available is not an error - API returned empty response
        console.log('⊘ No ELWA data available for yesterday (API returned empty response)');
        this.lastSuccess = true;
        return {
          success: true,
          message: 'No data available for yesterday - this is normal if device is offline or data not yet available',
        };
      }

      // Insert or update in database
      const stmt = db.prepare(`
        INSERT INTO elwaReadings (date, energyKwh, temp1, temp2, source)
        VALUES (?, ?, ?, ?, 'cloud')
        ON CONFLICT(date) DO UPDATE SET
          energyKwh = excluded.energyKwh,
          temp1 = excluded.temp1,
          temp2 = excluded.temp2,
          source = 'cloud'
      `);

      stmt.run(data.date, data.energyKwh, data.temp1 || null, data.temp2 || null);

      console.log(`✓ ELWA data imported for ${data.date}: ${data.energyKwh} kWh`);

      this.lastSuccess = true;
      return {
        success: true,
        message: `Imported ${data.energyKwh} kWh for ${data.date}`,
        data,
      };
    } catch (err) {
      console.error('ELWA import error:', err);
      this.lastSuccess = false;
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  async importDateRange(startDate: string, endDate: string): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      const settings = db.prepare('SELECT elwaCloudApiKey, elwaSerialNumber FROM settings WHERE id = ?')
        .get('main') as any;

      if (!settings?.elwaCloudApiKey || !settings?.elwaSerialNumber) {
        return {
          success: false,
          message: 'ELWA Cloud API key or serial number not configured',
        };
      }

      const client = new ElwaCloudClient(settings.elwaCloudApiKey, settings.elwaSerialNumber);

      const dataList = await client.getDailyData(startDate, endDate);

      // Only insert entries where we have actual data (not empty responses)
      if (dataList.length === 0) {
        console.log(`⊘ No ELWA data available for ${startDate} to ${endDate}`);
        return {
          success: true,
          message: 'No data available for this period',
          count: 0,
        };
      }

      const stmt = db.prepare(`
        INSERT INTO elwaReadings (date, energyKwh, temp1, temp2, source)
        VALUES (?, ?, ?, ?, 'cloud')
        ON CONFLICT(date) DO UPDATE SET
          energyKwh = excluded.energyKwh,
          temp1 = excluded.temp1,
          temp2 = excluded.temp2,
          source = 'cloud'
      `);

      let insertedCount = 0;
      for (const data of dataList) {
        // Only insert if energyKwh > 0 OR if we have temperature data
        // This avoids writing empty placeholder entries
        if (data.energyKwh > 0 || data.temp1 != null || data.temp2 != null) {
          stmt.run(data.date, data.energyKwh, data.temp1 || null, data.temp2 || null);
          insertedCount++;
        }
      }

      console.log(`✓ ELWA data imported: ${insertedCount} days (${dataList.length} total in response)`);

      return {
        success: true,
        message: `Imported ${insertedCount} days of data`,
        count: insertedCount,
      };
    } catch (err) {
      console.error('ELWA import error:', err);
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }
}

export const elwaScheduler = new ElwaScheduler();
