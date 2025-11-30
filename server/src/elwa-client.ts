interface ElwaData {
  date: string;
  energyKwh: number;
  temp1?: number;
  temp2?: number;
}

export class ElwaCloudClient {
  private baseUrl = 'https://api.my-pv.com/api/v1';
  private maxRetries = 5;
  private baseDelayMs = 2000; // Start with 2 seconds

  constructor(
    private apiKey: string,
    private serialNumber: string
  ) {}

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getDailyData(startDate: string, endDate: string, retryCount = 0): Promise<ElwaData[]> {
    try {
      const timezone = encodeURIComponent('Europe/Vienna');
      const url = `${this.baseUrl}/device/${this.serialNumber}/logdata?beginDate=${startDate}&endDate=${endDate}&timezone=${timezone}&interval=1d`;

      const response = await fetch(url, {
        headers: {
          'accept': 'application/json',
          'Authorization': this.apiKey,
        },
      });

      // Handle rate limiting with exponential backoff
      if (response.status === 429) {
        if (retryCount >= this.maxRetries) {
          throw new Error(`API rate limit exceeded after ${this.maxRetries} retries`);
        }

        const delayMs = this.baseDelayMs * Math.pow(2, retryCount);
        console.log(`[ELWA] Rate limit hit (429). Waiting ${delayMs / 1000}s before retry ${retryCount + 1}/${this.maxRetries}...`);
        await this.sleep(delayMs);
        return this.getDailyData(startDate, endDate, retryCount + 1);
      }

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json() as any;
      console.log(`[ELWA] Response data keys:`, Object.keys(data));
      if (Object.keys(data).length > 0) {
        console.log(`[ELWA] Sample entry:`, Object.entries(data)[0]);
      }
      return this.transformData(data);
    } catch (err) {
      console.error('ELWA data fetch error:', err);
      throw err;
    }
  }

  private transformData(apiData: any): ElwaData[] {
    const result: ElwaData[] = [];

    // API returns data as object with dates as keys
    for (const [date, dayData] of Object.entries(apiData)) {
      const data = dayData as any;

      // i_power.sum is in Wh, convert to kWh
      const energyWh = data.i_power?.sum || 0;
      const energyKwh = energyWh / 1000;

      // Temperatures are in tenth of degrees (505 = 50.5°C)
      const temp1Raw = data.i_temp1?.mean;
      const temp2Raw = data.i_temp2?.mean;

      result.push({
        date,
        energyKwh: Math.round(energyKwh * 100) / 100, // Round to 2 decimals
        temp1: temp1Raw != null ? temp1Raw / 10 : undefined,
        temp2: temp2Raw != null ? temp2Raw / 10 : undefined,
      });
    }

    // Sort by date
    result.sort((a, b) => a.date.localeCompare(b.date));

    return result;
  }

  async getYesterdayData(): Promise<ElwaData | null> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // API requires beginDate < endDate, so we also request today
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const data = await this.getDailyData(yesterdayStr, todayStr);

    // Find yesterday's data from the result
    const yesterdayData = data.find(d => d.date === yesterdayStr);
    return yesterdayData || null;
  }
}
