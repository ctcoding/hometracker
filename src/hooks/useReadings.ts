import { useState, useEffect } from 'react';

export interface Reading {
  id: number;
  timestamp: string;
  energyKwh: number;
  consumptionPerDay: number;
  notes?: string;
}

export interface CreateReadingDTO {
  timestamp: string;
  energyKwh: number;
  notes?: string;
}

export function useReadings() {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReadings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/readings');
      if (!response.ok) throw new Error('Failed to fetch readings');
      const data = await response.json();
      setReadings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReadings();
  }, []);

  const addReading = async (data: CreateReadingDTO) => {
    try {
      const response = await fetch('/api/readings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to add reading');

      await fetchReadings(); // Refresh list
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  const updateReading = async (id: number, data: Partial<Reading>) => {
    try {
      const response = await fetch(`/api/readings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to update reading');

      await fetchReadings();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  const deleteReading = async (id: number) => {
    try {
      const response = await fetch(`/api/readings/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete reading');

      await fetchReadings();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  return {
    readings,
    loading,
    error,
    addReading,
    updateReading,
    deleteReading,
    refresh: fetchReadings,
  };
}
