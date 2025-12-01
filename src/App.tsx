import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
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
import MobileCalls from './pages/mobile/MobileCalls';
import MobileCallDetail from './pages/mobile/MobileCallDetail';
import MobileScanDevice from './pages/mobile/MobileScanDevice';
import MobileCompleteCall from './pages/mobile/MobileCompleteCall';
import MobileLogin from './pages/mobile/MobileLogin';
import MobileInventory from './pages/mobile/MobileInventory';
import MobilePhotoCapture from './pages/mobile/MobilePhotoCapture';
import MobileInstallationFlow from './pages/mobile/MobileInstallationFlow';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Auth Routes */}
          <Route path="/login" element={<EnhancedLogin />} />
          <Route path="/profile-setup" element={<ProfileSetup />} />
          <Route path="/pending-approval" element={<PendingApproval />} />

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
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
