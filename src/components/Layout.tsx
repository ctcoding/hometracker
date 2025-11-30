import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Flame, Droplets, Wallet, Settings, Cloud } from 'lucide-react';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: 'Start' },
    { path: '/fernwaerme', icon: Flame, label: 'Fernwärme' },
    { path: '/elwa', icon: Droplets, label: 'Warmwasser' },
    { path: '/umwelt', icon: Cloud, label: 'Umwelt' },
    { path: '/finanzen', icon: Wallet, label: 'Finanzen' },
  ];

  // Verstecke Navigation und Header nur auf AddReading-Seite
  const hideNav = location.pathname === '/add-reading';
  const hideHeader = location.pathname === '/add-reading';

  return (
    <div className="min-h-screen">
      {/* Orange HausTracker Header */}
      {!hideHeader && (
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white px-6 pb-6 shadow-md" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">HausTracker</h1>
            <Link
              to="/settings"
              className="p-2 hover:bg-orange-400 rounded-lg transition-colors"
            >
              <Settings size={20} />
            </Link>
          </div>
        </div>
      )}

      {/* Content */}
      <div>
        {children}
      </div>

      {/* Bottom Navigation */}
      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 pt-2" style={{ paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom))' }}>
          <div className="flex items-center justify-around max-w-lg mx-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg transition-colors',
                    isActive
                      ? 'text-orange-500'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <Icon size={24} />
                  <span className="text-xs font-medium hidden sm:block">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
