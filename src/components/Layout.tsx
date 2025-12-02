import { ReactNode, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';
import { MODULES } from '../lib/permissions';
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
  Truck,
  Warehouse,
  FileText,
  Shield
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const { hasAccess, isSuperAdmin, isAdmin } = usePermissions();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Define all navigation items with their required modules
  const allNavItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, module: MODULES.DASHBOARD },
    { name: 'Calls', href: '/calls', icon: ClipboardList, module: MODULES.CALLS },
    { name: 'Devices', href: '/devices', icon: Smartphone, module: MODULES.DEVICES },
    { name: 'Stock', href: '/stock', icon: Warehouse, module: MODULES.STOCK },
    { name: 'Alerts', href: '/alerts', icon: Bell, module: MODULES.ALERTS },
    { name: 'Receive Stock', href: '/receive-stock', icon: PackagePlus, module: MODULES.RECEIVE_STOCK },
    { name: 'In Transit', href: '/in-transit', icon: Truck, module: MODULES.IN_TRANSIT },
    { name: 'Stock Movements', href: '/stock-movements', icon: ArrowRightLeft, module: MODULES.STOCK_MOVEMENTS },
    { name: 'Engineers', href: '/engineers', icon: Users, module: MODULES.ENGINEERS, adminOnly: true },
    { name: 'Banks', href: '/banks', icon: Building2, module: MODULES.BANKS, adminOnly: true },
    { name: 'Approvals', href: '/approvals', icon: UserCheck, module: MODULES.APPROVALS, adminOnly: true },
    { name: 'Reports', href: '/reports', icon: FileText, module: MODULES.REPORTS, adminOnly: true },
  ];

  // Filter navigation based on permissions
  const navigation = allNavItems.filter(item => {
    // Super admin sees everything
    if (isSuperAdmin) return true;

    // Admin-only items require admin role plus module access
    if (item.adminOnly && !isAdmin) return false;

    // Check module-level access
    return hasAccess(item.module);
  });

  // Add User Management for super_admin and admin
  if (isSuperAdmin || isAdmin) {
    navigation.push({ name: 'User Management', href: '/users', icon: Shield, module: 'user_management', adminOnly: true });
  }

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
                      end={item.href === '/dashboard'}
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
                    end={item.href === '/dashboard'}
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
