import { ReactNode, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';
import { MODULES } from '../lib/permissions';
import { GlobalSearch } from './GlobalSearch';
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
  Truck,
  Warehouse,
  FileText,
  Shield,
  Activity,
  UserCog,
  Store,
  GitBranch
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
    { name: 'Merchants', href: '/merchants', icon: Store, module: MODULES.DASHBOARD, adminOnly: true },
    { name: 'Warehouses', href: '/warehouses', icon: Building2, module: MODULES.DASHBOARD, adminOnly: true },
    { name: 'Alerts', href: '/alerts', icon: Bell, module: MODULES.ALERTS },
    { name: 'Stock Transfer', href: '/stock-transfer', icon: ArrowRightLeft, module: MODULES.STOCK_MOVEMENTS, adminOnly: true },
    { name: 'Stock Movements', href: '/stock-movements', icon: Truck, module: MODULES.STOCK_MOVEMENTS },
    { name: 'Activity Logs', href: '/activity-logs', icon: Activity, module: MODULES.DASHBOARD, adminOnly: true },
    { name: 'Engineers', href: '/engineers', icon: Users, module: MODULES.ENGINEERS, adminOnly: true },
    { name: 'Engineer Transfer', href: '/engineer-transfer', icon: UserCog, module: MODULES.ENGINEERS, adminOnly: true },
    { name: 'Organization', href: '/organization', icon: GitBranch, module: MODULES.USER_MANAGEMENT, superAdminOnly: true },
    { name: 'Banks', href: '/banks', icon: Building2, module: MODULES.BANKS, adminOnly: true },
    { name: 'Approvals', href: '/approvals', icon: UserCheck, module: MODULES.APPROVALS, adminOnly: true },
    { name: 'Reports', href: '/reports', icon: FileText, module: MODULES.REPORTS, adminOnly: true },
    { name: 'Admin Management', href: '/admin-management', icon: Shield, module: MODULES.USER_MANAGEMENT, superAdminOnly: true },
    { name: 'User Management', href: '/users', icon: Shield, module: MODULES.USER_MANAGEMENT, adminOnly: true },
  ];

  // Filter navigation based on permissions
  const navigation = allNavItems.filter(item => {
    // Super admin sees everything
    if (isSuperAdmin) return true;

    // Super admin only items
    if (item.superAdminOnly) return false;

    // Admin-only items require admin role plus module access
    if (item.adminOnly && !isAdmin) return false;

    // Check module-level access
    return hasAccess(item.module);
  });

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
                <span className="ml-3 text-xl font-bold text-gray-900">UDS-POS</span>
              </div>

              <div className="hidden sm:ml-8 sm:flex sm:space-x-2 overflow-x-auto">
                {navigation.slice(0, 8).map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      end={item.href === '/dashboard'}
                      className={({ isActive }) =>
                        `inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition whitespace-nowrap ${
                          isActive
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 mr-1.5" />
                      {item.name}
                    </NavLink>
                  );
                })}
                {/* More dropdown for additional items */}
                {navigation.length > 8 && (
                  <div className="relative group">
                    <button className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition">
                      <Menu className="w-4 h-4 mr-1.5" />
                      More
                    </button>
                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 hidden group-hover:block">
                      {navigation.slice(8).map((item) => {
                        const Icon = item.icon;
                        return (
                          <NavLink
                            key={item.name}
                            to={item.href}
                            className={({ isActive }) =>
                              `flex items-center px-4 py-2 text-sm ${
                                isActive
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`
                            }
                          >
                            <Icon className="w-4 h-4 mr-2" />
                            {item.name}
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="hidden sm:flex sm:items-center sm:space-x-4">
              {/* Global Search */}
              <GlobalSearch />

              <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition">
                <Bell className="w-6 h-6" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
                  <p className="text-xs text-gray-500 capitalize">{profile?.role?.replace('_', ' ')}</p>
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
          <div className="sm:hidden border-t border-gray-200 max-h-[80vh] overflow-y-auto">
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
                  <p className="text-sm text-gray-500 capitalize">{profile?.role?.replace('_', ' ')}</p>
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
