import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Tailwind className merge utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formatierung von Zahlen (deutsches Format mit Komma)
export function formatNumber(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined) {
    return '0';
  }
  return value.toLocaleString('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// Formatierung von Datum
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '–';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '–';

    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(dateObj);
  } catch {
    return '–';
  }
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

// Relative Zeit (z.B. "vor 3 Tagen")
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return 'Heute';
  if (diffInDays === 1) return 'Gestern';
  if (diffInDays < 7) return `Vor ${diffInDays} Tagen`;
  if (diffInDays < 30) return `Vor ${Math.floor(diffInDays / 7)} Wochen`;
  if (diffInDays < 365) return `Vor ${Math.floor(diffInDays / 30)} Monaten`;
  return `Vor ${Math.floor(diffInDays / 365)} Jahren`;
}

// Wetter-Icon basierend auf Bedingung
export function getWeatherIcon(condition?: string): string {
  switch (condition) {
    case 'sunny':
      return '☀️';
    case 'cloudy':
      return '☁️';
    case 'mixed':
      return '⛅';
    default:
      return '❓';
  }
}

// Validierung Zählerstand
export function validateMeterValue(
  value: number,
  lastValue?: number
): { valid: boolean; error?: string } {
  if (value <= 0) {
    return { valid: false, error: 'Wert muss größer als 0 sein' };
  }

  if (lastValue !== undefined && value < lastValue) {
    return { valid: false, error: 'Wert muss größer als letzte Ablesung sein' };
  }

  return { valid: true };
}
