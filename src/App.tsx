import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { PermissionsProvider } from './contexts/PermissionsContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { checkAndClearCache, getCacheVersion } from './lib/cacheManager';

// Create a React Query client with sensible defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

import { LandingPage } from './pages/LandingPage';
import { EnhancedLogin } from './pages/EnhancedLogin';
import { ProfileSetup } from './pages/ProfileSetup';
import { PendingApproval } from './pages/PendingApproval';
import { Dashboard } from './pages/Dashboard';
import { Devices } from './pages/Devices';
import { Calls } from './pages/Calls';
import { CallDetail } from './pages/CallDetail';
import { Engineers } from './pages/Engineers';
import { Banks } from './pages/Banks';
import { Approvals } from './pages/Approvals';
import { StockMovements } from './pages/StockMovements';
import { Stock } from './pages/Stock';
import { Alerts } from './pages/Alerts';
import { Reports } from './pages/Reports';
import { ReceiveStock } from './pages/ReceiveStock';
import { InTransit } from './pages/InTransit';
import { UserManagement } from './pages/UserManagement';
import { CallManagement } from './pages/CallManagement';
import { StockManagement } from './pages/StockManagement';
import { BulkImport } from './pages/BulkImport';

// Phase 2: Pincode Master
import PincodeMaster from './pages/PincodeMaster';

// Super Admin Pages
import { MasterData } from './pages/admin/MasterData';
import { AdminCallGrid } from './pages/admin/AdminCallGrid';
import { LiveTracking } from './pages/admin/LiveTracking';

// FSE (Field Service Engineer) Pages
import FSECalls from './pages/fse/FSECalls';
import FSECallAction from './pages/fse/FSECallAction';
import FSECallDetail from './pages/fse/FSECallDetail';
import FSEInventory from './pages/fse/FSEInventory';

// Legacy Mobile Pages
import MobileCalls from './pages/mobile/MobileCalls';
import MobileCallDetail from './pages/mobile/MobileCallDetail';
import MobileScanDevice from './pages/mobile/MobileScanDevice';
import MobileCompleteCall from './pages/mobile/MobileCompleteCall';
import MobileLogin from './pages/mobile/MobileLogin';
import MobileInventory from './pages/mobile/MobileInventory';
import MobilePhotoCapture from './pages/mobile/MobilePhotoCapture';
import MobileInstallationFlow from './pages/mobile/MobileInstallationFlow';
import { TermsOfService } from './pages/TermsOfService';
import { PrivacyPolicy } from './pages/PrivacyPolicy';

function App() {
  useEffect(() => {
    // Check cache version on app load
    const cacheCleared = checkAndClearCache();
    if (cacheCleared) {
      console.log(`[App] Cache cleared - now running version ${getCacheVersion()}`);
    } else {
      console.log(`[App] Cache up to date - version ${getCacheVersion()}`);
    }
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <PermissionsProvider>
              <Routes>
                {/* Public Landing Page */}
                <Route path="/" element={<LandingPage />} />

                {/* Auth Routes */}
                <Route path="/login" element={<EnhancedLogin />} />
                <Route path="/profile-setup" element={<ProfileSetup />} />
                <Route path="/pending-approval" element={<PendingApproval />} />

                {/* Legal Pages */}
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />

                {/* Protected Dashboard */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Dashboard />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/devices"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Devices />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/calls"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Calls />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/calls/:id"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <CallDetail />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/stock"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Stock />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/alerts"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Alerts />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <ProtectedRoute requireAdmin>
                      <Layout>
                        <Reports />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/engineers"
                  element={
                    <ProtectedRoute requireAdmin>
                      <Layout>
                        <Engineers />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/banks"
                  element={
                    <ProtectedRoute requireAdmin>
                      <Layout>
                        <Banks />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/approvals"
                  element={
                    <ProtectedRoute requireAdmin>
                      <Layout>
                        <Approvals />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/stock-movements"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <StockMovements />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/receive-stock"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <ReceiveStock />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/in-transit"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <InTransit />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <ProtectedRoute requireAdmin>
                      <Layout>
                        <UserManagement />
                      </Layout>
                    </ProtectedRoute>
                  }
                />

                {/* Admin Management Pages */}
                <Route
                  path="/call-management"
                  element={
                    <ProtectedRoute requireAdmin>
                      <Layout>
                        <CallManagement />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/stock-management"
                  element={
                    <ProtectedRoute requireAdmin>
                      <Layout>
                        <StockManagement />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/bulk-import"
                  element={
                    <ProtectedRoute requireAdmin>
                      <Layout>
                        <BulkImport />
                      </Layout>
                    </ProtectedRoute>
                  }
                />

                {/* Phase 2: Pincode Master */}
                <Route
                  path="/pincode-master"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <PincodeMaster />
                      </Layout>
                    </ProtectedRoute>
                  }
                />

                {/* Super Admin Pages - Restricted to super_admin role only */}
                <Route
                  path="/admin/master-data"
                  element={
                    <ProtectedRoute requireSuperAdmin>
                      <Layout>
                        <MasterData />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/calls"
                  element={
                    <ProtectedRoute requireSuperAdmin>
                      <Layout>
                        <AdminCallGrid />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/tracking"
                  element={
                    <ProtectedRoute requireSuperAdmin>
                      <Layout>
                        <LiveTracking />
                      </Layout>
                    </ProtectedRoute>
                  }
                />

                {/* FSE (Field Service Engineer) Routes - Mobile Action Dashboard */}
                <Route
                  path="/fse/calls"
                  element={
                    <ProtectedRoute>
                      <FSECalls />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/fse/calls/:id"
                  element={
                    <ProtectedRoute>
                      <FSECallDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/fse/calls/:id/action"
                  element={
                    <ProtectedRoute>
                      <FSECallAction />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/fse/inventory"
                  element={
                    <ProtectedRoute>
                      <FSEInventory />
                    </ProtectedRoute>
                  }
                />

                {/* Legacy Mobile Routes */}
                <Route
                  path="/mobile/calls"
                  element={
                    <ProtectedRoute>
                      <MobileCalls />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/mobile/calls/:id"
                  element={
                    <ProtectedRoute>
                      <MobileCallDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/mobile/calls/:id/scan"
                  element={
                    <ProtectedRoute>
                      <MobileScanDevice />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/mobile/calls/:id/complete"
                  element={
                    <ProtectedRoute>
                      <MobileCompleteCall />
                    </ProtectedRoute>
                  }
                />
                <Route path="/mobile/login" element={<MobileLogin />} />
                <Route
                  path="/mobile/inventory"
                  element={
                    <ProtectedRoute>
                      <MobileInventory />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/mobile/calls/:id/photo"
                  element={
                    <ProtectedRoute>
                      <MobilePhotoCapture />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/mobile/calls/:id/installation"
                  element={
                    <ProtectedRoute>
                      <MobileInstallationFlow />
                    </ProtectedRoute>
                  }
                />

                {/* Catch-all redirect to landing page */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </PermissionsProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
