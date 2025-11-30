import { useState, useEffect } from 'react';

export interface ElwaReading {
  id: number;
  date: string;
  energyKwh: number;
  energySolarKwh?: number;
  energyGridKwh?: number;
  temp1?: number;
  temp2?: number;
  source: 'screenshot' | 'cloud';
  notes?: string;
}

export interface ElwaMonthlyData extends ElwaReading {
  month: string;
  savings: number;
  pricePerKwh: number;
}

export function useElwa() {
  const [readings, setReadings] = useState<ElwaReading[]>([]);
  const [monthlyData, setMonthlyData] = useState<ElwaMonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReadings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/elwa');
      if (!response.ok) throw new Error('Failed to fetch ELWA readings');
      const data = await response.json();
      setReadings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyData = async () => {
    try {
      const response = await fetch('/api/elwa/monthly');
      if (!response.ok) throw new Error('Failed to fetch ELWA monthly data');
      const data = await response.json();
      setMonthlyData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  useEffect(() => {
    fetchReadings();
    fetchMonthlyData();
  }, []);

  const importYesterday = async () => {
    try {
      const response = await fetch('/api/elwa/import-yesterday', {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to import yesterday data');

      await fetchReadings();
      await fetchMonthlyData();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  const importRange = async (startDate: string, endDate: string) => {
    try {
      const response = await fetch('/api/elwa/import-range', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate }),
      });

      if (!response.ok) throw new Error('Failed to import date range');

      await fetchReadings();
      await fetchMonthlyData();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  return {
    readings,
    monthlyData,
    loading,
    error,
    importYesterday,
    importRange,
    refresh: () => {
      fetchReadings();
      fetchMonthlyData();
    },
  };
}
