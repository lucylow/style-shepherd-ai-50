import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Mic, LayoutDashboard } from 'lucide-react';

export default function MobileBottomNav() {
  const location = useLocation();

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/products', label: 'Browse', icon: Search },
    { href: '/voice-shop', label: 'Voice', icon: Mic },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ];

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40 w-[92%] max-w-md md:hidden">
      <div className="bg-white rounded-2xl shadow-lg flex justify-around p-2 border border-gray-200">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = location.pathname === href;
          return (
            <Link
              key={href}
              to={href}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center text-xs px-3 py-2 rounded-lg transition-colors min-w-[60px] ${
                isActive
                  ? 'bg-[#2D8CFF] text-white'
                  : 'text-gray-600 hover:text-[#2D8CFF]'
              }`}
            >
              <Icon size={20} className="mb-1" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

