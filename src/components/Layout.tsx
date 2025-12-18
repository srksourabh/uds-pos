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
  PackagePlus,
  Truck,
  Warehouse,
  FileText,
  Shield,
  User
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const { hasAccess, isSuperAdmin, isAdmin } = usePermissions();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

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
    { name: 'Users', href: '/users', icon: Shield, module: MODULES.USER_MANAGEMENT, adminOnly: true },
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

  const handleSignOut = async () => {
    try {
      await signOut();
      setProfileMenuOpen(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 fixed w-full z-30 top-0">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-4">
            {/* Logo - Fixed Width */}
            <div className="flex-shrink-0 flex items-center">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <span className="ml-3 text-xl font-bold text-gray-900 hidden sm:block whitespace-nowrap">Field Service</span>
            </div>

            {/* Desktop Navigation - Scrollable with max-width */}
            <div className="hidden md:flex md:items-center md:overflow-hidden" style={{ maxWidth: 'calc(100% - 400px)' }}>
              <div className="flex space-x-1 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      end={item.href === '/dashboard'}
                      className={({ isActive }) =>
                        `flex-shrink-0 inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition whitespace-nowrap ${
                          isActive
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
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

            {/* Right Side - Fixed Width, Always Visible */}
            <div className="hidden md:flex md:items-center md:space-x-3 flex-shrink-0">
              {/* Global Search */}
              <GlobalSearch />

              {/* Notifications */}
              <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* Profile Info - Compact */}
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center space-x-2 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
              </button>

              {/* Profile Dropdown */}
              {profileMenuOpen && (
                <div className="absolute right-24 top-14 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
                    <p className="text-xs text-gray-500">{profile?.email}</p>
                    <p className="text-xs text-gray-500 capitalize mt-1">
                      Role: {profile?.role?.replace('_', ' ')}
                    </p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </button>
                </div>
              )}

              {/* DIRECT LOGOUT BUTTON - Always Visible */}
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition shadow-sm whitespace-nowrap"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex items-center md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="max-h-[calc(100vh-4rem)] overflow-y-auto">
              {/* Navigation Links */}
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
              
              {/* Profile Section */}
              <div className="pt-4 pb-3 border-t border-gray-200">
                <div className="flex items-center px-4 mb-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div className="ml-3">
                    <p className="text-base font-medium text-gray-900">{profile?.full_name}</p>
                    <p className="text-sm text-gray-500 capitalize">{profile?.role?.replace('_', ' ')}</p>
                  </div>
                </div>
                
                {/* MOBILE LOGOUT BUTTON - Large and Prominent */}
                <button
                  onClick={handleSignOut}
                  className="mx-4 mb-3 w-[calc(100%-2rem)] flex items-center justify-center px-4 py-3 text-base font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition shadow-sm"
                >
                  <LogOut className="w-5 h-5 mr-2" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      <main className="pt-16">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>

      {/* Click outside to close profile menu */}
      {profileMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setProfileMenuOpen(false)}
        />
      )}
    </div>
  );
}
