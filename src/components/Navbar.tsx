'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Settings, Moon, Sun, LayoutDashboard } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3 text-indigo-600 dark:text-indigo-400">
          <Image src="/logo-s.webp" alt="FlightSentry Logo" width={160} height={40} className="h-[42px] w-auto object-contain rounded" />
          <span className="font-bold text-xl tracking-tight">FlightSentry</span>
        </Link>
        <div className="flex items-center space-x-4">
          <Link 
             href="/" 
             className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname === '/' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
          <Link 
             href="/settings" 
             className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname === '/settings' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </Link>
          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}