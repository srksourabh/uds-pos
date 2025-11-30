import { ReactNode, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Smartphone,
  ClipboardList,
  Users,
  UserCheck,
  Bell,
  LogOut,
  Menu,
  X,
  Building2,
  ArrowRightLeft,
  PackagePlus,
  Truck
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Devices', href: '/devices', icon: Smartphone },
    { name: 'Calls', href: '/calls', icon: ClipboardList },
    { name: 'Receive Stock', href: '/receive-stock', icon: PackagePlus },
    { name: 'In Transit', href: '/in-transit', icon: Truck },
    { name: 'Stock Movements', href: '/stock-movements', icon: ArrowRightLeft },
    ...(profile?.role === 'admin' ? [
      { name: 'Engineers', href: '/engineers', icon: Users },
      { name: 'Banks', href: '/banks', icon: Building2 },
      { name: 'Approvals', href: '/approvals', icon: UserCheck }
    ] : []),
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 fixed w-full z-30 top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <span className="ml-3 text-xl font-bold text-gray-900">Field Service</span>
              </div>

              <div className="hidden sm:ml-8 sm:flex sm:space-x-2">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      end={item.href === '/'}
                      className={({ isActive }) =>
                        `inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition ${
                          isActive
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`
                      }
                    >
                      <Icon className="w-5 h-5 mr-2" />
                      {item.name}
                    </NavLink>
                  );
                })}
              </div>
            </div>

            <div className="hidden sm:flex sm:items-center sm:space-x-4">
              <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition">
                <Bell className="w-6 h-6" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
                  <p className="text-xs text-gray-500 capitalize">{profile?.role}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex items-center sm:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-gray-200">
            <div className="pt-2 pb-3 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    end={item.href === '/'}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center px-4 py-3 text-base font-medium ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </NavLink>
                );
              })}
            </div>
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="flex items-center px-4 mb-3">
                <div>
                  <p className="text-base font-medium text-gray-900">{profile?.full_name}</p>
                  <p className="text-sm text-gray-500 capitalize">{profile?.role}</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center px-4 py-3 text-base font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-5 h-5 mr-3" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </nav>

      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
