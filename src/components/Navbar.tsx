'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Settings, LayoutDashboard } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-gunmetal-nav shadow-sm border-b border-gunmetal-border transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3 text-white">
          <Image src="/logo-filled-sm.webp" alt="FlightSentry Logo" width={160} height={40} className="h-[42px] w-auto object-contain rounded" />
          <span className="font-bold text-xl tracking-tight">FlightSentry</span>
        </Link>
        <div className="flex items-center space-x-2 sm:space-x-4">
          <Link 
              href="/" 
              title="Dashboard"
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname === '/' ? 'bg-gunmetal-border border border-slate-500 text-slate-100 shadow-sm' : 'text-gunmetal-muted hover:bg-gunmetal-card'}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <Link 
              href="/settings" 
              title="Settings"
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname === '/settings' ? 'bg-gunmetal-border border border-slate-500 text-slate-100 shadow-sm' : 'text-gunmetal-muted hover:bg-gunmetal-card'}`}
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Settings</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}