import { useState, useEffect } from 'react';

export interface Tariff {
  id: number;
  name: string;
  validFrom: string;
  basePricePerYear: number;
  energyPricePerKwh: number;
  powerPricePerKw: number;
  annualPowerKw: number;
  taxRate: number;
}

export interface CreateTariffDTO {
  name: string;
  validFrom: string;
  basePricePerYear: number;
  energyPricePerKwh: number;
  powerPricePerKw: number;
  annualPowerKw: number;
  taxRate: number;
}

export function useTariffs() {
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTariffs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/tariffs');
      if (!response.ok) throw new Error('Failed to fetch tariffs');
      const data = await response.json();
      setTariffs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTariffs();
  }, []);

  const addTariff = async (data: CreateTariffDTO) => {
    try {
      const response = await fetch('/api/tariffs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to add tariff');

      await fetchTariffs();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  const updateTariff = async (id: number, data: Partial<Tariff>) => {
    try {
      const response = await fetch(`/api/tariffs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to update tariff');

      await fetchTariffs();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  const deleteTariff = async (id: number) => {
    try {
      const response = await fetch(`/api/tariffs/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete tariff');

      await fetchTariffs();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  return {
    tariffs,
    loading,
    error,
    addTariff,
    updateTariff,
    deleteTariff,
    refresh: fetchTariffs,
  };
}
