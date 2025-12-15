import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { PermissionsProvider } from './contexts/PermissionsContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';

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
import { StockTransfer } from './pages/StockTransfer';
import { Stock } from './pages/Stock';
import { Alerts } from './pages/Alerts';
import { Reports } from './pages/Reports';
import { ReceiveStock } from './pages/ReceiveStock';
import { InTransit } from './pages/InTransit';
import { UserManagement } from './pages/UserManagement';
import { Merchants } from './pages/Merchants';
import { Warehouses } from './pages/Warehouses';
import { ActivityLogs } from './pages/ActivityLogs';
import { AdminManagement } from './pages/AdminManagement';
import { EngineerTransfer } from './pages/EngineerTransfer';
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
                  path="/stock-transfer"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <StockTransfer />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/merchants"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Merchants />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/warehouses"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Warehouses />
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
                {/* Activity Logs - Admin only */}
                <Route
                  path="/activity-logs"
                  element={
                    <ProtectedRoute requireAdmin>
                      <Layout>
                        <ActivityLogs />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                {/* Admin Management - Super Admin only */}
                <Route
                  path="/admin-management"
                  element={
                    <ProtectedRoute requireAdmin>
                      <Layout>
                        <AdminManagement />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                {/* Engineer Transfer - Admin only */}
                <Route
                  path="/engineer-transfer"
                  element={
                    <ProtectedRoute requireAdmin>
                      <Layout>
                        <EngineerTransfer />
                      </Layout>
                    </ProtectedRoute>
                  }
                />

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
