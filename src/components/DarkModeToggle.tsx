import { Sun, Moon, Monitor } from 'lucide-react';
import { useDarkMode } from '../lib/darkMode';

export default function DarkModeToggle() {
  const { theme, setTheme } = useDarkMode();

  const options = [
    { value: 'light' as const, icon: Sun, label: 'Hell' },
    { value: 'dark' as const, icon: Moon, label: 'Dunkel' },
    { value: 'system' as const, icon: Monitor, label: 'System' },
  ];

  return (
    <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            theme === value
              ? 'bg-white dark:bg-gray-600 text-orange-600 dark:text-orange-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Icon size={16} />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
